// PLAN v1.21 SS8 — legacy CSS 삭제와 마무리. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 옛 scripts/legacy-scope.test.mjs에서 아직 뜻이 있는 줄(RRM 유리 글자 없음·RR2 상태바 받침·RR6 옛 세션 CSS)을 옮겨 왔다.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const url = (p) => new URL(`../${p}`, import.meta.url)
const raw = (p) => readFileSync(url(p), 'utf8')
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const ax = strip(raw('src/ax/ax.css'))
const parts = strip(raw('src/ax/parts.css'))
const WRAP = ':is(.ax-screen, dialog) :is(p, span, div, h1, h2, h3, li)'

const walk = (dir) =>
  readdirSync(url(dir), { recursive: true })
    .map((p) => `${dir}/${String(p).split('\\').join('/')}`)
    .filter((p) => /\.(css|ts|tsx|mjs|html)$/.test(p))

describe('v121 SS8 — legacy CSS가 없다', () => {
  it('v121 SS8: src/styles가 없다(폴더째 지웠다)', () => {
    expect(existsSync(url('src/styles'))).toBe(false)
  })

  it('v121 SS8: main.tsx가 .css를 import하지 않는다', () => {
    expect(strip(raw('src/main.tsx'))).not.toMatch(/import\s+['"][^'"]*\.css['"]/)
  })

  it('v121 SS8: src/ax/index.tsx의 첫 import가 ./layers.css이고 그 파일이 @layer reset, astryx-base, astryx-theme; 한 줄이다', () => {
    const ix = raw('src/ax/index.tsx')
    const first = ix.slice(ix.indexOf("import '"))
    expect(first.startsWith("import './layers.css'")).toBe(true)
    expect(raw('src/ax/layers.css').trim()).toBe('@layer reset, astryx-base, astryx-theme;')
  })

  it('v121 SS8: ax.css에 @scope·legacy 글자와 --inset-·--space-·px 리터럴(1px·0·env() 밖)이 없다', () => {
    expect(ax).not.toContain('@scope')
    expect(ax).not.toContain('legacy')
    expect(ax).not.toMatch(/--inset-|--space-/)
    const px = [...ax.replace(/env\([^)]*\)/g, '').matchAll(/(-?[\d.]+)px/g)].map((m) => m[0]).filter((v) => v !== '1px' && v !== '0px')
    expect(px).toEqual([])
  })

  it('v121 SS8: parts.css에 ax-scope·시트 이름(dialog … aria-label) 규칙이 없고 한글 줄바꿈 규칙이 정확히 하나다', () => {
    expect(parts).not.toContain('ax-scope')
    expect(parts).not.toMatch(/dialog[^{]*aria-label/)
    const rules = [...parts.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => /word-break:\s*keep-all/.test(m[2]) && m[1].trim() === WRAP)
    expect(rules).toHaveLength(1)
    expect(rules[0][2]).toMatch(/overflow-wrap:\s*anywhere/)
    // 같은 속성을 다른 선택자가 또 걸지 않는다(.ax-address-part의 break-all은 주소 조각 하나만)
    expect([...parts.matchAll(/word-break:\s*keep-all/g)]).toHaveLength(1)
  })

  it('v121 SS8: src에 ax-scope 글자가 0건이다(테스트가 "없다"를 적은 파일 제외)', () => {
    const SELF = new Set(['src/lib/v120.test.ts', 'src/lib/v121.test.ts'])
    const hits = walk('src').filter((p) => !SELF.has(p) && raw(p).includes('ax-scope'))
    expect(hits).toEqual([])
  })

  it('v121 SS8: .tsx에 mt-·mb-·ml-·mr- 유틸 클래스가 없다', () => {
    const hits = walk('src').filter((p) => p.endsWith('.tsx') && !/\.test\./.test(p) && /className="[^"]*\b(mt|mb|ml|mr)-[a-z]/.test(raw(p)))
    expect(hits).toEqual([])
  })

  it('v121 SS8: ui-check·검사 도구에 알려진 실패(KNOWN_FAILURES·applyKnownFailures)·눌림 반응·섬 버튼·여백 정적 검사가 없다', () => {
    const t = raw('scripts/ui-check.mjs') + raw('scripts/lib/ui-check-lib.mjs') + raw('scripts/lib/ui-space.mjs')
    for (const gone of ['KNOWN_FAILURES', 'applyKnownFailures', "'눌림 반응'", "'섬 버튼'", "'움직임 줄이기'", 'spaceStaticChecks', 'motionStaticChecks', 'inPageIslandButtons', 'global.css', 'motion.css']) expect(t, gone).not.toContain(gone)
  })
})

describe('v121 SS8 — 옛 legacy-scope 검사 가운데 뜻이 남은 것', () => {
  it('v120 RRM → v121 SS8: src·scripts·index.html에 backdrop-filter·--glass-·glassDiag·glass-check 글자가 0건이다', () => {
    const SELF = new Set(['scripts/ss8.test.mjs', 'scripts/lib/ui-check-lib.mjs', 'src/lib/v120.test.ts', 'src/lib/v118.test.ts', 'scripts/ui-check-lib.test.mjs'])
    const files = [...walk('src'), ...walk('scripts'), 'index.html'].filter((p) => !SELF.has(p))
    const hits = files.flatMap((p) => ['backdrop' + '-filter', '--glass-', 'glassDiag', 'glass-check'].filter((w) => raw(p).includes(w)).map((w) => `${p}: ${w}`))
    expect(hits).toEqual([])
  })

  it('v120 RRM: ax.css에 Astryx 시트를 덧칠하는 규칙이 없다(Astryx가 정한 표면과 막을 그대로 쓴다)', () => {
    expect(ax).not.toContain('.astryx-bottom-sheet')
    expect(ax).not.toContain('::backdrop')
  })

  it('v120 RR2: 상태바 받침은 .ax-screen이 아니라 body::before에 걸려 전 화면이 받는다 · ax.css에 color-scheme: dark 고정이 없다', () => {
    expect(ax).toMatch(/prefers-color-scheme: light\) \{\s*body::before \{/)
    expect(ax).not.toContain('.ax-screen::before')
    expect(ax).not.toMatch(/color-scheme:\s*dark/)
  })

  it('v120 RR1 → SS8: ax.css의 리셋은 @layer reset 안의 맨 규칙이고(@scope 아님) [data-astryx-theme] button 규칙이 없다', () => {
    expect(ax).toMatch(/@layer reset \{\s*:where\(\*\)/)
    expect(ax).not.toMatch(/\[data-astryx-theme\]\s+button/)
  })

  it('v120 RR6: src/**/*.css에 옛 세션·휴식 선택자(.session-*·.rest-*)가 없다', () => {
    const css = walk('src').filter((p) => p.endsWith('.css'))
    expect(css.length, 'CSS를 못 찾았다').toBeGreaterThanOrEqual(3)
    for (const f of css) {
      const t = strip(raw(f))
      expect(t, f).not.toMatch(/\.session(-[\w-]+)?(?![\w-])/)
      expect(t, f).not.toMatch(/\.rest-(bar|progress|dismiss|content|main|time|label|btn)/)
    }
  })

  it('v121 SS8: 설정의 글꼴·글자색은 Theme이 정한다 — 앱 CSS가 --font-sans·--text를 정하지 않는다', () => {
    expect(ax + parts).not.toMatch(/--font-sans\s*:/)
    expect(ax + parts).not.toMatch(/var\(--(text|bg|surface|line|accent|ok|warn|danger)\)/)
  })
})

describe('v121 SS8 — 검사 도구', () => {
  it('v121 SS8: guardedFlow는 이름이 이미 있다고 건너뛰지 않고 이 실행이 남긴 이름만 중복으로 본다(고정 이름으로 다크·라이트 두 번 도는 흐름의 라이트 예외가 안 삼켜진다)', () => {
    const t = raw('scripts/ui-check.mjs')
    const at = t.indexOf('const guardedFlow = async')
    const fn = t.slice(at, t.indexOf('// 경고 글자색', at))
    expect(fn).toContain('const from = flows.length')
    expect(fn).toContain('flows.slice(from).some')
    expect(fn).not.toMatch(/!flows\.some/)
  })

  it('v121 SS8: 값만 찍는 SS4 검증은 흐름 통과 개수에 안 세고 기록 목록(wrapNotes)으로 간다', () => {
    const t = raw('scripts/ui-check.mjs')
    expect(t).not.toMatch(/flows\.push\(\[`SS4 검증 \$\{scene\}/)
    expect(t).toContain('wrapNotes.push(`SS4 검증 ${scene}')
  })
})
