import { useState } from 'react'
import { LOW_KCAL_STREAK_WARN, planDiffText, planTotals, visiblePlans } from '../lib/diet'
import type { DietPlan } from '../types'
import { Button, Heading, HStack, Icon, List, ListItem, Sheet, Text, VStack } from '../ax'

/** "내일부터 N일"의 상한. 4일째부터 경고 대상이므로 3일까지만 미리 잡을 수 있게 한다 */
const MAX_AHEAD = LOW_KCAL_STREAK_WARN - 1

/**
 * 플랜 전환 (D2).
 *
 * **일 단위 + 벌크 액션만 제공한다.** 주 단위 전환은 두지 않는다 — 회식은 날짜 단위
 * 사건이고, 주 단위 스위치는 "이번 주는 망함" 프레임을 만든다 (PLAN-DIET §0-1,
 * 과거 붕괴의 심리 패턴).
 */
export default function DietPlanSheet({
  plans,
  currentPlanId,
  onPickToday,
  onPickAhead,
  onClose,
}: {
  plans: DietPlan[]
  currentPlanId: string
  onPickToday: (planId: string) => void
  /** 내일부터 N일 동안 이 플랜 */
  onPickAhead: (planId: string, days: number) => void
  onClose: () => void
}) {
  const [ahead, setAhead] = useState<string | null>(null)
  /*
   * 대체된 옛 플랜은 목록에서 빼되 **DB에는 남긴다** (DD2) — 과거 날짜가 자기 planId로
   * 계속 판정돼야 한다. 필터를 `diet.visiblePlans`에 두는 이유는 그 주석 참조.
   */
  const listed = visiblePlans(plans)
  /** diff의 기준 = 기본 플랜. 기본 플랜 자신에는 diff 줄이 없다 */
  const base = listed.find((p) => p.isDefault)

  return (
    <Sheet label="식단 플랜 전환" purpose="info" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <Heading level={2}>식단 플랜</Heading>

          {ahead === null ? (
            <>
              <List>
                {listed.map((plan) => {
                  const { kcal, proteinG } = planTotals(plan)
                  /*
                    기본 플랜과의 **차이 한 줄** (DD1). 문구를 손으로 적지 않는다 —
                    플랜 JSON을 고치면 설명이 따라와야 한다 (`diet.planDiffText`).
                    피드백이 "두 플랜 차이를 앱에서 모르겠다"였고, 실제로 화면에
                    이름·총량만 있었으니 알 방법이 없었다.
                  */
                  const diff = base && base.id !== plan.id ? planDiffText(base, plan) : ''
                  return (
                    <ListItem
                      key={plan.id}
                      label={plan.name}
                      description={
                        <VStack gap={0}>
                          <Text color="secondary" textWrap="wrap">
                            {kcal.toLocaleString()}kcal · 단백질 {proteinG}g
                          </Text>
                          {diff !== '' && (
                            <Text color="secondary" textWrap="wrap">
                              {base?.name} 대비 {diff}
                            </Text>
                          )}
                        </VStack>
                      }
                      isSelected={plan.id === currentPlanId}
                      endContent={plan.id === currentPlanId ? <Icon icon="check" /> : null}
                      onClick={() => {
                        onPickToday(plan.id)
                        dismiss()
                      }}
                    />
                  )
                })}
              </List>
              <Text color="secondary">
                고르면 <strong>오늘</strong>만 바뀝니다. 며칠을 미리 정하려면 아래를 쓰세요.
              </Text>
              <HStack gap={2} wrap="wrap">
                {listed
                  .filter((p) => p.id !== currentPlanId)
                  .map((p) => (
                    <Button key={p.id} variant="secondary" size="sm" label={`내일부터 ${p.name}`} onClick={() => setAhead(p.id)} />
                  ))}
              </HStack>
            </>
          ) : (
            <>
              <Text color="secondary">
                {listed.find((p) => p.id === ahead)?.name}을 <strong>내일부터 며칠</strong> 적용할까요?
              </Text>
              <HStack gap={2} wrap="wrap">
                {Array.from({ length: MAX_AHEAD }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant="secondary"
                    label={`${n}일`}
                    onClick={() => {
                      onPickAhead(ahead, n)
                      dismiss()
                    }}
                  />
                ))}
              </HStack>
              <Text color="secondary">
                {LOW_KCAL_STREAK_WARN}일 이상 연속되면 경고가 뜹니다 — 루틴 문서 15장이 만회성
                절식을 금지하기 때문입니다.
              </Text>
              <Button variant="secondary" label="뒤로" onClick={() => setAhead(null)} />
            </>
          )}

          <Button variant="secondary" width="100%" label="닫기" onClick={dismiss} />
        </VStack>
      )}
    </Sheet>
  )
}
