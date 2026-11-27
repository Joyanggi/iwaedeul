import { describe, expect, it } from 'vitest'
import { stripComments } from './sourceScan'
import { mmss } from './dates'

/**
 * Z5 — **휴식 타이머는 App이 단일 인스턴스로 소유한다.**
 *
 * 이 항목의 핵심 함정이다. 세션 최소화를 만들면서 SessionScreen이 `useRestTimer()`를
 * 계속 소유하면, 탭으로 나갈 때 훅이 언마운트되어 **차임·카운트다운 틱이 죽는다.**
 * endTime은 localStorage에 있어 복귀 시 표시는 정확하지만, 식단 체크하러 나가 있는 동안
 * 휴식이 끝나면 소리가 안 난다 — 최소화를 만드는 이유(운동 중 다른 탭을 본다)와 정확히 충돌한다.
 *
 * **인스턴스 두 개도 안 된다**: localStorage는 `load` 시점에만 읽으므로 라이브 동기화가
 * 안 되고, 두 개면 차임이 두 번 울리거나 한쪽이 낡은 값을 표시한다.
 */

const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const appFiles = Object.entries(sources)
  .filter(([p]) => !p.endsWith('.test.ts'))
  .map(([p, src]) => [p, stripComments(src)] as const)

/**
 * §8.3 — 휴식 표시 포맷이 한 곳에 있다.
 *
 * 타이머 바와 재개 스트립이 각자 `mmss`를 갖고 있었다. 같은 사실을 두 곳에서 포맷하는
 * 형태이고, 이 프로젝트가 반복해서 고쳐 온 부류다 (둘 다 같은 값을 받으므로 무해했지만,
 * 표시 형식을 바꾸려면 두 곳을 고쳐야 했다).
 */
describe('휴식 표시 포맷의 단일 정의', () => {
  it('mmss를 자체 정의하는 컴포넌트가 없다', () => {
    const offenders = appFiles
      .filter(([p]) => p !== '/src/lib/dates.ts')
      .filter(([, src]) => /function mmss\s*\(/.test(src))
      .map(([p]) => p)
    expect(offenders).toEqual([])
  })

  it('음수·소수 초에도 형식이 깨지지 않는다', () => {
    expect(mmss(-5)).toBe('0:00')
    expect(mmss(65.7)).toBe('1:05')
    expect(mmss(0)).toBe('0:00')
  })
})
