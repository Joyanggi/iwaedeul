// PLAN v1.20 RR7 — 운동 카드와 스테퍼의 CSS. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const parts = read('../src/ax/parts.css')
const globalCss = read('../src/styles/global.css')

/** CSS의 선택자만 모은다(주석 제외) */
const selectors = (css) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())

describe('v120 RR7 — global.css에서 지운 것과 남긴 것', () => {
  it('v120 RR7: global.css에 .stepper·.set-*·.setup-row·.ex-chips·.ex-note·.ex-cue·.ex-body 규칙이 없다', () => {
    const bad = selectors(globalCss).filter((s) =>
      /\.(stepper|set-(row|meta|no|ghost|inputs|check|head|tempo)|setup-(row|value|empty|icon)|setting-rows|ex-chips|ex-note|ex-cue|ex-body|note-prev|chip-tap)\b/.test(s),
    )
    expect(bad).toEqual([])
  })

  it('v120 RR7: 기록 상세의 고아 카드가 쓰는 것은 남아 있다 — .ex-card·.ex-head·.ex-order·.ex-name·.ex-sub·.ex-count·.ex-card-orphan (RR8: .setup-edit은 대체 시트가 Astryx로 옮겨 가며 지웠다)', () => {
    const all = selectors(globalCss).join('\n')
    for (const c of ['.ex-card', '.ex-head', '.ex-order', '.ex-name', '.ex-sub', '.ex-count', '.ex-card-orphan']) {
      expect(all, c).toContain(c)
    }
    // 그 카드가 안 쓰는 변형은 지웠다
    expect(all).not.toMatch(/\.ex-card-done|\.ex-card-skipped|\.ex-count-done|\.setup-edit/)
  })
})

describe('v120 RR7 — parts.css의 세트 표와 숫자 칸', () => {
  const block = (css, sel) => {
    const i = css.indexOf(`${sel} {`)
    expect(i, `${sel} 규칙이 없다`).toBeGreaterThan(-1)
    return css.slice(i, css.indexOf('}', i))
  }

  it('v120 RR7: 머리(.ax-set-head)와 행(.set-row)이 같은 열 정의 한 곳을 읽는다 — 머리의 열 폭이 따로 있으면 "세트"가 꺾인다', () => {
    const rule = parts.match(/\.ax-set-head,\s*\.set-row \{[^}]*\}/)
    expect(rule, '머리와 행이 한 규칙으로 묶여 있어야 한다').not.toBeNull()
    expect(rule[0]).toMatch(/grid-template-columns:\s*var\(--spacing-6\) minmax\(0, 1\.2fr\) minmax\(0, 1fr\)/)
    // 세트 표의 열을 정의하는 규칙은 이 한 곳뿐이다
    const defs = [...parts.matchAll(/([^{}]*)\{[^{}]*grid-template-columns:\s*var\(--spacing-6\)/g)]
    expect(defs).toHaveLength(1)
    expect(block(parts, '.ax-set-head > *')).toMatch(/white-space:\s*nowrap/)
  })

  it('v120 RR7: 숫자 칸 글자는 입력칸에 건다 — 크게 켠 칸은 테마의 제목 글자 단계(--text-heading-2-size)이고 16px 아래로 안 내려간다', () => {
    expect(parts).toMatch(/\.ax-num-prominent input \{[^}]*font-size:\s*max\(1rem, var\(--text-heading-2-size\)\)/)
    expect(parts).toMatch(/\.ax-num input,\s*\.ax-num-prominent input \{[^}]*text-align:\s*center[^}]*font-variant-numeric:\s*tabular-nums/)
  })

  it('v120 RR7: 완료·워밍업 행의 상태 규칙이 토큰만으로 다시 쓰여 있다 (색 리터럴 0건)', () => {
    expect(parts).toMatch(/\.set-row-warmup \{[^}]*opacity:\s*0\.62/)
    expect(parts).toMatch(/\.set-row-done \{[^}]*color-mix\(in srgb, var\(--color-success\)/)
    expect(parts).toMatch(/\.set-row-done \.ax-set-no,\s*\.set-row-done-warmup \.ax-set-no \{[^}]*var\(--color-text-success\)/)
    expect(parts).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/)
  })

  it('v120 RR7: 스테퍼 줄이 폭을 밀어내지 않는다 — 세트 행의 열 안에서는 min-width 0이고, 식단 편집의 .btn-row 줄에서는 남는 폭을 나눠 쓰되 단추 둘과 숫자 칸이 들어갈 만큼 아래로는 안 줄어든다(0으로 줄면 단추가 삭제 버튼 위에 겹친다)', () => {
    expect(parts).toMatch(/\.set-row > \.ax-scope \{[^}]*min-width:\s*0/)
    const diet = parts.match(/\.btn-row > \.ax-scope \{[^}]*\}/)
    expect(diet, '식단 줄 규칙이 있어야 한다').not.toBeNull()
    expect(diet[0]).toMatch(/flex:\s*1/)
    expect(diet[0]).toMatch(/min-width:\s*calc\(2 \* var\(--spacing-9\) \+ var\(--spacing-12\)\)/)
    expect(diet[0]).not.toMatch(/min-width:\s*0/)
  })
})
