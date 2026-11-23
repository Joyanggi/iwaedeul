#!/usr/bin/env node
/**
 * UI 스크린샷 + 검사 (PLAN v1.19 QQ0, v1.20 RR0).
 *
 * 사용: node scripts/ui-check.mjs <before|after> [--check] [--only=<장면,…>] [--ver=v1.20]
 *   before|after  저장 폴더 docs/screenshots/<버전>/<before|after>/<장면>.png (다크)와 <장면>-light.png (라이트). 전 장면을 두 벌로 찍는다
 *                 (지금 다크 고정인 화면의 라이트는 다크와 같게 나오는 것이 정상이다 — RR1까지)
 *   --ver=v1.20   저장 폴더의 버전. 없으면 package.json 버전의 앞 두 자리
 *   --check       장면마다 접근성(axe)·여백 격자·가로 넘침 + (띠·시트가 있으면) 띠·시트 버튼 검사를 재서 표로 찍는다.
 *                 하나라도 실패면 종료 코드 1. 정적 검사는 after에서만(지금은 QQ1~QQ4가 더하는 만큼)
 *   --only=a,b    이 장면만 찍고 잰다(흐름은 앞에서부터 그대로 거친다)
 *   --press-shot=<장면>:<버튼 이름>  그 장면에서 그 버튼 가운데에 touchStart를 보내고 뗀 적 없는 상태로 <장면>-press.png를 찍는다(판정 없음, 화면 검증자가 보는 사진)
 *   --same-layout=<장면,…|all>  after: 그 장면들의 요소 사각형이 <기준>/layout.json과 같은지 본다(다크). 다르면 실패
 *   --safe-area   after: 위 47·아래 34 안전 영역을 흉내 낸 장면 home-safe·session-safe·sheet-finish-safe(다크·라이트)를 찍고 `상태바 받침`을 잰다 (Chromium만 — CDP)
 *   --webkit      after --check: `색 체계 전환` 흐름을 Playwright WebKit에서 한 번 더 돌고 장면마다 다크·라이트를 after/webkit/에 찍는다 (RR11)
 *   --layout-base=<파일>  --same-layout이 견줄 기준 파일(기본 docs/screenshots/<버전>/before/layout.json)
 *
 * 브라우저: `npx playwright install chromium`. 레포에 넣지 않는다, CI는 받지 않는다.
 * 요소는 글자·역할·aria-label로만 고른다(시작 버튼·재개 줄·휴식 바도 — 옮겨도 선택자가 안 깨진다).
 * 검사 함수: scripts/lib/ui-check-lib.mjs.
 */
import { AxeBuilder } from '@axe-core/playwright'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices, webkit } from 'playwright'
import { preview } from 'vite'
import { collectFirstLoad } from './lib/first-load-lib.mjs'
import { EXPECTED_PAIRS, inPageInsetSymmetry, inPageLayout, insetSymmetryVerdict, spaceRoleVerdicts } from './lib/ui-space.mjs'
import {
  THEME_TOKENS,
  barStaticChecks,
  freePort,
  inPageBars,
  inPageOverflow,
  inPageInnerOverflow,
  inPageTextOrder,
  inPageNotClipped,
  inPageStartSpot,
  startSpotVerdict,
  inPageSheetButtons,
  inPageCurrentTab,
  installScript,
  sheetButtonVerdict,
  compareRects,
  inPageLastVisible,
  inPageRects,
  inPageRowButtons,
  inPageSetNumber,
  inPageTouchReach,
  inPageSetTable,
  inPageNumberFit,
  inPageSpacing,
  inPageTabHit,
  inPageThemeTokens,
  inPageToneColor,
  inPageChartColors,
  rgbLuminance,
  chartColorVerdict,
} from './lib/ui-check-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '/workout-tracker/'
/** SS5 시드가 쓰는 루틴의 Day별 종목(앱이 시드로 읽는 파일과 같은 것) */
const ROUTINE_DAYS = (() => {
  const dir = join(ROOT, 'src', 'data')
  const file = readdirSync(dir).find((f) => /^routine-.*\.json$/.test(f))
  const routine = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  return Object.fromEntries(routine.days.map((d) => [d.id, d.exercises.map((e) => ({ exerciseId: e.exerciseId, group: e.group }))]))
})()
const PKG_VER = 'v' + JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version.split('.').slice(0, 2).join('.')

const [phase, ...flags] = process.argv.slice(2)
if (phase !== 'before' && phase !== 'after') {
  console.error('사용: node scripts/ui-check.mjs <before|after> [--check] [--only=<장면,…>]')
  process.exit(2)
}
const CHECK = flags.includes('--check')
// --ver=v1.20과 --ver v1.20 둘 다 받는다(screenshots.mjs는 띄어 쓴다)
const verFlag = flags.find((f) => f.startsWith('--ver='))
const verAt = flags.indexOf('--ver')
const VER = verFlag ? verFlag.slice(6) : verAt >= 0 ? String(flags[verAt + 1]) : PKG_VER
if (!/^v\d+\.\d+$/.test(VER)) {
  console.error(`--ver는 v1.20 모양이어야 한다: ${VER}`)
  process.exit(2)
}
const onlyFlag = flags.find((f) => f.startsWith('--only='))
const ONLY = onlyFlag ? new Set(onlyFlag.slice(7).split(',').filter(Boolean)) : null
const pressFlag = flags.find((f) => f.startsWith('--press-shot='))
const PRESS_SHOT = pressFlag ? pressFlag.slice(13).split(/:(.+)/).filter(Boolean) : null // [장면, 버튼 이름]
const sameFlag = flags.find((f) => f.startsWith('--same-layout='))
const SAME_LAYOUT = sameFlag ? sameFlag.slice(14).split(',').filter(Boolean) : null
const SAFE_AREA = flags.includes('--safe-area')
const WEBKIT = flags.includes('--webkit')
const baseFlag = flags.find((f) => f.startsWith('--layout-base='))
const OUT = join(ROOT, 'docs', 'screenshots', VER, phase)
const LAYOUT_BASE = baseFlag ? baseFlag.slice(14) : join(ROOT, 'docs', 'screenshots', VER, 'before', 'layout.json')

const IPHONE = { ...devices['iPhone 14'] }
delete IPHONE.defaultBrowserType
const DEVICE = { ...IPHONE, viewport: { width: 390, height: 844 } }

const settle = (page, ms = 600) => page.waitForTimeout(ms)
const btn = (page, name) => page.getByRole('button', { name, exact: true })

const COLUMNS = ['접근성', '여백 격자', '가로 넘침', '줄 안 버튼', '띠', '시트 버튼', '탭 누름', '지금 탭', '마지막 요소', '세트 숫자', '테마 토큰', '안쪽 대칭']
/**
 * RR0이 더한 칸은 `before`에서는 기록만 한다(실패로 세지 않는다). `after --check`에서 판정하기 시작하는 작업:
 * 탭 누름·마지막 요소 = RR3, 세트 숫자 = RR7, 테마 토큰 = RR1(그 전 `before`에서는 테마가 있는 editor 장면만).
 * 작업이 끝날 때 해당 값을 true로 바꾼다.
 */
const JUDGED = { '탭 누름': true, '지금 탭': true, '마지막 요소': true, '세트 숫자': true, '테마 토큰': true }
/**
 * `안쪽 대칭`(RR12)은 이미 Astryx 부품인 장면(루틴 편집)에서만 판정하고, 나머지는 기록만 한다(옮기기 전 장면은 실패로 세지 않는다).
 * 화면·띠를 옮기는 작업(RR3·RR4·RR5·RR6·RR7)이 자기 장면을 여기에 더한다.
 */
const HOME_SCENES = ['home', 'home-end', 'home-375', 'home-banner', 'home-banner-375', 'home-banners-open', 'home-resume']
/** 홈이 여는 시트 둘(RR5). 시트 안 내용의 좌·우(`sheet` 쌍)도 판정한다 */
const HOME_SHEET_SCENES = ['sheet-home', 'sheet-open-session']
/** 세션이 여는 시트(RR8) — 안쪽 대칭(sheet·button)과 같은 역할(시트 좌우)을 판정한다. 이름은 장면 이름 */
const SESSION_SHEET_SCENES = ['sheet-finish', 'sheet-finish-cardio', 'sheet-finish-end', 'sheet-timer', 'sheet-timer-picked', 'sheet-add', 'sheet-substitute', 'sheet-comp', 'sheet-comp-picked', 'sheet-scale', 'sheet-scale-error', 'sheet-tempo', 'sheet-watch', 'sheet-watch-end']
const SESSION_SCENES = ['session', 'session-375', 'session-rest']
/** 운동 카드가 보이는 장면(RR7) — 카드·뱃지·세트 행 쌍도 판정한다 */
/** 요약(RR9) — 기본 장면과 경계 장면 일곱(0세트·PR 셋·어시스트만·긴 메모·감각 저하 복귀·유산소만·디로드). 카드·뱃지·버튼 쌍을 판정한다 */
const SUMMARY_SCENES = ['summary', 'summary-zero', 'summary-pr', 'summary-assist', 'summary-memo', 'summary-revert', 'summary-cardio', 'summary-deload']
const CARD_SCENES = ['session', 'session-375', 'session-open-b', 'history-detail-edit']
/** 식단(SS2) — 식단 탭 다섯 장면과 그 편집기가 든 기록 두 장면. 카드·뱃지·버튼 쌍을 판정한다 */
const DIET_SCENES = ['diet', 'diet-end', 'diet-375', 'diet-log-open', 'diet-streak']
/** 기록(SS4) — 기록 탭 아홉 장면. 카드·뱃지·버튼 쌍을 판정한다(기록 화면 전체가 Astryx다) */
const HISTORY_SCENES = ['history', 'history-375', 'history-day', 'history-exercise', 'history-exercise-detail', 'history-detail', 'history-detail-end', 'history-detail-change', 'history-detail-edit']
/** 분석(SS5) — 분석 탭 네 장면. 카드·뱃지·버튼 쌍을 판정한다(분석 화면 전체가 Astryx다) */
const ANALYZE_SCENES = ['analyze', 'analyze-end', 'analyze-375', 'analyze-empty']
/** 설정(SS6) — 설정 탭 열 장면. 카드·버튼 쌍을 판정한다(설정 화면 전체가 Astryx다) */
const SETTINGS_SCENES = ['settings', 'settings-375', 'settings-open', 'settings-end', 'settings-routines', 'settings-routines-375', 'settings-routines-confirm-375', 'settings-gist', 'settings-export-preview', 'settings-reset-confirm']
/** 온보딩(SS7) — 처음 실행 화면 셋(Safari 탭 390·375, 홈 화면 앱). 카드·버튼 쌍을 판정한다(온보딩 전체가 Astryx다) */
const ONBOARDING_SCENES = ['onboarding', 'onboarding-375', 'onboarding-standalone']
/** 카드 안 줄(Row) 오른쪽 칸에 버튼이 있는 장면 — 줄 안 버튼을 잰다(SS6) */
const ROW_BUTTON_SCENES = ['settings', 'settings-routines']
const SYMMETRY_JUDGED = new Set(['editor', 'line-sheet', ...DIET_SCENES, ...HISTORY_SCENES, ...ANALYZE_SCENES, ...SETTINGS_SCENES, ...ONBOARDING_SCENES, ...HOME_SCENES, ...HOME_SHEET_SCENES, ...SESSION_SHEET_SCENES, ...SESSION_SCENES, ...SUMMARY_SCENES, 'session-open-b', 'home-safe', 'session-safe'])
/** 판정을 켠 쌍 종류. 나머지 종류는 장면이 Astryx여도 기록만 한다(card·badge = RR4, set-row = RR7, sheet = RR5 — 세션 장면은 RR6부터 button·bar를 판정하고, 운동 카드 안의 card·badge·set-row는 RR7 전까지 기록만) */
const SYMMETRY_KINDS = new Set(['button', 'bar', 'tab-indicator', 'tab-content'])
/** 홈(RR4)은 카드·뱃지 쌍도 판정한다 */
const HOME_SYMMETRY_KINDS = new Set([...SYMMETRY_KINDS, 'card', 'badge'])
const HOME_SHEET_SYMMETRY_KINDS = new Set([...SYMMETRY_KINDS, 'sheet'])
const CARD_SYMMETRY_KINDS = new Set([...SYMMETRY_KINDS, 'card', 'badge', 'set-row'])
/** `같은 역할`의 묶음 사이·카드 안쪽·가까움 순서는 홈을 옮기는 RR4부터 판정한다 */
const ROLES_JUDGED = new Set(['묶음 사이', '카드 안쪽', '가까움 순서'])
const THEME_SCENES_BEFORE = new Set(['editor', 'line-sheet'])
/** 장면마다 기대하는 띠·시트 수의 최소값. 모자라면 `띠` 칸을 실패로 낸다 — 아무것도 안 재고 지나가지 않게 (RR0) */
/** 아래 탭 띠가 있는 장면(재개 줄이 붙는 `home-resume`·`settings-open`은 따로 2) */
const TAB_BAR_SCENES = ['home', 'home-end', 'home-375', 'home-banner', 'home-banner-375', 'home-banners-open', 'history', 'history-detail', 'history-detail-edit', 'analyze', 'diet', 'diet-log-open', 'settings', 'settings-end', 'settings-375', 'settings-routines', 'settings-routines-375', 'settings-routines-confirm-375',
  // v1.21 SS0이 더한 장면
  'diet-end', 'diet-375', 'diet-streak', 'history-375', 'history-day', 'history-exercise', 'history-exercise-detail', 'history-detail-end', 'history-detail-change', 'analyze-end', 'analyze-375', 'analyze-empty', 'settings-gist', 'settings-export-preview', 'settings-reset-confirm']
const EXPECTED_BARS = {
  // 탭 장면: 아래 탭 띠 1 (재개 줄이 있으면 2)
  ...Object.fromEntries(TAB_BAR_SCENES.map((n) => [n, 1])),
  // 재개 줄은 아래 탭과 한 띠(.ax-bar) 안에 쌓인다(RR3) — 띠는 1개다
  'home-resume': 1,
  'settings-open': 1,
  // 세션 장면: 위 띠 1, 휴식 중이면 휴식 바까지 2
  session: 1,
  'session-375': 1,
  'session-open-b': 1,
  'session-rest': 2,
  // 시트 장면: 시트 1
  ...Object.fromEntries(['sheet-home', 'sheet-open-session', ...SESSION_SHEET_SCENES, 'sheet-food', 'sheet-food-new', 'sheet-diet-plan', 'sheet-diet-plan-ahead', 'sheet-diet-slot', 'sheet-diet-slot-edit', 'sheet-diet-variant', 'line-sheet'].map((n) => [n, 1])),
}
const SET_SCENES = new Set(['session', 'session-375', 'history-detail-edit'])
/** 시작 자리를 재는 장면 (RR4). 390 폭 넷, 375 폭 둘 */
const START_SPOT_SCENES = new Set(['home', 'home-banner', 'home-banners-open', 'home-resume', 'home-375', 'home-banner-375'])
const LAST_SCENES = new Set(['session', 'session-375', 'session-rest', 'home', 'home-end', 'home-resume', 'home-resume-end', 'diet', 'history', 'analyze', 'settings-end'])
const sheetBtns = {} // 장면 -> { dark, light } 시트 버튼의 대비 (RRM)
const chartColors = {} // 장면 -> { dark, light } 차트 선·축의 계산된 색 (RR2)
const themeBg = {} // 장면 -> { dark, light } 문서 배경 (테마 토큰 칸의 라이트·다크 견줌)
const startSpots = { 390: {}, 375: {} } // 폭 -> 장면 -> inPageStartSpot() (RR4 시작 자리)
const rects = {} // 장면 -> inPageRects() (배치 기록)
const rows = []
const axeInfo = []
const flows = [] // [이름, {ok, detail}] — 시트 닫기 흐름 (QQ3)
const shots = []
const layouts = {} // 장면 -> inPageLayout() (QQ4 여백 한 벌)

const sceneFailures = [] // [장면, 이유] — requiredScene이 준비하다 던졌거나 찍지 못한 장면 (SS0). 하나라도 있으면 종료 코드 1
const snapped = new Set() // 찍으려고 닿은 장면 이름 (--only로 거른 것도 센다)
const wrapNotes = [] // 390·375 폭 글자 중간 꺾임 기록 (SS0 before에서는 기록만 한다)
const ghCalls = [] // 설정 gist 장면이 막은 GitHub 호출 — 0이어야 한다

const verdict = (r) => (r.skip ? { status: '건너뜀', detail: r.detail } : { status: r.ok ? '통과' : '실패', detail: r.detail })

const TAB_NAV_SCENES = new Set([...TAB_BAR_SCENES, 'home-resume', 'home-resume-end', 'settings-open', 'home-safe'])

async function barsVerdict(page, scene) {
  const bars = await page.evaluate(inPageBars)
  const expected = EXPECTED_BARS[scene] ?? 0
  // 띠를 고치는 작업(RR3·RR6)이 선택자를 놓쳐 0개를 재면 칸이 비어 지나가던 것을 실패로 (RR0)
  if (bars.count < expected) return { status: '실패', detail: `띠 ${bars.count}개 — 기대 ${expected}개`, marks: [`띠 ${bars.count}개 — 기대 ${expected}개`] }
  if (bars.count === 0) return null
  const parts = [['띠·시트 불투명·흐림 없음', bars]]
  const bad = parts.filter(([, r]) => !r.skip && !r.ok).map(([n, r]) => `${n}: ${r.detail}`)
  const marks = [`층 ${bars.count}개(기대 ${expected} 이상)`, ...parts.map(([n, r]) => `${n} ${r.skip ? '건너뜀' : r.ok ? '통과' : '실패'}`), bars.detail]
  return { status: bad.length ? '실패' : '통과', detail: bad.join(' / ') || `${bars.count}개 통과`, marks }
}

/** 시트 버튼 칸 (RRM): 시트가 떠 있는 장면에서만. 다크 값은 이 장면에서 판정하고, 다크·라이트 견줌은 printResults가 한다 */
async function sheetButtonsCell(page, scene, light) {
  const r = await page.evaluate(inPageSheetButtons)
  if (r.skip) return { status: '건너뜀', detail: r.detail }
  const key = scene
  sheetBtns[key] = { ...sheetBtns[key], [light ? 'light' : 'dark']: r.buttons }
  const v = sheetButtonVerdict(r.buttons, null)
  return { status: v.ok ? '통과' : '실패', detail: v.detail }
}

/** RR0이 더한 칸의 판정: before이거나 아직 판정을 안 켠 칸이면 '기록'(실패로 세지 않는다) */
function softVerdict(name, r, judged = JUDGED[name] && phase === 'after') {
  if (r.skip) return { status: '건너뜀', detail: r.detail }
  if (judged) return verdict(r)
  return { status: '기록', detail: `${r.ok ? '통과였을 것' : '실패였을 것'} — ${r.detail}` }
}

async function newColumns(page, scene, cells, light) {
  const name = light ? `${scene}-light` : scene
  // 테마 토큰: <html>에 Astryx 테마가 걸린 장면만 (RR1 전 before는 루틴 편집만)
  const themed = await page.evaluate(() => document.documentElement.hasAttribute('data-astryx-theme'))
  if (!themed) cells['테마 토큰'] = { status: '건너뜀', detail: '테마가 안 걸린 장면(RR1 전)' }
  else {
    const t = await page.evaluate(inPageThemeTokens, THEME_TOKENS)
    themeBg[scene] = { ...themeBg[scene], [light ? 'light' : 'dark']: t.bg }
    cells['테마 토큰'] = softVerdict('테마 토큰', t, phase === 'before' ? THEME_SCENES_BEFORE.has(scene) : JUDGED['테마 토큰'])
  }
  if (scene === 'analyze') chartColors[scene] = { ...chartColors[scene], [light ? 'light' : 'dark']: await page.evaluate(inPageChartColors) }
  const pairs = await page.evaluate(inPageInsetSymmetry)
  const kinds = HOME_SCENES.includes(scene) ? HOME_SYMMETRY_KINDS : (HOME_SHEET_SCENES.includes(scene) || SESSION_SHEET_SCENES.includes(scene)) ? HOME_SHEET_SYMMETRY_KINDS : (CARD_SCENES.includes(scene) || SUMMARY_SCENES.includes(scene)) ? CARD_SYMMETRY_KINDS : (DIET_SCENES.includes(scene) || HISTORY_SCENES.includes(scene) || ANALYZE_SCENES.includes(scene) || SETTINGS_SCENES.includes(scene) || ONBOARDING_SCENES.includes(scene)) ? HOME_SYMMETRY_KINDS : SYMMETRY_KINDS
  const judgedPairs = pairs.filter((p) => kinds.has(p.kind))
  const sym = insetSymmetryVerdict(SYMMETRY_JUDGED.has(scene) ? judgedPairs : pairs, EXPECTED_PAIRS[scene] ?? [])
  const rest = SYMMETRY_JUDGED.has(scene) ? insetSymmetryVerdict(pairs.filter((p) => !kinds.has(p.kind)), []) : null
  if (rest) sym.detail += ` · (기록만: ${rest.ok ? '나머지 쌍 대칭' : rest.detail})`
  cells['안쪽 대칭'] = softVerdict('안쪽 대칭', sym, SYMMETRY_JUDGED.has(scene) && phase === 'after')
  if (light) return name
  cells['탭 누름'] = softVerdict('탭 누름', await page.evaluate(inPageTabHit))
  cells['지금 탭'] = TAB_NAV_SCENES.has(scene) ? verdict(await page.evaluate(inPageCurrentTab)) : { status: '건너뜀', detail: '아래 탭이 없는 장면' }
  cells['마지막 요소'] = LAST_SCENES.has(scene) ? softVerdict('마지막 요소', await page.evaluate(inPageLastVisible)) : { status: '건너뜀', detail: '이 장면은 재지 않는다' }
  cells['세트 숫자'] = SET_SCENES.has(scene) ? softVerdict('세트 숫자', await page.evaluate(inPageSetNumber)) : { status: '건너뜀', detail: '세트 행이 있는 장면만' }
  return name
}

async function runChecks(page, scene) {
  const cells = Object.fromEntries(COLUMNS.map((c) => [c, null]))
  // 접근성
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const hard = res.violations.filter((v) => (v.impact === 'serious' || v.impact === 'critical') && v.id !== 'color-contrast')
  const contrast = res.violations.filter((v) => v.id === 'color-contrast')
  const desc = (v) => `${v.id} ${v.nodes.length}건 [${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}]`
  cells['접근성'] = { status: hard.length ? '실패' : '통과', detail: hard.map(desc).join(' / ') || '위반 0건' }
  axeInfo.push({ scene, hard: hard.length, hardList: hard.map(desc), contrast: contrast.reduce((a, v) => a + v.nodes.length, 0), incomplete: res.incomplete.filter((v) => v.id === 'color-contrast').reduce((a, v) => a + v.nodes.length, 0) })
  // 여백 격자·가로 넘침
  cells['여백 격자'] = verdict(await page.evaluate(inPageSpacing))
  layouts[scene] = await page.evaluate(inPageLayout)
  // 문서 폭만이 아니라 시트·카드 안쪽 폭 안에 요소가 있는지도 잰다 (RR9)
  const docOver = await page.evaluate(inPageOverflow)
  const innerOver = await page.evaluate(inPageInnerOverflow)
  cells['가로 넘침'] = verdict({ ok: docOver.ok && innerOver.ok, detail: `${docOver.detail} · ${innerOver.detail}` })
  // 줄 안 버튼은 카드 안 줄(Row)에 버튼이 있는 설정 장면에서만 잰다. 그 장면에서 0개면 실패 (PLAN v1.21 SS6)
  cells['줄 안 버튼'] = ROW_BUTTON_SCENES.includes(scene) ? verdict(await page.evaluate(inPageRowButtons)) : { status: '건너뜀', detail: '이 장면에 줄 안 버튼이 없다' }
  await newColumns(page, scene, cells, false)
  cells['띠'] = await barsVerdict(page, scene)
  cells['시트 버튼'] = await sheetButtonsCell(page, scene, false)
  rows.push({ scene, cells })
}

/** QQ3·RR8 흐름: sheet-finish(Astryx `Sheet`)가 떠 있을 때 부른다. 끝나면 시트를 다시 열어 둔다(뒤 장면이 시트를 닫는 코드를 그대로 쓴다). */
async function closeFlows(page) {
  const dlg = page.getByRole('dialog', { name: '세션 종료' })
  // 입력칸이 있는 시트(purpose="form")는 막을 눌러도 안 닫힌다(실수로 입력을 잃지 않게) — 닫는 길은 Esc와 닫기 버튼이다. Esc는 막·끌어내림과 같은 onOpenChange(false) 길이다
  const dismissOutside = () => page.keyboard.press('Escape')
  const reopen = async () => {
    await settle(page, 450) // 닫힘이 끝나고 레이어가 정리된 뒤에 다시 연다(바로 누르면 안 열린다)
    await btn(page, '종료').click()
    await dlg.waitFor()
    await settle(page, 450)
  }
  const flow = (name, ok, detail) => flows.push([name, { ok, detail }])
  // Esc로 닫기: 시트가 사라지고(닫힘 대기 350ms 안팎) 아래 띠가 다시 보인다
  await dismissOutside()
  const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
  await settle(page, 150)
  const bars = gone ? await page.evaluate(inPageBars) : { ok: false, count: 0, detail: '시트가 안 사라졌다' }
  flow('Esc로 닫기', gone && bars.ok && bars.count > 0, `시트 사라짐 ${gone} · 아래 띠 ${bars.count}개 불투명 ${bars.ok}`)
  // 두 번 누르기: 닫히는 중 한 번 더 눌러도 오류 없이 한 번만 닫힌다
  await reopen()
  const errs = []
  const onErr = (e) => errs.push(String(e))
  page.on('pageerror', onErr)
  await dismissOutside()
  await dismissOutside()
  const gone2 = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
  await settle(page, 450)
  page.off('pageerror', onErr)
  const still = await page.getByRole('button', { name: '세션 최소화', exact: true }).count()
  flow('Esc 두 번 누르기', gone2 && errs.length === 0 && still > 0, `사라짐 ${gone2} · 오류 ${errs.length}건 · 세션 화면 ${still > 0}`)
  // 움직임 줄이기에서 닫기: 기다리지 않는다 — 일반 닫힘 대기(350ms)보다 훨씬 짧은 250ms 안에 사라진다
  await reopen()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await settle(page, 100)
  await dismissOutside()
  const instant = await dlg.waitFor({ state: 'detached', timeout: 250 }).then(() => true, () => false)
  await page.emulateMedia({ reducedMotion: null })
  flow('움직임 줄이기에서 닫기', instant, `250ms 안에 시트 ${instant ? '없음' : '남음'}`)
  await reopen()
}

/** 라이트 장면: 띠·시트 버튼과 테마 토큰만 잰다 (다크와 같은 화면이라 나머지는 다크가 맡는다). scene은 -light 없는 이름 */
async function runLightOnly(page, scene) {
  const cells = Object.fromEntries(COLUMNS.map((c) => [c, null]))
  await newColumns(page, scene, cells, true)
  cells['띠'] = await barsVerdict(page, scene)
  cells['시트 버튼'] = await sheetButtonsCell(page, scene, true)
  rows.push({ scene: `${scene}-light`, cells })
}

/** --press-shot: 그 버튼 가운데에 CDP touchStart를 보내고 뗀 적 없는 상태로 한 장 찍은 뒤 touchCancel. 판정하지 않는다 */
async function pressShot(page, scene, label) {
  const target = page.getByRole('button', { name: label, exact: true }).first()
  const box = await target.boundingBox()
  if (!box) {
    console.log(`--press-shot: ${scene}의 "${label}" 버튼을 못 찾았다`)
    return
  }
  const cdp = await page.context().newCDPSession(page)
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await settle(page, 400)
  shots.push({ name: `${scene}-press`, buf: await page.screenshot() })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await cdp.detach()
  await settle(page, 200)
}

/** 열려 있는 dialog 안 글자를 하나씩 재서, 공백 없이 이어진 두 글자 사이에서 줄이 바뀐 곳을 센다 (RR5 재검증) */
function inPageMidWordBreaks(rootSelector = 'dialog[open]') {
  const dlg = document.querySelector(rootSelector)
  const out = { chars: 0, count: 0, samples: [] }
  if (!dlg) return out
  const walker = document.createTreeWalker(dlg, NodeFilter.SHOW_TEXT)
  // React는 `{score}점`을 글자 노드 둘("0"·"점")로 낸다. 같은 부모 안의 이웃 글자 노드는 공백이 없으면 한 덩어리라 prevTop을 이어 간다
  let prevTop = null
  let prevParent = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    // 코드 칸(pre — 내보내기 미리보기)의 글은 문장이 아니라 데이터다. 줄을 감싸 하이픈·줄표 뒤에서 꺾이는 것이 맞다(SS6)
    if (n.parentElement?.closest('pre')) { prevTop = null; continue }
    const t = n.textContent ?? ''
    const range = document.createRange()
    if (n.parentNode !== prevParent) prevTop = null
    // `<br>`은 일부러 낸 줄바꿈이다 — 그 앞뒤는 한 낱말이 아니다(분석의 두 줄 문구, SS5)
    if (n.previousSibling && n.previousSibling.nodeName === 'BR') prevTop = null
    prevParent = n.parentNode
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) { prevTop = null; continue }
      range.setStart(n, i)
      range.setEnd(n, i + 1)
      const rect = range.getClientRects()[0]
      if (!rect) { prevTop = null; continue }
      out.chars++
      if (prevTop !== null && Math.abs(rect.top - prevTop) > rect.height / 2) {
        out.count++
        if (out.samples.length < 4) out.samples.push(`${t.slice(Math.max(0, i - 3), i)}/${t.slice(i, i + 3)}`)
      }
      prevTop = rect.top
    }
  }
  return out
}

/**
 * RR9 요약 장면 시드 (page.evaluate용 — 바깥 변수를 못 본다). 진행 중인 세션(endedAt 없음)을 IndexedDB에서 고쳐 쓴다.
 * kind: zero(손대지 않음 — 0세트) · pr(전 종목 최고 기록, 앞 기록은 가벼운 세션 하나, 수행 순서 앞 둘을 맞바꿈) ·
 *       assist(어시스트 종목만 한 세션) · memo(감각 0점·긴 메모·유산소) · revert(앞 기록 20kg×5 → 이번 60kg×30·감각 0 — Phase 2에서 B그룹 복귀 카드) ·
 *       cardio(0세트 + 유산소) · deload(디로드 세션: 종목마다 1세트만 150kg×30). 돌려주는 값은 시드 설명.
 */
function inPageSummarySeed(kind) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('sessions', 'readwrite')
      const store = tx.objectStore('sessions')
      const all = store.getAll()
      let out = null
      tx.oncomplete = () => {
        idb.close()
        if (out) resolve(out)
        else reject(new Error('시드 실패: 진행 중 세션이 없다'))
      }
      tx.onerror = () => reject(tx.error)
      all.onsuccess = () => {
        const cur = all.result.find((x) => !x.endedAt)
        if (!cur) return
        const now = Date.now()
        const at = (i) => new Date(now + i * 1000).toISOString()
        const fill = (e, weight, reps, order, i) => ({
          ...e,
          performedOrder: order,
          firstSetAt: at(i),
          sets: e.sets.map((x) => ({ ...x, weight, reps, done: true, doneAt: at(i) })),
        })
        const live = cur.entries.filter((e) => !e.skipped)
        // 앞 기록: 이틀 전 가벼운 세션 하나 (전 종목 20kg×5)
        const putPrev = () =>
          store.put({
            ...cur,
            id: 'ui-check-sum-prev',
            startedAt: new Date(now - 2 * 86400000).toISOString(),
            endedAt: new Date(now - 2 * 86400000 + 1800000).toISOString(),
            date: new Date(now - 2 * 86400000).toISOString().slice(0, 10),
            mode: 'normal',
            entries: cur.entries.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, weight: 20, reps: 5, done: true })) })),
          })
        if (kind === 'pr') {
          putPrev()
          // 수행 순서: 계획의 앞 둘을 맞바꿔 "앞당김·미룸" 뱃지가 둘 다 생기게
          const order = (e) => { const k = live.indexOf(e); return k === 0 ? 2 : k === 1 ? 1 : k + 1 }
          cur.entries = cur.entries.map((e) => (e.skipped ? e : fill(e, 150, 30, order(e), live.indexOf(e))))
          out = { kind, detail: `종목 ${live.length}개 전부 150kg×30 (앞 기록 20kg×5)` }
        } else if (kind === 'revert') {
          putPrev()
          cur.entries = cur.entries.map((e) => (e.skipped ? e : { ...fill(e, 60, 30, live.indexOf(e) + 1, live.indexOf(e)), sensoryScore: 0 }))
          out = { kind, detail: `종목 ${live.length}개 앞 기록 20kg×5 → 이번 60kg×30·감각 0점` }
        } else if (kind === 'deload') {
          putPrev()
          cur.mode = 'deload'
          cur.entries = cur.entries.map((e) => {
            if (e.skipped) return e
            const f = fill(e, 150, 30, live.indexOf(e) + 1, live.indexOf(e))
            return { ...f, sets: f.sets.map((x, k) => (k === 0 ? x : { ...x, done: false })) }
          })
          out = { kind, detail: `디로드 세션: 종목 ${live.length}개 1세트씩만 150kg×30 (앞 기록 20kg×5)` }
        } else if (kind === 'cardio') {
          cur.cardio = { type: '걷기', minutes: 30, note: '경사 6 · 속도 5.0' }
          out = { kind, detail: '체크한 세트 0개 + 유산소(걷기 30분)' }
        } else if (kind === 'assist') {
          const key = 'assisted-pullup@' + cur.dayId
          cur.entries = [
            ...cur.entries,
            { recordKey: key, plannedOrder: cur.entries.length, performedOrder: 1, firstSetAt: at(0), compensation: '없음', skipped: false, extra: true, sets: [0, 1, 2].map(() => ({ weight: 30, reps: 8, done: true, doneAt: at(0) })) },
          ]
          out = { kind, detail: '어시스트 종목(assisted-pullup)만 3세트 완료' }
        } else if (kind === 'memo') {
          const e0 = live[0]
          cur.entries = cur.entries.map((e) => (e === e0 || e.recordKey === e0.recordKey ? { ...fill(e, 40, 8, 1, 0), sensoryScore: 0, sensoryNote: '목표 부위보다 팔과 어깨 앞쪽에만 자극이 와서 그립 너비와 팔꿈치 각도를 바꿔 봤지만 끝까지 등 바깥쪽에 느낌이 오지 않았다' } : e))
          cur.sessionNote = '오늘은 컨디션이 좋지 않아 첫 종목부터 감각이 약했고 마지막까지 무게를 올리지 못했다. 어깨 앞쪽이 뻐근해서 두 번째 종목은 가볍게만 했다. 다음 주에는 그립 너비와 의자 높이를 먼저 바꿔 보고, 수면 시간이 짧았던 날은 무게를 욕심내지 않기로 했다.'
          cur.cardio = { type: '걷기', minutes: 20, note: '경사 8 · 속도 5.5 · 마지막 5분은 속도를 6.0으로' }
          out = { kind, detail: '첫 종목 감각 0점+긴 메모 + 긴 세션 메모 + 유산소' }
        } else {
          out = { kind, detail: '체크한 세트 0개' }
        }
        store.put(cur)
      }
    }
  })
}

/** RR9: settings 한 줄을 바꾼다(remove면 지운다). 바꾸기 전 값을 {had, value}로 돌려줘 끝에 되돌린다 */
function inPageSetSetting({ key, value, remove }) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('settings', 'readwrite')
      const store = tx.objectStore('settings')
      const got = store.get(key)
      let before = null
      got.onsuccess = () => {
        before = { had: got.result !== undefined, value: got.result?.value }
        if (remove) store.delete(key)
        else store.put({ key, value })
      }
      tx.oncomplete = () => { idb.close(); resolve(before) }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/** RR9: 글자가 re와 맞는 맨 끝 요소들이 몇 줄로 그려지나 (높이 ÷ 줄 높이) */
function inPageLineCount(re) {
  const rx = new RegExp(re)
  const els = [...document.querySelectorAll('.ax-screen *')].filter((el) => el.children.length === 0 && rx.test(el.textContent.trim()))
  return els.map((el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || el.getBoundingClientRect().height
    return { text: el.textContent.trim(), lines: Math.round(el.getBoundingClientRect().height / lh) }
  })
}

/** RR9: 지금 기록에 있는 세션 id (시드 전 목록 — 끝난 뒤 이 밖의 세션을 지운다) */
function inPageSessionIds() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const r = idb.transaction('sessions').objectStore('sessions').getAllKeys()
      r.onsuccess = () => { idb.close(); resolve(r.result) }
      r.onerror = () => reject(r.error)
    }
  })
}

/** RR9: keep에 없는 세션(시드·시드로 끝낸 세션)을 지운다 */
function inPageDropSessionsExcept(keep) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('sessions', 'readwrite')
      const store = tx.objectStore('sessions')
      const keys = store.getAllKeys()
      keys.onsuccess = () => keys.result.filter((k) => !keep.includes(k)).forEach((k) => store.delete(k))
      tx.oncomplete = () => { idb.close(); resolve(null) }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/** SS0: 식단 하루 기록 `count`일(오늘부터 거슬러)을 `planId`로 심는다. 심기 전 행을 {dates, prev}로 돌려줘 끝에 되돌린다 */
function inPageDietSeed({ planId, count }) {
  return new Promise((resolve, reject) => {
    const pad = (n) => String(n).padStart(2, '0')
    const dates = Array.from({ length: count }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('dietDays', 'readwrite')
      const store = tx.objectStore('dietDays')
      const prev = []
      let left = dates.length
      for (const date of dates) {
        const got = store.get(date)
        got.onsuccess = () => {
          prev.push(got.result ?? null)
          store.put({ date, planId, isTrainingDay: false, slots: {} })
          left -= 1
        }
      }
      tx.oncomplete = () => {
        idb.close()
        if (left === 0) resolve({ dates, prev })
        else reject(new Error('식단 시드 일부 실패'))
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/**
 * SS4: 기록 화면이 다 보이게 시드를 심는다(page.evaluate용 — 바깥 변수를 못 본다). 끝난 세션 하나(base)를 바탕으로
 *   - 같은 날 두 번째 세션(복귀 모드 + 루틴에 없는 종목 한 줄) → 달력 칸 `운동 2회`·복귀 뱃지·고아 카드·`현재 루틴에 없음`
 *   - 이번 달 빈 날의 세션 하나(보조 무게 종목만) → 종목별의 보조 무게 안내
 *   - 이번 달 1~4일 식단: 준수·일부·미달(슬롯 셋)·판정 전(슬롯 하나)
 * 돌려주는 값은 되돌릴 때 쓴다: { sessionIds, dates, prev, baseDate, assistDate, dayId }
 */
function inPageHistorySeed() {
  return new Promise((resolve, reject) => {
    const pad = (n) => String(n).padStart(2, '0')
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction(['sessions', 'dietDays'], 'readwrite')
      const ss = tx.objectStore('sessions')
      const dd = tx.objectStore('dietDays')
      let out = null
      const all = ss.getAll()
      all.onsuccess = () => {
        const base = all.result.find((x) => x.endedAt)
        if (!base) return
        const now = new Date()
        const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
        const used = new Set(all.result.map((x) => x.date))
        let day = 28
        while (day > 1 && (used.has(`${ym}-${pad(day)}`) || `${ym}-${pad(day)}` === base.date)) day -= 1
        const assistDate = `${ym}-${pad(day)}`
        const at = (iso, ms) => new Date(new Date(iso).getTime() + ms).toISOString()
        const done = (n) => Array.from({ length: n }, () => ({ weight: 30, reps: 8, done: true, doneAt: base.endedAt }))
        const two = {
          ...base,
          id: 'ui-check-ss4-two',
          mode: 'return',
          startedAt: at(base.startedAt, 3600000),
          endedAt: at(base.endedAt, 3600000),
          entries: [
            ...base.entries,
            { recordKey: `ss4-ghost@${base.dayId}`, plannedOrder: base.entries.length, performedOrder: base.entries.length + 1, firstSetAt: base.endedAt, compensation: '없음', skipped: false, extra: true, sets: done(2) },
          ],
        }
        const assist = {
          ...base,
          id: 'ui-check-ss4-assist',
          date: assistDate,
          mode: 'normal',
          startedAt: `${assistDate}T09:00:00.000Z`,
          endedAt: `${assistDate}T09:40:00.000Z`,
          entries: [{ recordKey: `assisted-pullup@${base.dayId}`, plannedOrder: 0, performedOrder: 1, firstSetAt: `${assistDate}T09:05:00.000Z`, compensation: '없음', skipped: false, extra: true, sets: done(3) }],
        }
        ss.put(two)
        ss.put(assist)
        const rec = (quality) => ({ checkedItemIds: [], substitution: { text: '시드', quality } })
        const plan = [
          ['01', ['breakfast', 'lunch', 'afternoon'], 'similar'],
          ['02', ['breakfast', 'lunch', 'afternoon'], 'other'],
          ['03', ['breakfast', 'lunch', 'afternoon'], 'cheat'],
          ['04', ['breakfast'], 'similar'],
        ]
        const dates = plan.map(([d]) => `${ym}-${d}`)
        const prev = []
        let left = plan.length
        for (const [d, slots, quality] of plan) {
          const date = `${ym}-${d}`
          const got = dd.get(date)
          got.onsuccess = () => {
            prev.push(got.result ?? null)
            dd.put({ date, planId: 'cut-1500-u', isTrainingDay: false, slots: Object.fromEntries(slots.map((s) => [s, rec(quality)])) })
            left -= 1
          }
        }
        out = { sessionIds: [two.id, assist.id], dates, prev, baseDate: base.date, assistDate, dayId: base.dayId, pending: () => left }
      }
      tx.oncomplete = () => {
        idb.close()
        if (!out) return reject(new Error('시드 실패: 끝난 세션이 없다'))
        const { pending, ...rest } = out
        if (pending() !== 0) return reject(new Error('식단 시드 일부 실패'))
        resolve(rest)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/**
 * SS5: 분석 탭이 다 보이게 끝난 세션 일곱을 심는다(page.evaluate용). 끝난 세션 하나(base)의 Day 종목으로 base 날짜 7·14·…·49일 전에 하나씩:
 *   - A그룹 종목은 세션마다 무게·횟수가 올라 추이 선이 그려진다(종목 줄에 칩 여럿)
 *   - B그룹 종목은 감각 점수 세 가지 줄(약함 0·1 / 좋음 2~3 / 오래된 구간은 입력 없음) → 점 네 계열·네 단계·`기록 없음`·약한 종목 Banner·Badge 경고
 *   - 가장 최근 세션에 대체 수행 하나(`ss5-sub`) → 대체 수행 카드
 * days는 루틴의 Day별 종목 { d1: [{ exerciseId, group }, …], … }. 돌려주는 값은 되돌릴 때 쓴다: { sessionIds, dayId }
 */
function inPageAnalyzeSeed({ days }) {
  return new Promise((resolve, reject) => {
    const pad = (n) => String(n).padStart(2, '0')
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction(['sessions'], 'readwrite')
      const ss = tx.objectStore('sessions')
      let out = null
      const all = ss.getAll()
      all.onsuccess = () => {
        const base = all.result.find((x) => x.endedAt)
        if (!base) return
        const list = days[base.dayId] ?? []
        const aList = list.filter((e) => e.group === 'A')
        const bList = list.filter((e) => e.group === 'B')
        if (aList.length < 2 || bList.length < 3) return
        // 감각 점수 줄 셋(세션 0이 가장 최근, 6이 가장 오래됨). 오래된 4주 구간(세션 3~6)에는 셋째 줄이 없다
        const series = [[1, 1, 0, 0, 0, 1, 0], [3, 3, 2, 2, 2, 3, 2], [2, 1, 3, undefined, undefined, undefined, undefined]]
        const ids = []
        for (let k = 0; k < 7; k++) {
          const d = new Date(`${base.date}T12:00:00`)
          d.setDate(d.getDate() - 7 * (k + 1))
          const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
          const mk = (e, i, extra) => ({
            recordKey: `${e.exerciseId}@${base.dayId}`,
            plannedOrder: i,
            performedOrder: i + 1,
            firstSetAt: `${date}T09:05:00.000Z`,
            compensation: '없음',
            skipped: false,
            sets: Array.from({ length: 3 }, (_, s) => ({ weight: 20 + 5 * i + (6 - k) * 2.5, reps: 8 + ((k + s) % 3), done: true, doneAt: `${date}T09:${10 + s}:00.000Z` })),
            ...extra,
          })
          const entries = [
            ...aList.map((e, i) => mk(e, i, {})),
            ...bList.map((e, i) => mk(e, aList.length + i, { sensoryScore: series[i % 3][k] })),
          ]
          if (k === 0) entries.push({ ...mk({ exerciseId: 'ss5-sub' }, entries.length, {}), substituteFor: `${aList[0].exerciseId}@${base.dayId}` })
          const id = `ui-check-ss5-${k}`
          ids.push(id)
          ss.put({ ...base, id, date, mode: 'normal', startedAt: `${date}T09:00:00.000Z`, endedAt: `${date}T09:50:00.000Z`, entries })
        }
        out = { sessionIds: ids, dayId: base.dayId }
      }
      tx.oncomplete = () => {
        idb.close()
        if (!out) return reject(new Error('시드 실패: 끝난 세션이 없거나 그 Day에 A그룹 둘·B그룹 셋이 없다'))
        resolve(out)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/**
 * SS5 분석 한 줄 부품의 모양(page.evaluate용): ① 감각 점수 머리 줄(이름·뱃지)이 겹치지 않고 세로 가운데가 맞고 줄 안에 든다
 * ② 점 줄은 폭·높이가 같고 겹치지 않는다 ③ 종목 칩은 높이·위가 같고 겹치지 않으며 스크롤 칸 위·아래에 안 잘린다 ④ 지표 항목 셋이 겹치지 않는다
 * ⑤ 차트 틀이 카드 안쪽 오른쪽 끝을 넘지 않는다 ⑥ 대체 수행 줄의 오른쪽 값(n회)이 한 줄이다. 대상이 0개면 실패다(빈 화면을 재고 통과하지 않는다).
 */
function inPageAnalyzeRows() {
  const root = document.querySelector('.ax-screen')
  if (!root) return { ok: false, detail: '.ax-analyze가 없다' }
  const R = (e) => e.getBoundingClientRect()
  const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  const bad = []
  const parts = []
  const pairsOverlap = (rects) => { for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) if (overlap(rects[a], rects[b])) return true; return false }
  // ① 머리 줄
  const heads = [...root.querySelectorAll('.ax-sdots')].map((d) => d.previousElementSibling).filter(Boolean)
  if (heads.length === 0) bad.push('감각 점수 머리 줄 0개')
  let maxCy = 0
  for (const h of heads) {
    const kids = [...h.children].map(R)
    const hr = R(h)
    if (kids.length < 2) { bad.push('머리 줄 부품 2개 미만'); continue }
    if (pairsOverlap(kids)) bad.push('머리 줄 겹침')
    maxCy = Math.max(maxCy, Math.abs((kids[0].top + kids[0].bottom) / 2 - (kids[1].top + kids[1].bottom) / 2))
    if (kids.some((k) => k.left < hr.left - 1 || k.right > hr.right + 1)) bad.push('머리 줄 밖으로 나감')
  }
  if (maxCy > 2) bad.push(`머리 줄 세로 가운데 차이 ${maxCy.toFixed(1)}px`)
  parts.push(`머리 줄 ${heads.length}개(가운데 차이 최대 ${maxCy.toFixed(1)}px)`)
  // ② 점 줄
  const dotRows = [...root.querySelectorAll('.ax-sdots')]
  for (const row of dotRows) {
    const dots = [...row.children].map(R)
    if (dots.length < 2) { bad.push('점 2개 미만'); continue }
    const ws = dots.map((d) => d.width), hs = dots.map((d) => d.height)
    if (Math.max(...ws) - Math.min(...ws) > 1) bad.push('점 폭이 다르다')
    if (Math.max(...hs) - Math.min(...hs) > 1 || Math.min(...hs) <= 0) bad.push('점 높이가 다르다')
    if (pairsOverlap(dots)) bad.push('점 겹침')
  }
  parts.push(`점 줄 ${dotRows.length}개(점 ${dotRows[0]?.children.length ?? 0}개씩)`)
  // ③ 종목 칩
  const chips = [...root.querySelectorAll('.ax-chips button')]
  if (chips.length < 2) bad.push(`종목 칩 ${chips.length}개`)
  else {
    const cr = chips.map(R)
    if (Math.max(...cr.map((r) => r.height)) - Math.min(...cr.map((r) => r.height)) > 1) bad.push('칩 높이가 다르다')
    if (Math.max(...cr.map((r) => r.top)) - Math.min(...cr.map((r) => r.top)) > 1) bad.push('칩 위가 다르다')
    if (pairsOverlap(cr)) bad.push('칩 겹침')
    let sc = chips[0].parentElement
    while (sc && !/auto|scroll/.test(getComputedStyle(sc).overflowX)) sc = sc.parentElement
    if (!sc) bad.push('칩 줄의 스크롤 칸이 없다')
    else {
      const s = R(sc)
      if (cr.some((r) => r.top < s.top - 1 || r.bottom > s.bottom + 1)) bad.push('칩이 스크롤 칸 위·아래에서 잘린다')
      parts.push(`칩 ${chips.length}개(높이 ${Math.round(cr[0].height)}px · 스크롤 칸 안 가로 넘침 ${sc.scrollWidth > sc.clientWidth + 1})`)
    }
  }
  // ④ 지표
  const radios = [...root.querySelectorAll('[role=radiogroup] [role=radio]')]
  if (radios.length !== 3) bad.push(`지표 항목 ${radios.length}개(3이어야)`)
  else if (pairsOverlap(radios.map(R))) bad.push('지표 항목 겹침')
  // ⑤ 차트 틀: 가장 가까운 상자(테두리 있는 조상)의 오른쪽 끝 안
  const box = (e) => { let p = e.parentElement; while (p && p !== root) { const cs = getComputedStyle(p); if (parseFloat(cs.borderTopWidth) > 0 || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return p; p = p.parentElement } return null }
  const charts = [...root.querySelectorAll('.ax-chart')]
  if (charts.length === 0) bad.push('차트 틀 0개')
  for (const c of charts) {
    const b = box(c)
    if (!b) { bad.push('차트의 카드를 못 찾았다'); continue }
    const br = R(b), cr2 = R(c)
    if (cr2.right > br.right - 1 || cr2.left < br.left) bad.push('차트 틀이 카드 밖으로 나감')
  }
  parts.push(`차트 ${charts.length}개`)
  // ⑥ 대체 수행 줄의 값은 한 줄
  const subs = [...root.querySelectorAll('[role=listitem]')].filter((r) => /대신/.test(r.textContent))
  for (const r of subs) {
    const end = r.lastElementChild
    if (!end || R(end).height > 30) bad.push(`대체 수행 값이 두 줄이다 "${(end?.textContent ?? '').trim()}"`)
  }
  parts.push(`대체 수행 줄 ${subs.length}개`)
  return { ok: bad.length === 0, detail: `${bad.join(', ') || '겹침·잘림·세로 가운데 문제 없음'} · ${parts.join(' · ')}` }
}

/**
 * SS6 설정 한 줄 부품의 모양(page.evaluate용): ① 한 줄에 버튼을 모은 줄(부모의 보이는 자식이 전부 버튼): 높이가 같고 안 겹치고 부모 안에 들고 글자가 한 줄이고,
 * 이웃 간격(같은 줄은 가로, 줄이 바뀌면 세로)이 모두 같다(±1) ② `Row`(listitem)의 이름 칸과 오른쪽 칸이 안 겹치고 오른쪽 칸이 줄 안에 든다
 * ③ 글자가 줄임표로 잘린 요소가 없고 버튼·선택 항목이 자기 상자를 넘지 않는다 ④ 선택 묶음(radiogroup)의 항목이 안 겹치고 카드 안쪽 폭 안에 든다
 * ⑤ 글자와 버튼이 한 줄에 같이 있으면(활성 루틴의 `v2.4 [편집]`) 세로 가운데가 맞다(±3). 버튼 줄이 0개면 실패다(빈 화면을 재고 통과하지 않는다).
 */
function inPageSettingsRows() {
  const root = document.querySelector('.ax-screen')
  if (!root) return { ok: false, detail: '.ax-settings가 없다' }
  const vis = (e) => window.__vis(e)
  const R = (e) => e.getBoundingClientRect()
  const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  const bad = []
  const textTops = (el) => {
    const tops = new Set()
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (!t.nodeValue.trim() || !t.parentElement || !vis(t.parentElement)) continue // 안 보이는 사본(토글 버튼의 굵은 글씨 자리 잡기)은 세지 않는다
      const r = document.createRange()
      r.selectNodeContents(t)
      for (const c of r.getClientRects()) if (c.width > 0.5) tops.add(Math.round(c.top))
    }
    return tops.size
  }
  // ① 버튼 줄
  const parents = new Set([...root.querySelectorAll('button')].filter(vis).map((b) => b.parentElement))
  let btnRows = 0
  let mixedRows = 0
  let maxCy = 0
  for (const p of parents) {
    const kids = [...p.children].filter(vis)
    if (kids.length < 2) continue
    if (kids.every((k) => k.matches('button'))) {
      btnRows++
      const rects = kids.map(R)
      const pr = R(p)
      if (Math.max(...rects.map((r) => r.height)) - Math.min(...rects.map((r) => r.height)) > 1) bad.push(`버튼 높이가 다르다 [${kids.map((k) => k.textContent.trim()).join('·')}]`)
      for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) if (overlap(rects[a], rects[b])) bad.push(`버튼 겹침 [${kids[a].textContent.trim()}·${kids[b].textContent.trim()}]`)
      if (rects.some((r) => r.left < pr.left - 1 || r.right > pr.right + 1)) bad.push(`버튼이 줄 밖 [${kids.map((k) => k.textContent.trim()).join('·')}]`)
      for (const k of kids) if (textTops(k) > 1) bad.push(`버튼 글자 ${textTops(k)}줄 "${k.textContent.trim()}"`)
      const sorted = rects.map((r, i) => [r, i]).sort((x, y) => Math.round(x[0].top) - Math.round(y[0].top) || x[0].left - y[0].left).map((x) => x[0])
      const gaps = []
      for (let i = 1; i < sorted.length; i++) gaps.push(Math.abs(sorted[i].top - sorted[i - 1].top) < 2 ? sorted[i].left - sorted[i - 1].right : sorted[i].top - sorted[i - 1].bottom)
      if (gaps.length && Math.max(...gaps) - Math.min(...gaps) > 1) bad.push(`버튼 이웃 간격이 다르다 ${gaps.map((g) => g.toFixed(1)).join('/')}`)
    } else if (kids.some((k) => k.matches('button'))) {
      // ⑤ 글자 + 버튼이 한 줄
      mixedRows++
      for (const b of kids.filter((k) => k.matches('button'))) {
        const br = R(b)
        for (const o of kids.filter((k) => !k.matches('button') && k.textContent.trim())) {
          const orr = R(o)
          if (Math.abs((br.top + br.bottom) / 2 - (orr.top + orr.bottom) / 2) > 3 && Math.abs(br.top - orr.top) < br.height) bad.push(`글자·버튼 세로 가운데 차이 ${Math.abs((br.top + br.bottom) / 2 - (orr.top + orr.bottom) / 2).toFixed(1)}px "${o.textContent.trim().slice(0, 8)}"`)
          maxCy = Math.max(maxCy, Math.abs((br.top + br.bottom) / 2 - (orr.top + orr.bottom) / 2))
        }
      }
    }
  }
  // ② Row
  let rowN = 0
  for (const row of [...root.querySelectorAll('[role="listitem"]')].filter(vis)) {
    const kids = [...row.children].filter(vis)
    if (kids.length < 2) continue
    rowN++
    const rr = R(row)
    const a = R(kids[0]), b = R(kids[kids.length - 1])
    if (overlap(a, b)) bad.push(`줄의 이름 칸과 오른쪽 칸이 겹친다 "${row.textContent.trim().slice(0, 12)}"`)
    if (b.right > rr.right + 1 || b.left < rr.left - 1) bad.push(`오른쪽 칸이 줄 밖 "${row.textContent.trim().slice(0, 12)}"`)
  }
  // ③ 잘림
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el)) continue
    const cs = getComputedStyle(el)
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) bad.push(`글자가 줄임표로 잘렸다 "${el.textContent.trim().slice(0, 12)}"`)
    if (el.matches('button:not([role="radio"])') && el.scrollWidth > el.clientWidth + 1) bad.push(`상자를 넘는 글자 "${el.textContent.trim().slice(0, 12)}"`)
  }
  // ④ 선택 묶음
  const groups = [...root.querySelectorAll('[role="radiogroup"]')].filter(vis)
  for (const g of groups) {
    const items = [...g.querySelectorAll('[role="radio"]')].filter(vis)
    const rects = items.map(R)
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) if (overlap(rects[a], rects[b])) bad.push(`선택 항목 겹침 [${g.getAttribute('aria-label')}]`)
    let box = g.parentElement
    while (box && box !== root && !(parseFloat(getComputedStyle(box).borderTopWidth) > 0)) box = box.parentElement
    if (box && box !== root) {
      const br = R(box)
      if (rects.some((r) => r.right > br.right - 1 || r.left < br.left + 1)) bad.push(`선택 항목이 카드 밖 [${g.getAttribute('aria-label')}]`)
    }
    for (const it of items) if (textTops(it) > 1) bad.push(`선택 항목 글자 ${textTops(it)}줄 "${it.textContent.trim()}"`)
  }
  if (btnRows === 0) bad.push('버튼 줄 0개 — 검사가 아무것도 안 쟀다')
  return { ok: bad.length === 0, detail: `${[...new Set(bad)].join(', ') || '겹침·잘림·세로 가운데·간격 문제 없음'} · 버튼 줄 ${btnRows}개 · 글자+버튼 줄 ${mixedRows}개(가운데 차이 최대 ${maxCy.toFixed(1)}px) · Row ${rowN}개 · 선택 묶음 ${groups.length}개` }
}

/** SS6: 선택 묶음마다 — 묶음 바탕이 보이고(알파 > 0 또는 테두리) 고른 항목과 안 고른 항목의 바탕이 다르다. 안 눌린 선택이 맨 글자로 떠 있지 않게 */
function inPageSettingsToggles() {
  const root = document.querySelector('.ax-screen')
  if (!root) return { ok: false, detail: '.ax-settings가 없다', n: 0 }
  const alpha = (c) => { const m = /rgba?\([^)]*?(?:,\s*([\d.]+))?\)$/.exec(c); return m && m[1] !== undefined ? Number(m[1]) : 1 }
  const out = []
  const bad = []
  for (const g of root.querySelectorAll('[role="radiogroup"]')) {
    if (!window.__vis(g)) continue
    const items = [...g.querySelectorAll('[role="radio"]')]
    const sel = items.filter((i) => i.getAttribute('aria-checked') === 'true')
    const off = items.filter((i) => i.getAttribute('aria-checked') !== 'true')
    // 바탕은 묶음 자신이나 가까운 조상(트랙)에서 찾는다 — 묶음 안 항목 면까지 합쳐 하나라도 면·테두리가 있으면 된다
    const faces = [g, ...items, ...g.querySelectorAll('*')].map((e) => getComputedStyle(e)).filter((cs) => alpha(cs.backgroundColor) > 0 || parseFloat(cs.borderTopWidth) > 0)
    const name = g.getAttribute('aria-label') ?? '?'
    if (items.length < 2) bad.push(`${name}: 항목 ${items.length}개`)
    if (sel.length !== 1) bad.push(`${name}: 고른 항목 ${sel.length}개`)
    if (faces.length === 0) bad.push(`${name}: 면·테두리가 없다(맨 글자)`)
    const selBg = sel[0] ? getComputedStyle(sel[0]).backgroundColor : null
    const selFaces = sel[0] ? [sel[0], ...sel[0].querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundColor) : []
    const offFaces = off.flatMap((o) => [o, ...o.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundColor))
    const differs = selFaces.some((c) => alpha(c) > 0 && !offFaces.includes(c)) || (selBg !== null && !offFaces.includes(selBg))
    if (!differs) bad.push(`${name}: 고른 항목의 바탕이 안 고른 항목과 같다`)
    out.push(`${name} ${items.length}개`)
  }
  // 켜고 끄는 글자 버튼(내보내기 기간 — aria-pressed): 안 눌린 것도 바탕·테두리가 있고 눌린 것과 바탕이 다르다
  const tg = [...root.querySelectorAll('button[aria-pressed]')].filter((e) => window.__vis(e))
  const tOn = tg.filter((e) => e.getAttribute('aria-pressed') === 'true')
  const tOff = tg.filter((e) => e.getAttribute('aria-pressed') !== 'true')
  const tBare = tOff.filter((e) => { const cs = getComputedStyle(e); return !(alpha(cs.backgroundColor) > 0 && parseFloat(cs.borderTopWidth) >= 1) })
  const tSame = tOff.filter((e) => tOn.some((o) => getComputedStyle(o).backgroundColor === getComputedStyle(e).backgroundColor))
  if (tg.length < 2 || tOn.length !== 1) bad.push(`눌림 토글 ${tg.length}개·눌림 ${tOn.length}개`)
  if (tBare.length) bad.push(`맨 글자 토글 ${tBare.length}개`)
  if (tSame.length) bad.push(`눌린 토글과 바탕이 같은 것 ${tSame.length}개`)
  out.push(`눌림 토글 ${tg.length}개`)
  return { ok: out.length > 0 && bad.length === 0, detail: `${bad.join(', ') || '고른 항목이 안 고른 항목과 다르고 묶음에 면이 있다'} · ${out.join(' · ')}`, n: out.length - 1 }
}

/** SS4: inPageHistorySeed가 심은 것을 원래대로(세션은 지우고, 식단은 없던 날은 지우고 있던 날은 되쓴다) */
function inPageHistoryRestore({ sessionIds, dates, prev }) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction(['sessions', 'dietDays'], 'readwrite')
      for (const id of sessionIds) tx.objectStore('sessions').delete(id)
      const dd = tx.objectStore('dietDays')
      for (const date of dates) {
        const row = prev.find((r) => r && r.date === date)
        if (row) dd.put(row)
        else dd.delete(date)
      }
      tx.oncomplete = () => {
        idb.close()
        resolve(null)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/**
 * SS4 달력 칸 한 줄 일곱의 모양(page.evaluate용): 칸이 카드 안쪽 폭 안에 드는지, 칸끼리·칸 안 부품끼리 겹치지 않는지, 날짜 글자가 잘리지 않는지,
 * 칸 안 내용이 세로·가로 가운데인지, 줄 간격이 같은지, 요일 머리가 칸 열과 같은 가운데인지, 누르는 영역이 44 이상인지를 잰다. 칸이 0개면 ok가 아니다.
 */
function inPageCalendarFit() {
  const cells = [...document.querySelectorAll('button.ax-cal-cell')]
  if (cells.length === 0) return { ok: false, detail: '칸 0개' }
  const grid = cells[0].parentElement
  const inner = grid.parentElement.getBoundingClientRect()
  const r = cells.map((c) => c.getBoundingClientRect())
  const bad = []
  const nm = (c) => (c.getAttribute('aria-label') || c.textContent).trim().slice(0, 12)
  r.forEach((q, i) => {
    if (q.left < inner.left - 0.5 || q.right > inner.right + 0.5) bad.push(`안쪽 폭 밖 ${nm(cells[i])}`)
    if (q.width < 44 || q.height < 44) bad.push(`누르는 영역 ${nm(cells[i])} ${Math.round(q.width)}x${Math.round(q.height)}`)
  })
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const ox = Math.min(r[i].right, r[j].right) - Math.max(r[i].left, r[j].left)
      const oy = Math.min(r[i].bottom, r[j].bottom) - Math.max(r[i].top, r[j].top)
      if (ox > 1 && oy > 1) bad.push(`칸 겹침 ${nm(cells[i])}×${nm(cells[j])}`)
    }
  let maxOff = 0
  let maxOffX = 0
  cells.forEach((c, i) => {
    const q = r[i]
    const kids = [...c.querySelectorAll('.ax-cal-num, .ax-cal-flame, .ax-cal-dot')].map((k) => k.getBoundingClientRect()).filter((k) => k.width > 0 && k.height > 0)
    const numOnly = [c.querySelector('.ax-cal-num').getBoundingClientRect()]
    const num = c.querySelector('.ax-cal-num')
    if (num && num.scrollWidth > num.clientWidth + 1) bad.push(`날짜 잘림 ${nm(c)}`)
    if (kids.length) {
      const top = Math.min(...numOnly.map((k) => k.top))
      const bottom = Math.max(...numOnly.map((k) => k.bottom))
      maxOff = Math.max(maxOff, Math.abs(top - q.top - (q.bottom - bottom)))
      const nr = num.getBoundingClientRect()
      maxOffX = Math.max(maxOffX, Math.abs(nr.left + nr.width / 2 - (q.left + q.width / 2)))
      for (let a = 0; a < kids.length; a++) for (let b = a + 1; b < kids.length; b++) {
        const ox = Math.min(kids[a].right, kids[b].right) - Math.max(kids[a].left, kids[b].left)
        const oy = Math.min(kids[a].bottom, kids[b].bottom) - Math.max(kids[a].top, kids[b].top)
        if (ox > 1 && oy > 1) bad.push(`칸 안 겹침 ${nm(c)}`)
      }
      for (const k of kids) if (k.left < q.left - 0.5 || k.right > q.right + 0.5 || k.top < q.top - 0.5 || k.bottom > q.bottom + 0.5) bad.push(`칸 안 부품이 칸 밖 ${nm(c)}`)
    }
  })
  if (maxOff > 2) bad.push(`세로 가운데 어긋남 ${maxOff.toFixed(1)}px`)
  if (maxOffX > 1) bad.push(`가로 가운데 어긋남 ${maxOffX.toFixed(1)}px`)
  const tops = [...new Set(r.map((q) => Math.round(q.top)))].sort((a, b) => a - b)
  const rowGaps = [...new Set(tops.slice(1).map((t, i) => t - tops[i]))]
  if (rowGaps.length > 1) bad.push(`줄 간격이 다르다 ${rowGaps.join('/')}`)
  const heads = [...grid.parentElement.children].filter((e) => e.classList.contains('ax-cal-grid') && e !== grid)[0]
  const wd = heads ? [...heads.children].map((e) => e.getBoundingClientRect()) : []
  const firstRow = r.slice(0, 7)
  if (wd.length !== 7) bad.push(`요일 머리 ${wd.length}개`)
  else wd.forEach((q, i) => { if (Math.abs(q.left + q.width / 2 - (firstRow[i].left + firstRow[i].width / 2)) > 1) bad.push(`요일 열 어긋남 ${i}`) })
  return { ok: bad.length === 0, detail: bad.join(' · ') || `칸 ${cells.length}개 · 안쪽 폭 안 · 겹침 0 · 누르는 영역 44 이상 · 세로 어긋남 ${maxOff.toFixed(1)}px · 가로 어긋남 ${maxOffX.toFixed(1)}px · 줄 간격 ${rowGaps.join('/')}px · 요일 열 일치` }
}

/**
 * SS4 달력의 네 신호가 서로 구분되는가: 오늘(테두리 --color-accent)·고른 날(면 --color-accent-muted)·일반 칸(둘 다 없음)의 계산된 모양이 다르고,
 * 식단 점 네 가지(준수·일부·미달·판정 전)의 계산된 색이 토큰과 같고 서로 다르며 강조색이 아니다. 오늘 칸과 고른 칸이 같으면(오늘을 골랐다) 실패다.
 */
function inPageCalendarSignals() {
  const resolve = (prop, token) => {
    const p = document.createElement('span')
    p.style[prop] = `var(${token})`
    document.body.appendChild(p)
    const v = getComputedStyle(p)[prop]
    p.remove()
    return v
  }
  const cells = [...document.querySelectorAll('button.ax-cal-cell')]
  const today = cells.find((c) => c.hasAttribute('data-today'))
  const selected = cells.find((c) => c.hasAttribute('data-selected'))
  const plain = cells.find((c) => !c.hasAttribute('data-today') && !c.hasAttribute('data-selected') && !c.hasAttribute('data-out') && !c.querySelector('.ax-cal-flame'))
  const face = (c) => (c ? { border: getComputedStyle(c).borderTopColor, bg: getComputedStyle(c).backgroundColor } : null)
  const t = face(today)
  const s = face(selected)
  const p = face(plain)
  const accent = resolve('color', '--color-accent')
  const muted = resolve('backgroundColor', '--color-accent-muted')
  const tokens = { good: resolve('backgroundColor', '--color-success'), mid: resolve('backgroundColor', '--color-warning'), poor: resolve('backgroundColor', '--color-error'), partial: resolve('backgroundColor', '--color-text-secondary') }
  const dots = {}
  for (const k of Object.keys(tokens)) {
    const d = document.querySelector(`.ax-cal-dot[data-diet="${k}"]`)
    dots[k] = d ? getComputedStyle(d).backgroundColor : null
  }
  const bad = []
  if (!today) bad.push('오늘 칸 없음')
  if (!selected) bad.push('고른 칸 없음')
  if (today && selected && today === selected) bad.push('오늘과 고른 칸이 같아 구분을 못 잼')
  if (t && t.border !== accent) bad.push(`오늘 테두리 ${t.border} ≠ 강조 ${accent}`)
  if (s && s.bg !== muted) bad.push(`고른 날 면 ${s.bg} ≠ ${muted}`)
  if (t && s && t.border === s.border) bad.push('오늘·고른 날 테두리가 같다')
  if (t && s && t.bg === s.bg) bad.push('오늘·고른 날 면이 같다')
  if (p && (p.border === accent || p.bg === muted)) bad.push('일반 칸이 오늘·고른 날과 같다')
  for (const k of Object.keys(tokens)) {
    if (dots[k] === null) bad.push(`식단 점 ${k} 없음`)
    else if (dots[k] !== tokens[k]) bad.push(`점 ${k} ${dots[k]} ≠ ${tokens[k]}`)
    if (dots[k] === resolve('backgroundColor', '--color-accent')) bad.push(`점 ${k}가 강조색`)
  }
  if (new Set(Object.values(dots)).size !== 4) bad.push('식단 점 색이 서로 같다')
  const flames = cells.filter((c) => c.querySelector('.ax-cal-flame')).length
  if (flames < 1) bad.push('🔥 없음')
  return { ok: bad.length === 0, detail: bad.join(' · ') || `오늘 테두리 ${t.border} · 고른 날 면 ${s.bg} · 일반 칸 테두리 ${p?.border}/면 ${p?.bg} · 점 ${Object.entries(dots).map(([k, v]) => `${k} ${v}`).join(' ')} · 🔥 칸 ${flames}개` }
}

/** SS2 검증: 식단 품목 토글(눌리지 않은 것) 하나의 계산된 모양 — 식단 탭과 기록 화면 안 편집기가 같은 부품이면 같다 */
/**
 * SS4 화면 검증(page.evaluate용): ① 글꼴 ② 카드 안쪽 위·아래·왼·오른 여백(내용 상자 기준) ③ 44 미만 누르는 영역의 중앙·네 귀퉁이 elementFromPoint
 * ④ 맨 글자 버튼 ⑤ 경고·오류 글자 계산된 색 ⑥ 맨 아래 버튼과 탭 바 ⑦ 카드 사이·묶음 사이 간격 ⑧ 카드 밖으로 나간 글자
 */
function inPageSs4Verify() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
  const root = document.querySelector('.ax-screen') ?? document.body
  const nm = (e) => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || e.tagName).trim().split('\n')[0].slice(0, 16)
  const res = {}
  const fams = new Map()
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
    const f = getComputedStyle(n.parentElement).fontFamily.split(',')[0].trim()
    fams.set(f, (fams.get(f) ?? 0) + 1)
  }
  res.fonts = [...fams.entries()].map(([f, c]) => `${f}×${c}`)
  res.bodyFont = getComputedStyle(document.body).fontFamily.split(',')[0].trim()
  const cards = [...root.querySelectorAll('[class*="card"], [class*="Card"]')].filter((c) => vis(c) && !c.closest('button') && c.getBoundingClientRect().height > 40 && !c.parentElement.closest('[class*="card"], [class*="Card"]'))
  res.cards = cards.map((c) => {
    const cr = c.getBoundingClientRect()
    let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity
    const boxes = []
    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
      const rg = document.createRange(); rg.selectNodeContents(n)
      const r = rg.getBoundingClientRect(); if (r.width < 1) continue
      boxes.push(r)
    }
    for (const e of c.querySelectorAll('button, input, textarea')) { if (vis(e)) boxes.push(e.getBoundingClientRect()) }
    for (const r of boxes) { top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); left = Math.min(left, r.left); right = Math.max(right, r.right) }
    const bw = c.clientLeft
    const q = (v) => Math.round(v * 10) / 10
    return { name: (c.innerText || '').trim().split('\n')[0].slice(0, 14), top: q(top - cr.top - bw), bottom: q(cr.bottom - bottom - bw), left: q(left - cr.left - bw), right: q(cr.right - right - bw), h: Math.round(cr.height) }
  })
  const targets = [...root.querySelectorAll('button, input, textarea, select, [role=button], [role=checkbox], [role=radio], a[href]')].filter(vis)
  res.small = []
  res.covered = []
  for (const e of targets) {
    const r = e.getBoundingClientRect()
    if (!(r.width < 44 || r.height < 44)) continue
    res.small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    if (r.bottom < 0 || r.top > innerHeight) continue
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.left + 3, r.bottom - 3], [r.right - 3, r.bottom - 3]]
    const bad = pts.filter(([x, y]) => { if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false; const hit = document.elementFromPoint(x, y); return !(hit === e || e.contains(hit) || (hit && hit.contains(e))) })
    if (bad.length) res.covered.push(`${nm(e)} ${bad.length}/5점 가려짐`)
  }
  res.bare = targets.filter((e) => {
    if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.getAttribute('role') === 'radio' || e.getAttribute('role') === 'checkbox') return false
    const cs = getComputedStyle(e)
    const noBg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent'
    return noBg && parseFloat(cs.borderTopWidth) === 0 && parseFloat(cs.borderLeftWidth) === 0 && e.getAttribute('aria-pressed') !== 'true' && e.innerText.trim().length > 0
  }).map((e) => `${nm(e)}${e.closest('.ax-cal-grid') ? '(달력 칸)' : ''}`)
  res.warn = [...root.querySelectorAll('.ax-text-warning, .ax-text-error, [role=alert]')].filter(vis).map((e) => `${(e.innerText || '').trim().slice(0, 10)}→${getComputedStyle(e).color}`)
  window.scrollTo(0, document.documentElement.scrollHeight)
  const bar = [...document.querySelectorAll('nav, [role=tablist], .ax-bar')].filter(vis).pop()
  const barTop = bar ? bar.getBoundingClientRect().top : innerHeight
  const lastBtn = targets.filter((e) => vis(e)).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
  const lr = lastBtn?.getBoundingClientRect()
  res.bottom = lr ? { name: nm(lastBtn), bottom: Math.round(lr.bottom), barTop: Math.round(barTop), ok: lr.bottom <= barTop } : null
  window.scrollTo(0, 0)
  const gapsOf = (parent) => { const k = [...parent.children].filter(vis); const g = []; for (let i = 1; i < k.length; i++) g.push(Math.round((k[i].getBoundingClientRect().top - k[i - 1].getBoundingClientRect().bottom) * 10) / 10); return g }
  res.cardGaps = [...new Set([...root.querySelectorAll('.ax-group')].flatMap(gapsOf))]
  res.sectionGaps = [...new Set([...root.querySelectorAll('.ax-groups')].flatMap(gapsOf))]
  res.escaped = []
  for (const c of cards) {
    const cr = c.getBoundingClientRect()
    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
      const rg = document.createRange(); rg.selectNodeContents(n)
      const r = rg.getBoundingClientRect(); if (r.width < 1) continue
      if (r.left < cr.left - 0.5 || r.right > cr.right + 0.5 || r.top < cr.top - 0.5 || r.bottom > cr.bottom + 0.5) { res.escaped.push(n.nodeValue.trim().slice(0, 10)); break }
    }
  }
  return res
}

function inPageItemFace() {
  const b = [...document.querySelectorAll('button[aria-pressed]')].find((x) => !x.querySelector('.ax-slot-mark') && x.getAttribute('aria-pressed') === 'false' && /\d/.test(x.textContent))
  if (!b) return null
  const s = getComputedStyle(b)
  const r = b.getBoundingClientRect()
  return { fontSize: s.fontSize, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, fontFamily: s.fontFamily.split(',')[0], lineHeight: s.lineHeight, padL: s.paddingLeft, h: Math.round(r.height), radius: s.borderTopLeftRadius, bg: s.backgroundColor, border: s.borderTopColor, color: s.color, text: b.textContent.trim().slice(0, 14) }
}

/** SS0: inPageDietSeed가 심은 날을 원래대로(없던 날은 지우고, 있던 날은 되쓴다) */
function inPageDietRestore({ dates, prev }) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('dietDays', 'readwrite')
      const store = tx.objectStore('dietDays')
      for (const date of dates) {
        const row = prev.find((r) => r && r.date === date)
        if (row) store.put(row)
        else store.delete(date)
      }
      tx.oncomplete = () => {
        idb.close()
        resolve(null)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

/**
 * SS0: 끝난 세션의 모든 종목에 감각 메모를 심는다(종목별 기록의 "메모 이력"이 보이게).
 * originals가 null이면 심고 원래 세션들을 돌려주고, 배열이면 그것으로 되돌린다.
 */
function inPageNoteSeed(originals) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('workout-tracker')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const idb = open.result
      const tx = idb.transaction('sessions', 'readwrite')
      const store = tx.objectStore('sessions')
      let out = null
      if (originals) originals.forEach((x) => store.put(x))
      else {
        const all = store.getAll()
        all.onsuccess = () => {
          const done = all.result.filter((x) => x.endedAt)
          out = done
          for (const x of done) {
            store.put({
              ...x,
              entries: x.entries.map((e) => (e.skipped ? e : { ...e, sensoryNote: '메모 확인용 — 팔꿈치 각도를 바꿔 봤더니 등 바깥쪽 자극이 훨씬 또렷했다' })),
            })
          }
        }
      }
      tx.oncomplete = () => {
        idb.close()
        resolve(out)
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

async function runScenes(browser, port, scheme) {
  const light = scheme === 'light'
  const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: scheme, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.addInitScript(installScript())
  // 설정 gist 장면이 가짜 토큰을 심어도 GitHub을 부르지 않는다: 막고 센다(0이어야 한다)
  await ctx.route(/api\.github\.com/, (route) => {
    ghCalls.push(route.request().url())
    return route.abort()
  })
  await page.goto(`http://localhost:${port}${BASE}`)

  let histItemFace = null // SS2 검증: 기록 화면 안 편집기의 품목 토글 모양(식단 탭과 같아야 한다)
  const snap =async (scene, pg = page) => {
    await settle(pg, 500)
    const name = light ? `${scene}-light` : scene
    snapped.add(name)
    if (ONLY && !ONLY.has(name)) return
    await pg.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    shots.push({ name, buf: await pg.screenshot() })
    if (!light) rects[scene] = await pg.evaluate(inPageRects)
    if (!light && START_SPOT_SCENES.has(scene)) startSpots[scene.endsWith('-375') ? 375 : 390][scene] = await pg.evaluate(inPageStartSpot)
    if (PRESS_SHOT && !light && PRESS_SHOT[0] === scene) await pressShot(pg, scene, PRESS_SHOT[1])
    if (CHECK) {
      if (!light) await runChecks(pg, scene)
      else await runLightOnly(pg, scene) // 라이트: 띠·시트 버튼과 테마 토큰만
    }
  }
  /**
   * 필수 장면 (SS0). 준비(fn)가 던지거나, 기대한 장면을 못 찍으면 그 장면의 모든 칸을 `실패`로 표에 넣고 종료 코드 1.
   * optional처럼 조용히 지나가지 않는다 — 화면을 옮겨 선택자가 안 맞으면 바로 드러나야 한다. names는 -light 없는 장면 이름들
   */
  const requiredScene = async (names, fn) => {
    const list = (Array.isArray(names) ? names : [names]).map((n) => (light ? `${n}-light` : n))
    let err = null
    try {
      await fn()
    } catch (e) {
      err = `예외: ${String(e.message).split('\n').slice(0, 3).join(' ')}`
    }
    const missed = list.filter((n) => !snapped.has(n))
    if (!err && missed.length === 0) return
    const failed = missed.length ? missed : [list[list.length - 1]]
    for (const n of failed) {
      const detail = err ?? '장면에 닿지 못했다(찍지 않았다)'
      sceneFailures.push([n, detail])
      console.log(`장면 실패: ${n} — ${detail}`)
      if (CHECK) rows.push({ scene: n, cells: Object.fromEntries(COLUMNS.map((c) => [c, { status: '실패', detail }])) })
    }
  }
  /** 390·375 폭에서 root 안 한글이 글자 중간에서 꺾이는지 잰다(다크만). SS0 before에서는 기록만 한다 — 판정은 그 화면을 옮기는 작업이 흐름으로 건다 */
  const wrapProbe = async (label, root = '#root', pg = page) => {
    if (light) return
    const parts = []
    try {
      for (const w of [390, 375]) {
        await pg.setViewportSize({ width: w, height: w === 375 ? 812 : 844 })
        await settle(pg, 350)
        const r = await pg.evaluate(inPageMidWordBreaks, root)
        parts.push(`${w}: 글자 ${r.chars}개·꺾임 ${r.count}건${r.samples.length ? ' (' + r.samples.join(' ') + ')' : ''}`)
      }
    } finally {
      await pg.setViewportSize({ width: 390, height: 844 })
      await settle(pg, 350)
    }
    wrapNotes.push(`${label} — ${parts.join(' · ')}`)
  }
  /** 폭을 375로 줄여 fn을 돌리고 반드시 390으로 되돌린다(장면 준비가 던져도 뒤 장면이 375에 갇히지 않게) */
  const at375 = async (fn, pg = page) => {
    await pg.setViewportSize({ width: 375, height: 812 })
    await settle(pg, 500)
    try {
      await fn()
    } finally {
      await pg.setViewportSize({ width: 390, height: 844 })
      await settle(pg, 400)
    }
  }
  /**
   * 390·375 폭에서 root 안 한글이 글자 중간에서 안 꺾이고(0점·60 → 20kg 같은 숫자+단위 포함) 요소가 카드·시트 안쪽 폭 안에 드는지 흐름 하나로 판정한다.
   * 글자가 0개면 실패다(빈 화면을 재고 통과하지 않는다). 예외는 guardedFlow가 흐름 실패로 센다. 마지막에 390으로 되돌린다.
   */
  const screenWrapFlow = (name, root, pg = page) =>
    guardedFlow([name], async () => {
      try {
        const r390 = await pg.evaluate(inPageMidWordBreaks, root)
        const i390 = await pg.evaluate(inPageInnerOverflow, root)
        await pg.setViewportSize({ width: 375, height: 812 })
        await settle(pg, 400)
        const r375 = await pg.evaluate(inPageMidWordBreaks, root)
        const i375 = await pg.evaluate(inPageInnerOverflow, root)
        flows.push([name, { ok: r390.chars > 0 && r375.chars > 0 && r390.count === 0 && r375.count === 0 && i390.ok && i375.ok, detail: `390: 글자 ${r390.chars}개·꺾임 ${r390.count}건 ${r390.samples.join(',')} · ${i390.detail} / 375: 글자 ${r375.chars}개·꺾임 ${r375.count}건 ${r375.samples.join(',')} · ${i375.detail}` }])
      } finally {
        await pg.setViewportSize({ width: 390, height: 844 })
        await settle(pg, 400)
      }
    })
  /** SS3 화면 검증: 시트 안을 끝까지 스크롤한 뒤 — 맨 아래 버튼 위치, 부품 겹침, 시트 밖으로 나간 부품, 44 미만 누르는 영역(elementFromPoint), 맨 글자 버튼, 경고 글자색을 390·375에서 잰다 */
  const ss3Probe = (name) =>
    guardedFlow([name], async () => {
      const out = []
      try {
        for (const w of [390, 375]) {
          if (w === 375) {
            await page.setViewportSize({ width: 375, height: 812 })
            await settle(page, 400)
          }
          out.push([w, await page.evaluate(() => {
            const dlg = document.querySelector('dialog[open]')
            const dr = dlg.getBoundingClientRect()
            const scrollers = [dlg, ...dlg.querySelectorAll('*')].filter((e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY))
            for (const s of scrollers) s.scrollTop = s.scrollHeight
            const vh = window.innerHeight
            const items = [...dlg.querySelectorAll('button, input, textarea, [role=radio], [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false
              // 스크롤 칸 안에서 칸 밖으로 밀려나 잘린 부품은 안 보이니 뺀다
              return !scrollers.some((sc) => { if (sc === dlg || !sc.contains(e)) return false; const q = sc.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return cy < q.top || cy > q.bottom || cx < q.left || cx > q.right })
            })
            const nm = (e) => (e.getAttribute('aria-label') || e.innerText || e.getAttribute('placeholder') || e.tagName).trim().split('\n')[0].slice(0, 14)
            const rects = items.map((e) => ({ e, r: e.getBoundingClientRect() }))
            const overlaps = []
            for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i], b = rects[j]
              if (a.e.contains(b.e) || b.e.contains(a.e)) continue
              const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
              const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
              if (ox > 1 && oy > 1) overlaps.push(nm(a.e) + '×' + nm(b.e))
            }
            const outside = rects.filter(({ r }) => r.left < dr.left - 0.5 || r.right > dr.right + 0.5).map(({ e }) => nm(e))
            const small = rects.filter(({ r }) => r.width < 44 || r.height < 44).map(({ e, r }) => {
              const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
              const ok = hit === e || e.contains(hit)
              return `${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}${ok ? '' : ' 가려짐'}`
            })
            const covered = small.filter((s) => s.endsWith('가려짐'))
            const bare = rects.filter(({ e }) => {
              if (e.tagName === 'INPUT' || e.getAttribute('role') === 'radio' || e.closest('li')) return false
              const cs = getComputedStyle(e)
              const noBg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent'
              return noBg && parseFloat(cs.borderTopWidth) === 0 && parseFloat(cs.borderLeftWidth) === 0 && e.getAttribute('aria-pressed') !== 'true'
            }).map(({ e }) => nm(e))
            const close = [...dlg.querySelectorAll('button')].filter((b) => b.innerText.trim() === '닫기').pop()
            const cb = close?.getBoundingClientRect()
            const lis = [...dlg.querySelectorAll('li')].map((l) => l.getBoundingClientRect())
            const gaps = lis.slice(1).map((r, i) => Math.round(r.top - lis[i].bottom))
            const warn = [...dlg.querySelectorAll('.ax-text-warning, .ax-text-error')].map((e) => getComputedStyle(e).color)
            const pad = getComputedStyle(dlg.firstElementChild ?? dlg).paddingBottom
            return { vh, dlgBottom: Math.round(dr.bottom), closeTop: cb && Math.round(cb.top), closeBottom: cb && Math.round(cb.bottom), scrolled: scrollers.length, overlaps, outside, small, covered, bare, gaps: [...new Set(gaps)], warn, pad }
          })])
        }
      } finally {
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 400)
      }
      const bad = []
      for (const [w, r] of out) {
        if (r.closeBottom === null || r.closeBottom === undefined) bad.push(`${w}: 닫기 버튼 없음`)
        else if (r.closeBottom > r.vh + 0.5 || r.closeTop < 0) bad.push(`${w}: 닫기 화면 밖`)
        if (r.overlaps.length) bad.push(`${w}: 겹침 ${r.overlaps.join(',')}`)
        if (r.outside.length) bad.push(`${w}: 시트 밖 ${r.outside.join(',')}`)
        if (r.covered.length) bad.push(`${w}: 가려진 누르는 영역 ${r.covered.join(',')}`)
      }
      flows.push([name, { ok: bad.length === 0, detail: bad.join(' / ') || out.map(([w, r]) => `${w}: 닫기 y ${r.closeTop}~${r.closeBottom}/${r.vh}(아래 여백 ${r.vh - r.closeBottom}) · 스크롤칸 ${r.scrolled} · 겹침 0 · 시트 밖 0 · 44 미만 ${r.small.length}개 [${r.small.join(', ')}] · 맨 글자 [${r.bare.join(', ')}] · 줄 간격 [${r.gaps.join('/')}] · 경고색 [${[...new Set(r.warn)].join(' ')}] · 안쪽 아래 패딩 ${r.pad}`).join(' || ') }])
    })
  /** 새 브라우저 문맥 하나(다른 장면 데이터에 안 닿는 장면용: 온보딩 홈 화면 앱·빈 분석). 끝나면 닫는다 */
  const withFreshPage = async (init, fn, query = '') => {
    const c = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: scheme, serviceWorkers: 'block' })
    try {
      const p = await c.newPage()
      await p.addInitScript(installScript())
      if (init) await p.addInitScript(init)
      await p.goto(`http://localhost:${port}${BASE}${query}`)
      await fn(p)
    } finally {
      await c.close()
    }
  }
  const optional = async (label, fn) => {
    try {
      await fn()
    } catch (e) {
      console.log(`장면 건너뜀: ${label} — ${String(e.message).split('\n')[0]}`)
    }
  }
  // 흐름(검사)은 optional에 넣지 않는다: 예외가 나면 건너뜀이 아니라 흐름 실패로 센다 (RR5 반려)
  // 이름이 이미 있다는 이유로 건너뛰지 않는다: 고정 이름으로 다크·라이트 두 번 도는 흐름(settings-gist 등)은 라이트의 예외도 실패로 세야 한다.
  // 이 실행이 던지기 전에 스스로 판정을 남긴 이름만 중복으로 본다(v1.21 SS8 — SS7 리뷰가 넘긴 것).
  const guardedFlow = async (names, fn) => {
    const from = flows.length
    try {
      await fn()
    } catch (e) {
      const detail = `예외: ${String(e.message).split('\n')[0]}`
      for (const n of names) if (!flows.slice(from).some((f) => f[0] === n)) flows.push([n, { ok: false, detail }])
    }
  }
  // 경고 글자색: 지금 체계와 반대 체계 둘 다 계산된 color가 --color-text-warning과 같은가 (흐름은 한 체계로만 돌아서 emulateMedia로 바꿔 잰다)
  const warnColorBothSchemes = async (sel = ':is(dialog,[role=dialog],[aria-modal=true]) .ax-text-warning', text = '', tone = 'warning') => {
    const now = await page.evaluate(inPageToneColor, { sel, text, tone })
    await page.emulateMedia({ colorScheme: light ? 'dark' : 'light' })
    await settle(page, 200)
    const other = await page.evaluate(inPageToneColor, { sel, text, tone })
    await page.emulateMedia({ colorScheme: scheme })
    await settle(page, 200)
    return { same: now.same && other.same, actual: `${now.actual} / ${other.actual}`, token: `${now.token} / ${other.token}` }
  }
  const toEnd = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const toTop = () => page.evaluate(() => window.scrollTo(0, 0))
  const closeSheet = async (name, button = '닫기') => {
    const dlg = page.getByRole('dialog', { name })
    await dlg.getByRole('button', { name: button, exact: true }).click()
    await dlg.waitFor({ state: 'detached' }).catch(() => {})
    await settle(page, 400)
  }

  // RR8 도우미 — 세션이 여는 시트 여덟의 장면과 흐름
  /** 펼친 카드 가운데 find()가 찾는 것이 있는 첫 카드를 펼쳐 둔다. 없으면 -1 (펼쳤던 카드는 도로 접는다) */
  const openCardWith = async (find) => {
    const heads = page.locator('button[aria-expanded]')
    const n = await heads.count()
    for (let i = 0; i < n; i++) {
      const head = heads.nth(i)
      const wasOpen = (await head.getAttribute('aria-expanded')) === 'true'
      if (!wasOpen) await head.click()
      await settle(page, 300)
      if ((await find().count()) > 0) return i
      if (!wasOpen) await head.click()
    }
    return -1
  }
  /** 시트 안 스크롤 칸을 끝까지 내린다(시트가 안 넘치면 false) */
  const sheetToEnd = () =>
    page.evaluate(() => {
      const el = document.querySelector('dialog[open] [data-scrollable-block]')
      if (!el) return false
      el.scrollTop = el.scrollHeight
      return el.scrollHeight > el.clientHeight + 1
    })
  /** 시트 이름 하나의 글자가 390·375 폭에서 글자 중간에서 꺾이지 않는지 (RR5 재검증과 같은 잣대, 다크에서만) */
  const wrapFlow = async (label) => {
    if (light) return
    const name = `RR8 ${label} 390·375 글자 중간 꺾임 없음`
    await guardedFlow([name], async () => {
      const r390 = await page.evaluate(inPageMidWordBreaks, 'dialog[open]')
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 400)
      const r375 = await page.evaluate(inPageMidWordBreaks, 'dialog[open]')
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 400)
      const bad = [...r390.samples, ...r375.samples]
      flows.push([name, { ok: r390.count === 0 && r375.count === 0 && r390.chars > 0 && r375.chars > 0, detail: `390: 글자 ${r390.chars}개·꺾임 ${r390.count}건 · 375: 글자 ${r375.chars}개·꺾임 ${r375.count}건${bad.length ? ' — ' + bad.join(' ') : ''}` }])
    })
  }
  /** 고른 상태: 그 시트의 눌림 토글(aria-pressed) 가운데 켜진 것이 want개다 (안 눌린 토글이 맨 글자가 되지 않는지는 `시트 버튼` 칸이 따로 본다) */
  const pressedCount = (dlg) => dlg.locator('button[aria-pressed="true"]').count()

  // SS0 온보딩: 시작 버튼을 누르기 전 첫 화면 — Safari 탭(390·375), 홈 화면 앱(별도 문맥), 빈 분석(별도 문맥)
  await requiredScene(['onboarding', 'onboarding-375'], async () => {
    await page.getByRole('button', { name: '확인했어요, 그래도 계속', exact: true }).waitFor({ timeout: 5000 })
    await page.getByText('1단계 — 홈 화면에 추가').waitFor({ timeout: 3000 })
    await settle(page, 600)
    await snap('onboarding')
    await wrapProbe('onboarding')
    await at375(() => snap('onboarding-375'))
    // SS7: 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안(주소 줄 포함)
    if (!light) await screenWrapFlow('SS7 onboarding 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
  })
  // SS7 반려: 주소 조각 하나가 카드 안쪽 폭보다 길어도(?q=x×120) 조각 안에서 꺾여 카드 안에 든다
  await requiredScene('onboarding-long-url', () =>
    withFreshPage(
      null,
      async (p) => {
        await p.getByRole('button', { name: '확인했어요, 그래도 계속', exact: true }).waitFor({ timeout: 20000 })
        await settle(p, 600)
        await snap('onboarding-long-url', p)
        // 긴 조각은 일부러 조각 안에서 꺾이니 글자 중간 꺾임은 안 세고 안쪽 폭 안만 잰다
        if (!light) {
          await guardedFlow(['SS7 onboarding 긴 주소(?q=x×120) 390·375 폭 안쪽 폭 안'], async () => {
            try {
              // 카드가 넘친 글을 자르니(overflow hidden) 안쪽 폭 검사는 건너뛴다 — 잘림은 inPageNotClipped가 잡는다
              const needle = 'x'.repeat(10)
              const i390 = await p.evaluate(inPageInnerOverflow, '.ax-screen')
              const c390 = await p.evaluate(inPageNotClipped, needle)
              await p.setViewportSize({ width: 375, height: 812 })
              await settle(p, 400)
              const i375 = await p.evaluate(inPageInnerOverflow, '.ax-screen')
              const c375 = await p.evaluate(inPageNotClipped, needle)
              flows.push(['SS7 onboarding 긴 주소(?q=x×120) 390·375 폭 안쪽 폭 안', { ok: i390.ok && i375.ok && c390.ok && c375.ok, detail: `390: ${i390.detail} · 안 잘림 ${c390.detail} / 375: ${i375.detail} · 안 잘림 ${c375.detail}` }])
            } finally {
              await p.setViewportSize({ width: 390, height: 844 })
            }
          })
        }
      },
      `?q=${'x'.repeat(120)}`,
    ),
  )
  await requiredScene('onboarding-standalone', () =>
    withFreshPage(
      // matchMedia('(display-mode: standalone)')만 참으로 — 홈 화면에 추가된 앱처럼
      () => {
        const orig = window.matchMedia.bind(window)
        window.matchMedia = (q) => {
          const m = orig(q)
          if (!/display-mode:\s*standalone/.test(q)) return m
          return new Proxy(m, { get: (t, k) => (k === 'matches' ? true : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) })
        }
      },
      async (p) => {
        // 새 문맥의 첫 부팅(Dexie 시드·지연 화면 읽기)이 부하에 따라 5초를 넘는 일이 있었다 — 시간은 SS7 흐름이 기록한다(DEV-RECORD SS7)
        const t0 = Date.now()
        await p.getByRole('button', { name: '시작하기', exact: true }).waitFor({ timeout: 20000 })
        const bootMs = Date.now() - t0
        await p.getByText('홈 화면 앱으로 실행 중입니다').waitFor({ timeout: 3000 })
        await settle(p, 600)
        await snap('onboarding-standalone', p)
        if (!light) await screenWrapFlow('SS7 onboarding-standalone 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen', p)
        await guardedFlow([`SS7 시작하기(홈 화면 앱)${light ? ' (라이트)' : ''}`], async () => {
          const clicks = []
          await p.getByRole('button', { name: '시작하기', exact: true }).click()
          clicks.push(1)
          await p.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 10000 })
          const gone = (await p.getByRole('button', { name: '시작하기', exact: true }).count()) === 0
          flows.push([`SS7 시작하기(홈 화면 앱)${light ? ' (라이트)' : ''}`, { ok: clicks.length === 1 && gone, detail: `버튼 1탭 → 홈(아래 탭 '설정' 보임), 시작하기 버튼 사라짐=${gone} · 버튼이 나타나기까지 ${bootMs}ms` }])
        })
      },
    ),
  )
  // 기록 0개인 새 프로필의 분석 — 안내 문구만 있는 빈 화면
  await requiredScene('analyze-empty', () =>
    withFreshPage(null, async (p) => {
      await p.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
      await p.getByRole('button', { name: '분석', exact: true }).click()
      await p.getByText('기록이 쌓이면 추이가 표시됩니다.').waitFor({ timeout: 5000 })
      await settle(p, 600)
      await snap('analyze-empty', p)
      if (!light) await screenWrapFlow('SS5 analyze-empty 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen', p)
    }),
  )

  await guardedFlow([`SS7 시작하기(Safari 탭)${light ? ' (라이트)' : ''}`], async () => {
    await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
    await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 10000 })
    const gone = (await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).count()) === 0
    flows.push([`SS7 시작하기(Safari 탭)${light ? ' (라이트)' : ''}`, { ok: gone, detail: `버튼 1탭 → 홈(아래 탭 '설정' 보임), 온보딩 버튼 사라짐=${gone}` }])
  })
  await page.getByRole('button', { name: '설정', exact: true }).waitFor()
  await settle(page, 800)

  {
    await snap('home')
    await toEnd()
    await snap('home-end')
    await toTop()
    await optional('home-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('home-375')
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 400)
    })

    await btn(page, '변경').click()
    await page.getByRole('dialog', { name: 'Day 선택' }).waitFor()
    await settle(page)
    await snap('sheet-home')
    // RR5 재검증: 375 폭에서도 Day 선택 줄 부제가 글자 중간에서 꺾이지 않는지
    await optional('sheet-home-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('sheet-home-375')
      // RR5 재검증: 375 폭에서 한글이 글자 중간에서 꺾이지 않는다 (공백 없는 두 글자 사이에서 줄이 바뀌면 실패)
      if (!light) {
        await guardedFlow(['Day 선택 시트 375 글자 중간 꺾임 없음'], async () => {
          const r = await page.evaluate(inPageMidWordBreaks, 'dialog[open]')
          flows.push(['Day 선택 시트 375 글자 중간 꺾임 없음', { ok: r.count === 0 && r.chars > 0, detail: r.chars === 0 ? '잰 글자 0개' : `글자 ${r.chars}개 · 중간 꺾임 ${r.count}건${r.count ? ': ' + r.samples.join(' | ') : ''}` }])
        })
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 400)
    })
    await closeSheet('Day 선택')

    await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
    await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
    await settle(page, 800)
    await snap('session')
    await optional('session-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('session-375')
      // RR7 재검증: 펼친 카드의 팁 글이 375 폭에서 글자 중간에서 꺾이지 않는다(이전엔 '상/태')
      if (!light) {
        await guardedFlow(['RR7 팁 카드 375 글자 중간 꺾임 없음'], async () => {
          const r = await page.evaluate(inPageMidWordBreaks, '.ax-tip')
          flows.push(['RR7 팁 카드 375 글자 중간 꺾임 없음', { ok: r.count === 0 && r.chars > 0, detail: r.chars === 0 ? '잰 글자 0개' : `글자 ${r.chars}개 · 중간 꺾임 ${r.count}건${r.count ? ': ' + r.samples.join(' | ') : ''}` }])
        })
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 400)
    })
    // B그룹 카드를 펼친 상태 — 감각 점수가 보인다. 찍고 다시 접는다(뒤 장면의 첫 "1세트 완료"를 그대로 두려고)
    await optional('session-open-b', async () => {
      const heads = page.locator('button[aria-expanded]')
      const n = await heads.count()
      for (let i = 0; i < n; i++) {
        const head = heads.nth(i)
        const wasOpen = (await head.getAttribute('aria-expanded')) === 'true'
        if (!wasOpen) await head.click()
        await settle(page, 400)
        const found = (await page.getByText('감각 점수', { exact: true }).count()) > 0
        if (found) await snap('session-open-b')
        if (found && !light && !ONLY?.has('__skip')) {
          // RR7 화면 검증(참고, 판정 없음): 감각 점수·통증을 눌러 켠 상태 한 장 + 44px 미만 버튼의 실제 터치 영역(중심에서 위·아래 22px, 왼·오른 22px에 무엇이 있나)
          await guardedFlow(['RR7 카드 버튼 눌린 상태 한 장 + 터치 영역 참고'], async () => {
            await page.getByRole('button', { name: '2', exact: true }).first().click()
            const pain = page.getByRole('button', { name: '없음', exact: true }).last()
            await pain.click()
            await settle(page, 500)
            shots.push({ name: 'session-open-b-pressed', buf: await page.screenshot() })
            const r = await page.evaluate(() => {
              const out = []
              for (const b of document.querySelectorAll('button')) {
                const rc = b.getBoundingClientRect()
                if (rc.width === 0 || rc.height === 0 || rc.top < 60 || rc.bottom > innerHeight || rc.height >= 44) continue
                const cx = rc.left + rc.width / 2
                const cy = rc.top + rc.height / 2
                const own = (el) => el && (el === b || b.contains(el))
                const lab = (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 14)
                const hits = [[0, -22, '위'], [0, 22, '아래']].map(([dx, dy, n]) => {
                  const h = document.elementFromPoint(cx + dx, cy + dy)
                  return own(h) ? `${n}✓` : `${n}✗(${(h?.closest('button')?.getAttribute('aria-label') || h?.closest('button')?.textContent || h?.tagName || '').trim().slice(0, 10)})`
                })
                out.push(`${lab}=${Math.round(rc.width)}x${Math.round(rc.height)} ${hits.join(' ')}`)
              }
              return out
            })
            flows.push(['RR7 카드 버튼 눌린 상태 한 장 + 터치 영역 참고', { ok: true, detail: `44px 미만 ${r.length}개: ${r.join(', ')}` }])
          })
        }
        if (!wasOpen) await head.click()
        if (found) return
      }
      throw new Error('감각 점수가 보이는 카드가 없다')
    })

    await btn(page, '세션 최소화').click()
    await page.getByRole('button', { name: /진행 중/ }).last().waitFor()
    await settle(page, 600)
    await snap('home-resume')
    // 진행 중 세션 처리 시트 (RR5): 진행 중 세션이 있을 때 다른 시작 길(디로드 권장 배너의 `디로드로 시작`)로만 열린다. 그 배너가 안 뜨는 데이터면 건너뛴다
    // 시작 길: 디로드 배너가 있으면 그 버튼, 없으면 `변경` → 다른 Day → 시작(예시 데이터는 이 길이다)
    const startOther = async () => {
      const deload = page.getByRole('button', { name: '디로드로 시작', exact: true })
      if (await deload.count()) { await deload.click(); return }
      await btn(page, '변경').click()
      const pick = page.getByRole('dialog', { name: 'Day 선택' })
      await pick.waitFor({ timeout: 3000 })
      await settle(page, 400)
      await pick.getByRole('button', { name: /^Day 2/ }).click()
      await settle(page, 400)
      await page.getByRole('button', { name: /시작$/ }).first().click()
    }
    await optional('sheet-open-session', async () => {
      await startOther()
      await page.getByRole('dialog', { name: '진행 중 세션 처리' }).waitFor({ timeout: 3000 })
      await settle(page)
      await snap('sheet-open-session')
      await guardedFlow(['시트 닫기 두 번 누르기 진행 중 세션 처리', '시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리'], async () => {
      const dlg = page.getByRole('dialog', { name: '진행 중 세션 처리' })
      const errs = []
      const onErr = (e) => errs.push(String(e))
      page.on('pageerror', onErr)
      // 닫기 버튼을 빠르게 두 번 눌러도 오류 없이 한 번만 닫힌다 (RR5 once)
      // 사라지는 시간: 첫 눌림부터 다이얼로그가 DOM에서 빠질 때까지(브라우저 안에서 잰다)
      const goneIn = page.evaluate(() => new Promise((resolve) => {
        const t0 = performance.now()
        const tick = () => (document.querySelector('[aria-label="진행 중 세션 처리"]') ? requestAnimationFrame(tick) : resolve(Math.round(performance.now() - t0)))
        requestAnimationFrame(tick)
      }))
      await dlg.getByRole('button', { name: '취소', exact: true }).dblclick()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const ms = await goneIn
      await settle(page, 400)
      flows.push(['시트 닫기 두 번 누르기 진행 중 세션 처리', { ok: gone && errs.length === 0, detail: `사라짐 ${gone}(${ms}ms) · 오류 ${errs.length}건` }])
      // 저장으로 먼저 사라지는 길: 버리기 2단계 확인 → 세션 화면으로 가고, 닫힘 대기의 두 배 뒤에도 그대로다(늦은 onClose가 없다)
      await startOther()
      await dlg.waitFor({ timeout: 3000 })
      await settle(page, 450)
      await dlg.getByRole('button', { name: '버리고 새로 시작', exact: true }).click()
      await dlg.getByRole('button', { name: '버리고 새로 시작', exact: true }).last().click()
      await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor({ timeout: 4000 })
      await settle(page, 800)
      page.off('pageerror', onErr)
      const stay = await page.getByRole('button', { name: '세션 최소화', exact: true }).count()
      flows.push(['시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리', { ok: stay > 0 && errs.length === 0, detail: `세션 화면 ${stay > 0} · 오류 ${errs.length}건 (대기 700ms)` }])
      await btn(page, '세션 최소화').click()
      await page.getByRole('button', { name: /진행 중/ }).last().waitFor({ timeout: 3000 })
      await settle(page, 600)
      })
    })
    // QQ6: 세션이 열려 있을 때 설정 (`편집` 비활성 + 안내 문구)
    await requiredScene('settings-open', async () => {
      await page.getByRole('button', { name: '설정', exact: true }).click()
      await settle(page, 600)
      await snap('settings-open')
      if (!light) {
        await guardedFlow(['SS6 경계: 진행 중 세션이면 편집·이 루틴 쓰기·새 루틴이 막히고 안내가 있다'], async () => {
          const edit = await btn(page, '편집').isDisabled()
          const fresh = await btn(page, '＋ 새 루틴 만들기').isDisabled()
          const useBtn = await btn(page, '이 루틴 쓰기').count()
          const noteEdit = await page.getByText('진행 중인 세션을 마치거나 버린 뒤에 고칠 수 있습니다', { exact: true }).count()
          const noteAct = await page.getByText('진행 중인 세션을 마치거나 버린 뒤에 바꿀 수 있습니다', { exact: true }).count()
          flows.push(['SS6 경계: 진행 중 세션이면 편집·이 루틴 쓰기·새 루틴이 막히고 안내가 있다', { ok: edit && fresh && noteEdit === 1 && noteAct === 1, detail: `편집 비활성 ${edit} · 새 루틴 비활성 ${fresh} · 안내 ${noteEdit}+${noteAct}개 · 이 루틴 쓰기 버튼 ${useBtn}개(루틴이 하나뿐이면 0)` }])
        })
      }
      await page.getByRole('button', { name: '홈', exact: true }).click()
      await page.getByRole('button', { name: /진행 중/ }).last().waitFor({ timeout: 3000 })
    })
    await page.getByRole('button', { name: /진행 중/ }).last().click()
    await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
    await settle(page, 600)

    await page.getByRole('button', { name: '1세트 완료', exact: true }).first().click()
    await page.getByRole('timer').waitFor({ timeout: 5000 })
    await settle(page, 600)
    await snap('session-rest')
    await guardedFlow(['RR7 1세트 완료 1탭 → 완료 표시 + 휴식 바'], async () => {
      const pressed = await page.getByRole('button', { name: '1세트 완료', exact: true }).first().getAttribute('aria-pressed')
      const timers = await page.getByRole('timer').count()
      flows.push(['RR7 1세트 완료 1탭 → 완료 표시 + 휴식 바', { ok: pressed === 'true' && timers > 0, detail: `aria-pressed ${pressed} · 휴식 바 ${timers}개` }])
    })

    // RR6 흐름 — 휴식 바. 흐름이 끝나면 2세트를 다시 체크해 휴식 바가 떠 있는 채로 뒤 장면으로 이어간다.
    // 흐름은 guardedFlow 안이라 예외가 나도 건너뜀으로 삼켜지지 않고 흐름 실패가 된다.
    const restBar = () => page.getByRole('timer')
    const restSec = async () => {
      const [m, sec] = (await restBar().getByRole('heading').innerText()).split(':').map(Number)
      return m * 60 + sec
    }
    const restBtn = (name) => restBar().getByRole('button', { name, exact: true })
    const restartRest = async () => {
      await page.getByRole('button', { name: '2세트 완료', exact: true }).first().click()
      await restBar().waitFor({ timeout: 5000 })
      await settle(page, 400)
    }
    await guardedFlow(['휴식 바 +30초 건너뛰기'], async () => {
      const before = await restSec()
      await restBtn('+30초').click()
      await settle(page, 300)
      const after = await restSec()
      await restBtn('건너뛰기').click()
      await restBar().waitFor({ state: 'detached', timeout: 2000 }).catch(() => {})
      const gone = (await restBar().count()) === 0
      flows.push(['휴식 바 +30초 건너뛰기', { ok: after > before + 20 && gone, detail: `남은 ${before}초 → +30초 뒤 ${after}초 · 건너뛰기 뒤 바 ${gone ? '사라짐' : '남음'}` }])
    })
    // 정리(휴식 바 다시 띄우기)는 판정과 따로 guardedFlow에 둔다 — flows.push 뒤에서 던지면 예외가 삼켜진다 (RR6 반려)
    await guardedFlow(['휴식 바 다시 띄우기 (건너뛰기 뒤)'], restartRest)
    await guardedFlow(['움직임 줄이기에서 휴식 진행 막대'], async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      try {
        // ProgressBar의 채움은 폭이 아니라 CSS 변수(--_progress-bar-fill)로 그린다 — 채워진 부분(첫 자손)의 그 값을 읽는다 (PLAN은 폭이라 했으나 요소 폭은 늘 트랙 전체다)
        const fill = () => page.evaluate(() => document.querySelector('[role="timer"] [role="progressbar"]')?.firstElementChild?.style.getPropertyValue('--_progress-bar-fill') || null)
        const a = await fill()
        await settle(page, 2000)
        const b = await fill()
        flows.push(['움직임 줄이기에서 휴식 진행 막대', { ok: a !== null && b !== null && a !== b, detail: `채움 ${a} → ${b} (2초 간격, 달라야 한다)` }])
      } finally {
        await page.emulateMedia({ reducedMotion: null })
      }
    })
    await guardedFlow(['최소화하면 재개 줄에 남은 휴식'], async () => {
      const before = await restSec()
      await btn(page, '세션 최소화').click()
      const badge = page.getByText(/^휴식 \d+:\d\d$/)
      await badge.first().waitFor({ timeout: 3000 })
      const [m, sec] = (await badge.first().innerText()).replace('휴식 ', '').split(':').map(Number)
      const stripSec = m * 60 + sec
      await page.getByRole('button', { name: /진행 중/ }).last().click()
      await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
      await restBar().waitFor({ timeout: 3000 })
      const back = await restSec()
      flows.push(['최소화하면 재개 줄에 남은 휴식', { ok: stripSec <= before && stripSec > 0 && back <= stripSec, detail: `세션 ${before}초 → 재개 줄 ${stripSec}초 → 돌아온 세션 ${back}초(같은 타이머라 줄어들기만 한다)` }])
    })
    // 참고(RR6 화면 검증): 세션 화면 버튼의 눌림 크기. 숫자 기준이 아니라 사람이 보는 값이다 — 항상 ok. 휴식 바 닫기 버튼은 끝난 바에서만 생긴다.
    await guardedFlow(['세션 버튼 눌림 크기 참고'], async () => {
      const sizes = await page.evaluate(() => {
        const out = []
        for (const b of document.querySelectorAll('button')) {
          const r = b.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          out.push(`${(b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 14)}=${Math.round(r.width)}x${Math.round(r.height)}`)
        }
        return out
      })
      const small = sizes.filter((x) => Number(x.split('=')[1].split('x')[1]) < 44)
      flows.push(['세션 버튼 눌림 크기 참고', { ok: true, detail: `전체 ${sizes.length}개 · 44px 미만 ${small.length}개: ${[...new Set(small)].join(', ')}` }])
    })
    await guardedFlow(['끝난 휴식 바 1탭 닫기'], async () => {
      await restBtn('−30초').click()
      await restBtn('−30초').click()
      await restBar().getByRole('heading', { name: '휴식 완료' }).waitFor({ timeout: 3000 })
      const dm = await page.evaluate(() => { const b = document.querySelector('[role="timer"] .ax-bar-dismiss, .ax-bar-dismiss'); const r = b?.getBoundingClientRect(); const t = document.querySelector('[role="timer"]')?.getBoundingClientRect(); return r ? `${Math.round(r.width)}x${Math.round(r.height)} (바 ${Math.round(t?.width ?? 0)}x${Math.round(t?.height ?? 0)})` : '못 찾음' })
      flows.push(['휴식 바 닫기 버튼 눌림 크기 참고', { ok: true, detail: dm }])
      const box = await restBar().getByRole('heading', { name: '휴식 완료' }).boundingBox()
      // 글자 위를 누른다 — 글자는 눌림을 안 받고 뒤에 깔린 닫기 버튼이 받는다
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await restBar().waitFor({ state: 'detached', timeout: 1500 }).catch(() => {})
      const gone = (await restBar().count()) === 0
      flows.push(['끝난 휴식 바 1탭 닫기', { ok: gone, detail: `글자 위 1탭 뒤 바 ${gone ? '사라짐(자동 닫힘 3초보다 빠르다)' : '남음'}` }])
    })
    await guardedFlow(['휴식 바 다시 띄우기 (닫기 뒤)'], async () => {
      await page.getByRole('button', { name: '2세트 완료', exact: true }).first().click()
      await restartRest()
    })

    // RR7 흐름 — 운동 카드·스테퍼. 값을 바꾸는 흐름은 원래 값으로 되돌린 뒤 다음으로 간다. 전부 guardedFlow라 예외가 흐름 실패로 센다.
    const wInput = () => page.getByRole('textbox', { name: /1세트 무게$/ }).first()
    const rInput = () => page.getByRole('textbox', { name: /1세트 횟수$/ }).first()
    const retype = async (input, text) => {
      await input.click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type(text)
    }
    await guardedFlow(['RR7 무게 증가 1탭에 한 단계', 'RR7 버튼 위에서 시작해 세로로 끌면 값이 안 바뀐다'], async () => {
      const step = Number((await page.getByText(/^무게 단위 · [\d.]+kg/).first().innerText()).match(/무게 단위 · ([\d.]+)kg/)[1])
      const v0 = Number(await wInput().inputValue())
      const up = page.getByRole('button', { name: /1세트 무게 증가$/ }).first()
      await up.click()
      await settle(page, 200)
      const v1 = Number(await wInput().inputValue())
      flows.push(['RR7 무게 증가 1탭에 한 단계', { ok: Math.abs(v1 - v0 - step) < 1e-9, detail: `${v1 - v0} (한 단계 ${step}) · ${v0} → ${v1}` }])
      await page.getByRole('button', { name: /1세트 무게 감소$/ }).first().click()
      await settle(page, 200)
      const back = Number(await wInput().inputValue())
      const box = await up.boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, box.y - 60, { steps: 6 })
      await page.mouse.up()
      await settle(page, 200)
      const dragged = Number(await wInput().inputValue())
      flows.push(['RR7 버튼 위에서 시작해 세로로 끌면 값이 안 바뀐다', { ok: dragged === back && back === v0, detail: `감소로 ${back} · 끈 뒤 ${dragged}` }])
    })
    await guardedFlow(['RR7 숫자 칸 입력 패턴 (무게 소수 둘째까지, 횟수 소수점 없음)'], async () => {
      const w0 = await wInput().inputValue()
      const r0 = await rInput().inputValue()
      await retype(wInput(), '40.123456')
      const w = await wInput().inputValue()
      await retype(rInput(), '12.5')
      const r = await rInput().inputValue()
      await retype(wInput(), w0)
      await page.keyboard.press('Enter')
      await retype(rInput(), r0)
      await page.keyboard.press('Enter')
      await settle(page, 200)
      flows.push(['RR7 숫자 칸 입력 패턴 (무게 소수 둘째까지, 횟수 소수점 없음)', { ok: w === '40.12' && !r.includes('.'), detail: `무게 40.123456 → ${w} · 횟수 12.5 → ${r} (복원 ${await wInput().inputValue()}/${await rInput().inputValue()})` }])
    })
    for (const width of [390, 375]) {
      await guardedFlow([`RR7 세트 행 ${width} 폭: 누르는 영역·머리 열·숫자 안 잘림`], async () => {
        await page.setViewportSize({ width, height: width === 375 ? 812 : 844 })
        await settle(page, 400)
        const reach = await page.evaluate(inPageTouchReach)
        const table = await page.evaluate(inPageSetTable)
        // 가장 긴 값(142.5 · 12)을 넣어 본 뒤 되돌린다
        const w0 = await wInput().inputValue()
        const r0 = await rInput().inputValue()
        await retype(wInput(), '142.5')
        await page.keyboard.press('Enter')
        await retype(rInput(), '12')
        await page.keyboard.press('Enter')
        await settle(page, 200)
        const fit = await page.evaluate(inPageNumberFit)
        await retype(wInput(), w0)
        await page.keyboard.press('Enter')
        await retype(rInput(), r0)
        await page.keyboard.press('Enter')
        await settle(page, 200)
        flows.push([`RR7 세트 행 ${width} 폭: 누르는 영역·머리 열·숫자 안 잘림`, { ok: reach.ok && table.ok && fit.ok, detail: `누르는 영역: ${reach.detail} / 세트 표 머리: ${table.detail} / 142.5·12: ${fit.detail}` }])
      })
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await settle(page, 300)
    await guardedFlow(['RR7 타이핑 중 워밍업을 누르면 친 값이 원래 세트에 남는다'], async () => {
      await retype(wInput(), '77')
      await btn(page, '워밍업 세트 추가').click()
      await settle(page, 300)
      const original = await page.getByRole('textbox', { name: /2세트 무게$/ }).first().inputValue()
      const warm = await wInput().inputValue()
      flows.push(['RR7 타이핑 중 워밍업을 누르면 친 값이 원래 세트에 남는다', { ok: original === '77' && warm !== '77', detail: `원래 세트(이제 둘째 줄) ${original} · 새 워밍업 줄 ${warm}` }])
    })

    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await settle(page)
    await snap('sheet-finish')
    await wrapFlow('종료 시트')
    if (CHECK && phase === 'after' && !light) await guardedFlow(['Esc로 닫기', 'Esc 두 번 누르기', '움직임 줄이기에서 닫기'], () => closeFlows(page))
    // RR8: 유산소를 고른 모습(눌린 상태 + 입력칸 둘), 버리기 2단계(취소로 돌아온다), 끝까지 스크롤
    await optional('sheet-finish-cardio', async () => {
      const dlg = page.getByRole('dialog', { name: '세션 종료' })
      await dlg.locator('button[aria-pressed]').first().click()
      await settle(page, 400)
      await snap('sheet-finish-cardio')
      if (!light) {
        await guardedFlow(['RR8 종료 시트 유산소 고르기 → 눌린 상태 하나 + 입력칸 둘'], async () => {
          const pressed = await pressedCount(dlg)
          const minutes = await dlg.getByRole('textbox', { name: '유산소 시간(분)' }).count()
          const note = await dlg.getByRole('textbox', { name: '유산소 강도' }).count()
          flows.push(['RR8 종료 시트 유산소 고르기 → 눌린 상태 하나 + 입력칸 둘', { ok: pressed === 1 && minutes === 1 && note === 1, detail: `눌린 토글 ${pressed}개 · 시간 칸 ${minutes} · 강도 칸 ${note}` }])
        })
        await guardedFlow(['RR8 종료 시트 버리기 2단계: 눌러도 바로 지워지지 않고 취소로 돌아온다'], async () => {
          await dlg.getByRole('button', { name: '이 세션 버리기', exact: true }).click()
          await settle(page, 300)
          const confirm = await dlg.getByRole('button', { name: '정말 버리기', exact: true }).count()
          const warn = await dlg.getByText(/삭제/).count()
          await dlg.getByRole('button', { name: '취소', exact: true }).click()
          await settle(page, 300)
          const back = await dlg.getByRole('button', { name: '이 세션 버리기', exact: true }).count()
          const stay = await page.getByRole('button', { name: '세션 최소화', exact: true }).count()
          flows.push(['RR8 종료 시트 버리기 2단계: 눌러도 바로 지워지지 않고 취소로 돌아온다', { ok: confirm === 1 && warn > 0 && back === 1 && stay > 0, detail: `확인 버튼 ${confirm} · 삭제 문구 ${warn} · 취소 뒤 버리기 버튼 ${back} · 세션 화면 ${stay > 0}` }])
        })
      }
      await dlg.getByRole('button', { name: '이 세션 버리기', exact: true }).waitFor()
      const scrolled = await sheetToEnd()
      await settle(page, 400)
      await snap('sheet-finish-end')
      if (!light) {
        await guardedFlow(['RR8 종료 시트 끝까지 스크롤하면 버리기 버튼이 화면 안에 있다'], async () => {
          const box = await dlg.getByRole('button', { name: '이 세션 버리기', exact: true }).boundingBox()
          const vh = page.viewportSize().height
          flows.push(['RR8 종료 시트 끝까지 스크롤하면 버리기 버튼이 화면 안에 있다', { ok: !!box && box.y >= 0 && box.y + box.height <= vh + 0.5, detail: `스크롤 칸이 넘쳤나 ${scrolled} · 버리기 버튼 ${box ? `y ${Math.round(box.y)}~${Math.round(box.y + box.height)} / 화면 ${vh}` : '안 보임'}` }])
        })
      }
    })
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').first().waitFor({ state: 'detached', timeout: 1500 }).catch(() => {})
    if (await page.getByRole('dialog').count()) {
      await page.mouse.click(195, 30)
      await settle(page, 400)
    }
    await btn(page, '휴식 타이머 시작').click()
    await page.getByRole('dialog').first().waitFor()
    await settle(page)
    await snap('sheet-timer')
    await wrapFlow('휴식 타이머 시트')
    // RR8: 초 고르기(눌린 상태가 하나) → 시작 → 휴식 바
    await guardedFlow(['RR8 수동 타이머: 초 고르기(눌린 것 하나) → 시작 → 휴식 바'], async () => {
      const dlg = page.getByRole('dialog', { name: '휴식 타이머' })
      const toggles = dlg.locator('button[aria-pressed]')
      let off = toggles.first()
      for (let i = 0; i < (await toggles.count()); i++) if ((await toggles.nth(i).getAttribute('aria-pressed')) === 'false') { off = toggles.nth(i); break }
      await off.click()
      await settle(page, 300)
      const pressed = await pressedCount(dlg)
      const nowPressed = (await off.getAttribute('aria-pressed')) === 'true'
      await snap('sheet-timer-picked')
      await dlg.getByRole('button', { name: /시작$/ }).click()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const timer = await page.getByRole('timer').waitFor({ timeout: 3000 }).then(() => true, () => false)
      flows.push(['RR8 수동 타이머: 초 고르기(눌린 것 하나) → 시작 → 휴식 바', { ok: pressed === 1 && nowPressed && gone && timer, detail: `눌린 토글 ${pressed}개 · 방금 누른 것 눌림 ${nowPressed} · 시트 닫힘 ${gone} · 휴식 바 ${timer}` }])
    })
    if (await page.getByRole('dialog').count()) {
      await page.keyboard.press('Escape')
      await settle(page, 600)
    }
    if (await page.getByRole('dialog').count()) {
      await page.mouse.click(195, 30)
      await settle(page, 400)
    }

    // RR8: 종목 추가 시트 — 줄 1탭으로 닫히고 카드가 하나 늘어난다
    await optional('sheet-add', async () => {
      await btn(page, '+ 종목 추가').click()
      const dlg = page.getByRole('dialog', { name: '종목 추가' })
      await dlg.waitFor()
      await settle(page, 450)
      await snap('sheet-add')
      await wrapFlow('종목 추가 시트')
      await guardedFlow(['RR8 종목 추가: 줄 1탭 → 시트가 닫히고 카드가 하나 늘어난다'], async () => {
        const before = await page.locator('button[aria-expanded]').count()
        await dlg.locator('li button').first().click()
        const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
        await settle(page, 500)
        const after = await page.locator('button[aria-expanded]').count()
        const badge = await page.getByText('추가', { exact: true }).count()
        flows.push(['RR8 종목 추가: 줄 1탭 → 시트가 닫히고 카드가 하나 늘어난다', { ok: gone && after === before + 1 && badge > 0, detail: `시트 닫힘 ${gone} · 카드 ${before} → ${after} · 추가 뱃지 ${badge}` }])
      })
    })

    // RR8: 대체 시트(예시 데이터는 원 종목 기록이 없어 후보가 막힌 경계 상태), 보상작용(징후 둘 고르기), 무게 단위(방식·핀 목록 오류)
    await optional('sheet-substitute', async () => {
      if ((await openCardWith(() => page.getByRole('button', { name: /^대체 — 자리 없음/ }))) < 0) throw new Error('대체 버튼이 있는 카드가 없다')
      await page.getByRole('button', { name: /^대체 — 자리 없음/ }).first().click()
      const dlg = page.getByRole('dialog', { name: '대체운동 선택' })
      await dlg.waitFor()
      await settle(page, 450)
      await snap('sheet-substitute')
      await wrapFlow('대체 시트')
      await dlg.getByRole('button', { name: '취소', exact: true }).click()
      await dlg.waitFor({ state: 'detached' }).catch(() => {})
      await settle(page, 400)
    })
    await optional('sheet-comp', async () => {
      if ((await openCardWith(() => page.locator('li').filter({ hasText: '▸' }))) < 0) throw new Error('보상작용 줄이 있는 카드가 없다')
      await page.locator('li').filter({ hasText: '▸' }).getByRole('button').first().click()
      const dlg = page.getByRole('dialog', { name: '보상작용 입력' })
      await dlg.waitFor()
      await settle(page, 450)
      await snap('sheet-comp')
      // 장면: 징후 둘 고른 모습. 판정(징후 둘 고르기 → 저장 → 카드 문구)은 시드한 세션에서 한다 — 여기 예시 세션은 기록이 없어 징후 목록이 없는 종목일 수 있다
      const signs = dlg.locator('button[aria-pressed]')
      for (let i = 0; i < Math.min(2, await signs.count()); i++) await signs.nth(i).click()
      if ((await signs.count()) === 0) await dlg.getByRole('textbox', { name: '보상작용 직접 입력' }).fill('마지막 세트 엉덩이 살짝 뜸')
      await settle(page, 300)
      await snap('sheet-comp-picked')
      await wrapFlow('보상작용 시트')
      await dlg.getByRole('button', { name: '취소', exact: true }).click()
      await dlg.waitFor({ state: 'detached' }).catch(() => {})
      await settle(page, 400)
    })
    await optional('sheet-scale', async () => {
      if ((await openCardWith(() => page.getByRole('button', { name: /^무게 단위 · / }))) < 0) throw new Error('무게 단위 줄이 있는 카드가 없다')
      await page.getByRole('button', { name: /^무게 단위 · / }).first().click()
      const dlg = page.getByRole('dialog', { name: '무게 단위 설정' })
      await dlg.waitFor()
      await settle(page, 450)
      await snap('sheet-scale')
      await wrapFlow('무게 단위 시트')
      // 불규칙(핀 목록)으로 바꾸고 잘못된 형식을 넣으면 오류 문구가 보이고 저장이 막힌다
      await dlg.getByRole('radio', { name: /불규칙/ }).click()
      await dlg.getByRole('textbox', { name: '핀 목록' }).fill('5, abc')
      await settle(page, 300)
      await snap('sheet-scale-error')
      await guardedFlow(['RR8 무게 단위 핀 목록 잘못된 형식 → 오류 문구가 보이고 저장이 막힌다'], async () => {
        const err = await dlg.locator('.ax-text-warning').count()
        const warnColor = await warnColorBothSchemes()
        const disabled = await dlg.getByRole('button', { name: '저장', exact: true }).isDisabled()
        flows.push(['RR8 무게 단위 핀 목록 잘못된 형식 → 오류 문구가 보이고 저장이 막힌다', { ok: err === 1 && warnColor.same && disabled, detail: `오류 문구 계산된 색 ${warnColor.actual} (토큰 ${warnColor.token}) · 오류 문구 ${err}개 · 저장 막힘 ${disabled}` }])
      })
      // 올바른 핀 목록을 넣고 저장하면 카드의 + 가 다음 핀으로 간다
      await guardedFlow(['RR8 무게 단위 핀 목록 입력 → 저장 → + 가 다음 핀으로 간다'], async () => {
        await dlg.getByRole('textbox', { name: '핀 목록' }).fill('5, 10, 15, 20, 25, 30, 35, 41, 47, 55, 65, 75, 85, 95, 110, 130, 150, 200, 300, 400, 500')
        await dlg.getByRole('button', { name: '저장', exact: true }).click()
        await dlg.waitFor({ state: 'detached', timeout: 1500 }).catch(() => {})
        await settle(page, 400)
        const w = page.getByRole('textbox', { name: /1세트 무게$/ }).first()
        const before = Number(await w.inputValue())
        await page.getByRole('button', { name: /1세트 무게 증가$/ }).first().click()
        await settle(page, 200)
        const after = Number(await w.inputValue())
        const ladder = [5, 10, 15, 20, 25, 30, 35, 41, 47, 55, 65, 75, 85, 95, 110, 130, 150, 200, 300, 400, 500]
        const expect = ladder.find((p) => p > before)
        flows.push(['RR8 무게 단위 핀 목록 입력 → 저장 → + 가 다음 핀으로 간다', { ok: after === expect, detail: `무게 ${before} → ${after} (다음 핀 ${expect})` }])
      })
    })

    // 세션 끝 → 요약
    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await btn(page, '기록 마치기').click()
    await btn(page, '홈으로').waitFor({ timeout: 8000 })
    await settle(page, 800)
    await snap('summary')
    // RR9 요약 흐름 — 전부 guardedFlow라 예외가 건너뜀으로 삼켜지지 않고 흐름 실패가 된다. 다크에서만(라이트는 같은 화면)
    const SUMMARY_TITLES = ['개인 기록 🎉', '다음 세션 무게 (A그룹)', '감각 저하 — 이전 무게로 복귀', '감각이 약했던 종목', '수행 순서', '홈으로']
    /** 화면에 보이는 카드 제목이 PLAN의 순서(개인 기록 < 다음 세션 무게 < 감각 저하 < 감각이 약했던 종목 < 수행 순서 < 홈으로)로 늘어서 있나 */
    const orderFlow = async (scene) => {
      const order = await page.evaluate(inPageTextOrder, SUMMARY_TITLES)
      const want = SUMMARY_TITLES.filter((t) => order.includes(t))
      return { ok: order.length >= 2 && order.join('|') === want.join('|') && order.at(-1) === '홈으로', order, detail: `${scene}: ${order.join(' < ')}` }
    }
    /** RR9 화면 검증: 맨 아래까지 내렸을 때 홈으로 버튼이 다른 요소에 가려지지 않고 화면 안에 있나 */
    const endName = (scene) => `RR9 ${scene} 맨 아래 홈으로 버튼`
    const wrapName = (scene) => `RR9 ${scene} 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`
    // endButton은 던져도 흐름 실패로 센다(guardedFlow) — 판정이 한 번 통과한 장면에서 뒤 흐름이 조용히 빠지지 않게 (RR9 리뷰 반려)
    const endButton = (scene) => guardedFlow([endName(scene)], () => endButtonRaw(scene))
    const endButtonRaw = async (scene) => {
      await toEnd()
      await settle(page, 400)
      await snap(`${scene}-end`)
      const r = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '홈으로')
        if (!b) return null
        const q = b.getBoundingClientRect()
        const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
        return { top: q.top, bottom: q.bottom, h: window.innerHeight, height: q.height, covered: !(top === b || b.contains(top)) }
      })
      flows.push([endName(scene), { ok: !!r && !r.covered && r.bottom <= r.h && r.top >= 0, detail: r ? `버튼 y ${Math.round(r.top)}~${Math.round(r.bottom)} / 화면 ${r.h} · 높이 ${Math.round(r.height)} · 가려짐 ${r.covered}` : '버튼 없음' }])
      await toTop()
    }
    const wrapSummary = (scene) => screenWrapFlow(wrapName(scene), '.ax-screen')
    if (!light) {
      await guardedFlow(['RR9 요약 카드 순서'], async () => {
        flows.push(['RR9 요약 카드 순서', await orderFlow('summary')])
      })
      await wrapSummary('summary')
      await endButton('summary')
    }
    await btn(page, '홈으로').click()
    await page.getByRole('button', { name: '기록', exact: true }).waitFor()
    await settle(page, 600)

    // RR9 경계 장면 넷 — 진행 중 세션을 IndexedDB에서 고쳐 쓰고 다시 열어 끝낸다. 시드는 끝에 지운다(finally). 흐름 이름은 아래 한 곳에서 정한다
    if (!light) {
      const SUM = {
        zero: 'RR9 요약 0세트로 종료: 체크된 세트 없음 문구·증량·PR 카드 없음',
        pr: 'RR9 요약 PR 셋 이상: 개인 기록 카드 줄 3개 이상·카드 순서·앞당김과 미룸 뱃지',
        assist: 'RR9 요약 어시스트 종목만: 볼륨 0 + 제외 안내',
        revert: 'RR9 요약 감각 저하 복귀 카드: 1개·프리필 문구·카드 순서·오른쪽 값 한 줄·경고 글자색',
        cardio: 'RR9 요약 유산소만: 체크된 세트 없음 문구·유산소 줄·증량·PR·복귀 카드 없음',
        deload: 'RR9 요약 디로드 세션: 맨 아래 홈으로 버튼 하나·PR 카드 없음·디로드 문구',
        memo: 'RR9 요약 긴 메모·감각 약함: 메모가 안 잘림·경고 글자색(다크·라이트)·유산소 줄',
      }
      const finishToSummary = async (kind) => {
        await page.getByRole('button', { name: '홈', exact: true }).click()
        await settle(page, 500)
        await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
        await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
        await settle(page, 500)
        const seed = await page.evaluate(inPageSummarySeed, kind)
        await page.reload()
        await page.getByRole('button', { name: '설정', exact: true }).waitFor()
        await settle(page, 800)
        await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
        await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
        await settle(page, 500)
        await btn(page, '종료').click()
        await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
        await btn(page, '기록 마치기').click()
        await btn(page, '홈으로').waitFor({ timeout: 8000 })
        await settle(page, 800)
        return seed
      }
      // phase: 이 장면 동안만 바꿀 currentPhase (settings 한 줄 — revertWarning은 Phase 2+만 본다). 끝에 원래 값으로 되돌린다
      const scene = async (kind, sceneName, check, phase) => {
        const keep = await page.evaluate(inPageSessionIds)
        const flowsFrom = flows.length
        let phaseBefore = null
        try {
          if (phase !== undefined) phaseBefore = await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: phase })
          const seed = await finishToSummary(kind)
          await snap(sceneName)
          const r = await check(seed)
          flows.push([SUM[kind], { ok: r.ok, detail: `${seed.detail} · ${r.detail}` }])
          await wrapSummary(sceneName)
          await endButton(sceneName)
        } catch (e) {
          // 이 장면이 내야 할 흐름 셋 가운데 없는 것은 전부 실패로 센다
          for (const n of [SUM[kind], wrapName(sceneName), endName(sceneName)]) if (!flows.slice(flowsFrom).some((f) => f[0] === n)) flows.push([n, { ok: false, detail: `예외: ${String(e.message).split('\n')[0]}` }])
        } finally {
          if (phaseBefore) await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: phaseBefore.value, remove: !phaseBefore.had })
          // 정리는 판정과 따로: 던져도 다음 장면이 깨끗한 홈에서 시작하게 한다
          await page.evaluate(inPageDropSessionsExcept, keep).catch(() => {})
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 8000 }).catch(() => {})
          await settle(page, 600)
        }
      }
      const has = (text) => page.getByText(text, { exact: true }).count()
      await scene('zero', 'summary-zero', async () => {
        const none = await has('체크된 세트가 없습니다.')
        const next = await has('다음 세션 무게 (A그룹)')
        const pr = await has('개인 기록 🎉')
        const weak = await has('감각이 약했던 종목')
        const home = await btn(page, '홈으로').count()
        return { ok: none === 1 && next === 0 && pr === 0 && weak === 0 && home === 1, detail: `"체크된 세트가 없습니다." ${none}개 · 증량 카드 ${next}개 · PR 카드 ${pr}개 · 감각 약함 카드 ${weak}개 · 홈으로 ${home}개` }
      })
      await scene('pr', 'summary-pr', async () => {
        const prRows = await page.evaluate(() => {
          const title = [...document.querySelectorAll('body *')].find((el) => el.children.length === 0 && el.textContent.trim() === '개인 기록 🎉')
          let card = title
          while (card && card.querySelectorAll('[role=listitem]').length === 0) card = card.parentElement
          return card ? card.querySelectorAll('[role=listitem]').length : 0
        })
        const ord = await orderFlow('summary-pr')
        const ahead = await page.getByText(/칸 앞당김$/).count()
        const behind = await page.getByText(/칸 미룸$/).count()
        const next = await has('다음 세션 무게 (A그룹)')
        return { ok: prRows >= 3 && ord.ok && ahead >= 1 && behind >= 1, detail: `PR 카드 줄 ${prRows}개 · ${ord.detail} · 앞당김 ${ahead}개 · 미룸 ${behind}개 · 증량 카드 ${next}개` }
      })
      await scene('assist', 'summary-assist', async () => {
        const note = await page.getByText(/어시스트 종목 제외/).count()
        const vol = await page.evaluate(() => {
          const label = [...document.querySelectorAll('body *')].find((el) => el.children.length === 0 && /^총 볼륨/.test(el.textContent.trim()))
          const value = label?.previousElementSibling
          return value ? value.textContent.trim() : null
        })
        const best = await page.getByText(/^최고 세트:/).count()
        return { ok: note === 1 && vol === '0' && best === 0, detail: `제외 안내 ${note}개 · 볼륨 값 ${vol} · 최고 세트 줄 ${best}개(어시스트는 최고 세트에서도 뺀다)` }
      })
      await scene('memo', 'summary-memo', async () => {
        const memo = await page.evaluate(inPageNotClipped, '오늘은 컨디션이 좋지 않아')
        const note = await page.evaluate(inPageNotClipped, '목표 부위보다 팔과 어깨')
        const warn = await warnColorBothSchemes('.ax-text-warning')
        const cardio = await page.getByText(/걷기/).count()
        return { ok: memo.ok && memo.lines >= 3 && note.ok && warn.same && cardio >= 1, detail: `세션 메모 ${memo.detail} · 감각 메모 ${note.detail} · 경고 글자 계산된 색 ${warn.actual} (토큰 ${warn.token}) · 유산소 줄 ${cardio}개` }
      })
      const NEXT = '다음 세션 무게 (A그룹)'
      const REVERT = '감각 저하 — 이전 무게로 복귀'
      await scene('revert', 'summary-revert', async () => {
        const cards = await has(REVERT)
        await page.getByText(REVERT, { exact: true }).first().scrollIntoViewIfNeeded()
        await snap('summary-revert-card') // 복귀 카드가 처음·맨 아래 스크린샷 어디에도 안 찍혀서 (RR9 재검증)
        const auto = await page.getByText(/^다음 세션 프리필이 자동으로 .+kg로 내려갑니다\.$/).count()
        const ord = await orderFlow('summary-revert')
        const needed = [NEXT, REVERT, '감각이 약했던 종목']
        const lines = await page.evaluate(inPageLineCount, '^\\d+(\\.\\d+)? → \\d+(\\.\\d+)?kg$')
        const warn = await warnColorBothSchemes('.ax-text-warning', '→') // 복귀 카드의 값만 — 감각 약한 종목의 "0점"이 아니라
        const oneLine = lines.length >= 1 && lines.every((l) => l.lines === 1)
        return { ok: cards === 1 && auto === 1 && ord.ok && needed.every((t) => ord.order.includes(t)) && oneLine && warn.same, detail: `복귀 카드 ${cards}개 · 프리필 문구 ${auto}개 · ${ord.detail} · 오른쪽 값 ${lines.map((l) => `"${l.text}" ${l.lines}줄`).join(', ') || '없음'} · 경고 글자 계산된 색 ${warn.actual} (토큰 ${warn.token})` }
      }, 2)
      await scene('cardio', 'summary-cardio', async () => {
        const none = await has('체크된 세트가 없습니다.')
        const cardioRow = await has('유산소')
        const cardioWalk = await page.getByText(/걷기/).count()
        const counts = []
        for (const t of [NEXT, '개인 기록 🎉', REVERT]) counts.push(await has(t))
        return { ok: none === 1 && cardioRow === 1 && cardioWalk >= 1 && counts.every((c) => c === 0), detail: `"체크된 세트가 없습니다." ${none}개 · 유산소 줄 ${cardioRow}개(걷기 글 ${cardioWalk}개) · 증량 카드 ${counts[0]}개 · PR 카드 ${counts[1]}개 · 복귀 카드 ${counts[2]}개` }
      })
      await scene('deload', 'summary-deload', async () => {
        const pr = await has('개인 기록 🎉')
        const next = await has(NEXT)
        const notice = await page.getByText(/디로드 세션/).count()
        const home = await btn(page, '홈으로').count()
        return { ok: home === 1 && pr === 0 && notice >= 1, detail: `PR 카드 ${pr}개 · 증량 카드 ${next}개 · "디로드 세션" 문구 ${notice}개 · 홈으로 ${home}개` }
      })
    }

    // 홈 알림 (RR4): 세션을 하나 마친 홈 — 백업 미설정 배너가 뜬다. 시작 버튼의 자리가 알림 유무와 상관없이 같은지 본다
    await optional('home-banner', async () => {
      await page.getByRole('button', { name: '홈', exact: true }).click()
      await page.getByText('백업이 설정되지 않았어요', { exact: true }).waitFor({ timeout: 3000 })
      await settle(page, 500)
      await snap('home-banner')
      await optional('home-banner-375', async () => {
        await page.setViewportSize({ width: 375, height: 812 })
        await settle(page, 500)
        await snap('home-banner-375')
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 400)
      })
      // 큐의 알림을 펼친 모습: "다른 알림 N개"가 있을 때만(예시 데이터에 따라 없을 수 있다 — 그러면 이 장면은 건너뛴다)
      await optional('home-banners-open', async () => {
        await page.getByRole('button', { name: /^다른 알림 \d+개/ }).click({ timeout: 2000 })
        await settle(page, 500)
        await snap('home-banners-open')
      })
    })

    // RR8: 시드한 세션에서 보상작용(징후 둘 고르기)·보상작용 반복 시트·대체 후보 1탭을 재고, 템포 가이드·버리기 → 홈까지 간다.
    // 시드: 방금 끝낸 세션을 같은 Day로 세 번 더 끝낸 것처럼 복제해 "Day를 여러 번 끝낸 상태"를 만든다(보상작용은 복제 셋 모두 기록).
    // 그래야 원 종목 기록이 있는 대체 후보가 열리고, 징후 목록이 있는 종목의 보상작용 시트와 3/3 반복 시트가 열린다. 시드는 이 블록 끝에서 지운다.
    // 템포 가이드는 설정에서 켜야 버튼이 보이므로(기본 꺼짐) 켜고 시작해 끝에 다시 끈다. 세션은 끝에서 버려 기록에 흔적이 없다.
    const SEED_IDS = ['ui-check-seed-1', 'ui-check-seed-2', 'ui-check-seed-3']
    const seedFlows = {
      comp: 'RR8 보상작용: 징후 둘 고르기 → 저장 → 카드의 보상작용 줄이 바뀐다',
      watch: 'RR8 보상작용 반복 시트: 3/3 버튼 → 시트 → 끝까지 스크롤하면 그대로 두기 버튼이 화면 안에 있다',
      watchWrap: 'RR8 보상작용 반복 시트 390·375 글자 중간 꺾임 없음',
      sub: 'RR8 대체: 후보 1탭 → 시트가 닫히고 카드에 대체 뱃지가 생긴다',
    }
    const seedWatch = () =>
      page.evaluate(
        (ids) =>
          new Promise((resolve, reject) => {
            const open = indexedDB.open('workout-tracker')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const idb = open.result
              const tx = idb.transaction(['sessions', 'exercises'], 'readwrite')
              const sessions = tx.objectStore('sessions')
              const all = sessions.getAll()
              const exs = tx.objectStore('exercises').getAll()
              let out = null
              tx.oncomplete = () => {
                idb.close()
                if (out) resolve(out)
                else reject(new Error('시드 실패: 끝난 세션이나 징후가 둘 이상인 종목이 없다'))
              }
              tx.onerror = () => reject(tx.error)
              const go = () => {
                if (all.readyState !== 'done' || exs.readyState !== 'done') return
                const catalog = new Map(exs.result.map((e) => [e.id, e]))
                const done = all.result.filter((x) => x.endedAt && !ids.includes(x.id)).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                const src = done[0]
                if (!src) return
                const signsOf = (e) => catalog.get(e.recordKey.split('@')[0])?.compensationSigns ?? []
                const target = src.entries.find((e) => !e.skipped && !e.substituteFor && !e.extra && signsOf(e).length >= 2)
                if (!target) return
                const note = signsOf(target)[0]
                ids.forEach((id, i) => {
                  const at = Date.parse(src.startedAt) + (i + 1) * 60000
                  sessions.put({
                    ...src,
                    id,
                    startedAt: new Date(at).toISOString(),
                    endedAt: new Date(at + 30000).toISOString(),
                    entries: src.entries.map((e) => ({
                      ...e,
                      sets: e.sets.map((x) => ({ ...x, done: true })),
                      compensation: e.recordKey === target.recordKey ? note : e.compensation,
                    })),
                  })
                })
                out = { dayId: src.dayId, recordKey: target.recordKey }
              }
              all.onsuccess = go
              exs.onsuccess = go
            }
          }),
        SEED_IDS,
      )
    const unseedWatch = () =>
      page.evaluate(
        (ids) =>
          new Promise((resolve, reject) => {
            const open = indexedDB.open('workout-tracker')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const idb = open.result
              const tx = idb.transaction('sessions', 'readwrite')
              ids.forEach((id) => tx.objectStore('sessions').delete(id))
              tx.oncomplete = () => {
                idb.close()
                resolve(null)
              }
              tx.onerror = () => reject(tx.error)
            }
          }),
        SEED_IDS,
      )
    await optional('sheet-tempo', async () => {
      await page.getByRole('button', { name: '설정', exact: true }).click()
      await settle(page, 600)
      const tempoSwitch = page.getByRole('switch', { name: '템포 가이드 사용' })
      const tempoOn0 = await tempoSwitch.evaluate((e) => e.checked)
      await tempoSwitch.click({ force: true })
      await settle(page, 300)
      const tempoOn1 = await tempoSwitch.evaluate((e) => e.checked)
      let tempoButtons = 0

      // 시드 → 같은 Day로 새 세션 시작. 어느 단계든 예외가 나면 아래 흐름 이름 전부가 실패로 센다(건너뜀 없음)
      let started = false
      await guardedFlow(Object.values(seedFlows), async () => {
        const seed = await seedWatch()
        await page.reload()
        await page.getByRole('button', { name: '설정', exact: true }).waitFor()
        await settle(page, 800)
        const dayNo = /^d(\d+)$/.exec(seed.dayId)?.[1]
        if (!dayNo) throw new Error(`Day 이름을 못 읽었다: ${seed.dayId}`)
        await btn(page, '변경').click()
        const pick = page.getByRole('dialog', { name: 'Day 선택' })
        await pick.waitFor({ timeout: 3000 })
        await settle(page, 400)
        await pick.getByRole('button', { name: new RegExp(`^Day ${dayNo}`) }).click()
        await settle(page, 400)
        await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
        await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
        await settle(page, 600)
        started = true

        // 보상작용 반복 시트(info): 3/3 버튼 → 시트 → 끝까지 스크롤 → 그대로 두기로 닫힘
        const watchBtn = () => page.getByRole('button', { name: /^보상작용 \d\/3회/ })
        if ((await openCardWith(watchBtn)) < 0) throw new Error('보상작용 3/3 버튼이 있는 카드가 없다(시드가 안 먹었다)')
        await watchBtn().first().click()
        const wdlg = page.getByRole('dialog', { name: '보상작용 반복 — 무게 하향' })
        await wdlg.waitFor()
        await settle(page, 450)
        await snap('sheet-watch')
        await wrapFlow('보상작용 반복 시트')
        const wScrolled = await sheetToEnd()
        await settle(page, 400)
        await snap('sheet-watch-end')
        if (!light) {
          const box = await wdlg.getByRole('button', { name: '그대로 두기', exact: true }).boundingBox()
          const vh = page.viewportSize().height
          flows.push([seedFlows.watch, { ok: !!box && box.y >= 0 && box.y + box.height <= vh + 0.5, detail: `스크롤 칸이 넘쳤나 ${wScrolled} · 그대로 두기 버튼 ${box ? `y ${Math.round(box.y)}~${Math.round(box.y + box.height)} / 화면 ${vh}` : '안 보임'}` }])
        }
        await wdlg.getByRole('button', { name: '그대로 두기', exact: true }).click()
        await wdlg.waitFor({ state: 'detached' }).catch(() => {})
        await settle(page, 400)

        // 보상작용: 징후 둘 고르기 → 저장 → 카드의 보상작용 줄이 저장한 문구로 바뀐다 (징후 목록 ≥2·눌린 징후 2를 요구한다 — 0개는 실패)
        await page.locator('li').filter({ hasText: '▸' }).getByRole('button').first().click()
        const dlg = page.getByRole('dialog', { name: '보상작용 입력' })
        await dlg.waitFor()
        await settle(page, 450)
        const signs = dlg.locator('button[aria-pressed]')
        const nSigns = await signs.count()
        const names = []
        for (let i = 0; i < Math.min(2, nSigns); i++) {
          names.push(((await signs.nth(i).innerText()) || '').trim())
          await signs.nth(i).click()
        }
        await settle(page, 300)
        const pressed = await pressedCount(dlg)
        const warnLine = await dlg.locator('.ax-text-warning').count()
        const warnColor = await warnColorBothSchemes()
        const saved = names.join(', ')
        const beforeText = await page.locator('li .ax-text-warning').filter({ hasText: saved }).count()
        await dlg.getByRole('button', { name: '저장', exact: true }).click()
        const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
        await settle(page, 400)
        const shown = await page.locator('li .ax-text-warning').filter({ hasText: saved }).count()
        flows.push([seedFlows.comp, { ok: nSigns >= 2 && pressed === 2 && saved.length > 0 && warnLine === 1 && warnColor.same && beforeText === 0 && shown === 1 && gone, detail: `저장될 값 계산된 색 ${warnColor.actual} (토큰 ${warnColor.token}) · 징후 목록 ${nSigns}개 · 눌린 징후 ${pressed}개 · 저장될 값 경고 줄 ${warnLine} · 시트 닫힘 ${gone} · 저장 전 카드의 "${saved}" ${beforeText}줄 → 저장 뒤 ${shown}줄` }])

        // 대체: 후보 1탭 → 카드가 대체 종목으로 (후보가 0개면 실패다 — 시드한 원 종목 기록으로 후보가 열려야 한다)
        const heads = page.locator('button[aria-expanded]')
        const sdlg = page.getByRole('dialog', { name: '대체운동 선택' })
        const open = sdlg.locator('li button:not([disabled])')
        let nOpen = 0
        for (let i = 0; i < (await heads.count()) && nOpen === 0; i++) {
          const head = heads.nth(i)
          const was = (await head.getAttribute('aria-expanded')) === 'true'
          if (!was) await head.click()
          await settle(page, 300)
          const sub = page.getByRole('button', { name: /^대체 — 자리 없음/ })
          if ((await sub.count()) > 0) {
            await sub.first().click()
            await sdlg.waitFor()
            await settle(page, 450)
            nOpen = await open.count()
            if (nOpen === 0) {
              await sdlg.getByRole('button', { name: '취소', exact: true }).click()
              await sdlg.waitFor({ state: 'detached' }).catch(() => {})
              await settle(page, 400)
            }
          }
          if (nOpen === 0 && !was) await head.click()
        }
        if (nOpen === 0) {
          flows.push([seedFlows.sub, { ok: false, detail: '열린 대체 후보가 0개다 — 시드한 원 종목 기록으로 후보가 열려야 한다' }])
        } else {
          const badgeBefore = await page.getByText('대체', { exact: true }).count()
          await open.first().click()
          const subGone = await sdlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
          await settle(page, 500)
          const badge = await page.getByText('대체', { exact: true }).count()
          flows.push([seedFlows.sub, { ok: nOpen >= 1 && subGone && badge > badgeBefore, detail: `열린 후보 ${nOpen}개 · 시트 닫힘 ${subGone} · 대체 뱃지 ${badgeBefore} → ${badge}` }])
        }
      })
      if (!started) throw new Error('시드한 세션을 시작하지 못했다')

      // 템포 가이드: 도는 중 한 장, 그 장면의 링·글자, 자동이 아닌 수동 종료로 세트 체크 + 휴식 시작(Z2 체인)
      const tempoBtn = () => page.getByRole('button', { name: /세트 템포 가이드$/ })
      if ((await openCardWith(tempoBtn)) < 0) throw new Error('템포 가이드 버튼이 있는 카드가 없다')
      tempoButtons = await tempoBtn().count()
      const setNo = (await tempoBtn().first().getAttribute('aria-label'))?.match(/^(\d+)세트/)?.[1] ?? '1'
      await tempoBtn().first().click()
      const dlg = page.getByRole('dialog', { name: '템포 가이드' })
      await dlg.waitFor()
      // 카운트인이 끝나고 첫 단계가 돌아야 "도는 중"이다
      await dlg.getByText(/회째$/).waitFor({ timeout: 12000 })
      await settle(page, 700)
      await snap('sheet-tempo')
      await wrapFlow('템포 가이드 시트')
      await guardedFlow(['RR8 템포 가이드 도는 중: 링이 단계 색을 갖고 크기가 변수로 간다'], async () => {
        const ring = dlg.locator('.ax-tempo-ring')
        const cls = (await ring.getAttribute('class')) ?? ''
        const scale = await ring.evaluate((el) => el.style.getPropertyValue('--ax-tempo-scale'))
        const w = await ring.evaluate((el) => el.getBoundingClientRect().width)
        const progress = await dlg.getByRole('progressbar').count()
        flows.push(['RR8 템포 가이드 도는 중: 링이 단계 색을 갖고 크기가 변수로 간다', { ok: /ax-tempo-ring-(concentric|eccentric|squeeze|stretch)/.test(cls) && scale !== '' && w > 0 && progress === 1, detail: `링 ${cls.replace('ax-tempo-ring ', '')} · scale ${scale} · 폭 ${Math.round(w)}px · 진행 막대 ${progress}` }])
      })
      await guardedFlow(['RR8 템포 가이드 → 종료 → 세트 체크 + 휴식 시작'], async () => {
        const end = dlg.getByRole('button', { name: /^종료 — 약 [1-9]\d*회 기록 · 휴식 시작$/ })
        await end.waitFor({ timeout: 20000 })
        await end.click()
        const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
        await settle(page, 500)
        const checked = (await page.getByRole('button', { name: `${setNo}세트 완료`, exact: true }).first().getAttribute('aria-pressed')) === 'true'
        const timer = await page.getByRole('timer').waitFor({ timeout: 3000 }).then(() => true, () => false)
        flows.push(['RR8 템포 가이드 → 종료 → 세트 체크 + 휴식 시작', { ok: gone && checked && timer, detail: `시트 닫힘 ${gone} · ${setNo}세트 완료 눌림 ${checked} · 휴식 바 ${timer}` }])
      })

      // 종료 시트에서 정말 버리기 → 홈 (세션이 지워지고 홈으로 간다)
      await guardedFlow(['RR8 종료 시트: 이 세션 버리기 → 정말 버리기 → 홈'], async () => {
        await btn(page, '종료').click()
        const fin = page.getByRole('dialog', { name: '세션 종료' })
        await fin.waitFor()
        await settle(page, 450)
        await fin.getByRole('button', { name: '이 세션 버리기', exact: true }).click()
        await fin.getByRole('button', { name: '정말 버리기', exact: true }).click()
        const home = await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 4000 }).then(() => true, () => false)
        await settle(page, 600)
        const dialogs = await page.getByRole('dialog').count()
        const session = await page.getByRole('button', { name: '세션 최소화', exact: true }).count()
        flows.push(['RR8 종료 시트: 이 세션 버리기 → 정말 버리기 → 홈', { ok: home && dialogs === 0 && session === 0, detail: `홈 ${home} · 열린 시트 ${dialogs} · 세션 화면 ${session}` }])
      })

      // 설정을 되돌린다(뒤 장면이 같은 설정으로 찍히게)
      await page.getByRole('button', { name: '설정', exact: true }).click()
      await settle(page, 600)
      await tempoSwitch.click({ force: true })
      await settle(page, 300)
      const tempoOn2 = await tempoSwitch.evaluate((e) => e.checked)
      if (!light) flows.push(['SS6 템포 가이드 켜기', { ok: tempoOn0 === false && tempoOn1 === true && tempoOn2 === false && tempoButtons > 0, detail: `스위치 처음 ${tempoOn0} → 1탭 ${tempoOn1} → 세션 화면 세트 행의 ♩ 버튼이 있는 카드 ${tempoButtons}개 → 끔 ${tempoOn2}` }])
      await page.getByRole('button', { name: '홈', exact: true }).click()
      await settle(page, 500)
    })
    // SS6: 템포 가이드 켜기 흐름은 sheet-tempo 장면 안에서 잰다 — 장면이 건너뛰어졌으면 못 쟀으니 실패다(건너뜀 금지)
    if (!light && !flows.some((fl) => fl[0] === 'SS6 템포 가이드 켜기')) flows.push(['SS6 템포 가이드 켜기', { ok: false, detail: 'sheet-tempo 장면이 건너뛰어졌거나 예외로 끝나 재지 못했다' }])
    // 시드한 세션을 지운다(뒤 장면 기록·분석·홈이 시드 없는 예시 데이터로 찍히게). 위 장면이 건너뜀이어도 돈다
    await optional('seed-cleanup', async () => {
      await unseedWatch()
      await page.reload()
      await page.getByRole('button', { name: '설정', exact: true }).waitFor()
      await settle(page, 800)
    })

    // 기록 — SS4: 달력·세션 줄이 다 보이게 시드를 심는다(식단 점 넷·같은 날 두 번째 세션(복귀)·루틴에 없는 종목·보조 무게 세션). 종목별 장면 뒤에 되돌린다.
    // 시드가 실패하면 SS4 흐름 전부가 실패다(조용히 건너뛰지 않는다).
    const SS4_NAMES = ['SS4 시드 심기', 'SS4 달력 칸 이름', 'SS4 달력 칸 신호 구분', 'SS4 달력 칸 일곱 한 줄', 'SS4 날짜 고르기', 'SS4 다른 달', 'SS4 종목별 → 세션', 'SS4 보조 무게 종목']
    let ss4Seed = null
    const backToHistory = async () => {
      await page.reload()
      await page.getByRole('button', { name: '기록', exact: true }).click()
      await settle(page, 800)
    }
    // ClickableCard의 이름 붙은 button은 눈에 안 보이는 안쪽 부품이다 — 사람이 누르는 카드 면(바로 위 상자)을 누른다
    const tapCard = (loc) => loc.locator('xpath=..').click()
    const ss4Back = async () => {
      await page.locator('.ax-screen').getByRole('button', { name: '기록', exact: true }).click()
      await settle(page, 400)
    }
    /** SS4 화면 검증자 추가: 장면마다 390·375에서 inPageSs4Verify 값을 기록 목록에 찍는다(판정은 보고서에서 사람이 읽고 한다) */
    const ss4Verify = (scene) => guardedFlow([`SS4 검증 ${scene}${light ? ' (라이트)' : ''}`], async () => {
      const out = []
      try {
        for (const w of [390, 375]) {
          await page.setViewportSize({ width: w, height: w === 375 ? 812 : 844 })
          await settle(page, 400)
          out.push([w, await page.evaluate(inPageSs4Verify)])
        }
      } finally {
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 400)
      }
      // 값만 찍는 기록이다 — 늘 통과로 세어 `흐름 통과` 개수를 부풀리지 않게 흐름이 아니라 기록 목록으로 보낸다(v1.21 SS8, SS4 리뷰 경미한 점 2)
      wrapNotes.push(`SS4 검증 ${scene}${light ? ' (라이트)' : ''} — ${out.map(([w, r]) => `${w}: ${JSON.stringify(r)}`).join(' || ')}`)
    })
    await guardedFlow(SS4_NAMES, async () => {
      ss4Seed = await page.evaluate(inPageHistorySeed)
      if (!light) flows.push(['SS4 시드 심기', { ok: true, detail: `같은 날(${ss4Seed.baseDate}) 두 번째 세션(복귀)·루틴에 없는 종목 · 보조 무게 세션(${ss4Seed.assistDate}) · 식단 ${ss4Seed.dates.join(' ')}` }])
    })
    try {
      await backToHistory()
      await snap('history')
      await ss4Verify('history')
      await wrapProbe('history')
      if (!light) await screenWrapFlow('SS4 history 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      if (!light) {
        // ② 칸 이름: 오늘 칸·세션 두 번인 칸·식단 점이 있는 칸 (하나라도 못 찾으면 실패)
        await guardedFlow(['SS4 달력 칸 이름'], async () => {
          const todayCell = page.locator('button.ax-cal-cell[data-today]')
          const todayName = (await todayCell.count()) === 1 ? await todayCell.getAttribute('aria-label') : null
          const twoCells = await page.getByRole('button', { name: /^\d+일 운동 2회/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
          const dietNames = await page.getByRole('button', { name: /식단 (준수|일부|미달|판정 전)$/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
          const kinds = new Set(dietNames.map((n) => n.split('식단 ')[1]))
          const startsOk = [todayName, ...twoCells, ...dietNames].every((n) => n && /^\d+일/.test(n))
          flows.push(['SS4 달력 칸 이름', { ok: todayName !== null && twoCells.length >= 1 && kinds.size === 4 && startsOk, detail: `오늘 칸 "${todayName}" · 두 번 운동한 칸 ${twoCells.length}개 "${twoCells[0]}" · 식단 점이 있는 칸 ${dietNames.length}개(종류 ${[...kinds].join('·')}) · 이름이 날짜로 시작 ${startsOk}` }])
        })
        // 한 줄에 일곱 칸: 겹침·잘림·가운데·간격·누르는 영역을 390·375에서 잰다
        await guardedFlow(['SS4 달력 칸 일곱 한 줄'], async () => {
          const out = []
          try {
            for (const w of [390, 375]) {
              await page.setViewportSize({ width: w, height: w === 375 ? 812 : 844 })
              await settle(page, 400)
              out.push([w, await page.evaluate(inPageCalendarFit)])
            }
          } finally {
            await page.setViewportSize({ width: 390, height: 844 })
            await settle(page, 400)
          }
          flows.push(['SS4 달력 칸 일곱 한 줄', { ok: out.every(([, r]) => r.ok), detail: out.map(([w, r]) => `${w}: ${r.detail}`).join(' / ') }])
        })
      }
    await requiredScene('history-375', () => at375(() => snap('history-375')))
    // 세션이 있는 날(달력 칸의 🔥)을 고른 상태 — 그날 세션 줄 + 그날 식단 편집기. 끝에 "전체 보기"로 되돌린다
    await requiredScene('history-day', async () => {
      await page.getByRole('button', { name: /^\d+일 운동 \d+회/ }).first().click({ timeout: 3000 })
      await page.getByRole('button', { name: '전체 보기', exact: true }).waitFor({ timeout: 3000 })
      await settle(page, 800)
      await snap('history-day')
      await ss4Verify('history-day')
      // 화면 검증자 추가: 세션 카드는 가장자리(귀퉁이 6px 안)를 눌러도 열린다 — 안쪽 이름 붙은 button은 1x1이라 카드 면 전체가 누르는 영역이어야 한다
      await guardedFlow(['SS4 검증 세션 카드 가장자리 누르기'], async () => {
        const res = []
        for (const where of ['왼쪽 위', '오른쪽 아래', '오른쪽 가운데']) {
          const face = page.getByRole('button', { name: / \d{4}-\d{2}-\d{2}$/ }).first().locator('xpath=..')
          const box = await face.boundingBox()
          const pos = where === '왼쪽 위' ? { x: 6, y: 6 } : where === '오른쪽 아래' ? { x: box.width - 6, y: box.height - 6 } : { x: box.width - 6, y: box.height / 2 }
          await face.click({ position: pos })
          const opened = await page.getByRole('button', { name: '기록으로', exact: true }).waitFor({ timeout: 2500 }).then(() => true, () => false)
          res.push(`${where} ${opened ? '열림' : '안 열림'}`)
          if (opened) { await ss4Back(); await page.getByRole('button', { name: '전체 보기', exact: true }).waitFor({ timeout: 3000 }) }
        }
        flows.push(['SS4 검증 세션 카드 가장자리 누르기', { ok: res.every((r) => r.endsWith('열림') && !r.endsWith('안 열림')), detail: res.join(' · ') }])
      })
      histItemFace = await page.evaluate(inPageItemFace)
      // 기록 화면 전체가 Astryx다 — 화면 틀(.ax-screen) 안을 잰다
      if (!light) await screenWrapFlow('SS2 history-day 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      if (!light) await screenWrapFlow('SS4 history-day 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      if (!light) {
        // ① 날짜 고르기 → 그날 세션 카드와 그날 식단 → 세션 카드 1탭 → 상세 제목 → `기록` 1탭으로 돌아온다
        await guardedFlow(['SS4 날짜 고르기'], async () => {
          const cards = page.getByRole('button', { name: / \d{4}-\d{2}-\d{2}$/ })
          const nCards = await cards.count()
          const dietHeads = await page.getByRole('heading', { level: 2, name: /^\d{4}-\d{2}-\d{2} 식단$/ }).count()
          await tapCard(cards.first())
          await page.getByRole('button', { name: '기록으로', exact: true }).waitFor({ timeout: 3000 })
          const title = (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim() ?? ''
          await ss4Back()
          const kept = await page.getByRole('button', { name: '전체 보기', exact: true }).count()
          flows.push(['SS4 날짜 고르기', { ok: nCards >= 1 && dietHeads === 1 && title.length > 0 && kept === 1, detail: `그날 세션 카드 ${nCards}개 · 그날 식단 제목 ${dietHeads}개 · 상세 제목 "${title}" · 돌아온 뒤 고른 날 유지(전체 보기 ${kept}개)` }])
        })
        // 오늘·고른 날·🔥·식단 점이 서로 구분되는가 — 오늘이 아닌 🔥 칸(보조 무게 세션의 날)을 골라서 잰다
        await guardedFlow(['SS4 달력 칸 신호 구분'], async () => {
          const assistDay = Number(ss4Seed.assistDate.slice(8))
          await page.getByRole('button', { name: '전체 보기', exact: true }).click()
          await page.getByRole('button', { name: new RegExp(`^${assistDay}일 운동 1회`) }).first().click()
          await page.getByRole('button', { name: '전체 보기', exact: true }).waitFor({ timeout: 3000 })
          await settle(page, 400)
          const r = await page.evaluate(inPageCalendarSignals)
          flows.push(['SS4 달력 칸 신호 구분', { ok: r.ok, detail: r.detail }])
          // 처음 고른 날로 되돌린다(뒤 스크린샷·흐름이 같은 상태에서)
          await page.getByRole('button', { name: '전체 보기', exact: true }).click()
          await settle(page, 300)
        })
        // ③ 다른 달: 이전 달 1탭 → 고른 날짜가 풀리고, 다음 달 1탭으로 돌아온다
        await guardedFlow(['SS4 다른 달'], async () => {
          await page.getByRole('button', { name: /^\d+일 운동/ }).first().click()
          await page.getByRole('button', { name: '전체 보기', exact: true }).waitFor({ timeout: 3000 })
          const before = await page.getByRole('heading', { level: 2 }).first().textContent()
          await btn(page, '이전 달').click()
          await settle(page, 400)
          const released = await page.getByRole('button', { name: '전체 보기', exact: true }).count()
          const header = await page.getByText('이 달의 세션', { exact: true }).count()
          const after = await page.getByRole('heading', { level: 2 }).first().textContent()
          const outDisabled = await page.locator('button.ax-cal-cell[data-out][disabled]').count()
          await btn(page, '다음 달').click()
          await settle(page, 400)
          flows.push(['SS4 다른 달', { ok: released === 0 && header === 1 && after !== before, detail: `이전 달 → 전체 보기 ${released}개(0이어야) · "이 달의 세션" ${header}개 · 달 이름 "${before}" → "${after}" · 다른 달 칸 중 눌리지 않는 것 ${outDisabled}개 · 다음 달로 돌아옴` }])
        })
      }
      await page.getByRole('button', { name: /^\d+일 운동/ }).first().waitFor({ timeout: 3000 })
      const stillSelected = await page.getByRole('button', { name: '전체 보기', exact: true }).count()
      if (stillSelected) await page.getByRole('button', { name: '전체 보기', exact: true }).click()
      await settle(page, 400)
    })
    // 종목별: 목록과 한 종목(메모 이력이 보이게 끝난 세션에 감각 메모를 심었다가 되돌린다)
    await requiredScene(['history-exercise', 'history-exercise-detail'], async () => {
      const originals = await page.evaluate(inPageNoteSeed, null)
      try {
        await page.reload()
        await page.getByRole('button', { name: '기록', exact: true }).click()
        await settle(page, 600)
        await page.getByRole('radio', { name: '종목별', exact: true }).click()
        const keyCards = page.getByRole('button', { name: / D\d$/ })
        await keyCards.first().waitFor({ timeout: 4000 })
        await settle(page, 500)
        await snap('history-exercise')
      await ss4Verify('history-exercise')
        if (!light) await screenWrapFlow('SS4 history-exercise 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
        await tapCard(keyCards.first())
        await page.getByText(/^메모 이력 \(\d+\)$/).waitFor({ timeout: 4000 })
        await settle(page, 500)
        await snap('history-exercise-detail')
      await ss4Verify('history-exercise-detail')
        await wrapProbe('history-exercise-detail')
        if (!light) await screenWrapFlow('SS4 history-exercise-detail 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
        await btn(page, '종목 목록').click()
        await settle(page, 300)
        if (!light) {
          // ④ 종목별 → 세션: 종목 1탭 → 그 종목의 세션 카드 1탭 → 상세 제목 → `기록` 1탭으로 목록에 돌아온다(루틴에 없는 종목 뱃지가 목록에 있다)
          await guardedFlow(['SS4 종목별 → 세션'], async () => {
            const nKeys = await keyCards.count()
            const ghost = await page.getByText('현재 루틴에 없음', { exact: true }).count()
            await tapCard(keyCards.first())
            const sessionCards = page.getByRole('button', { name: /요일 세션$/ })
            await sessionCards.first().waitFor({ timeout: 3000 })
            const nSessions = await sessionCards.count()
            await tapCard(sessionCards.first())
            await page.getByRole('button', { name: '기록으로', exact: true }).waitFor({ timeout: 3000 })
            const title = (await page.getByRole('heading', { level: 1 }).first().textContent())?.trim() ?? ''
            await ss4Back()
            const back = await keyCards.count()
            flows.push(['SS4 종목별 → 세션', { ok: nKeys >= 2 && ghost >= 1 && nSessions >= 1 && title.length > 0 && back > 0, detail: `종목 카드 ${nKeys}개 · 현재 루틴에 없음 뱃지 ${ghost}개 · 종목의 세션 카드 ${nSessions}개 · 상세 제목 "${title}" · 돌아온 목록 카드 ${back}개` }])
          })
          // ⑤ 보조 무게 종목: e1RM·최고 뱃지·볼륨이 없고 안내 글자의 계산된 색 = 경고 토큰(라이트·다크 둘 다)
          await guardedFlow(['SS4 보조 무게 종목'], async () => {
            await tapCard(page.getByRole('button', { name: /^어시스티드 풀업 D\d$/ }).first())
            await page.getByText(/보조 무게 종목/).waitFor({ timeout: 3000 })
            const e1rm = await page.getByText(/최고 e1RM/).count()
            const bestBadge = await page.getByText('최고', { exact: true }).count()
            const volume = await page.getByText('kg·회', { exact: true }).count()
            const warn = await warnColorBothSchemes('.ax-text-warning', '보조 무게 종목', 'warning')
            const wrapped = await page.evaluate(inPageInnerOverflow, '.ax-screen')
            await btn(page, '종목 목록').click()
            await settle(page, 300)
            flows.push(['SS4 보조 무게 종목', { ok: e1rm === 0 && bestBadge === 0 && volume === 0 && warn.same && wrapped.ok, detail: `e1RM ${e1rm}개 · 최고 뱃지 ${bestBadge}개 · 볼륨(kg·회) ${volume}개 · 안내 글자 계산된 색 ${warn.actual} (토큰 ${warn.token}) · ${wrapped.detail}` }])
          })
        }
        await page.getByRole('radio', { name: '달력', exact: true }).click()
        await settle(page, 400)
      } finally {
        await page.evaluate(inPageNoteSeed, originals)
        await page.reload()
        await page.getByRole('button', { name: '기록', exact: true }).click()
        await settle(page, 800)
      }
    })
    } finally {
      if (ss4Seed) {
        await page.evaluate(inPageHistoryRestore, ss4Seed)
        await backToHistory()
      }
    }
    await requiredScene(['history-detail', 'history-detail-end'], async () => {
      await tapCard(page.getByRole('button', { name: / \d{4}-\d{2}-\d{2}$/ }).first())
      await page.getByRole('button', { name: '기록으로', exact: true }).waitFor({ timeout: 3000 })
      await settle(page, 800)
      await snap('history-detail')
      await ss4Verify('history-detail')
      await wrapProbe('history-detail')
      if (!light) await screenWrapFlow('SS4 history-detail 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      if (!light) {
        // 안 눌린 토글이 맨 글자가 되지 않게: 유산소 종류 토글은 눌리지 않았을 때도 면이나 테두리가 있고, 눌린 것과 다르다
        await guardedFlow(['SS4 상세 유산소 토글 맨 글자 아님'], async () => {
          const r = await page.evaluate(() => {
            const label = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && e.textContent.trim() === '유산소')
            let c = label
            while (c && !c.querySelector('button[aria-pressed]')) c = c.parentElement
            const toggles = c ? [...c.querySelectorAll('button[aria-pressed]')] : []
            const face = (b) => { const s = getComputedStyle(b); return { bg: s.backgroundColor, border: parseFloat(s.borderTopWidth), h: Math.round(b.getBoundingClientRect().height) } }
            const faces = toggles.map(face)
            const bare = toggles.filter((b, i) => b.getAttribute('aria-pressed') !== 'true' && (faces[i].bg === 'rgba(0, 0, 0, 0)' || faces[i].bg === 'transparent') && faces[i].border === 0).map((b) => b.textContent.trim())
            return { n: toggles.length, bare, heights: [...new Set(faces.map((f) => f.h))] }
          })
          flows.push(['SS4 상세 유산소 토글 맨 글자 아님', { ok: r.n >= 2 && r.bare.length === 0 && r.heights.length === 1, detail: `유산소 토글 ${r.n}개 · 맨 글자(면·테두리 없음) [${r.bare.join(', ')}] · 높이 ${r.heights.join('/')}px` }])
        })
      }
      await toEnd()
      await snap('history-detail-end')
      await ss4Verify('history-detail-end')
      await toTop()
      // Day 변경: 다른 Day를 고르면 기록 키 재매핑 표가 보이는 상태 (재매핑이 있는 Day가 나올 때까지 후보를 차례로 눌러 본다)
      await requiredScene('history-detail-change', async () => {
        await btn(page, '잘못된 Day로 기록했나요?').click({ timeout: 3000 })
        // 안내 문구 바로 뒤의 Day 후보만 고른다
        const pills = page.getByText('이 세션을 어느 Day로 옮길까요?').locator('xpath=following-sibling::*[1]').getByRole('button')
        const n = await pills.count()
        if (n === 0) throw new Error('Day 후보가 없다')
        let shown = false
        for (let i = 0; i < n && !shown; i++) {
          await pills.nth(i).click()
          shown = await page.getByText(/기록 키 재매핑 \d+건/).waitFor({ timeout: 1200 }).then(() => true, () => false)
          // 재매핑이 없는 Day면 확인 화면의 취소로 Day 목록에 돌아와 다음 후보를 누른다
          if (!shown) {
            await btn(page, '취소').click()
            await settle(page, 200)
          }
        }
        if (!shown) throw new Error('재매핑 표가 보이는 Day가 없다')
        await page.getByText(/기록 키 재매핑 \d+건/).scrollIntoViewIfNeeded()
        await settle(page, 500)
        await snap('history-detail-change')
      await ss4Verify('history-detail-change')
        if (!light) await screenWrapFlow('SS4 history-detail-change 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
        // ⑥ Day 변경 2단계(취소로 끝낸다 — 기록을 안 바꾼다): 2단계(변경 적용·취소)에서 취소 → 1단계(Day 고르기)에서 취소 → 진입 버튼
        if (!light) {
          await guardedFlow(['SS4 Day 변경 2단계'], async () => {
            const apply = await btn(page, '변경 적용').count()
            const cancel2 = await btn(page, '취소').count()
            await btn(page, '취소').click()
            await settle(page, 300)
            const step1 = await page.getByText('이 세션을 어느 Day로 옮길까요?').count()
            await btn(page, '취소').click()
            await settle(page, 300)
            const entry = await btn(page, '잘못된 Day로 기록했나요?').count()
            flows.push(['SS4 Day 변경 2단계', { ok: apply === 1 && cancel2 === 1 && step1 === 1 && entry === 1, detail: `2단계: 변경 적용 ${apply}개·취소 ${cancel2}개 → 취소 → 1단계 안내 ${step1}개 → 취소 → 진입 버튼 ${entry}개(기록은 안 바꿨다)` }])
          })
        } else {
          await btn(page, '취소').click()
          await settle(page, 300)
        }
        await toTop()
      })
      // 기록 편집에서 카드를 펼친 상태 (RR7의 세트 숫자·섬 버튼을 볼 장면)
      await requiredScene('history-detail-edit', async () => {
        await page.locator('button[aria-expanded]').first().click({ timeout: 3000 })
        await settle(page, 500)
        await snap('history-detail-edit')
      })
      if (!light) {
        // ⑦ 위험 구역 2단 확인(취소로 끝낸다): 삭제 버튼 → 확인 문구(오류 색)·정말 삭제·취소 → 취소 → 삭제 버튼. 세션은 그대로다
        await guardedFlow(['SS4 위험 구역 2단 확인'], async () => {
          await btn(page, '이 세션 삭제').scrollIntoViewIfNeeded()
          await btn(page, '이 세션 삭제').click()
          await page.getByText('이 세션 기록이 삭제됩니다. 되돌릴 수 없습니다.').waitFor({ timeout: 3000 })
          const sure = await btn(page, '정말 삭제').count()
          const err = await warnColorBothSchemes('.ax-text-error', '이 세션 기록이 삭제됩니다', 'error')
          await btn(page, '취소').click()
          await settle(page, 300)
          const entry = await btn(page, '이 세션 삭제').count()
          const alive = await page.getByRole('button', { name: '기록으로', exact: true }).count()
          flows.push(['SS4 위험 구역 2단 확인', { ok: sure === 1 && err.same && entry === 1 && alive === 1, detail: `정말 삭제 ${sure}개 · 확인 글자 계산된 색 ${err.actual} (토큰 ${err.token}) · 취소 뒤 삭제 버튼 ${entry}개 · 세션 화면 ${alive}개(안 지웠다)` }])
          await toTop()
        })
      }
      await ss4Back()
    })

    // 분석 — SS5: 차트·종목 줄·감각 점·약한 종목 경고·대체 수행이 다 보이게 끝난 세션 일곱을 심고 Phase 2로 다시 연다(B그룹 종목도 추이에 든다).
    // 시드가 실패하면 SS5 흐름 전부가 실패다(조용히 건너뛰지 않는다). 흐름이 끝나면 원래대로 돌린다.
    const SS5_NAMES = ['SS5 시드 심기', 'SS5 종목 바꾸기', 'SS5 종목 칩 맨 글자 아님', 'SS5 지표 바꾸기', 'SS5 감각 점 이름·네 단계', 'SS5 B그룹 경고 글자 색', 'SS5 한 줄 부품 겹침·잘림·세로 가운데', 'SS5 실행 중 색 체계 전환', 'SS5 analyze 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'SS5 analyze 맨 아래 카드가 탭 바 위']
    let ss5Seed = null
    let ss5Phase = null
    const ss5Reopen = async () => {
      await page.reload()
      await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 8000 })
      await settle(page, 600)
    }
    await guardedFlow(['SS5 시드 심기'], async () => {
      ss5Seed = await page.evaluate(inPageAnalyzeSeed, { days: ROUTINE_DAYS })
      ss5Phase = await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: 2 })
      await ss5Reopen()
      if (!light) flows.push(['SS5 시드 심기', { ok: true, detail: `끝난 세션 ${ss5Seed.sessionIds.length}개(${ss5Seed.dayId}) · Phase 2` }])
    })
    if (!ss5Seed && !light) for (const n of SS5_NAMES) if (!flows.some((f) => f[0] === n)) flows.push([n, { ok: false, detail: '시드를 못 심어 재지 못했다' }])
    await page.getByRole('button', { name: '분석', exact: true }).click()
    await page.locator('svg.recharts-surface, .recharts-wrapper').first().waitFor({ timeout: 8000 }).catch(() => {})
    await settle(page, 1200)
    await snap('analyze')
    await wrapProbe('analyze')
    if (ss5Seed && !light) {
      await screenWrapFlow('SS5 analyze 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      // 종목 칩: 처음 하나가 눌려 있고(aria-pressed) 둘째를 누르면 그것만 눌리며 최근 값 줄이 그 종목 이름으로 바뀐다. 다시 눌러도 꺼지지 않는다(한 종목은 늘 골라진다)
      await guardedFlow(['SS5 종목 바꾸기'], async () => {
        const chips = page.locator('.ax-chips button')
        const n = await chips.count()
        const state = () => chips.evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')))
        const recent = () => page.getByText(/ · 최근 \d/).first().innerText()
        const names = await chips.evaluateAll((els) => els.map((e) => e.innerText.trim())) // innerText: 보이는 글자만(textContent는 안 보이는 라벨 사본까지 이어 붙는다)
        const before = await state()
        const text0 = await recent()
        await chips.nth(1).click()
        await settle(page, 300)
        const mid = await state()
        const text1 = await recent()
        await chips.nth(1).click()
        await settle(page, 200)
        const again = await state()
        await chips.nth(0).click()
        await settle(page, 300)
        const back = await state()
        const key = (label) => label.replace(/ (D\d)( · B)?$/, ' ($1)')
        const conds = { 칩4개이상: n >= 4, 처음하나눌림: before[0] === 'true' && before.filter((s) => s === 'true').length === 1, 둘째눌림: mid[1] === 'true' && mid.filter((s) => s === 'true').length === 1, 둘째이름: text1.startsWith(key(names[1])), 첫째이름: text0.startsWith(key(names[0])), 줄바뀜: text0 !== text1, 다시눌러도유지: again[1] === 'true' && again.filter((s) => s === 'true').length === 1, 첫째로복귀: back[0] === 'true' }
        const failedConds = Object.entries(conds).filter(([, v]) => !v).map(([k]) => k)
        const ok = failedConds.length === 0
        flows.push(['SS5 종목 바꾸기', { ok, detail: `${failedConds.length ? `틀린 조건 ${failedConds.join(',')} (칩 이름 ${names.slice(0, 2).join(' / ')}) · ` : ''}칩 ${n}개 · 처음 눌림 ${before.indexOf('true')} → 둘째 누르면 ${mid.indexOf('true')}(눌린 것 ${mid.filter((s) => s === 'true').length}개) · 최근 줄 "${text0.slice(0, 18)}" → "${text1.slice(0, 18)}" · 다시 눌러도 눌림 ${again[1]} · 첫째로 돌아옴 ${back[0]}` }])
      })
      // 안 눌린 칩도 맨 글자가 아니다: 바탕 알파 > 0·테두리 있음, 눌린 칩과 바탕이 다르고, 높이가 모두 같다
      await guardedFlow(['SS5 종목 칩 맨 글자 아님'], async () => {
        const r = await page.locator('.ax-chips button').evaluateAll((els) => els.map((e) => {
          const cs = getComputedStyle(e)
          const alpha = (c) => { const m = /rgba?\([^)]*?(?:,\s*([\d.]+))?\)$/.exec(c); return m && m[1] !== undefined ? Number(m[1]) : 1 }
          return { pressed: e.getAttribute('aria-pressed'), bg: cs.backgroundColor, bgA: alpha(cs.backgroundColor), border: parseFloat(cs.borderTopWidth), h: Math.round(e.getBoundingClientRect().height) }
        }))
        const off = r.filter((x) => x.pressed === 'false')
        const on = r.filter((x) => x.pressed === 'true')
        const bare = off.filter((x) => !(x.bgA > 0 && x.border >= 1))
        const sameAsPressed = off.filter((x) => on.some((o) => o.bg === x.bg))
        const heights = [...new Set(r.map((x) => x.h))]
        flows.push(['SS5 종목 칩 맨 글자 아님', { ok: r.length >= 4 && on.length === 1 && bare.length === 0 && sameAsPressed.length === 0 && heights.length === 1, detail: `칩 ${r.length}개 · 눌림 ${on.length}개 · 맨 글자(바탕·테두리 없음) ${bare.length}개 · 눌린 칩과 바탕이 같은 것 ${sameAsPressed.length}개 · 높이 ${heights.join('/')}px · 안 눌린 바탕 ${off[0]?.bg} / 눌린 바탕 ${on[0]?.bg}` }])
      })
      // 지표: 라디오 셋 가운데 하나만 aria-checked. 볼륨을 누르면 선이 달라지고(path d) 안 바뀐 채 남지 않는다. 원래 지표로 돌려놓는다
      await guardedFlow(['SS5 지표 바꾸기'], async () => {
        const radios = page.getByRole('radiogroup', { name: '지표' }).getByRole('radio')
        const checked = () => radios.evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')))
        const line = () => page.locator('.ax-chart .recharts-line-curve').first().getAttribute('d')
        const c0 = await checked()
        const d0 = await line()
        await page.getByRole('radio', { name: '볼륨', exact: true }).click()
        await settle(page, 700)
        const c1 = await checked()
        const d1 = await line()
        await page.getByRole('radio', { name: 'e1RM', exact: true }).click()
        await settle(page, 700)
        const c2 = await checked()
        await page.getByRole('radio', { name: '무게×횟수', exact: true }).click()
        await settle(page, 700)
        const c3 = await checked()
        const one = (c, i) => c.filter((x) => x === 'true').length === 1 && c[i] === 'true'
        flows.push(['SS5 지표 바꾸기', { ok: (await radios.count()) === 3 && one(c0, 0) && one(c1, 1) && one(c2, 2) && one(c3, 0) && d0 !== null && d1 !== null && d0 !== d1, detail: `라디오 3개 · 눌림 ${c0.indexOf('true')} → 볼륨 ${c1.indexOf('true')} → e1RM ${c2.indexOf('true')} → 무게×횟수 ${c3.indexOf('true')} · 선 모양이 바뀜 ${d0 !== d1}` }])
      })
      // 감각 점: 점마다 aria-label이 있고(0개면 실패) 기록 없는 주는 `기록 없음`, 값이 있는 주는 `N.N점`. 네 계열(none·warn·accent·ok)은 계산된 색이 서로 다르고 네 단계는 불투명도가 올라간다
      await guardedFlow(['SS5 감각 점 이름·네 단계'], async () => {
        const dots = await page.locator('.ax-sdot[role=img]').evaluateAll((els) => els.map((e) => {
          const cs = getComputedStyle(e)
          return { label: e.getAttribute('aria-label') ?? '', tone: e.getAttribute('data-tone'), level: e.getAttribute('data-level'), bg: cs.backgroundColor, op: Number(cs.opacity) }
        }))
        const unnamed = dots.filter((d) => !d.label.trim())
        const none = dots.filter((d) => d.tone === 'none')
        const valued = dots.filter((d) => d.tone !== 'none')
        const noneOk = none.every((d) => d.label.endsWith('기록 없음'))
        const valuedOk = valued.every((d) => /\d\.\d점$/.test(d.label))
        const tones = [...new Set(dots.map((d) => d.tone))].sort()
        const colors = new Set(['none', 'warn', 'accent', 'ok'].map((t) => dots.find((d) => d.tone === t)?.bg))
        const ops = [0, 1, 2, 3].map((l) => dots.find((d) => d.level === String(l))?.op)
        const rising = ops.every((o, i) => o !== undefined && (i === 0 || o > ops[i - 1]))
        flows.push(['SS5 감각 점 이름·네 단계', { ok: dots.length > 0 && unnamed.length === 0 && none.length > 0 && noneOk && valuedOk && tones.join() === 'accent,none,ok,warn' && colors.size === 4 && !colors.has(undefined) && rising, detail: `점 ${dots.length}개 · 이름 없는 점 ${unnamed.length}개 · 기록 없음 ${none.length}개(이름 끝 "기록 없음" ${noneOk}) · 값 있는 점 이름 "N.N점" ${valuedOk} · 계열 ${tones.join('·')}의 계산된 바탕 ${colors.size}가지 · 불투명도 ${ops.join('→')}` }])
      })
      // B그룹 종목을 고르면 안내가 경고 색(--color-text-warning)으로 나온다 — 클래스 유무가 아니라 계산된 color를 두 색 체계에서 잰다
      await guardedFlow(['SS5 B그룹 경고 글자 색'], async () => {
        const chips = page.locator('.ax-chips button')
        const labels = await chips.evaluateAll((els) => els.map((e) => e.innerText.trim()))
        const bi = labels.findIndex((l) => l.endsWith('· B'))
        const ai = labels.findIndex((l) => !l.endsWith('· B'))
        if (bi < 0 || ai < 0) throw new Error(`A·B 칩이 다 있어야 한다: ${labels.join(' / ')}`)
        await chips.nth(bi).click()
        await settle(page, 400)
        const onB = await warnColorBothSchemes('.ax-screen .ax-text-warning', 'B그룹 기준은 감각입니다')
        await chips.nth(ai).click()
        await settle(page, 400)
        const onA = await page.getByText('B그룹 기준은 감각입니다', { exact: false }).count()
        await chips.nth(0).click()
        await settle(page, 300)
        flows.push(['SS5 B그룹 경고 글자 색', { ok: onB.same && onA === 0, detail: `B 종목에서 경고 글자 계산된 색 ${onB.actual} (토큰 ${onB.token}) · A 종목에서 경고 ${onA}개` }])
      })
      await guardedFlow(['SS5 한 줄 부품 겹침·잘림·세로 가운데'], async () => {
        const out = []
        try {
          for (const w of [390, 375]) {
            await page.setViewportSize({ width: w, height: w === 375 ? 812 : 844 })
            await settle(page, 400)
            out.push([w, await page.evaluate(inPageAnalyzeRows)])
          }
        } finally {
          await page.setViewportSize({ width: 390, height: 844 })
          await settle(page, 400)
        }
        flows.push(['SS5 한 줄 부품 겹침·잘림·세로 가운데', { ok: out.every(([, r]) => r.ok), detail: out.map(([w, r]) => `${w}: ${r.detail}`).join(' / ') }])
      })
      // 실행 중 색 체계 전환: 다크에서 연 채 라이트로 바꾸면(새로 고침 없이) 선 색과 축 색이 바뀌고, 계산된 선 색이 화면 안 토큰(--color-accent) 값과 같다
      await guardedFlow(['SS5 실행 중 색 체계 전환'], async () => {
        const token = () => page.evaluate(() => {
          const probe = document.createElement('span')
          probe.style.color = 'var(--color-accent)'
          document.querySelector('.ax-screen').appendChild(probe)
          const c = getComputedStyle(probe).color
          probe.remove()
          return c
        })
        const A = await page.evaluate(inPageChartColors)
        const tA = await token()
        await page.emulateMedia({ colorScheme: light ? 'dark' : 'light' })
        await settle(page, 600)
        const B = await page.evaluate(inPageChartColors)
        const tB = await token()
        await page.emulateMedia({ colorScheme: scheme })
        await settle(page, 600)
        const back = await page.evaluate(inPageChartColors)
        const hasLine = (await page.locator('.ax-chart .recharts-line-curve').count()) > 0
        flows.push(['SS5 실행 중 색 체계 전환', { ok: hasLine && A.line !== B.line && A.tick !== B.tick && back.line === A.line && A.line === tA && B.line === tB, detail: `선 ${A.line} → ${B.line} → ${back.line} · 축 ${A.tick} → ${B.tick} · 화면 토큰 --color-accent ${tA} → ${tB}(선 색과 같다 ${A.line === tA && B.line === tB}) · 추이 선 있음 ${hasLine}` }])
      })
    }
    await requiredScene('analyze-end', async () => {
      await toEnd()
      await snap('analyze-end')
      if (ss5Seed && !light) {
        await guardedFlow(['SS5 analyze 맨 아래 카드가 탭 바 위'], async () => {
          const r = await page.evaluate(() => {
            const bar = document.querySelector('.ax-bar-bottom')
            const cards = [...document.querySelectorAll('.ax-screen .ax-group > *')]
            const last = cards[cards.length - 1]
            return { barTop: bar ? Math.round(bar.getBoundingClientRect().top) : null, bottom: last ? Math.round(last.getBoundingClientRect().bottom) : null, n: cards.length }
          })
          flows.push(['SS5 analyze 맨 아래 카드가 탭 바 위', { ok: r.barTop !== null && r.bottom !== null && r.bottom <= r.barTop && r.n >= 4, detail: `카드 ${r.n}장 · 맨 아래 카드 아래끝 ${r.bottom} / 탭 바 위 ${r.barTop}` }])
        })
      }
      await toTop()
    })
    await requiredScene('analyze-375', () => at375(() => snap('analyze-375')))
    // 되돌리기는 판정과 따로: 던져도 다음 장면이 깨끗한 데이터에서 시작하게 하고, 못 되돌리면 흐름 실패다
    if (ss5Seed) {
      await guardedFlow(['SS5 되돌리기'], async () => {
        await page.evaluate(inPageHistoryRestore, { sessionIds: ss5Seed.sessionIds, dates: [], prev: [] })
        if (ss5Phase) await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: ss5Phase.value, remove: !ss5Phase.had })
        await ss5Reopen()
        if (!light) flows.push(['SS5 되돌리기', { ok: true, detail: '심은 세션 지움 · Phase 원래대로' }])
      })
    }

    // 식단
    await page.getByRole('button', { name: '식단', exact: true }).click()
    await settle(page, 800)
    await snap('diet')
    await wrapProbe('diet')
    if (!light) await screenWrapFlow('SS2 diet 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
    await requiredScene('diet-end', async () => {
      await toEnd()
      await snap('diet-end')
      await toTop()
      if (!light) await screenWrapFlow('SS2 diet-end 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
    })
    await requiredScene('diet-375', () => at375(() => snap('diet-375')))
    // 플랜 전환 시트와 "내일부터" 1~3일 고르는 상태
    await requiredScene(['sheet-diet-plan', 'sheet-diet-plan-ahead'], async () => {
      // 요약 카드의 플랜 버튼 — 식단 틀 안 첫 버튼(이름이 플랜 이름이라 글자로 못 고른다)
      await page.locator('.ax-screen button').first().click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: '식단 플랜 전환' })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page)
      await snap('sheet-diet-plan')
      await ss3Probe(`SS3 검증 sheet-diet-plan 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      await wrapProbe('sheet-diet-plan', 'dialog[open]')
      if (!light) await screenWrapFlow('SS3 sheet-diet-plan 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await dlg.getByRole('button', { name: /^내일부터 / }).first().click()
      await dlg.getByText('내일부터 며칠').waitFor({ timeout: 3000 })
      await settle(page, 300)
      await snap('sheet-diet-plan-ahead')
      await ss3Probe(`SS3 검증 sheet-diet-plan-ahead 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      if (!light) await screenWrapFlow('SS3 sheet-diet-plan-ahead 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await closeSheet('식단 플랜 전환')
    })
    // 끼니 시트(메뉴)와 "대체했어요"를 누른 입력 상태
    await requiredScene(['sheet-diet-slot', 'sheet-diet-slot-edit'], async () => {
      await page.getByRole('button', { name: /^대체·안 먹음 — 아침$/ }).click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: /기록$/ })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page)
      await snap('sheet-diet-slot')
      await ss3Probe(`SS3 검증 sheet-diet-slot 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      await wrapProbe('sheet-diet-slot', 'dialog[open]')
      if (!light) await screenWrapFlow('SS3 sheet-diet-slot 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await dlg.getByRole('button', { name: '대체했어요', exact: true }).click()
      await dlg.getByText('어느 쪽이었나요').waitFor({ timeout: 3000 })
      await settle(page, 300)
      await snap('sheet-diet-slot-edit')
      await ss3Probe(`SS3 검증 sheet-diet-slot-edit 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      if (!light) await screenWrapFlow('SS3 sheet-diet-slot-edit 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await closeSheet(/기록$/)
    })
    // 단백질원 시트
    await requiredScene('sheet-diet-variant', async () => {
      await page.getByRole('button', { name: /^바꾸기 — .*다른 단백질원으로$/ }).first().click({ timeout: 3000 })
      await page.getByRole('dialog', { name: /단백질원 고르기$/ }).waitFor({ timeout: 3000 })
      await settle(page)
      await snap('sheet-diet-variant')
      await ss3Probe(`SS3 검증 sheet-diet-variant 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      await wrapProbe('sheet-diet-variant', 'dialog[open]')
      if (!light) await screenWrapFlow('SS3 sheet-diet-variant 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await closeSheet(/단백질원 고르기$/)
    })
    await requiredScene(['sheet-food', 'sheet-food-new'], async () => {
      await btn(page, '＋ 먹은 것 추가').click({ timeout: 3000 })
      await page.getByRole('dialog', { name: '먹은 것 추가' }).waitFor({ timeout: 3000 })
      await settle(page)
      await snap('sheet-food')
      await ss3Probe(`SS3 검증 sheet-food 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)

      if (!light) await screenWrapFlow('SS3 sheet-food 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')      // 새 음식 등록 폼 — 이름·분량·kcal·단백질 칸이 펼쳐진 상태
      await page.getByRole('dialog', { name: '먹은 것 추가' }).getByRole('button', { name: '새 음식 등록', exact: true }).click()
      await page.getByRole('dialog', { name: '먹은 것 추가' }).getByRole('textbox', { name: '음식 이름' }).waitFor({ timeout: 3000 })
      await settle(page, 300)
      await snap('sheet-food-new')
      await ss3Probe(`SS3 검증 sheet-food-new 끝까지 스크롤·겹침·누르는 영역${light ? ' (라이트)' : ''}`)
      if (!light) await screenWrapFlow('SS3 sheet-food-new 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', 'dialog[open]')
      await page.getByRole('dialog', { name: '먹은 것 추가' }).getByRole('button', { name: '취소', exact: true }).click()
      await settle(page, 300)
      // 시트에서 먹은 것을 하나 더해 두고 닫는다 — 아래 diet-log-open이 쓴다
      await page.getByRole('dialog', { name: '먹은 것 추가' }).getByRole('button', { name: /(kcal|g|영양 미입력)$/ }).first().click()
      await settle(page, 400)
      await closeSheet('먹은 것 추가')
    })
    // ─── SS3 흐름 — 식단 시트 넷. 흐름은 guardedFlow 안이라 예외가 나도 건너뜀이 아니라 흐름 실패가 된다. 끝나면 데이터를 원래대로 돌린다(뒤 장면이 같은 데이터를 쓴다)
    // 시트가 DOM에서 빠질 때까지 브라우저 안에서 잰다(첫 눌림 직전에 시작 — v1.20 RR5의 재는 방법)
    const goneTimer = (label) =>
      page.evaluate(
        (l) =>
          new Promise((resolve) => {
            const t0 = performance.now()
            const tick = () => (document.querySelector(`[aria-label="${l}"]`) ? requestAnimationFrame(tick) : resolve(Math.round(performance.now() - t0)))
            requestAnimationFrame(tick)
          }),
        label,
      )
    // Astryx 목록 줄(li > button)의 이름은 제목 + 설명이라 첫 줄이 줄 이름이다. 설명에 다른 줄 이름이 들어 있을 수 있어(예: "감량 1,800 대비") hasText가 아니라 첫 줄로 가른다
    const rowsOf = (dlg) => dlg.locator('li button')
    const firstLine = async (loc) => ((await loc.innerText()).split(String.fromCharCode(10))[0] ?? '').trim()
    const rowWhere = async (dlg, pred) => {
      for (const row of await rowsOf(dlg).all()) if (pred(await firstLine(row))) return row
      return null
    }
    const dietEntryCount = () => page.locator('.ax-screen button[aria-expanded]').filter({ hasNotText: '식사 알림' }).count()
    const slotSheetOpen = async () => {
      await toTop()
      await page.getByRole('button', { name: /^대체·안 먹음 — 아침$/ }).click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: /기록$/ })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page, 450)
      return dlg
    }
    const planBtn = () => page.locator('.ax-screen button').first()
    const planSheetOpen = async () => {
      await toTop()
      await planBtn().click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: '식단 플랜 전환' })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page, 450)
      return dlg
    }
    const SS3_PLAN = 'SS3 플랜 고르기: 다른 플랜 줄 1탭 → 시트가 내려가며 닫힌다(300ms 안팎) → 요약 카드의 플랜 이름이 바뀐다(원래대로 돌림)'
    await guardedFlow([SS3_PLAN], async () => {
      const before = (await planBtn().innerText()).trim()
      let dlg = await planSheetOpen()
      const nRows = await rowsOf(dlg).count()
      const pick = await rowWhere(dlg, (t) => t !== before)
      if (!pick) throw new Error('고를 다른 줄이 없다')
      const picked = await firstLine(pick)
      const goneIn = goneTimer('식단 플랜 전환')
      await pick.click()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const ms = await goneIn
      await settle(page, 400)
      const after = (await planBtn().innerText()).trim()
      // 원래 플랜으로 돌린다
      dlg = await planSheetOpen()
      await (await rowWhere(dlg, (t) => t === before))?.click()
      await dlg.waitFor({ state: 'detached', timeout: 1500 }).catch(() => undefined)
      await settle(page, 400)
      const restored = (await planBtn().innerText()).trim()
      flows.push([SS3_PLAN, { ok: nRows >= 2 && gone && ms >= 150 && ms <= 600 && after === picked && after !== before && restored === before, detail: `플랜 줄 ${nRows}개 · ${before} → ${after}(고른 줄 ${picked}) · 사라짐 ${gone}(${ms}ms) · 되돌린 뒤 ${restored}` }])
    })
    const SS3_AHEAD = 'SS3 내일부터 2일: 내일부터 → 1~3일 → 2일 1탭에 시트가 내려가며 닫힌다'
    await guardedFlow([SS3_AHEAD], async () => {
      const dlg = await planSheetOpen()
      await dlg.getByRole('button', { name: /^내일부터 / }).first().click()
      await dlg.getByText('내일부터 며칠').waitFor({ timeout: 3000 })
      const days = await dlg.getByRole('button', { name: /^[1-3]일$/ }).count()
      const goneIn = goneTimer('식단 플랜 전환')
      await dlg.getByRole('button', { name: '2일', exact: true }).click()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const ms = await goneIn
      await settle(page, 400)
      flows.push([SS3_AHEAD, { ok: days === 3 && gone && ms >= 150 && ms <= 600, detail: `일수 버튼 ${days}개 · 사라짐 ${gone}(${ms}ms)` }])
    })
    const SS3_SAVE = 'SS3 끼니 대체 저장: 대체했어요 → 글 입력 → 치팅 고름 → 저장 → 카드에 대체 메모 → 대체 지우기로 돌림'
    await guardedFlow([SS3_SAVE], async () => {
      const text = '회사 앞 샌드위치'
      let dlg = await slotSheetOpen()
      await dlg.getByRole('button', { name: '대체했어요', exact: true }).click()
      const field = dlg.getByRole('textbox', { name: '무엇으로 대체했나요' })
      await field.waitFor({ timeout: 3000 })
      const saveDisabled = await dlg.getByRole('button', { name: '저장', exact: true }).isDisabled()
      await field.fill(text)
      await dlg.getByRole('radio', { name: /치팅/ }).check()
      const radios = await dlg.getByRole('radio').count()
      const goneIn = goneTimer(await dlg.getAttribute('aria-label'))
      await dlg.getByRole('button', { name: '저장', exact: true }).click()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const ms = await goneIn
      await settle(page, 400)
      const note = await page.locator('.ax-screen').getByText(`대체: “${text}” · 치팅`).count()
      // 지운다: 시트를 다시 열면 메뉴가 먼저 나오고(AA3) 대체 지우기가 있다
      dlg = await slotSheetOpen()
      const hasClear = await dlg.getByRole('button', { name: '대체 지우기', exact: true }).count()
      await dlg.getByRole('button', { name: '대체 지우기', exact: true }).click()
      await dlg.waitFor({ state: 'detached', timeout: 1500 }).catch(() => undefined)
      await settle(page, 400)
      const noteAfter = await page.locator('.ax-screen').getByText(`대체: “${text}”`).count()
      // 대체 지우기는 슬롯 기록을 비워 두기만 한다(슬롯 기록이 남아 "기록 n/5슬롯"이 늘어난다) — 뒤 흐름이 같은 데이터를 쓰므로 기록 지우기로 슬롯째 돌린다
      dlg = await slotSheetOpen()
      const clearAll = await dlg.getByRole('button', { name: '기록 지우기', exact: true }).count()
      if (clearAll > 0) await dlg.getByRole('button', { name: '기록 지우기', exact: true }).click()
      else await dlg.getByRole('button', { name: '닫기', exact: true }).click()
      await dlg.waitFor({ state: 'detached', timeout: 1500 }).catch(() => undefined)
      await settle(page, 400)
      flows.push([SS3_SAVE, { ok: saveDisabled && radios === 3 && gone && ms >= 150 && ms <= 600 && note === 1 && hasClear === 1 && noteAfter === 0, detail: `글 없을 때 저장 꺼짐 ${saveDisabled} · 라디오 ${radios}개 · 사라짐 ${gone}(${ms}ms) · 카드 메모 ${note}개 → 지운 뒤 ${noteAfter}개` }])
    })
    const SS3_BACKDROP = 'SS3 입력 중 막 누름: 끼니 입력 상태에서 막을 누르고 끌어내려도 시트가 남고 친 글이 그대로(form)'
    await guardedFlow([SS3_BACKDROP], async () => {
      const text = '입력 중인 글'
      const dlg = await slotSheetOpen()
      await dlg.getByRole('button', { name: '추가로 먹었어요', exact: true }).click()
      const field = dlg.getByRole('textbox', { name: '무엇을 더 먹었나요' })
      await field.waitFor({ timeout: 3000 })
      await field.fill(text)
      const box = await dlg.boundingBox()
      // 막: 시트 위쪽 빈 곳
      await page.mouse.click(195, Math.max(5, Math.round((box?.y ?? 400) / 2)))
      await settle(page, 600)
      const afterBackdrop = await dlg.count()
      // 끌어내림: 시트 윗부분에서 아래로 300px
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + 8)
        await page.mouse.down()
        await page.mouse.move(box.x + box.width / 2, box.y + 320, { steps: 10 })
        await page.mouse.up()
        await settle(page, 700)
      }
      const afterDrag = await dlg.count()
      const kept = afterDrag === 1 ? await field.inputValue() : ''
      // Esc로는 닫힌다(닫는 길이 막힌 것이 아니다)
      await page.keyboard.press('Escape')
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      await settle(page, 400)
      flows.push([SS3_BACKDROP, { ok: afterBackdrop === 1 && afterDrag === 1 && kept === text && gone, detail: `막 누른 뒤 시트 ${afterBackdrop}개 · 끌어내린 뒤 ${afterDrag}개 · 친 글 "${kept}" · Esc로 닫힘 ${gone}` }])
    })
    const SS3_VARIANT = 'SS3 단백질원 바꾸기: 다른 줄 1탭 → 시트가 내려가며 닫히고 품목이 바뀐다(원래대로 돌림)'
    await guardedFlow([SS3_VARIANT], async () => {
      await toTop()
      const open = async () => {
        await page.getByRole('button', { name: /^바꾸기 — .*다른 단백질원으로$/ }).first().click({ timeout: 3000 })
        const d = page.getByRole('dialog', { name: /단백질원 고르기$/ })
        await d.waitFor({ timeout: 3000 })
        await settle(page, 450)
        return d
      }
      const chip = () => page.getByRole('button', { name: /^바꾸기 — .*다른 단백질원으로$/ }).first().locator('xpath=preceding::button[1]')
      const chipText = async () => ((await chip().getAttribute('aria-label')) ?? (await chip().innerText())).trim()
      const before = await chipText()
      let dlg = await open()
      const nRows = await rowsOf(dlg).count()
      const pick = await rowWhere(dlg, (t) => !before.includes(t))
      if (!pick) throw new Error('고를 다른 줄이 없다')
      const picked = await firstLine(pick)
      const goneIn = goneTimer(await dlg.getAttribute('aria-label'))
      await pick.click()
      const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
      const ms = await goneIn
      await settle(page, 400)
      const after = await chipText()
      dlg = await open()
      await (await rowWhere(dlg, (t) => before.includes(t)))?.click()
      await dlg.waitFor({ state: 'detached', timeout: 1500 }).catch(() => undefined)
      await settle(page, 400)
      const restored = await chipText()
      flows.push([SS3_VARIANT, { ok: nRows >= 2 && gone && ms >= 150 && ms <= 600 && after.includes(picked) && after !== before && restored === before, detail: `변형 줄 ${nRows}개 · ${before} → ${after}(고른 줄 ${picked}) · 사라짐 ${gone}(${ms}ms) · 되돌린 뒤 ${restored}` }])
    })
    const SS3_FOOD = 'SS3 먹은 것 추가 1탭: 음식 줄 1탭 → "방금 추가: 이름", 시트는 열린 채, 닫으면 먹은 것 카드에 한 줄(지움)'
    await guardedFlow([SS3_FOOD], async () => {
      await toTop()
      const n0 = await dietEntryCount()
      await btn(page, '＋ 먹은 것 추가').click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: '먹은 것 추가' })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page, 450)
      const row = rowsOf(dlg).filter({ hasText: /(kcal|영양 미입력)/ }).first()
      const rowText = await firstLine(row)
      const rowAria = await row.getAttribute('aria-label')
      await row.click()
      await settle(page, 400)
      const note = await dlg.getByText('방금 추가: ').count()
      const stillOpen = await dlg.count()
      await closeSheet('먹은 것 추가')
      await settle(page, 450)
      const n1 = await dietEntryCount()
      // 지운다: 방금 줄(마지막)을 펼쳐 삭제
      await page.locator('.ax-screen button[aria-expanded]').filter({ hasNotText: '식사 알림' }).last().click()
      await btn(page, '삭제').first().click()
      await settle(page, 400)
      const n2 = await dietEntryCount()
      flows.push([SS3_FOOD, { ok: note === 1 && stillOpen === 1 && n1 === n0 + 1 && n2 === n0 && rowAria === null, detail: `"${rowText}" 1탭 → 방금 추가 ${note}개 · 시트 열림 ${stillOpen} · 먹은 것 ${n0} → ${n1}줄 → 지운 뒤 ${n2}줄 · 음식 줄 aria-label ${rowAria}` }])
    })
    const SS3_NEW = 'SS3 새 음식 등록하고 추가: 이름·분량·칼로리·단백질 → 등록하고 추가 → 목록에 새 음식·먹은 것 카드에 한 줄(편집 → 목록에서 삭제로 돌림)'
    await guardedFlow([SS3_NEW], async () => {
      await toTop()
      const n0 = await dietEntryCount()
      await btn(page, '＋ 먹은 것 추가').click({ timeout: 3000 })
      const dlg = page.getByRole('dialog', { name: '먹은 것 추가' })
      await dlg.waitFor({ timeout: 3000 })
      await settle(page, 450)
      await dlg.getByRole('button', { name: '새 음식 등록', exact: true }).click()
      await dlg.getByRole('textbox', { name: '음식 이름' }).fill('검사용 닭가슴살')
      await dlg.getByRole('textbox', { name: '분량' }).fill('100g')
      await dlg.getByRole('textbox', { name: '칼로리' }).fill('165')
      await dlg.getByRole('textbox', { name: '단백질' }).fill('31')
      const decimal = await dlg.getByRole('textbox', { name: '칼로리' }).getAttribute('inputmode')
      await dlg.getByRole('button', { name: '등록하고 추가', exact: true }).click()
      await settle(page, 500)
      const listed = await dlg.getByRole('button', { name: /^검사용 닭가슴살/ }).count()
      const note = await dlg.getByText('방금 추가: 검사용 닭가슴살').count()
      // 지운다: 편집 → 목록에서 삭제 → 정말 삭제
      await dlg.getByRole('button', { name: '편집 — 검사용 닭가슴살', exact: true }).click()
      await dlg.getByRole('button', { name: '목록에서 삭제', exact: true }).click()
      await dlg.getByRole('button', { name: '정말 삭제', exact: true }).click()
      await settle(page, 400)
      const listedAfter = await dlg.getByRole('button', { name: /^검사용 닭가슴살/ }).count()
      await closeSheet('먹은 것 추가')
      await settle(page, 450)
      const n1 = await dietEntryCount()
      await page.locator('.ax-screen button[aria-expanded]').filter({ hasNotText: '식사 알림' }).last().click()
      await btn(page, '삭제').first().click()
      await settle(page, 400)
      const n2 = await dietEntryCount()
      flows.push([SS3_NEW, { ok: decimal === 'decimal' && listed >= 1 && note === 1 && listedAfter === 0 && n1 === n0 + 1 && n2 === n0, detail: `inputmode ${decimal} · 목록의 새 음식 ${listed}개·방금 추가 ${note}개 → 삭제 뒤 ${listedAfter}개 · 먹은 것 ${n0} → ${n1}줄 → 지운 뒤 ${n2}줄` }])
    })
    // 먹은 기록 한 줄을 펼친 상태 — 시각 입력칸·"먹은 개수" 스테퍼·삭제 버튼이 한 줄에 보인다
    await requiredScene('diet-log-open', async () => {
      // 먹은 것 줄의 펼침 버튼 — 식사 알림 펼침 버튼은 빼고 마지막 것
      await page.locator('.ax-screen button[aria-expanded]').filter({ hasNotText: '식사 알림' }).last().click({ timeout: 3000 })
      await page.getByRole('button', { name: '삭제', exact: true }).first().waitFor({ timeout: 3000 })
      await settle(page, 400)
      await snap('diet-log-open')
      if (!light) await screenWrapFlow('SS2 diet-log-open 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
    })
    // RR7 — 식단 편집의 "먹은 개수" 스테퍼. 스테퍼가 스스로 섬이라 줄 안에서도 깨지지 않는가(390·375). SS2: 줄은 HStack이고 시각 칸은 TimeField다
    const logRowProbe = ({ width }) => {
      const probe = document.createElement('span')
      probe.style.fontSize = 'var(--text-heading-2-size)'
      document.body.appendChild(probe)
      const big = parseFloat(getComputedStyle(probe).fontSize)
      probe.remove()
      const nameOf = (i) => `${i.getAttribute('aria-label') ?? ''} ${[...(i.labels ?? [])].map((l) => l.textContent).join(' ')}`
      const input = [...document.querySelectorAll('input')].find((i) => window.__vis(i) && nameOf(i).includes('먹은 개수'))
      const time = [...document.querySelectorAll('input')].find((i) => window.__vis(i) && i.type === 'time')
      const del = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '삭제' && window.__vis(b))
      if (!input || !time || !del) return { width, missing: `입력 ${!!input} 시각 ${!!time} 삭제 ${!!del}` }
      // 세 요소를 모두 품은 가장 가까운 조상이 줄이다
      let row = del
      while (row && !(row.contains(input) && row.contains(time))) row = row.parentElement
      const mid = (el) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2
      const delBox = del.getBoundingClientRect()
      const card = row ? row.closest('[class*="astryx-card"]') : null
      const cardBox = card ? card.getBoundingClientRect() : null
      const tBox = time.getBoundingClientRect()
      // 삭제는 둘째 줄(전체 폭)이라 세로 가운데 비교에서 뺀다(잘림·겹침은 'SS2 검증 먹은 것 줄'이 잰다)
      const centers = [mid(time), mid(input)]
      return {
        width,
        smaller: parseFloat(getComputedStyle(input).fontSize) < big,
        delH: Math.round(delBox.height),
        delInside: cardBox ? delBox.right <= cardBox.right + 0.5 : false,
        timeW: Math.round(tBox.width),
        timeInside: cardBox ? tBox.left >= cardBox.left - 0.5 && tBox.right <= cardBox.right + 0.5 : false,
        spread: Math.round((Math.max(...centers) - Math.min(...centers)) * 10) / 10,
        docOk: document.documentElement.scrollWidth <= innerWidth,
      }
    }
    const logRowWidths = async () => {
      const widths = []
      try {
        for (const width of [390, 375]) {
          await page.setViewportSize({ width, height: width === 375 ? 812 : 844 })
          await settle(page, 300)
          widths.push(await page.evaluate(logRowProbe, { width }))
        }
      } finally {
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 300)
      }
      return widths
    }
    await guardedFlow(['RR7 식단 스테퍼: 1탭 0.5 단위·입력 패턴·글자 크기·삭제 버튼 44px·넘침 없음'], async () => {
      const count = () => page.getByRole('textbox', { name: '먹은 개수' }).first()
      const c0 = Number(await count().inputValue())
      await btn(page, '먹은 개수 증가').first().click()
      await settle(page, 200)
      const c1 = Number(await count().inputValue())
      await btn(page, '먹은 개수 감소').first().click()
      await settle(page, 200)
      const c2 = Number(await count().inputValue())
      await count().click()
      await page.keyboard.press('Control+A')
      await page.keyboard.type('1.555')
      const typed = await count().inputValue()
      await page.keyboard.press('Control+A')
      await page.keyboard.type(String(c0))
      await page.keyboard.press('Enter')
      await settle(page, 200)
      const widths = await logRowWidths()
      const rows = widths.every((w) => !w.missing)
      const ok = c1 - c0 === 0.5 && c2 === c0 && typed === '1.55' && rows && widths.every((w) => w.smaller && w.delH >= 36 && w.delInside && w.timeInside && w.docOk)
      flows.push(['RR7 식단 스테퍼: 1탭 0.5 단위·입력 패턴·글자 크기·삭제 버튼 44px·넘침 없음', { ok, detail: `+1탭 ${c0}→${c1} · −1탭 ${c2} · 1.555→${typed} · ${widths.map((w) => (w.missing ? `${w.width}: 없음 ${w.missing}` : `${w.width}: 글자 작음 ${w.smaller} 삭제 ${w.delH}px 삭제 오른쪽 끝≤카드 ${w.delInside} 시각 칸 ${w.timeW}px 카드 안 ${w.timeInside} 넘침 없음 ${w.docOk}`)).join(' / ')}` }])
    })
    // SS2 ③ 먹은 것 줄: 줄을 1탭으로 펼치면 시각 칸·스테퍼·삭제가 한 줄에(세로 가운데 차이 ≤ 2px, 390·375), + 1탭에 0.5 오른다
    await guardedFlow(['SS2 먹은 것 줄: 펼침 1탭 · 시각 칸·스테퍼 한 줄(가운데 차이 ≤ 2px, 삭제는 둘째 줄 전체 폭, 390·375) · + 1탭에 0.5'], async () => {
      const name = 'SS2 먹은 것 줄: 펼침 1탭 · 시각 칸·스테퍼 한 줄(가운데 차이 ≤ 2px, 삭제는 둘째 줄 전체 폭, 390·375) · + 1탭에 0.5'
      const trigger = page.locator('.ax-screen button[aria-expanded]').filter({ hasNotText: '식사 알림' }).last()
      // diet-log-open에서 이미 펼쳐 있다: 1탭에 접히고 1탭에 다시 펼쳐지는지 본다
      await trigger.click()
      await settle(page, 300)
      const closed = await trigger.getAttribute('aria-expanded')
      await trigger.click()
      await settle(page, 300)
      const opened = await trigger.getAttribute('aria-expanded')
      const count = () => page.getByRole('textbox', { name: '먹은 개수' }).first()
      const before = Number(await count().inputValue())
      await btn(page, '먹은 개수 증가').first().click()
      await settle(page, 200)
      const after = Number(await count().inputValue())
      await btn(page, '먹은 개수 감소').first().click()
      await settle(page, 200)
      const widths = await logRowWidths()
      const rows = widths.every((w) => !w.missing)
      const ok = closed === 'false' && opened === 'true' && after - before === 0.5 && rows && widths.every((w) => w.spread <= 2)
      flows.push([name, { ok, detail: `접힘 ${closed} → 펼침 ${opened} · + 1탭 ${before}→${after} · ${widths.map((w) => (w.missing ? `${w.width}: 없음 ${w.missing}` : `${w.width}: 세로 가운데 차이 ${w.spread}px`)).join(' / ')}` }])
    })
    // SS2 ① 끼니 전부 먹음 1탭 ② 품목 체크 1탭 — 눌림(aria-pressed)이 켜지고 요약 kcal 숫자가 바뀌고, 한 번 더 누르면 되돌아온다
    const kcalText = () => page.getByText(/kcal ·/).first().textContent()
    await guardedFlow(['SS2 끼니 전부 먹음 1탭: 눌림 true + kcal 숫자가 바뀐다, 부분 등급은 눌림 아님, 한 번 더 → false'], async () => {
      const name = 'SS2 끼니 전부 먹음 1탭: 눌림 true + kcal 숫자가 바뀐다, 부분 등급은 눌림 아님, 한 번 더 → false'
      const mark = page.getByRole('button', { name: /전부 먹음$/ }).first()
      const was = await mark.getAttribute('aria-pressed')
      const k0 = await kcalText()
      if (was !== 'false') throw new Error(`시작 상태가 눌림 ${was}라 1탭 판정을 못 한다`)
      await mark.click()
      await settle(page, 400)
      const on = await mark.getAttribute('aria-pressed')
      const k1 = await kcalText()
      // 부분 등급(전부는 아니고 품목 하나만 뺐다)에서는 눌림이 아니다 — aria-pressed는 "전부 먹음"의 뜻이다
      const firstItem = page.locator('.ax-screen button[aria-pressed]').filter({ hasNot: page.locator('.ax-slot-mark') }).first()
      await firstItem.click()
      await settle(page, 400)
      const partial = await mark.getAttribute('aria-pressed')
      await mark.click()
      await settle(page, 400)
      const full2 = await mark.getAttribute('aria-pressed')
      await mark.click()
      await settle(page, 400)
      const off = await mark.getAttribute('aria-pressed')
      const k2 = await kcalText()
      flows.push([name, { ok: on === 'true' && partial === 'false' && full2 === 'true' && off === 'false' && k1 !== k0 && k2 === k0, detail: `눌림 ${was} → ${on} → (품목 하나 뺌) ${partial} → ${full2} → ${off} · 요약 "${k0}" → "${k1}" → "${k2}"` }])
    })
    await guardedFlow(['SS2 품목 체크 1탭: 눌림 true, 한 번 더 → false'], async () => {
      const name = 'SS2 품목 체크 1탭: 눌림 true, 한 번 더 → false'
      const item = page.locator('.ax-screen button[aria-pressed]').filter({ hasNot: page.locator('.ax-slot-mark') }).first()
      const label = (await item.textContent())?.trim()
      const was = await item.getAttribute('aria-pressed')
      await item.click()
      await settle(page, 400)
      const on = await item.getAttribute('aria-pressed')
      await item.click()
      await settle(page, 400)
      const off = await item.getAttribute('aria-pressed')
      flows.push([name, { ok: was === 'false' && on === 'true' && off === 'false', detail: `"${label}" 눌림 ${was} → ${on} → ${off}` }])
    })
    // SS2 ④ 식사 알림: 처음 닫혀 있고(끼니 체크 0개 보임) 1탭에 펼쳐 끼니 체크 다섯이 보인다. 끝에 다시 접는다
    await guardedFlow(['SS2 식사 알림 접힘: 처음 닫힘 → 1탭에 펼침(끼니 체크 다섯)'], async () => {
      const name = 'SS2 식사 알림 접힘: 처음 닫힘 → 1탭에 펼침(끼니 체크 다섯)'
      const visible = async () => {
        let n = 0
        for (const c of await page.locator('.ax-screen').getByRole('checkbox').all()) if (await c.isVisible()) n++
        return n
      }
      const trigger = page.getByRole('button', { name: '식사 알림', exact: true })
      const closedN = await visible()
      const closedState = await trigger.getAttribute('aria-expanded')
      await trigger.click()
      await settle(page, 400)
      const openN = await visible()
      await trigger.click()
      await settle(page, 400)
      const again = await visible()
      flows.push([name, { ok: closedN === 0 && closedState === 'false' && openN === 5 && again === 0, detail: `처음 ${closedState} · 끼니 체크 ${closedN}개 → 펼침 ${openN}개 → 다시 접음 ${again}개` }])
    })
    // SS2 ⑤ 위험 구역 2단 확인: 지우기 → 확인 문구의 계산된 색 = --color-text-error(다크·라이트) → 취소로 돌아온다
    await guardedFlow(['SS2 위험 구역 2단 확인: 확인 문구 색 = 오류 토큰(다크·라이트) · 취소로 돌아온다'], async () => {
      const name = 'SS2 위험 구역 2단 확인: 확인 문구 색 = 오류 토큰(다크·라이트) · 취소로 돌아온다'
      await btn(page, '이 날 식단 기록 지우기').click({ timeout: 3000 })
      await settle(page, 300)
      const tone = await warnColorBothSchemes('.ax-screen .ax-text-error', '삭제됩니다', 'error')
      const confirmBtn = await btn(page, '정말 삭제').count()
      await btn(page, '취소').click()
      await settle(page, 300)
      const back = await btn(page, '이 날 식단 기록 지우기').count()
      const gone = await btn(page, '정말 삭제').count()
      flows.push([name, { ok: tone.same && confirmBtn === 1 && back === 1 && gone === 0, detail: `확인 문구 계산된 색 ${tone.actual} (토큰 ${tone.token}) · 정말 삭제 ${confirmBtn}개 · 취소 뒤 지우기 ${back}개·정말 삭제 ${gone}개(기록은 그대로)` }])
    })

    // SS2 화면 검증(검증자가 더한 칸): 부품 상자가 서로 안 겹치는가·끼니 등급 다섯 색·눌린 품목·맨 글자 버튼·누르는 영역(elementFromPoint)·맨 아래 버튼·같은 부품의 모양이 기록 화면 안과 같은가
    await guardedFlow(['SS2 검증 먹은 것 줄: 부품 상자가 안 겹치고 글자가 안 잘린다 · 이웃 부품 사이 간격이 같은 역할끼리 같다 · 같은 줄 부품의 세로 가운데가 맞는다(390·375)'], async () => {
      const name = 'SS2 검증 먹은 것 줄: 부품 상자가 안 겹치고 글자가 안 잘린다 · 이웃 부품 사이 간격이 같은 역할끼리 같다 · 같은 줄 부품의 세로 가운데가 맞는다(390·375)'
      const probe = () => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight)
        const time = [...document.querySelectorAll('input')].find((i) => i.type === 'time' && vis(i))
        const count = [...document.querySelectorAll('input')].find((i) => vis(i) && `${i.getAttribute('aria-label') ?? ''} ${[...(i.labels ?? [])].map((l) => l.textContent).join(' ')}`.includes('먹은 개수'))
        const find = (t) => [...document.querySelectorAll('button')].find((b) => vis(b) && (b.getAttribute('aria-label') ?? b.textContent).trim().startsWith(t))
        const parts = { 시각: time, 감소: find('먹은 개수 감소'), 개수: count, 증가: find('먹은 개수 증가'), 삭제: find('삭제') }
        const out = {}
        for (const [k, el] of Object.entries(parts)) {
          if (!el) { out[k] = null; continue }
          // 간격·겹침은 눈에 보이는 면으로 잰다: 시각·개수는 입력 글자 상자가 아니라 바깥 면(칸 폭보다 넓게 삐져나올 수 있다)
          const face = k === '시각' ? el.closest('.astryx-time-input') ?? el : k === '개수' ? el.closest('.astryx-text-input') ?? el : el
          const r = face.getBoundingClientRect()
          // 시각 칸: 값 'HH:MM' 글자 폭이 칸의 안쪽 폭(안쪽 여백 뺀 것)보다 크면 값이 잘린 것이다(17:12가 5:1로 보이던 결함).
          // 삭제: 글자가 보이는 최소 크기(폭 48·높이 36)
          let valueClip = false
          if (k === '시각') {
            const cs = getComputedStyle(el)
            const c = document.createElement('canvas').getContext('2d')
            c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
            const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
            // 시각 칸은 OS 형식(예 '12:59 PM')으로 보이므로 가장 긴 모양으로 잰다
            valueClip = c.measureText('12:59 PM').width > inner
          }
          const tooSmall = k === '삭제' && (r.width < 48 || r.height < 36)
          out[k] = { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height), clipText: valueClip || tooSmall || (k === '삭제' || k === '감소' || k === '증가' ? [...el.querySelectorAll('*')].some((n) => n.children.length === 0 && n.getBoundingClientRect().width && (n.getBoundingClientRect().right > r.right + 1 || n.getBoundingClientRect().left < r.left - 1)) : el.scrollWidth > el.clientWidth + 1), cs: getComputedStyle(el).overflow }
        }
        // 바꾸기와 같은 줄 이웃 칩(바로 앞 형제)의 세로 상자 — 가운데·높이가 맞아야 한다
        out.바꿈쌍 = [...document.querySelectorAll('button')].filter((b) => vis(b) && (b.getAttribute('aria-label') ?? '').startsWith('바꾸기')).map((b) => {
          const chip = b.previousElementSibling
          if (!chip) return null
          const a = b.getBoundingClientRect(), c = chip.getBoundingClientRect()
          return { 바꾸기높이: Math.round(a.height), 칩높이: Math.round(c.height), 가운데차: Math.abs(Math.round(((a.top + a.bottom) - (c.top + c.bottom)) / 2)) }
        }).filter(Boolean)
        return out
      }
      const res = []
      try {
        for (const width of [390, 375]) {
          await page.setViewportSize({ width, height: width === 375 ? 812 : 844 })
          await settle(page, 300)
          res.push({ width, ...(await page.evaluate(probe)) })
        }
      } finally {
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 300)
      }
      const order = ['시각', '감소', '개수', '증가', '삭제']
      // 줄이 감겨 두 줄이 돼도 되므로 가로로만 비교하지 않고 상자 둘이 가로·세로 모두 겹치는 쌍을 센다
      const pairOverlaps = (r) => {
        let n = 0
        for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) {
          const a = r[order[i]], b = r[order[j]]
          if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) n++
        }
        return n
      }
      const lines = res.map((r) => {
        const miss = order.filter((k) => !r[k])
        if (miss.length) return `${r.width}: 없음 ${miss.join(',')}`
        let overlap = 0
        overlap = pairOverlaps(r)
        const clipped = order.filter((k) => r[k].clipText)
        return `${r.width}: ${order.map((k) => `${k} ${r[k].w}px`).join(' · ')} · 삭제 높이 ${r.삭제.h}px · 겹침 ${overlap}쌍 · 잘림 ${clipped.length ? clipped.join(',') : '없음'}`
      })
      // 이웃 부품 사이 간격이 같은 역할끼리 같다: 같은 줄(세로 가운데 차이 ≤ 2px)의 이웃 쌍은 가로 간격, 삭제가 둘째 줄이면 위 줄과의 세로 간격 — 모두 같다(±1px)
      const gapsOf = (r) => {
        const gaps = []
        for (let i = 0; i < order.length - 2; i++) {
          const a = r[order[i]], b = r[order[i + 1]]
          if (Math.abs((a.t + a.b) / 2 - (b.t + b.b) / 2) <= 2) gaps.push(b.l - a.r)
        }
        const top = Math.max(...order.slice(0, 4).map((k) => r[k].b))
        const d = r.삭제
        if (Math.abs((d.t + d.b) / 2 - (r.증가.t + r.증가.b) / 2) <= 2) gaps.push(d.l - r.증가.r)
        else gaps.push(d.t - top)
        return gaps
      }
      const gapOk = (r) => { const g = gapsOf(r); return g.length > 1 && Math.max(...g) - Math.min(...g) <= 1 }
      // 삭제가 혼자 뜨지 않는다: 같은 줄이거나, 줄 전체 폭을 쓰는 둘째 줄이다(한 칸만 감겨 남은 것이 아니다)
      const lonely = (r) => {
        const d = r.삭제
        if (Math.abs((d.t + d.b) / 2 - (r.증가.t + r.증가.b) / 2) <= 2) return false
        return d.w < r.증가.r - r.시각.l - 2
      }
      const centerOk = (r) => r.바꿈쌍.length > 0 && r.바꿈쌍.every((x) => x.가운데차 <= 2 && Math.abs(x.바꾸기높이 - x.칩높이) <= 2)
      const lines2 = res.map((r) => (!order.every((k) => r[k]) ? `${r.width}: 없음` : `${r.width}: 간격 ${gapsOf(r).join('/')}px · 삭제 혼자 줄 ${lonely(r)} · 바꾸기-칩 ${r.바꿈쌍.map((x) => `${x.바꾸기높이}/${x.칩높이} 차 ${x.가운데차}`).join(',')}`))
      const ok = res.every((r) => order.every((k) => r[k]) && !order.some((k) => r[k].clipText) && pairOverlaps(r) === 0 && gapOk(r) && !lonely(r) && centerOk(r))
      flows.push([name, { ok, detail: lines.join(' / ') + ' || ' + lines2.join(' / ') }])
    })
    await guardedFlow(['SS2 검증 식단 탭 상태: 끼니 등급 색·눌린 품목·맨 글자 버튼·누르는 영역·맨 아래'], async () => {
      const name = 'SS2 검증 식단 탭 상태: 끼니 등급 색·눌린 품목·맨 글자 버튼·누르는 영역·맨 아래'
      const dietRow = (op, row) => page.evaluate(({ op, row }) => new Promise((resolve, reject) => {
        const pad = (n) => String(n).padStart(2, '0')
        const d = new Date()
        const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        const open = indexedDB.open('workout-tracker')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const idb = open.result
          const tx = idb.transaction('dietDays', 'readwrite')
          const st = tx.objectStore('dietDays')
          if (op === 'get') {
            const g = st.get(date)
            g.onsuccess = () => resolve(g.result ?? null)
          } else if (row) st.put(row)
          else st.delete(date)
          tx.oncomplete = () => { idb.close(); resolve(null) }
          tx.onerror = () => reject(tx.error)
        }
      }), { op, row })
      const saved = await dietRow('get')
      const details = []
      let ok = true
      try {
        await page.reload()
        await page.getByRole('button', { name: '식단', exact: true }).click()
        await settle(page, 800)
        const cardOf = (slot) => page.locator('[class*="astryx-card"]').filter({ has: page.getByRole('button', { name: `${slot} 전부 먹음`, exact: true }) }).first()
        const itemsOf = (slot) => cardOf(slot).locator('button[aria-pressed]').filter({ hasNot: page.locator('.ax-slot-mark') })
        const readMarks = () => page.evaluate(() => [...document.querySelectorAll('.ax-screen .ax-slot-mark')].map((m) => ({ g: m.dataset.grade, glyph: m.textContent.trim(), color: getComputedStyle(m).color })))
        // 맨 글자 버튼: 눌리지 않은 버튼·토글 가운데 면(배경)도 테두리도 없는 것
        const bare = await page.evaluate(() => [...document.querySelectorAll('.ax-screen button, .ax-screen [role=button]')].filter((b) => b.offsetWidth).map((b) => {
          const s = getComputedStyle(b)
          const transparent = s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent'
          const noBorder = ['Top', 'Right', 'Bottom', 'Left'].every((d) => parseFloat(s[`border${d}Width`]) === 0 || s[`border${d}Style`] === 'none')
          return { n: (b.getAttribute('aria-label') ?? b.textContent).trim().slice(0, 20), bare: transparent && noBorder, expanded: b.hasAttribute('aria-expanded') }
        }))
        const bareNames = [...new Set(bare.filter((b) => b.bare).map((b) => (b.expanded ? `${b.n}(펼침줄)` : b.n)))]
        details.push(`맨 글자(면·테두리 없음) 버튼: ${bareNames.length ? bareNames.join(' · ') : '없음'}`)
        // 누르는 영역: 44 미만 컨트롤의 44 상자 안쪽(상하좌우)을 elementFromPoint로
        const small = await page.evaluate(() => {
          const out = []
          for (const el of document.querySelectorAll('.ax-screen button, .ax-screen input, .ax-screen [role=button], .ax-screen [role=checkbox]')) {
            if (!el.offsetWidth) continue
            const r = el.getBoundingClientRect()
            if (r.width >= 44 && r.height >= 44) continue
            const needX = Math.max(0, (44 - r.width) / 2)
            const needY = Math.max(0, (44 - r.height) / 2)
            const cx = (r.left + r.right) / 2
            const cy = (r.top + r.bottom) / 2
            if (r.bottom < 0 || r.top > innerHeight) continue
            const pts = { 위: [cx, r.top - needY + 1], 아래: [cx, r.bottom + needY - 1], 왼: [r.left - needX + 1, cy], 오른: [r.right + needX - 1, cy] }
            const res = Object.entries(pts).filter(([k]) => ((k === '위' || k === '아래') ? needY > 0 : needX > 0)).map(([k, [x, y]]) => {
              const hit = document.elementFromPoint(x, y)
              return `${k}${hit && (hit === el || el.contains(hit) || hit.contains(el) && hit.closest('button') === el) ? '✓' : `✗(${hit?.tagName ?? '없음'})`}`
            })
            out.push(`${(el.getAttribute('aria-label') ?? el.textContent).trim().slice(0, 14)} ${Math.round(r.width)}x${Math.round(r.height)} ${res.join('')}`)
          }
          return out
        })
        details.push(`44px 미만 ${small.length}개: ${small.slice(0, 6).join(', ')}${small.length > 6 ? ' …' : ''}`)
        // 등급 다섯 색: 점심 품목을 하나씩 누르며 등급이 어떻게 바뀌는지, 오후는 안 먹음
        const lunch = itemsOf('점심')
        const nLunch = await lunch.count()
        const seq = []
        for (let i = 0; i < nLunch; i++) {
          await lunch.nth(i).click()
          await settle(page, 250)
          seq.push((await readMarks())[1].g)
        }
        details.push(`점심 품목 ${nLunch}개 누르는 대로 등급: ${seq.join('→')}`)
        // 한 화면에 등급이 다 보이게(none은 위의 기본 장면): 아침 첫 품목(high), 점심 첫 품목(low), 오후 전부(full), 보충 블록 첫 품목(mid), 저녁 치팅 대체(zero)
        // 점심은 위에서 넷 다 눌러 full이다: 첫 품목만 남기고 끈다
        for (let i = 1; i < nLunch; i++) { await lunch.nth(i).click(); await settle(page, 150) }
        await itemsOf('아침').nth(0).click()
        await settle(page, 200)
        await page.getByRole('button', { name: '오후 전부 먹음', exact: true }).click()
        await settle(page, 300)
        await itemsOf('보충 블록').nth(0).click()
        await settle(page, 300)
        // 저녁: 치팅으로 대체(0점 → 오류색 ✗)
        await page.getByRole('button', { name: /^대체·안 먹음 — 저녁$/ }).click()
        const dlg2 = page.getByRole('dialog', { name: /기록$/ })
        await dlg2.waitFor({ timeout: 3000 })
        await settle(page, 300)
        await dlg2.getByRole('button', { name: '대체했어요', exact: true }).click()
        await dlg2.getByRole('textbox').fill('회식 삼겹살')
        await dlg2.getByRole('radio').nth(2).check() // 어느 쪽이었나요(RadioList — SS3): 비슷한 구성·다른 음식·치팅
        await dlg2.getByRole('button', { name: '저장', exact: true }).click()
        await dlg2.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {})
        await settle(page, 500)
        await toTop()
        await settle(page, 300)
        const marks = await readMarks()
        details.push(`끼니 표시 ${marks.map((m) => `${m.glyph}${m.g}`).join(' ')} · 색 ${marks.map((m) => m.color).join(' | ')}`)
        const byGrade = new Map(marks.map((m) => [m.g, m.color]))
        details.push(`등급 ${[...byGrade.keys()].join('/')} → 서로 다른 색 ${new Set(byGrade.values()).size}개`)
        await snap('diet-grades')
        // 눌린 품목 면: 눌린 것·안 눌린 것의 배경·테두리·글자 굵기
        const faces = await page.evaluate(() => {
          const pick = (p) => {
            const b = [...document.querySelectorAll('.ax-screen button[aria-pressed]')].find((x) => x.offsetWidth && !x.querySelector('.ax-slot-mark') && x.getAttribute('aria-pressed') === p)
            if (!b) return null
            const s = getComputedStyle(b)
            return `${s.backgroundColor} · 테두리 ${s.borderTopColor} · 굵기 ${s.fontWeight} · 아이콘 ${b.querySelector('svg') ? '있음' : '없음'}`
          }
          return { on: pick('true'), off: pick('false') }
        })
        details.push(`눌린 품목 면 ${faces.on} / 안 눌린 ${faces.off}`)
        // 맨 아래: 마지막 컨트롤이 탭 바에 안 가려지는가
        await toEnd()
        await settle(page, 300)
        await snap('diet-grades-end')
        const bottom = await page.evaluate(() => {
          const bar = document.querySelector('nav, [role=tablist], .ax-bar') ?? [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '홈')?.parentElement
          const barTop = bar ? bar.getBoundingClientRect().top : innerHeight
          const last = [...document.querySelectorAll('.ax-screen button')].filter((b) => b.offsetWidth).pop()
          const r = last.getBoundingClientRect()
          const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)
          return { barTop: Math.round(barTop), lastBottom: Math.round(r.bottom), h: Math.round(r.height), reachable: hit === last || last.contains(hit), n: (last.textContent ?? '').trim().slice(0, 10) }
        })
        details.push(`맨 아래 버튼 "${bottom.n}" 아래끝 ${bottom.lastBottom} / 탭 바 위 ${bottom.barTop} · 눌림 닿음 ${bottom.reachable}`)
        ok = bottom.lastBottom <= bottom.barTop && bottom.reachable && new Set(byGrade.values()).size >= 4 && bare.every((b) => !b.bare || b.expanded) // 펼침 줄(Collapsible 머리)은 줄이라 맨 글자여도 된다
        // 식사 알림을 펼친 모습(처음엔 닫혀 있다) — 끼니 체크 다섯·시각 칸·내보내기 버튼이 카드 안에 있는가
        await page.getByRole('button', { name: '식사 알림', exact: true }).click()
        await settle(page, 500)
        await toEnd()
        await snap('diet-reminder-open')
        await page.getByRole('button', { name: '식사 알림', exact: true }).click()
        await settle(page, 300)
        await toTop()
      } finally {
        await dietRow('put', saved)
        await page.reload()
        await page.getByRole('button', { name: '식단', exact: true }).click()
        await settle(page, 800)
      }
      flows.push([name, { ok, detail: details.join(' · ') }])
    })

    await guardedFlow(['SS2 검증 같은 부품 같은 모양: 식단 탭 품목 토글 = 기록 화면 안 편집기'], async () => {
      const name = 'SS2 검증 같은 부품 같은 모양: 식단 탭 품목 토글 = 기록 화면 안 편집기'
      const dietFace = await page.evaluate(inPageItemFace)
      if (!dietFace || !histItemFace) throw new Error(`토글 못 찾음 식단 ${!!dietFace} 기록 ${!!histItemFace}`)
      // 글자 집안(fontFamily)은 뺀다: 기록 화면의 섬은 legacy 본문 글꼴을 이어받는다(SS4가 화면을 옮기면 사라지는 알려진 차이 — 보고에 적는다)
      const keys = Object.keys(dietFace).filter((k) => k !== 'text' && k !== 'fontFamily')
      const diff = keys.filter((k) => dietFace[k] !== histItemFace[k])
      flows.push([name, { ok: diff.length === 0, detail: diff.length ? diff.map((k) => `${k}: 식단 ${dietFace[k]} ≠ 기록 ${histItemFace[k]}`).join(' · ') : `같음(${keys.length}항목: 글자 ${dietFace.fontSize}/${dietFace.fontWeight} 높이 ${dietFace.h}px)` }])
    })

    // 줄인 플랜(보정 1,500)을 오늘까지 4일 연속 고른 상태 — 연속 저칼로리 경고. 심은 날은 끝에 되돌린다
    await requiredScene('diet-streak', async () => {
      const seeded = await page.evaluate(inPageDietSeed, { planId: 'cut-1500-u', count: 4 })
      try {
        await page.reload()
        await page.getByRole('button', { name: '식단', exact: true }).click()
        await page.getByText(/보정 1,500 4일 연속/).waitFor({ timeout: 5000 })
        await settle(page, 600)
        await snap('diet-streak')
        await wrapProbe('diet-streak')
        if (!light) await screenWrapFlow('SS2 diet-streak 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안', '.ax-screen')
      } finally {
        await page.evaluate(inPageDietRestore, seeded)
        await page.reload()
        await page.getByRole('button', { name: '설정', exact: true }).waitFor()
        await settle(page, 600)
      }
    })

    // 설정
    await page.getByRole('button', { name: '설정', exact: true }).click()
    await settle(page, 800)
    await snap('settings')
    await wrapProbe('settings')
    await toEnd()
    await snap('settings-end')
    await toTop()

    // ── SS6 설정 탭 흐름 (PLAN v1.21 SS6). 흐름은 guardedFlow 안에서 돌아 예외가 흐름 실패로 센다(0개 통과·건너뜀 없음). 끝에는 설정을 원래대로 돌려놓는다 ──
    const ss6Wrap = (scene) => (light ? Promise.resolve() : screenWrapFlow(`SS6 ${scene} 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`, '.ax-screen'))
    const ss6Rows = (scene) =>
      light
        ? Promise.resolve()
        : guardedFlow([`SS6 ${scene} 한 줄 부품 겹침·잘림·세로 가운데·간격`], async () => {
            const out = []
            try {
              for (const w of [390, 375]) {
                await page.setViewportSize({ width: w, height: w === 375 ? 812 : 844 })
                await settle(page, 400)
                out.push([w, await page.evaluate(inPageSettingsRows)])
              }
            } finally {
              await page.setViewportSize({ width: 390, height: 844 })
              await settle(page, 400)
            }
            flows.push([`SS6 ${scene} 한 줄 부품 겹침·잘림·세로 가운데·간격`, { ok: out.every(([, r]) => r.ok), detail: out.map(([w, r]) => `${w}: ${r.detail}`).join(' / ') }])
          })
    if (!light) {
      await ss6Wrap('settings')
      await ss6Rows('settings')
      await guardedFlow(['SS6 Gist 토큰 칸·외부 링크'], async () => {
        const link = page.locator('.ax-screen a[href*="github.com/settings/tokens/new"]')
        const field = page.getByLabel('GitHub 개인 액세스 토큰')
        const save = btn(page, '토큰 저장')
        const attrs = (await link.count()) === 1 ? await link.evaluate((e) => ({ target: e.getAttribute('target'), rel: e.getAttribute('rel') ?? '', text: e.textContent.trim() })) : null
        const type = (await field.count()) === 1 ? await field.getAttribute('type') : null
        const disabled = (await save.count()) === 1 ? await save.isDisabled() : null
        flows.push(['SS6 Gist 토큰 칸·외부 링크', { ok: attrs !== null && attrs.target === '_blank' && /noopener/.test(attrs.rel) && /GitHub에서 토큰 발급하기/.test(attrs.text) && type === 'password' && disabled === true, detail: `링크 ${attrs ? JSON.stringify(attrs) : '없음'} · 토큰 칸 type ${type} · 빈 칸이면 저장 비활성 ${disabled}` }])
      })
      await guardedFlow(['SS6 경계: 루틴이 하나뿐이면 삭제·이 루틴 쓰기 버튼이 없다'], async () => {
        const del = await btn(page, '삭제').count()
        const use = await btn(page, '이 루틴 쓰기').count()
        const lists = await page.getByText('루틴 목록', { exact: true }).count()
        flows.push(['SS6 경계: 루틴이 하나뿐이면 삭제·이 루틴 쓰기 버튼이 없다', { ok: lists === 1 && del === 0 && use === 0, detail: `루틴 목록 카드 ${lists}개 · 삭제 ${del}개 · 이 루틴 쓰기 ${use}개` }])
      })
      await guardedFlow(['SS6 선택 묶음 맨 글자 아님'], async () => {
        const r = await page.evaluate(inPageSettingsToggles)
        flows.push(['SS6 선택 묶음 맨 글자 아님', { ok: r.ok && r.n === 5, detail: r.detail }])
      })
      // Phase 바꾸기: 1탭에 선택이 옮겨 가고 설명 줄·전환 조건 제목이 바뀐다. 끝에 0으로 되돌린다
      await guardedFlow(['SS6 Phase 바꾸기'], async () => {
        const group = page.getByRole('radiogroup', { name: 'Phase' })
        const checked = () => group.getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')))
        const c0 = await checked()
        let c1 = []
        let d1 = 0
        let t1 = 0
        try {
          await group.getByRole('radio', { name: '1', exact: true }).click()
          await settle(page, 500)
          c1 = await checked()
          d1 = await page.getByText('기본 볼륨 정착', { exact: true }).count()
          t1 = await page.getByText('Phase 2 전환 조건', { exact: true }).count()
        } finally {
          await group.getByRole('radio', { name: '0', exact: true }).click()
          await settle(page, 500)
        }
        const c2 = await checked()
        const d2 = await page.getByText('습관 형성 — 주 3회 × 8주 연속', { exact: true }).count()
        const one = (c, i) => c.filter((x) => x === 'true').length === 1 && c[i] === 'true'
        flows.push(['SS6 Phase 바꾸기', { ok: c0.length === 4 && one(c0, 0) && one(c1, 1) && d1 === 1 && t1 === 1 && one(c2, 0) && d2 === 1, detail: `항목 ${c0.length}개 · 처음 ${c0.indexOf('true')} → 1탭 ${c1.indexOf('true')}(설명 ${d1}개·Phase 2 전환 조건 ${t1}개) → 되돌림 ${c2.indexOf('true')}(설명 ${d2}개)` }])
      })
      // 경계: Phase 3이면 전환 조건이 없다(다음 Phase가 없다). 끝에 원래 Phase로 되돌린다
      await guardedFlow(['SS6 경계: Phase 3이면 전환 조건이 없다'], async () => {
        const prev = await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: 3 })
        let n = -1
        let radios = ''
        try {
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await page.getByRole('radiogroup', { name: 'Phase' }).waitFor({ timeout: 5000 })
          await settle(page, 600)
          n = await page.getByText(/전환 조건$/).count()
          radios = (await page.getByRole('radiogroup', { name: 'Phase' }).getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-checked')))).join()
        } finally {
          await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: prev.value, remove: !prev.had })
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await settle(page, 800)
        }
        flows.push(['SS6 경계: Phase 3이면 전환 조건이 없다', { ok: n === 0 && radios === 'false,false,false,true', detail: `전환 조건 제목 ${n}개 · 선택 ${radios}` }])
      })
      // 성공 글자색(전환 조건 ✓): Phase 2는 '최근 6개월 내 4주+ 공백 없음'이 기록 없이도 충족(✓)이다. 계산된 색 = 성공 토큰 — 다크·라이트 둘 다. 끝에 원래 Phase로 되돌린다
      await guardedFlow([`SS6 성공 글자색(전환 조건 ✓)${light ? ' (라이트)' : ''}`], async () => {
        const prev = await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: 2 })
        let col = { same: false, actual: '', token: '' }
        let n = 0
        try {
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await page.getByRole('radiogroup', { name: 'Phase' }).waitFor({ timeout: 5000 })
          await settle(page, 600)
          n = await page.locator('.ax-screen .ax-text-success').count()
          col = await warnColorBothSchemes('.ax-screen .ax-text-success', '✓', 'success')
        } finally {
          await page.evaluate(inPageSetSetting, { key: 'currentPhase', value: prev.value, remove: !prev.had })
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await settle(page, 800)
        }
        flows.push([`SS6 성공 글자색(전환 조건 ✓)${light ? ' (라이트)' : ''}`, { ok: n >= 1 && col.same, detail: `✓ ${n}개 · 계산된 색 ${col.actual} (토큰 ${col.token})` }])
      })
      // Day 펼치기: 1탭에 펼치고(aria-expanded) 다른 Day를 펼치면 앞의 것이 접히며 다시 누르면 접힌다
      await guardedFlow(['SS6 Day 펼치기'], async () => {
        const heads = page.locator('.ax-screen button[aria-expanded]').filter({ hasText: /^Day \d/ })
        const n = await heads.count()
        const open = () => heads.evaluateAll((els) => els.map((e) => e.getAttribute('aria-expanded')))
        const o0 = await open()
        await heads.nth(0).click()
        await settle(page, 400)
        const o1 = await open()
        const firstExercise = await page.getByText(/^1\. /).count()
        await heads.nth(1).click()
        await settle(page, 400)
        const o2 = await open()
        await heads.nth(1).click()
        await settle(page, 400)
        const o3 = await open()
        const only = (o, i) => o.filter((x) => x === 'true').length === 1 && o[i] === 'true'
        flows.push(['SS6 Day 펼치기', { ok: n >= 2 && o0.every((x) => x === 'false') && only(o1, 0) && firstExercise >= 1 && only(o2, 1) && o3.every((x) => x === 'false'), detail: `Day 줄 ${n}개 · 처음 ${o0.join()} → 첫째 ${o1.join()}(종목 줄 ${firstExercise}개) → 둘째 ${o2.join()} → 다시 ${o3.join()}` }])
      })
      // 미리 듣기: 두 버튼 1탭에 예외가 없다(소리는 못 듣는다 — 제약 2). 버튼은 그대로 남는다
      await guardedFlow(['SS6 미리 듣기'], async () => {
        const errs = []
        const onErr = (e) => errs.push(String(e))
        page.on('pageerror', onErr)
        try {
          await btn(page, '🔊 미리 듣기 (3·2·1 틱 → 종료 차임)').click()
          await settle(page, 300)
          await btn(page, '🔊 템포 경계음 미리 듣기 (올림 → 내림)').click()
          await settle(page, 300)
        } finally {
          page.off('pageerror', onErr)
        }
        const n = (await btn(page, '🔊 미리 듣기 (3·2·1 틱 → 종료 차임)').count()) + (await btn(page, '🔊 템포 경계음 미리 듣기 (올림 → 내림)').count())
        flows.push(['SS6 미리 듣기', { ok: errs.length === 0 && n === 2, detail: `예외 ${errs.length}건 · 미리 듣기 버튼 ${n}개(소리는 못 듣는다)` }])
      })
      // 템포 스위치: 1탭에 켜지고 다시 1탭에 꺼진다. 켠 모양과 끈 모양이 다르다(끈 모양이 맨 글자로 안 보이게 사진 두 장이 다르고 끈 쪽에도 그려진 면이 있다). 끝에 끈다
      await guardedFlow(['SS6 템포 스위치 켜고 끄기'], async () => {
        const sw = page.getByRole('switch', { name: '템포 가이드 사용' })
        if ((await sw.count()) !== 1) throw new Error(`스위치 ${await sw.count()}개`)
        const state = () => sw.evaluate((e) => e.checked ?? e.getAttribute('aria-checked') === 'true')
        const box = page.locator('.ax-screen').filter({ has: sw }).locator('label').filter({ has: sw }).first()
        const shot = async () => (await box.count()) ? box.screenshot() : sw.screenshot()
        await sw.scrollIntoViewIfNeeded()
        const s0 = await state()
        const off = await shot()
        await sw.click({ force: true })
        await settle(page, 400)
        const s1 = await state()
        const on = await shot()
        await sw.click({ force: true })
        await settle(page, 400)
        const s2 = await state()
        const differs = Buffer.compare(off, on) !== 0
        const painted = new Set(off).size > 2
        flows.push(['SS6 템포 스위치 켜고 끄기', { ok: s0 === false && s1 === true && s2 === false && differs && painted, detail: `처음 ${s0} → 1탭 ${s1} → 1탭 ${s2} · 켠 사진과 끈 사진이 다르다 ${differs} · 끈 사진에 그려진 면(서로 다른 바이트 ${new Set(off).size}종)` }])
      })
      await guardedFlow(['SS6 경계: 저장 공간을 모르면 —'], async () => {
        await page.evaluate(() => {
          window.__estimateBefore = navigator.storage.estimate
          navigator.storage.estimate = () => Promise.resolve({})
        })
        try {
          await page.getByRole('button', { name: '홈', exact: true }).click()
          await settle(page, 500)
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await page.getByText('저장 공간', { exact: true }).waitFor({ timeout: 5000 })
          await settle(page, 600)
          const row = page.locator('[role="listitem"]').filter({ hasText: /^저장 공간/ })
          const text = (await row.innerText()).replace(/\s+/g, ' ')
          flows.push(['SS6 경계: 저장 공간을 모르면 —', { ok: /저장 공간 —$/.test(text), detail: `줄 글자 "${text}"` }])
        } finally {
          await page.evaluate(() => { navigator.storage.estimate = window.__estimateBefore })
          await page.getByRole('button', { name: '홈', exact: true }).click()
          await settle(page, 300)
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await settle(page, 600)
        }
      })
    }

    // 내보내기 미리보기를 펼친 상태, 초기화 확인 상태(확인만 — 실제로 지우는 버튼은 누르지 않는다)
    await requiredScene('settings-export-preview', async () => {
      await btn(page, '미리보기').click({ timeout: 3000 })
      await btn(page, '닫기').waitFor({ timeout: 3000 })
      await btn(page, '닫기').evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await settle(page, 500)
      await snap('settings-export-preview')
      if (!light) {
        await guardedFlow(['SS6 내보내기 미리보기'], async () => {
          const pre = page.locator('.ax-screen pre')
          const n = await pre.count()
          const text = n ? await pre.first().innerText() : ''
          flows.push(['SS6 내보내기 미리보기', { ok: n === 1 && /^## /m.test(text), detail: `미리보기 칸 ${n}개 · "## " 줄 ${/^## /m.test(text)} · 글자 ${text.length}자` }])
        })
        await ss6Wrap('settings-export-preview')
        await ss6Rows('settings-export-preview')
      }
      await btn(page, '닫기').click()
      await settle(page, 300)
      await toTop()
    })
    await requiredScene('settings-reset-confirm', async () => {
      await btn(page, '모든 데이터 초기화').click({ timeout: 3000 })
      await btn(page, '취소').last().waitFor({ timeout: 3000 })
      await btn(page, '취소').last().evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await settle(page, 500)
      await snap('settings-reset-confirm')
      let ss6During = null
      await guardedFlow(['SS6 초기화 2단 확인', `SS6 오류 글자색(초기화 확인 문구)${light ? ' (라이트)' : ''}`], async () => {
        ss6During = { sure: await btn(page, '정말 삭제').count(), entry: await btn(page, '모든 데이터 초기화').count(), cancel: await btn(page, '취소').count() }
        const col = await warnColorBothSchemes('.ax-screen .ax-text-error', '세션 기록', 'error')
        flows.push([`SS6 오류 글자색(초기화 확인 문구)${light ? ' (라이트)' : ''}`, { ok: col.same, detail: `계산된 색 ${col.actual} (토큰 ${col.token})` }])
      })
      if (!light) await ss6Wrap('settings-reset-confirm')
      await btn(page, '취소').last().click()
      await settle(page, 300)
      if (!light) {
        await guardedFlow(['SS6 초기화 2단 확인'], async () => {
          const after = { sure: await btn(page, '정말 삭제').count(), entry: await btn(page, '모든 데이터 초기화').count() }
          flows.push(['SS6 초기화 2단 확인', { ok: ss6During !== null && ss6During.sure === 1 && ss6During.entry === 0 && ss6During.cancel >= 1 && after.sure === 0 && after.entry === 1, detail: `확인 중: 정말 삭제 ${ss6During?.sure}개·초기화 ${ss6During?.entry}개·취소 ${ss6During?.cancel}개 → 취소 뒤: 정말 삭제 ${after.sure}개·초기화 ${after.entry}개(지우지 않았다)` }])
        })
      }
      await toTop()
    })
    // Gist 토큰이 저장된 상태 — 가짜 토큰을 localStorage에 넣는다. GitHub 호출은 막고 세며, 0이어야 한다
    await guardedFlow(['settings-gist GitHub을 부르지 않는다'], async () => {
      const callsBefore = ghCalls.length
      await requiredScene('settings-gist', async () => {
        await page.evaluate(() => localStorage.setItem('workout-tracker.gistToken', 'ghp_uicheck0000000000000000000000000000'))
        try {
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await page.getByText('토큰 저장됨', { exact: true }).waitFor({ timeout: 5000 })
          await page.getByText('토큰 저장됨', { exact: true }).evaluate((el) => el.scrollIntoView({ block: 'start' }))
          await settle(page, 600)
          await snap('settings-gist')
          await wrapProbe('settings-gist')
          if (!light) {
            await guardedFlow(['SS6 Gist 저장됨'], async () => {
              const masked = await page.getByText(/^ghp_•{8}0000$/).count()
              const body = await page.evaluate(() => document.body.innerText)
              const leaked = body.includes('ghp_uicheck0000000000000000000000000000') || body.includes('uicheck000')
              const inputs = await page.getByLabel('GitHub 개인 액세스 토큰').count()
              flows.push(['SS6 Gist 저장됨', { ok: masked === 1 && !leaked && inputs === 0, detail: `마스킹 줄 ${masked}개 · 토큰 원문이 화면 글자에 있다 ${leaked} · 토큰 입력 칸 ${inputs}개` }])
            })
            await ss6Wrap('settings-gist')
            await ss6Rows('settings-gist')
          }
        } finally {
          await page.evaluate(() => localStorage.removeItem('workout-tracker.gistToken'))
          await page.reload()
          await page.getByRole('button', { name: '설정', exact: true }).click()
          await settle(page, 800)
          await toTop()
        }
      })
      const made = ghCalls.length - callsBefore
      flows.push(['settings-gist GitHub을 부르지 않는다', { ok: made === 0, detail: `막은 호출 ${made}건${made ? ': ' + ghCalls.slice(callsBefore).join(' ') : ''}` }])
    })

    // QQ6: 375 폭, 활성 아닌 루틴 줄(`이 루틴 쓰기`·`삭제`), 그 줄의 확인 상태
    await requiredScene('settings-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('settings-375')
    })
    await requiredScene(['settings-routines-375', 'settings-routines-confirm-375', 'settings-routines'], async () => {
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const open = indexedDB.open('workout-tracker')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const idb = open.result
              const tx = idb.transaction('routines', 'readwrite')
              const store = tx.objectStore('routines')
              const all = store.getAll()
              all.onsuccess = () => {
                const base = all.result[0]
                store.put({ ...base, id: 'qq6-extra-routine', name: 'QQ6 확인용 루틴' })
              }
              tx.oncomplete = () => {
                idb.close()
                resolve(null)
              }
              tx.onerror = () => reject(tx.error)
            }
          }),
      )
      await page.reload()
      await page.getByRole('button', { name: '설정', exact: true }).click()
      await settle(page, 800)
      await page.getByText('QQ6 확인용 루틴', { exact: true }).scrollIntoViewIfNeeded()
      await settle(page, 300)
      await snap('settings-routines-375')
      await btn(page, '이 루틴 쓰기').click()
      await settle(page, 500)
      await snap('settings-routines-confirm-375')
      await btn(page, '취소').click()
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 400)
      await page.getByText('QQ6 확인용 루틴', { exact: true }).scrollIntoViewIfNeeded()
      await snap('settings-routines')
      await ss6Wrap('settings-routines')
      await ss6Rows('settings-routines')
      await toTop()
    })
  }

  // 루틴 편집
  await btn(page, '편집').click()
  await page.getByText('루틴 이름', { exact: true }).first().waitFor()
  await settle(page, 800)
  await snap('editor')
  await page.getByRole('button', { name: /^1\. / }).first().click()
  await page.getByRole('dialog', { name: '종목 줄 편집' }).waitFor()
  await settle(page, 800)
  await snap('line-sheet')
  // RR5 기존 사용처: 막을 눌러 닫으면 시트가 사라지고, 같은 줄을 다시 열 수 있다(늦은 onClose가 새로 연 시트를 닫지 않는다)
  if (!light) await optional('line-sheet-reopen', async () => {
   await guardedFlow(['줄 시트 막으로 닫고 같은 줄 다시 열기'], async () => {
    const errs = []
    const onErr = (e) => errs.push(String(e))
    page.on('pageerror', onErr)
    const dlg = page.getByRole('dialog', { name: '종목 줄 편집' })
    await page.mouse.click(195, 30)
    const gone = await dlg.waitFor({ state: 'detached', timeout: 1500 }).then(() => true, () => false)
    await page.getByRole('button', { name: /^1\. / }).first().click()
    await dlg.waitFor({ timeout: 3000 })
    await settle(page, 900)
    const still = await dlg.count()
    page.off('pageerror', onErr)
    flows.push(['줄 시트 막으로 닫고 같은 줄 다시 열기', { ok: gone && still === 1 && errs.length === 0, detail: `사라짐 ${gone} · 다시 연 뒤 시트 ${still}개 · 오류 ${errs.length}건` }])
   })
  })
  await ctx.close()
}

/**
 * 색 체계 전환 (PLAN v1.20 RR11): 같은 걸음으로 여덟 장면을 지나며 onScene(page, scene)을 부른다.
 * 홈 → 세션(1세트 완료) → 요약 → 기록 → 분석 → 식단 → 설정 → 루틴 편집.
 */
async function walkSchemeScenes(page, onScene) {
  const go = async (name) => {
    await settle(page, 700)
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    await onScene(page, name)
  }
  await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
  await page.getByRole('button', { name: '설정', exact: true }).waitFor()
  await go('home')
  await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
  await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
  await go('session')
  await page.getByRole('button', { name: '1세트 완료', exact: true }).first().click()
  await page.getByRole('timer').waitFor({ timeout: 5000 })
  await btn(page, '종료').click()
  await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
  await btn(page, '기록 마치기').click()
  await btn(page, '홈으로').waitFor({ timeout: 8000 })
  await go('summary')
  await btn(page, '홈으로').click()
  await page.getByRole('button', { name: '기록', exact: true }).waitFor()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await go('history')
  await page.getByRole('button', { name: '분석', exact: true }).click()
  await page.locator('svg.recharts-surface, .recharts-wrapper').first().waitFor({ timeout: 8000 }).catch(() => {})
  await settle(page, 1000)
  await go('analyze')
  await page.getByRole('button', { name: '식단', exact: true }).click()
  await go('diet')
  await page.getByRole('button', { name: '설정', exact: true }).click()
  await go('settings')
  await btn(page, '편집').click()
  await page.getByText('루틴 이름', { exact: true }).first().waitFor()
  await go('editor')
}

/** 지금 화면의 색 한 벌: 문서 배경, 제목 글자색, axe 대비 위반 수, 분석 차트의 선 색 */
async function schemeProbe(page, scene) {
  const m = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor
    // 앱의 색은 AppRoot(mode)가 정한다. body 배경은 mode와 무관하게 뒤집히므로, 앱 안의 제목 글자색을 잰다.
    // 세션 장면은 h1이 없어 상단 띠의 루틴 이름을 쓴다 (RR6: .session-day가 Astryx `Text`로 옮겨 띠 안 첫 글자 요소) (RR11 리뷰 3)
    const h = document.querySelector('h1') ?? document.querySelector('.ax-bar-top :is(p, span, div):not(:has(*))')
    return { bg, h1: h ? getComputedStyle(h).color : null }
  })
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const contrast = res.violations.filter((v) => v.id === 'color-contrast').reduce((a, v) => a + v.nodes.length, 0)
  const chart = scene === 'analyze' ? JSON.stringify(await page.evaluate(inPageChartColors)) : null
  return { ...m, contrast, chart }
}

/** 색 체계 전환: 라이트로 처음부터 연 기준 → 다크로 열어 새로 고침 없이 라이트 → 다시 다크. type: chromium|webkit */
async function runSchemeFlow(type, port, shotDir) {
  const browser = await type.launch()
  const label = type === webkit ? 'WebKit' : 'Chromium'
  const open = async (scheme) => {
    const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: scheme, serviceWorkers: 'block' })
    const page = await ctx.newPage()
    await page.addInitScript(installScript())
    await page.goto(`http://localhost:${port}${BASE}`)
    return { ctx, page }
  }
  const base = {}
  try {
    {
      const { ctx, page } = await open('light')
      await walkSchemeScenes(page, async (pg, scene) => {
        base[scene] = await schemeProbe(pg, scene)
        if (shotDir) shots.push({ name: `${scene}-light`, buf: await pg.screenshot(), dir: shotDir })
      })
      await ctx.close()
    }
    const { ctx, page } = await open('dark')
    await walkSchemeScenes(page, async (pg, scene) => {
      const dark = await schemeProbe(pg, scene)
      if (shotDir) shots.push({ name: scene, buf: await pg.screenshot(), dir: shotDir })
      await pg.emulateMedia({ colorScheme: 'light' })
      await settle(pg, 400)
      const lit = await schemeProbe(pg, scene)
      await pg.emulateMedia({ colorScheme: 'dark' })
      await settle(pg, 400)
      const back = await schemeProbe(pg, scene)
      const b = base[scene]
      const bad = []
      if (!(rgbLuminance(lit.bg) > rgbLuminance(dark.bg))) bad.push(`배경이 밝아지지 않았다 ${dark.bg}→${lit.bg}`)
      if (back.bg !== dark.bg) bad.push(`다크로 돌아오지 않았다 ${back.bg}`)
      if (dark.h1 === null) bad.push('제목 요소(h1·상단 띠 제목)를 못 찾았다')
      else if (dark.h1 === lit.h1 || back.h1 !== dark.h1) bad.push(`제목 글자색이 안 뒤집혔다 ${dark.h1}→${lit.h1}→${back.h1}`)
      if (lit.bg !== b.bg) bad.push(`라이트 배경이 처음부터 라이트와 다르다 ${lit.bg} ≠ ${b.bg}`)
      if (lit.contrast > b.contrast) bad.push(`라이트 대비 위반 ${lit.contrast}건 > 처음부터 라이트 ${b.contrast}건`)
      if (scene === 'analyze' && (lit.chart === dark.chart || back.chart !== dark.chart)) bad.push('차트 선 색이 전환을 따르지 않는다')
      flows.push([`색 체계 전환 ${label} ${scene}`, { ok: bad.length === 0, detail: bad.join(' / ') || `배경 ${dark.bg}→${lit.bg}→${back.bg} · 제목 ${dark.h1 ?? '없음'}→${lit.h1 ?? '없음'} · 대비 위반 ${lit.contrast}건(기준 ${b.contrast})${scene === 'analyze' ? ' · 차트 선 색 바뀜' : ''}` }])
    })
    await ctx.close()
  } finally {
    await browser.close()
  }
}

/** 안전 영역 장면 (RR11): CDP로 위 47·아래 34를 주고 상태바 받침을 잰다. Chromium 전용 */
async function runSafeArea(browser, port) {
  for (const scheme of ['dark', 'light']) {
    const light = scheme === 'light'
    const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: scheme, serviceWorkers: 'block' })
    const page = await ctx.newPage()
    await page.addInitScript(installScript())
    await page.goto(`http://localhost:${port}${BASE}`)
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } })
    const scene = async (name, bottomSel) => {
      await settle(page, 700)
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
      shots.push({ name: light ? `${name}-light` : name, buf: await page.screenshot() })
      const r = await page.evaluate(
        (sel) => {
          const before = getComputedStyle(document.body, '::before')
          const bodyBg = getComputedStyle(document.body).backgroundColor
          const els = sel ? [...document.querySelectorAll(sel)] : []
          const bottom = els.length ? Math.max(...els.map((e) => e.getBoundingClientRect().bottom)) : null
          return { content: before.content, height: before.height, bg: before.backgroundColor, bodyBg, bottom, h: window.innerHeight }
        },
        bottomSel,
      )
      // 그려진 픽셀: 스크린샷 위 47px 안의 점들 (계산된 스타일은 위를 다른 층이 덮어도 통과한다 — RR11 리뷰 2)
      const px = await page.evaluate(async ([b64]) => {
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const k = img.naturalWidth / window.innerWidth
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0)
        const pts = [[20, 10], [window.innerWidth / 2, 30], [window.innerWidth - 20, 40], [window.innerWidth / 2, 5]]
        const at = (x, y) => [...g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data.slice(0, 3)]
        return { bar: pts.map(([x, y]) => at(x, y)), below: at(window.innerWidth / 2, 60) }
      }, [shots[shots.length - 1].buf.toString('base64')])
      const lum = ([r2, g2, b2]) => rgbLuminance(`rgb(${r2}, ${g2}, ${b2})`)
      const bad = []
      if (light) {
        const worst = Math.max(...px.bar.map(lum))
        if (!(worst < lum(px.below) || worst < 60)) bad.push(`상태바 자리 픽셀이 어둡지 않다 ${JSON.stringify(px.bar)}`)
      } else if (px.bar.some((p) => lum(p) > 128)) bad.push(`다크인데 상태바 자리가 밝다 ${JSON.stringify(px.bar)}`)
      if (light) {
        if (r.height !== '47px') bad.push(`받침 높이 ${r.height} ≠ 47px`)
        if (!(rgbLuminance(r.bg) < rgbLuminance(r.bodyBg))) bad.push(`받침 ${r.bg}이 문서 배경 ${r.bodyBg}보다 어둡지 않다`)
      } else if (r.content !== 'none') bad.push(`다크인데 받침이 있다 content=${r.content}`)
      if (bottomSel) {
        if (r.bottom === null) bad.push(`${bottomSel}를 못 찾았다`)
        else if (r.bottom > r.h - 34 + 0.5) bad.push(`아래 끝 ${r.bottom} > ${r.h - 34} (홈 바 자리를 침범)`)
      }
      // RR3·RR6·RR12: 안전 영역이 있는 홈·세션에서도 띠 ↔ 탭 줄·탭 ↔ 선택 표시·탭 ↔ 아이콘 + 글자가 대칭이다(아래 안전 영역은 뺀다)
      if (name === 'home-safe' || name === 'session-safe') {
        const sym = insetSymmetryVerdict(await page.evaluate(inPageInsetSymmetry), EXPECTED_PAIRS[name] ?? [])
        flows.push([`안쪽 대칭 ${name}${light ? '-light' : ''}`, { ok: sym.ok, detail: sym.detail }])
      }
      flows.push([`상태바 받침 ${name}${light ? '-light' : ''}`, { ok: bad.length === 0, detail: bad.join(' / ') || (light ? `받침 ${r.height} ${r.bg} · 픽셀 rgb(${px.bar[0]})` : '받침 없음') + (r.bottom !== null ? ` · 아래 끝 ${r.bottom}/${r.h - 34}` : '') }])
    }
    await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
    await page.getByRole('button', { name: '설정', exact: true }).waitFor()
    await scene('home-safe', 'nav[aria-label="화면"]')
    await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
    await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
    await scene('session-safe', null)
    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await scene('sheet-finish-safe', '[role=dialog] button')
    await ctx.close()
  }
}

/**
 * 오프라인 (PLAN v1.20 RR1): 서비스워커가 precache를 끝낸 뒤 네트워크를 끊고 `reload` → 홈이 뜨고 시작 → 세트 체크가 된다.
 * 헬스장 경로가 Astryx를 정적으로 읽게 됐으므로(README 결정 2) 그 코드가 precache에 들어 있는지 본다. 다른 장면은 SW를 막지만 여기는 허용한다.
 */
async function runOffline(browser, port) {
  const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: 'dark' })
  try {
    const page = await ctx.newPage()
    await page.goto(`http://localhost:${port}${BASE}`)
    await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
    await page.getByRole('button', { name: '설정', exact: true }).waitFor()
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await settle(page, 2500) // precache 끝난 뒤 한 박자
    await ctx.setOffline(true)
    await page.reload()
    await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
    await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor({ timeout: 15000 })
    await page.getByRole('button', { name: '1세트 완료', exact: true }).first().click()
    await page.getByRole('timer').waitFor({ timeout: 5000 })
    flows.push(['오프라인', { ok: true, detail: '새로고침 → 홈 → 시작 → 세트 ✓ → 휴식 바' }])
  } catch (e) {
    flows.push(['오프라인', { ok: false, detail: String(e.message).split('\n')[0] }])
  } finally {
    await ctx.close()
  }
}

/** 흐름 하나(이름 하나)를 돌린다. 예외가 나도 건너뜀으로 삼켜지지 않고 그 이름의 흐름 실패가 된다 (RR5 반려 — guardedFlow와 같은 뜻, runScenes 밖 버전) */
async function guardedLazyFlow(name, fn) {
  try {
    flows.push([name, await fn()])
  } catch (e) {
    flows.push([name, { ok: false, detail: `예외: ${String(e.message).split('\n')[0]}` }])
  }
}

/** 온보딩을 끝내고 홈의 아래 띠(설정 탭)가 뜰 때까지 */
async function finishOnboarding(page) {
  await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
  await page.getByRole('button', { name: '설정', exact: true }).waitFor()
}

/** 미리 읽기가 부르는 화면 청크의 파일 이름 접두사 (App.tsx의 PRELOAD). 시트 부품 청크는 이름이 `index-…`라(Rollup이 짓는다) 따로 가린다. 분석은 부르지 않아야 한다 */
const PRELOAD_CHUNKS = ['SessionScreen-', 'SummaryScreen-', 'DietScreen-', 'HistoryScreen-', 'SettingsScreen-']
const NEVER_PRELOADED_CHUNK = 'AnalyzeScreen-'
const chunkName = (url) => new URL(url).pathname.split('/').pop() ?? ''
/** 시트 부품 청크: 처음 여는 순간 읽는 `index-…js`(index.html이 적은 것)가 아닌, 두 번째 `index-…js` */
const isSheetChunk = (name) => /^index-.+\.js$/.test(name) && !collectFirstLoad(readFileSync(join(ROOT, 'dist', 'index.html'), 'utf8')).some((f) => f.endsWith(`/${name}`))

/**
 * 지연 읽기 (PLAN v1.21 SS1) — 새 흐름 셋. 전부 guardedLazyFlow라 예외가 흐름 실패로 센다.
 * ① 지연 화면 오프라인: precache가 끝난 뒤 네트워크를 끊고 새로 고침 → 홈 → 세션 시작 → 요약, 식단·기록·설정·분석 탭을 차례로 연다. 하나라도 안 뜨면 실패.
 * ② 미리 읽기: 부팅 뒤 2초 안에 다섯 화면과 시트 청크가 요청된다(0개면 실패). 분석 청크는 요청되지 않는다.
 * ③ 시트 첫 열기: 새로 고침 직후(미리 읽기 전) 홈의 [변경]을 누르면 Day 선택 시트가 뜬다 — 청크를 그때 읽는다.
 */
async function runLazyFlows(browser, port) {
  const offlineName = '지연 화면 오프라인'
  await guardedLazyFlow(offlineName, async () => {
    const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: 'dark' })
    try {
      const page = await ctx.newPage()
      await page.goto(`http://localhost:${port}${BASE}`)
      await finishOnboarding(page)
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
      await settle(page, 2500) // precache 끝난 뒤 한 박자
      await ctx.setOffline(true)
      await page.reload()
      await page.getByRole('button', { name: '설정', exact: true }).waitFor({ timeout: 15000 })
      await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
      await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor({ timeout: 15000 })
      await page.getByRole('button', { name: '1세트 완료', exact: true }).first().click()
      await btn(page, '종료').click()
      await page.getByRole('dialog', { name: '세션 종료' }).waitFor({ timeout: 15000 })
      await btn(page, '기록 마치기').click()
      await btn(page, '홈으로').waitFor({ timeout: 15000 })
      await btn(page, '홈으로').click()
      const seen = ['세션', '요약']
      for (const tab of ['식단', '기록', '설정', '분석']) {
        await btn(page, tab).click()
        await page.getByRole('heading', { name: tab, exact: true }).first().waitFor({ timeout: 15000 })
        seen.push(tab)
      }
      return { ok: seen.length === 6, detail: `네트워크를 끊고 새로 고침 → 홈 → ${seen.join('·')} 화면이 열렸다` }
    } finally {
      await ctx.close()
    }
  })

  const preloadName = '미리 읽기'
  await guardedLazyFlow(preloadName, async () => {
    const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: 'dark', serviceWorkers: 'block' })
    try {
      const page = await ctx.newPage()
      const names = []
      page.on('request', (r) => names.push(chunkName(r.url())))
      await page.goto(`http://localhost:${port}${BASE}`)
      await finishOnboarding(page)
      // 온보딩을 마친 시점부터 센다(온보딩 때까지 읽은 것은 미리 읽기가 아니다)
      names.length = 0
      await settle(page, 2000)
      const count = (prefix) => names.filter((n) => n.startsWith(prefix) && n.endsWith('.js')).length
      const sheet = names.filter(isSheetChunk).length
      const missing = [...PRELOAD_CHUNKS.filter((prefix) => count(prefix) === 0), ...(sheet === 0 ? ['시트'] : [])]
      const analyze = count(NEVER_PRELOADED_CHUNK)
      return {
        ok: missing.length === 0 && analyze === 0,
        detail: `요청된 청크 ${PRELOAD_CHUNKS.map((p) => `${p}${count(p)}`).join(' ')} 시트 ${sheet} · 분석 ${analyze}${missing.length ? ` — 안 읽은 것: ${missing.join(' ')}` : ''}`,
      }
    } finally {
      await ctx.close()
    }
  })

  const sheetName = '시트 첫 열기'
  await guardedLazyFlow(sheetName, async () => {
    const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: 'dark', serviceWorkers: 'block' })
    try {
      const page = await ctx.newPage()
      await page.goto(`http://localhost:${port}${BASE}`)
      await finishOnboarding(page)
      let sheetRequested = false
      page.on('request', (r) => {
        if (isSheetChunk(chunkName(r.url()))) sheetRequested = true
      })
      await page.reload()
      await btn(page, '변경').waitFor({ timeout: 15000 })
      const early = !sheetRequested // 미리 읽기(1초 뒤)보다 먼저 눌러야 청크를 그때 읽는 경로를 본다
      await btn(page, '변경').click()
      await page.getByRole('dialog', { name: 'Day 선택' }).waitFor({ timeout: 10000 })
      return { ok: early && sheetRequested, detail: `미리 읽기 전에 눌렀다(청크 요청 전) ${early} · 누른 뒤 시트 청크 요청 ${sheetRequested} · Day 선택 시트가 떴다` }
    } finally {
      await ctx.close()
    }
  })
}

/** src/**\/*.css를 전부 읽는다 (정적 검사용) */
function readAllCss() {
  const out = {}
  for (const rel of readdirSync(join(ROOT, 'src'), { recursive: true })) {
    const p = String(rel).replace(/\\/g, '/')
    if (p.endsWith('.css')) out[p] = readFileSync(join(ROOT, 'src', p), 'utf8')
  }
  return out
}

function runStatic() {
  const allCss = readAllCss()
  return barStaticChecks(allCss)
}

function printResults() {
  let failed = 0
  if (phase === 'after') {
    console.log('\n정적 검사 (QQ1·QQ2·QQ4·QQ6):')
    for (const c of runStatic()) {
      console.log(`- ${c.ok ? '통과' : '실패'} ${c.name}: ${c.detail}`)
      if (!c.ok) failed++
    }
  } else console.log('\n정적 검사: before에서는 건너뜀')
  const known = { rows }
  const mark = (c) => (c === null ? '·' : c.status)
  console.log(`\n| 장면 | ${COLUMNS.join(' | ')} |\n|---|${COLUMNS.map(() => '---').join('|')}|`)
  for (const r of known.rows) console.log(`| ${r.scene} | ${COLUMNS.map((c) => mark(r.cells[c])).join(' | ')} |`)
  const lines = []
  for (const r of known.rows) {
    for (const c of COLUMNS) {
      const cell = r.cells[c]
      if (!cell) continue
      if (c === '띠' && cell.marks) lines.push(`- 띠 ${r.scene}: ${cell.marks.join(' · ')}`)
      if (cell.status === '실패') {
        failed++
        lines.push(`- 실패 ${r.scene} · ${c}: ${cell.detail}`)
      } else if (cell.status === '건너뜀') lines.push(`- 건너뜀 ${r.scene} · ${c}: ${cell.detail}`)
      else if (cell.status === '기록') lines.push(`- 기록 ${r.scene} · ${c}: ${cell.detail}`)
    }
  }
  if (lines.length) console.log(`\n상세:\n${lines.join('\n')}`)
  // 테마 토큰: 라이트 장면의 문서 배경이 다크 장면과 달라야 한다 (RR1부터 전 장면, 그 전 before는 테마가 있는 editor 장면만)
  const themeJudged = (scene) => (phase === 'before' ? THEME_SCENES_BEFORE.has(scene) : JUDGED['테마 토큰'])
  const bgPairs = Object.entries(themeBg).filter(([, v]) => v.dark !== undefined && v.light !== undefined)
  if (bgPairs.length) {
    console.log('\n테마 토큰 · 라이트와 다크의 문서 배경:')
    for (const [scene, v] of bgPairs) {
      // RR2: 라이트 장면의 문서 배경이 다크보다 밝아야 한다(배경이 달라지기만 해서는 라이트가 어두운 채일 수 있다)
      const differ = v.dark !== v.light && rgbLuminance(v.light) > rgbLuminance(v.dark)
      const judged = themeJudged(scene)
      if (judged && !differ) failed++
      console.log(`- ${judged ? (differ ? '통과' : '실패') : '기록'} ${scene}: 다크 ${v.dark} · 라이트 ${v.light}`)
    }
  }
  const btnPairs = Object.entries(sheetBtns).filter(([, v]) => v.dark && v.light)
  if (btnPairs.length) {
    console.log('\n시트 버튼 · 다크·라이트 견줌 (다크 값이 라이트 값보다 0.05 넘게 낮지 않다):')
    for (const [scene, v] of btnPairs) {
      const r = sheetButtonVerdict(v.dark, v.light)
      if (!r.ok) failed++
      console.log(`- ${r.ok ? '통과' : '실패'} ${scene}: ${r.detail}`)
    }
  }
  if (Object.keys(startSpots[390]).length || Object.keys(startSpots[375]).length) {
    console.log('\n시작 자리 (홈 알림 수와 상관없이 시작 버튼이 같은 자리, 아래 띠 위):')
    for (const width of [390, 375]) {
      if (!Object.keys(startSpots[width]).length) continue
      // 375 폭은 장면이 둘이어야 견준다. --only 실행이라 일부만 찍었으면 값만 보인다
      const v = startSpotVerdict(startSpots[width])
      if (!v.ok && !ONLY) failed++
      console.log(`- ${v.ok ? '통과' : ONLY ? '기록' : '실패'} ${width} 폭: ${v.detail}`)
    }
  }
  if (chartColors.analyze) {
    const c = chartColorVerdict(chartColors.analyze)
    if (!c.ok) failed++
    console.log(`
차트 색 (analyze, 계산된 stroke·fill): ${c.ok ? '통과' : '실패'} — ${c.detail}`)
  }
  if (rows.length && ONLY) {
    // 장면 사이 비교는 견줄 장면이 다 있어야 한다. --only로 일부만 찍으면 '잰 장면 없음'으로 실패가 나서 건너뛴다
    console.log('\n같은 역할 (장면 사이 비교): 건너뜀 — --only 실행이다. 전체 실행에서 본다')
  } else if (rows.length) {
    console.log('\n같은 역할 (장면 사이 비교 — 옛 이름 `여백 한 벌`):')
    for (const c of spaceRoleVerdicts(layouts, ROLES_JUDGED)) {
      if (!c.ok && !c.record) failed++
      console.log(`- ${c.record ? '기록' : c.ok ? '통과' : '실패'} 같은 역할 · ${c.name}: ${c.detail}`)
    }
  }
  if (SAME_LAYOUT) {
    const want = SAME_LAYOUT.includes('all') ? Object.keys(rects) : SAME_LAYOUT
    console.log(`\n배치 같음 (--same-layout, 기준 ${LAYOUT_BASE}):`)
    let base = null
    try {
      base = JSON.parse(readFileSync(LAYOUT_BASE, 'utf8'))
    } catch {
      console.log('- 실패: 기준 배치 파일을 못 읽었다')
      failed++
    }
    if (base) {
      for (const scene of want) {
        const r = rects[scene] ? compareRects(base[scene], rects[scene]) : { ok: false, detail: '이 실행에서 안 잰 장면' }
        if (!r.ok) failed++
        console.log(`- ${r.ok ? '통과' : '실패'} ${scene}: ${r.detail}`)
      }
    }
  }
  for (const [name, r] of flows) {
    if (!r.ok) failed++
    console.log(`- 흐름 ${r.ok ? '통과' : '실패'} ${name}: ${r.detail}`)
  }
  if (sceneFailures.length) console.log(`\n장면 실패 ${sceneFailures.length}건 (requiredScene):\n${sceneFailures.map(([n, d]) => `- ${n}: ${d}`).join('\n')}`)
  else console.log('\n장면 실패 0건 (requiredScene)')
  failed += sceneFailures.length
  console.log('\n접근성(axe) 결과 — color-contrast는 찍기만 한다 (위반 노드 / incomplete 노드):')
  for (const a of axeInfo) console.log(`- ${a.scene}: serious·critical ${a.hard}건, color-contrast 위반 ${a.contrast} · incomplete ${a.incomplete}`)
  return failed
}

console.log('npm run build …')
execSync('npm run build', { cwd: ROOT, stdio: 'ignore' })
const port = await freePort()
const server = await preview({ root: ROOT, preview: { port, strictPort: true, host: 'localhost' }, logLevel: 'silent' })
const browser = await chromium.launch()
let exitCode = 0
try {
  await runScenes(browser, port, 'dark')
  if (CHECK && phase === 'after' && !ONLY) await runOffline(browser, port)
  if (CHECK && phase === 'after' && !ONLY) await runLazyFlows(browser, port)
  if (!ONLY || [...ONLY].some((s) => s.endsWith('-light'))) await runScenes(browser, port, 'light')
  if (CHECK && phase === 'after' && !ONLY) await runSchemeFlow(chromium, port, null)
  if (SAFE_AREA) await runSafeArea(browser, port)
  if (WEBKIT && CHECK && phase === 'after') await runSchemeFlow(webkit, port, 'webkit')
  mkdirSync(OUT, { recursive: true })
  for (const s of shots) {
    const dir = s.dir ? join(OUT, s.dir) : OUT
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${s.name}.png`), s.buf)
  }
  if (Object.keys(rects).length) {
    // 배치 기록. --only로 일부만 쟀으면 이미 있는 파일에 합친다
    const file = join(OUT, 'layout.json')
    const prev = ONLY && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
    writeFileSync(file, JSON.stringify({ ...prev, ...rects }) + '\n')
  }
  console.log(`스크린샷 ${shots.length}장 → docs/screenshots/${VER}/${phase}/`)
  if (wrapNotes.length) console.log(`\n글자 중간 꺾임 기록 (390·375 폭, 판정 아님):\n${wrapNotes.map((n) => `- ${n}`).join('\n')}`)
  if (CHECK && printResults() > 0) exitCode = 1
  // --check가 아니어도 필수 장면이 빠졌으면 실패다(조용히 빠진 채 0으로 끝나지 않는다)
  if (!CHECK && sceneFailures.length) {
    console.log(`\n장면 실패 ${sceneFailures.length}건:\n${sceneFailures.map(([n, d]) => `- ${n}: ${d}`).join('\n')}`)
    exitCode = 1
  }
} finally {
  await browser.close()
  await server.close()
}
process.exit(exitCode)
