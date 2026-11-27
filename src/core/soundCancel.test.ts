import { describe, expect, it } from 'vitest'
import { stripComments } from './sourceScan'

/**
 * 예약 취소와 연속 글라이드 (CC2·CC7).
 *
 * `beep.test.ts`의 페이크는 `stop()` 시점에 기록하도록 만들어져 있어서, **취소도 stop을
 * 부르는** 이 항목을 그 위에 얹으면 기록이 오염된다. 그래서 노드 수명을 추적하는
 * 페이크를 따로 둔다 — 같은 것을 두 방식으로 재는 것이 아니라, **다른 것**을 잰다
 * (한쪽은 톤 규격, 이쪽은 노드의 생사).
 */

/**
 * 글라이드 잔재가 없어야 한다 (CC7-R).
 *
 * 죽은 코드로 남기면 다음 사람이 "왜 두 방식이 있나"를 조사하게 되고, 기각된 설계가
 * 되살아나는 경로가 된다 (X10에서 세운 "유지 대상을 늘리지 않는다"와 같은 이유).
 */
describe('CC7-R — 글라이드 심볼이 소스에 없다', () => {
  const appFiles = Object.entries(
    import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).filter(([p]) => !p.includes('.test.'))

  it('glide·phaseGlide·GLIDE_* 가 어디에도 없다', () => {
    const offenders = appFiles
      .filter(([, src]) => /\bglide\b|phaseGlide|GLIDE_[A-Z]/i.test(stripComments(src)))
      .map(([p]) => p)
    expect(offenders).toEqual([])
  })

  it('검사가 실제로 그 이름을 잡는다 (헛돌지 않게)', () => {
    expect(/\bglide\b|phaseGlide|GLIDE_[A-Z]/i.test('export function glide() {}')).toBe(true)
    expect(/\bglide\b|phaseGlide|GLIDE_[A-Z]/i.test('const GLIDE_LOW = 392')).toBe(true)
    // 경계음 코드는 걸리지 않는다
    expect(/\bglide\b|phaseGlide|GLIDE_[A-Z]/i.test('tone(phaseTone(p), \'tempo\')')).toBe(false)
  })
})
