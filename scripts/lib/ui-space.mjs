/**
 * QQ4 여백 한 벌 — ui-check.mjs가 쓰는 정적 검사와 장면 사이 비교.
 * 장면 하나의 계산된 여백 격자(`inPageSpacing`)는 ui-check-lib.mjs에 있다.
 */

const STEPS = new Set([0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48])
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** 정적 검사: global.css 여백 값이 Astryx 단계에 든다 · 틀의 좌우가 --inset-을 쓴다(SS6 뒤 legacy 틀 `.screen`은 없다 — 온보딩 `.card`만 남는다) · space.css 토큰 순서 */
export function spaceStaticChecks(allCss) {
  const out = []
  const add = (name, ok, detail) => out.push({ name, ok, detail })
  const g = allCss['styles/global.css']
  const ax = allCss['ax/ax.css']
  const sp = allCss['styles/space.css']
  const idx = allCss['styles/index.css']
  add('space.css가 index.css에 layer(legacy)로 import', !!idx && /@import\s+['"]\.\/space\.css['"]\s+layer\(legacy\)/.test(idx), idx ? 'layer(legacy)' : 'index.css 없음')
  if (g === undefined) return [...out, { name: 'global.css 있음', ok: false, detail: '없음' }]
  // 1. 여백 선언의 px 숫자가 단계 안 (1px는 그 줄에 이유 주석이 있을 때만)
  const bad = []
  for (const [i, line] of g.split('\n').entries()) {
    const m = line.match(/^\s*(?:margin|padding|gap|row-gap|column-gap)[a-z-]*:\s*([^;]*);(.*)$/)
    if (!m) continue
    for (const n of m[1].matchAll(/(?<![\w.#-])(\d+(?:\.\d+)?)px/g)) {
      const v = Number(n[1])
      if (STEPS.has(v)) continue
      if (v === 1 && /\/\*.+\*\//.test(m[2])) continue
      bad.push(`${i + 1}행 ${v}px`)
    }
  }
  add('global.css 여백 값이 전부 Astryx 단계(0·2·4·6·8·12·16·20·24·28·32·36·40·44·48)', bad.length === 0, bad.length ? bad.slice(0, 6).join(' · ') + (bad.length > 6 ? ` 외 ${bad.length - 6}` : '') : '단계 밖 0건')
  // 2. 틀의 좌우 여백이 var(--inset-
  const body = (css, sel) => (css === undefined ? null : (strip(css).match(new RegExp(`(?:^|\\n)\\s*${sel.replace('.', '\\.')}\\s*\\{([^{}]*)\\}`))?.[1] ?? null))
  const miss = ['.card'].filter((s) => !/var\(--inset-/.test(body(g, s) ?? ''))
  const axBody = ax === undefined ? null : (strip(ax).match(/\.ax-screen\s*\{([^{}]*)\}/)?.[1] ?? null)
  if (!/var\(--inset-/.test(axBody ?? '')) miss.push('.ax-screen')
  add('.ax-screen·.card의 좌우 여백이 var(--inset-)', miss.length === 0, miss.length ? `안 씀: ${miss.join(', ')}` : '둘 다 씀')
  add('.ax-screen 좌우가 --inset-screen (두 체계가 같은 값)', /var\(--inset-screen\)/.test(axBody ?? ''), /var\(--inset-screen\)/.test(axBody ?? '') ? 'var(--inset-screen)' : '안 씀')
  // 3. space.css 토큰 값 순서
  if (sp === undefined) return [...out, { name: 'space.css 있음', ok: false, detail: '없음' }]
  const t = {}
  for (const m of strip(sp).matchAll(/--([\w-]+)\s*:\s*(\d+)px/g)) t[m[1]] = Number(m[2])
  const need = ['space-tight', 'space-inline', 'space-row', 'space-group', 'space-card', 'space-section', 'inset-screen', 'inset-card']
  const lack = need.filter((k) => t[k] === undefined)
  const orderOk = lack.length === 0 && t['space-tight'] < t['space-row'] && t['space-row'] < t['space-group'] && t['space-group'] <= t['space-card'] && t['space-card'] < t['space-section']
  const stepOk = lack.length === 0 && need.every((k) => STEPS.has(t[k]))
  add('space.css 토큰 여덟 개가 단계 안이고 tight < row < group ≤ card < section', orderOk && stepOk, lack.length ? `없음: ${lack.join(', ')}` : `${t['space-tight']}<${t['space-row']}<${t['space-group']}≤${t['space-card']}<${t['space-section']}`)
  return out
}

/** 장면 하나의 여백 재기 (page.evaluate용): 화면 첫 줄 왼쪽 x · 이웃한 .card 사이 세로 간격 · 시트 안 첫 글자의 시트 왼쪽에서 떨어진 거리 */
export const inPageLayout = () => {
  const vis = (el) => window.__vis(el)
  const half = (v) => Math.round(v * 2) / 2
  const res = { screenX: null, cardGaps: [], sectionGaps: [], cardInset: null, rowMax: null, sheetInset: null }
  const sheet = [...document.querySelectorAll('.astryx-bottom-sheet')].find(vis)
  if (sheet) {
    const sr = sheet.getBoundingClientRect()
    const w = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
      const r = document.createRange()
      r.selectNodeContents(n)
      const rect = r.getBoundingClientRect()
      if (rect.width < 1) continue
      res.sheetInset = half(rect.left - sr.left - sheet.clientLeft) // 테두리(Astryx 시트 1px)는 여백이 아니다
      break
    }
    return res
  }
  const frame = [...document.querySelectorAll('.screen, .ax-screen')].find(vis)
  if (!frame) return res
  const first = frame.querySelector('.card') ?? [...frame.children].find(vis)
  if (first) res.screenX = half(first.getBoundingClientRect().left)
  const cards = [...frame.querySelectorAll('.card')].filter(vis)
  for (let i = 1; i < cards.length; i++) {
    if (cards[i].previousElementSibling !== cards[i - 1]) continue
    res.cardGaps.push(half(cards[i].getBoundingClientRect().top - cards[i - 1].getBoundingClientRect().bottom))
  }
  // RR12: 이웃한 두 자식 사이의 세로 간격. 카드 사이는 .ax-group(와 legacy .card), 묶음 사이는 .ax-groups
  const gapsOf = (parent) => {
    const kids = [...parent.children].filter(vis)
    const g = []
    for (let i = 1; i < kids.length; i++) g.push(half(kids[i].getBoundingClientRect().top - kids[i - 1].getBoundingClientRect().bottom))
    return g
  }
  for (const g of [...frame.querySelectorAll('.ax-group')].filter(vis)) res.cardGaps.push(...gapsOf(g))
  for (const g of [...frame.querySelectorAll('.ax-groups')].filter(vis)) res.sectionGaps.push(...gapsOf(g))
  // `.ax-groups`의 자식이 `.ax-group`이 아닌데 카드를 품으면(Group을 VStack으로 바꾼 결함 ⑱) 그 안의 간격도 카드 사이로 잰다 — 안 재면 0개로 통과한다
  for (const g of [...frame.querySelectorAll('.ax-groups')].filter(vis)) {
    for (const k of [...g.children].filter(vis)) {
      if (k.matches('.ax-group, [class*="astryx-card"]') || !k.querySelector('[class*="astryx-card"]')) continue
      res.cardGaps.push(...gapsOf(k))
    }
  }
  // 카드 안쪽: 첫 카드의 왼쪽 가장자리에서 첫 글자까지(테두리는 안쪽 여백의 일부가 아니라 뺀다)
  // 달력 카드는 첫 글자(월 이름)가 이전·다음 버튼 사이 가운데에 놓여 안쪽 여백을 못 잰다 — 다음 카드를 잰다(SS4)
  const card = [...frame.querySelectorAll('.card, [class*="astryx-card"]')].find((c) => vis(c) && !c.querySelector('.ax-cal-grid'))
  if (card) {
    const cr = card.getBoundingClientRect()
    const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      const rect = range.getBoundingClientRect()
      if (rect.width < 1) continue
      res.cardInset = half(rect.left - cr.left - card.clientLeft)
      break
    }
    // 카드 안 줄 사이: 카드 안에서 자식이 하나뿐인 감싸개를 내려가 이웃한 줄 요소의 간격 가운데 가장 큰 값
    let box = card
    while ([...box.children].filter(vis).length === 1) box = [...box.children].find(vis)
    const rg = gapsOf(box)
    if (rg.length) res.rowMax = Math.max(...rg)
  }
  return res
}

/**
 * 장면 사이 비교(`같은 역할`, RR12 — 지금의 `여백 한 벌`을 넓힌 것): layouts = { 장면: inPageLayout() 결과 }. [{ name, ok, detail, record? }]
 * 앞의 셋(화면 좌우·카드 사이·시트 좌우)은 `여백 한 벌`과 같은 판정이다. 묶음 사이·카드 안쪽·가까움 순서는 그 역할을 쓰는 화면이 옮겨질 때(RR4)부터
 * 판정한다 — `judged`에 이름이 없으면 값만 찍고(`record: true`) 실패로 세지 않는다. 판정을 켜면 역할마다 잰 장면이 2개 미만일 때 실패다.
 */
export function spaceRoleVerdicts(layouts, judged = new Set()) {
  const same = (xs) => xs.every((x) => Math.abs(x - xs[0]) < 0.5)
  const SCREENS = ['home', 'home-375', 'home-banner', 'session', 'summary', 'history', 'analyze', 'diet', 'settings', 'editor']
  const SHEETS = ['sheet-finish', 'sheet-finish-cardio', 'sheet-timer', 'sheet-add', 'sheet-substitute', 'sheet-comp', 'sheet-scale', 'sheet-tempo', 'sheet-watch', 'sheet-home', 'sheet-open-session', 'sheet-food', 'line-sheet']
  const fmt = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ')
  const x = SCREENS.filter((s) => layouts[s]?.screenX != null).map((s) => [s, layouts[s].screenX])
  const gaps = SCREENS.flatMap((s) => (layouts[s]?.cardGaps ?? []).map((g) => [s, g]))
  const gapSet = [...new Set(gaps.map((p) => p[1]))]
  const sh = SHEETS.filter((s) => layouts[s]?.sheetInset != null).map((s) => [s, layouts[s].sheetInset])
  const sections = SCREENS.flatMap((s) => (layouts[s]?.sectionGaps ?? []).map((g) => [s, g]))
  const sectionSet = [...new Set(sections.map((p) => p[1]))]
  // 카드 안쪽은 Astryx `Card`를 쓰는 장면끼리만 견준다(홈 RR4 · 루틴 편집). 안 옮긴 화면은 legacy `.card`라 값이 다르고, 옮기는 작업(RR5~RR9)이 이 목록에 더한다
  const INSET_SCENES = new Set(['home', 'home-375', 'home-banner', 'summary', 'editor', 'diet', 'history', 'analyze', 'settings'])
  const inset = SCREENS.filter((s) => INSET_SCENES.has(s) && layouts[s]?.cardInset != null).map((s) => [s, layouts[s].cardInset])
  const insetScenes = new Set(inset.map((p) => p[0]))
  const sectionScenes = new Set(sections.map((p) => p[0]))
  const role = (name, key, scenes, ok, detail) => ({ name, ok: judged.has(key) ? scenes >= 2 && ok : true, record: !judged.has(key), detail: `${judged.has(key) ? '' : '기록만 — '}${detail}` })
  // 가까움 순서: 한 장면 안에서 줄 사이 ≤ 카드 사이 < 묶음 사이 (묶음 사이를 잰 장면만)
  const nearness = [...sectionScenes].map((s) => {
    const l = layouts[s]
    const v = nearnessVerdict({ rowMax: l.rowMax, cardGap: l.cardGaps.length ? Math.max(...l.cardGaps) : null, sectionGap: Math.min(...l.sectionGaps) })
    return [s, v]
  })
  return [
    { name: '화면 좌우', ok: x.length >= 2 && same(x.map((p) => p[1])), detail: fmt(x) || '잰 장면 없음' },
    { name: '카드 사이', ok: gaps.length > 0 && gapSet.length === 1, detail: gaps.length ? `간격 ${gapSet.join('·')}px (${[...new Set(gaps.map((p) => `${p[0]} ${p[1]}`))].join(' · ')})` : '카드가 둘 이상인 장면 없음' },
    { name: '시트 좌우', ok: sh.length >= 2 && same(sh.map((p) => p[1])), detail: fmt(sh) || '잰 장면 없음' },
    role('묶음 사이', '묶음 사이', sectionScenes.size, sections.length > 0 && sectionSet.length === 1, sections.length ? `간격 ${sectionSet.join('·')}px (${fmt(sections.filter((p, i, a) => a.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i))})` : '.ax-groups를 쓰는 장면 없음'),
    role('카드 안쪽', '카드 안쪽', insetScenes.size, inset.length > 0 && same(inset.map((p) => p[1])), fmt(inset) || '카드가 있는 장면 없음'),
    role('가까움 순서', '가까움 순서', nearness.length, nearness.length > 0 && nearness.every(([, v]) => v.skip || v.ok), nearness.map(([s, v]) => `${s} ${v.detail}`).join(' · ') || '.ax-groups를 쓰는 장면 없음'),
  ]
}

/**
 * RR12 안쪽 대칭: 바깥 요소 안에 든 요소가 바깥 요소 안에서 위·아래(와 좌·우)가 같은가. page.evaluate용.
 * 쌍 종류(`kind`)와 재는 방향은 PLAN "쌍" 표 그대로다. 안 요소의 상자는 글자·아이콘·이미지·입력칸의 상자를 합친 것이다(글자는 Range).
 * 안전 영역은 뺀다. 돌려주는 값은 쌍 목록이고 판정은 Node(`insetSymmetryVerdict`)가 한다.
 */
export const inPageInsetSymmetry = () => {
  const vis = (el) => window.__vis(el)
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)'
  document.body.appendChild(probe)
  const pcs = getComputedStyle(probe)
  const safeTop = Number.parseFloat(pcs.paddingTop) || 0
  const safeBottom = Number.parseFloat(pcs.paddingBottom) || 0
  probe.remove()
  /** 안의 글자·그림·입력칸 상자를 합친 것 */
  const content = (root) => {
    let box = null
    const add = (r) => {
      if (r.width < 0.5 || r.height < 0.5) return
      box = box
        ? { top: Math.min(box.top, r.top), bottom: Math.max(box.bottom, r.bottom), left: Math.min(box.left, r.left), right: Math.max(box.right, r.right) }
        : { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
    }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement)) continue
      const range = document.createRange()
      range.selectNodeContents(n)
      // 스크롤 칸(overflow auto·scroll) 안의 글자는 칸 상자로 자른다 — 안 보이는 부분까지 내용으로 세지 않는다(SS6 내보내기 미리보기)
      let r = range.getBoundingClientRect()
      for (let a = n.parentElement; a && a !== root; a = a.parentElement) {
        if (!/auto|scroll/.test(getComputedStyle(a).overflowY)) continue
        const c = a.getBoundingClientRect()
        r = { top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom), left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), width: Math.min(r.right, c.right) - Math.max(r.left, c.left), height: Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top) }
      }
      add(r)
    }
    // 입력칸의 상자는 눈에 보이는 테두리 상자다(Astryx 입력칸은 <input>이 테두리 상자 안쪽에 들어 있어 <input>만 재면 아래가 헐겁게 읽힌다 — SS2 메모 카드)
    const fieldBox = (el) => {
      for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
        const cs = getComputedStyle(a)
        if (Number.parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') return a
      }
      return el
    }
    // role=img도 그림이다(분석의 감각 점 — 글자 없는 점 줄이 카드의 마지막 내용일 때 안쪽 아래를 그 줄 기준으로 잰다, SS5)
    for (const el of root.querySelectorAll('svg, img, [role="img"], input, textarea')) if (vis(el) && !el.parentElement.closest('svg')) add((el.matches('input, textarea') ? fieldBox(el) : el).getBoundingClientRect())
    // 버튼·진행 막대는 글자만이 아니라 상자가 내용이다(카드가 버튼으로 끝나면 안쪽은 버튼 상자 기준이다 — RR4)
    for (const el of root.querySelectorAll('button, [role="progressbar"]')) if (vis(el)) add(el.getBoundingClientRect())
    return box
  }
  const out = []
  const borders = (el) => {
    const cs = getComputedStyle(el)
    return { top: Number.parseFloat(cs.borderTopWidth) || 0, bottom: Number.parseFloat(cs.borderBottomWidth) || 0, left: Number.parseFloat(cs.borderLeftWidth) || 0, right: Number.parseFloat(cs.borderRightWidth) || 0 }
  }
  const push = (kind, el, inner, axes, safe = false) => {
    if (!inner) return
    const o = el.getBoundingClientRect()
    const b = borders(el)
    let top = inner.top - o.top - b.top
    let bottom = o.bottom - inner.bottom - b.bottom
    if (safe) {
      if (o.top <= 1) top -= safeTop
      if (o.bottom >= innerHeight - 1) bottom -= safeBottom
    }
    const label = `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0] || '-'}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''}${kind === 'card' || kind === 'badge' ? ` "${el.textContent.trim().slice(0, 10)}"` : ''}`
    out.push({ kind, label, axes, top, bottom, left: inner.left - o.left - b.left, right: o.right - inner.right - b.right })
  }
  // 띠(.ax-bar): 보이는 자식들의 상자를 합친 것이 안이다. 위·아래
  for (const bar of [...document.querySelectorAll('.ax-bar')].filter(vis)) {
    const rects = [...bar.children].filter(vis).map((k) => k.getBoundingClientRect())
    if (!rects.length) continue
    push('bar', bar, { top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)), left: 0, right: 0 }, 'tb', true)
  }
  // 탭 하나(role=tab, 또는 아래 띠 `nav[aria-label="화면"]`의 버튼 — role이 없으면 Astryx는 aria-current="true"를 단다): 선택 표시와 아이콘 + 글자
  for (const tab of [...document.querySelectorAll('[role="tab"], nav[aria-label="화면"] button')].filter(vis)) {
    const ind = [...tab.querySelectorAll('[class*="indicator" i], [class*="underline" i]')].find(vis)
    const selected = tab.getAttribute('aria-selected') === 'true' || tab.getAttribute('aria-current') === 'true'
    if (ind && selected) push('tab-indicator', tab, ind.getBoundingClientRect(), 'lr')
    push('tab-content', tab, content(tab), 'both')
  }
  // 버튼: 글자·아이콘. 아이콘만 있는 버튼은 좌·우도
  // (`Collapsible`의 펼침 줄은 Astryx가 줄 높이를 정하는 한 줄짜리 부품이라 글자가 상자를 1px 넘는다. 그 줄이 든 카드의 안쪽이 대신 잰다 — RR4)
  for (const btn of [...document.querySelectorAll('button[class*="astryx-"]:not(.astryx-collapsible-trigger)')].filter(vis)) {
    const w = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT)
    let hasText = false
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim()) hasText = true
    push('button', btn, content(btn), hasText ? 'tb' : 'both')
  }
  // 카드: 첫 내용과 마지막 내용(위·아래)
  for (const card of [...document.querySelectorAll('[class*="astryx-card"]')].filter(vis)) push('card', card, content(card), 'tb')
  // 뱃지: 글자
  for (const badge of [...document.querySelectorAll('[class*="astryx-badge"]')].filter(vis)) push('badge', badge, content(badge), 'both')
  // 세트 행
  for (const row of [...document.querySelectorAll('.set-row')].filter(vis)) push('set-row', row, content(row), 'tb')
  // 시트의 내용 영역: 좌·우
  const sheet = window.__ui.sheetOf()
  if (sheet) push('sheet', sheet, content(sheet), 'lr')
  return out
}

/** 장면마다 기대하는 쌍 종류. 하나라도 0개면 `안쪽 대칭`이 실패다 — 선택자를 놓쳐 아무것도 안 재고 지나가지 않게. 쌍 종류를 더하는 작업(RR3~RR7)이 이 표를 채운다 */
export const EXPECTED_PAIRS = {
  // RR3: 아래 띠와 탭(Astryx `TabList`). 띠 ↔ 탭 줄, 탭 ↔ 선택 표시, 탭 ↔ 아이콘 + 글자
  // RR4: 홈은 카드·뱃지·버튼 쌍도 기대한다(운동 카드의 시작 버튼, 이번 주 카드, 루틴 이름 뱃지)
  home: ['bar', 'tab-indicator', 'tab-content', 'button', 'card', 'badge'],
  'home-end': ['bar', 'card', 'badge'],
  'home-375': ['bar', 'tab-indicator', 'tab-content', 'button', 'card', 'badge'],
  'home-banner': ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'home-resume': ['bar', 'tab-indicator', 'tab-content'],
  'home-safe': ['bar', 'tab-indicator', 'tab-content'],
  // SS6: 설정 탭 전체가 Astryx다 — 아래 띠·탭, 카드, 버튼(편집·미리 듣기·내보내기). 뱃지는 Day를 펼친 장면에만 있어 기대에 넣지 않는다
  settings: ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'settings-375': ['button', 'card'],
  'settings-open': ['button', 'card'],
  'settings-end': ['button', 'card'],
  'settings-routines': ['button', 'card'],
  'settings-routines-375': ['button', 'card'],
  'settings-routines-confirm-375': ['button', 'card'],
  'settings-gist': ['button', 'card'],
  'settings-export-preview': ['button', 'card'],
  'settings-reset-confirm': ['button', 'card'],
  editor: ['button'],
  // SS2: 식단 탭 — 아래 띠·탭, 끼니 카드, 버튼(플랜·삭제·추가). 편집기가 든 기록 장면(legacy 화면 안의 섬)은 카드·버튼만
  diet: ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'diet-end': ['bar', 'card'],
  'diet-375': ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'diet-log-open': ['bar', 'button', 'card'],
  'diet-streak': ['bar', 'button', 'card'],
  // SS4: 기록 탭 전체가 Astryx다 — 아래 띠·탭, 달력·세션·종목 카드, 버튼. 상세는 카드와 버튼(기록으로)
  history: ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'history-375': ['bar', 'tab-indicator', 'tab-content', 'button', 'card'],
  'history-day': ['bar', 'button', 'card'],
  'history-exercise': ['bar', 'card'],
  'history-exercise-detail': ['bar', 'button', 'card', 'badge'],
  'history-detail': ['bar', 'button', 'card'],
  'history-detail-end': ['bar', 'button', 'card'],
  'history-detail-change': ['bar', 'button', 'card'],
  // SS5: 분석 탭 전체가 Astryx다 — 아래 띠·탭, 카드·뱃지(감각 점수)·버튼(종목 칩). 빈 화면은 띠뿐
  analyze: ['bar', 'tab-indicator', 'tab-content', 'button', 'card', 'badge'],
  'analyze-end': ['bar', 'card'],
  'analyze-375': ['bar', 'tab-indicator', 'tab-content', 'button', 'card', 'badge'],
  'analyze-empty': ['bar'],
  // RR9: 요약 — 홈으로 버튼과 카드. 뱃지는 PR·수행 순서 뱃지가 있는 장면에서
  summary: ['button', 'card'],
  'summary-zero': ['button', 'card'],
  'summary-pr': ['button', 'card', 'badge'],
  'summary-assist': ['button', 'card'],
  'summary-memo': ['button', 'card'],
  'summary-revert': ['button', 'card'],
  'summary-cardio': ['button', 'card'],
  'summary-deload': ['button', 'card'],
  'line-sheet': ['button'],
  // RR5: 홈이 여는 시트 둘 — 시트 안 내용의 좌·우와 버튼 안 글자
  'sheet-home': ['sheet', 'button'],
  'sheet-open-session': ['sheet', 'button'],
  // RR8: 세션이 여는 시트 여덟(종료·타이머·추가·대체·보상작용·무게 단위·템포)
  ...Object.fromEntries(['sheet-finish', 'sheet-finish-cardio', 'sheet-finish-end', 'sheet-timer', 'sheet-timer-picked', 'sheet-add', 'sheet-substitute', 'sheet-comp', 'sheet-comp-picked', 'sheet-scale', 'sheet-scale-error', 'sheet-tempo', 'sheet-watch', 'sheet-watch-end'].map((n) => [n, ['sheet', 'button']])),
}

/** 안쪽 대칭 판정 (Node). pairs = inPageInsetSymmetry() 결과, expected = 기대하는 쌍 종류. 위·아래·좌·우 차이가 tol(1px) 이하여야 하고, 기대한 쌍이 하나라도 0개면 실패 */
export function insetSymmetryVerdict(pairs, expected = [], tol = 1) {
  const bad = []
  const seen = new Map()
  for (const p of pairs) seen.set(p.kind, (seen.get(p.kind) ?? 0) + 1)
  const lacking = expected.filter((k) => !seen.has(k))
  for (const p of pairs) {
    const dv = Math.abs(p.top - p.bottom)
    const dh = Math.abs(p.left - p.right)
    const vBad = p.axes !== 'lr' && dv > tol
    const hBad = p.axes !== 'tb' && dh > tol
    if (!vBad && !hBad) continue
    const parts = []
    if (vBad) parts.push(`위 ${+p.top.toFixed(1)}·아래 ${+p.bottom.toFixed(1)}(차이 ${+dv.toFixed(1)})`)
    if (hBad) parts.push(`왼 ${+p.left.toFixed(1)}·오른 ${+p.right.toFixed(1)}(차이 ${+dh.toFixed(1)})`)
    bad.push(`${p.kind} ${p.label} ${parts.join(' ')}`)
  }
  const kinds = [...seen].map(([k, n]) => `${k} ${n}`).join(' · ')
  const lack = lacking.length ? `쌍 없음: ${lacking.join(', ')} (기대)` : ''
  const ok = bad.length === 0 && lacking.length === 0
  const shown = bad.slice(0, 3).join(' / ') + (bad.length > 3 ? ` 외 ${bad.length - 3}` : '')
  const detail = [lack, shown, ok ? `쌍 ${pairs.length}개 대칭 (${kinds || '없음'})` : ''].filter(Boolean).join(' / ')
  return { ok, detail }
}

/** `가까움 순서`: 줄 사이 ≤ 카드 사이 < 묶음 사이. 카드 사이·묶음 사이를 못 쟀으면 skip */
export function nearnessVerdict({ rowMax, cardGap, sectionGap }) {
  if (cardGap == null || sectionGap == null) return { skip: true, detail: `카드 사이 ${cardGap ?? '-'} · 묶음 사이 ${sectionGap ?? '-'} — 재지 못했다` }
  const ok = (rowMax == null || rowMax <= cardGap) && cardGap < sectionGap
  return { ok, detail: `줄 사이 ${rowMax ?? '-'} ≤ 카드 사이 ${cardGap} < 묶음 사이 ${sectionGap}` }
}
