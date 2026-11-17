import { useState } from 'react'
import { CALIBRATION_RIR, type SubstitutePreview } from '../lib/substitute'
import { Button, Heading, HStack, List, ListItem, Sheet, Text, TextField, VStack } from '../ax'

/**
 * 대체운동 선택 (T8).
 *
 * 머신 자리가 없을 때 쓴다. 후보별 **예상 시작 무게**를 미리 보여주는 것이 핵심 —
 * 무게를 모르면 기계 앞에서 다시 고민하게 되고, 그게 기록을 포기하는 지점이다.
 *
 * 표시 문구가 "예상"임을 숨기지 않는다. 종목 간 하중 전이에 검증된 공식은 없고
 * (lib/substitute.ts 주석), 실제 보정은 첫 세트를 RIR 3~4로 수행한 결과로 한다.
 */
export default function SubstituteSheet({
  originalName,
  previews,
  bodyWeightKg,
  onSaveBodyWeight,
  onSelect,
  onClose,
}: {
  originalName: string
  previews: SubstitutePreview[]
  bodyWeightKg?: number
  onSaveBodyWeight: (kg: number) => void
  onSelect: (preview: SubstitutePreview) => void
  onClose: () => void
}) {
  const [bodyWeightText, setBodyWeightText] = useState(
    bodyWeightKg === undefined ? '' : String(bodyWeightKg),
  )
  const needsBodyWeight = previews.some((p) => p.blocked === 'no-bodyweight')
  const parsedBodyWeight = Number(bodyWeightText.replace(',', '.'))
  const bodyWeightValid = Number.isFinite(parsedBodyWeight) && parsedBodyWeight > 20

  return (
    <Sheet label="대체운동 선택" purpose="form" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <Heading level={2}>자리 없음 · {originalName} 대체</Heading>

          {previews.length === 0 ? (
            <Text color="secondary">
              이 종목에는 등록된 대체가 없습니다. 순서를 바꿔 다른 종목을 먼저 하세요.
            </Text>
          ) : (
            <>
              <Text color="secondary">
                첫 세트는 {CALIBRATION_RIR}로 — 그 결과로 2세트 무게를 다시 계산합니다. 아래 무게는 시작점 추정이고,
                기록은 대체 종목 자신의 라인에 남습니다.
              </Text>

              {needsBodyWeight && (
                <VStack gap={2}>
                  <Heading level={2}>체중 (kg)</Heading>
                  <Text color="secondary">
                    어시스티드 머신은 보조 무게를 체중에서 역산합니다. 이 값만 여기에 쓰입니다.
                  </Text>
                  <HStack gap={2} align="end">
                    <TextField
                      label="체중 (kg)"
                      isLabelHidden
                      inputMode="decimal"
                      value={bodyWeightText}
                      onChange={setBodyWeightText}
                      placeholder="예: 72"
                    />
                    <Button
                      variant="secondary"
                      label="저장"
                      isDisabled={!bodyWeightValid}
                      onClick={() => onSaveBodyWeight(Math.round(parsedBodyWeight * 10) / 10)}
                    />
                  </HStack>
                </VStack>
              )}

              <List>
                {previews.map((preview) => {
                  const { option, exercise } = preview
                  const notes: string[] = []
                  if (option.perSide) notes.push('한쪽 무게로 기록')
                  if (option.assisted) notes.push('보조 무게 — 클수록 쉽다')
                  if (preview.lastRecord) notes.push('기록 있음 — 지난 무게 사용')
                  if (preview.blocked === 'no-history') notes.push('원 종목 기록이 없어 시작 무게를 추정할 수 없습니다')
                  if (preview.blocked === 'no-bodyweight') notes.push('체중을 입력하면 보조 무게를 계산합니다')

                  return (
                    <ListItem
                      key={option.exerciseId}
                      label={exercise.shortName}
                      description={notes.length > 0 ? <Text color="secondary">{notes.join(' · ')}</Text> : undefined}
                      endContent={preview.startWeight !== undefined ? <Text color="accent">{preview.startWeight}kg</Text> : undefined}
                      isDisabled={preview.startWeight === undefined}
                      onClick={() => onSelect(preview)}
                    />
                  )
                })}
              </List>
            </>
          )}

          <Button variant="secondary" width="100%" label="취소" onClick={dismiss} />
        </VStack>
      )}
    </Sheet>
  )
}
