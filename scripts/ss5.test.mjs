// PLAN v1.21 SS5 — 분석 탭의 CSS 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const globalCss = read('../src/styles/global.css')
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

describe('v121 SS5 — 지운 것', () => {
  it('v121 SS5: global.css에 분석만 쓰던 .chart·.chip-scroll·.srow*·.sdot*·.mbar-name·.center-note가 없다', () => {
    const bad = selectors(globalCss).filter((s) => /(^|[\s,>])\.(chart|chip-scroll|srow|srow-head|sdots|sdot|mbar-name|center-note)\b/.test(s))
    expect(bad).toEqual([])
  })

  it('v121 SS5: SS6 뒤 .segment·.pill*는 없고 SS7 뒤 .warn-box도 없다(온보딩이 Banner가 됐다)', () => {
    const all = selectors(globalCss).join('\n')
    for (const gone of ['.segment', '.pill']) expect(all, gone).not.toContain(gone)
    expect(all).not.toContain('.warn-box')
  })

  it('v121 SS5: legacy 뿌리 목록에 .center-note가 없고 인벤토리에 recharts-surface 예외가 없다(맞춤이 parts.css의 .ax-chart로 갔다)', () => {
    expect(globalCss).not.toMatch(/@scope \([^)]*center-note/)
    expect(inventory).not.toContain("'recharts-surface'")
  })
})

describe('v121 SS5 — 분석 부품의 CSS', () => {
  it('v121 SS5: .ax-chart는 넘침을 막고 그 안 recharts SVG는 visible이다', () => {
    expect(body(parts, '.ax-chart')).toMatch(/overflow:\s*hidden/)
    expect(body(parts, '.ax-chart .recharts-surface')).toMatch(/overflow:\s*visible/)
  })

  it('v121 SS5: 감각 점 네 계열은 경고·강조·성공·테두리 토큰이고 hex가 없다', () => {
    const want = { none: '--color-border', warn: '--color-text-warning', accent: '--color-accent', ok: '--color-text-success' }
    for (const [tone, token] of Object.entries(want)) {
      const b = body(parts, `.ax-sdot[data-tone='${tone}']`)
      expect(b).toContain(`var(${token})`)
      expect(b).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    }
  })

  it('v121 SS5: data-level 0~3은 불투명도 네 단계(0.4·0.6·0.8·1)이고 올라간다', () => {
    const opacity = [0, 1, 2, 3].map((l) => Number(/opacity:\s*([\d.]+)/.exec(body(parts, `.ax-sdot[data-level='${l}']`))?.[1]))
    expect(opacity).toEqual([0.4, 0.6, 0.8, 1])
  })

  it('v121 SS5: 종목 줄 버튼은 줄어들거나 글자가 꺾이지 않고, 분석 틀은 한글 줄바꿈 규칙을 갖는다', () => {
    const chips = body(parts, '.ax-chips > *')
    expect(chips).toMatch(/flex-shrink:\s*0/)
    expect(chips).toMatch(/white-space:\s*nowrap/)
    expect(body(parts, '.ax-analyze :is(p, span, div, h1, h2)')).toMatch(/word-break:\s*keep-all/)
  })

  it('v121 SS5: 점은 폭을 똑같이 나누고(flex:1) 길이는 토큰이다', () => {
    const b = body(parts, '.ax-sdot')
    expect(b).toMatch(/flex:\s*1/)
    expect(b).toMatch(/height:\s*var\(--spacing-\d+\)/)
  })
})

describe('v121 SS5 — ui-check의 분석 검사', () => {
  const uiCheck = read('./ui-check.mjs')
  const uiSpace = read('./lib/ui-space.mjs')
  it('v121 SS5: 글자 중간 꺾임 검사는 <br> 뒤에서 줄을 새로 센다(일부러 낸 줄바꿈은 낱말 중간이 아니다)', () => {
    expect(uiCheck).toContain("n.previousSibling.nodeName === 'BR'")
  })
  it('v121 SS5: 분석 흐름은 guardedFlow 안에서 돌고 시드가 실패하면 흐름 전부가 실패다(0개 통과·건너뜀 금지)', () => {
    const at = uiCheck.indexOf("const SS5_NAMES = [")
    expect(at).toBeGreaterThan(-1)
    const body = uiCheck.slice(at, uiCheck.indexOf("await requiredScene('analyze-375'", at))
    expect(body).toContain("if (!ss5Seed && !light) for (const n of SS5_NAMES)")
    expect((body.match(/guardedFlow\(\[/g) ?? []).length).toBeGreaterThanOrEqual(9)
    for (const name of ['SS5 종목 바꾸기', 'SS5 지표 바꾸기', 'SS5 감각 점 이름·네 단계', 'SS5 실행 중 색 체계 전환', 'SS5 B그룹 경고 글자 색', 'SS5 종목 칩 맨 글자 아님', 'SS5 한 줄 부품 겹침·잘림·세로 가운데']) expect(body, name).toContain(`guardedFlow(['${name}']`)
    expect(body).toContain('dots.length > 0')
  })
  it('v121 SS5: 분석 네 장면은 안쪽 대칭을 판정하고 카드 안쪽을 다른 장면과 견준다', () => {
    expect(uiCheck).toContain("const ANALYZE_SCENES = ['analyze', 'analyze-end', 'analyze-375', 'analyze-empty']")
    expect(uiCheck).toMatch(/SYMMETRY_JUDGED = new Set\(\[[^\]]*\.\.\.ANALYZE_SCENES/)
    expect(uiSpace).toMatch(/INSET_SCENES = new Set\(\[[^\]]*'analyze'/) // SS6: 뒤에 'settings'가 붙었다
    for (const s of ['analyze', 'analyze-end', 'analyze-375', 'analyze-empty']) expect(uiSpace, s).toContain(`${s === 'analyze' ? '' : "'"}${s}${s === 'analyze' ? '' : "'"}: [`)
  })
})
