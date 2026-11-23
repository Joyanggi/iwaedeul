// PLAN v1.21 SS3 — 식단 시트 넷 + SheetFrame 삭제의 CSS·파일 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const parts = read('../src/ax/parts.css')
// v1.21 SS8: `src/styles/`가 없다. 옛 "legacy CSS에 X가 없다"는 앱 CSS(ax.css·parts.css) 전체에 X가 없다로 읽는다(되살아나면 실패)
const appCss = read('../src/ax/ax.css') + '\n' + parts
const lib = read('./lib/ui-check-lib.mjs')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())

describe('v121 SS3 — 지운 것', () => {
  it('v121 SS3: SheetFrame.tsx 파일이 없다', () => {
    expect(existsSync(new URL('../src/components/SheetFrame.tsx', import.meta.url))).toBe(false)
  })

  it('v121 SS3: global.css에 .sheet·.sheet-backdrop·.sheet-grip·.check-*·.diet-item*·.diet-variant-btn·.diet-sheet-state·.diet-plan-diff가 없다', () => {
    const bad = selectors(appCss).filter((s) => /\.(sheet|check-|diet-item|diet-variant-btn|diet-sheet-state|diet-plan-diff)/.test(s))
    expect(bad).toEqual([])
  })

  it('v121 SS3: motion.css에 시트 움직임(.sheet·sheet-enter·sheet-leave·scrim-*·is-closing)이 없다', () => {
    expect(strip(appCss)).not.toMatch(/sheet|scrim-|is-closing/)
  })

  it('v121 SS3: 앱 CSS에 @scope(legacy 뿌리 목록)와 .sheet-backdrop이 없다(SS8: 목록 자체가 없어졌다 — 뜻은 같다)', () => {
    expect(appCss).not.toContain('@scope')
    expect(appCss).not.toContain('.sheet-backdrop')
  })
})

describe('v121 SS3 — 남긴 것·더한 것', () => {
  it('v121 SS3: 식단 시트 넷도 시트 이름 목록이 아니라 앱 전체 한글 줄바꿈 규칙(dialog)이 덮는다(SS8: 이름 목록을 모았다 — 이름 규칙이 남으면 새 시트가 빠진다)', () => {
    expect(strip(parts)).toContain(':is(.ax-screen, dialog) :is(p, span, div, h1, h2, h3, li)')
    expect(parts).not.toMatch(/dialog[^{]*aria-label/)
  })

  it('v121 SS3: ui-check의 SHEET_SELECTOR는 .astryx-bottom-sheet뿐이고 .sheet 루프·.sheet-backdrop이 없다', () => {
    expect(lib).toContain("export const SHEET_SELECTOR = '.astryx-bottom-sheet'")
    // 선택자 글자(따옴표·쉼표·공백 바로 뒤의 `.sheet`)만 본다 — `[...sheet.querySelectorAll` 같은 변수 이름은 아니다
    expect(strip(lib)).not.toMatch(/['"`,\s]\.sheet(-backdrop)?(?![\w-])/)
  })
})
