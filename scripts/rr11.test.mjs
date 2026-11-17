// PLAN v1.20 RR11 — 상태바 받침 규칙. vitest에서 `.css`를 ?raw로 읽으면 빈 문자열이라(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const axCss = readFileSync(new URL('../src/ax/ax.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('v120 RR11 — 상태바 받침', () => {
  it('v120 RR11: ax.css의 상태바 받침 규칙(body::before)에 #으로 시작하는 색 리터럴이 없고 테마 토큰(--color-on-light)을 쓴다', () => {
    const at = axCss.indexOf('body::before')
    expect(at).toBeGreaterThan(-1)
    const rule = axCss.slice(at, axCss.indexOf('}', at))
    expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(rule).toContain('background: var(--color-on-light)')
  })
})
