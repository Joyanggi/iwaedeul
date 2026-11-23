import { useMemo, useState } from 'react'
import { createBackup } from '../lib/backup'
import { addDays, addMonths, monthStart, todayLocal } from '../lib/dates'
import { completedSessions } from '../lib/derive'
import { useExerciseSettings } from '../lib/useExerciseSettings'
import { useDiet } from '../lib/useDiet'
import { exportMarkdown, type ExportRange } from '../lib/exportMarkdown'
import { OUTCOME_MESSAGE, copyText, shareFile, shareText } from '../lib/share'
import type { RoutineBundle } from '../lib/useRoutine'
import type { Phase, Session } from '../types'
import { Button, Card, HStack, Text, ToggleButton, VStack } from '../ax'
import { CodeBlock } from '../ax/settings'

type PresetId = 'w2' | 'w4' | 'month' | 'm3' | 'all'

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'w2', label: '최근 2주' },
  { id: 'w4', label: '최근 4주' },
  { id: 'month', label: '이번 달' },
  { id: 'm3', label: '최근 3개월' },
  { id: 'all', label: '전체' },
]

/**
 * `all`의 시작일은 **운동과 식단 중 더 오래된 것**을 쓴다 (D4).
 *
 * 세션만 보면, 식단을 먼저 쓰기 시작했거나 운동 기록이 없는 기간의 식단이 "전체"에서
 * 통째로 빠진다 — 실측에서 8/1·8/2 식단이 빠졌다. 식단 섹션을 넣은 목적이
 * LLM 상관 분석이므로 범위가 한쪽만 보면 안 된다.
 */
function rangeFor(
  preset: PresetId,
  today: string,
  sessions: Session[],
  dietDates: string[] = [],
): ExportRange {
  const done = completedSessions(sessions)
  const oldestSession = done.length > 0 ? done[done.length - 1].date : null
  const oldestDiet = dietDates.length > 0 ? dietDates.slice().sort()[0] : null
  const candidates = [oldestSession, oldestDiet].filter((d): d is string => d !== null)
  const oldest = candidates.length > 0 ? candidates.sort()[0] : today
  switch (preset) {
    case 'w2':
      return { from: addDays(today, -13), to: today }
    case 'w4':
      return { from: addDays(today, -27), to: today }
    case 'month':
      return { from: monthStart(today), to: today }
    case 'm3':
      return { from: addMonths(today, -3), to: today }
    case 'all':
      return { from: oldest, to: today }
  }
}

/**
 * 내보내기 (DESIGN.md §5.5).
 * Markdown = LLM 분석용, JSON = 전체 백업. 전달은 iOS 공유 시트 우선(§5.5).
 */
export default function ExportPanel({
  bundle,
  sessions,
  phase,
}: {
  bundle: RoutineBundle
  sessions: Session[]
  phase: Phase
}) {
  const [preset, setPreset] = useState<PresetId>('w2')
  const [status, setStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const today = todayLocal()
  const exerciseSettings = useExerciseSettings()
  const diet = useDiet()

  const dietDates = useMemo(() => diet.days.map((d) => d.date), [diet.days])
  const range = useMemo(
    () => rangeFor(preset, today, sessions, dietDates),
    [preset, today, sessions, dietDates],
  )
  const inRange = useMemo(
    () => completedSessions(sessions).filter((s) => s.date >= range.from && s.date <= range.to),
    [sessions, range],
  )

  const buildMd = () =>
    exportMarkdown({
      sessions,
      routine: bundle.routine,
      catalog: bundle.catalog,
      phase,
      range,
      exerciseSettings,
      dietPlans: diet.plans,
      dietDays: diet.days,
    })

  const onShareMd = async () => {
    const text = buildMd()
    const outcome = await shareText({
      text,
      title: `운동 기록 ${range.from} ~ ${range.to}`,
      filename: `workout-${range.from}_${range.to}.md`,
    })
    setStatus(`Markdown — ${OUTCOME_MESSAGE[outcome]}`)
  }

  const onCopyMd = async () => {
    const ok = await copyText(buildMd())
    setStatus(ok ? 'Markdown — 클립보드에 복사했습니다' : 'Markdown — 복사 실패')
  }

  const onShareJson = async () => {
    const file = await createBackup()
    const outcome = await shareFile({
      filename: `workout-backup-${today}.json`,
      text: JSON.stringify(file, null, 2),
      mimeType: 'application/json',
      title: '운동 기록 백업',
    })
    setStatus(`JSON 백업 — ${OUTCOME_MESSAGE[outcome]}`)
  }

  return (
    <Card>
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          내보내기
        </Text>

        {/* 다섯 기간이 한 줄(SegmentedControl)에 안 들어가 글자가 잘린다(390 실측) — 줄을 바꾸는 켜기 버튼으로 둔다 */}
        <HStack wrap="wrap" gap={2}>
          {PRESETS.map((p) => (
            <ToggleButton
              key={p.id}
              className="ax-toggle"
              label={p.label}
              isPressed={preset === p.id}
              onPressedChange={() => {
                setPreset(p.id)
                setPreview(null)
              }}
            />
          ))}
        </HStack>

        <Text type="supporting" color="secondary">
          {range.from} ~ {range.to} · 세션 {inRange.length}개
        </Text>

        <Text weight="semibold">Markdown (LLM 분석용)</Text>
        <HStack gap={2} wrap="wrap">
          <Button variant="primary" size="sm" label="공유" onClick={() => void onShareMd()} />
          <Button variant="secondary" size="sm" label="복사" onClick={() => void onCopyMd()} />
          <Button
            variant="secondary"
            size="sm"
            label={preview === null ? '미리보기' : '닫기'}
            onClick={() => setPreview(preview === null ? buildMd() : null)}
          />
        </HStack>

        {preview !== null && <CodeBlock code={preview} isWrapped maxHeight="40vh" hasCopyButton={false} />}

        <Text weight="semibold">JSON (전체 백업)</Text>
        <HStack>
          <Button variant="secondary" size="sm" label="백업 파일 공유" onClick={() => void onShareJson()} />
        </HStack>
        <Text type="supporting" color="secondary">
          기간과 무관하게 전체를 담습니다. Gist 토큰 같은 비밀값은 포함되지 않습니다.
        </Text>

        {status && <Text color="accent">{status}</Text>}
      </VStack>
    </Card>
  )
}
