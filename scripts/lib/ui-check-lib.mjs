/**
 * UI 검사 함수 모음 (PLAN v1.19 QQ0). import해도 아무것도 실행하지 않는다.
 * `inPage*`는 page.evaluate로 브라우저 안에서 돈다(바깥 변수를 못 본다. 보이는 요소 판정은 window.__vis).
 * 판정 모양은 glass-check.mjs와 같다: `{ ok, detail }` 또는 `{ skip, detail }`.
 */

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

/** 시트 장면(legacy 시트·막만 — Astryx 시트의 움직임은 Astryx가 정한다): 움직임 줄이기 뒤 시트 요소의 animation/transition 길이가 0.01s 이하인가 */
export const inPageMotionDurations = () => {
  const bad = []
  let n = 0
  const secs = (v) => v.split(',').map((x) => Number.parseFloat(x) * (x.trim().endsWith('ms') ? 0.001 : 1))
  for (const el of document.querySelectorAll('.sheet, .sheet-backdrop')) {
    if (!window.__vis(el)) continue
    n++
    const cs = getComputedStyle(el)
    const worst = Math.max(...secs(cs.animationDuration), ...secs(cs.transitionDuration))
    if (worst > 0.01) bad.push(`${el.className.toString().split(' ')[0]} ${worst}s`)
  }
  if (n === 0) return { skip: true, detail: '시트가 없다' }
  return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : `${n}개 0.01s 이하` }
}

/** 줄 안 버튼 (QQ6): 보이는 `.row > .btn`마다 폭이 줄 폭의 절반 미만, 높이 44px 이상, 글자 한 줄. 0개면 실패(아무것도 안 쟀다). */
export const inPageRowButtons = () => {
  const bad = []
  let n = 0
  for (const el of document.querySelectorAll('.row > .btn')) {
    if (!window.__vis(el)) continue
    n++
    const row = el.parentElement.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size
    const why = []
    if (b.width >= row.width / 2) why.push(`폭 ${Math.round(b.width)}px ≥ 줄 ${Math.round(row.width)}px의 절반`)
    if (b.height < 44) why.push(`높이 ${Math.round(b.height)}px < 44`)
    if (lines > 1) why.push(`글자 ${lines}줄`)
    if (why.length) bad.push(`${el.textContent.trim()} (${why.join(', ')})`)
  }
  if (n === 0) return { ok: false, detail: '보이는 .row > .btn이 0개 — 검사가 아무것도 안 쟀다' }
  return { ok: bad.length === 0, detail: bad.length ? bad.join(' · ') : `${n}개 통과` }
}

/** QQ6 정적 검사: global.css에서 .row > .btn이 .btn-sm과 같은 선택자 목록에 있고, 자기 규칙에 width: auto·flex-shrink: 0이 있다. */
export function rowButtonStaticChecks(allCss) {
  const text = Object.entries(allCss).filter(([p]) => p.endsWith('global.css')).map(([, t]) => t).join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].split(',').map((x) => x.trim()), body: m[2] }))
  const shared = rules.some((r) => r.sel.includes('.btn-sm') && r.sel.includes('.row > .btn'))
  const own = rules.filter((r) => r.sel.length === 1 && r.sel[0] === '.row > .btn')
  const ownOk = own.length === 1 && /width:\s*auto/.test(own[0].body) && /flex-shrink:\s*0/.test(own[0].body)
  return [
    { name: '줄 안 버튼 선택자', ok: shared, detail: shared ? '.row > .btn이 .btn-sm 규칙에 있다' : '.row > .btn이 .btn-sm과 같은 선택자 목록에 없다' },
    { name: '줄 안 버튼 폭', ok: ownOk, detail: ownOk ? 'width: auto · flex-shrink: 0' : '.row > .btn 규칙이 없거나 width: auto·flex-shrink: 0이 빠졌다' },
  ]
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
    holdMs = Math.ceil(fastMs) + 20
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
  const miss = ['.ax-screen', 'astryx-', '.stepper'].filter((k) => base === null || !base.includes(k))
  add('기본 규칙에 Astryx(.ax-screen·astryx-)·.stepper 제외', miss.length === 0, miss.length ? `없음: ${miss.join(', ')}` : '.ax-screen · astryx- · .stepper')
  // 2. 움직임 줄이기
  add('motion.css에 prefers-reduced-motion', motion.includes('prefers-reduced-motion'), motion.includes('prefers-reduced-motion') ? '있음' : '없음')
  // 3. 시트·막 키프레임이 opacity를 움직이지 않는다
  const names = new Set()
  const sheetUse = Object.values(allCss).flatMap((css) =>
    [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => /(^|[\s,])\.(sheet|sheet-backdrop)(?![\w-])/.test(m[1]))
      .flatMap((m) => [...m[2].matchAll(/animation(?:-name)?\s*:\s*([\w-]+)/g)].map((a) => a[1])),
  )
  sheetUse.forEach((n) => names.add(n))
  const badKf = []
  for (const css of Object.values(allCss)) {
    for (const m of strip(css).matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
      if (names.has(m[1]) && /(^|[^-\w])opacity\s*:/.test(m[2])) badKf.push(m[1])
    }
  }
  add('.sheet·.sheet-backdrop 키프레임이 opacity를 움직이지 않는다', names.size > 0 && badKf.length === 0, badKf.length ? `opacity: ${badKf.join(', ')}` : `${[...names].join(' · ') || '키프레임 없음'}`)
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
  const tabs = [...bar.querySelectorAll("nav button, nav a, [role='tab']")].filter((t) => window.__vis(t))
  if (tabs.length === 0) return { ok: false, detail: '띠 안에 탭이 0개 — 아무것도 안 쟀다' }
  const r = bar.getBoundingClientRect()
  const bad = []
  for (const t of tabs) {
    const tr = t.getBoundingClientRect()
    const x = tr.left + tr.width / 2
    for (const [label, y] of [['위', r.top + 2], ['아래', r.bottom - 2]]) {
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
  const kids = [...root.children].filter((el) => window.__vis(el) && !el.matches('.ax-bar, .tabbar, .resume-strip'))
  const bars = [...document.querySelectorAll(window.__glass.BARS)].filter((b) => window.__vis(b) && b.getBoundingClientRect().bottom >= innerHeight - 1)
  let out
  if (kids.length === 0) out = { ok: false, detail: '본문에 보이는 자식이 0개 — 아무것도 안 쟀다' }
  else if (bars.length === 0) out = { skip: true, detail: '화면 아래에 붙은 띠가 없다' }
  else {
    const top = Math.min(...bars.map((b) => b.getBoundingClientRect().top))
    const bottom = Math.max(...kids.map((el) => el.getBoundingClientRect().bottom))
    out = { ok: bottom <= top + 0.5, detail: `마지막 요소 아래 ${Math.round(bottom)} · 띠 위 ${Math.round(top)}${bottom > top + 0.5 ? ` (${Math.round(bottom - top)}px 가림)` : ''}` }
  }
  window.scrollTo(0, y0)
  return out
}

/** `섬 버튼` (RR7부터 판정): `.ax-scope` 안 Astryx 버튼의 min-height가 legacy 값(44px)이 아닌가. 섬이 있는 장면에서만, 버튼 0개면 실패 */
export const inPageIslandButtons = () => {
  const islands = [...document.querySelectorAll('.ax-scope')].filter((el) => window.__vis(el))
  if (islands.length === 0) return { skip: true, detail: '.ax-scope 섬이 없다' }
  const btns = islands.flatMap((i) => [...i.querySelectorAll("button[class*='astryx-']")]).filter((b) => window.__vis(b))
  if (btns.length === 0) return { ok: false, detail: '섬 안 Astryx 버튼이 0개 — 아무것도 안 쟀다' }
  const bad = btns.filter((b) => Number.parseFloat(getComputedStyle(b).minHeight) === 44)
  return { ok: bad.length === 0, detail: bad.length ? `${bad.length}/${btns.length}개가 min-height 44px(legacy 값이 샜다)` : `${btns.length}개 legacy 값 아님` }
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
