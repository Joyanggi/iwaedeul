import { useState } from 'react'
import { CARDIO_TYPES, intensityHintFor } from '../lib/cardio'
import { doneSets } from '../lib/derive'
import { partialEntries, resolveSessionAdjust, sessionAdjustText, sessionSetPlan } from '../lib/setPlan'
import { compensationEntriesOf } from '../lib/compensationWatch'
import type { RoutineBundle } from '../lib/useRoutine'
import { useSessionStore } from '../store/session'
import { Banner, Button, Heading, HStack, Sheet, Text, TextAreaField, TextField, ToggleButton, VStack } from '../ax'

/**
 * 세션 종료 (DESIGN.md §5.2).
 * 미완료 종목 확인 + 유산소 기록 + 메모를 한 시트에서 처리한다.
 * 단계를 쪼개면 마찰이 늘고, 마찰 최소화가 이 앱의 최우선 기준이다 (§1).
 */
export default function FinishSheet({
  bundle,
  onClose,
  onFinished,
  onDiscarded,
}: {
  bundle: RoutineBundle
  onClose: () => void
  /** 기록을 남기고 종료 → 요약 화면으로 */
  onFinished: () => void
  /**
   * 버리고 종료 → 홈으로.
   * 요약 화면으로 보내면 lastFinished가 없어서 "표시할 세션이 없습니다"가 뜬다.
   * 버린 세션의 요약을 보여줄 것이 애초에 없으므로 경로를 분리한다.
   */
  onDiscarded: () => void
}) {
  const session = useSessionStore((s) => s.session)
  const { finish, setCardio, setNote, discard } = useSessionStore()
  const [cardioType, setCardioType] = useState<string | null>(null)
  const [minutes, setMinutes] = useState('20')
  const [cardioNote, setCardioNote] = useState('')
  const [note, setLocalNote] = useState(session?.sessionNote ?? '')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  if (!session) return null

  const incomplete = session.entries.filter((e) => !e.skipped && doneSets(e).length === 0)
  const partial = partialEntries(session)
  // 내보내기 헤더 줄과 같은 문자열 — 판단이 아니라 사실이라 경고 색을 쓰지 않는다
  const adj = resolveSessionAdjust(session, bundle.routine)
  const adjustLine = sessionAdjustText(session, sessionSetPlan(session, bundle.routine, adj), adj)
  // 기록 직후에 인지시킨다 (T11) — 다음 세션에 카드를 열 때까지 기다리면
  // "무게가 과했다"는 신호를 판단할 시점이 이미 지나 있다
  const compensated = compensationEntriesOf(session)
  const doneCount = session.entries.reduce((n, e) => n + doneSets(e).length, 0)
  const anyDone = doneCount > 0

  const nameOf = (recordKey: string) => {
    const exerciseId = recordKey.slice(0, recordKey.lastIndexOf('@'))
    return bundle.catalog.get(exerciseId)?.shortName ?? exerciseId
  }

  const submit = async () => {
    if (cardioType) {
      const parsed = Number(minutes)
      setCardio({
        type: cardioType,
        minutes: Number.isFinite(parsed) ? parsed : 0,
        note: cardioNote || undefined,
      })
    }
    setNote(note)
    await finish()
    onFinished()
  }

  return (
    <Sheet label="세션 종료" purpose="form" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <VStack gap={2}>
            <Heading level={2}>세션 종료</Heading>
            {adjustLine && <Text color="secondary">{adjustLine}</Text>}

            {incomplete.length > 0 && (
              <Banner
                status="warning"
                collapsible={false}
                title={`손대지 않은 종목 ${incomplete.length}개`}
                description={`${incomplete.map((e) => nameOf(e.recordKey)).join(', ')} — 그대로 종료하면 기록되지 않습니다.`}
              />
            )}
            {partial.length > 0 && (
              <Text color="secondary">
                세트가 남은 종목: {partial.map((p) => `${nameOf(p.recordKey)} ${p.done}/${p.rows}`).join(' · ')}
              </Text>
            )}
            {/* 이번 세션 보상작용 (T11). 루틴 문서 13장 — 보이면 무게가 과한 것 */}
            {compensated.length > 0 && (
              <Text color="secondary">
                보상작용 기록: {compensated.map((c) => `${nameOf(c.recordKey)} — ${c.note}`).join(' · ')}
              </Text>
            )}
          </VStack>

          <VStack gap={2}>
            <Heading level={2}>유산소 (선택)</Heading>
            <HStack gap={2} wrap="wrap">
              {CARDIO_TYPES.map((t) => t.name).map((t) => (
                <ToggleButton
                  key={t}
                  className="ax-toggle"
                  label={t}
                  isPressed={cardioType === t}
                  onPressedChange={() => setCardioType(cardioType === t ? null : t)}
                />
              ))}
            </HStack>
            {cardioType && (
              <HStack gap={2}>
                <TextField
                  label="유산소 시간(분)"
                  isLabelHidden
                  inputMode="numeric"
                  value={minutes}
                  onChange={setMinutes}
                  placeholder="분"
                />
                <TextField
                  label="유산소 강도"
                  isLabelHidden
                  value={cardioNote}
                  onChange={setCardioNote}
                  placeholder={intensityHintFor(cardioType)}
                />
              </HStack>
            )}
          </VStack>

          <VStack gap={2}>
            <Heading level={2}>메모 (선택)</Heading>
            <TextAreaField
              label="메모"
              isLabelHidden
              rows={2}
              value={note}
              onChange={setLocalNote}
              placeholder="컨디션, 특이사항"
            />
          </VStack>

          <VStack gap={3}>
            <Button variant="primary" width="100%" label="기록 마치기" onClick={() => void submit()} />
            <Button variant="secondary" width="100%" label="계속하기" onClick={dismiss} />

            {/*
              기록이 있어도 버릴 수 있어야 한다. 이전에는 !anyDone 조건이라, 세트를 하나
              체크한 뒤 "잘못된 Day였다"고 깨달으면 버릴 수도 마칠 수도 없는 상태가 됐다.
              (Day 변경은 기록 탭에서 가능하지만 진행 중 세션은 기록 탭에 없다)
              기록이 있을 때는 세트 수를 보여주고 확인을 한 단계 더 받는다.
            */}
            {confirmDiscard ? (
              <VStack gap={3}>
                {/* Text에는 error 색이 없다 → OpenSessionSheet·루틴 편집의 삭제 확인처럼 Banner error */}
                <Banner
                  status="error"
                  collapsible={false}
                  title={anyDone ? `${doneCount}세트 기록이 삭제됩니다. 되돌릴 수 없습니다.` : '이 세션을 삭제합니다.'}
                />
                <HStack gap={3}>
                  <Button variant="secondary" width="100%" label="취소" onClick={() => setConfirmDiscard(false)} />
                  <Button variant="destructive" width="100%" label="정말 버리기" onClick={() => void discard().then(onDiscarded)} />
                </HStack>
              </VStack>
            ) : (
              <Button variant="destructive" width="100%" label="이 세션 버리기" onClick={() => setConfirmDiscard(true)} />
            )}
          </VStack>
        </VStack>
      )}
    </Sheet>
  )
}
