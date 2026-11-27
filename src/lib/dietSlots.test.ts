import { describe, expect, it } from 'vitest'
import { allSlots, isTrainingOnlySlot, parseTimeHint } from './diet'
import { BUNDLED_DIET_PLANS } from '../db/seed'

/**
 * Z4 — 식사 알림을 iOS 캘린더에 위임한다.
 *
 * 형식(RRULE·VALARM·이스케이프)은 눈으로 확인할 수 없고 실기기 가져오기를 해봐야 안다.
 * 그 전에 여기서 잠근다.
 */

const PLAN = BUNDLED_DIET_PLANS.find((p) => p.id === 'cut-1800')!

describe('시각 파싱', () => {
  it('단일 시각을 읽는다', () => {
    expect(parseTimeHint('07:30')).toEqual({ h: 7, m: 30 })
  })

  /*
   * 첫 구현에서 이 형식을 놓쳐 **사용자가 가장 원한 슬롯(보충 블록)에 알림이 안 생겼다.**
   * 시드를 읽어 보고 발견했다 — `timeHint`가 `"15:00~16:00"`이다.
   */
  it('범위 표기는 시작 시각으로 읽는다 (보충 블록이 이 형식이다)', () => {
    expect(parseTimeHint('15:00~16:00')).toEqual({ h: 15, m: 0 })
  })

  it('형식이 어긋나면 null이다 (시드가 바뀌어도 앱이 죽지 않는다)', () => {
    for (const bad of ['', '아침', '7시 30분', '25:00', '07:70']) {
      expect(parseTimeHint(bad), bad).toBeNull()
    }
  })
})

describe('슬롯 합집합', () => {
  it('보충 블록은 휴식일 목록에만 있는데도 나온다', () => {
    // plan.slots만 보면 사용자가 가장 원한 슬롯이 목록에 없다
    expect(PLAN.slots.some((s) => s.id === 'shake')).toBe(false)
    expect(allSlots(PLAN).some((s) => s.id === 'shake')).toBe(true)
  })

  it('중복 id를 한 번만 낸다', () => {
    const ids = allSlots(PLAN).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('훈련일 전용 슬롯을 판별한다 (휴식일에도 울린다는 안내용)', () => {
    expect(isTrainingOnlySlot(PLAN, 'pre')).toBe(true)
    expect(isTrainingOnlySlot(PLAN, 'post')).toBe(true)
    expect(isTrainingOnlySlot(PLAN, 'breakfast')).toBe(false)
    expect(isTrainingOnlySlot(PLAN, 'shake')).toBe(false)
  })
})
