import type { ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { cardioText } from '../lib/cardio'
import { compensationSummary, hasCompensation } from '../lib/compensation'
import { hasPain } from '../lib/pain'
import { holdReasonText, progressionVerdicts } from '../lib/progression'
import { revertWarning } from '../lib/bGroupGuide'
import { sessionsForRecord } from '../lib/prefill'
import { routineExerciseOfEntry } from '../lib/derive'
import { buildScaleMap, formatProgression, isInverseKey } from '../lib/weightScale'
import { useExerciseSettings } from '../lib/useExerciseSettings'
import { PR_LABEL, detectPrs, topPrPerRecord } from '../lib/pr'
import { formatClock, formatElapsed } from '../lib/dates'
import { doneSets, e1rm, findDayForRecord, orderDeviations, totalDoneSets, totalVolume } from '../lib/derive'
import type { RoutineBundle } from '../lib/useRoutine'
import { useSessionStore } from '../store/session'
import { useSettings } from '../store/settings'
import { parseRecordKey } from '../types'
import { AxRoot, Badge, Button, Card, Center, Grid, Group, Groups, Heading, HStack, Text, VStack } from '../ax'

/**
 * 카드 안 한 줄 — 이름(+뱃지)·설명·오른쪽 끝 값. Row을 안 쓴 이유: Row은 줄마다 위·아래 안쪽 여백 8px이 있어
 * 카드의 마지막 줄 아래가 제목 위보다 9px 넓어졌다(ui-check 안쪽 대칭 실측). 줄 사이 간격은 VStack gap 하나다.
 * label·description은 Text 노드로 넘긴다 — 긴 글이 잘리지 않게.
 */
function Row({ label, description, end }: { label: ReactNode; description?: ReactNode; end?: ReactNode }) {
  return (
    <HStack role="listitem" gap={3} align="start" justify="between">
      <VStack gap={1}>
        {label}
        {description}
      </VStack>
      {end}
    </HStack>
  )
}

/** 카드 안 줄 목록 */
function Rows({ children }: { children: ReactNode }) {
  return (
    <VStack role="list" gap={3}>
      {children}
    </VStack>
  )
}

export default function SummaryScreen({ bundle, onDone }: { bundle: RoutineBundle; onDone: () => void }) {
  const session = useSessionStore((s) => s.lastFinished)
  const phase = useSettings((s) => s.currentPhase)
  const allSessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const exerciseSettings = useExerciseSettings()

  if (!session) {
    return (
      <AxRoot>
        <Center>
          <VStack gap={3} align="center">
            <Text color="secondary">표시할 세션이 없습니다.</Text>
            <Button variant="secondary" label="홈으로" onClick={onDone} />
          </VStack>
        </Center>
      </AxRoot>
    )
  }

  const day = findDayForRecord(bundle.routine, session.dayId)
  const elapsed = session.endedAt ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime() : 0
  /*
    어시스티드(T8)는 볼륨에서 뺀다 — 보조 무게 × 반복은 볼륨이 아니고, 보조를 많이
    받을수록 숫자가 커져 방향이 반대가 된다. 뺐다는 사실을 캡션으로 알린다.
  */
  const isInverse = (rk: string) => isInverseKey(bundle.catalog, rk)
  const volume = totalVolume(session, isInverse)
  const volumeExcluded = session.entries.some((e) => isInverse(e.recordKey) && doneSets(e).length > 0)
  const timeline = orderDeviations(session)

  const nameOf = (recordKey: string) =>
    bundle.catalog.get(parseRecordKey(recordKey).exerciseId)?.shortName ?? parseRecordKey(recordKey).exerciseId

  // 다음 세션 증량 대상 (§7 더블 프로그레션).
  // 홈 배지(§5.1)와 같은 함수를 쓴다 — 두 화면이 다른 답을 말하면 안 된다.
  const verdicts = progressionVerdicts(
    session,
    bundle.routine,
    phase,
    buildScaleMap(exerciseSettings, bundle.routine.rules.weightIncrementKg),
    bundle.catalog,
  )
  // 수행 순서 (performedOrder 없으면 뒤로) — 같으면 entry 순서 유지
  const nextWeightRows = session.entries
    .filter((e) => verdicts.has(e.recordKey))
    .sort((a, b) => (a.performedOrder ?? Infinity) - (b.performedOrder ?? Infinity))
    .map((e) => ({
      recordKey: e.recordKey,
      name: nameOf(e.recordKey),
      verdict: verdicts.get(e.recordKey)!,
      inverse: isInverseKey(bundle.catalog, e.recordKey),
    }))

  /*
    B그룹 복귀 경고 (T10, Phase 2+). 루틴 문서 9장의 절대 기준 —
    무게를 올렸는데 감각이 1점 이하로 떨어졌으면 즉시 이전 무게로 돌린다.
    다음 세션 프리필은 이미 자동으로 내려가지만(prefill.bGroup), 이유를 여기서 알려야
    "왜 무게가 내려갔지"가 되지 않는다.
  */
  const reverts = session.entries.flatMap((entry) => {
    const routineExercise = routineExerciseOfEntry(bundle.routine, entry)
    if (!routineExercise) return []
    const warning = revertWarning({
      history: sessionsForRecord(allSessions, entry.recordKey),
      recordKey: entry.recordKey,
      routineExercise,
      phase,
    })
    return warning
      ? [
          {
            recordKey: entry.recordKey,
            name: nameOf(entry.recordKey),
            ...warning,
          },
        ]
      : []
  })

  // PR (T5). 감량기에는 증량 조건이 잘 안 뜨므로 e1RM·반복 PR이 진전을 보여주는 주 채널이다
  const prs = topPrPerRecord(detectPrs(allSessions, session, isInverse))

  const lowSensory = session.entries.filter(
    (e) => e.sensoryScore !== undefined && e.sensoryScore <= 1 && doneSets(e).length > 0,
  )

  /*
    "최고 세트"는 e1RM 기준이라 어시스티드(T8)에서는 **가장 많이 보조받은 세트**를
    최고로 고른다. 설계 문서 F2 목록에 없던 경로지만 거짓 신호라는 성질이 같고,
    수용 기준("보조를 늘려도 거짓 신호가 없다")에 걸리므로 함께 제외한다.
  */
  const bestSet = session.entries
    .filter((e) => !isInverse(e.recordKey))
    .flatMap((e) => doneSets(e).map((s) => ({ ...s, recordKey: e.recordKey })))
    .sort((a, b) => e1rm(b.weight, b.reps) - e1rm(a.weight, a.reps))[0]

  /*
    Row의 label·description은 문자열이면 한 줄로 잘린다(Item.js) — 긴 메모·종목 이름이 잘리지 않게
    전부 Text 노드로 넘긴다. 경고색은 Text의 색 이름에 없어 ax-text-warning, 증량색은 color="accent".
  */
  const sub = (node: ReactNode) => (
    <Text type="supporting" color="secondary">
      {node}
    </Text>
  )

  // 카드 묶음 셋: 이번 세션 → 다음에 할 것 → 되돌아보기 (PLAN v1.20 RR9). 카드의 내용과 보이는 조건은 그대로다.
  return (
    <AxRoot>
      <Groups className="ax-summary">
        <Group>
          <Heading level={1}>수고했어요 🔥</Heading>
          <Text color="secondary">
            {session.date} · {day?.name ?? session.dayId}
          </Text>

          <Card>
            <VStack gap={3}>
              <Grid columns={3} gap={3}>
                <VStack gap={1}>
                  <Heading level={2}>{totalDoneSets(session)}</Heading>
                  <Text type="supporting" color="secondary">
                    완료 세트
                  </Text>
                </VStack>
                <VStack gap={1}>
                  <Heading level={2}>{Math.round(volume).toLocaleString()}</Heading>
                  <Text type="supporting" color="secondary">
                    총 볼륨 (kg·회){volumeExcluded && ' · 어시스트 종목 제외'}
                  </Text>
                </VStack>
                <VStack gap={1}>
                  <Heading level={2}>{formatElapsed(elapsed)}</Heading>
                  <Text type="supporting" color="secondary">
                    소요 시간
                  </Text>
                </VStack>
              </Grid>
              {bestSet && (
                <Text type="supporting" color="secondary">
                  최고 세트: {nameOf(bestSet.recordKey)} {bestSet.weight}kg × {bestSet.reps}회 (e1RM{' '}
                  {e1rm(bestSet.weight, bestSet.reps).toFixed(1)}kg)
                </Text>
              )}
            </VStack>
          </Card>

          {prs.length > 0 && (
            <Card>
              <VStack gap={2}>
                <Text type="supporting" color="secondary">
                  개인 기록 🎉
                </Text>
                <Rows>
                  {prs.map((pr) => (
                    <Row
                      key={`${pr.recordKey}-${pr.kind}`}
                      label={
                        <HStack gap={2} align="center" wrap="wrap">
                          <Text>{nameOf(pr.recordKey)}</Text>
                          <Badge variant="info" label={PR_LABEL[pr.kind]} />
                        </HStack>
                      }
                      description={sub(
                        pr.kind === 'reps'
                          ? `${pr.atWeight}kg에서 ${pr.previous}회 → ${pr.value}회`
                          : `${pr.previous} → ${pr.value}${pr.kind === 'weight' ? 'kg' : 'kg (추정)'}`,
                      )}
                    />
                  ))}
                </Rows>
              </VStack>
            </Card>
          )}
        </Group>

        {(nextWeightRows.length > 0 || reverts.length > 0) && (
          <Group>
            {nextWeightRows.length > 0 && (
              <Card>
                <VStack gap={2}>
                  <Text type="supporting" color="secondary">
                    다음 세션 무게 (A그룹)
                  </Text>
                  <Rows>
                    {nextWeightRows.map(({ recordKey, name, verdict, inverse }) => (
                      <Row
                        key={recordKey}
                        label={<Text>{name}</Text>}
                        description={sub(
                          verdict.kind === 'up'
                            ? '모든 세트 상단 도달 · 보상작용 없음'
                            : holdReasonText(verdict.reason),
                        )}
                        end={
                          verdict.kind === 'up' ? (
                            <Text color="accent">{formatProgression(verdict.from, verdict.to, inverse)}</Text>
                          ) : (
                            <Text color="secondary">{verdict.from}kg 유지</Text>
                          )
                        }
                      />
                    ))}
                  </Rows>
                </VStack>
              </Card>
            )}

            {reverts.length > 0 && (
              <Card>
                <VStack gap={2}>
                  <Text type="supporting" color="secondary">
                    감각 저하 — 이전 무게로 복귀
                  </Text>
                  <Rows>
                    {reverts.map((r) => (
                      <Row
                        key={r.recordKey}
                        label={<Text>{r.name}</Text>}
                        description={sub('무게를 올린 뒤 감각이 1점 이하 — 문서 9장의 절대 기준입니다')}
                        end={
                          <Text className="ax-text-warning">
                            {r.from} → {r.to}kg
                          </Text>
                        }
                      />
                    ))}
                  </Rows>
                  {sub(`다음 세션 프리필이 자동으로 ${reverts.map((r) => `${r.to}kg`).join(' · ')}로 내려갑니다.`)}
                </VStack>
              </Card>
            )}
          </Group>
        )}

        <Group>
          {/* 감각 0~1점이 반복되는 종목은 자극이 목표 부위에 안 가고 있다는 신호 (§5.4) */}
          {lowSensory.length > 0 && (
            <Card>
              <VStack gap={2}>
                <Text type="supporting" color="secondary">
                  감각이 약했던 종목
                </Text>
                <Rows>
                  {lowSensory.map((entry) => (
                    <Row
                      key={entry.recordKey}
                      label={<Text>{nameOf(entry.recordKey)}</Text>}
                      description={sub(entry.sensoryNote || '메모 없음')}
                      end={<Text className="ax-text-warning">{entry.sensoryScore}점</Text>}
                    />
                  ))}
                </Rows>
                {sub('같은 종목이 계속 낮으면 무게·자세·기계를 바꿔볼 신호입니다.')}
              </VStack>
            </Card>
          )}

          {(session.cardio || session.sessionNote) && (
            <Card>
              <Rows>
                {session.cardio && <Row label={<Text>유산소</Text>} description={sub(cardioText(session.cardio))} />}
                {session.sessionNote && <Row label={<Text>{session.sessionNote}</Text>} description={sub('메모')} />}
              </Rows>
            </Card>
          )}

          <Card>
            <VStack gap={2}>
              <Text type="supporting" color="secondary">
                수행 순서
              </Text>
              {timeline.length === 0 && sub('체크된 세트가 없습니다.')}
              {timeline.length > 0 && (
                <Rows>
                  {timeline.map(({ entry, shift }) => (
                    <Row
                      key={entry.recordKey}
                      label={
                        <HStack gap={2} align="center" wrap="wrap">
                          <Text>
                            {entry.performedOrder}. {nameOf(entry.recordKey)}
                          </Text>
                          {shift < 0 && <Badge variant="info" label={`${-shift}칸 앞당김`} />}
                          {shift > 0 && <Badge variant="neutral" label={`${shift}칸 미룸`} />}
                        </HStack>
                      }
                      description={sub(
                        <>
                          {doneSets(entry)
                            .map((s) => s.reps)
                            .join(' / ')}{' '}
                          · {doneSets(entry)[0]?.weight}kg
                          {entry.sensoryScore !== undefined && ` · 감각 ${entry.sensoryScore}점`}
                          {hasCompensation(entry.compensation) && ` · ${compensationSummary(entry.compensation)}`}
                          {hasPain(entry) && ' · 통증'}
                        </>,
                      )}
                      end={<Text color="secondary">{entry.firstSetAt ? formatClock(entry.firstSetAt) : ''}</Text>}
                    />
                  ))}
                </Rows>
              )}
            </VStack>
          </Card>
        </Group>

        <Button variant="primary" label="홈으로" width="100%" onClick={onDone} />
      </Groups>
    </AxRoot>
  )
}
