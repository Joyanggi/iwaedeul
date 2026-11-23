// PLAN v1.20 RR5 재검증 — Day 선택 시트의 한글 줄바꿈. `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const parts = readFileSync(new URL('../src/ax/parts.css', import.meta.url), 'utf8')

describe('v120 RR5 재검증 — 글자 중간 꺾임', () => {
  it('v120 RR5 재검증 → v121 SS8: parts.css의 앱 전체 한 규칙이 시트(dialog) 글에 word-break: keep-all과 overflow-wrap: anywhere를 건다 — Day 선택 시트도 그 규칙이 덮는다(시트 이름 규칙은 없다. Text의 wordBreak는 keep-all을 못 받는다)', () => {
    expect(parts).toMatch(/:is\(\.ax-screen, dialog\) :is\(p, span, div, h1, h2, h3, li\) \{[^}]*word-break: keep-all;[^}]*overflow-wrap: anywhere;/)
    expect(parts).not.toContain("aria-label='Day 선택'")
  })
})
