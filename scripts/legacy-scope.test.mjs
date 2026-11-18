// PLAN v1.20 RR1 — legacy CSS의 범위 가두기. vitest에서 `.css`를 ?raw로 읽으면 빈 문자열이라(제약 3) fs로 읽는다.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

  it('v120 RR1: 두 파일의 legacy 뿌리 목록이 글자 그대로 같고 필요한 뿌리를 다 담는다 (RR3이 .app을 지움)', () => {
    const g = rootsOf(globalCss, GLOBAL_SCOPE)
    const a = rootsOf(axCss, AX_SCOPE)
    expect(g).toBe(a)
    for (const root of ['.screen', '.onboarding', '.banner']) {
      expect(g.split(',').map((x) => x.trim()), root).toContain(root)
    }
    // SS3: 식단 시트 넷이 Astryx로 옮겨 .sheet-backdrop 뿌리가 없다
    expect(g.split(',').map((x) => x.trim())).not.toContain('.sheet-backdrop')
  })

  it('v120 RR1: legacy 범위 안에서 테마의 h1·p 규칙이 번지지 않게 글꼴·크기·줄 높이·색을 되돌린다 (PLAN이 못 본 번짐 — theme.css가 reset 레이어에 요소 규칙을 건다)', () => {
    const body = globalCss.slice(globalCss.indexOf('@scope ('))
    const m = body.match(/:where\(h1, h2, h3, h4, h5, h6, p, small, code, pre\)\s*\{([^}]*)\}/)
    expect(m, 'legacy 범위의 제목·문단 되돌림 규칙').toBeTruthy()
    for (const prop of ['font-family', 'font-size', 'font-weight', 'line-height', 'color']) {
      expect(m[1], prop).toMatch(new RegExp(`${prop}:\\s*revert`))
    }
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
})

// PLAN v1.20 RRM — 유리를 걷고 Astryx 표면으로 (CSS·스크립트라 fs로 읽는다)
describe('v120 RRM — 유리를 걷는다', () => {
  const walk = (dir) =>
    readdirSync(new URL(`../${dir}`, import.meta.url), { recursive: true })
      .map((p) => `${dir}/${String(p).split('\\').join('/')}`)
      .filter((p) => /\.(css|ts|tsx|mjs|html)$/.test(p))
  const raw = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
  // 이 검사 파일 넷과 검사기(ui-check-lib.mjs — backdrop-filter가 none인지 재는 곳)는 낱말을 담을 수밖에 없다
  const SELF = new Set(['scripts/legacy-scope.test.mjs', 'scripts/lib/ui-check-lib.mjs', 'src/lib/v120.test.ts', 'src/lib/v118.test.ts', 'scripts/ui-check-lib.test.mjs'])
  const files = [...walk('src'), ...walk('scripts'), 'index.html'].filter((p) => !SELF.has(p))

  it('v120 RRM: src·scripts·index.html에 backdrop-filter·--glass-·glassDiag·glass-check 글자가 0건이다', () => {
    const hits = files.flatMap((p) => ['backdrop-filter', '--glass-', 'glassDiag', 'glass-check'].filter((w) => raw(p).includes(w)).map((w) => `${p}: ${w}`))
    expect(hits).toEqual([])
  })

  it('v120 RRM: glass.css·glass-check.mjs·screenshots-glass.mjs·glassDiag.ts가 없다', () => {
    for (const p of ['src/styles/glass.css', 'scripts/lib/glass-check.mjs', 'scripts/screenshots-glass.mjs', 'src/lib/glassDiag.ts', 'src/lib/glassDiag.test.ts']) {
      expect(existsSync(new URL(`../${p}`, import.meta.url)), p).toBe(false)
    }
  })

  it('v120 RRM: SettingsScreen.tsx에 유리 글자가 없다 (옆의 오디오 줄은 남는다)', () => {
    const t = raw('src/screens/SettingsScreen.tsx')
    expect(t).not.toContain('유리')
    expect(t).toContain('오디오')
  })

  it('v120 RRM → v121 SS3: legacy 시트(.sheet·.sheet-backdrop) 규칙이 global.css에 없다 (시트가 모두 Astryx가 되어 표면·막은 Astryx 시트가 정한다)', () => {
    expect(globalCss).not.toMatch(/(^|[\s,}])\.sheet(-backdrop)?(?![\w-])/m)
  })

  it('v120 RRM: ax.css에 Astryx 시트를 덧칠하는 규칙이 없다 (Astryx가 정한 표면과 막을 그대로 쓴다)', () => {
    expect(axCss).not.toContain('.astryx-bottom-sheet')
    expect(axCss).not.toContain('::backdrop')
  })
})

// PLAN v1.20 RR6 — 옛 세션·휴식 클래스가 CSS에 안 남는다 (v120.test.ts에서 옮김: vitest ?raw는 CSS를 빈 글자로 줘서 거기서는 실패할 수 없었다)
const walkCss = (dir) =>
  readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkCss(`${dir}/${e.name}`) : e.name.endsWith('.css') ? [`${dir}/${e.name}`] : [],
  )
describe('v120 RR6 — 옛 세션·휴식 CSS', () => {
  it('v120 RR6: src/**/*.css에 옛 세션·휴식 선택자(.session-*·.rest-*, 하이픈 여럿 포함)가 하나도 없다', () => {
    const files = walkCss('src')
    expect(files.length, 'CSS를 못 찾았다').toBeGreaterThan(3)
    expect(read('src/styles/global.css').length, 'global.css가 비어 읽혔다').toBeGreaterThan(1000)
    for (const f of files) {
      const t = read(f)
      expect(t, f).not.toMatch(/\.session(-[\w-]+)?(?![\w-])/)
      expect(t, f).not.toMatch(/\.rest-(bar|progress|dismiss|content|main|time|label|btn)/)
    }
  })

  it('v120 RR6: global.css·ax.css의 legacy 뿌리 목록에 .session이 없다', () => {
    for (const roots of [rootsOf(globalCss, GLOBAL_SCOPE), rootsOf(axCss, AX_SCOPE)]) {
      expect(roots.split(',').map((x) => x.trim())).not.toContain('.session')
    }
  })
})
