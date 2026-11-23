// PLAN v1.20 RR10 — 사본 정리 (v1.21 SS8에서 legacy CSS가 없어져 "앱 CSS에 X가 없다"로 옮겼다). `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const appCss = () => noComments(read('../src/ax/ax.css') + read('../src/ax/parts.css'))

describe('v120 RR10 — 사본 정리', () => {
  it('v120 RR10 → v121 SS8: ASTRYX-INVENTORY.md의 합계 줄이 "안 쓰는 parts.css 선택자 0개."로 끝난다(정의가 legacy에서 parts.css로 바뀌었다)', () => {
    const last = read('../docs/ASTRYX-INVENTORY.md').trimEnd().split('\n').at(-1)
    expect(last).toMatch(/안 쓰는 parts\.css 선택자 0개\.$/)
  })

  it('v120 RR10 → v121 SS8: 눌림·움직임 사본이 없다 — 앱 CSS에 --press-·--motion-·--ease-·.btn·.pill·.chip·.segment가 없고 눌림은 Astryx 부품의 것이다(motion.css 눌림 제외 목록 두 검사를 옮겼다)', () => {
    const css = appCss()
    for (const gone of ['--press-', '--motion-', '--ease-', '.stepper', '.tabbar', '.rest-', '.resume-strip', '.session-minimize', '.chip-btn', '.diet-chip', '.back-link']) expect(css, gone).not.toContain(gone)
  })

  it('v120 RR10 → v121 SS8: 사본을 너무 많이 지우지 않았다 — 눌림 사본 규칙(.btn·.pill·.chip·.segment)의 짝은 이제 없고, 눌림을 받는 화면 틀(.ax-screen)과 띠(.ax-bar)의 규칙은 남는다', () => {
    const css = appCss()
    expect(css).not.toMatch(/(^|[\s,>])\.(btn|pill|chip|segment)(?![\w-])/)
    expect(css).toContain('.ax-screen {')
    expect(css).toContain('.ax-bar {')
  })

  it('v120 RR10 → v121 SS8: 앱 CSS에 유틸 클래스(.mt-·.mb-·.ml-·.mr-)와 .mt-section·.banner-dismiss가 없다(space.css 유틸 검사를 옮겼다)', () => {
    const css = appCss()
    expect(css).not.toContain('banner-dismiss')
    expect(css).not.toMatch(/\.(mt|mb|ml|mr)-[a-z]+/)
    for (const gone of ['.stack-tight', '.label-flush', '.row-confirm', '.day-exercises', '.row-plain']) expect(css, gone).not.toContain(gone)
  })

  it('v120 RR10 → v121 SS8: 앱 CSS에 .diet-head·.diet-mark 규칙이 없다(global.css 검사를 옮겼다)', () => {
    const css = appCss()
    expect(css).not.toMatch(/\.diet-head\b/)
    expect(css).not.toMatch(/\.diet-mark/)
  })

  it('v120 RR10 → v121 SS8: ui-check-lib에 눌림·움직임 정적 검사(motionStaticChecks·measurePress)와 .stepper 요구가 없다 — 옮긴 화면의 눌림은 --press-shot이 사진으로 본다', () => {
    const lib = read('./lib/ui-check-lib.mjs')
    expect(lib).not.toContain('motionStaticChecks')
    expect(lib).not.toContain('measurePress')
    expect(lib).not.toContain('.stepper')
  })
})
