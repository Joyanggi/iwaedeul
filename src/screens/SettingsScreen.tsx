import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ExportPanel from '../components/ExportPanel'
import GistPanel from '../components/GistPanel'
import {
  VOLUME_SCALES,
  audioContextState,
  audioDiagnostics,
  audioSessionType,
  previewSignals,
  previewTempoTones,
  unlockAudio,
  type SoundVolume,
} from '../lib/beep'
import ImportPanel from '../components/ImportPanel'
import DietIoPanel from '../components/DietIoPanel'
import RoutineIoPanel from '../components/RoutineIoPanel'
import RoutineListPanel from '../components/RoutineListPanel'
import { useDiet } from '../lib/useDiet'
import { db } from '../db'
import type { SeedResult } from '../db/seed'
import { phaseReadiness } from '../lib/phaseReadiness'
import { todayLocal } from '../lib/dates'
import { dayTotalSets, exerciseLabel, useRoutine } from '../lib/useRoutine'
import { isStandalone } from '../lib/platform'
import { A_ECCENTRIC_OPTIONS, COUNT_IN_OPTIONS, phaseTone } from '../lib/tempo'
import { useSettings } from '../store/settings'
import { useSessionStore } from '../store/session'
import { OPEN_SESSION_BLOCK } from '../lib/routineEdit'
import type { Phase } from '../types'
import {
  AxRoot,
  Badge,
  Banner,
  Button,
  Card,
  Collapsible,
  Group,
  Groups,
  Heading,
  HStack,
  Row,
  Rows,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
  Text,
  VStack,
} from '../ax'

const PHASES: { value: Phase; label: string; desc: string }[] = [
  { value: 0, label: '0', desc: '습관 형성 — 주 3회 × 8주 연속' },
  { value: 1, label: '1', desc: '기본 볼륨 정착' },
  { value: 2, label: '2', desc: '강도 확장' },
  { value: 3, label: '3', desc: '피지크 마감' },
]

/** 세그먼트 라벨. 배율 자체는 beep.ts가 소유한다 */
const VOLUME_LABEL: Record<SoundVolume, string> = {
  normal: '보통',
  loud: '크게',
  max: '가장 크게',
}

export default function SettingsScreen({
  seed,
  onEditRoutine,
}: {
  seed: SeedResult
  onEditRoutine: (target: 'active' | 'blank') => void
}) {
  const openSession = useSessionStore((s) => s.session)
  const diet = useDiet()
  const bundle = useRoutine()
  const {
    currentPhase,
    setPhase,
    setOnboardingDone,
    tempoGuide,
    setTempoGuide,
    soundVolume,
    setSoundVolume,
    aEccentricSec,
    setAEccentricSec,
    tempoCountInSec,
    setTempoCountInSec,
    duckOthers,
    setDuckOthers,
  } = useSettings()
  const sessionCount = useLiveQuery(() => db.sessions.count(), [], 0)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const readiness = bundle
    ? phaseReadiness(sessions, bundle.routine, currentPhase, todayLocal())
    : null
  const [openDayId, setOpenDayId] = useState<string | null>(null)
  const [resetStep, setResetStep] = useState(0)
  const [quota, setQuota] = useState<string | null>(null)

  useEffect(() => {
    void navigator.storage?.estimate?.().then((est) => {
      if (est.usage === undefined) return
      const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`
      setQuota(est.quota ? `${mb(est.usage)} / ${mb(est.quota)}` : mb(est.usage))
    })
  }, [])

  const resetAll = async () => {
    await db.delete()
    window.location.reload()
  }

  return (
    <AxRoot>
      <Groups>
        <Group>
          <Heading level={1}>설정</Heading>
          {/* 버전은 package.json에서 파생된다 (BB5) — 화면이 손으로 적으면 라운드마다 낡는다 */}
          <Text color="secondary">v{__APP_VERSION__}</Text>

          {seed.problems.length > 0 && (
            <Banner
              status="error"
              title={`루틴 시드 정합성 문제 ${seed.problems.length}건 — 아래 “진단”에서 확인하세요.`}
              collapsible={false}
            />
          )}
        </Group>

        <Group>
          <Heading level={2}>훈련</Heading>
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                Phase (수동 전환)
              </Text>
              <SegmentedControl label="Phase" value={String(currentPhase)} onChange={(v) => void setPhase(Number(v) as Phase)}>
                {PHASES.map((p) => (
                  <SegmentedControlItem key={p.value} value={String(p.value)} label={p.label} />
                ))}
              </SegmentedControl>
              <Text type="supporting" color="secondary">
                {PHASES.find((p) => p.value === currentPhase)?.desc}
              </Text>

              {/* DESIGN.md §5.5 "각 Phase 조건 요약 표시" — 뭐가 남았는지 보이게 (T3) */}
              {readiness && readiness.to !== null && (
                <>
                  <Text type="supporting" color="secondary">
                    Phase {readiness.to} 전환 조건
                  </Text>
                  <Rows>
                    {readiness.checks.map((c) => (
                      <Row
                        key={c.label}
                        label={
                          <HStack gap={2} align="start">
                            <Text className={c.met ? 'ax-text-success' : undefined} color={c.met ? undefined : 'secondary'} aria-hidden="true">
                              {c.met ? '✓' : '○'}
                            </Text>
                            <Text>{c.label}</Text>
                          </HStack>
                        }
                        description={
                          <Text type="supporting" color="secondary">
                            {c.detail}
                          </Text>
                        }
                        end={c.insufficient ? <Badge variant="neutral" label="기록 부족" /> : null}
                      />
                    ))}
                  </Rows>
                  {readiness.allMet && (
                    <HStack>
                      <Button variant="primary" size="sm" label={`Phase ${readiness.to}로 전환`} onClick={() => void setPhase(readiness.to as Phase)} />
                    </HStack>
                  )}
                </>
              )}

              <Text type="supporting" color="secondary">
                Phase 0에서도 더블 프로그레션 증량을 허용합니다 (v2.4 규칙). 전환은 조건이 충족돼도
                사용자가 직접 결정합니다 — 루틴 문서의 조건에 주관 판단이 섞여 있습니다.
              </Text>
            </VStack>
          </Card>

          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                활성 루틴
              </Text>
              {bundle ? (
                <>
                  <Rows>
                    <Row
                      label={<Text weight="semibold">{bundle.routine.name}</Text>}
                      description={
                        <Text type="supporting" color="secondary">
                          {bundle.routine.id}
                        </Text>
                      }
                      end={
                        <HStack gap={2}>
                          <Text color="secondary">v{bundle.routine.version}</Text>
                          <Button variant="secondary" size="sm" label="편집" isDisabled={openSession !== null} onClick={() => onEditRoutine('active')} />
                        </HStack>
                      }
                    />
                  </Rows>
                  {openSession !== null && (
                    <Text type="supporting" color="secondary">
                      {OPEN_SESSION_BLOCK.edit}
                    </Text>
                  )}
                  {bundle.allDays.map((day) => (
                    <Collapsible
                      key={day.id}
                      isOpen={openDayId === day.id}
                      onOpenChange={(open) => setOpenDayId(open ? day.id : null)}
                      trigger={
                        <Row
                          isListItem={false}
                          label={<Text weight="semibold">{day.name}</Text>}
                          description={
                            <Text type="supporting" color="secondary">
                              {Object.entries(day.muscleSets)
                                .map(([m, n]) => `${m} ${n}`)
                                .join(' · ')}
                            </Text>
                          }
                          end={<Text color="secondary">{dayTotalSets(day)}세트</Text>}
                        />
                      }
                    >
                      <Rows>
                        {day.exercises
                          .slice()
                          .sort((a, b) => a.plannedOrder - b.plannedOrder)
                          .map((ex) => (
                            <Row
                              key={ex.exerciseId}
                              label={
                                <HStack gap={2} wrap="wrap">
                                  <Text>
                                    {ex.plannedOrder}. {exerciseLabel(bundle.catalog, ex.exerciseId)}
                                  </Text>
                                  <Badge variant="neutral" label={ex.group} />
                                  {ex.optional && <Badge variant="warning" label="선택" />}
                                </HStack>
                              }
                              description={
                                <Text type="supporting" color="secondary">
                                  {ex.muscle} · {ex.note || '—'}
                                </Text>
                              }
                              end={
                                <VStack gap={1}>
                                  <Text type="supporting" color="secondary" hasTabularNumbers>
                                    {ex.sets}×{ex.repMin}~{ex.repMax}
                                  </Text>
                                  <Text type="supporting" color="secondary" hasTabularNumbers>
                                    {ex.restSec}초
                                  </Text>
                                </VStack>
                              }
                            />
                          ))}
                      </Rows>
                    </Collapsible>
                  ))}
                </>
              ) : (
                <Text type="supporting" color="secondary">
                  루틴 없음
                </Text>
              )}
            </VStack>
          </Card>

          {bundle && <RoutineListPanel activeId={bundle.routine.id} onNew={() => onEditRoutine('blank')} />}
        </Group>

        <Group>
          <Heading level={2}>소리·템포</Heading>
          {/*
            신호 볼륨 (Z1). 배율은 `beep.ts` 한 곳에 있고 여기는 선택지만 보여준다 —
            틱·차임·마지막 큐·템포 톤이 전부 같이 커진다 (소리별 배율을 두지 않는다).
          */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                소리 크기
              </Text>
              <SegmentedControl label="소리 크기" value={soundVolume} onChange={(v) => void setSoundVolume(v as SoundVolume)}>
                {(Object.keys(VOLUME_SCALES) as SoundVolume[]).map((v) => (
                  <SegmentedControlItem key={v} value={v} label={VOLUME_LABEL[v]} />
                ))}
              </SegmentedControl>
              {/*
                미리 듣기 — **실제 신호를 그대로** 낸다 (틱 3회 → 차임).
                휴식이 끝나기를 기다려 확인하는 구조면 설정을 고치는 데 세트 하나가 든다.
                탭이 제스처이므로 여기서 컨텍스트를 연다 (iOS 제약).
              */}
              <HStack wrap="wrap" gap={2}>
                <Button
                  variant="secondary"
                  size="sm"
                  label="🔊 미리 듣기 (3·2·1 틱 → 종료 차임)"
                  onClick={() => {
                    unlockAudio()
                    previewSignals()
                  }}
                />
                {/*
                  템포 경계음 미리 듣기 (CC8 · CC7-R) — 게인 기준이 다른 계열이라 틱·차임만으로는
                  "템포 소리가 충분히 큰가"를 판단할 수 없다. 스펙은 `phaseTone`이 소유한다.
                */}
                <Button
                  variant="secondary"
                  size="sm"
                  label="🔊 템포 경계음 미리 듣기 (올림 → 내림)"
                  onClick={() => {
                    unlockAudio()
                    // A그룹 한 사이클의 두 경계음을 그 간격대로 (올림 → 1초 뒤 내림)
                    previewTempoTones(
                      [phaseTone({ kind: 'concentric', seconds: 1 }), phaseTone({ kind: 'eccentric', seconds: aEccentricSec })],
                      1,
                    )
                  }}
                />
              </HStack>
              <Text type="supporting" color="secondary">
                카운트다운 틱 · 종료 차임 · 템포 가이드 소리가 함께 조절됩니다.
                무음 스위치가 켜져 있으면 어떤 크기로도 소리가 나지 않습니다 (음악을 끊지 않기
                위한 맞바꿈 — README 참조).
              </Text>

              {/*
                음악 덕킹 (2026-08-27). 앱 게인은 이미 천장이라(beep.ts 볼륨 주석) 음악과 경쟁하는
                문제의 나머지 절반은 여기서만 풀린다. **기본 꺼짐** — G8의 회귀(음악이 끊긴다)가
                기기·iOS 버전에 따라 재현될 수 있고, 이 창에서는 어느 쪽인지 확인할 수 없다.
              */}
              <Text type="supporting" color="secondary">
                신호음이 음악을 뚫지 못할 때
              </Text>
              <SegmentedControl label="음악" value={String(duckOthers)} onChange={(v) => void setDuckOthers(v === 'true')}>
                {([false, true] as const).map((on) => (
                  <SegmentedControlItem key={String(on)} value={String(on)} label={on ? '음악 잠깐 줄이기' : '섞어서 재생'} />
                ))}
              </SegmentedControl>
              <Text type="supporting" color="secondary">
                <b>음악 잠깐 줄이기</b>는 신호음이 나는 동안만 다른 앱 소리를 낮춥니다(iOS 16.4+).
                기기에 따라 <b>음악이 잠깐 멈추거나 무음 스위치를 무시</b>할 수 있습니다 —
                그렇게 동작하면 “섞어서 재생”으로 되돌리세요. 소리 크기를 최대로 해도 음악에
                묻힐 때만 쓰는 선택지입니다.
              </Text>
            </VStack>
          </Card>

          {/* 템포 가이드 (G7). 기본 꺼짐 — 세트 행에 버튼이 늘어나므로 원할 때만 켠다 */}
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                템포 가이드
              </Text>
              <Switch label="템포 가이드 사용" value={tempoGuide} onChange={(on) => void setTempoGuide(on)} />
              <Text type="supporting" color="secondary">
                세트 행의 ♩ 버튼으로 수축·이완 리듬을 <b>페이즈 경계음</b>과 링으로 안내합니다
                (<span className="ax-nowrap">A그룹 1-{aEccentricSec}초</span> · <span className="ax-nowrap">B그룹 3-1-1-1</span> · <span className="ax-nowrap">코어 2-1-2</span>, 루틴 문서 3장).
                호흡도 함께 표시됩니다 — 원리는 “힘쓸 때 내쉰다” 하나입니다.
                종료하면 카운트된 반복수가 그 세트에 들어갑니다.
              </Text>
              <Text type="supporting" color="secondary">
                마지막 2~3회에서 리듬을 못 따라가기 시작하면 그게 세트 종료 신호입니다 (문서 13장).
              </Text>

              {/*
                A그룹 이완 초 (CC16). **문서 3장 표가 "1.5~2초 (기본 2)" 범위로 개정됐다** —
                설정이 문서 범위 안에서만 움직인다. B그룹·코어는 열지 않는다: 그쪽 템포는
                속도가 아니라 감각 점수 체계의 전제이고, 문서에 그 근거까지 적혀 있다.
              */}
              <Text type="supporting" color="secondary">
                A그룹 내리는 속도
              </Text>
              <SegmentedControl label="A그룹 내리는 속도" value={String(aEccentricSec)} onChange={(v) => void setAEccentricSec(Number(v) as (typeof A_ECCENTRIC_OPTIONS)[number])}>
                {A_ECCENTRIC_OPTIONS.map((sec) => (
                  <SegmentedControlItem key={sec} value={String(sec)} label={`${sec}초`} />
                ))}
              </SegmentedControl>
              <Text type="supporting" color="secondary">
                문서 3장이 규정한 범위(1.5~2초, 기본 2) 안에서만 고를 수 있습니다. 통제를 유지하는
                것이 조건입니다 — 반동이 생기면 느린 쪽이 맞습니다. B그룹·코어는 감각 점수 체계의
                전제라 고정입니다. 레그 컬은 문서의 예외 행(1-1-2)을 따릅니다.
              </Text>

              {/*
                카운트인 (2026-08-27). "3초는 자세 잡고 호흡 가다듬기에 짧다"가 실사용 피드백이고,
                기본을 5초로 올렸다 — 준비가 안 된 채 시작하면 첫 반복의 자세가 무너진다.
              */}
              <Text type="supporting" color="secondary">
                시작 전 준비 시간
              </Text>
              <SegmentedControl label="시작 전 준비 시간" value={String(tempoCountInSec)} onChange={(v) => void setTempoCountInSec(Number(v) as (typeof COUNT_IN_OPTIONS)[number])}>
                {COUNT_IN_OPTIONS.map((sec) => (
                  <SegmentedControlItem key={sec} value={String(sec)} label={`${sec}초`} />
                ))}
              </SegmentedControl>
              <Text type="supporting" color="secondary">
                가이드를 연 뒤 첫 반복이 시작되기까지의 카운트다운입니다. 매 초 틱이 울리고,
                그동안 자세를 잡고 호흡을 가다듬습니다.
              </Text>
            </VStack>
          </Card>
        </Group>

        <Group>
          <Heading level={2}>기록 내보내기·백업</Heading>
          {bundle && <ExportPanel bundle={bundle} sessions={sessions} phase={currentPhase} />}
          <GistPanel />
          <ImportPanel />
        </Group>

        <Group>
          <Heading level={2}>루틴·식단 파일</Heading>
          {bundle && <RoutineIoPanel routine={bundle.routine} catalog={bundle.catalog} />}
          <DietIoPanel plans={diet.plans} />
        </Group>

        <Group>
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                진단
              </Text>
              <Rows>
                <Row label={<Text type="supporting">종목 카탈로그</Text>} end={<Text type="supporting" color="secondary" hasTabularNumbers>{seed.exerciseCount}개</Text>} />
                <Row label={<Text type="supporting">저장된 세션</Text>} end={<Text type="supporting" color="secondary" hasTabularNumbers>{sessionCount}개</Text>} />
                <Row label={<Text type="supporting">홈 화면 앱</Text>} end={<Text type="supporting" color="secondary">{isStandalone() ? '예' : '아니오 (Safari 탭)'}</Text>} />
                <Row label={<Text type="supporting">저장 공간</Text>} end={<Text type="supporting" color="secondary" hasTabularNumbers>{quota ?? '—'}</Text>} />
                {/*
                  소리 문제 1차 분류용 한 줄 (Y3). "running인데 안 들린다" = 무음 스위치·볼륨·출력 경로,
                  "suspended/없음" = 앱 쪽. v1.3에 이 한 줄이 없어서 진단 화면을 만들고 지우는
                  라운드를 한 번 썼다.
                */}
                <Row
                  label={<Text type="supporting">오디오</Text>}
                  description={
                    <Text type="supporting" color="secondary">
                      running인데 안 들리면 <span className="ax-nowrap">무음 스위치·볼륨·출력</span> 기기 확인
                    </Text>
                  }
                  end={<Text type="supporting" color="secondary">{audioContextState() ?? '아직 안 열림'}</Text>}
                />
                {/*
                  복구 카운터 (2026-08-27). 앱 전환 후 무음 문제는 이 창에서 재현할 수 없다
                  (개발 창은 visibilityState가 항상 hidden). 실기기에서 사용자가 **읽어서 알려줄 수
                  있는 값**을 남긴다 — 재생성이 오르는데 소리가 안 나면 원인이 컨텍스트가 아니다.
                */}
                <Row
                  label={<Text type="supporting">오디오 복구</Text>}
                  description={
                    <Text type="supporting" color="secondary">
                      생성 / 재생성 / 정지 후 복구 / 컨텍스트 없어 유실
                    </Text>
                  }
                  end={
                    <Text type="supporting" color="secondary" hasTabularNumbers>
                      {(() => {
                        const d = audioDiagnostics()
                        return `${d.created} / ${d.recreated} / ${d.recovered} / ${d.droppedNoCtx}`
                      })()}
                    </Text>
                  }
                />
                <Row
                  label={<Text type="supporting">오디오 세션</Text>}
                  description={
                    <Text type="supporting" color="secondary">
                      transient = 음악을 잠깐 줄임 / ambient = 섞어서 재생
                    </Text>
                  }
                  end={<Text type="supporting" color="secondary">{audioSessionType()}</Text>}
                />
              </Rows>
              {/* 마지막 줄은 목록 밖 한 줄이다 — 카드 안쪽 아래가 위와 같게(Row의 오른쪽 칸이 줄 높이를 1px 키운다) */}
              <HStack justify="between" gap={3}>
                <Text type="supporting">시드 주입</Text>
                <Text type="supporting" color="secondary">{seed.didSeed ? '이번 실행에 적용' : '기존 유지'}</Text>
              </HStack>
              {seed.problems.map((p) => (
                <Text key={p} type="supporting" className="ax-text-error">
                  {p}
                </Text>
              ))}
            </VStack>
          </Card>
        </Group>

        <Group>
          <Card>
            <VStack gap={3}>
              <Text type="supporting" color="secondary">
                위험 구역
              </Text>
              <HStack>
                <Button variant="secondary" label="온보딩 안내 다시 보기" onClick={() => void setOnboardingDone(false)} />
              </HStack>
              {resetStep === 0 && (
                <HStack>
                  <Button variant="destructive" label="모든 데이터 초기화" onClick={() => setResetStep(1)} />
                </HStack>
              )}
              {resetStep === 1 && (
                <>
                  <Text className="ax-text-error">
                    세션 기록 {sessionCount}개와 설정이 모두 삭제됩니다. 되돌릴 수 없습니다.
                  </Text>
                  <HStack gap={2}>
                    <Button variant="secondary" label="취소" onClick={() => setResetStep(0)} />
                    <Button variant="destructive" label="정말 삭제" onClick={() => void resetAll()} />
                  </HStack>
                </>
              )}
            </VStack>
          </Card>
        </Group>
      </Groups>
    </AxRoot>
  )
}
