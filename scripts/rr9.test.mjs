// PLAN v1.20 RR9 — 요약의 CSS. `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (css) => [...noComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }))

describe('v120 RR9 — 요약 글줄바꿈', () => {
  it('v120 RR9: parts.css의 .ax-summary 규칙이 한글을 단어 사이에서만 꺾는다(keep-all + overflow-wrap anywhere)', () => {
    const rule = rules(read('../src/ax/parts.css')).find((r) => /\.ax-summary\b/.test(r.sel))
    expect(rule, '.ax-summary 규칙을 못 찾았다').toBeTruthy()
    expect(rule.sel).toMatch(/:is\(p, span, div, h1, h2\)/)
    expect(rule.body).toMatch(/word-break:\s*keep-all/)
    expect(rule.body).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('v120 RR9: 요약 화면이 .ax-summary를 Groups에 단다', () => {
    expect(read('../src/screens/SummaryScreen.tsx')).toContain('<Groups className="ax-summary">')
  })

  it('v120 RR9 반려: 줄 오른쪽 값의 안 접힘은 Astryx StackItem size="static"이 맡고 parts.css에 .ax-row-end가 없다', () => {
    expect(read('../src/ax/parts.css')).not.toContain('ax-row-end')
    expect(read('../src/ax/index.tsx')).toMatch(/StackItem/)
  })
})
