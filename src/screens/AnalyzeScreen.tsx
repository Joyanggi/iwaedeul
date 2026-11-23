import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db'
import {
  SENSORY_BUCKET_WEEKS,
  sensoryTrend,
  strengthRecordKeys,
  strengthTrend,
  substituteUses,
  weeklyBars,
} from '../lib/analysis'
import { chartTheme } from '../lib/chartTheme'
import { todayLocal } from '../lib/dates'
import { isInverseKey } from '../lib/weightScale'
import type { RoutineBundle } from '../lib/useRoutine'
import { useSettings } from '../store/settings'
import {
  AxRoot,
  Badge,
  Banner,
  Card,
  Center,
  Group,
  Groups,
  Heading,
  HStack,
  Row,
  Rows,
  SegmentedControl,
  SegmentedControlItem,
  Text,
  ToggleButton,
  VStack,
} from '../ax'
import { ScrollableArea } from '../ax/scroll'

const WEEKS_SHOWN = 12

type Metric = 'topLoad' | 'volume' | 'e1rm'
const METRIC_LABEL: Record<Metric, string> = { topLoad: '무게×횟수', volume: '볼륨', e1rm: 'e1RM' }

/**
 * 감각 점 하나의 색 계열(`tone`)과 불투명도 단계(`level` 0~3). 색은 `parts.css`가 `data-tone`·`data-level`로 준다.
 * 경계는 점수 ≤ 1이 경고, < 2.5가 강조, 그 위가 좋음이다(옛 인라인 식의 경계 그대로). `level`은 점수를 반올림한 정수이고 기록 없음은 0이다.
 */
export function sensoryDot(score: number | null): { tone: 'none' | 'warn' | 'accent' | 'ok'; level: 0 | 1 | 2 | 3 } {
  if (score === null) return { tone: 'none', level: 0 }
  const tone = score <= 1 ? 'warn' : score < 2.5 ? 'accent' : 'ok'
  const level = Math.min(3, Math.max(0, Math.round(score))) as 0 | 1 | 2 | 3
  return { tone, level }
}

/*
  차트 색은 **CSS 토큰에서 읽는다** (BB7 — `lib/chartTheme.ts`).

  여기에 hex 사본이 있었고, G6 가독성 패스가 `--text-faint`를 올렸을 때 **사본이 따라가지
  않아 축 라벨만 대비 3.09:1로 남아 있었다** (실측). 같은 사실의 두 사본이 갈라진 것이다.
*/
const C = chartTheme()

/**
 * 분석 탭 (DESIGN.md §5.4 — v1 최소).
 * 세 가지만 있다: A그룹 추이 / B그룹 감각 / 주간 수행 횟수.
 * "고급 분석(순서 영향 등)은 앱에서 하지 않음 — 내보내기 → Claude 분석이 설계 의도"
 */
export default function AnalyzeScreen({ bundle }: { bundle: RoutineBundle }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const today = todayLocal()
  const [selected, setSelected] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>('topLoad')

  /*
    B그룹 무게 차트는 Phase 2부터만 노출한다 (T12).
    Phase 0~1에서 무게 추이를 주면 감각이 아니라 무게를 쫓게 되는 역효과가 있고,
    Phase 2부터는 루틴 문서 9장이 B그룹 "무게 회복"을 규정하므로 필요한 정보가 된다.
  */
  const phase = useSettings((st) => st.currentPhase)
  const includeB = phase >= 2
  const aKeys = useMemo(
    () =>
      strengthRecordKeys(sessions, bundle.routine, {
        includeB,
        // 어시스티드는 무게가 클수록 쉬워서 추이가 뒤집힌다 — 차트에서 뺀다 (T8)
        isInverse: (rk) => isInverseKey(bundle.catalog, rk),
      }),
    [sessions, bundle.routine, bundle.catalog, includeB],
  )
  const activeKey = selected ?? aKeys[0]?.recordKey ?? null
  const activeGroup = aKeys.find((k) => k.recordKey === activeKey)?.group ?? 'A'
  const trend = useMemo(
    () => (activeKey ? strengthTrend(sessions, activeKey) : []),
    [sessions, activeKey],
  )
  const sensory = useMemo(
    () => sensoryTrend(sessions, bundle.routine, today),
    [sessions, bundle.routine, today],
  )
  const bars = useMemo(
    () => weeklyBars(sessions, today, WEEKS_SHOWN, bundle.routine.rules.deloadMinSessionsPerWeek),
    [sessions, today, bundle.routine],
  )

  const substitutes = useMemo(() => substituteUses(sessions), [sessions])

  const nameOf = (exerciseId: string) => bundle.catalog.get(exerciseId)?.shortName ?? exerciseId
  const nameOfKey = (recordKey: string) => {
    const at = recordKey.lastIndexOf('@')
    return `${nameOf(recordKey.slice(0, at))} (${recordKey.slice(at + 1).toUpperCase()})`
  }

  if (sessions.length === 0) {
    return (
      <AxRoot>
        <Groups>
          <Group>
            <Heading level={1}>분석</Heading>
            <Center>
              <Text color="secondary" justify="center">
                기록이 쌓이면 추이가 표시됩니다.
                <br />
                깊은 분석은 설정 → 내보내기의 Markdown을 LLM에 붙여넣으세요.
              </Text>
            </Center>
          </Group>
        </Groups>
      </AxRoot>
    )
  }

  const metricLabel = { topLoad: '무게 × 최다 반복수', volume: '총 볼륨', e1rm: 'e1RM 추정' }[metric]

  return (
    <AxRoot>
      <Groups>
        <Group>
          <Heading level={1}>분석</Heading>
          <Text color="secondary">
            깊은 분석은 설정 → 내보내기 → Markdown을 LLM에 붙여넣는 것이 이 앱의 설계입니다.
          </Text>
        </Group>

        <Group>
          {/* ① A그룹 종목별 추이 */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                {includeB ? '종목별 추이' : 'A그룹 추이'}
              </Text>
              {aKeys.length === 0 ? (
                <Text type="supporting" color="secondary">
                  기록이 없습니다.
                </Text>
              ) : (
                <>
                  <ScrollableArea axis="inline" label="종목">
                    <HStack gap={2} className="ax-chips">
                      {aKeys.map((k) => (
                        <ToggleButton
                          key={k.recordKey}
                          className="ax-toggle"
                          label={`${nameOf(k.exerciseId)} ${k.dayId.toUpperCase()}${k.group === 'B' ? ' · B' : ''}`}
                          isPressed={activeKey === k.recordKey}
                          onPressedChange={() => setSelected(k.recordKey)}
                        />
                      ))}
                    </HStack>
                  </ScrollableArea>

                  <SegmentedControl label="지표" value={metric} onChange={(v) => setMetric(v as Metric)}>
                    {(['topLoad', 'volume', 'e1rm'] as const).map((m) => (
                      <SegmentedControlItem key={m} value={m} label={METRIC_LABEL[m]} />
                    ))}
                  </SegmentedControl>

                  {trend.length < 2 ? (
                    <Text type="supporting" color="secondary">
                      세션이 2개 이상 쌓이면 추이가 그려집니다 (현재 {trend.length}개).
                    </Text>
                  ) : (
                    <div className="ax-chart">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={trend} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid stroke={C.line} vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d: string) => d.slice(5)}
                            tick={C.axis}
                            axisLine={{ stroke: C.line }}
                            tickLine={false}
                          />
                          <YAxis tick={C.axis} axisLine={false} tickLine={false} width={38} />
                          <Tooltip
                            contentStyle={C.tooltip}
                            labelStyle={C.tooltipLabel}
                            /*
                              B그룹은 감각 점수를 같이 띄운다 (T12) — 무게가 올랐는데 감각이
                              떨어지는 패턴을 한눈에 봐야 문서 9장의 복귀 기준을 스스로 적용할 수 있다
                            */
                            formatter={(value, _name, item) => {
                              const point = item?.payload as { sensoryScore?: number } | undefined
                              if (activeGroup !== 'B') return [String(value), metricLabel]
                              const sensory =
                                point?.sensoryScore === undefined ? '미입력' : `${point.sensoryScore}점`
                              return [`${value} · 감각 ${sensory}`, metricLabel]
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey={metric}
                            stroke={C.accent}
                            strokeWidth={2}
                            dot={{ r: 3, fill: C.accent }}
                            activeDot={C.activeDot}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {trend.length > 0 && (
                    <Text type="supporting" color="secondary">
                      {nameOfKey(activeKey!)} · 최근 {trend[trend.length - 1].topWeight}kg ×{' '}
                      {trend[trend.length - 1].maxReps}회
                      {trend.some((p) => p.mode !== 'normal') && ' · 디로드/복귀 세션 포함'}
                    </Text>
                  )}
                  {activeGroup === 'B' && (
                    <Text type="supporting" className="ax-text-warning">
                      B그룹 기준은 감각입니다. 무게 추이는 회복 참고용 — 감각 점수가 1로 떨어지면
                      이전 무게로 복귀하세요 (문서 9장).
                    </Text>
                  )}
                  <Text type="supporting" color="secondary">
                    감량기에는 <strong>볼륨 유지 = 성공</strong>입니다. 무게가 평평해도 볼륨·e1RM이
                    유지되면 후퇴가 아닙니다.
                  </Text>
                </>
              )}
            </VStack>
          </Card>

          {/* ② B그룹 감각 점수 추이 */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                감각 점수 ({SENSORY_BUCKET_WEEKS}주 평균)
              </Text>
              {sensory.buckets.length === 0 ? (
                <Text type="supporting" color="secondary">
                  감각 점수가 입력된 B그룹 기록이 없습니다.
                </Text>
              ) : (
                <>
                  {sensory.recordKeys.map((key) => {
                    const values = sensory.buckets.map((b) => ({
                      label: b.label,
                      score: b.scores[key] ?? null,
                    }))
                    const filled = values.filter((v) => v.score !== null)
                    if (filled.length === 0) return null
                    const latest = filled[filled.length - 1].score!
                    return (
                      <VStack gap={1} key={key}>
                        <HStack justify="between" align="center" gap={2}>
                          <Text>{nameOfKey(key)}</Text>
                          <Badge variant={latest <= 1 ? 'warning' : 'neutral'} label={latest.toFixed(1)} />
                        </HStack>
                        <div className="ax-sdots">
                          {values.map((v) => {
                            const dot = sensoryDot(v.score)
                            return (
                              /*
                                `title`은 **터치에서 절대 뜨지 않는다** (iOS는 hover가 없다).
                                그래서 값을 읽을 수 있는 경로를 aria-label로 남긴다 (VoiceOver).
                                탭해서 값을 펼치는 조작은 이 라운드 범위 밖이다 (계획서 "새 조작은
                                다음 피드백에서") — DEV-RECORD §8에 남겼다.
                              */
                              <span
                                key={v.label}
                                className="ax-sdot"
                                role="img"
                                aria-label={`${v.label} ${v.score === null ? '기록 없음' : `${v.score.toFixed(1)}점`}`}
                                title={`${v.label} ${v.score ?? '기록 없음'}`}
                                data-tone={dot.tone}
                                data-level={dot.level}
                              />
                            )
                          })}
                        </div>
                      </VStack>
                    )
                  })}
                </>
              )}
            </VStack>
          </Card>

          {/*
            약한 종목 경고는 카드 안이 아니라 카드 바로 아래 따로 둔다 — Banner는 안쪽 여백이 있는 상자라 카드의 마지막 내용이 되면
            카드 안쪽 아래가 위보다 넓어진다(ui-check 안쪽 대칭 실측 위 15·아래 28).
          */}
          {sensory.weak.length > 0 && (
            <Banner
              status="warning"
              title="계속 감각이 약한 종목"
              collapsible={false}
              description={
                <>
                  {sensory.weak
                    .map((w) => `${nameOfKey(w.recordKey)} 평균 ${w.average}점 (${w.count}회)`)
                    .join(', ')}
                  <br />
                  무게·자세·기계를 바꿔볼 신호입니다.
                </>
              }
            />
          )}

          {/* ③ 주간 수행 횟수 */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                주간 수행 횟수 (최근 {WEEKS_SHOWN}주)
              </Text>
              <div className="ax-chart">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={bars} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={C.axis}
                      axisLine={{ stroke: C.line }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={C.axis}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={C.tooltip}
                      labelStyle={C.tooltipLabel}
                      formatter={(value) => [`${value}회`, '수행']}
                    />
                    <ReferenceLine
                      y={bundle.routine.rules.deloadMinSessionsPerWeek}
                      stroke={C.ok}
                      strokeDasharray="4 4"
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {bars.map((b) => (
                        <Cell key={b.weekStart} fill={b.met ? C.ok : C.accent} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Text type="supporting" color="secondary">
                점선 = 주 {bundle.routine.rules.deloadMinSessionsPerWeek}회 목표. 초록 막대가 달성한 주입니다.
              </Text>
            </VStack>
          </Card>

          {/*
            대체 수행 빈도 (T8). 자주 쓰는 대체가 있다는 사실만 보여준다 —
            "루틴에 고정할까요?"는 제안하지 않는다. 종목 구성은 루틴 문서 개정 사안이다.
          */}
          {substitutes.length > 0 && (
            <Card>
              <VStack gap={3}>
                <Text type="supporting" color="secondary">
                  대체 수행
                </Text>
                <Rows>
                  {substitutes.map((use) => (
                    <Row
                      key={use.recordKey}
                      label={<Text weight="semibold">{nameOfKey(use.recordKey)}</Text>}
                      description={
                        <Text type="supporting" color="secondary">
                          {nameOfKey(use.originRecordKey)} 대신
                        </Text>
                      }
                      end={<Text color="secondary">{use.count}회</Text>}
                    />
                  ))}
                </Rows>
                <Text type="supporting" color="secondary">
                  자리가 자주 없는 종목입니다. 순서를 바꾸거나 루틴 구성을 다시 볼 근거가 됩니다.
                </Text>
              </VStack>
            </Card>
          )}
        </Group>
      </Groups>
    </AxRoot>
  )
}
