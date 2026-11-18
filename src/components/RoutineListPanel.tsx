import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { BUNDLED_ROUTINE } from '../db/seed'
import { OPEN_SESSION_BLOCK } from '../lib/routineEdit'
import { activateRoutine, deleteRoutine } from '../lib/routineStore'
import { useSessionStore } from '../store/session'
import { Button, Card, HStack, Row, Rows, Text, VStack } from '../ax'

/**
 * 루틴 목록 (v1.16 NN4) — 새 루틴·전환·삭제.
 * 읽기만 한다(useLiveQuery). 쓰기는 routineStore의 함수로만 한다.
 */
export default function RoutineListPanel({
  activeId,
  onNew,
}: {
  activeId: string
  onNew: () => void
}) {
  const openSession = useSessionStore((s) => s.session)
  const routines = useLiveQuery(() => db.routines.toArray(), [])
  const [pending, setPending] = useState<{ id: string; kind: 'use' | 'delete' } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const run = async (action: () => Promise<string[]>) => {
    const found = await action()
    setProblem(found.length > 0 ? found.join(' · ') : null)
    setPending(null)
  }

  return (
    <Card>
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          루틴 목록
        </Text>
        <Rows>
          {(routines ?? []).flatMap((r) => {
            const isActive = r.id === activeId
            const isBundled = r.id === BUNDLED_ROUTINE.id
            const asking = pending?.id === r.id ? pending.kind : null
            const entry = (
              <Row
                key={r.id}
                label={<Text weight="semibold">{r.name}</Text>}
                description={
                  <Text type="supporting" color="secondary">
                    Day {r.days.length}개
                    {isActive && ' · 사용 중'}
                    {!isActive && isBundled && ' · 기본'}
                  </Text>
                }
                end={
                  (!isActive && asking === null) ? (
                    <HStack gap={2}>
                      <Button
                        variant="secondary"
                        size="sm"
                        label="이 루틴 쓰기"
                        isDisabled={openSession !== null}
                        onClick={() => setPending({ id: r.id, kind: 'use' })}
                      />
                      {!isBundled && (
                        <Button variant="destructive" size="sm" label="삭제" onClick={() => setPending({ id: r.id, kind: 'delete' })} />
                      )}
                    </HStack>
                  ) : null
                }
              />
            )
            if (asking === null) return [entry]
            // 확인 문구는 줄 아래 한 줄(listitem)로 둔다 — 목록 안에 listitem이 아닌 것을 두지 않는다
            return [
              entry,
              <Row
                key={`${r.id}-confirm`}
                label={
                  <VStack gap={2}>
                    <Text type="supporting" color="secondary">
                      {asking === 'use'
                        ? '루틴을 바꾸면 홈의 제안과 주간 목표가 이 루틴 기준이 됩니다. 지난 기록은 그대로 남지만, 이 루틴에 없는 Day·종목은 이름과 그룹 없이 보일 수 있습니다. 다시 바꾸면 원래대로 보입니다.'
                        : '이 루틴을 삭제합니다. 운동 기록은 지워지지 않지만, 이 루틴에만 있던 Day·종목의 기록은 이름과 그룹을 다시 볼 수 없게 됩니다. 되돌릴 수 없습니다.'}
                    </Text>
                    <HStack gap={2}>
                      {asking === 'use' ? (
                        <Button variant="secondary" size="sm" label="바꾸기" onClick={() => void run(() => activateRoutine(r.id))} />
                      ) : (
                        <Button variant="destructive" size="sm" label="삭제" onClick={() => void run(() => deleteRoutine(r.id, BUNDLED_ROUTINE.id))} />
                      )}
                      <Button variant="secondary" size="sm" label="취소" onClick={() => setPending(null)} />
                    </HStack>
                  </VStack>
                }
              />,
            ]
          })}
        </Rows>
        {problem !== null && (
          <Text type="supporting" color="secondary">
            {problem}
          </Text>
        )}
        <HStack>
          <Button variant="secondary" label="＋ 새 루틴 만들기" isDisabled={openSession !== null} onClick={onNew} />
        </HStack>
        {openSession !== null && (
          <Text type="supporting" color="secondary">
            {OPEN_SESSION_BLOCK.activate}
          </Text>
        )}
      </VStack>
    </Card>
  )
}
