// PLAN v1.21 SS6 — 설정 탭의 CSS·검사 도구 검사. `.css`는 vitest에서 `?raw`가 비어(제약 3) fs로 읽는다.
// 선택자는 `{` 앞 글자를 모아 본다(주석 제외) — onClick의 `=>`·`>`에서 끊기는 정규식이 아니라 CSS만 읽는다.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const globalCss = read('../src/styles/global.css')
const spaceCss = read('../src/styles/space.css')
const parts = read('../src/ax/parts.css')
const uiCheck = read('./ui-check.mjs')
const uiLib = read('./lib/ui-check-lib.mjs')
const uiSpace = read('./lib/ui-space.mjs')

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const selectors = (css) => [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim())
const body = (css, sel) => {
  const i = strip(css).indexOf(`${sel} {`)
  expect(i, `${sel} 규칙이 없다`).toBeGreaterThan(-1)
  const text = strip(css).slice(i)
  return text.slice(text.indexOf('{') + 1, text.indexOf('}'))
}

describe('v121 SS6 — 지운 legacy CSS', () => {
  it('v121 SS6: global.css에서 설정·패널만 쓰던 규칙이 없다 — .screen*·.btn-danger·.btn-row·.chip*·.row*·.segment*·.banner*·.field*·.pill*·.preview·.ext-link·details.card·button.row', () => {
    const bad = selectors(globalCss).filter((s) => /(^|[\s,>])(\.screen(-title|-sub)?|\.btn-danger|\.btn-row|\.btn-sm|\.chip(-warn)?|\.row(-main|-title|-meta)?|\.segment|\.banner(-info|-danger)?|\.field|\.pill(-row|-on)?|\.preview|\.ext-link|details\.card|button\.row|textarea\.field)(?![\w-])/.test(s) && !/^@scope/.test(s))
    expect(bad).toEqual([])
  })

  // SS7: 온보딩이 Astryx로 옮겨 SS6이 남기던 온보딩 규칙이 모두 지워졌다 — 남기던 검사를 "전부 없다"로(PLAN SS7)
  it('v121 SS6: 온보딩이 쓰던 .card·.card-label·.btn·.btn-primary·.row-sub·.warn-box·.mono·.onboarding·.steps는 SS7 뒤 없다', () => {
    for (const gone of ['.card', '.card-label', '.btn', '.btn-primary', '.row-sub', '.warn-box', '.mono', '.onboarding', '.steps', '.lede', '.spacer']) expect(selectors(globalCss).filter((x) => x.split(/[\s,>:]+/).includes(gone)), gone).toEqual([])
  })

  it('v121 SS6: space.css의 유틸은 하나도 없다(SS7 뒤 .mt-group·.mb-group도 없다. .mt-row·.mb-row·.ml-inline·.mr-inline·.ml-auto·.stack-tight·.label-flush·.row-confirm·.day-exercises·.row-plain 없음)', () => {
    const sel = selectors(spaceCss).join('\n')
    for (const gone of ['.mt-group', '.mb-group', '.mt-row', '.mb-row', '.ml-inline', '.mr-inline', '.ml-auto', '.stack-tight', '.label-flush', '.row-confirm', '.day-exercises', '.row-plain']) expect(sel, gone).not.toContain(gone)
  })

  it('v121 SS6: legacy 뿌리 목록(@scope)에서 SS7이 .onboarding을 뺐다(.screen·.banner는 SS8이 걷는다)', () => {
    expect(globalCss).toMatch(/@scope \(\.screen, \.banner\) to \(\.ax-scope\)/)
  })
})

describe('v121 SS6 — 설정 부품의 CSS', () => {
  it('v121 SS6: 설정 틀은 한글 줄바꿈 규칙을 갖는다(분석과 같다)', () => {
    const b = body(parts, '.ax-settings :is(p, span, div, h1, h2),\n  .ax-onboarding :is(p, span, div, h1, h2)')
    expect(b).toMatch(/word-break:\s*keep-all/)
    expect(b).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('v121 SS6: .ax-nowrap은 줄을 못 바꾸게만 한다(템포 표기·스위치·볼륨·출력)', () => {
    expect(body(parts, '.ax-nowrap')).toMatch(/white-space:\s*nowrap/)
  })
})

describe('v121 SS6 — ui-check의 설정 검사', () => {
  it('v121 SS6: 설정 장면 열은 안쪽 대칭을 판정하고 EXPECTED_PAIRS가 열 장면 전부에 버튼·카드를 기대한다', () => {
    expect(uiCheck).toMatch(/SETTINGS_SCENES = \['settings', 'settings-375', 'settings-open', 'settings-end', 'settings-routines', 'settings-routines-375', 'settings-routines-confirm-375', 'settings-gist', 'settings-export-preview', 'settings-reset-confirm'\]/)
    expect(uiCheck).toMatch(/SYMMETRY_JUDGED = new Set\(\[[^\]]*\.\.\.SETTINGS_SCENES/)
    for (const s of ['settings-375', 'settings-open', 'settings-end', 'settings-routines', 'settings-routines-375', 'settings-routines-confirm-375', 'settings-gist', 'settings-export-preview', 'settings-reset-confirm']) expect(uiSpace, s).toContain(`'${s}': ['button', 'card']`)
    expect(uiSpace).toContain("settings: ['bar', 'tab-indicator', 'tab-content', 'button', 'card']")
    expect(uiSpace).toMatch(/INSET_SCENES = new Set\(\[[^\]]*'settings'[^\]]*\]/)
  })

  it('v121 SS6: KNOWN_FAILURES는 빈 배열이고 설정 장면의 접근성·눌림 반응이 통과해야 한다(stale 실패)', () => {
    expect(uiLib).toMatch(/export const KNOWN_FAILURES = \[\]\n/)
  })

  it('v121 SS6: 새 흐름은 전부 guardedFlow 안이고 이름이 PLAN 흐름 ①~⑨와 경계를 덮는다(예외가 삼켜지지 않는다)', () => {
    const names = ['SS6 Phase 바꾸기', 'SS6 미리 듣기', 'SS6 Day 펼치기', 'SS6 내보내기 미리보기', 'SS6 초기화 2단 확인', 'SS6 Gist 저장됨',
      'SS6 선택 묶음 맨 글자 아님', 'SS6 템포 스위치 켜고 끄기', 'SS6 Gist 토큰 칸·외부 링크', 'SS6 경계: 루틴이 하나뿐이면 삭제·이 루틴 쓰기 버튼이 없다', 'SS6 경계: Phase 3이면 전환 조건이 없다',
      'SS6 경계: 진행 중 세션이면 편집·이 루틴 쓰기·새 루틴이 막히고 안내가 있다', 'SS6 경계: 저장 공간을 모르면 —']
    for (const n of names) expect(uiCheck, n).toContain(`guardedFlow(['${n}'`)
    // 템포 가이드 켜기는 sheet-tempo 장면(optional) 안에서 흐름을 직접 싣는다 — 장면이 건너뛰어지면 아래 가드가 실패로 센다
    expect(uiCheck).toContain("flows.push(['SS6 템포 가이드 켜기'")
    // 오류 글자색 흐름은 이름 둘짜리 guardedFlow(초기화 2단 확인과 한 묶음)다
    expect(uiCheck).toContain("guardedFlow(['SS6 초기화 2단 확인', 'SS6 오류 글자색(초기화 확인 문구)']")
    expect(uiCheck).toContain("guardedFlow(['SS6 성공 글자색(전환 조건 ✓)']")
    expect(uiCheck).toContain('SS6 ${scene} 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안')
    expect(uiCheck).toContain('SS6 ${scene} 한 줄 부품 겹침·잘림·세로 가운데·간격')
    for (const sc of ['settings', 'settings-export-preview', 'settings-reset-confirm', 'settings-gist', 'settings-routines']) expect(uiCheck, sc).toMatch(new RegExp(`ss6Wrap\\('${sc}'\\)`))
  })

  it('v121 SS6: 템포 가이드를 켜는 옛 흐름은 스위치를 쓰고(.card 찾기·사용 안 함 버튼 0건) 건너뛰어졌으면 실패로 센다', () => {
    expect(uiCheck).not.toContain("page.locator('.card').filter({ has: page.getByText('템포 가이드'")
    expect(uiCheck).not.toContain("name: '사용 안 함'")
    expect(uiCheck).toContain("page.getByRole('switch', { name: '템포 가이드 사용' })")
    expect(uiCheck).toContain("!flows.some((fl) => fl[0] === 'SS6 템포 가이드 켜기')")
  })

  it('v121 SS6: 줄 안 버튼은 Row 오른쪽 칸 안 Astryx 버튼을 재고 설정·루틴 목록 장면에서만 부른다(0개면 실패)', () => {
    expect(uiLib).toContain("[role=\"listitem\"]")
    expect(uiLib).toMatch(/n === 0\) return \{ ok: false/)
    expect(uiCheck).toContain("ROW_BUTTON_SCENES = ['settings', 'settings-routines']")
    expect(uiCheck).not.toContain('rowButtonStaticChecks')
  })

  it('v121 SS6: 안쪽 대칭의 내용 상자는 스크롤 칸 안 글자를 칸 상자로 자른다(내보내기 미리보기 칸의 안 보이는 글자가 카드 안쪽을 -535로 만들지 않게)', () => {
    expect(uiSpace).toMatch(/\/auto\|scroll\/\.test\(getComputedStyle\(a\)\.overflowY\)/)
  })

  it('v121 SS6: 글자+버튼·버튼 줄·Row 검사(inPageSettingsRows)는 버튼 줄 0개면 실패하고 겹침·간격·세로 가운데·잘림을 잰다', () => {
    const at = uiCheck.indexOf('function inPageSettingsRows()')
    expect(at).toBeGreaterThan(-1)
    const fn = uiCheck.slice(at, uiCheck.indexOf('function inPageSettingsToggles()', at))
    for (const t of ['버튼 줄 0개', 'overlap(', 'maxCy', '이웃 간격이 다르다', "textOverflow === 'ellipsis'", '[role="radiogroup"]']) expect(fn, t).toContain(t)
  })
})
