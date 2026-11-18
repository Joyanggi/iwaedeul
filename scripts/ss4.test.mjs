// PLAN v1.21 SS4 — 기록 탭의 CSS 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const globalCss = read('../src/styles/global.css')
const motion = read('../src/styles/motion.css')
const parts = read('../src/ax/parts.css')
const inventory = read('./astryx-inventory.mjs')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())
/** `sel {` 규칙의 본문 */
const body = (css, sel) => {
  const i = strip(css).indexOf(`${sel} {`)
  expect(i, `${sel} 규칙이 없다`).toBeGreaterThan(-1)
  const text = strip(css).slice(i)
  return text.slice(text.indexOf('{') + 1, text.indexOf('}'))
}

describe('v121 SS4 — 지운 것', () => {
  it('v121 SS4: global.css에 .cal-*·.week-head·.week-count·.ex-*·.stat-*·.back-link·.chip-accent가 없다', () => {
    const bad = selectors(globalCss).filter((s) => /\.(cal-|week-head|week-count|ex-|stat-|back-link|chip-accent)/.test(s))
    expect(bad).toEqual([])
  })

  it('v121 SS4: motion.css에 .back-link가 없다', () => {
    expect(strip(motion)).not.toContain('back-link')
  })

  it('v121 SS4: SS6 뒤 .pill*는 없고(내보내기가 SegmentedControl이 됐다) 온보딩이 쓰는 .warn-box만 남는다', () => {
    const all = selectors(globalCss).join('\n')
    expect(all).not.toContain('.pill')
    expect(all).toContain('.warn-box')
  })

  it('v121 SS4: 인벤토리의 TEMPLATE_PREFIXES에 cal-diet-dot-이 없다', () => {
    expect(inventory).not.toContain("'cal-diet-dot-'")
  })
})

describe('v121 SS4 — 달력 칸의 역할 분리(오늘·고른 날·🔥·식단 점)', () => {
  it('v121 SS4: 요일 머리와 칸이 같은 7열 정의(.ax-cal-grid) 하나를 읽는다', () => {
    expect(body(parts, '.ax-cal-grid')).toMatch(/grid-template-columns:\s*repeat\(7, 1fr\)/)
    expect(strip(parts).match(/repeat\(7, 1fr\)/g).length).toBeGreaterThanOrEqual(2) // 요일 점(RR4)과 이것
  })

  it('v121 SS4: 오늘은 테두리(--color-accent), 고른 날은 면(--color-accent-muted)이라 서로 다른 속성이다', () => {
    expect(body(parts, '.ax-cal-cell[data-today]')).toMatch(/border-color:\s*var\(--color-accent\)/)
    expect(body(parts, '.ax-cal-cell[data-selected]')).toMatch(/background:\s*var\(--color-accent-muted\)/)
    expect(body(parts, '.ax-cal-cell[data-today]')).not.toContain('background')
    expect(body(parts, '.ax-cal-cell[data-selected]')).not.toContain('border')
  })

  it('v121 SS4: 식단 점 네 가지는 성공·경고·오류·보조 글자 토큰이고 강조색(--color-accent)을 안 쓴다', () => {
    const want = { good: '--color-success', mid: '--color-warning', poor: '--color-error', partial: '--color-text-secondary' }
    for (const [k, token] of Object.entries(want)) expect(body(parts, `.ax-cal-dot[data-diet='${k}']`)).toContain(`var(${token})`)
    for (const k of Object.keys(want)) expect(body(parts, `.ax-cal-dot[data-diet='${k}']`)).not.toContain('accent')
  })

  it('v121 SS4: 다른 달의 칸은 흐리다(data-out) · 한글 줄바꿈 목록에 .ax-history가 있다', () => {
    expect(body(parts, '.ax-cal-cell[data-out]')).toMatch(/opacity:\s*0\.\d+/)
    expect(selectors(parts).join('\n')).toContain('.ax-history :is(p, span, div, h1, h2)')
  })
})
