// PLAN v1.21 SS3 — 식단 시트 넷 + SheetFrame 삭제의 CSS·파일 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const globalCss = read('../src/styles/global.css')
const axCss = read('../src/ax/ax.css')
const motion = read('../src/styles/motion.css')
const parts = read('../src/ax/parts.css')
const lib = read('./lib/ui-check-lib.mjs')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())

describe('v121 SS3 — 지운 것', () => {
  it('v121 SS3: SheetFrame.tsx 파일이 없다', () => {
    expect(existsSync(new URL('../src/components/SheetFrame.tsx', import.meta.url))).toBe(false)
  })

  it('v121 SS3: global.css에 .sheet·.sheet-backdrop·.sheet-grip·.check-*·.diet-item*·.diet-variant-btn·.diet-sheet-state·.diet-plan-diff가 없다', () => {
    const bad = selectors(globalCss).filter((s) => /\.(sheet|check-|diet-item|diet-variant-btn|diet-sheet-state|diet-plan-diff)/.test(s))
    expect(bad).toEqual([])
  })

  it('v121 SS3: motion.css에 시트 움직임(.sheet·sheet-enter·sheet-leave·scrim-*·is-closing)이 없다', () => {
    expect(strip(motion)).not.toMatch(/sheet|scrim-|is-closing/)
  })

  it('v121 SS3: global.css·ax.css의 legacy 뿌리 목록이 글자 그대로 같고 .sheet-backdrop이 없다', () => {
    const g = /@scope \(([^)]*)\) to \(\.ax-scope\)/.exec(globalCss)?.[1]
    const a = /@scope \(html, \.ax-scope\) to \(([^)]*)\)/.exec(axCss)?.[1]
    expect(g, 'global.css의 legacy 뿌리 목록').toBeDefined()
    expect(a, 'ax.css의 legacy 뿌리 목록').toBeDefined()
    expect(g).toBe(a)
    expect(g).toBe('.screen, .banner')
  })
})

describe('v121 SS3 — 남긴 것·더한 것', () => {
  it('v121 SS3: parts.css의 한글 줄바꿈 시트 목록에 식단 시트 넷(끝 일치 둘 포함)이 있다', () => {
    for (const name of ["[aria-label='식단 플랜 전환']", "[aria-label='먹은 것 추가']", "[aria-label$=' 기록']", "[aria-label$=' 단백질원 고르기']"]) {
      expect(parts, name).toContain(name)
    }
    // 목록이 `dialog:is(…) :is(p, span, div, h1, h2)` 하나에 걸려 있다
    const m = parts.match(/dialog:is\(([\s\S]*?)\)\s*:is\(p, span, div, h1, h2\)/)
    expect(m).not.toBeNull()
    expect(m[1]).toContain("[aria-label$=' 기록']")
  })

  it('v121 SS3: ui-check의 SHEET_SELECTOR는 .astryx-bottom-sheet뿐이고 .sheet 루프·.sheet-backdrop이 없다', () => {
    expect(lib).toContain("export const SHEET_SELECTOR = '.astryx-bottom-sheet'")
    // 선택자 글자(따옴표·쉼표·공백 바로 뒤의 `.sheet`)만 본다 — `[...sheet.querySelectorAll` 같은 변수 이름은 아니다
    expect(strip(lib)).not.toMatch(/['"`,\s]\.sheet(-backdrop)?(?![\w-])/)
  })
})
