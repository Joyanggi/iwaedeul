// PLAN v1.20 RR8 — 세션의 시트 8개의 CSS. `.css`는 vitest에서 ?raw가 비어(제약 3) fs로 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const parts = read('../src/ax/parts.css')
const globalCss = read('../src/styles/global.css')
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
/** 선택자(앞)와 본문(뒤)의 쌍. 중첩이 한 겹뿐인 이 파일(@layer 안 규칙)에 맞춰 가장 안쪽 `{…}`만 센다 */
const rules = (css) => [...noComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }))

const SHEETS = ['세션 종료', '종목 추가', '휴식 타이머', '대체운동 선택', '보상작용 입력', '보상작용 반복 — 무게 하향', '무게 단위 설정', '템포 가이드']

describe('v120 RR8 — 템포 무대와 시트 글줄바꿈', () => {
  const tempo = rules(parts).filter((r) => /\.ax-tempo-/.test(r.sel))

  it('v120 RR8: parts.css가 .ax-tempo-stage·-ring·-center를 갖고 링 크기를 --ax-tempo-scale에서 읽는다', () => {
    const sels = tempo.map((r) => r.sel).join('\n')
    for (const c of ['.ax-tempo-stage', '.ax-tempo-ring', '.ax-tempo-center']) expect(sels, c).toContain(c)
    expect(tempo.find((r) => r.sel === '.ax-tempo-ring').body).toMatch(/transform:\s*scale\(var\(--ax-tempo-scale/)
  })

  it('v120 RR8: 템포 규칙에 색 리터럴(#·rgb·hsl·oklch·이름 색)이 없고 색은 Astryx 토큰이다 — 마지막 사이클 링은 경고 글자색 토큰', () => {
    for (const r of tempo) expect(r.body, r.sel).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch)\(/)
    const last = tempo.find((r) => /\.ax-tempo-ring-last/.test(r.sel))
    expect(last.body).toContain('var(--color-text-warning)')
    expect(tempo.find((r) => r.sel === '.ax-tempo-ring-concentric').body).toContain('var(--color-accent)')
    expect(tempo.find((r) => r.sel === '.ax-tempo-ring-eccentric').body).toContain('var(--color-text-success)')
  })

  it('v120 RR8: 여덟 시트의 이름(aria-label)이 한글 단어 단위 줄바꿈(keep-all + anywhere) 규칙에 다 들어 있다 — 제목(h1·h2)까지', () => {
    const rule = rules(parts).find((r) => /dialog:is\(/.test(r.sel) && /word-break:\s*keep-all/.test(r.body))
    expect(rule, 'keep-all 규칙을 못 찾았다').toBeTruthy()
    for (const name of SHEETS) expect(rule.sel, name).toContain(`[aria-label='${name}']`)
    expect(rule.sel).toMatch(/:is\(p, span, div, h1, h2\)/)
    expect(rule.body).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('v120 RR8: global.css에서 옮긴 시트의 legacy 규칙이 사라졌다 — .tempo-*·.sheet-row·.sub-field·.chip-row·.chip-btn·.setup-edit', () => {
    const sels = rules(globalCss).map((r) => r.sel).join('\n')
    expect(sels).not.toMatch(/\.tempo-|\.sheet-row|\.sub-field|\.chip-row|\.chip-btn|\.setup-edit/)
  })
})
