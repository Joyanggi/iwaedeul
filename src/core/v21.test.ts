import { describe, expect, it } from 'vitest'
import { BUNDLED_DIET_PLANS, BUNDLED_ROUTINE } from './seed'
import { stripSecrets } from './backup'
import {
  buildDietData,
  buildRoutineBundle,
  dayTotalSets,
  dietDayFor,
  exerciseLabel,
  findPlan,
  pickActiveRoutine,
  pickOpenSession,
  settingValue,
} from './readModel'
import { ROUTINE, completedSession } from './testFixtures'
import EXERCISES from '../data/exercises.json'
import type { DietDay, Exercise, RoutineTemplate, Session, SettingRow } from './types'

/**
 * v2.1 VV2 — 웹을 지우며 떼어 둔 읽기 규칙(`readModel.ts`)이 웹에서 읽던 것과 같은 답을 내는가.
 * 옛 자리: `useRoutine`·`useDiet`·`db/index.ts:74-133`(웹과 함께 지웠다 — `WEB_FINAL`에 있다).
 */

const routineOf = (id: string): RoutineTemplate => ({ ...BUNDLED_ROUTINE, id })
const session = (id: string, startedAt: string, endedAt?: string): Session => ({
  id,
  date: startedAt.slice(0, 10),
  dayId: 'd1',
  routineId: 'r',
  mode: 'normal',
  startedAt,
  ...(endedAt ? { endedAt } : {}),
  entries: [],
})

describe('VV2', () => {
  describe('pickActiveRoutine', () => {
    const routines = [routineOf('b'), routineOf('a'), routineOf('c')]

    it('활성 id가 있고 그 루틴이 있으면 그것이다', () => {
      expect(pickActiveRoutine(routines, 'c')?.id).toBe('c')
    })

    it('활성 id가 없으면(null) 기본키 순 첫 루틴이다', () => {
      expect(pickActiveRoutine(routines, null)?.id).toBe('a')
    })

    it('활성 id가 지워진 루틴을 가리키면 기본키 순 첫 루틴으로 떨어진다', () => {
      expect(pickActiveRoutine(routines, 'gone')?.id).toBe('a')
    })

    it('입력 순서가 어떻든 기본키 순 첫 루틴이다 (모든 순열)', () => {
      const ids = ['b', 'a', 'c']
      const perms = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ]
      for (const p of perms) {
        expect(pickActiveRoutine(p.map((i) => routineOf(ids[i])), null)?.id, p.join()).toBe('a')
      }
    })

    it('루틴이 0개면 undefined다', () => {
      expect(pickActiveRoutine([], 'a')).toBeUndefined()
      expect(pickActiveRoutine([], null)).toBeUndefined()
    })
  })

  describe('pickOpenSession', () => {
    it('끝나지 않은 둘 중 startedAt이 늦은 것이다', () => {
      const early = session('early', '2026-08-01T10:00:00.000Z')
      const late = session('late', '2026-08-02T10:00:00.000Z')
      const done = session('done', '2026-08-03T10:00:00.000Z', '2026-08-03T11:00:00.000Z')
      expect(pickOpenSession([early, done, late])?.id).toBe('late')
    })

    it('전부 끝났으면 undefined다', () => {
      const done = session('done', '2026-08-03T10:00:00.000Z', '2026-08-03T11:00:00.000Z')
      expect(pickOpenSession([done])).toBeUndefined()
      expect(pickOpenSession([])).toBeUndefined()
    })
  })

  describe('settingValue', () => {
    it('행이 없으면 fallback이다', () => {
      expect(settingValue([], 'currentPhase', 7)).toBe(7)
    })

    it('거짓 값도 값이다 — { key, value: 0 }은 0이다', () => {
      expect(settingValue([{ key: 'currentPhase', value: 0 }], 'currentPhase', 7)).toBe(0)
    })

    it('다른 키의 행은 읽지 않는다 — 같은 키의 행을 찾는다', () => {
      const rows: SettingRow[] = [
        { key: 'a', value: 1 },
        { key: 'currentPhase', value: 2 },
        { key: 'b', value: 3 },
      ]
      expect(settingValue(rows, 'currentPhase', 7)).toBe(2)
      expect(settingValue(rows, 'missing', 7)).toBe(7)
    })

    it('{key}만 있는 행은 undefined다 (옛 getSetting과 같다 — 웹의 deleteSettings가 막아 실제로는 없는 행)', () => {
      const row = { key: 'currentPhase' } as SettingRow
      expect(settingValue([row], 'currentPhase', 7)).toBeUndefined()
    })
  })

  describe('buildDietData', () => {
    const OLD = BUNDLED_DIET_PLANS.find((p) => p.id === 'cut-1800')! // 훈련일/휴식일로 갈리는 옛 플랜
    const NEW = BUNDLED_DIET_PLANS.find((p) => p.id === 'cut-1800-u')!
    const day = (date: string, planId: string): DietDay => ({ date, planId, isTrainingDay: false, slots: {} })
    const gym = completedSession({ dayId: 'd1', date: '2026-08-04' })
    // 유산소만 한 날 — 근력 세트가 없다
    const cardioOnly: Session = { ...completedSession({ dayId: 'd1', date: '2026-08-05' }), entries: [] }

    it('옛 플랜을 쓰는 날의 isTrainingDay가 근력 세션 날짜로 고쳐진다', () => {
      const data = buildDietData({
        plans: [OLD, NEW],
        rawDays: [day('2026-08-04', OLD.id)],
        settings: [],
        sessions: [gym],
      })
      expect(data.days[0].isTrainingDay).toBe(true)
    })

    it('유산소만 한 날은 휴식일로 남는다', () => {
      const data = buildDietData({
        plans: [OLD, NEW],
        rawDays: [day('2026-08-05', OLD.id)],
        settings: [],
        sessions: [cardioOnly],
      })
      expect(data.days[0].isTrainingDay).toBe(false)
    })

    it('새 플랜의 날은 건드리지 않는다', () => {
      const data = buildDietData({
        plans: [OLD, NEW],
        rawDays: [day('2026-08-04', NEW.id)],
        settings: [],
        sessions: [gym],
      })
      expect(data.days[0].isTrainingDay).toBe(false)
    })

    it('설정 행에서 기본 플랜·변형 기본값·내 음식을 읽고, 없으면 null·빈 값이다', () => {
      const foods = [{ name: '김', qty: '1장', kcal: 10, protein: 1 }]
      const filled = buildDietData({
        plans: [NEW],
        rawDays: [],
        settings: [
          { key: 'defaultDietPlanId', value: 'cut-1800-u' },
          { key: 'variantDefaults', value: { 'lunch.chicken-2': 2 } },
          { key: 'userFoods', value: foods },
        ],
        sessions: [],
      })
      expect(filled.defaultPlanId).toBe('cut-1800-u')
      expect(filled.variantDefaults).toEqual({ 'lunch.chicken-2': 2 })
      expect(filled.userFoods).toEqual(foods)
      const empty = buildDietData({ plans: [NEW], rawDays: [], settings: [], sessions: [] })
      expect(empty.defaultPlanId).toBeNull()
      expect(empty.variantDefaults).toEqual({})
      expect(empty.userFoods).toEqual([])
    })
  })

  describe('순수 조각 (식 그대로 옮긴 것)', () => {
    it('buildRoutineBundle은 카탈로그를 id로 묶고 Day를 days + fallbackDays 순서로 잇는다', () => {
      const bundle = buildRoutineBundle(ROUTINE, EXERCISES as Exercise[])
      expect(bundle.routine).toBe(ROUTINE)
      expect(bundle.allDays).toEqual([...ROUTINE.days, ...ROUTINE.fallbackDays])
      expect(bundle.catalog.size).toBe(EXERCISES.length)
    })

    it('dayTotalSets는 Day의 세트 수 합이고, exerciseLabel은 shortName에서 id로 떨어진다', () => {
      const day = ROUTINE.days[0]
      expect(dayTotalSets(day)).toBe(day.exercises.reduce((n, e) => n + e.sets, 0))
      const catalog = buildRoutineBundle(ROUTINE, EXERCISES as Exercise[]).catalog
      const first = day.exercises[0].exerciseId
      expect(exerciseLabel(catalog, first)).toBe(catalog.get(first)!.shortName)
      expect(exerciseLabel(catalog, 'no-such-exercise')).toBe('no-such-exercise')
    })

    it('findPlan은 id → 기본 플랜 → 첫 플랜 순으로 고른다', () => {
      const plans = BUNDLED_DIET_PLANS
      const target = plans[plans.length - 1]
      expect(findPlan(plans, target.id)?.id).toBe(target.id)
      expect(findPlan(plans, 'gone')?.id).toBe((plans.find((p) => p.isDefault) ?? plans[0]).id)
      // 기본 플랜이 첫 번째가 아닐 때 — 기본 플랜 갈래와 첫 플랜 갈래가 갈린다
      const [first, second] = [{ ...plans[0], isDefault: false }, { ...plans[1], isDefault: true }]
      expect(findPlan([first, second], 'gone')?.id).toBe(second.id)
      expect(findPlan([first, { ...second, isDefault: false }], null)?.id).toBe(first.id)
      expect(findPlan([], null)).toBeUndefined()
    })

    it('dietDayFor는 그 날짜의 기록을 주고, 없으면 저장하지 않은 빈 기록을 만든다', () => {
      const saved: DietDay = { date: '2026-08-04', planId: 'p', isTrainingDay: true, slots: {} }
      expect(dietDayFor([saved], '2026-08-04', 'x', false)).toBe(saved)
      expect(dietDayFor([saved], '2026-08-05', 'x', false)).toEqual({
        date: '2026-08-05',
        planId: 'x',
        isTrainingDay: false,
        slots: {},
      })
    })
  })

  describe('stripSecrets (백업 형식이 거르는 겹 — VV5 가져오기가 같은 함수를 부른다)', () => {
    it('비밀 키(gistToken)만 거르고 나머지 행은 순서 그대로 둔다', () => {
      const rows: SettingRow[] = [
        { key: 'currentPhase', value: 1 },
        { key: 'gistToken', value: 'ghp_secret' },
        { key: 'gistId', value: 'abc' },
      ]
      expect(stripSecrets(rows)).toEqual([
        { key: 'currentPhase', value: 1 },
        { key: 'gistId', value: 'abc' },
      ])
    })
  })
})
