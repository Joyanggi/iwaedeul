/**
 * UI 검사 함수 모음 (PLAN v1.19 QQ0). import해도 아무것도 실행하지 않는다.
 * `inPage*`는 page.evaluate로 브라우저 안에서 돈다(바깥 변수를 못 본다. 보이는 요소 판정은 window.__vis).
 * 판정 모양: `{ ok, detail }` 또는 `{ skip, detail }`.
 */

import { createServer } from 'node:net'

/** 띠 선택자 — 이 한 줄이 유일한 출처다. 페이지에는 window.__ui.BARS로 한 번 깔린다 (v1.20 RR0, RRM에서 RRM에서 옮김). 시트는 따로 */
export const BAR_SELECTOR = '.ax-bar'
export const SHEET_SELECTOR = '.astryx-bottom-sheet'

/** 보이는 요소만 (크기 1px 이하·display none·visibility hidden은 뺀다). 판정은 여기 한 곳. 페이지에는 window.__vis로 깔린다 */
export const inPageVisibleDef = (el) => {
  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1
}

/** 색 도우미를 페이지에 깐다 (window.__ui) */
export const inPageInstall = () => {
  const parse = (s) => {
    s = (s ?? '').trim()
    if (s === '' || s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
    let m = s.match(/^rgba?\(([^)]+)\)$/)
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith('%') ? Number.parseFloat(x) / 100 : Number.parseFloat(x)))
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
    }
    m = s.match(/^color\(srgb ([^)]+)\)$/)
    if (m) {
      const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number.parseFloat)
      return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }
    }
    m = s.match(/^#([0-9a-f]{3,8})$/i)
    if (m) {
      let h = m[1]
      if (h.length <= 4) h = [...h].map((c) => c + c).join('')
      const n = (i) => Number.parseInt(h.slice(i, i + 2), 16)
      return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 }
    }
    throw new Error(`색을 못 읽는다: ${s}`)
  }
  /** sRGB 채널별 α·위 + (1−α)·아래. 결과 알파는 1(아래가 불투명이라고 본다) */
  const over = (top, under) => ({
    r: top.a * top.r + (1 - top.a) * under.r,
    g: top.a * top.g + (1 - top.a) * under.g,
    b: top.a * top.b + (1 - top.a) * under.b,
    a: 1,
  })
  const lum = (c) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const bg = (el) => parse(getComputedStyle(el).backgroundColor)
  const filterOf = (el) => {
    const cs = getComputedStyle(el)
    const v = cs.backdropFilter && cs.backdropFilter !== '' ? cs.backdropFilter : cs.webkitBackdropFilter
    return v && v !== '' ? v : 'none'
  }
  const sheetOf = () => [...document.querySelectorAll(window.__SHEETS)].find((el) => window.__vis(el)) ?? null
  window.__ui = { parse, over, ratio, bg, filterOf, sheetOf, BARS: window.__BARS }
}

/** addInitScript에 넘길 글: window.__vis와 window.__ui를 함께 깐다 */
export const installScript = () =>
  `window.__vis = ${inPageVisibleDef}; window.__BARS = ${JSON.stringify(BAR_SELECTOR)}; window.__SHEETS = ${JSON.stringify(SHEET_SELECTOR)}; (${inPageInstall})()`

/** 빈 포트 하나 (Node) */
export function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer()
    s.once('error', reject)
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

/** 가로 넘침 */
export const inPageOverflow = () => ({
  ok: document.documentElement.scrollWidth <= innerWidth,
  detail: `scrollWidth ${document.documentElement.scrollWidth} / ${innerWidth}`,
})

/**
 * `띠` (RRM): 보이는 띠·시트마다 ① 계산된 backdrop-filter(와 -webkit- 짝)가 none ② 배경색 알파가 1(불투명).
 * 띠 위 글자의 대비는 따로 안 잰다 — 불투명한 면이라 axe의 color-contrast가 잰다. 개수(count)는 Node가 EXPECTED_BARS와 견준다
 */
export const inPageBars = () => {
  const u = window.__ui
  const bars = [...document.querySelectorAll(u.BARS)].filter((el) => window.__vis(el))
  const sheet = u.sheetOf()
  const layers = sheet ? [...bars, sheet] : bars
  const bad = []
  const seen = []
  for (const el of layers) {
    const name = el.className.toString().split(' ')[0]
    const f = u.filterOf(el)
    const a = u.bg(el).a
    seen.push(`${name} α${+a.toFixed(3)}`)
    if (f !== 'none') bad.push(`${name} backdrop-filter ${f}`)
    if (a < 1 - 1e-9) bad.push(`${name} 배경 α${+a.toFixed(3)}`)
  }
  return { ok: bad.length === 0, count: layers.length, detail: bad.length ? bad.join(' · ') : seen.join(' · ') }
}

/**
 * `시트 버튼` (RRM): 시트 안 보이는 버튼마다 "버튼 면 또는 선의 색"과 "시트 면의 색"의 대비 가운데 큰 쪽.
 * 돌려주는 buttons는 [이름, 대비]. 판정은 Node가 한다(시트 면과 같은 색이 아닌가, 다크 값이 라이트 값보다 0.05 넘게 낮지 않은가)
 */
export const inPageSheetButtons = () => {
  const u = window.__ui
  const sheet = u.sheetOf()
  if (!sheet) return { skip: true, detail: '시트가 없다' }
  const face = u.bg(sheet)
  const buttons = [...sheet.querySelectorAll('button')].filter((b) => window.__vis(b))
  const out = buttons.map((b, i) => {
    const cs = getComputedStyle(b)
    const fill = u.over(u.parse(cs.backgroundColor), face)
    const line = Number.parseFloat(cs.borderTopWidth) > 0 ? u.over(u.parse(cs.borderTopColor), face) : face
    const r = Math.max(u.ratio(fill, face), u.ratio(line, face))
    return [`${i}:${(b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 12)}`, +r.toFixed(3)]
  })
  return { buttons: out, detail: `${out.length}개` }
}

/**
 * 시트 버튼 판정 (Node). dark·light는 inPageSheetButtons의 buttons([이름, 대비]). light가 없으면(다크 장면 칸) 버튼이 있는지만 본다 — 견줌은 둘이 다 있을 때.
 * 글자만 있는 버튼(다크·라이트 둘 다 면·선이 시트 면과 같은 색 — 목록 줄·시간 칩)은 면으로 알려지는 버튼이 아니라 판정에서 뺀다(개수만 찍는다).
 * 면·선이 있는 버튼은 ① 다크에서만 시트 면과 같은 색이 되면 실패 ② 다크 값이 라이트 값보다 0.05 넘게 낮고 3:1(WCAG 비텍스트 대비)에도 못 미치면 실패.
 * ②를 3:1로 좁힌 까닭: 반전 버튼은 다크 13:1 · 라이트 17:1처럼 값이 달라도 둘 다 또렷하다 — 값이 낮다는 것만으로 "묻힘"은 아니다
 */
export function sheetButtonVerdict(dark, light) {
  if (!dark || dark.length === 0) return { ok: false, detail: '버튼이 0개 — 아무것도 안 쟀다' }
  if (!light) return { ok: true, detail: `${dark.length}개` }
  const bad = []
  const seen = []
  let textOnly = 0
  for (const [name, r] of dark) {
    const l = light.find(([n]) => n === name)?.[1]
    if (r < 1.05 && (l === undefined || l < 1.05)) {
      textOnly++
      continue
    }
    if (r < 1.05) bad.push(`${name} 다크에서 시트 면과 같은 색(${r}) · 라이트 ${l}`)
    else if (l !== undefined && r < l - 0.05 && r < 3) bad.push(`${name} 다크 ${r} < 라이트 ${l} − 0.05 · 3:1 미만`)
    seen.push(`${name} 다크 ${r}${l === undefined ? '' : ` · 라이트 ${l}`}`)
  }
  return { ok: bad.length === 0, detail: `${bad.length ? bad.join(' · ') + ' / ' : ''}면·선 있는 버튼 ${seen.length}개 · 글자만 ${textOnly}개 제외${seen.length ? ' — ' + seen.join(' · ') : ''}` }
}

/** 정적 검사 (RRM): src/**\/*.css에 backdrop-filter 0건 (Node). 주석은 뺀다 */
export function barStaticChecks(allCss) {
  const hits = Object.entries(allCss).filter(([, css]) => /backdrop-filter/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')))
  return [{ name: 'src/**/*.css에 backdrop-filter 0건', ok: hits.length === 0, detail: hits.length ? hits.map(([f]) => f).join(', ') : `${Object.keys(allCss).length}개 파일 0건` }]
}

/**
 * 지금 탭 (RR3): `nav[aria-label="화면"]` 안에 탭이 정확히 5개이고 `[aria-current="true"]`가 정확히 1개이며,
 * 그 탭이 다른 탭과 다르게 보인다(글자색이나 선택 표시 요소). 띠 안 순서는 [재개 줄(있으면), 탭 줄]이다.
 * 탭이 없는 장면은 skip.
 */
export const inPageCurrentTab = () => {
  const nav = document.querySelector('nav[aria-label="화면"]')
  if (!nav) return { skip: true, detail: '아래 탭이 없다' }
  const tabs = [...nav.querySelectorAll('button')]
  const current = tabs.filter((t) => t.getAttribute('aria-current') === 'true')
  const parts = []
  parts.push({ name: '탭 5개', ok: tabs.length === 5, detail: `${tabs.length}개` })
  parts.push({ name: 'aria-current="true" 1개', ok: current.length === 1, detail: `${current.length}개` })
  if (current.length === 1) {
    const color = (t) => getComputedStyle(t).color
    const mark = (t) => [...t.querySelectorAll('[class*="indicator" i], [class*="underline" i]')].filter((e) => window.__vis(e)).length
    const others = tabs.filter((t) => t !== current[0])
    const differs = others.every((t) => color(t) !== color(current[0]) || mark(t) !== mark(current[0]))
    parts.push({ name: '지금 탭이 다르게 보인다', ok: differs, detail: `글자색 ${color(current[0])} · 선택 표시 ${mark(current[0])}개` })
  }
  // 고침(화면 검증 반려 1): 탭 줄이 가로로 넘치거나 탭이 줄 밖으로 나가면 375에서 설정 글자가 잘린다
  const nr = nav.getBoundingClientRect()
  const outside = tabs.filter((t) => { const r = t.getBoundingClientRect(); return r.right > nr.right + 0.5 || r.left < nr.left - 0.5 })
  parts.push({ name: '탭이 줄 안', ok: nav.scrollWidth <= nav.clientWidth && outside.length === 0, detail: `scrollWidth ${nav.scrollWidth} · clientWidth ${nav.clientWidth} · 밖 ${outside.length}개` })
  const bar = nav.closest('.ax-bar')
  if (!bar) parts.push({ name: '띠 안', ok: false, detail: '.ax-bar 밖' })
  else {
    const strip = [...bar.children].filter((k) => window.__vis(k))
    const last = strip[strip.length - 1]
    parts.push({ name: '탭 줄이 띠의 마지막', ok: last === nav || last?.contains(nav), detail: `띠 안 ${strip.length}줄` })
  }
  const bad = parts.filter((p) => !p.ok)
  return { ok: bad.length === 0, detail: parts.map((p) => `${p.name} ${p.ok ? '✓' : '✗'}(${p.detail})`).join(' · ') }
}

/** 눌림 반응을 재는 요소 선택자 */
export const PRESS_SELECTOR = 'button, [role="button"], a[href]'

/** 화면에서 눌러 볼 요소의 가운데 점. 가려졌거나 disabled면 null. 요소마다 0부터 번호를 붙여 돌려준다 */
export const inPagePressTargets = () => {
  const out = []
  // 앞 호출이 남긴 번호를 지운다 — 같은 페이지에서 장면을 이어 재면 옛 번호가 남아 엉뚱한 요소를 집는다 (QQ2에서 발견)
  document.querySelectorAll('[data-uic]').forEach((el) => el.removeAttribute('data-uic'))
  document.querySelectorAll('button, [role="button"], a[href]').forEach((el) => {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return
    // v1.20 RR0: Astryx가 그리는 요소는 뺀다(요소 단위). 이 Chromium은 mouse.down으로 Astryx의 눌림을 못 칠한다(DEV-RECORD 제약).
    // 조건은 motion.css:26-30 기본 규칙이 빼는 것과 같다. 옮긴 화면의 눌림은 --press-shot과 실기기 확인이 본다
    if (el.closest("[class*='astryx-'], .ax-screen, .ax-bar, .ax-scope")) return
    if (!window.__vis(el)) return
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return
    const hit = document.elementFromPoint(x, y)
    if (!hit || !(el === hit || el.contains(hit))) return
    el.setAttribute('data-uic', String(out.length))
    const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 14)
    out.push({ i: out.length, x, y, label, cls: el.className.toString().split(' ').slice(0, 2).join('.') })
  })
  return out
}

/** 눌림 판정에 쓰는 계산 스타일 여섯 */
export const inPagePressStyle = (i) => {
  const el = document.querySelector(`[data-uic="${i}"]`)
  if (!el) return null
  const cs = getComputedStyle(el)
  return {
    transform: cs.transform,
    opacity: cs.opacity,
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    boxShadow: cs.boxShadow,
    filter: cs.filter,
    // 띠 안 버튼(탭바·재개 스트립)은 면이 아니라 안의 아이콘·글자만 옅어진다 (QQ2)
    childOpacity: [...el.children].map((c) => getComputedStyle(c).opacity).join(','),
  }
}

/**
 * 줄 안 버튼 (QQ6, SS6에서 새 정의): 카드 안 줄(`Row` — `[role="listitem"]`)의 오른쪽 칸 안 Astryx 버튼마다 폭이 줄 폭의 절반 미만, 줄 안에 들고, 글자 한 줄.
 * 오른쪽 칸 = 줄의 마지막 자식. 줄의 첫 자식(이름 칸) 안의 버튼은 재지 않는다. 0개면 실패(아무것도 안 쟀다).
 */
export const inPageRowButtons = () => {
  const bad = []
  let n = 0
  for (const row of document.querySelectorAll('[role="listitem"]')) {
    if (!window.__vis(row) || row.children.length < 2) continue
    const end = row.lastElementChild
    for (const el of end.querySelectorAll("button[class*='astryx-']")) {
      if (!window.__vis(el)) continue
      n++
      const r = row.getBoundingClientRect()
      const b = el.getBoundingClientRect()
      // 줄 수는 버튼 안 글자 노드의 상자로 센다(바깥 감싸개 상자까지 세면 한 줄도 여러 줄로 읽힌다)
      const tops = new Set()
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.nodeValue.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(t)
        for (const c of range.getClientRects()) if (c.width > 0.5) tops.add(Math.round(c.top))
      }
      const lines = tops.size
      const why = []
      if (b.width >= r.width / 2) why.push(`폭 ${Math.round(b.width)}px ≥ 줄 ${Math.round(r.width)}px의 절반`)
      if (b.left < r.left - 0.5 || b.right > r.right + 0.5) why.push('줄 밖으로 나감')
      if (lines > 1) why.push(`글자 ${lines}줄`)
      if (why.length) bad.push(`${el.textContent.trim()} (${why.join(', ')})`)
    }
  }
  if (n === 0) return { ok: false, detail: '보이는 줄 오른쪽 칸 안 Astryx 버튼이 0개 — 검사가 아무것도 안 쟀다' }
  return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : `${n}개 통과` }
}

/** 여백 격자: 계산된 padding·margin-top/bottom·gap이 0이거나 2px의 배수 */
export const inPageSpacing = () => {
  const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']
  const bad = new Map()
  let n = 0
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg')) continue
    if (el.parentElement?.closest('[class*="astryx-"]') && el.closest('[class*="astryx-"]')) continue
    if (el.matches('[class*="astryx-"]')) continue
    if (!window.__vis(el)) continue
    n++
    const cs = getComputedStyle(el)
    for (const p of props) {
      const raw = cs[p]
      if (raw === 'normal' || raw === 'auto') continue
      const v = Number.parseFloat(raw)
      if (!Number.isFinite(v) || v === 0) continue
      const r = Math.round(v * 2) / 2 // 0.5px 안이면 반올림
      if (Math.abs(v - r) < 0.5 && r % 2 === 0) continue
      const key = `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0] || '-'} ${p} ${+v.toFixed(2)}px`
      bad.set(key, (bad.get(key) ?? 0) + 1)
    }
  }
  const list = [...bad.entries()].map(([k, c]) => `${k}${c > 1 ? ` ×${c}` : ''}`)
  return { ok: list.length === 0, detail: list.length ? list.slice(0, 4).join(' · ') + (list.length > 4 ? ` 외 ${list.length - 4}` : '') : `${n}개 요소 격자 안` }
}

/**
 * 눌림 반응 (Node에서 page로 돈다).
 * 가운데 점에 mouse.move → down → holdMs(기본: --duration-fast + 한 프레임) 뒤 스타일 비교 → 요소 밖으로 끌고 나가 up → 원래대로 돌아왔는지.
 * `opts.skipClass`가 있으면 그 클래스를 가진 요소는 센다(건너뛰지 않는다). 돌려주는 것: { changed: [...], same: [...], stuck: [...], transformed: [...] }
 */
export async function measurePress(page, holdMs) {
  // 전이가 끝나도록 Astryx --duration-fast(175ms) + 한 프레임(약 16ms) 이상 기다린다. 계산된 값을 읽고, 못 읽으면 175ms
  if (holdMs === undefined) {
    const fastMs = await page.evaluate(() => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--duration-fast').trim()
      const n = parseFloat(v)
      return Number.isFinite(n) ? (v.endsWith('ms') ? n : n * 1000) : 175
    })
    // RR1: 테마가 앱 뿌리에 걸려 토큰이 읽히기 시작했다(125ms). 전엔 못 읽어 175ms로 기다렸으므로 그 아래로 줄이지 않는다 — 20ms 여유로는 뗄 때의 전이가 안 끝나 "안 돌아옴"이 무작위로 났다
    holdMs = Math.max(Math.ceil(fastMs) + 20, 195)
  }
  const targets = await page.evaluate(inPagePressTargets)
  const same = []
  const stuck = []
  const transformed = []
  let changedN = 0
  for (const t of targets) {
    const before = await page.evaluate(inPagePressStyle, t.i)
    if (!before) continue
    await page.mouse.move(t.x, t.y)
    await page.mouse.down()
    await page.waitForTimeout(holdMs)
    const during = await page.evaluate(inPagePressStyle, t.i)
    // mouse.up은 요소 밖에서 한다(클릭이 되지 않게)
    await page.mouse.move(-1, -1)
    await page.mouse.up()
    await page.waitForTimeout(holdMs)
    const after = await page.evaluate(inPagePressStyle, t.i)
    if (!during) continue
    const diff = Object.keys(before).filter((k) => before[k] !== during[k])
    const name = `"${t.label}" .${t.cls}`
    if (diff.length === 0) same.push(name)
    else {
      changedN++
      if (diff.includes('transform')) transformed.push(name)
    }
    if (after && Object.keys(before).some((k) => before[k] !== after[k]) && diff.length > 0) stuck.push(name)
  }
  return { total: targets.length, changedN, same, stuck, transformed }
}

export const pressVerdict = (r) => {
  if (r.total === 0) return { skip: true, detail: '누를 요소가 없다' }
  const bad = [...r.same.map((n) => `${n} 변화 없음`), ...r.stuck.map((n) => `${n} 안 돌아옴`)]
  return {
    ok: bad.length === 0,
    detail: bad.length ? `${bad.length}/${r.total}건: ` + bad.slice(0, 4).join(' · ') + (bad.length > 4 ? ` 외 ${bad.length - 4}` : '') : `${r.total}개 모두 반응`,
  }
}

/**
 * 움직임 정적 검사 (QQ2). Node에서 CSS 소스 글자를 읽는다.
 * @param {Record<string, string>} allCss `src/**\/*.css` 경로 → 글자
 * @returns {{ name: string, ok: boolean, detail: string }[]}
 */
export function motionStaticChecks(allCss) {
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = []
  const add = (name, ok, detail) => out.push({ name, ok, detail })
  const motion = allCss['styles/motion.css'] === undefined ? null : strip(allCss['styles/motion.css'])
  if (motion === null) {
    add('motion.css 있음', false, 'src/styles/motion.css가 없다')
    return out
  }
  // 1. 눌림 기본 규칙: :where( 로 시작, button·[role="button"], :active, 제외 셋
  const base = [...motion.matchAll(/(:where\(\s*button[^{]*?)\{/g)].map((m) => m[1]).find((s) => s.includes(':active')) ?? null
  const q = (s) => s.replace(/"/g, "'")
  const baseOk = base !== null && q(base).includes("[role='button']")
  add('눌림 기본 규칙: :where(button, [role=button]):active 하나', baseOk, baseOk ? ':where( … ):active' : '없음')
  const miss = ['.ax-screen', 'astryx-'].filter((k) => base === null || !base.includes(k))
  add('기본 규칙에 Astryx(.ax-screen·astryx-) 제외', miss.length === 0, miss.length ? `없음: ${miss.join(', ')}` : '.ax-screen · astryx-')
  // 2. 움직임 줄이기
  add('motion.css에 prefers-reduced-motion', motion.includes('prefers-reduced-motion'), motion.includes('prefers-reduced-motion') ? '있음' : '없음')
  // 4. will-change 0건 (Astryx 패키지는 src 밖이라 애초에 없다)
  const wc = Object.entries(allCss).filter(([, css]) => /will-change\s*:/.test(strip(css))).map(([f]) => f)
  add('src/**/*.css에 will-change 0건', wc.length === 0, wc.length ? wc.join(' · ') : `${Object.keys(allCss).length}개 파일 0건`)
  return out
}

// ───────────────────────── v1.20 RR0: 새 검사 ─────────────────────────
// 아래 `inPage*`도 page.evaluate로 도는 함수다(바깥 변수 못 봄). 판정 모양은 { ok, detail } 또는 { skip, detail }.

/** `탭 누름` (RR3부터 판정): 아래 Astryx 탭마다 글자 중심의 x에서, 띠의 위·아래 끝 2px 안쪽 점에 elementFromPoint를 쏴서 그 탭(또는 자손)이 나오는가 */
export const inPageTabHit = () => {
  const bar = [...document.querySelectorAll('.ax-bar')].find((b) => window.__vis(b) && b.querySelector('nav'))
  if (!bar) return { skip: true, detail: 'Astryx 탭 띠(.ax-bar > nav)가 없다' }
  // 시트가 떠 있으면 막이 띠 위를 덮는다 — 그때 탭은 눌리지 않는 것이 맞다
  if (window.__ui.sheetOf()) return { skip: true, detail: '시트가 떠 있어 막이 띠를 덮는다' }
  const tabs = [...bar.querySelectorAll("nav button, nav a, [role='tab']")].filter((t) => window.__vis(t))
  if (tabs.length === 0) return { ok: false, detail: '띠 안에 탭이 0개 — 아무것도 안 쟀다' }
  const r = bar.getBoundingClientRect()
  const bad = []
  for (const t of tabs) {
    const tr = t.getBoundingClientRect()
    const x = tr.left + tr.width / 2
    // 위 끝: 띠 안 탭 줄 바로 위에 재개 줄이 있으면 그 줄의 아래 끝이 이 탭의 위 끝이다(탭 줄과 재개 줄 사이의 틈이 탭의 눌림 영역이다)
    const above = [...bar.children].filter((k) => window.__vis(k) && k.getBoundingClientRect().bottom <= tr.top + 1 && !k.contains(t))
    const topEdge = above.length ? Math.max(...above.map((k) => k.getBoundingClientRect().bottom)) : r.top
    for (const [label, y] of [['위', topEdge + 2], ['아래', r.bottom - 2]]) {
      const hit = document.elementFromPoint(x, y)
      if (!hit || !(t === hit || t.contains(hit))) bad.push(`${(t.textContent ?? '').trim().slice(0, 8)} ${label} 끝`)
    }
  }
  return { ok: bad.length === 0, detail: bad.length ? bad.slice(0, 4).join(' · ') : `${tabs.length}개 탭 × 위·아래 끝 통과` }
}

/** `세트 숫자` (RR7부터 판정): `.set-row` 안 input의 글자 크기가 `--text-heading-2-size`를 임시 요소의 font-size로 푼 값 이상인가. 0개면 실패 */
export const inPageSetNumber = () => {
  const inputs = [...document.querySelectorAll('.set-row input')].filter((el) => window.__vis(el))
  if (inputs.length === 0) return { ok: false, detail: '.set-row 안 보이는 input이 0개 — 아무것도 안 쟀다' }
  // 토큰이 없으면 var()가 무효라 font-size가 물려받은 16px로 풀려 거짓 통과한다 — 먼저 토큰이 있는지 본다
  if (getComputedStyle(document.documentElement).getPropertyValue('--text-heading-2-size').trim() === '') {
    return { ok: false, detail: '--text-heading-2-size가 비었다(테마 토큰이 안 걸린 장면)' }
  }
  const probe = document.createElement('span')
  probe.style.fontSize = 'var(--text-heading-2-size)'
  document.documentElement.appendChild(probe)
  const floor = Number.parseFloat(getComputedStyle(probe).fontSize)
  probe.remove()
  if (!(floor > 0)) return { ok: false, detail: '--text-heading-2-size를 못 풀었다(테마 토큰이 비었다)' }
  const bad = inputs.map((el) => Number.parseFloat(getComputedStyle(el).fontSize)).filter((v) => v < floor - 0.01)
  return { ok: bad.length === 0, detail: bad.length ? `${bad.length}/${inputs.length}개가 ${floor}px 미만(${bad.slice(0, 3).join(',')}px)` : `${inputs.length}개 ≥ ${floor}px` }
}

/** `마지막 요소` (RR3부터 판정): 끝까지 스크롤했을 때 본문(`.ax-screen`·`.screen`)의 마지막 보이는 자식의 아래 끝이 화면 아래에 붙은 띠의 위 끝보다 위인가. 끝나면 스크롤을 원래 자리로 돌려놓는다(뒤 검사 — 탭바 자리의 가림 — 가 그 자리에서 잰다) */
export const inPageLastVisible = () => {
  const root = document.querySelector('.ax-screen, .screen')
  if (!root) return { skip: true, detail: '본문(.ax-screen·.screen)이 없다' }
  const y0 = window.scrollY
  window.scrollTo(0, document.documentElement.scrollHeight)
  const kids = [...root.children].filter((el) => window.__vis(el) && !el.matches('.ax-bar'))
  const bars = [...document.querySelectorAll(window.__ui.BARS)].filter((b) => window.__vis(b) && b.getBoundingClientRect().bottom >= innerHeight - 1)
  let out
  if (kids.length === 0) out = { ok: false, detail: '본문에 보이는 자식이 0개 — 아무것도 안 쟀다' }
  else if (bars.length === 0) out = { skip: true, detail: '화면 아래에 붙은 띠가 없다' }
  else {
    const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top))
    const bottom = Math.max(...kids.map((el) => el.getBoundingClientRect().bottom))
    out = { ok: bottom <= top + 0.5, detail: `마지막 요소 아래 ${Math.round(bottom)} · 띠 위 ${Math.round(top)}${bottom > top + 0.5 ? ` (${Math.round(bottom - top)}px 가림)` : ''}` }
  }
  // RR6: 위에 붙은 띠(세션 상단 바)가 있으면 맨 위에서 첫 보이는 자식이 그 띠 아래에서 시작하는가
  const topBars = [...document.querySelectorAll(window.__ui.BARS)].filter((b) => window.__vis(b) && b.getBoundingClientRect().top <= 1)
  if (topBars.length > 0 && kids.length > 0) {
    window.scrollTo(0, 0)
    const barBottom = Math.max(...topBars.map((b) => b.getBoundingClientRect().bottom))
    const first = kids[0].getBoundingClientRect().top
    const covered = first < barBottom - 0.5
    const note = `첫 요소 위 ${Math.round(first)} · 위 띠 아래 ${Math.round(barBottom)}${covered ? ` (${Math.round(barBottom - first)}px 가림)` : ''}`
    out = out.skip ? { ok: !covered, detail: note } : { ok: out.ok && !covered, detail: `${out.detail} · ${note}` }
  }
  window.scrollTo(0, y0)
  return out
}

/**
 * `섬 버튼` (RR7부터 판정): legacy 화면(.screen 등) 안의 Astryx 버튼의 min-height가 legacy 값(44px)이 아닌가.
 * 섬(`.ax-scope`) 안의 버튼은 당연히 재고, **섬 밖인데 legacy 범위 안에 있는 Astryx 버튼**도 잰다 — 섬을 빠뜨리면 그 버튼이 legacy `button { min-height: 44px }`를 맞는다
 * (카드가 섬을 잃어도 스테퍼가 스스로 섬이라 섬 안 버튼만 재면 못 잡는다 — RR7 결함 복원 ⑭에서 확인).
 * 섬도 legacy 안 Astryx 버튼도 없는 장면은 건너뛴다. 있는데 버튼이 0개면 실패.
 */
export const inPageIslandButtons = () => {
  const LEGACY = '.screen, .onboarding, .banner'
  const islands = [...document.querySelectorAll('.ax-scope')].filter((el) => window.__vis(el))
  const inLegacy = [...document.querySelectorAll("button[class*='astryx-']")].filter((b) => window.__vis(b) && b.closest(LEGACY))
  if (islands.length === 0 && inLegacy.length === 0) return { skip: true, detail: '.ax-scope 섬도 legacy 안 Astryx 버튼도 없다' }
  const btns = [...new Set([...islands.flatMap((i) => [...i.querySelectorAll("button[class*='astryx-']")]).filter((b) => window.__vis(b)), ...inLegacy])]
  if (btns.length === 0) return { ok: false, detail: '섬 안·legacy 안 Astryx 버튼이 0개 — 아무것도 안 쟀다' }
  const bad = btns.filter((b) => Number.parseFloat(getComputedStyle(b).minHeight) === 44)
  return { ok: bad.length === 0, detail: bad.length ? `${bad.length}/${btns.length}개가 min-height 44px(legacy 값이 샜다: ${[...new Set(bad.map((x) => (x.getAttribute('aria-label') || x.textContent || '').trim().slice(0, 10)))].slice(0, 4).join(', ')})` : `${btns.length}개 legacy 값 아님` }
}

/** `테마 토큰` 목록 — PLAN v1.20 RR2 표의 Astryx 토큰 전부 */
export const THEME_TOKENS = [
  '--color-background-body', '--color-background-card', '--color-background-muted', '--color-background-surface', '--color-border',
  '--color-text-primary', '--color-text-secondary', '--color-text-accent', '--color-accent', '--color-accent-muted',
  '--color-text-success', '--color-text-warning', '--color-text-error', '--color-success', '--color-warning', '--color-error',
  '--color-on-accent', '--color-on-success', '--color-on-warning',
]

/** `테마 토큰` (RR1부터 판정): 목록의 토큰이 <html>에서 전부 비어 있지 않은가. 문서 배경(`--color-background-body`)을 임시 요소로 풀어 bg로 돌려준다(라이트·다크 장면이 다른지는 Node에서 견준다) */
export const inPageThemeTokens = (tokens) => {
  const cs = getComputedStyle(document.documentElement)
  const empty = tokens.filter((t) => cs.getPropertyValue(t).trim() === '')
  const probe = document.createElement('span')
  probe.style.backgroundColor = 'var(--color-background-body)'
  document.documentElement.appendChild(probe)
  const bg = getComputedStyle(probe).backgroundColor
  probe.remove()
  return { ok: empty.length === 0, bg, detail: empty.length ? `빈 토큰 ${empty.length}개: ${empty.slice(0, 3).join(', ')}` : `${tokens.length}개 토큰 있음` }
}

/** 배치 기록 (RR0): 장면의 보이는 버튼·입력칸·제목(h1~h3)·문단·카드의 사각형을 문서 순서대로 [태그, x, y, 폭, 높이](0.5px 반올림)로 모은다 */
export const inPageRects = () => {
  const half = (v) => Math.round(v * 2) / 2
  const sel = "button, input, textarea, select, h1, h2, h3, p, .card, [class*='card']"
  return [...document.querySelectorAll(sel)]
    .filter((el) => window.__vis(el))
    .map((el) => {
      const r = el.getBoundingClientRect()
      return [el.tagName.toLowerCase(), half(r.x), half(r.y + window.scrollY), half(r.width), half(r.height)]
    })
}

/** 두 배치 기록(한 장면의 사각형 목록)을 견준다. 개수가 다르거나 하나라도 다르면 실패, 처음 다른 요소를 찍는다 (Node) */
export function compareRects(base, now) {
  if (!base) return { ok: false, detail: '견줄 기록이 없다' }
  if (base.length !== now.length) return { ok: false, detail: `요소 수 ${base.length} → ${now.length}` }
  for (let i = 0; i < base.length; i++) {
    if (base[i].some((v, k) => v !== now[i][k])) return { ok: false, detail: `${i}번째 ${base[i][0]}: [${base[i].slice(1)}] → [${now[i].slice(1)}]` }
  }
  return { ok: true, detail: `${base.length}개 요소 같다` }
}

/** 차트 색 (RR2): 선(`.recharts-line-curve`·막대 등 stroke가 있는 path 하나)의 stroke와 축 글자 하나의 fill을 **계산된** 값으로 돌려준다 */
export const inPageChartColors = () => {
  // 시드 기록이 적으면 추이 선은 안 그려진다 — 그때는 막대의 fill을 선 자리에 잰다
  const line = document.querySelector('.recharts-line-curve')
  const bar = document.querySelector('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')
  const tick = document.querySelector('.recharts-cartesian-axis-tick-value')
  const cs = (el, prop) => (el ? getComputedStyle(el)[prop] : '')
  return { line: line ? cs(line, 'stroke') : cs(bar, 'fill'), tick: cs(tick, 'fill') }
}

/** `rgb(r, g, b)` 글자의 밝기(0~255, 단순 평균 가중) — 실패하면 NaN (Node) */
export function rgbLuminance(rgb) {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || '')
  return m ? 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] : NaN
}

/** 차트 색 판정 (Node): 둘 다 rgb( 로 시작하고 투명·검정 기본값이 아니며 라이트와 다크에서 다르다 */
export function chartColorVerdict(c) {
  if (!c || c.dark === undefined || c.light === undefined) return { ok: false, detail: '다크·라이트 한 쪽을 못 쟀다' }
  const bad = (v) => !/^rgb/.test(v) || /^rgba\(.*,\s*0\)$/.test(v) || v === 'rgb(0, 0, 0)'
  for (const k of ['line', 'tick']) {
    if (bad(c.dark[k]) || bad(c.light[k])) return { ok: false, detail: `${k}: 다크 ${c.dark[k] || '없음'} · 라이트 ${c.light[k] || '없음'}` }
    if (c.dark[k] === c.light[k]) return { ok: false, detail: `${k}가 라이트·다크에서 같다: ${c.dark[k]}` }
  }
  return { ok: true, detail: `선 ${c.dark.line} → ${c.light.line} · 축 ${c.dark.tick} → ${c.light.tick}` }
}

/**
 * `시작 자리` (v1.20 RR4): 홈의 시작 버튼(운동 카드의 첫 `시작`·`이어서 하기` 버튼 — 알림 배너의 `디로드로 시작`은 카드 뒤에 있어 안 잡힌다)의
 * 문서 위 끝·아래 끝, 스크롤 0에서 그 아래 끝과 아래 띠의 위 끝을 돌려준다. 같은 장면 묶음에서 위 끝이 같은지는 Node(`startSpotVerdict`)가 본다.
 */
export const inPageStartSpot = () => {
  const y0 = window.scrollY
  window.scrollTo(0, 0)
  const btn = [...document.querySelectorAll('.ax-screen button')].find((b) => window.__vis(b) && /시작$|이어서 하기/.test(b.textContent.trim()))
  if (!btn) {
    window.scrollTo(0, y0)
    return { found: false }
  }
  const r = btn.getBoundingClientRect()
  const bars = [...document.querySelectorAll(window.__ui.BARS)].filter((b) => window.__vis(b) && b.getBoundingClientRect().bottom >= innerHeight - 1)
  const barTop = bars.length ? Math.min(...bars.map((b) => b.getBoundingClientRect().top)) : innerHeight
  window.scrollTo(0, y0)
  return { found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), barTop: Math.round(barTop) }
}

/** 시작 자리 판정: spots = { 장면: inPageStartSpot() }. 장면이 둘 이상이어야 하고, 위 끝이 모두 같고, 아래 끝이 아래 띠 위 끝보다 위여야 한다 */
export function startSpotVerdict(spots) {
  const names = Object.keys(spots)
  const missing = names.filter((n) => !spots[n].found)
  if (missing.length) return { ok: false, detail: `시작 버튼을 못 찾은 장면: ${missing.join(', ')}` }
  if (names.length < 2) return { ok: false, detail: `잰 장면이 ${names.length}개 — 둘 이상이어야 견준다` }
  const tops = names.map((n) => spots[n].top)
  const sameTop = tops.every((t) => Math.abs(t - tops[0]) <= 1)
  const covered = names.filter((n) => spots[n].bottom > spots[n].barTop)
  const ok = sameTop && covered.length === 0
  const list = names.map((n) => `${n} ${spots[n].top}`).join(' · ')
  return { ok, detail: `위 끝 ${list}${sameTop ? '' : ' (다르다)'}${covered.length ? ` · 아래 띠에 가림: ${covered.join(', ')}` : ''}` }
}

/**
 * `−`·`+`·`✓`의 누르는 영역 (RR7): 세트 행 버튼마다 중심에서 위·아래·왼쪽·오른쪽 21px 점에 elementFromPoint를 쏜다.
 * 통과: 자기 자신이거나, 이웃 버튼이 나오되 그 점이 두 버튼 사이 **중간선을 넘은** 자리일 때(맞닿은 이웃이 나눠 갖는다).
 * 실패: 빈 곳(버튼이 아닌 것)이 나오거나, 중간선 안쪽인데 이웃이 가져간 점. 버튼 0개면 실패(아무것도 안 쟀다).
 */
export const inPageTouchReach = () => {
  const REACH = 21
  // 위 띠 아래로 가려진 행은 점이 띠에 맞는다 — 첫 두 행을 화면 가운데로 올려 가려지지 않은 채로 잰다
  const rows = [...document.querySelectorAll('.set-row')].filter((r) => window.__vis(r)).slice(0, 2)
  if (rows.length === 0) return { ok: false, detail: '.set-row가 0개 — 아무것도 안 쟀다' }
  const bad = []
  let count = 0
  for (const row of rows) {
    row.scrollIntoView({ block: 'center' })
    for (const b of row.querySelectorAll('button')) {
      if (!window.__vis(b)) continue
      count++
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      for (const [dir, dx, dy] of [['왼', -REACH, 0], ['오른', REACH, 0], ['위', 0, -REACH], ['아래', 0, REACH]]) {
        const x = cx + dx
        const y = cy + dy
        const hit = document.elementFromPoint(x, y)
        const hb = hit ? hit.closest('button') : null
        if (hb === b) continue
        const name = (b.getAttribute('aria-label') || b.textContent || '').trim().slice(-12)
        if (!hb) {
          bad.push(`${name} ${dir}쪽 ${REACH}px: 버튼이 아닌 곳(${hit ? hit.tagName : '없음'})`)
          continue
        }
        // 이웃이 나왔다: 두 버튼의 마주 보는 변 사이 중간선을 넘은 점이어야 한다
        const o = hb.getBoundingClientRect()
        const own = dir === '왼' ? r.left : dir === '오른' ? r.right : dir === '위' ? r.top : r.bottom
        const other = dir === '왼' ? o.right : dir === '오른' ? o.left : dir === '위' ? o.bottom : o.top
        const mid = (own + other) / 2
        const past = dir === '왼' ? x <= mid : dir === '오른' ? x >= mid : dir === '위' ? y <= mid : y >= mid
        if (!past) bad.push(`${name} ${dir}쪽 ${REACH}px: 이웃(${(hb.getAttribute('aria-label') || '').trim().slice(-12)})이 중간선 안쪽을 가져감`)
      }
    }
  }
  if (count === 0) return { ok: false, detail: '.set-row 안 보이는 버튼이 0개 — 아무것도 안 쟀다' }
  return { ok: bad.length === 0, detail: bad.length ? bad.slice(0, 4).join(' · ') : `행 ${rows.length}개 · 버튼 ${count}개 × 4방향 21px` }
}

/**
 * 세트 표 (RR7): 머리의 세 글귀가 각각 한 줄이고(높이가 줄 높이의 1.5배 미만), 머리의 열 왼쪽 끝이 첫 세트 행의 같은 열(세트 번호·무게·횟수)과 같다.
 * `.ax-set-head`·`.set-row`가 없으면 실패.
 */
export const inPageSetTable = () => {
  const head = [...document.querySelectorAll('.ax-set-head')].find((h) => window.__vis(h))
  const row = head ? head.parentElement.querySelector('.set-row') : null
  if (!head || !row) return { ok: false, detail: '.ax-set-head 또는 .set-row가 없다 — 아무것도 안 쟀다' }
  const cols = [...head.children]
  const lh = parseFloat(getComputedStyle(cols[0]).lineHeight) || parseFloat(getComputedStyle(cols[0]).fontSize) * 1.5
  const tall = cols.filter((c) => c.getBoundingClientRect().height >= lh * 1.5)
  // 행의 열: 세트 번호(.ax-set-no), 무게·횟수 스테퍼(행의 직계 .ax-scope 둘)
  const rowCols = [row.querySelector('.ax-set-no'), ...row.querySelectorAll(':scope > .ax-scope')]
  const off = cols.map((c, i) => Math.abs(c.getBoundingClientRect().left - (rowCols[i] ? rowCols[i].getBoundingClientRect().left : 1e6))).map((v) => Math.round(v * 10) / 10)
  const ok = tall.length === 0 && cols.length === 3 && rowCols.length === 3 && off.every((v) => v <= 0.5)
  return { ok, detail: `머리 글귀 ${cols.length}개 · 두 줄 이상 ${tall.length}개 · 열 왼쪽 끝 차이 ${off.join('/')}px` }
}

/** 세트 행의 입력칸 (RR7): 행이 가로로 넘치지 않고, 보이는 모든 숫자 칸이 값을 안 자르는가(scrollWidth ≤ clientWidth). 0개면 실패 */
export const inPageNumberFit = () => {
  const inputs = [...document.querySelectorAll('.set-row input')].filter((i) => window.__vis(i))
  if (inputs.length === 0) return { ok: false, detail: '.set-row 안 보이는 input이 0개 — 아무것도 안 쟀다' }
  const cut = inputs.filter((i) => i.scrollWidth > i.clientWidth)
  const rows = [...document.querySelectorAll('.set-row')].filter((r) => window.__vis(r))
  // 행의 scrollWidth는 버튼의 안 보이는 누르는 영역(밖으로 4px)까지 세므로, 보이는 버튼·입력칸의 사각형이 행 안에 있는지로 잰다
  const outside = (r) => [...r.querySelectorAll('button, input')].some((e) => { const b = e.getBoundingClientRect(); const rr = r.getBoundingClientRect(); return b.right > rr.right + 0.5 || b.left < rr.left - 0.5 })
  const over = rows.filter(outside)
  return {
    ok: cut.length === 0 && over.length === 0 && document.documentElement.scrollWidth <= innerWidth,
    detail: `잘린 칸 ${cut.length}개${cut[0] ? `(${cut[0].value}: ${cut[0].scrollWidth}>${cut[0].clientWidth})` : ''} · 넘친 행 ${over.length}개 · 문서 ${document.documentElement.scrollWidth}/${innerWidth}`,
  }
}

/**
 * 경고·오류·성공 글자색 (RR8 화면 검증 반려, v1.21 SS2가 tone을 더했다): 선택자로 찾은 첫 요소의 계산된 color가 `--color-text-<tone>`(기본 warning)을 풀어 쓴 색과 같은가.
 * 클래스가 붙었는지만 세면 Astryx `Text`의 `[data-color]` 규칙에 져서 일반 글자색으로 보이는 결함을 못 잡는다.
 */
export const inPageToneColor = ({ sel, text, tone = 'warning' }) => {
  // text가 있으면 그 글을 담은 요소만 본다(요약의 복귀 카드 값 "60 → 20kg"처럼 같은 클래스가 여러 곳에 있을 때)
  const el = [...document.querySelectorAll(sel)].find((e) => !text || e.textContent.includes(text))
  if (!el) return { found: false, same: false, actual: '', token: '' }
  const probe = document.createElement('span')
  probe.style.color = `var(--color-text-${tone})`
  document.body.appendChild(probe)
  const token = getComputedStyle(probe).color
  probe.remove()
  const actual = getComputedStyle(el).color
  return { found: true, same: actual === token && token !== '', actual, token }
}

/**
 * 안쪽 폭 넘침 (RR9): 문서 폭만 보면 카드·시트 안에서 밖으로 삐져나온 요소를 못 잡는다.
 * root 안의 보이는 요소(와 글자)마다, 가까운 "눈에 보이는 상자"(배경색이나 테두리가 있는 조상 — 카드·시트·알림)의 좌우를 벗어났는지 잰다.
 * 가로 스크롤 칸·자르는 칸(overflow-x auto·scroll·hidden·clip) 안의 것은 뺀다. root가 없으면 dialog[open], 아니면 화면 틀.
 */
export const inPageInnerOverflow = (rootSelector) => {
  const root = (rootSelector && document.querySelector(rootSelector)) ?? document.querySelector('dialog[open], [role=dialog]') ?? document.querySelector('.ax-screen, .screen') ?? document.body
  const vis = (el) => window.__vis(el)
  const solid = (el) => {
    const cs = getComputedStyle(el)
    const bg = window.__ui ? window.__ui.parse(cs.backgroundColor) : { a: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 0 : 1 }
    const border = ['Left', 'Right'].some((s) => Number.parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none')
    return bg.a > 0.05 || border
  }
  const scrollsX = (el) => ['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(el).overflowX) // 스크롤 칸·자르는 칸(진행 막대의 움직이는 채움) 안은 상자 밖이 아니다. 글이 잘리는지는 inPageNotClipped가 따로 본다
  const bad = []
  let checked = 0
  const test = (rect, from, label) => {
    let skip = false
    for (let a = from; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (a !== root && scrollsX(a)) { skip = true; break }
      if (solid(a)) {
        checked++
        const r = a.getBoundingClientRect()
        if (rect.right > r.right + 0.5 || rect.left < r.left - 0.5) bad.push(`${label} ${Math.round(rect.left)}~${Math.round(rect.right)} / 상자 ${Math.round(r.left)}~${Math.round(r.right)}`)
        break
      }
      if (a === root) break
    }
    return skip
  }
  for (const el of root.querySelectorAll('*')) {
    if (!vis(el) || getComputedStyle(el).position === 'fixed') continue
    test(el.getBoundingClientRect(), el.parentElement, `<${el.tagName.toLowerCase()}${(el.getAttribute('class') ?? '').split(' ')[0] ? '.' + el.getAttribute('class').split(' ')[0] : ''}>`)
  }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
    const range = document.createRange()
    range.selectNodeContents(n)
    const r = range.getBoundingClientRect()
    if (r.width < 1) continue
    test(r, n.parentElement, `글자 "${n.nodeValue.trim().slice(0, 8)}"`)
  }
  return { ok: bad.length === 0, detail: bad.length ? `상자 밖 ${bad.length}개: ${bad.slice(0, 3).join(' / ')}` : `안쪽 폭 안 (상자 비교 ${checked}회)` }
}

/**
 * 화면 글자의 자리 (RR9): labels 가운데 화면에 보이는 것을 위에서 아래로 늘어놓은 이름 목록. 순서 판정은 Node가 한다.
 * 같은 글자가 여러 곳이면 가장 위의 것을 쓴다(제목 줄만 보려고 글자가 정확히 같은 요소를 찾는다).
 */
export const inPageTextOrder = (labels) => {
  const vis = (el) => window.__vis(el)
  const found = []
  for (const label of labels) {
    const hit = [...document.querySelectorAll('body *')].filter((el) => vis(el) && el.children.length === 0 && (el.textContent ?? '').trim() === label)
    if (hit.length) found.push({ label, top: Math.min(...hit.map((el) => el.getBoundingClientRect().top + window.scrollY)) })
  }
  found.sort((a, b) => a.top - b.top)
  return found.map((f) => f.label)
}

/**
 * 긴 글이 잘리지 않는가 (RR9): needle이 든 글자 요소의 줄 수, 그 요소와 조상이 글을 자르는지(overflow hidden/clip + 넘침, line-clamp),
 * 마지막 글자가 가까운 눈에 보이는 상자 안에 있는지.
 */
export const inPageNotClipped = (needle) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node = null
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes(needle) && n.parentElement && window.__vis(n.parentElement)) { node = n; break }
  if (!node) return { found: false, ok: false, lines: 0, detail: `"${needle.slice(0, 10)}…" 글자를 못 찾았다` }
  const el = node.parentElement
  const range = document.createRange()
  range.selectNodeContents(node)
  const rects = [...range.getClientRects()]
  const tops = [...new Set(rects.map((r) => Math.round(r.top)))]
  const lines = tops.length
  const bad = []
  for (let a = el; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a)
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') bad.push(`line-clamp ${cs.webkitLineClamp}`)
    if (['hidden', 'clip'].includes(cs.overflowY) && a.scrollHeight > a.clientHeight + 1) bad.push(`세로 잘림 ${a.scrollHeight}>${a.clientHeight}`)
    if (['hidden', 'clip'].includes(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) bad.push(`가로 잘림 ${a.scrollWidth}>${a.clientWidth}`)
    if (cs.textOverflow === 'ellipsis' && a.scrollWidth > a.clientWidth + 1) bad.push('말줄임')
  }
  const last = rects[rects.length - 1]
  let boxOk = true
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const bg = getComputedStyle(a).backgroundColor
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const r = a.getBoundingClientRect()
      boxOk = last.bottom <= r.bottom + 0.5 && last.right <= r.right + 0.5
      break
    }
  }
  return { found: true, ok: bad.length === 0 && boxOk, lines, detail: `${lines}줄 · ${bad.join(', ') || '자르는 조상 없음'} · 마지막 글자가 상자 안 ${boxOk}` }
}

/**
 * 알려진 실패 (PLAN v1.21 개정 1). SS0 before --check가 처음 드러낸 legacy 화면의 칸 실패 셋 — SS5가 분석의 하나를, SS6이 설정의 둘을 고쳐 지웠다. 지금은 빈 배열이다(SS8이 빈 목록과 함수를 지운다).
 * 그 화면을 옮기는 작업(until)이 고치고 **같은 커밋에서 항목을 지운다**. 늘리지 않는다 — 다른 실패는 멈추고 보고한다.
 * detail은 `- 실패 <장면> · <칸>: ` 뒤 글자 그대로.
 */
export const KNOWN_FAILURES = []

/**
 * 알려진 실패를 `알려진 실패` 상태로 바꾼다(숨기기만 하고 만들지 않는다). rows는 건드리지 않고 새 배열을 돌려준다.
 * (행 이름, 칸, 상세)가 항목과 글자까지 같은 `실패` 칸만 바뀐다. 장면 실패 행(상세가 예외 줄)이나 다른 상세는 그대로 `실패`.
 * 행은 있는데 그 칸이 `실패`가 아닌 항목은 stale(고쳐졌으니 목록에서 지운다). 행이 없는 항목(--only로 거른 장면)은 둘 다 아니다.
 */
export const applyKnownFailures = (rows, known) => {
  let count = 0
  const stale = []
  const out = rows.map((r) => ({ ...r, cells: { ...r.cells } }))
  for (const k of known) {
    const row = out.find((r) => r.scene === k.scene)
    if (!row) continue
    const cell = row.cells[k.column]
    if (cell && cell.status === '실패' && cell.detail === k.detail) {
      row.cells[k.column] = { ...cell, status: '알려진 실패' }
      count++
    } else if (!cell || (cell.status !== '실패' && cell.status !== '알려진 실패')) stale.push({ scene: k.scene, column: k.column, until: k.until })
  }
  return { rows: out, known: count, stale }
}
