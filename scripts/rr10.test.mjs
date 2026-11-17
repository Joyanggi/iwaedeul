// PLAN v1.20 RR10 — 사본 정리. `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('v120 RR10 — 사본 정리', () => {
  it('v120 RR10: ASTRYX-INVENTORY.md의 합계 줄이 "안 쓰는 legacy 선택자 0개."로 끝난다', () => {
    const last = read('../docs/ASTRYX-INVENTORY.md').trimEnd().split('\n').at(-1)
    expect(last).toMatch(/안 쓰는 legacy 선택자 0개\.$/)
  })

  it('v120 RR10: motion.css 눌림 제외 목록에 스테퍼·띠·휴식 바 선택자가 없고 .back-link·astryx-는 남는다', () => {
    const css = noComments(read('../src/styles/motion.css'))
    for (const gone of ['.stepper', '.tabbar', '.rest-', '.resume-strip', '.session-minimize', '.chip-btn', '.diet-chip']) expect(css, gone).not.toContain(gone)
    expect(css).toContain('.back-link')
    expect(css).toContain(".ax-screen *")
    expect(css).toContain("[class*='astryx-']")
  })

  it('v120 RR10: 안 옮긴 화면이 쓰는 눌림 규칙(.btn·.pill·.chip·.segment button·.sheet)은 남는다 — 사본을 너무 많이 지우지 않았다', () => {
    const css = noComments(read('../src/styles/motion.css'))
    for (const keep of ['.btn', '.pill', '.chip', '.segment button', '.back-link', '.sheet', '.sheet-backdrop', 'is-closing']) expect(css, keep).toContain(keep)
  })

  it('v120 RR10: space.css의 유틸 클래스는 .tsx가 쓰는 일곱 개뿐이다(.mt-section·.banner-dismiss 없음)', () => {
    const css = noComments(read('../src/styles/space.css'))
    expect(css).not.toContain('.mt-section')
    expect(css).not.toContain('banner-dismiss')
    for (const keep of ['.mt-row', '.mt-group', '.mb-row', '.mb-group', '.ml-inline', '.mr-inline', '.ml-auto']) expect(css, keep).toContain(keep)
  })

  it('v120 RR10: global.css에서 쓰는 곳 없는 .diet-head·.diet-mark 규칙이 없다(.diet-mark-btn·.diet-mark-<등급>은 남는다)', () => {
    const css = noComments(read('../src/styles/global.css'))
    expect(css).not.toMatch(/\.diet-head\b/)
    expect(css).not.toMatch(/\.diet-mark\s*\{/)
    expect(css).toMatch(/\.diet-mark-btn\b/)
    expect(css).toMatch(/\.diet-mark-full\b/)
  })

  it('v120 RR10: ui-check-lib의 눌림 정적 검사가 .stepper를 더는 요구하지 않는다', () => {
    const lib = read('./lib/ui-check-lib.mjs')
    expect(lib).toContain("['.ax-screen', 'astryx-']")
    expect(lib).not.toContain('.stepper')
  })
})
