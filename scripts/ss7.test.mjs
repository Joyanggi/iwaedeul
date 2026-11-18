// PLAN v1.21 SS7 — 온보딩의 CSS·검사 도구 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const globalCss = read('../src/styles/global.css')
const axCss = read('../src/ax/ax.css')
const spaceCss = read('../src/styles/space.css')
const parts = read('../src/ax/parts.css')
const uiCheck = read('./ui-check.mjs')
const uiSpace = read('./lib/ui-space.mjs')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())

describe('v121 SS7 — legacy 뿌리 목록', () => {
  it('v121 SS7: global.css·ax.css의 legacy 뿌리 목록이 같고 .onboarding이 없다(.screen·.banner만)', () => {
    const g = /@scope \(([^)]*)\) to \(\.ax-scope\)/.exec(globalCss)?.[1]
    const a = /@scope \(html, \.ax-scope\) to \(([^)]*)\)/.exec(axCss)?.[1]
    expect(g).toBeDefined()
    expect(g).toBe(a)
    expect(g.split(',').map((x) => x.trim())).not.toContain('.onboarding')
    expect(g).toBe('.screen, .banner')
  })
})

describe('v121 SS7 — 지운 legacy CSS', () => {
  it('v121 SS7: global.css·space.css에 온보딩이 쓰던 .onboarding*·.lede·.steps*·.spacer·.warn-box·.mono·.card*·.btn*·.row-sub·.mt-group·.mb-group가 없다', () => {
    const all = [...selectors(globalCss), ...selectors(spaceCss)].join('\n')
    for (const gone of ['.onboarding', '.lede', '.steps', '.spacer', '.warn-box', '.mono', '.card', '.btn', '.row-sub', '.mt-group', '.mb-group']) {
      expect(all, gone).not.toMatch(new RegExp(`${gone.replace('.', '\\.')}(?![\\w-])`))
    }
  })
})

describe('v121 SS7 — 온보딩 틀의 CSS', () => {
  it('v121 SS7: .ax-onboarding은 한글 줄바꿈 규칙을 갖는다(설정·분석과 같다)', () => {
    const css = strip(parts)
    const i = css.indexOf('.ax-onboarding :is(p, span, div, h1, h2)')
    expect(i, '.ax-onboarding 선택자').toBeGreaterThan(-1)
    const b = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i))
    expect(b).toMatch(/word-break:\s*keep-all/)
    expect(b).toMatch(/overflow-wrap:\s*anywhere/)
  })
})

describe('v121 SS7 — ui-check의 온보딩 검사', () => {
  it('v121 SS7: 온보딩 세 장면은 안쪽 대칭을 판정하고 EXPECTED_PAIRS가 버튼(·카드)을 기대한다', () => {
    expect(uiCheck).toContain("ONBOARDING_SCENES = ['onboarding', 'onboarding-375', 'onboarding-standalone']")
    expect(uiCheck).toMatch(/SYMMETRY_JUDGED = new Set\(\[[^\]]*\.\.\.ONBOARDING_SCENES/)
    expect(uiSpace).toContain("onboarding: ['button', 'card']")
    expect(uiSpace).toContain("'onboarding-375': ['button', 'card']")
    expect(uiSpace).toContain("'onboarding-standalone': ['button']")
  })

  it('v121 SS7: 온보딩이 같은 역할(화면 좌우·묶음 사이·카드 안쪽) 비교에 든다', () => {
    expect(uiSpace).toMatch(/SCREENS = \[[^\]]*'onboarding', 'onboarding-375', 'onboarding-standalone'/)
    expect(uiSpace).toMatch(/INSET_SCENES = new Set\(\[[^\]]*'onboarding'\]/)
  })

  it('v121 SS7: 새 흐름은 guardedFlow 안이다(예외가 삼켜지지 않는다) — 시작하기 둘, 폭 꺾임·안쪽 폭 안 둘', () => {
    for (const n of ['SS7 시작하기(홈 화면 앱)', 'SS7 시작하기(Safari 탭)']) expect(uiCheck, n).toContain(`guardedFlow(['${n}']`)
    expect(uiCheck).toContain("screenWrapFlow('SS7 onboarding 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-onboarding')")
    expect(uiCheck).toContain("screenWrapFlow('SS7 onboarding-standalone 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-onboarding', p)")
  })

  it('v121 SS7: 홈 화면 앱 장면의 첫 버튼 기다림은 20초이고 걸린 시간을 흐름 자세히에 적는다(5초 초과 간헐의 원인 기록)', () => {
    expect(uiCheck).toMatch(/name: '시작하기', exact: true \}\)\.waitFor\(\{ timeout: 20000 \}\)/)
    expect(uiCheck).toContain('버튼이 나타나기까지 ${bootMs}ms')
  })
})
