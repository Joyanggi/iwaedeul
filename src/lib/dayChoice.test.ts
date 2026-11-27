import { describe, expect, it } from 'vitest'
import { dayChoiceReason, displayDay, pickedIdFor, returnChoiceReason } from './dayChoice'
import { BUNDLED_ROUTINE } from '../db/seed'

/**
 * 선택과 시작의 분리 (AA1·AA2).
 *
 * 규칙 자체는 순수 함수로 잠그고(아래), 화면이 그 함수를 쓰는지는 소스 스캔으로 잠근다 —
 * 이 프로젝트에는 React 렌더 테스트가 없고, 결함이 있던 자리도 **화면의 배선**이었다
 * (`onPick={(day) => start(day)}`).
 */
const routine = BUNDLED_ROUTINE
const suggested = routine.days[0]
const other = routine.days[1]
const fallback = routine.fallbackDays[0]

describe('override 값 결정 (pickedIdFor)', () => {
  it('다른 Day를 고르면 그 Day가 override다', () => {
    expect(pickedIdFor(other.id, suggested.id)).toBe(other.id)
  })

  it('제안 Day를 다시 고르면 override가 풀린다 — 되돌리기 행을 따로 만들지 않는다', () => {
    expect(pickedIdFor(suggested.id, suggested.id)).toBeNull()
  })

  it('하한 모드 Day도 같은 규칙이다', () => {
    expect(pickedIdFor(fallback.id, suggested.id)).toBe(fallback.id)
  })
})

describe('보이는 Day (displayDay)', () => {
  it('override가 없으면 제안이다', () => {
    expect(displayDay(routine, null, suggested).id).toBe(suggested.id)
  })

  it('override가 있으면 그 Day다', () => {
    expect(displayDay(routine, other.id, suggested).id).toBe(other.id)
  })

  it('하한 모드 Day도 찾는다 (routine.days에 없다)', () => {
    expect(routine.days.some((d) => d.id === fallback.id)).toBe(false)
    expect(displayDay(routine, fallback.id, suggested).id).toBe(fallback.id)
  })

  it('없는 id면 제안으로 되돌린다 — 실패 방향이 현상 유지여야 한다', () => {
    // 시드 교체로 Day id가 사라진 경우. 빈 화면이나 예외가 아니라 "제안 Day 시작"이 맞다
    expect(displayDay(routine, 'no-such-day', suggested).id).toBe(suggested.id)
  })
})

describe('카드 문구 (dayChoiceReason)', () => {
  it('제안 상태에서는 제안 근거를 그대로 쓴다', () => {
    expect(dayChoiceReason(null, suggested, '상부가 3일 밀렸어요')).toBe('상부가 3일 밀렸어요')
  })

  it('직접 선택 상태에서는 제안이 보류됐음을 말한다', () => {
    // 제안 근거를 그대로 두면 **다른 Day의 근거**가 이 Day의 근거처럼 읽힌다
    const text = dayChoiceReason(other.id, suggested, '상부가 3일 밀렸어요')
    expect(text).toBe(`직접 선택 — 제안은 ${suggested.name}`)
    expect(text).not.toContain('3일')
  })
})

/**
 * EE3 — 복귀 배너의 답이 화면에 남는다.
 *
 * 피드백: "적용됐다는 건지 무시가 됐다는 건지 모르겠다." 라벨 문법(상태↔동작)이 1차
 * 원인이고, 눌러도 카드 문구가 그대로인 것이 그 혼동을 굳혔다. 둘 다 잠근다 —
 * 문구는 순수 함수로, 배너 배선은 소스 스캔으로.
 */
describe('복귀 선택이 카드 문구에 반영된다 (returnChoiceReason)', () => {
  const base = { suggestionReason: '19일 공백 — Day 1로 가볍게 복귀합니다', gapDays: 19 }

  it('적용 상태면 제안 근거를 그대로 쓴다', () => {
    expect(returnChoiceReason({ ...base, hasReturnStep: true, applyReturn: true })).toBe(
      base.suggestionReason,
    )
  })

  it('"안 함"을 고르면 복귀하지 않는다고 말한다 — 카드가 계속 "가볍게 복귀"라고 하면 안 된다', () => {
    const text = returnChoiceReason({ ...base, hasReturnStep: true, applyReturn: false })
    expect(text).toContain('19일 공백')
    expect(text).not.toContain('가볍게 복귀')
    expect(text).toContain('평소 강도')
  })

  it('복귀 제안 자체가 없으면 토글과 무관하게 제안 근거다', () => {
    const reason = '상부가 3일 밀렸어요'
    expect(
      returnChoiceReason({ suggestionReason: reason, gapDays: 3, hasReturnStep: false, applyReturn: false }),
    ).toBe(reason)
  })

  it('공백 일수를 모르면 일수 없이 말한다 (문구에 "null일"이 새지 않는다)', () => {
    const text = returnChoiceReason({ ...base, gapDays: null, hasReturnStep: true, applyReturn: false })
    expect(text).not.toContain('null')
    expect(text).toContain('복귀 프로토콜 없이')
  })
})
