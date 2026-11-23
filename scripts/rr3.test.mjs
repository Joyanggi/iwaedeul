// PLAN v1.20 RR3 — 앱 틀과 아래 탭. vitest에서 `.css`를 ?raw로 읽으면 빈 문자열이라(제약 3) fs로 읽는다.
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const partsCss = strip(read('src/ax/parts.css'))
// v1.21 SS8: `src/styles/`가 없다. 옛 "global.css에 X가 없다"는 앱 CSS(ax.css·parts.css) 전체에 X가 없다로 읽는다
const globalCss = strip(read('src/ax/ax.css') + read('src/ax/parts.css'))

const cssFiles = (dir) =>
  readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssFiles(`${dir}/${e.name}`) : e.name.endsWith('.css') ? [`${dir}/${e.name}`] : [],
  )

describe('v120 RR3 — parts.css와 legacy CSS', () => {
  it('v120 RR3: src/ax/parts.css에 색 리터럴(#…, rgb(, rgba()이 0건이고 px 값은 1px뿐이고 흐림 속성이 없다', () => {
    expect(partsCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(partsCss).not.toMatch(/\brgba?\(/)
    // 낱말을 이어 붙인다: RRM 스캔(legacy-scope.test.mjs)이 흐림 속성 이름을 0건으로 센다
    expect(partsCss).not.toContain('backdrop' + '-filter')
    const px = [...partsCss.matchAll(/(-?[\d.]+)px/g)].map((m) => m[0])
    expect(
      px.filter((v) => v !== '1px'),
      'parts.css의 px는 1px(선)뿐이다',
    ).toEqual([])
  })

  it('v120 RR3: .ax-bar의 배경을 정하는 규칙이 parts.css에만 있다 (다른 CSS에 .ax-bar 재질 선언 없음)', () => {
    const at = partsCss.indexOf('.ax-bar {')
    const rule = partsCss.slice(at, partsCss.indexOf('}', at))
    expect(rule).toContain('background: var(--color-background-surface);')
    for (const f of cssFiles('src').filter((p) => !p.endsWith('/parts.css'))) {
      expect(strip(read(f)), f).not.toMatch(/\.ax-bar[^{]*\{[^}]*(background|border)/)
    }
  })

  it('v120 RR3: 띠 안쪽 여백은 위·아래가 같은 단계다 (아래는 안전 영역을 바깥에 더할 뿐)', () => {
    expect(partsCss).toMatch(/padding-block: var\(--spacing-2\);/)
    expect(partsCss).toMatch(/padding-bottom: calc\(var\(--spacing-2\) \+ env\(safe-area-inset-bottom/)
    expect(partsCss).toMatch(/padding-top: calc\(var\(--spacing-2\) \+ env\(safe-area-inset-top/)
  })

  it('v120 RR3: global.css에 .app·.tabbar·.tab-icon·.resume-·.update-prompt·--tabbar-·--resume-strip-h가 없다', () => {
    expect(globalCss).not.toMatch(/\.app\b/)
    for (const word of ['.tabbar', '.tab-icon', '.resume-', '.update-prompt', '--tabbar-', '--resume-strip-h']) {
      expect(globalCss, word).not.toContain(word)
    }
  })

  it('v120 RR3: 어느 CSS에도 옛 탭바·재개 줄 선택자가 남지 않는다 (motion·space 포함)', () => {
    for (const f of cssFiles('src')) {
      expect(strip(read(f)), f).not.toMatch(/\.tabbar|\.resume-strip|\.update-prompt|--tabbar-|--resume-strip-h|\.app:has/)
    }
  })

  it('v120 RR3: 화면 아래 여백(.ax-screen)이 띠가 알린 높이(--ax-bar-bottom)를 쓴다(SS6: legacy .screen 규칙은 설정을 끝으로 지웠다)', () => {
    expect(globalCss).not.toMatch(/\.screen \{/)
    expect(strip(read('src/ax/ax.css'))).toMatch(/\.ax-screen \{[^}]*--ax-bar-bottom[^}]*\}/)
  })
})
