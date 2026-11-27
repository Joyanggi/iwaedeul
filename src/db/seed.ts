import dietPlansJson from '../data/diet-plans.json'
import exercisesJson from '../data/exercises.json'
import routineJson from '../data/routine-v2.4.json'
import { formatPlanLabel } from '../lib/diet'
import type { DietPlan, Exercise, RoutineTemplate } from '../types'

/** 시드를 다시 넣을 때 활성 루틴을 번들로 돌릴 것인가 (NN1). 사용자가 고른 다른 루틴이 있으면 건드리지 않는다 */
export function shouldResetActiveRoutine(
  activeId: string | null,
  bundledId: string,
  activeExists: boolean,
): boolean {
  return activeId === null || activeId === bundledId || !activeExists
}

export const BUNDLED_EXERCISES = exercisesJson as Exercise[]
export const BUNDLED_ROUTINE = routineJson as unknown as RoutineTemplate

const dietSeed = dietPlansJson as unknown as { seedRevision: number; plans: DietPlan[] }
export const BUNDLED_DIET_REVISION = dietSeed.seedRevision
/**
 * 번들 식단 플랜 (D1).
 *
 * `kcalLabel`을 시드 JSON의 값 대신 **항목 합계에서 다시 만든다.** 손으로 적은 라벨은
 * 항목을 고칠 때 남아서 화면이 서로 다른 숫자를 말하게 된다 — 실제로 계획 문서의
 * 표기(1,796kcal)와 항목 합계(1,781kcal)가 어긋나 있었다.
 */
export const BUNDLED_DIET_PLANS: DietPlan[] = dietSeed.plans.map((plan) => ({
  ...plan,
  seedRevision: dietSeed.seedRevision,
  kcalLabel: formatPlanLabel(plan),
}))
