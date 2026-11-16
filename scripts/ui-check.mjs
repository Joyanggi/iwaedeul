#!/usr/bin/env node
/**
 * UI 스크린샷 + 검사 (PLAN v1.19 QQ0, v1.20 RR0).
 *
 * 사용: node scripts/ui-check.mjs <before|after> [--check] [--only=<장면,…>] [--ver=v1.20]
 *   before|after  저장 폴더 docs/screenshots/<버전>/<before|after>/<장면>.png (다크)와 <장면>-light.png (라이트). 전 장면을 두 벌로 찍는다
 *                 (지금 다크 고정인 화면의 라이트는 다크와 같게 나오는 것이 정상이다 — RR1까지)
 *   --ver=v1.20   저장 폴더의 버전. 없으면 package.json 버전의 앞 두 자리
 *   --check       장면마다 접근성(axe)·눌림 반응·움직임 줄이기·여백 격자·가로 넘침 + (띠·시트가 있으면) 띠·시트 버튼 검사를 재서 표로 찍는다.
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
import { EXPECTED_PAIRS, inPageInsetSymmetry, inPageLayout, insetSymmetryVerdict, spaceRoleVerdicts, spaceStaticChecks } from './lib/ui-space.mjs'
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
  inPageIslandButtons,
  inPageLastVisible,
  inPageMotionDurations,
  inPageRects,
  inPageRowButtons,
  inPageSetNumber,
  inPageTouchReach,
  inPageSetTable,
  inPageNumberFit,
  inPageSpacing,
  inPageTabHit,
  inPageThemeTokens,
  inPageWarnColor,
  inPageChartColors,
  rgbLuminance,
  chartColorVerdict,
  measurePress,
  motionStaticChecks,
  pressVerdict,
  rowButtonStaticChecks,
} from './lib/ui-check-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '/workout-tracker/'
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

const COLUMNS = ['접근성', '눌림 반응', '움직임 줄이기', '여백 격자', '가로 넘침', '줄 안 버튼', '띠', '시트 버튼', '탭 누름', '지금 탭', '마지막 요소', '세트 숫자', '섬 버튼', '테마 토큰', '안쪽 대칭']
/**
 * RR0이 더한 칸은 `before`에서는 기록만 한다(실패로 세지 않는다). `after --check`에서 판정하기 시작하는 작업:
 * 탭 누름·마지막 요소 = RR3, 세트 숫자·섬 버튼 = RR7, 테마 토큰 = RR1(그 전 `before`에서는 테마가 있는 editor 장면만).
 * 작업이 끝날 때 해당 값을 true로 바꾼다.
 */
const JUDGED = { '탭 누름': true, '지금 탭': true, '마지막 요소': true, '세트 숫자': true, '섬 버튼': true, '테마 토큰': true }
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
/** 요약(RR9) — 기본 장면과 경계 장면 넷(0세트·PR 셋·어시스트만·긴 메모). 카드·뱃지·버튼 쌍을 판정한다 */
const SUMMARY_SCENES = ['summary', 'summary-zero', 'summary-pr', 'summary-assist', 'summary-memo']
const CARD_SCENES = ['session', 'session-375', 'session-open-b', 'history-detail-edit']
const SYMMETRY_JUDGED = new Set(['editor', 'line-sheet', ...HOME_SCENES, ...HOME_SHEET_SCENES, ...SESSION_SHEET_SCENES, ...SESSION_SCENES, ...SUMMARY_SCENES, 'session-open-b', 'history-detail-edit', 'home-safe', 'session-safe', 'settings'])
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
const TAB_BAR_SCENES = ['home', 'home-end', 'home-375', 'home-banner', 'home-banner-375', 'home-banners-open', 'history', 'history-detail', 'history-detail-edit', 'analyze', 'diet', 'diet-log-open', 'settings', 'settings-end', 'settings-375', 'settings-routines', 'settings-routines-375', 'settings-routines-confirm-375']
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
  ...Object.fromEntries(['sheet-home', 'sheet-open-session', ...SESSION_SHEET_SCENES, 'sheet-food', 'line-sheet'].map((n) => [n, 1])),
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
  const kinds = HOME_SCENES.includes(scene) ? HOME_SYMMETRY_KINDS : (HOME_SHEET_SCENES.includes(scene) || SESSION_SHEET_SCENES.includes(scene)) ? HOME_SHEET_SYMMETRY_KINDS : (CARD_SCENES.includes(scene) || SUMMARY_SCENES.includes(scene)) ? CARD_SYMMETRY_KINDS : SYMMETRY_KINDS
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
  cells['섬 버튼'] = softVerdict('섬 버튼', await page.evaluate(inPageIslandButtons))
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
  // 눌림 반응
  // 이 검사는 legacy 버튼만 잰다: Astryx 요소는 inPagePressTargets가 요소 단위로 뺀다(이 Chromium은 mouse.down으로 Astryx의 눌림을 못 칠한다 — DEV-RECORD 제약)
  cells['눌림 반응'] = verdict(pressVerdict(await measurePress(page)))
  // 움직임 줄이기 (시트 장면만 판정, 나머지는 눌림 transform만)
  const sheetUp = await page.evaluate(() => window.__ui.sheetOf() !== null)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await settle(page, 150)
  const matches = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  if (!matches) cells['움직임 줄이기'] = { status: '건너뜀', detail: 'reducedMotion 흉내가 안 먹는다' }
  else if (!sheetUp) cells['움직임 줄이기'] = { status: '건너뜀', detail: '시트 장면에서만 잰다' }
  else {
    const dur = await page.evaluate(inPageMotionDurations)
    const press = await measurePress(page)
    const bad = []
    if (!dur.skip && !dur.ok) bad.push(dur.detail)
    if (press.transformed.length) bad.push(`크기 변화 ${press.transformed.length}개: ${press.transformed.slice(0, 3).join(', ')}`)
    cells['움직임 줄이기'] = { status: bad.length ? '실패' : '통과', detail: bad.join(' / ') || dur.detail + ' · 크기 변화 0개' }
  }
  await page.emulateMedia({ reducedMotion: null })
  // 여백 격자·가로 넘침
  cells['여백 격자'] = verdict(await page.evaluate(inPageSpacing))
  layouts[scene] = await page.evaluate(inPageLayout)
  // 문서 폭만이 아니라 시트·카드 안쪽 폭 안에 요소가 있는지도 잰다 (RR9)
  const docOver = await page.evaluate(inPageOverflow)
  const innerOver = await page.evaluate(inPageInnerOverflow)
  cells['가로 넘침'] = verdict({ ok: docOver.ok && innerOver.ok, detail: `${docOver.detail} · ${innerOver.detail}` })
  // 줄 안 버튼은 .row > .btn이 있는 장면(settings)에서만 잰다. 그 장면에서 0개면 실패
  const rowBtns = await page.evaluate(() => document.querySelectorAll('.row > .btn').length)
  cells['줄 안 버튼'] = rowBtns || scene === 'settings' ? verdict(await page.evaluate(inPageRowButtons)) : { status: '건너뜀', detail: '이 장면에 줄 안 버튼이 없다' }
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
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent ?? ''
    const range = document.createRange()
    let prevTop = null
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
 *       assist(어시스트 종목만 한 세션) · memo(감각 0점·긴 메모·유산소). 돌려주는 값은 시드 설명.
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
        if (kind === 'pr') {
          const prev = {
            ...cur,
            id: 'ui-check-sum-prev',
            startedAt: new Date(now - 2 * 86400000).toISOString(),
            endedAt: new Date(now - 2 * 86400000 + 1800000).toISOString(),
            date: new Date(now - 2 * 86400000).toISOString().slice(0, 10),
            mode: 'normal',
            entries: cur.entries.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, weight: 20, reps: 5, done: true })) })),
          }
          store.put(prev)
          // 수행 순서: 계획의 앞 둘을 맞바꿔 "앞당김·미룸" 뱃지가 둘 다 생기게
          const order = (e) => { const k = live.indexOf(e); return k === 0 ? 2 : k === 1 ? 1 : k + 1 }
          cur.entries = cur.entries.map((e) => (e.skipped ? e : fill(e, 150, 30, order(e), live.indexOf(e))))
          out = { kind, detail: `종목 ${live.length}개 전부 150kg×30 (앞 기록 20kg×5)` }
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

async function runScenes(browser, port, scheme) {
  const light = scheme === 'light'
  const ctx = await browser.newContext({ ...DEVICE, locale: 'ko-KR', colorScheme: scheme, serviceWorkers: 'block' })
  const page = await ctx.newPage()
  await page.addInitScript(installScript())
  await page.goto(`http://localhost:${port}${BASE}`)

  const snap = async (scene) => {
    await settle(page, 500)
    const name = light ? `${scene}-light` : scene
    if (ONLY && !ONLY.has(name)) return
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    shots.push({ name, buf: await page.screenshot() })
    if (!light) rects[scene] = await page.evaluate(inPageRects)
    if (!light && START_SPOT_SCENES.has(scene)) startSpots[scene.endsWith('-375') ? 375 : 390][scene] = await page.evaluate(inPageStartSpot)
    if (PRESS_SHOT && !light && PRESS_SHOT[0] === scene) await pressShot(page, scene, PRESS_SHOT[1])
    if (CHECK) {
      if (!light) await runChecks(page, scene)
      else await runLightOnly(page, scene) // 라이트: 띠·시트 버튼과 테마 토큰만
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
  const guardedFlow = async (names, fn) => {
    try {
      await fn()
    } catch (e) {
      const detail = `예외: ${String(e.message).split('\n')[0]}`
      for (const n of names) if (!flows.some((f) => f[0] === n)) flows.push([n, { ok: false, detail }])
    }
  }
  // 경고 글자색: 지금 체계와 반대 체계 둘 다 계산된 color가 --color-text-warning과 같은가 (흐름은 한 체계로만 돌아서 emulateMedia로 바꿔 잰다)
  const warnColorBothSchemes = async (sel = ':is(dialog,[role=dialog],[aria-modal=true]) .ax-text-warning') => {
    const now = await page.evaluate(inPageWarnColor, sel)
    await page.emulateMedia({ colorScheme: light ? 'dark' : 'light' })
    await settle(page, 200)
    const other = await page.evaluate(inPageWarnColor, sel)
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

  await page.getByRole('button', { name: /^(시작하기|확인했어요, 그래도 계속)$/ }).click()
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
    await optional('settings-open', async () => {
      await page.getByRole('button', { name: '설정', exact: true }).click()
      await settle(page, 600)
      await snap('settings-open')
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
      return { ok: order.length >= 2 && order.join('|') === want.join('|') && order.at(-1) === '홈으로', detail: `${scene}: ${order.join(' < ')}` }
    }
    const wrapSummary = async (scene) => {
      const name = `RR9 ${scene} 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`
      await guardedFlow([name], async () => {
        const r390 = await page.evaluate(inPageMidWordBreaks, '.ax-screen')
        const i390 = await page.evaluate(inPageInnerOverflow, '.ax-screen')
        await page.setViewportSize({ width: 375, height: 812 })
        await settle(page, 400)
        const r375 = await page.evaluate(inPageMidWordBreaks, '.ax-screen')
        const i375 = await page.evaluate(inPageInnerOverflow, '.ax-screen')
        await page.setViewportSize({ width: 390, height: 844 })
        await settle(page, 400)
        flows.push([name, { ok: r390.chars > 0 && r375.chars > 0 && r390.count === 0 && r375.count === 0 && i390.ok && i375.ok, detail: `390: 글자 ${r390.chars}개·꺾임 ${r390.count}건 ${r390.samples.join(',')} · ${i390.detail} / 375: 글자 ${r375.chars}개·꺾임 ${r375.count}건 ${r375.samples.join(',')} · ${i375.detail}` }])
      })
    }
    if (!light) {
      await guardedFlow(['RR9 요약 카드 순서'], async () => {
        flows.push(['RR9 요약 카드 순서', await orderFlow('summary')])
      })
      await wrapSummary('summary')
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
      const scene = async (kind, sceneName, check) => {
        const keep = await page.evaluate(inPageSessionIds)
        try {
          const seed = await finishToSummary(kind)
          await snap(sceneName)
          const r = await check(seed)
          flows.push([SUM[kind], { ok: r.ok, detail: `${seed.detail} · ${r.detail}` }])
          await wrapSummary(sceneName)
        } catch (e) {
          if (!flows.some((f) => f[0] === SUM[kind])) flows.push([SUM[kind], { ok: false, detail: `예외: ${String(e.message).split('\n')[0]}` }])
        } finally {
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
      const tempoCard = page.locator('.card').filter({ has: page.getByText('템포 가이드', { exact: true }) })
      await tempoCard.getByRole('button', { name: '사용', exact: true }).click()
      await settle(page, 300)

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
      await tempoCard.getByRole('button', { name: '사용 안 함', exact: true }).click()
      await settle(page, 300)
      await page.getByRole('button', { name: '홈', exact: true }).click()
      await settle(page, 500)
    })
    // 시드한 세션을 지운다(뒤 장면 기록·분석·홈이 시드 없는 예시 데이터로 찍히게). 위 장면이 건너뜀이어도 돈다
    await optional('seed-cleanup', async () => {
      await unseedWatch()
      await page.reload()
      await page.getByRole('button', { name: '설정', exact: true }).waitFor()
      await settle(page, 800)
    })

    // 기록
    await page.getByRole('button', { name: '기록', exact: true }).click()
    await settle(page, 800)
    await snap('history')
    await optional('history-detail', async () => {
      await page.locator('button.row').first().click({ timeout: 3000 })
      await settle(page, 800)
      await snap('history-detail')
      // 기록 편집에서 카드를 펼친 상태 (RR7의 세트 숫자·섬 버튼을 볼 장면)
      await optional('history-detail-edit', async () => {
        await page.locator('button[aria-expanded]').first().click({ timeout: 3000 })
        await settle(page, 500)
        await snap('history-detail-edit')
      })
      await page.locator('.back-link').click()
      await settle(page, 400)
    })

    // 분석
    await page.getByRole('button', { name: '분석', exact: true }).click()
    await page.locator('svg.recharts-surface, .recharts-wrapper, .center-note').first().waitFor({ timeout: 8000 }).catch(() => {})
    await settle(page, 1200)
    await snap('analyze')

    // 식단
    await page.getByRole('button', { name: '식단', exact: true }).click()
    await settle(page, 800)
    await snap('diet')
    await optional('sheet-food', async () => {
      await btn(page, '＋ 먹은 것 추가').click({ timeout: 3000 })
      await page.getByRole('dialog', { name: '먹은 것 추가' }).waitFor()
      await settle(page)
      await snap('sheet-food')
      // 시트에서 먹은 것을 하나 더해 두고 닫는다 — 아래 diet-log-open이 쓴다(장면마다 새 브라우저 문맥이라 다른 장면에 안 남는다)
      await page.getByRole('dialog', { name: '먹은 것 추가' }).getByRole('button', { name: /(kcal|g|영양 미입력)$/ }).first().click()
      await settle(page, 400)
      await closeSheet('먹은 것 추가')
    })
    // 먹은 기록 한 줄을 펼친 상태 — 시각 입력칸·"먹은 개수" 스테퍼·삭제 버튼이 한 줄에 보인다
    await optional('diet-log-open', async () => {
      await page.locator('button.diet-item').last().click({ timeout: 3000 })
      await page.getByRole('button', { name: '삭제', exact: true }).first().waitFor({ timeout: 3000 })
      await settle(page, 400)
      await snap('diet-log-open')
    })
    // RR7 — 식단 편집의 "먹은 개수" 스테퍼. 스테퍼가 스스로 섬이라 legacy 줄 안에서도 깨지지 않는가(390·375)
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
      const widths = []
      for (const width of [390, 375]) {
        await page.setViewportSize({ width, height: width === 375 ? 812 : 844 })
        await settle(page, 300)
        widths.push(await page.evaluate(({ width }) => {
          const probe = document.createElement('span')
          probe.style.fontSize = 'var(--text-heading-2-size)'
          document.body.appendChild(probe)
          const big = parseFloat(getComputedStyle(probe).fontSize)
          probe.remove()
          const input = [...document.querySelectorAll('.ax-scope input')].find((i) => window.__vis(i))
          const del = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '삭제' && window.__vis(b))
          const sib = input.closest('.btn-row')
          return {
            width,
            smaller: parseFloat(getComputedStyle(input).fontSize) < big,
            delH: Math.round(del.getBoundingClientRect().height),
            delInside: (() => { const memo = document.querySelector('[aria-label="식단 메모"]'); return memo ? Math.round(del.getBoundingClientRect().right) <= Math.round(memo.getBoundingClientRect().right) : false })(),
            timeClip: (() => { const t = sib && sib.querySelector('input[type="time"]'); if (!t) return 'time 칸 없음'; const r = t.getBoundingClientRect(); return `${Math.round(r.width)}px · 안쪽 ${t.scrollWidth}/${t.clientWidth}`; })(),
            oneLine: sib ? [...sib.children].every((c) => Math.abs(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2 - (sib.children[0].getBoundingClientRect().top + sib.children[0].getBoundingClientRect().height / 2)) < 6) : false,
            docOk: document.documentElement.scrollWidth <= innerWidth,
          }
        }, { width }))
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await settle(page, 300)
      const ok = c1 - c0 === 0.5 && c2 === c0 && typed === '1.55' && widths.every((w) => w.smaller && w.delH >= 44 && w.delInside && w.oneLine && w.docOk)
      flows.push(['RR7 식단 스테퍼: 1탭 0.5 단위·입력 패턴·글자 크기·삭제 버튼 44px·넘침 없음', { ok, detail: `+1탭 ${c0}→${c1} · −1탭 ${c2} · 1.555→${typed} · ${widths.map((w) => `${w.width}: 글자 작음 ${w.smaller} 삭제 ${w.delH}px 삭제 오른쪽 끝≤메모 칸 ${w.delInside} 시각 칸 ${w.timeClip} 한 줄 ${w.oneLine} 넘침 없음 ${w.docOk}`).join(' / ')}` }])
    })


    // 설정
    await page.getByRole('button', { name: '설정', exact: true }).click()
    await settle(page, 800)
    await snap('settings')
    await toEnd()
    await snap('settings-end')
    await toTop()

    // QQ6: 375 폭, 활성 아닌 루틴 줄(`이 루틴 쓰기`·`삭제`), 그 줄의 확인 상태
    await optional('settings-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('settings-375')
    })
    await optional('settings-routines', async () => {
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
  await page.locator('svg.recharts-surface, .recharts-wrapper, .center-note').first().waitFor({ timeout: 8000 }).catch(() => {})
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
  return [...barStaticChecks(allCss), ...motionStaticChecks(allCss), ...rowButtonStaticChecks(allCss), ...spaceStaticChecks(allCss)]
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
  const mark = (c) => (c === null ? '·' : c.status)
  console.log(`\n| 장면 | ${COLUMNS.join(' | ')} |\n|---|${COLUMNS.map(() => '---').join('|')}|`)
  for (const r of rows) console.log(`| ${r.scene} | ${COLUMNS.map((c) => mark(r.cells[c])).join(' | ')} |`)
  const lines = []
  for (const r of rows) {
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
  if (CHECK && printResults() > 0) exitCode = 1
} finally {
  await browser.close()
  await server.close()
}
process.exit(exitCode)
