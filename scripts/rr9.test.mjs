// PLAN v1.20 RR9 — 요약의 CSS. `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const rules = (css) => [...noComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }))

describe('v120 RR9 — 요약 글줄바꿈', () => {
  it('v120 RR9 → v121 SS8: 요약도 앱 전체 한 규칙(.ax-screen)이 한글을 단어 사이에서만 꺾는다(keep-all + overflow-wrap anywhere) — .ax-summary 선택자는 없다', () => {
    const rule = rules(read('../src/ax/parts.css')).find((r) => r.sel === ':is(.ax-screen, dialog) :is(p, span, div, h1, h2, h3, li)')
    expect(rule, '한글 줄바꿈 규칙을 못 찾았다').toBeTruthy()
    expect(read('../src/ax/parts.css')).not.toContain('.ax-summary')
    expect(rule.body).toMatch(/word-break:\s*keep-all/)
    expect(rule.body).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('v120 RR9 → v121 SS8: 요약 화면은 틀 이름 없이 Groups만 쓴다(Groups는 className을 받지 않는다)', () => {
    expect(read('../src/screens/SummaryScreen.tsx')).toContain('<Groups>')
    expect(read('../src/screens/SummaryScreen.tsx')).not.toContain('ax-summary')
  })

  it('v120 RR9 반려: 줄 오른쪽 값의 안 접힘은 Astryx StackItem size="static"이 맡고 parts.css에 .ax-row-end가 없다', () => {
    expect(read('../src/ax/parts.css')).not.toContain('ax-row-end')
    expect(read('../src/ax/index.tsx')).toMatch(/StackItem/)
  })
})
