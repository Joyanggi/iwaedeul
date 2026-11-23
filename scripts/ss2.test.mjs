// PLAN v1.21 SS2 — 식단 탭의 CSS. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const parts = read('../src/ax/parts.css')
// v1.21 SS8: `src/styles/`가 없다. 옛 "legacy CSS에 X가 없다"는 앱 CSS(ax.css·parts.css) 전체에 X가 없다로 읽는다(되살아나면 실패)
const appCss = read('../src/ax/ax.css') + '\n' + parts

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())
/** 선택자(정확히 그 글자)로 규칙 본문을 찾는다 */
const body = (css, selector) => {
  const text = strip(css)
  const at = text.indexOf(`${selector} {`)
  if (at < 0) return null
  return text.slice(at, text.indexOf('}', at) + 1)
}

describe('v121 SS2 — parts.css에 더한 것', () => {
  it('v121 SS2: .ax-text-error·.ax-text-success는 ax-text-warning과 같은 세 겹 선택자로 색 토큰을 건다', () => {
    const error = body(parts, '.ax-text-error.ax-text-error.ax-text-error')
    const success = body(parts, '.ax-text-success.ax-text-success.ax-text-success')
    expect(error, 'error 세 겹').not.toBeNull()
    expect(success, 'success 세 겹').not.toBeNull()
    expect(error).toMatch(/color:\s*var\(--color-text-error\)/)
    expect(success).toMatch(/color:\s*var\(--color-text-success\)/)
  })

  it('v121 SS2: .ax-slot-mark[data-grade]가 등급 여섯의 글자색을 토큰으로 건다(색 리터럴 0)', () => {
    const rules = {
      "full'],\n  .ax-slot-mark[data-grade='high": '--color-text-success',
      mid: '--color-accent',
      low: '--color-text-warning',
      zero: '--color-text-error',
      none: '--color-text-secondary',
    }
    const text = strip(parts)
    for (const [grade, token] of Object.entries(rules)) {
      const at = text.indexOf(`.ax-slot-mark[data-grade='${grade}']`)
      expect(at, grade).toBeGreaterThan(-1)
      const rule = text.slice(at, text.indexOf('}', at))
      expect(rule, grade).toContain(`var(${token})`)
    }
    expect(text).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/)
  })

  it('v121 SS2: 식단도 앱 전체 한 규칙(.ax-screen)이 한글을 단어 사이에서만 꺾는다(keep-all + anywhere) — .ax-diet 선택자는 없다(SS8)', () => {
    const rule = body(parts, ':is(.ax-screen, dialog) :is(p, span, div, h1, h2, h3, li)')
    expect(parts).not.toContain('.ax-diet')
    expect(rule).not.toBeNull()
    expect(rule).toMatch(/word-break:\s*keep-all/)
    expect(rule).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('v121 SS2: 식단 줄의 legacy 규칙(.btn-row 무리)이 parts.css에 없다', () => {
    expect(selectors(parts).filter((s) => /\.btn-row/.test(s))).toEqual([])
  })
})

describe('v121 SS2 — global.css에서 지운 것과 남긴 것', () => {
  it('v121 SS2: 식단 탭 세 파일만 쓰던 규칙이 없다 — .diet-plan-btn·.diet-protein*·.diet-bar*·.diet-slot*·.diet-mark*·.diet-items·.diet-note·.diet-item-on·.meal-note', () => {
    const bad = [...selectors(appCss), ...selectors(appCss)].filter((s) =>
      /\.(diet-plan-btn|diet-protein|diet-bar|diet-slot|diet-mark|diet-items|diet-note|diet-item-on|diet-item-btn|meal-note)/.test(s),
    )
    expect(bad).toEqual([])
  })

  it('v121 SS3: SS2 때 시트가 쓰느라 남겼던 .diet-item·.diet-item-group·.diet-variant-btn·.diet-sheet-state·.diet-plan-diff를 시트가 Astryx가 되어 지웠다', () => {
    const all = selectors(appCss).join('\n')
    for (const c of ['.diet-item', '.diet-item-group', '.diet-variant-btn', '.diet-sheet-state', '.diet-plan-diff']) {
      expect(all, c).not.toContain(c)
    }
  })
})
