import { useMemo, useState } from 'react'
import { hasCompensation } from '../lib/compensation'
import { weekdayKo } from '../lib/dates'
import { allRecordKeys, exerciseHistory } from '../lib/history'
import { noteHistory, noteLineText } from '../lib/noteHistory'
import { isInverseKey } from '../lib/weightScale'
import type { RoutineBundle } from '../lib/useRoutine'
import type { Session } from '../types'
import { Badge, Button, Card, Center, ClickableCard, Group, HStack, Icon, Row, Rows, Text, VStack } from '../ax'

/**
 * 종목별 보기 (DESIGN.md §5.3).
 * "recordKey 선택 → 세션 히스토리 리스트 (무게·반복수 추이)"
 *
 * 차트는 분석 탭(§5.4, 마일스톤 8)이 담당한다. 여기는 원본 숫자를 그대로 보여준다 —
 * (종목, Day) 조합별로 기록이 분리돼 있다는 것을 눈으로 확인하는 화면이기도 하다.
 */
export default function ExerciseHistoryScreen({
  bundle,
  sessions,
  onOpenSession,
}: {
  bundle: RoutineBundle
  sessions: Session[]
  onOpenSession: (sessionId: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const keys = useMemo(() => allRecordKeys(sessions, bundle.routine), [sessions, bundle.routine])
  const history = useMemo(
    () => (selected ? exerciseHistory(sessions, selected) : []),
    [sessions, selected],
  )
  /** 메모·보상작용 이력 (CC14) — 저장된 값에서 파생한다 */
  const notes = useMemo(
    () => (selected ? noteHistory(sessions, selected) : []),
    [sessions, selected],
  )

  const nameOf = (exerciseId: string) =>
    bundle.catalog.get(exerciseId)?.shortName ?? exerciseId

  if (keys.length === 0) {
    return (
      <Center>
        <Text color="secondary">아직 기록이 없습니다.</Text>
      </Center>
    )
  }

  if (!selected) {
    return (
      <Group>
        <Text type="supporting" color="secondary">
          같은 기계라도 Day가 다르면 다른 기록입니다 (무게대와 목적이 다름).
        </Text>
        {keys.map((info) => (
          <ClickableCard
            key={info.recordKey}
            label={`${nameOf(info.exerciseId)} ${info.dayId.toUpperCase()}`}
            onClick={() => setSelected(info.recordKey)}
          >
            <Rows>
            <Row
              label={
                <HStack gap={2} align="center" wrap="wrap">
                  <Text weight="semibold">{nameOf(info.exerciseId)}</Text>
                  <Badge variant="neutral" label={info.dayId.toUpperCase()} />
                  {info.group && <Badge variant="neutral" label={info.group} />}
                  {!info.known && <Badge variant="warning" label="현재 루틴에 없음" />}
                </HStack>
              }
              description={
                <Text type="code" size="sm" color="secondary">
                  {info.recordKey}
                </Text>
              }
              end={<Text color="secondary">{info.sessionCount}회</Text>}
            />
            </Rows>
          </ClickableCard>
        ))}
      </Group>
    )
  }

  const info = keys.find((k) => k.recordKey === selected)
  const best = history.reduce<number>((m, p) => Math.max(m, p.bestE1rm), 0)
  /*
    어시스티드(T8)는 표시 무게가 클수록 쉽다. e1RM·볼륨·"최고" 뱃지는 전부 방향이
    반대가 되므로 숨기고 안내로 바꾼다. 무게·반복수·감각은 사실이라 그대로 보여준다.
  */
  const inverse = isInverseKey(bundle.catalog, selected)

  return (
    <>
      <HStack>
        <Button variant="ghost" icon={<Icon icon="chevronLeft" />} label="종목 목록" onClick={() => setSelected(null)} />
      </HStack>
      <Group>
        <Card>
          <VStack gap={3}>
            <Text type="supporting" color="secondary">
              {info ? nameOf(info.exerciseId) : selected}
            </Text>
            <Rows>
              <Row
                label={
                  <Text type="code" weight="semibold">
                    {selected}
                  </Text>
                }
                description={
                  <Text type="supporting" color="secondary">
                    {history.length}개 세션
                  </Text>
                }
                end={!inverse && <Text color="secondary">최고 e1RM {best.toFixed(1)}kg</Text>}
              />
            </Rows>
            {inverse && (
              <Text type="supporting" className="ax-text-warning">
                보조 무게 종목 — 숫자가 <strong>줄어드는 것이 진전</strong>입니다. e1RM·볼륨은 방향이 반대라 표시하지 않습니다.
              </Text>
            )}
          </VStack>
        </Card>

        {/*
          메모 타임라인 (CC14). 저장은 이미 있으니 **읽기만** 추가한다 —
          같은 종목에서 반복되는 감각·보상작용 패턴이 한 화면에 보여야 한다.
        */}
        {notes.length > 0 && (
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                메모 이력 ({notes.length})
              </Text>
              <Rows>
                {notes.map((n) => (
                  <Row
                    key={n.sessionId}
                    label={
                      <HStack gap={2} align="center" wrap="wrap">
                        <Text weight="semibold">
                          {n.date} ({weekdayKo(n.date)})
                        </Text>
                        {n.sensoryScore !== undefined && <Badge variant="neutral" label={`감각 ${n.sensoryScore}`} />}
                      </HStack>
                    }
                    description={
                      <Text type="supporting" color="secondary">
                        {noteLineText(n)}
                      </Text>
                    }
                  />
                ))}
              </Rows>
            </VStack>
          </Card>
        )}
      </Group>

      <Group>
        <Text type="supporting" color="secondary">
          세션 히스토리 (최신순)
        </Text>
        {history.map((point) => (
          <ClickableCard
            key={point.sessionId}
            label={`${point.date} ${weekdayKo(point.date)}요일 세션`}
            onClick={() => onOpenSession(point.sessionId)}
          >
            <Rows>
            <Row
              label={
                <HStack gap={2} align="center" wrap="wrap">
                  <Text weight="semibold">
                    {point.date} ({weekdayKo(point.date)})
                  </Text>
                  {point.mode !== 'normal' && (
                    <Badge variant="warning" label={point.mode === 'return' ? '복귀' : '디로드'} />
                  )}
                  {!inverse && point.bestE1rm >= best && history.length > 1 && <Badge variant="info" label="최고" />}
                </HStack>
              }
              description={
                <Text type="supporting" color="secondary">
                  {point.topWeight}kg · {point.sets.map((s) => s.reps).join(' / ')}
                  {point.sensoryScore !== undefined && ` · 감각 ${point.sensoryScore}`}
                  {hasCompensation(point.compensation) && ' · 보상작용'}
                  {point.pain && ' · 통증'}
                </Text>
              }
              end={
                !inverse && (
                  <VStack gap={0} align="end">
                    <Text weight="semibold" hasTabularNumbers>
                      {Math.round(point.volume).toLocaleString()}
                    </Text>
                    <Text type="supporting" color="secondary">
                      kg·회
                    </Text>
                  </VStack>
                )
              }
            />
            </Rows>
          </ClickableCard>
        ))}
      </Group>
    </>
  )
}
