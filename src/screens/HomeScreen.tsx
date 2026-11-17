import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import DayPickerSheet from '../components/DayPickerSheet'
import MuscleVolumeBars from '../components/MuscleVolumeBars'
import OpenSessionSheet from '../components/OpenSessionSheet'
import WeekDots from '../components/WeekDots'
import {
  AxRoot,
  Badge,
  Banner,
  Button,
  Card,
  Center,
  ClickableCard,
  Collapsible,
  Divider,
  Group,
  Groups,
  Heading,
  HStack,
  List,
  ListItem,
  ProgressBar,
  Spinner,
  Text,
  ToggleButton,
  VStack,
} from '../ax'
import { db } from '../db'
import {
  deloadState,
  lastSessionOf,
  muscleBars,
  phase0Progress,
  strengthCountThisWeek,
  weekDots,
} from '../lib/dashboard'
import { todayLocal } from '../lib/dates'
import { phaseReadiness } from '../lib/phaseReadiness'
import { returnStepText } from '../lib/setPlan'
import { backupReminder, isGistConfigured } from '../lib/gistSync'
import { completedSessions, doneSetsAll, findDayForRecord } from '../lib/derive'
import { ADHERENCE_MARK, nextUnloggedSlot, summarizeDietDay } from '../lib/diet'
import { findPlan, useDiet } from '../lib/useDiet'
import { storageAtRisk } from '../lib/platform'
import { progressionSuggestions } from '../lib/progression'
import { bannerWatches, compensationWatches } from '../lib/compensationWatch'
import { buildScaleMap, formatProgression, isInverseKey } from '../lib/weightScale'
import { useExerciseSettings } from '../lib/useExerciseSettings'
import { buildSession, withJustFinished } from '../lib/sessionFactory'
import { bannerQueue, type BannerId } from '../lib/bannerQueue'
import { homeCardState, pickedIdFor, returnChoiceReason } from '../lib/dayChoice'
import { dayGapNotice, dayLastDone, staleDaysLine } from '../lib/dayGap'
import { suggestNextDay } from '../lib/suggestNextDay'
import { exerciseLabel, useRoutine } from '../lib/useRoutine'
import { useSessionStore } from '../store/session'
import { useSettings } from '../store/settings'
import { BANNER_BACKUP, BANNER_COMPENSATION, BANNER_DELOAD, BANNER_PHASE, useUi } from '../store/ui'
import { parseRecordKey, type Phase, type RoutineDay, type Session, type SessionMode } from '../types'

export default function HomeScreen({
  onEnterSession,
  onOpenDiet,
}: {
  onEnterSession: () => void
  /** 식단 탭으로 이동 (D5 칩) */
  onOpenDiet: () => void
}) {
  const bundle = useRoutine()
  const currentPhase = useSettings((s) => s.currentPhase)
  const setPhase = useSettings((s) => s.setPhase)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const exerciseSettings = useExerciseSettings()
  const openSession = useSessionStore((s) => s.session)
  const bodyWeightKg = useSettings((s) => s.bodyWeightKg)
  const begin = useSessionStore((s) => s.begin)
  const finishSession = useSessionStore((s) => s.finish)
  const discardSession = useSessionStore((s) => s.discard)
  const [picking, setPicking] = useState(false)
  /*
   * 직접 고른 Day (AA1). **저장하지 않는다** — 탭을 옮겼다 돌아오면 제안으로 돌아간다.
   * 다음 날 열었을 때 어제의 수동 선택이 남아 있는 것이 더 나쁜 실패다 (파생값 비저장 원칙).
   */
  const [pickedDayId, setPickedDayId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ day: RoutineDay; forceMode?: SessionMode } | null>(null)
  /*
   * 접힌 배너 전개 (BB4). 컴포넌트 상태로 둔다 — dismiss와 달리 "지금 한 번 펼쳐 본다"는
   * 뜻이고, 탭을 옮겼다 돌아오면 다시 접혀 있는 것이 맞다 (AA1의 선택 상태와 같은 결).
   */
  const [bannersOpen, setBannersOpen] = useState(false)
  const [applyReturn, setApplyReturn] = useState(true)
  // 탭을 옮겨도 dismiss가 유지되도록 스토어에 둔다 (store/ui.ts 주석 참조)
  const dismissed = useUi((s) => s.dismissed)
  const dismiss = useUi((s) => s.dismiss)
  const lastBackupAt = useLiveQuery(
    async () => ((await db.settings.get('lastBackupAt'))?.value as string | undefined) ?? null,
    [],
    null,
  )

  const today = todayLocal()

  /*
   * 식단 한 줄 칩 (D5).
   *
   * **새 카드로 만들지 않았다.** 홈은 배너 없이도 이미 뷰포트 1.7배(1,382px)이고,
   * 계획서가 "홈 과밀이면 뺀다"고 했다. 대신 탭하면 식단 탭으로 가는 40px 한 줄만 둔다 —
   * 정보를 복제하는 것이 아니라 "지금 뭘 먹어야 하나"의 진입점 역할이다.
   */
  const diet = useDiet()
  const dietChip = useMemo(() => {
    const stored = diet.days.find((d) => d.date === today)
    const plan = findPlan(diet.plans, stored?.planId ?? diet.defaultPlanId)
    if (!plan) return null
    /*
     * 훈련일 여부를 **여기서 다시 계산하지 않는다** (X3).
     * `useDiet`가 읽기 경계에서 이미 정규화한다 (`diet.resolveTrainingDays`).
     * 이 자리에 `trained || stored` 사본이 남아 있었는데, 그게 바로 B2 결함의 형태다 —
     * 정규화를 한 곳으로 모았는데 사본 하나가 살아남아 기준이 갈렸다.
     */
    const summary = summarizeDietDay(plan, stored)
    return {
      next: nextUnloggedSlot(plan, stored, stored?.isTrainingDay ?? false),
      summary,
    }
  }, [diet.days, diet.plans, diet.defaultPlanId, today])

  const dash = useMemo(() => {
    if (!bundle) return undefined
    const { routine } = bundle
    const last = lastSessionOf(sessions)
    return {
      suggestion: suggestNextDay({ sessions, routine, today }),
      dots: weekDots(sessions, today),
      lastDone: dayLastDone(sessions, routine, today),
      strengthWeek: strengthCountThisWeek(sessions, today),
      volume: muscleBars(sessions, routine, today),
      deload: deloadState(sessions, routine, today),
      phase0: phase0Progress(sessions, routine, today),
      progressions: last
        ? progressionSuggestions(
            last,
            routine,
            currentPhase,
            buildScaleMap(exerciseSettings, routine.rules.weightIncrementKg),
            bundle.catalog,
          )
        : [],
      phase: phaseReadiness(sessions, routine, currentPhase, today),
      // 반복 보상작용 (T11) — 연속으로 계속 나오는 것만 배너로
      watches: bannerWatches(compensationWatches(sessions)),
    }
  }, [bundle, sessions, today, currentPhase, exerciseSettings])

  if (!bundle || !dash) {
    return (
      <AxRoot>
        <Center>
          <Spinner />
          <Text color="secondary">루틴을 불러오는 중…</Text>
        </Center>
      </AxRoot>
    )
  }

  const { routine, catalog } = bundle
  const { suggestion, dots, volume, deload, phase0, progressions, phase, watches } = dash
  const done = completedSessions(sessions)
  const dietLabel = dietChip
    ? dietChip.next
      ? `다음 식단 ${dietChip.next.name} ${dietChip.next.timeHint}`
      : `오늘 식단 ${ADHERENCE_MARK[dietChip.summary.adherence]}`
    : ''
  const dietValue = dietChip ? `단백질 ${dietChip.summary.proteinG}/${dietChip.summary.targetProteinG}g ▸` : ''

  /**
   * 새 세션을 만든다.
   *
   * `justFinished`는 **방금 마감한 세션**이다 (R4). `sessions`는 useLiveQuery의 값이라
   * 마감 직후에는 아직 갱신되지 않았고, 그 낡은 목록으로 프리필을 만들면 방금 한 기록이
   * 다음 세션에 반영되지 않는다 — "마감하고 새로 시작"에서 프리필이 한 세션 뒤처진다.
   * id로 중복을 제거해 합류시킨다 (live query가 이미 갱신됐을 수도 있다).
   */
  const create = (day: RoutineDay, forceMode?: SessionMode, justFinished?: Session | null) => {
    // 복귀는 **공백 상태**이지 Day의 속성이 아니다. 바텀시트로 다른 Day를 골라도
    // 14일+ 공백이면 복귀 프로토콜을 적용해야 한다 (이전에는 제안 Day만 적용됐다).
    const isReturn = forceMode === undefined && Boolean(suggestion.returnStep) && applyReturn
    const mode: SessionMode = forceMode ?? (isReturn ? 'return' : 'normal')
    return buildSession({
      routine,
      day,
      mode,
      sessions: withJustFinished(sessions, justFinished),
      phase: currentPhase,
      today,
      returnStep: isReturn ? suggestion.returnStep : undefined,
      isInverse: (rk) => isInverseKey(catalog, rk),
      // 없으면 프리필이 전역 2.5를 써서 칩과 실제 세트 무게가 어긋난다 (F6)
      scales: buildScaleMap(exerciseSettings, routine.rules.weightIncrementKg),
      // 첫 기록 시작 무게 추정 (CC13) — 세션 생성 시점에 넣어야 카드가 열릴 때 이미 보인다
      bodyWeightKg,
      startWeightPctBW: (id) => catalog.get(id)?.startWeightPctBW,
    }).session
  }

  const start = (day: RoutineDay, forceMode?: SessionMode) => {
    setPicking(false)
    // 시작하면 override를 지운다 (AA1) — 다음에 홈으로 돌아왔을 때는 다시 제안이 기준이다
    setPickedDayId(null)
    // 진행 중 세션이 있으면 덮어쓰지 않고 처리 방법을 먼저 묻는다 (store.begin이 거부한다)
    if (openSession) {
      setPending({ day, forceMode })
      return
    }
    begin(create(day, forceMode))
    onEnterSession()
  }

  /** OpenSessionSheet에서 기존 세션을 정리한 뒤 대기 중이던 Day로 시작 */
  const startPending = async (resolve: 'finish' | 'discard') => {
    if (!pending) return
    // finish()가 반환하는 세션을 그대로 넘긴다 — live query 갱신을 기다리지 않는다
    const finished = resolve === 'finish' ? await finishSession() : null
    if (resolve === 'discard') await discardSession()
    begin(create(pending.day, pending.forceMode, finished))
    setPending(null)
    onEnterSession()
  }

  /*
   * 카드·시작 버튼·디로드 시작이 **같은 Day를 가리킨다** (AA1), 그리고 진행 중 세션이
   * 있으면 카드가 그 세션을 가리킨다 (CC11). 판정은 `homeCardState` 한 곳이다.
   */
  const card = homeCardState({
    routine,
    suggested: suggestion.day,
    // 복귀 배너에서 "안 함"을 고르면 카드도 그 결과를 말한다 (EE3)
    suggestionReason: returnChoiceReason({
      suggestionReason: suggestion.reason,
      gapDays: suggestion.gapDays,
      hasReturnStep: Boolean(suggestion.returnStep),
      applyReturn,
    }),
    pickedDayId,
    openDayId: openSession?.dayId ?? null,
  })
  const displayed = card.day
  // KK3 — 카드의 추가 줄은 최대 두 줄 (KK4 dayGapNotice가 먼저, 이 줄이 다음)
  const gapNotice = card.resuming
    ? undefined
    : dayGapNotice({
        sessions,
        routine,
        day: displayed,
        today,
        returnSuggested: Boolean(suggestion.returnStep),
      })
  const staleLine = card.resuming
    ? undefined
    : staleDaysLine(dash.lastDone, sessions, today, displayed)

  /*
   * 세션 모드 카드의 부제 (CC11). 경과 분은 `startedAt`에서 파생한다 (§5.2 타임스탬프
   * 원칙) — 카드는 홈이 리렌더될 때마다 다시 계산되므로 별도 인터벌을 두지 않는다.
   * 재개 스트립이 30초 간격으로 갱신하며 같은 값을 보여준다.
   */
  const sessionProgress = openSession
    ? `진행 중 · ${Math.max(0, Math.floor((Date.now() - new Date(openSession.startedAt).getTime()) / 60_000))}분 · 완료 ${openSession.entries.reduce((n, e) => n + doneSetsAll(e).length, 0)}/${openSession.entries.reduce((n, e) => n + e.sets.length, 0)}세트`
    : ''

  // §11 리스크 대응: "주 1회 백업 리마인드 배너"
  const reminder = backupReminder({
    sessionCount: done.length,
    lastBackupAt,
    configured: isGistConfigured(),
  })

  /*
   * 배너 우선순위·상호 배제를 `bannerQueue`가 판정한다 (BB4).
   *
   * 예전에는 여섯 개 조건식이 `!showReturn && !showDeload && …`를 손으로 이어 붙였고,
   * **몇 개가 동시에 뜨는지 아무도 계산하지 않았다** (백업 + 증량 + 보상작용이 실제로
   * 함께 쌓였다). 규칙은 그대로 옮겼고, 화면은 큐에서 렌더한다.
   */
  const queue = bannerQueue(
    {
      hasReturn: Boolean(suggestion.returnStep),
      deloadDue: deload.due || deload.earlySignal,
      // 미설정은 큐 밖에서 항상 보여준다 (후속 2) — 여기 오는 것은 "설정됨 + 오래됨"만
      backupStale: reminder.show && reminder.configured,
      phaseReady: phase.allMet && phase.to !== null,
      hasWatches: watches.length > 0,
      hasProgressions: progressions.length > 0,
    },
    dismissed,
  )

  /*
   * 배너 본문. 큐가 순서를 정하고 이 맵이 그림을 정한다 — 조건은 이 안에 없다.
   * (조건을 여기 또 적으면 큐와 화면이 서로 다른 답을 낼 수 있다.)
   */
  const BANNER_VIEW: Record<BannerId, JSX.Element> = {
    return: (
      <Banner
        key="return"
        status="info"
        collapsible={false}
        title={`${suggestion.gapDays}일 공백 — ${
          suggestion.returnStep ? `${returnStepText(suggestion.returnStep)}로` : '조정 없이'
        } 복귀할까요?`}
        description="복귀 조정은 이번 세션에만 적용"
        endContent={
          /*
            **한 칸짜리 토글을 쓰지 않는다** (EE3).

            피드백: "적용됐다는 건지 무시가 됐다는 건지 모르겠다." 라벨이 한 번은 상태
            ("적용됨")를, 한 번은 동작("무시")을 말했다 — 같은 자리의 글자가 문법을 바꾸면
            지금 상태를 읽은 것인지 누르면 벌어질 일을 읽은 것인지 구분할 방법이 없다.
            게다가 배너가 던진 것은 "복귀할까요?"라는 **질문**인데 답이 하나만 보였다.

            두 답을 나란히 놓고 고른 쪽을 채운다. 어느 것이 켜져 있는지는 비교로 읽히고,
            누르면 벌어질 일은 라벨이 그대로 말한다. 결과는 위 카드 문구가 받는다
            (`returnChoiceReason`) — 눌렀는데 화면이 그대로면 눌린 줄 모른다.
          */
          <HStack gap={2} role="group" aria-label="복귀 프로토콜 적용 여부">
            <ToggleButton label="적용" isPressed={applyReturn} onPressedChange={() => setApplyReturn(true)} />
            <ToggleButton label="안 함" isPressed={!applyReturn} onPressedChange={() => setApplyReturn(false)} />
          </HStack>
        }
      />
    ),
    deload: (
      <Banner
        key="deload"
        status="warning"
        collapsible={false}
        title="디로드 권장 — 세트 50%, 무게 유지"
        description={deload.due ? `수행 ${deload.performedWeeks}주 도달` : `조기 신호: ${deload.earlyDetail}`}
        endContent={
          <HStack gap={2}>
            {/*
              디로드는 그대로 1단이다 (라벨이 이미 "시작"이므로 맞다). 다만 **카드에 보이는
              Day**로 시작한다 — 직접 고른 Day가 있는데 배너가 제안 Day를 시작하면 화면이
              말한 것과 다른 세션이 만들어진다 (AA1).
            */}
            <Button variant="ghost" onClick={() => start(displayed, 'deload')} label="디로드로 시작" />
            <Button variant="ghost" onClick={() => dismiss(BANNER_DELOAD)} label="나중에" />
          </HStack>
        }
      />
    ),
    backup: (
      <Banner
        key="backup"
        status="warning"
        collapsible={false}
        /* 설정돼 있고 오래된 경우만 여기 온다 (후속 2) — 문구가 한 가지만 말한다 */
        title={`마지막 백업이 ${reminder.daysSince ?? '—'}일 전이에요`}
        description="세션을 마치면 자동으로 올라갑니다. 지금 올리려면 설정 → Gist 백업"
        endContent={<Button variant="ghost" onClick={() => dismiss(BANNER_BACKUP)} label="나중에" />}
      />
    ),
    phase: (
      <Banner
        key="phase"
        status="success"
        collapsible={false}
        title={`Phase ${phase.from} 조건을 모두 충족했어요`}
        description={phase.checks.map((c) => c.detail).join(' · ')}
        endContent={
          <HStack gap={2}>
            <Button variant="ghost" onClick={() => void setPhase(phase.to as Phase)} label={`Phase ${phase.to}로 전환`} />
            <Button variant="ghost" onClick={() => dismiss(BANNER_PHASE)} label="나중에" />
          </HStack>
        }
      />
    ),
    compensation: (
      <Banner
        key="compensation"
        status="warning"
        collapsible={false}
        title="보상작용 반복 — 무게 하향 검토"
        description={watches
          .map((w) => `${exerciseLabel(catalog, parseRecordKey(w.recordKey).exerciseId)} ${w.streak}회 연속`)
          .join(' · ')}
        endContent={<Button variant="ghost" onClick={() => dismiss(BANNER_COMPENSATION)} label="나중에" />}
      />
    ),
    progression: (
      <Banner
        key="progression"
        status="info"
        collapsible={false}
        title="증량 제안"
        description={progressions
          .map((p) => `${exerciseLabel(catalog, p.exerciseId)} ${formatProgression(p.from, p.to, p.inverse)}`)
          .join(' · ')}
      />
    ),
  }

  /*
   * 순서: 저장소 위험 → 머리 → **오늘**(운동 카드 → 알림 → 식단 줄) → 이번 주 → 주기.
   * 시작 버튼이 카드 안에 있어 알림이 몇 개 떠도 시작 버튼의 자리가 같다 (RR4).
   */
  return (
    <AxRoot>
      <Groups>
        {storageAtRisk() && (
          <Banner
            status="error"
            collapsible={false}
            title="홈 화면에 추가하지 않으면 기록이 삭제될 수 있어요. Safari 공유 → 홈 화면에 추가."
          />
        )}

        <Group>
          <Heading level={1}>운동 기록</Heading>
          <HStack gap={2} wrap="wrap">
            <Badge variant="info" label={routine.name} />
            <Badge variant="neutral" label={`Phase ${currentPhase}`} />
            <Badge variant="neutral" label={`누적 ${done.length}세션`} />
          </HStack>
        </Group>

        <Group>
          <Card elevation="low">
            <VStack gap={3}>
              <VStack gap={1}>
                {/*
                  카드 전체를 누르는 길은 없다 — 안에 시작 버튼이 있어 버튼 안에 버튼을 못 넣는다.
                  같은 일을 하는 [변경]이 카드 머리에 있다 (AA2: 보이는 버튼이 힌트 글보다 낫다).
                */}
                <HStack justify="between" align="center">
                  <Text type="supporting" color="secondary">
                    다음 운동
                  </Text>
                  <Button variant="ghost" size="sm" onClick={() => setPicking(true)} label="변경" />
                </HStack>
                <Heading level={2}>{displayed.name}</Heading>
                <Text color="secondary">{card.resuming ? sessionProgress : displayed.subtitle}</Text>
                <Text color="accent" weight="semibold">
                  {card.reason}
                </Text>
                {gapNotice && <Text color="secondary">{gapNotice}</Text>}
                {staleLine && <Text color="secondary">{staleLine}</Text>}
                <Text type="supporting" color="secondary">
                  {displayed.exercises
                    .slice()
                    .sort((a, b) => a.plannedOrder - b.plannedOrder)
                    .map((ex) => exerciseLabel(catalog, ex.exerciseId))
                    .join(' · ')}
                </Text>
              </VStack>
              {/*
                시작이 주 동작이고 [변경]은 곁이다 (AA2). 진행 중 세션이면 **이어서 하기**다 (CC11) —
                라벨이 정확해야 "실수로 누르면 세션이 날아갈까"라는 불안이 사라진다.
              */}
              <Button
                variant="primary"
                size="lg"
                width="100%"
                label={card.cta}
                onClick={() => (card.resuming ? onEnterSession() : start(displayed))}
              />
            </VStack>
          </Card>

          {/*
            백업 **미설정**은 큐 밖에서 항상 보여준다 (v1.7 후속 2).
            설정된 뒤 오래된 것("마지막 백업이 N일 전")은 큐에 들어가 접힐 수 있지만,
            아예 백업이 없는 상태는 데이터 유실 축이라 다른 배너에 밀려 접히면 안 된다.
            "나중에"는 남긴다: dismiss는 저장되지 않으므로(store/ui) 다음 실행에 다시 뜬다.
          */}
          {reminder.show && !reminder.configured && !dismissed[BANNER_BACKUP] && (
            <Banner
              status="warning"
              collapsible={false}
              title="백업이 설정되지 않았어요"
              description="설정 → Gist 백업에서 연결하면 세션 종료마다 자동으로 올라갑니다"
              endContent={<Button variant="ghost" onClick={() => dismiss(BANNER_BACKUP)} label="나중에" />}
            />
          )}

          {/*
            §11 리스크 대응(세션 도중 앱이 죽어도 이어서 진행)은 **재개 줄**이 대신한다 (Z5).

            배너는 **첫 번째만 펼친다** (BB4). 나머지는 "다른 알림 N개"로 접어 둔다 —
            조건 배제 규칙이 있어도 백업 + 증량 + 보상작용처럼 축이 다른 배너는 함께 쌓이고,
            첫 화면이 경고로 가득 차면 어느 것도 읽히지 않는다.
            순서·배제 판정은 `bannerQueue`가 한다. 여기서 다시 조건을 쓰지 않는 것이 요점이다.
          */}
          {queue.slice(0, bannersOpen ? queue.length : 1).map((id) => BANNER_VIEW[id])}

          {queue.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBannersOpen(!bannersOpen)}
              label={bannersOpen ? '알림 접기 ▴' : `다른 알림 ${queue.length - 1}개 ▾`}
            />
          )}

          {dietChip && (
            /*
              전부 기록한 날에 "완료"라고 쓰면 안 된다 — 모든 끼니를 치팅으로 기록한 날도
              "완료"가 되어 성공처럼 읽힌다 (실측에서 단백질 0g인데 "기록 완료"가 떴다).
              기록을 다 했으면 **판정 마크**를 보여준다.
            */
            <ClickableCard onClick={onOpenDiet} label={`${dietLabel} ${dietValue}`}>
              <HStack justify="between" align="center" gap={2}>
                <Text color="secondary">{dietLabel}</Text>
                <Text weight="semibold" hasTabularNumbers>
                  {dietValue}
                </Text>
              </HStack>
            </ClickableCard>
          )}
        </Group>

        <Group>
          <WeekDots dots={dots} target={routine.days.length} strengthCount={dash.strengthWeek} />
          <MuscleVolumeBars
            bars={volume.bars}
            sessionCount={volume.sessionCount}
            minSessionsToJudge={routine.rules.deloadMinSessionsPerWeek}
          />
        </Group>

        <Group>
          <Card elevation="low">
            <VStack gap={3}>
              {currentPhase === 0 && (
                <>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <Text type="supporting" color="secondary">
                        Phase 0 진행
                      </Text>
                      <Text weight="bold" hasTabularNumbers>
                        {phase0.streak}/{phase0.target}주
                      </Text>
                    </HStack>
                    <ProgressBar
                      label="Phase 0 진행"
                      isLabelHidden
                      value={Math.min(phase0.streak, phase0.target)}
                      max={phase0.target}
                      variant={phase0.achieved ? 'success' : 'accent'}
                    />
                    <Text type="supporting" color="secondary">
                      주 {routine.rules.deloadMinSessionsPerWeek}회 이상 연속
                      {phase0.allowanceUsed > 0 &&
                        ` · 주 ${routine.rules.deloadMinSessionsPerWeek - 1}회 통과 ${phase0.allowanceUsed}회 사용`}
                      {phase0.achieved && ' · 조건 충족! 설정에서 Phase 1로 전환할 수 있어요'}
                    </Text>
                  </VStack>
                  <Divider />
                </>
              )}
              <VStack gap={2}>
                <HStack justify="between" align="center">
                  <Text type="supporting" color="secondary">
                    디로드 카운터
                  </Text>
                  <Text weight="bold" hasTabularNumbers>
                    {deload.performedWeeks}/{deload.target}주
                  </Text>
                </HStack>
                <ProgressBar
                  label="디로드 카운터"
                  isLabelHidden
                  value={Math.min(deload.performedWeeks, deload.target)}
                  max={deload.target}
                  variant={deload.due ? 'warning' : 'accent'}
                />
                <Text type="supporting" color="secondary">
                  주 {routine.rules.deloadMinSessionsPerWeek}회 이상인 주만 카운트 · 4주+ 공백이나 디로드 수행 시 리셋
                </Text>
              </VStack>
            </VStack>
          </Card>

          {suggestion.scores.length > 0 && (
            <Card elevation="low">
              <Collapsible
                trigger={
                  <Text type="supporting" color="secondary">
                    제안 근거 (부족분 점수)
                  </Text>
                }
              >
                <VStack gap={3}>
                  <List>
                    {suggestion.scores.map((s) => (
                      <ListItem
                        key={s.dayId}
                        label={
                          <HStack gap={2} align="center">
                            <Text>{findDayForRecord(routine, s.dayId)?.name ?? s.dayId}</Text>
                            {s.penalized && <Badge variant="warning" label="회복 감쇠" />}
                          </HStack>
                        }
                        description={
                          s.contributions.length === 0
                            ? '목표 충족'
                            : s.contributions
                                .map((c) => `${c.muscle} ${c.sets}${c.firstExposure ? '★' : ''}`)
                                .join(' · ')
                        }
                        endContent={<Text hasTabularNumbers>{s.score.toFixed(1)}</Text>}
                      />
                    ))}
                  </List>
                  <Text type="supporting" color="secondary">
                    ★ = 이번 주 첫 노출 (주 2회 빈도 확보 우선)
                  </Text>
                </VStack>
              </Collapsible>
            </Card>
          )}
        </Group>
      </Groups>

      {pending && openSession && (
        <OpenSessionSheet
          bundle={bundle}
          openSession={openSession}
          onResume={() => {
            setPending(null)
            onEnterSession()
          }}
          onFinishAndStart={() => void startPending('finish')}
          onDiscardAndStart={() => void startPending('discard')}
          onClose={() => setPending(null)}
        />
      )}

      {picking && (
        <DayPickerSheet
          routine={routine}
          suggestedDayId={suggestion.day.id}
          pickedDayId={pickedDayId}
          lastDone={new Map(dash.lastDone.map((x) => [x.day.id, x.days]))}
          /*
            **시트는 선택만 바꾼다** (AA1) — 세션을 만들지 않는다.
            제안 Day를 다시 고르면 override가 지워진다 (pickedIdFor).
          */
          onPick={(day) => {
            setPickedDayId(pickedIdFor(day.id, suggestion.day.id))
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </AxRoot>
  )
}
