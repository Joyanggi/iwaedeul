import { useState } from 'react'
import { db, setSettings } from '../db'
import { BUNDLED_ROUTINE } from '../db/seed'
import { validateRoutine } from '../db/validateRoutine'
import { pickTextFile } from '../lib/pickFile'
import { OUTCOME_MESSAGE, shareFile } from '../lib/share'
import type { Exercise, RoutineTemplate } from '../types'
import { Banner, Button, Card, HStack, Row, Rows, Text, VStack } from '../ax'

/**
 * 루틴 JSON 가져오기/내보내기 (DESIGN.md §5.5 — v2.4 교체 경로).
 *
 * **가져오기 전에 validateRoutine을 통과해야 한다.** muscleSets 합이 어긋난 루틴을
 * 넣으면 §4 제안 로직과 §5.1 대시보드가 서로 다른 숫자를 말하기 시작하고,
 * 원인을 찾기 매우 어려워진다. 검증 실패 시 아예 넣지 않는다.
 */
export default function RoutineIoPanel({
  routine,
  catalog,
}: {
  routine: RoutineTemplate
  catalog: Map<string, Exercise>
}) {
  const [problems, setProblems] = useState<string[]>([])
  const [staged, setStaged] = useState<{ name: string; routine: RoutineTemplate } | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const onExport = async () => {
    const outcome = await shareFile({
      filename: `routine-${routine.id}.json`,
      text: JSON.stringify(routine, null, 2),
      mimeType: 'application/json',
      title: routine.name,
    })
    setStatus(`루틴 내보내기 — ${OUTCOME_MESSAGE[outcome]}`)
  }

  const onPick = async () => {
    setProblems([])
    setStaged(null)
    setStatus(null)
    const picked = await pickTextFile('application/json,.json')
    if (!picked) return

    let parsed: RoutineTemplate
    try {
      parsed = JSON.parse(picked.text) as RoutineTemplate
    } catch (err) {
      setProblems([`JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)}`])
      return
    }
    if (!parsed?.id || !Array.isArray(parsed.days) || !parsed.rules || !parsed.muscleTargets) {
      setProblems(['루틴 파일 형태가 아닙니다 (id / days / rules / muscleTargets 필요)'])
      return
    }

    // 카탈로그는 현재 종목 + 가져올 루틴이 참조하는 종목 기준으로 검사한다
    const catalogList = [...catalog.values()]
    const found = validateRoutine(parsed, catalogList)
    if (found.length > 0) {
      setProblems(found)
      return
    }
    setStaged({ name: picked.name, routine: parsed })
  }

  const onApply = async () => {
    if (!staged) return
    await db.routines.put(staged.routine)
    /*
      **번들의 리비전**을 기록한다 (가져온 루틴의 것이 아니다).
      의미는 "이 번들 리비전 기준으로 사용자가 루틴을 직접 골랐다"이고, 그래서
      ensureSeed가 다음 부팅에 번들로 되돌리지 않는다. 가져온 파일에 seedRevision이
      없을 수도 있는데(직접 만든 루틴), 그 값을 넣으면 매 부팅 재주입되어 덮어써진다.
    */
    await setSettings({
      activeRoutineId: staged.routine.id,
      seededRoutineRevision: BUNDLED_ROUTINE.seedRevision,
    })
    setStaged(null)
    setStatus(`${staged.routine.name} 적용됨`)
  }

  return (
    <Card>
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          루틴 JSON
        </Text>

        {problems.length > 0 && (
          <Banner
            status="error"
            title="정합성 검사 실패 — 가져오지 않았습니다"
            collapsible={false}
            description={problems.map((p) => (
              <span key={p}>
                · {p}
                <br />
              </span>
            ))}
          />
        )}

        {staged ? (
          <>
            <Rows>
              <Row
                label={<Text weight="semibold">{staged.routine.name}</Text>}
                description={
                  <Text type="code">
                    {staged.routine.id} · v{staged.routine.version}
                  </Text>
                }
                end={
                  <Text color="secondary">
                    Day {staged.routine.days.length}+{staged.routine.fallbackDays?.length ?? 0}
                  </Text>
                }
              />
            </Rows>
            <Text type="supporting" color="secondary">
              정합성 검사 통과. 적용하면 활성 루틴이 이 루틴으로 바뀝니다. 세션 기록은 그대로
              유지됩니다 (기록 키 기준).
            </Text>
            <HStack gap={2}>
              <Button variant="secondary" size="sm" label="취소" onClick={() => setStaged(null)} />
              <Button variant="primary" size="sm" label="적용" onClick={() => void onApply()} />
            </HStack>
          </>
        ) : (
          <HStack gap={2} wrap="wrap">
            <Button variant="secondary" size="sm" label="현재 루틴 내보내기" onClick={() => void onExport()} />
            <Button variant="secondary" size="sm" label="루틴 가져오기" onClick={() => void onPick()} />
          </HStack>
        )}

        {status && <Text color="accent">{status}</Text>}
      </VStack>
    </Card>
  )
}
