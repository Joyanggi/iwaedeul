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
  inPageSpacing,
  inPageTabHit,
  inPageThemeTokens,
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
const JUDGED = { '탭 누름': true, '지금 탭': true, '마지막 요소': true, '세트 숫자': false, '섬 버튼': false, '테마 토큰': true }
/**
 * `안쪽 대칭`(RR12)은 이미 Astryx 부품인 장면(루틴 편집)에서만 판정하고, 나머지는 기록만 한다(옮기기 전 장면은 실패로 세지 않는다).
 * 화면·띠를 옮기는 작업(RR3·RR4·RR5·RR6·RR7)이 자기 장면을 여기에 더한다.
 */
const HOME_SCENES = ['home', 'home-end', 'home-375', 'home-banner', 'home-banner-375', 'home-banners-open', 'home-resume']
/** 홈이 여는 시트 둘(RR5). 시트 안 내용의 좌·우(`sheet` 쌍)도 판정한다 */
const HOME_SHEET_SCENES = ['sheet-home', 'sheet-open-session']
const SYMMETRY_JUDGED = new Set(['editor', 'line-sheet', ...HOME_SCENES, ...HOME_SHEET_SCENES, 'home-safe', 'settings'])
/** 판정을 켠 쌍 종류. 나머지 종류는 장면이 Astryx여도 기록만 한다(card·badge = RR4, 위 띠 = RR6, set-row = RR7, sheet = RR5) */
const SYMMETRY_KINDS = new Set(['button', 'bar', 'tab-indicator', 'tab-content'])
/** 홈(RR4)은 카드·뱃지 쌍도 판정한다 */
const HOME_SYMMETRY_KINDS = new Set([...SYMMETRY_KINDS, 'card', 'badge'])
const HOME_SHEET_SYMMETRY_KINDS = new Set([...SYMMETRY_KINDS, 'sheet'])
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
  ...Object.fromEntries(['sheet-home', 'sheet-open-session', 'sheet-finish', 'sheet-timer', 'sheet-food', 'line-sheet'].map((n) => [n, 1])),
}
const SET_SCENES = new Set(['session', 'session-375', 'history-detail-edit'])
/** 시작 자리를 재는 장면 (RR4). 390 폭 넷, 375 폭 둘 */
const START_SPOT_SCENES = new Set(['home', 'home-banner', 'home-banners-open', 'home-resume', 'home-375', 'home-banner-375'])
const LAST_SCENES = new Set(['home', 'home-end', 'home-resume', 'home-resume-end', 'diet', 'history', 'analyze', 'settings-end'])
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
  const kinds = HOME_SCENES.includes(scene) ? HOME_SYMMETRY_KINDS : HOME_SHEET_SCENES.includes(scene) ? HOME_SHEET_SYMMETRY_KINDS : SYMMETRY_KINDS
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
  cells['가로 넘침'] = verdict(await page.evaluate(inPageOverflow))
  // 줄 안 버튼은 .row > .btn이 있는 장면(settings)에서만 잰다. 그 장면에서 0개면 실패
  const rowBtns = await page.evaluate(() => document.querySelectorAll('.row > .btn').length)
  cells['줄 안 버튼'] = rowBtns || scene === 'settings' ? verdict(await page.evaluate(inPageRowButtons)) : { status: '건너뜀', detail: '이 장면에 줄 안 버튼이 없다' }
  await newColumns(page, scene, cells, false)
  cells['띠'] = await barsVerdict(page, scene)
  cells['시트 버튼'] = await sheetButtonsCell(page, scene, false)
  rows.push({ scene, cells })
}

/** QQ3 흐름: sheet-finish가 떠 있을 때 부른다. 끝나면 시트를 다시 열어 둔다(뒤 장면이 시트를 닫는 코드를 그대로 쓴다). */
async function closeFlows(page) {
  const reopen = async () => {
    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await settle(page, 450)
  }
  const flow = (name, ok, detail) => flows.push([name, { ok, detail }])
  // 막 눌러 닫기: 누른 직후 is-closing, --motion-medium(300ms) 안에 막이 사라지고 아래 띠가 다시 보인다
  await page.mouse.click(195, 30)
  const closing = await page.locator('.sheet.is-closing').count()
  const gone = await page.locator('.sheet-backdrop').waitFor({ state: 'detached', timeout: 600 }).then(() => true, () => false)
  await settle(page, 150)
  const bars = gone ? await page.evaluate(inPageBars) : { ok: false, count: 0, detail: '막이 안 사라졌다' }
  flow('막 눌러 닫기', closing > 0 && gone && bars.ok && bars.count > 0, `is-closing ${closing}개 · 막 사라짐 ${gone} · 아래 띠 ${bars.count}개 불투명 ${bars.ok}`)
  // 두 번 누르기: 닫히는 중 한 번 더 눌러도 오류 없이 한 번만 닫힌다
  await reopen()
  const errs = []
  const onErr = (e) => errs.push(String(e))
  page.on('pageerror', onErr)
  await page.mouse.click(195, 30)
  await page.mouse.click(195, 30)
  const gone2 = await page.locator('.sheet-backdrop').waitFor({ state: 'detached', timeout: 600 }).then(() => true, () => false)
  await settle(page, 450)
  page.off('pageerror', onErr)
  const still = await page.getByRole('button', { name: '세션 최소화', exact: true }).count()
  flow('막 두 번 누르기', gone2 && errs.length === 0 && still > 0, `사라짐 ${gone2} · 오류 ${errs.length}건 · 세션 화면 ${still > 0}`)
  // 움직임 줄이기에서 닫기: 기다리지 않고 다음 프레임에 사라진다
  await reopen()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await settle(page, 100)
  await page.mouse.click(195, 30)
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const instant = (await page.locator('.sheet-backdrop').count()) === 0
  await page.emulateMedia({ reducedMotion: null })
  flow('움직임 줄이기에서 닫기', instant, `두 프레임 뒤 막 ${instant ? '없음' : '남음'}`)
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
  const toEnd = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const toTop = () => page.evaluate(() => window.scrollTo(0, 0))
  const closeSheet = async (name, button = '닫기') => {
    const dlg = page.getByRole('dialog', { name })
    await dlg.getByRole('button', { name: button, exact: true }).click()
    await dlg.waitFor({ state: 'detached' }).catch(() => {})
    await settle(page, 400)
  }

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
    await closeSheet('Day 선택')

    await page.getByRole('button', { name: /시작$|이어서 하기/ }).first().click()
    await page.getByRole('button', { name: '세션 최소화', exact: true }).waitFor()
    await settle(page, 800)
    await snap('session')
    await optional('session-375', async () => {
      await page.setViewportSize({ width: 375, height: 812 })
      await settle(page, 500)
      await snap('session-375')
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

    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await settle(page)
    await snap('sheet-finish')
    if (CHECK && phase === 'after' && !light) await closeFlows(page)
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
    await page.keyboard.press('Escape')
    if (await page.getByRole('dialog').count()) {
      await page.mouse.click(195, 30)
      await settle(page, 400)
    }

    // 세션 끝 → 요약
    await btn(page, '종료').click()
    await page.getByRole('dialog', { name: '세션 종료' }).waitFor()
    await btn(page, '기록 마치기').click()
    await btn(page, '홈으로').waitFor({ timeout: 8000 })
    await settle(page, 800)
    await snap('summary')
    await btn(page, '홈으로').click()
    await page.getByRole('button', { name: '기록', exact: true }).waitFor()
    await settle(page, 600)

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
    // 세션 장면은 h1이 없어 세션 머리의 루틴 이름(.session-day)을 쓴다 (RR11 리뷰 3)
    const h = document.querySelector('h1') ?? document.querySelector('.session-day')
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
      if (dark.h1 === null) bad.push('제목 요소(h1·.session-day)를 못 찾았다')
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
      // RR3·RR12: 안전 영역이 있는 홈에서도 띠 ↔ 탭 줄·탭 ↔ 선택 표시·탭 ↔ 아이콘 + 글자가 대칭이다(아래 안전 영역은 뺀다)
      if (name === 'home-safe') {
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
