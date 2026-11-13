// PLAN v1.20 RR1 — legacy CSS의 범위 가두기. vitest에서 `.css`를 ?raw로 읽으면 빈 문자열이라(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const globalCss = read('src/styles/global.css')
const axCss = read('src/ax/ax.css')

const rootsOf = (css, re) => {
  const m = css.match(re)
  expect(m, '@scope 머리를 못 찾았다').toBeTruthy()
  return m[1].trim()
}
const GLOBAL_SCOPE = /@scope \(([^)]*)\) to \(\.ax-scope\)/
const AX_SCOPE = /@scope \(html, \.ax-scope\) to \(([^)]*)\)/

/** 중괄호 깊이 0에서의 선택자 머리(@scope 같은 at-규칙 안을 뺀다) */
const topLevelSelectors = (css) => {
  const out = []
  let depth = 0
  let head = ''
  for (const ch of css) {
    if (ch === '{') {
      if (depth === 0) out.push(head.trim())
      depth++
      head = ''
    } else if (ch === '}') {
      depth--
      head = ''
    } else if (depth === 0) head += ch
  }
  return out
}

describe('v120 RR1 — legacy 규칙의 범위', () => {
  it('v120 RR1: global.css에 @scope 밖의 맨 button·input 규칙이 없다', () => {
    const tops = topLevelSelectors(globalCss).filter((s) => !s.startsWith('@'))
    const bare = tops.filter((s) => s.split(',').some((x) => /^(button|input|textarea|select)$/.test(x.trim())))
    expect(bare).toEqual([])
  })

  it('v120 RR1: global.css의 button·input 규칙이 @scope 안에 있다', () => {
    const i = globalCss.indexOf('@scope (')
    expect(i).toBeGreaterThan(-1)
    const body = globalCss.slice(i)
    expect(body).toMatch(/button\s*\{[^}]*min-height:\s*44px/)
    expect(body).toMatch(/input,\s*textarea,\s*select\s*\{/)
  })

  it('v120 RR1: ax.css에 [data-astryx-theme] button 규칙(옛 min-height 끄기)이 없다', () => {
    expect(axCss).not.toMatch(/\[data-astryx-theme\]\s+button/)
  })

  it('v120 RR1: ax.css의 리셋은 :where([data-astryx-theme]) 앞머리 없이 @scope(html, .ax-scope) to (legacy 뿌리)로 감싸여 있다', () => {
    expect(axCss).toMatch(/@layer reset \{\s*@scope \(html, \.ax-scope\) to \(/)
    const resetBlock = axCss.slice(axCss.indexOf('@layer reset'), axCss.indexOf('@layer astryx-theme'))
    expect(resetBlock).not.toContain(':where([data-astryx-theme])')
  })

  it('v120 RR1: 두 파일의 legacy 뿌리 목록이 글자 그대로 같고 필요한 뿌리를 다 담는다', () => {
    const g = rootsOf(globalCss, GLOBAL_SCOPE)
    const a = rootsOf(axCss, AX_SCOPE)
    expect(g).toBe(a)
    for (const root of ['.app', '.screen', '.session', '.onboarding', '.sheet-backdrop', '.center-note', '.banner']) {
      expect(g.split(',').map((x) => x.trim()), root).toContain(root)
    }
  })

  it('v120 RR1: legacy 범위 안에서 테마의 h1·p 규칙이 번지지 않게 글꼴·크기·줄 높이·색을 되돌린다 (PLAN이 못 본 번짐 — theme.css가 reset 레이어에 요소 규칙을 건다)', () => {
    const body = globalCss.slice(globalCss.indexOf('@scope ('))
    const m = body.match(/:where\(h1, h2, h3, h4, h5, h6, p, small, code, pre\)\s*\{([^}]*)\}/)
    expect(m, 'legacy 범위의 제목·문단 되돌림 규칙').toBeTruthy()
    for (const prop of ['font-family', 'font-size', 'font-weight', 'line-height', 'color']) {
      expect(m[1], prop).toMatch(new RegExp(`${prop}:\\s*revert`))
    }
  })

  it('v120 RR1: 테마에서 만든 시트 면·테두리 토큰은 html이 아니라 Astryx 시트에만 건다 (html에 걸면 안 옮긴 legacy 시트의 면이 바뀐다)', () => {
    const glassCss = read('src/styles/glass.css')
    // RR2: html 블록이 --glass-bar를 갖게 됐다 — 금지 대상은 블록이 아니라 시트 토큰(같은 뜻: 안 옮긴 legacy 시트의 면을 html이 바꾸지 않는다)
    expect(glassCss).not.toMatch(/html\[data-astryx-theme\]\s*\{[^}]*--glass-(sheet|solid|edge)/)
    expect(axCss).not.toMatch(/html\[data-astryx-theme\]\s*\{[^}]*--glass-/)
    expect(glassCss).toMatch(/html\[data-astryx-theme\] \.astryx-bottom-sheet \{\s*--glass-solid/)
  })

  it('v120 RR1: Theme 감싸개가 거는 글꼴·글자색을 legacy 뿌리에서 되돌린다 (Figtree·흰색이 번지면 글자 폭이 달라진다)', () => {
    const body = globalCss.slice(globalCss.indexOf('@scope ('))
    const m = body.match(/:where\(:scope\)\s*\{([^}]*)\}/)
    expect(m, ':where(:scope) 규칙').toBeTruthy()
    expect(m[1]).toMatch(/font-family:\s*var\(--font-sans\)/)
    expect(m[1]).toMatch(/color:\s*var\(--text\)/)
    expect(globalCss).toMatch(/--font-sans:\s*-apple-system/)
  })
})

// PLAN v1.20 RR2 — 안 옮긴 화면의 색을 테마에 잇기 (CSS라 이 파일에서 fs로 읽는다)
describe('v120 RR2 — 색 다리', () => {
  const rootStart = globalCss.indexOf(':root {')
  const root = globalCss.slice(rootStart, globalCss.indexOf('\n}', rootStart))
  const outside = globalCss.replace(root, '')
  const glassCss = read('src/styles/glass.css')

  it('v120 RR2: global.css의 :root 색 토큰 12개(+placeholder)의 값이 전부 var(--color-로 시작한다', () => {
    const names = ['bg', 'surface', 'surface-2', 'line', 'text', 'text-dim', 'text-faint', 'text-placeholder', 'accent', 'accent-soft', 'ok', 'warn', 'danger']
    for (const n of names) expect(root, `--${n}`).toMatch(new RegExp(`--${n}: var\\(--color-[a-z-]+\\);`))
  })

  it('v120 RR2: global.css에 # 색 리터럴과 rgba(·rgb(가 0건이다 (color-mix 안의 transparent는 허용)', () => {
    expect(globalCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(outside).not.toMatch(/rgba?\(/)
  })

  it('v120 RR2: global.css에 color-scheme: dark가 없다', () => {
    expect(globalCss).not.toMatch(/color-scheme:\s*dark/)
  })

  it('v120 RR2: 상태바 받침은 .ax-screen이 아니라 body::before에 걸려 전 화면이 받는다', () => {
    expect(axCss).toMatch(/prefers-color-scheme: light\) \{\s*body::before \{/)
    expect(axCss).not.toContain('.ax-screen::before')
  })

  it('v120 RR2: html[data-astryx-theme] 블록이 --glass-bar를 테마 표면에서 만들고 시트 토큰은 html 블록에 없다', () => {
    expect(glassCss).toMatch(/html\[data-astryx-theme\] \{\s*--glass-bar: color-mix\(in srgb, var\(--color-background-surface\) 50%, transparent\);/)
    expect(glassCss).not.toMatch(/--glass-(sheet|solid|edge): (rgba|#)/)
  })

  it('v120 RR2: 라이트에서 legacy 띠 넷의 흐림에 brightness()가 없다', () => {
    expect(glassCss).toMatch(/prefers-color-scheme: light\) \{\s*\.tabbar,[\s\S]*?backdrop-filter: saturate\(180%\) blur\(20px\);/)
  })
})
