import { describe, expect, it } from 'vitest'
import { NO_COMPENSATION } from '../types'
import { stripComments } from './sourceScan'

/**
 * 화면 계약 — 소스 스캔 (X6·X8·X9).
 *
 * 세 항목 모두 "코드가 옳게 동작하는데 화면이 말을 잘못한다" 부류다. 단위 테스트로는
 * 잡히지 않고 실기기에서만 드러나므로, 규칙 자체를 소스에 못 박는다.
 */

describe('X6 — 파괴적 동작의 시각 언어가 하나다', () => {
  it('주석 제거가 라벨을 지우지 않는다 (검사가 헛돌지 않게)', () => {
    expect(stripComments('/* 지워질 주석 */ <button>이 세션 삭제</button>')).toContain('이 세션 삭제')
    expect(stripComments('/* 이 세션 삭제 */')).not.toContain('이 세션 삭제')
  })
})

describe('X9 — 비우기 버튼은 지울 것이 있을 때만 보인다', () => {
  it('기준 상수가 실제로 그 값이다', () => {
    // '없음'이 아닌 다른 값으로 바뀌면 조건도 함께 바뀌어야 한다
    expect(NO_COMPENSATION).toBe('없음')
  })
})

describe('대체·추가 표기가 화면마다 같다 (AA3)', () => {
  it('표시 문구 사본이 lib/diet.ts 하나뿐이다', () => {
    // 세 곳에 사본이 있었다 (카드·시트·내보내기). 네 번째를 만들 자리에서 모았다
    const all = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const owners = Object.entries(all)
      .filter(([p]) => !p.includes('.test.'))
      .filter(([, src]) => /similar:\s*'비슷한 구성'/.test(stripComments(src)))
      .map(([p]) => p)
    expect(owners).toEqual(['/src/lib/diet.ts'])
  })
})
