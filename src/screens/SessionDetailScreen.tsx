import { useState } from 'react'
import { CARDIO_TYPES, intensityHintFor } from '../lib/cardio'
import { useLiveQuery } from 'dexie-react-hooks'
import DietDayEditor from '../components/DietDayEditor'
import ExerciseCard from '../components/ExerciseCard'
import { db } from '../db'
import { planDayChange } from '../lib/dayChange'
import { formatClock, weekdayKo } from '../lib/dates'
import { doneSets, findDayForRecord, plannedInDay, strengthDates, totalDoneSets, totalVolume } from '../lib/derive'
import { todayLocal } from '../lib/dates'
import { useDiet } from '../lib/useDiet'
import { useSessionEditor } from '../lib/useSessionEditor'
import { isInverseKey } from '../lib/weightScale'
import type { RoutineBundle } from '../lib/useRoutine'
import { parseRecordKey, type RecordKey } from '../types'
import {
  AxRoot,
  Badge,
  Banner,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Groups,
  Heading,
  HStack,
  Icon,
  Loading,
  Row,
  Rows,
  Text,
  TextAreaField,
  TextField,
  ToggleButton,
  VStack,
} from '../ax'

/**
 * 세션 상세 + 편집 (DESIGN.md §5.3).
 * "수행 순서대로 종목 + 세트 기록 + 감각/보상작용. 편집 가능 (당일 입력 실수 보정)"
 */
export default function SessionDetailScreen({
  bundle,
  sessionId,
  onBack,
}: {
  bundle: RoutineBundle
  sessionId: string
  onBack: () => void
}) {
  const editor = useSessionEditor(sessionId)
  const diet = useDiet()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [openKey, setOpenKey] = useState<RecordKey | null>(null)
  const [changingDay, setChangingDay] = useState(false)
  const [pendingDayId, setPendingDayId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [minutesText, setMinutesText] = useState<string | null>(null)

  if (editor.loading) return <Loading text="불러오는 중…" />
  if (!editor.session) {
    return (
      <AxRoot>
        <Center>
          <VStack gap={3} align="center">
            <Text color="secondary">세션을 찾을 수 없습니다.</Text>
            <Button variant="secondary" label="기록으로" onClick={onBack} />
          </VStack>
        </Center>
      </AxRoot>
    )
  }

  const { session } = editor
  const day = findDayForRecord(bundle.routine, session.dayId)
  const nameOf = (recordKey: string) =>
    bundle.catalog.get(parseRecordKey(recordKey).exerciseId)?.shortName ??
    parseRecordKey(recordKey).exerciseId

  // 수행 순서대로 표시 (§5.3). 수행하지 않은 종목은 계획 순서로 뒤에 붙인다
  const ordered = [...session.entries].sort((a, b) => {
    if (a.performedOrder !== null && b.performedOrder !== null)
      return a.performedOrder - b.performedOrder
    if (a.performedOrder !== null) return -1
    if (b.performedOrder !== null) return 1
    return a.plannedOrder - b.plannedOrder
  })

  const plan = pendingDayId ? planDayChange(session, bundle.routine, pendingDayId) : null
  const { allDays } = bundle

  return (
    <AxRoot>
      <Groups>
        <Group>
          <HStack>
            <Button variant="ghost" icon={<Icon icon="chevronLeft" />} label="기록" onClick={onBack} />
          </HStack>
          <Heading level={1}>{day?.name ?? session.dayId}</Heading>
          <HStack gap={2} align="center" wrap="wrap">
            <Text color="secondary">
              {session.date} ({weekdayKo(session.date)}) · {formatClock(session.startedAt)}
              {session.endedAt && `–${formatClock(session.endedAt)}`}
            </Text>
            {session.mode !== 'normal' && (
              <Badge variant="warning" label={session.mode === 'return' ? '복귀' : '디로드'} />
            )}
          </HStack>
        </Group>

        {/* 기록을 고치는 것(카드·유산소·메모·식단)이 한 묶음이고, 관리(Day 변경·위험 구역)는 맨 아래 묶음이다 */}
        <Group>
          <Card>
            <Grid columns={3} gap={3}>
              <VStack gap={1}>
                <Heading level={2}>{totalDoneSets(session)}</Heading>
                <Text type="supporting" color="secondary">
                  완료 세트
                </Text>
              </VStack>
              <VStack gap={1}>
                <Heading level={2}>
                  {Math.round(totalVolume(session, (rk) => isInverseKey(bundle.catalog, rk))).toLocaleString()}
                </Heading>
                <Text type="supporting" color="secondary">
                  총 볼륨
                </Text>
              </VStack>
              <VStack gap={1}>
                <Heading level={2}>{session.entries.filter((e) => e.performedOrder !== null).length}</Heading>
                <Text type="supporting" color="secondary">
                  수행 종목
                </Text>
              </VStack>
            </Grid>
          </Card>

          {ordered.map((entry) => {
            const { exerciseId } = parseRecordKey(entry.recordKey)
            const routineExercise = day ? plannedInDay(day, exerciseId) : undefined
            const exercise = bundle.catalog.get(exerciseId)
            if (!routineExercise) {
              // Day를 변경해서 이 Day에 없는 종목이 남은 경우 (§11 재매핑). 읽기만 제공한다
              return (
                <Card key={entry.recordKey}>
                  <Rows>
                    <Row
                      label={<Text weight="semibold">{nameOf(entry.recordKey)}</Text>}
                      description={
                        <Text type="supporting" color="secondary">
                          이 Day 구성에 없는 종목 · {doneSets(entry).map((s) => s.reps).join('/')} ·{' '}
                          {doneSets(entry)[0]?.weight ?? 0}kg
                        </Text>
                      }
                      end={<Text color="secondary">{doneSets(entry).length}세트</Text>}
                    />
                  </Rows>
                </Card>
              )
            }
            return (
              <ExerciseCard
                key={entry.recordKey}
                entry={entry}
                routineExercise={routineExercise}
                name={exercise?.shortName ?? exerciseId}
                fullName={exercise?.name ?? exerciseId}
                cueTip={exercise?.cueTip}
                compensationSigns={exercise?.compensationSigns ?? []}
                defaultStep={bundle.routine.rules.weightIncrementKg}
                inverseWeight={isInverseKey(bundle.catalog, entry.recordKey)}
                /* 편집 화면도 같은 판정을 받아야 한다 (CC10) — 한쪽만 오탐이 남으면 갈라진다 */
                allowZeroWeight={exercise?.allowZeroWeight === true}
                actions={editor.actions}
                open={openKey === entry.recordKey}
                onToggleOpen={() => setOpenKey(openKey === entry.recordKey ? null : entry.recordKey)}
                showPrefillHints={false}
              />
            )
          })}

          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                유산소
              </Text>
              <HStack gap={2} wrap="wrap">
                {CARDIO_TYPES.map((t) => t.name).map((t) => (
                  <ToggleButton
                    key={t}
                    className="ax-toggle"
                    label={t}
                    isPressed={session.cardio?.type === t}
                    onPressedChange={() =>
                      editor.setCardio(
                        session.cardio?.type === t
                          ? undefined
                          : { type: t, minutes: session.cardio?.minutes ?? 20, note: session.cardio?.note },
                      )
                    }
                  />
                ))}
              </HStack>
              {session.cardio && (
                <HStack gap={2}>
                  {/*
                    문자열 로컬 상태로 받고 blur에서 커밋한다. 값을 직접 파싱하면 지우는 순간
                    Number('') → 0이 저장되고, 그 0이 다시 value로 내려와 "0"이 지워지지 않는다.
                  */}
                  <TextField
                    label="유산소 시간(분)"
                    isLabelHidden
                    inputMode="numeric"
                    isNumeric
                    value={minutesText ?? String(session.cardio.minutes)}
                    onChange={setMinutesText}
                    onBlur={() => {
                      if (minutesText === null) return
                      const parsed = Number(minutesText)
                      setMinutesText(null)
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        editor.setCardio({ ...session.cardio!, minutes: parsed })
                      }
                    }}
                  />
                  <TextField
                    label="유산소 강도"
                    isLabelHidden
                    value={session.cardio.note ?? ''}
                    onChange={(note) => editor.setCardio({ ...session.cardio!, note })}
                    placeholder={intensityHintFor(session.cardio.type)}
                  />
                </HStack>
              )}
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                메모
              </Text>
              <TextAreaField
                label="메모"
                isLabelHidden
                rows={2}
                value={session.sessionNote ?? ''}
                onChange={editor.setNote}
                placeholder="컨디션, 특이사항"
              />
            </VStack>
          </Card>

          {/*
            X1 — 그 **날짜**의 식단 (PLAN-DIET §3이 규정했는데 빠져 있었다).
            세션이 하나뿐인 날은 기록 탭이 이 화면으로 바로 들어오므로, 여기가 없으면
            "식단만 있으면 보이고 운동까지 있으면 운동만 보이는" 상태가 된다.

            **오늘 화면·기록 탭과 같은 편집기를 쓴다** (D3 원칙). 요약만 따로 만들면
            식단 상태를 그리는 코드가 세 벌이 되고, 그게 이 프로젝트의 반복 결함이다.
            DietDayEditor 자체가 상단에 요약(마크·단백질·슬롯 수)을 갖고 있다.

            계획서와 다르게 한 것: "세션 여러 개인 날은 마지막 세션 상세 하단에만" 규칙을
            두지 않았다. 한 번에 한 상세 화면만 보이므로 중복 표시가 생기지 않고, 한쪽에만
            나오면 "왜 여기선 안 보이나"가 된다. 대신 라벨에 날짜를 적어 **세션이 아니라
            그 날짜의 식단**임을 드러낸다.
          */}
          {!diet.loading && diet.plans.length > 0 && (
            <>
              <Heading level={2}>{session.date} 식단</Heading>
              <DietDayEditor
                date={session.date}
                today={todayLocal()}
                plans={diet.plans}
                days={diet.days}
                defaultPlanId={diet.defaultPlanId}
                variantDefaults={diet.variantDefaults}
                userFoods={diet.userFoods}
                trainedThatDay={strengthDates(sessions).has(session.date)}
              />
            </>
          )}
        </Group>

        <Group>
          {/* §11: 잘못된 Day 선택 후 기록 → dayId 변경 + recordKey 재매핑 확인 */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                Day 변경
              </Text>
              {!changingDay ? (
                <HStack>
                  <Button variant="secondary" size="sm" label="잘못된 Day로 기록했나요?" onClick={() => setChangingDay(true)} />
                </HStack>
              ) : !plan ? (
                <>
                  <Text>이 세션을 어느 Day로 옮길까요? 기록 키(종목@Day)가 함께 재매핑됩니다.</Text>
                  <HStack gap={2} wrap="wrap">
                    {allDays
                      .filter((d) => d.id !== session.dayId)
                      .map((d) => (
                        <Button key={d.id} variant="secondary" label={d.name} onClick={() => setPendingDayId(d.id)} />
                      ))}
                  </HStack>
                  <HStack>
                    <Button variant="secondary" size="sm" label="취소" onClick={() => setChangingDay(false)} />
                  </HStack>
                </>
              ) : (
                <>
                  <Text weight="semibold">
                    {plan.fromDayId} → {plan.toDayId}
                  </Text>
                  {plan.remapped.length > 0 && (
                    <VStack gap={2}>
                      <Text type="supporting" color="secondary">
                        기록 키 재매핑 {plan.remapped.length}건
                      </Text>
                      <Rows>
                        {plan.remapped.map((r) => (
                          <Row
                            key={r.from}
                            label={
                              <Text type="code" size="sm" color="secondary">
                                {r.from} → {r.to}
                              </Text>
                            }
                          />
                        ))}
                      </Rows>
                    </VStack>
                  )}
                  {plan.unchanged.length > 0 && (
                    <Text color="secondary">키 유지 {plan.unchanged.length}건 (같은 정규 Day에 기록)</Text>
                  )}
                  {plan.kept.length > 0 && (
                    <Banner
                      status="warning"
                      title={`${plan.toDayId}에 없는 종목 ${plan.kept.length}개`}
                      description={`${plan.kept.map((k) => nameOf(k.from)).join(', ')} — 기록은 지우지 않고 원래 키를 유지합니다. 상세에서는 읽기 전용으로 표시됩니다.`}
                      collapsible={false}
                    />
                  )}
                  <HStack gap={2}>
                    <Button variant="secondary" label="취소" onClick={() => setPendingDayId(null)} />
                    <Button
                      variant="primary"
                      label="변경 적용"
                      onClick={() => {
                        editor.changeDay(bundle.routine, plan.toDayId)
                        setPendingDayId(null)
                        setChangingDay(false)
                        setOpenKey(null)
                      }}
                    />
                  </HStack>
                </>
              )}
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                위험 구역
              </Text>
              {confirmDelete ? (
                <>
                  <Text className="ax-text-error">이 세션 기록이 삭제됩니다. 되돌릴 수 없습니다.</Text>
                  <HStack gap={2}>
                    <Button variant="secondary" label="취소" onClick={() => setConfirmDelete(false)} />
                    <Button variant="destructive" label="정말 삭제" onClick={() => void editor.remove().then(onBack)} />
                  </HStack>
                </>
              ) : (
                <HStack>
                  <Button variant="destructive" label="이 세션 삭제" onClick={() => setConfirmDelete(true)} />
                </HStack>
              )}
            </VStack>
          </Card>
        </Group>

        <Button variant="secondary" width="100%" label="기록으로" onClick={onBack} />
      </Groups>
    </AxRoot>
  )
}
