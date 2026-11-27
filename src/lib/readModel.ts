import { resolveTrainingDays, splitPlanIds } from './diet'
import { emptyDietDay } from './dietOps'
import { strengthDates } from './derive'
import type {
  DietDay,
  DietPlan,
  Exercise,
  Food,
  RoutineDay,
  RoutineTemplate,
  Session,
  SettingRow,
} from '../types'

/*
 * 읽기 모델 — 저장소가 무엇이든(웹 Dexie였고, 네이티브는 SQLite) 같은 답을 내는 순수 함수.
 * 웹의 `useRoutine`·`useDiet`·`db/index.ts`가 읽으면서 고르던 규칙을 **식 그대로** 옮겼다.
 * 저장소 접근은 빠졌고, 행을 받아 고르는 부분만 남았다.
 */

// ─── 루틴 (옛 useRoutine.ts) ─────────────────────────────

export interface RoutineBundle {
  routine: RoutineTemplate
  /** id → Exercise */
  catalog: Map<string, Exercise>
  /** days + fallbackDays 전체 */
  allDays: RoutineDay[]
}

export function buildRoutineBundle(
  routine: RoutineTemplate,
  exercises: Exercise[],
): RoutineBundle {
  return {
    routine,
    catalog: new Map(exercises.map((e) => [e.id, e])),
    allDays: [...routine.days, ...routine.fallbackDays],
  }
}

export function dayTotalSets(day: RoutineDay): number {
  return day.exercises.reduce((sum, ex) => sum + ex.sets, 0)
}

export function exerciseLabel(catalog: Map<string, Exercise>, exerciseId: string): string {
  return catalog.get(exerciseId)?.shortName ?? exerciseId
}

// ─── 설정·활성 루틴·진행 중 세션 (옛 db/index.ts:74-133) ──

/** 옛 `getSetting` — 행이 없으면 `fallback`, 있으면 `row.value`(거짓 값도 값이다) */
export function settingValue<T>(
  rows: SettingRow[],
  key: string,
  fallback: T,
): T {
  const row = rows.find((r) => r.key === key)
  return row === undefined ? fallback : (row.value as T)
}

/**
 * 활성 루틴. 저장된 id가 있고 그 루틴이 있으면 그것, 없거나 깨졌으면 기본키 순 첫 루틴.
 * (옛 `getActiveRoutine` — `routines.toCollection().first()`는 기본키 순이다)
 */
export function pickActiveRoutine(
  routines: RoutineTemplate[],
  activeId: string | null,
): RoutineTemplate | undefined {
  if (activeId) {
    const found = routines.find((r) => r.id === activeId)
    if (found) return found
  }
  return [...routines].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]
}

/** 진행 중(endedAt 없음) 세션 — `startedAt` 내림차순 첫 번째 (옛 `getOpenSession`) */
export function pickOpenSession(sessions: Session[]): Session | undefined {
  return sessions
    .filter((s) => !s.endedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
}

// ─── 식단 (옛 useDiet.ts) ────────────────────────────────

export interface DietReadModel {
  plans: DietPlan[]
  /** 그 달 범위 기록 — 캘린더 링(D3)과 연속 카운트가 같은 데이터를 쓴다 */
  days: DietDay[]
  defaultPlanId: string | null
  /**
   * 마지막으로 고른 단백질원 변형 (DD3 5-b) — `${slotId}.${itemId}` → 변형 인덱스.
   *
   * 여기서 함께 읽는 이유: 이 함수가 식단 데이터의 **단일 읽기 경로**다. 화면이 각자
   * settings를 읽으면 "오늘 화면과 과거 편집기가 다른 기본값을 보여주는" 상태가 만들어진다.
   */
  variantDefaults: Record<string, number>
  /** 직접 등록한 음식 (MM1) */
  userFoods: Food[]
}

const EMPTY_DEFAULTS: Record<string, number> = {}
const EMPTY_FOODS: Food[] = []

export function buildDietData(args: {
  plans: DietPlan[]
  rawDays: DietDay[]
  settings: SettingRow[]
  sessions: Session[]
}): DietReadModel {
  const { plans, rawDays, settings, sessions } = args
  const row = (key: string) => settings.find((r) => r.key === key)
  const defaultRow = row('defaultDietPlanId')
  const variantRow = row('variantDefaults')
  const foodsRow = row('userFoods')
  /*
   * 훈련일 여부를 **여기서 한 번** 정규화한다 (diet.resolveTrainingDays 주석 참조).
   * 이 함수가 식단 데이터의 단일 읽기 경로이므로, 화면·캘린더·내보내기가 전부 같은 답을 본다.
   *
   * DD2 이후로는 **옛 플랜을 쓰는 날만** 정규화 대상이다 (새 플랜은 매일 같은 5끼라
   * `isTrainingDay`가 판정에 관여하지 않는다).
   */
  // 근력 기준 (X3) — 유산소만 한 날은 휴식일로 남는다
  const trained = strengthDates(sessions)
  return {
    plans,
    days: resolveTrainingDays(rawDays, trained, splitPlanIds(plans)),
    defaultPlanId: (defaultRow?.value as string | undefined) ?? null,
    variantDefaults: (variantRow?.value as Record<string, number> | undefined) ?? EMPTY_DEFAULTS,
    userFoods: (foodsRow?.value as Food[] | undefined) ?? EMPTY_FOODS,
  }
}

export function findPlan(plans: DietPlan[], planId: string | null): DietPlan | undefined {
  return plans.find((p) => p.id === planId) ?? plans.find((p) => p.isDefault) ?? plans[0]
}

/**
 * 그 날짜의 기록을 꺼내거나 새로 만든다.
 *
 * **없을 때 즉시 저장하지 않는다** — 화면을 열기만 해도 빈 기록이 생기면 "미기록"과
 * "손댔지만 아무것도 안 한 날"을 구분할 수 없고, 캘린더가 전부 기록된 것처럼 보인다.
 * 첫 변경이 일어날 때 저장된다.
 */
export function dietDayFor(
  days: DietDay[],
  date: string,
  planId: string,
  isTrainingDay: boolean,
): DietDay {
  return days.find((d) => d.date === date) ?? emptyDietDay(date, planId, isTrainingDay)
}
