import { describe, expect, it } from "vitest"

/**
 * v1.20 RR — Astryx 테마 한 벌. 이 파일의 describe는 작업별(RR0, RR1…)로 이어 붙는다.
 * 소스는 import.meta.glob(?raw)로 읽는다(`node:fs`는 DEV-RECORD 제약 13).
 * RR0은 검사 스크립트를 고치는 작업이라 스캔이 `scripts/`를 읽는다 — 검사 도구가 화면 클래스 이름에 다시 묶이지 않게 잠근다.
 */
const SCRIPTS = import.meta.glob("/scripts/*.mjs", { query: "?raw", import: "default", eager: true }) as Record<string, string>
const LIB = import.meta.glob("/scripts/lib/*.mjs", { query: "?raw", import: "default", eager: true }) as Record<string, string>
const DOCS = import.meta.glob("/docs/ASTRYX-INVENTORY.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>

const text = (files: Record<string, string>, path: string): string => {
  const t = files[path]
  expect(t, `${path}를 못 읽었다`).toBeTruthy()
  return t
}

describe("v120 RR0 — 검사 도구가 화면 클래스에 안 묶인다", () => {
  it("v120 RR0: ui-check.mjs에 .btn-start·.resume-strip·.rest-bar 글자가 없다 (RRM: screenshots-glass.mjs는 지워졌다)", () => {
    for (const f of ["/scripts/ui-check.mjs"]) {
      const t = text(SCRIPTS, f)
      expect(t, f).not.toMatch(/\.btn-start/)
      expect(t, f).not.toMatch(/\.resume-strip/)
      expect(t, f).not.toMatch(/\.rest-bar/)
    }
  })

  it("v120 RR0: ui-check.mjs에 ex-head 글자가 없다 (RR7이 button.ex-head를 Collapsible로 바꿔도 장면이 빈 통과하지 않게 aria-expanded로 고른다)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).not.toContain("ex-head")
    expect(t).toContain("button[aria-expanded]")
  })

  it("v120 RR0: 시작 버튼·재개 줄·휴식 바를 글자·역할로 고른다 (RRM: screenshots-glass.mjs는 지워졌다)", () => {
    for (const f of ["/scripts/ui-check.mjs"]) {
      const t = text(SCRIPTS, f)
      expect(t, f).toContain("name: /시작$|이어서 하기/")
      expect(t, f).toContain("name: /진행 중/")
      expect(t, f).toContain("getByRole('timer')")
    }
  })

  it("v120 RR0: ui-check.mjs에 ASTRYX_SCENES가 없다 (눌림 반응을 장면이 아니라 요소 단위로 뺀다)", () => {
    expect(text(SCRIPTS, "/scripts/ui-check.mjs")).not.toContain("ASTRYX_SCENES")
  })

  it("v120 RR0: 눌림 대상에서 Astryx 요소를 요소 단위로 뺀다 (astryx-·.ax-screen·.ax-bar·.ax-scope)", () => {
    const t = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    const fn = t.slice(t.indexOf("export const inPagePressTargets"), t.indexOf("export const inPagePressStyle"))
    expect(fn).toContain("el.closest(\"[class*='astryx-'], .ax-screen, .ax-bar, .ax-scope\")")
  })

  it("v120 RR0: ui-check-lib.mjs에 띠 선택자 글자(.session-header)가 BAR_SELECTOR 한 줄에만 있고, 그 줄에 .ax-bar가 있다 (RRM: glass-check.mjs에서 옮김)", () => {
    const t = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    const hits = t.split("\n").filter((l) => l.includes(".session-header"))
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain("BAR_SELECTOR")
    expect(hits[0]).toContain(".ax-bar")
  })

  it("v120 RR0: 띠 선택자 사본은 설치 때 깔린 window.__ui.BARS를 읽는다 (RRM: window.__glass.BARS에서 이름을 바꿨다. cssVar 스캔은 쓰는 검사(알약 구별)가 지워져 같이 지웠다)", () => {
    const t = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    expect(t).toContain("BARS: window.__BARS")
    expect(t).toContain("querySelectorAll(u.BARS)")
    expect(t).toContain("querySelectorAll(window.__ui.BARS)")
    expect(t).toContain("window.__BARS = ${JSON.stringify(BAR_SELECTOR)}")
    expect(t).not.toContain("window.__glass")
  })

  it("v120 RR0: ui-check.mjs에 EXPECTED_BARS가 있고, 모자라면 띠 칸을 실패로 낸다 (0개 통과 금지 — RRM: 유리 칸이 띠 칸이 됐다)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("const EXPECTED_BARS")
    expect(t).toMatch(/bars\.count < expected\) return \{ status: '실패'/)
  })

  it("v120 RR0: ui-check가 전 장면을 다크·라이트 두 벌로 찍는다 (라이트는 -light 이름)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("const name = light ? `${scene}-light` : scene")
    expect(t).not.toMatch(/if \(!light\) \{\s*\n\s*await snap\('home'\)/)
    for (const scene of ["home-375", "session-375", "session-open-b", "history-detail-edit", "diet-log-open"]) {
      expect(t, scene).toContain(`'${scene}'`)
    }
  })

  it("v120 RR0: 새 검사 다섯과 배치 기록·--press-shot·--same-layout·--layout-base가 있다", () => {
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    for (const fn of ["inPageTabHit", "inPageSetNumber", "inPageLastVisible", "inPageIslandButtons", "inPageThemeTokens", "inPageRects"]) {
      expect(lib, fn).toContain(`export const ${fn} =`)
    }
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    for (const flag of ["--press-shot=", "--same-layout=", "--layout-base="]) expect(t, flag).toContain(flag)
    expect(t).toContain("Input.dispatchTouchEvent")
    expect(t).toContain("touchCancel")
  })

  it("v120 RR0: 세트 숫자 검사의 기준은 다른 요소의 글자가 아니라 테마 토큰 --text-heading-2-size이다", () => {
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    const fn = lib.slice(lib.indexOf("export const inPageSetNumber"), lib.indexOf("export const inPageLastVisible"))
    expect(fn).toContain("var(--text-heading-2-size)")
    expect(fn).toContain("inputs.length === 0")
    // 토큰이 없으면 var()가 무효라 물려받은 16px로 풀려 거짓 통과한다 — 토큰이 비면 실패로 낸다
    expect(fn).toContain("getPropertyValue('--text-heading-2-size').trim() === ''")
  })

  it("v120 RR0: 새 칸은 before(와 판정을 안 켠 칸)에서는 기록만 하고 실패로 세지 않는다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/const JUDGED = \{ '탭 누름': true, '지금 탭': true, '마지막 요소': true, '세트 숫자': false, '섬 버튼': false, '테마 토큰': true \}/) // RR1이 '테마 토큰'을, RR3이 '탭 누름'·'마지막 요소'와 새 칸 '지금 탭'을 켰다(PLAN: 작업이 끝날 때 해당 값을 true로)
    expect(t).toContain("status: '기록'")
  })

  it("v120 RR0: 새 칸은 띠 칸 옆에서 돈다 — 다크·라이트 둘 다 newColumns 줄 바로 다음이 띠 줄이다 (RRM: 유리 검사가 없어져 CDP detach 순서 걱정은 사라졌다)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    const pairs = t.match(/await newColumns\(page, scene, cells, (false|true)\)\n\s*cells\['띠'\] = await barsVerdict\(page, scene\)/g)
    expect(pairs).toHaveLength(2)
  })
})

describe("v120 RR0 — 첫 화면 시간 재기", () => {
  it("v120 RR0: first-screen.mjs가 setCPUThrottlingRate와 serviceWorker.ready를 쓴다", () => {
    const t = text(SCRIPTS, "/scripts/first-screen.mjs")
    expect(t).toContain("Emulation.setCPUThrottlingRate")
    expect(t).toContain("serviceWorker.ready")
    expect(t).toContain("process.exit(0)") // 판정하지 않는다
  })
})

describe("v120 RR0 — 안 쓰는 legacy 선택자 세기", () => {
  it("v120 RR0: ASTRYX-INVENTORY.md의 합계 줄에 '안 쓰는 legacy 선택자'가 있다", () => {
    const doc = text(DOCS, "/docs/ASTRYX-INVENTORY.md")
    expect(doc).toMatch(/합계: .*legacy 클래스 쓰임 \d+곳, 안 쓰는 legacy 선택자 \d+개\./)
  })

  it("v120 RR0: astryx-inventory.mjs의 --check가 그 수를 견주고(늘면 실패), --unused가 목록을 찍는다", () => {
    const t = text(SCRIPTS, "/scripts/astryx-inventory.mjs")
    expect(t).toContain("['안 쓰는 legacy 선택자', unusedWas, unused.length]")
    expect(t).toContain("now > was")
    expect(t).toContain("--unused")
  })

  it("v120 RR0: ax-scope는 legacy 클래스 집합에서 빠진다 (RR1이 global.css에 적는 경계 표시)", () => {
    const t = text(SCRIPTS, "/scripts/astryx-inventory.mjs")
    expect(t).toContain("const BOUNDARY = new Set(['ax-scope'])")
    expect(t).toContain(".filter((n) => !BOUNDARY.has(n))")
  })

  it("v120 RR0: 템플릿으로 조립되는 접두사 허용 목록의 항목마다 이유가 적혀 있다", () => {
    const t = text(SCRIPTS, "/scripts/astryx-inventory.mjs")
    const block = t.slice(t.indexOf("const TEMPLATE_PREFIXES = {"), t.indexOf("/** 소스에 안 써도 쓰이는 이름"))
    const entries = block.split("\n").filter((l) => /^\s+'[\w-]+-':/.test(l))
    expect(entries.length).toBeGreaterThan(0)
    for (const l of entries) expect(l).toMatch(/:\s*'.{6,}'/)
  })
})

// ─── RR1 — 테마를 앱 뿌리에 ─────────────────────────────────────
// `.css`는 vitest에서 `?raw`가 빈 문자열이라(제약 3) CSS 쪽 스캔은 `scripts/legacy-scope.test.mjs`가 fs로 읽는다.
const SRC = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>
const code = (path: string): string => {
  const t = SRC[path]
  expect(t, `${path}를 못 읽었다`).toBeTruthy()
  return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

describe("v120 RR1 — 테마를 앱 뿌리에", () => {
  it("v120 RR1: App.tsx가 ./ax에서 AppRoot를 정적으로 import하고, <AppRoot 밖에서 화면을 반환하는 갈래가 없다", () => {
    const app = code("/src/App.tsx")
    expect(app).toMatch(/import \{ AppRoot[^}]*\} from '\.\/ax'/)
    // 화면 반환은 AppBody 한 곳이고, 그 함수를 <AppRoot> 안에서만 쓴다
    const exported = app.slice(app.indexOf("export default function App()"))
    expect(exported).toMatch(/<AppRoot>\s*<AppBody \/>\s*<\/AppRoot>/)
    expect(app.match(/export default function/g)).toHaveLength(1)
    expect(app).not.toMatch(/export default function AppBody/)
  })

  it("v120 RR1: ax/index.tsx에서 <Theme은 AppRoot 안에 한 번, mode=system이고 AxRoot 본문에 Theme·SizeProvider가 없다", () => {
    const s = code("/src/ax/index.tsx")
    expect(s.match(/<Theme\b/g)).toHaveLength(1)
    const appRoot = s.slice(s.indexOf("export function AppRoot"), s.indexOf("export function AxRoot"))
    expect(appRoot).toContain("<Theme theme={appTheme}")
    expect(appRoot).toContain('mode="system"')
    const axRoot = s.slice(s.indexOf("export function AxRoot"), s.indexOf("export function TextField"))
    expect(axRoot).not.toMatch(/Theme|SizeProvider/)
  })

  it("v120 RR1→RRT: /built와 defineTheme을 import하는 파일은 theme.ts 하나다 (RRT가 defineTheme 0건을 1건으로 뒤집었다)", () => {
    const hits = Object.keys(SRC).filter((p) => !p.endsWith(".test.ts") && /\/built['"]|defineTheme/.test(SRC[p].replace(/\/\*[\s\S]*?\*\//g, "")))
    expect(hits).toEqual(["/src/ax/theme.ts"])
  })

  it("v120 RR1: main.tsx는 Astryx를 직접 읽지 않고 styles/index.css를 App보다 먼저 읽는다 (레이어 순서가 먼저 굳는다)", () => {
    const main = SRC["/src/main.tsx"]
    expect(main).not.toContain("@astryxdesign")
    expect(main.indexOf("./styles/index.css")).toBeGreaterThan(-1)
    expect(main.indexOf("./styles/index.css")).toBeLessThan(main.indexOf("./App"))
  })

  it("v120 RR1: index.html의 color-scheme 메타가 light dark다", () => {
    const html = import.meta.glob("/index.html", { query: "?raw", import: "default", eager: true }) as Record<string, string>
    expect(html["/index.html"]).toContain('<meta name="color-scheme" content="light dark" />')
  })
})

describe("v120 RRM 보완 — 접근성 이름 둘과 종료 코드", () => {
  const SRC = import.meta.glob(["/src/components/ExerciseCard.tsx", "/src/components/FoodLogSheet.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>

  it("v120 RRM 보완: ExerciseCard에 옛 이름 '자리 없음 — 대체운동 고르기'로 시작하는 aria-label이 없다", () => {
    expect(SRC["/src/components/ExerciseCard.tsx"]).not.toMatch(/aria-label="자리 없음 — 대체운동 고르기/)
  })

  it("v120 RRM 보완: FoodLogSheet의 .diet-item 버튼 여는 태그에 aria-label이 없다", () => {
    const src = SRC["/src/components/FoodLogSheet.tsx"]
    // 여는 태그 안의 onClick={() => …}에 '>'가 있어 정규식으로 끝을 못 찾는다 — className 위치부터 첫 </button> 앞까지 자른다
    const parts = src.split('className="diet-item"').slice(1).map((s) => s.slice(0, s.indexOf("</button>")))
    expect(parts.length).toBeGreaterThan(0)
    for (const p of parts) expect(p).not.toContain("aria-label")
  })

  it("v120 RRM 보완: ui-check.mjs가 접근성 판정에서 규칙을 빼는 곳은 color-contrast 하나뿐이다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t.match(/v\.id !==/g)?.length).toBe(1)
    expect(t).toContain("v.id !== 'color-contrast'")
    expect(t).not.toContain("disableRules")
    expect(t).not.toContain(".exclude(")
  })
})

describe("v120 RR11 — 라이트/다크가 폰 설정을 따른다", () => {
  const HTML = import.meta.glob("/index.html", { query: "?raw", import: "default", eager: true }) as Record<string, string>
  const ALL = Object.fromEntries(Object.entries(import.meta.glob("/src/**/*.{ts,tsx,css}", { query: "?raw", import: "default", eager: true }) as Record<string, string>).filter(([p]) => !/\.test\.tsx?$/.test(p)))

  it("v120 RR11: index.html에 theme-color 메타가 정확히 둘이고 media가 각각 light·dark다", () => {
    const metas = HTML["/index.html"].match(/<meta\s+name="theme-color"[^>]*>/g) ?? []
    expect(metas).toHaveLength(2)
    expect(metas.filter((m) => m.includes('media="(prefers-color-scheme: light)"'))).toHaveLength(1)
    expect(metas.filter((m) => m.includes('media="(prefers-color-scheme: dark)"'))).toHaveLength(1)
  })

  it("v120 RR11: 두 theme-color 값이 테마의 --color-background-body light-dark(A, B)의 A·B와 글자 그대로 같다 (테스트가 패키지를 읽어 견준다)", async () => {
    const { neutralTheme } = await import("@astryxdesign/theme-neutral/built")
    const token = (neutralTheme.tokens as Record<string, string>)["--color-background-body"]
    const m = /^light-dark\(\s*(#[0-9a-fA-F]+)\s*,\s*(#[0-9a-fA-F]+)\s*\)$/.exec(token)
    expect(m, `토큰이 light-dark(A, B) 꼴이 아니다: ${token}`).toBeTruthy()
    const html = HTML["/index.html"]
    const metas = html.match(/<meta\s+name="theme-color"[^>]*>/g) ?? []
    const colorOf = (scheme: string) => /content="([^"]+)"/.exec(metas.find((x) => x.includes(`(prefers-color-scheme: ${scheme})`)) ?? "")?.[1]
    expect(colorOf("light")).toBe(m![1])
    expect(colorOf("dark")).toBe(m![2])
  })

  it("v120 RR11: index.html·src(테스트 제외)에 content=\"dark\"·color-scheme: dark·mode=\"dark\"·mode=\"light\"·data-theme=가 0건이다", () => {
    const files = { "/index.html": HTML["/index.html"], ...ALL }
    for (const [path, src] of Object.entries(files)) {
      for (const bad of ['content="dark"', /(?<!prefers-)color-scheme:\s*dark/, 'mode="dark"', 'mode="light"', "data-theme="]) {
        expect(typeof bad === "string" ? src.includes(bad) : bad.test(src), `${path}에 ${bad}`).toBe(false)
      }
    }
  })

  it("v120 RR11: ui-check.mjs에 색 체계 전환 흐름(emulateMedia colorScheme), --webkit, --safe-area(setSafeAreaInsetsOverride)가 있다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("runSchemeFlow")
    expect(t).toContain("emulateMedia({ colorScheme: 'light' })")
    expect(t).toContain("--webkit")
    expect(t).toContain("Emulation.setSafeAreaInsetsOverride")
    expect(t).toContain("상태바 받침")
  })
})


// ─── RRT — 테마 확정: Neutral + 파랑 강조 ─────────────────────────
describe("v120 RRT — Neutral + 파랑 강조", () => {
  it("v120 RRT: theme.ts에 #으로 시작하는 색 리터럴이 없다 (값은 팔레트 단계로 고른다)", () => {
    expect(code("/src/ax/theme.ts")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it("v120 RRT: 이름과 CSS의 짝 — theme.ts에 defineTheme이 있고 index.tsx에 theme-…/theme.css import가 없다", () => {
    expect(code("/src/ax/theme.ts")).toMatch(/defineTheme\(\{\s*name: 'workout',\s*extends: neutralTheme/)
    expect(SRC["/src/ax/index.tsx"]).not.toMatch(/@astryxdesign\/theme-[\w-]+\/theme\.css/)
  })

  it("v120 RRT: 덮는 토큰은 강조 다섯뿐이고 팔레트 blue의 단계다", () => {
    const t = code("/src/ax/theme.ts")
    const keys = [...t.matchAll(/'(--[\w-]+)':/g)].map((m) => m[1])
    expect(keys).toEqual(["--color-accent", "--color-accent-muted", "--color-text-accent", "--color-icon-accent", "--color-on-accent"])
    expect(t).toMatch(/'--color-accent': \[blue\.light\[50\], blue\.dark\[65\]\]/)
  })

  it("v120 RRT: 주입된 테마의 강조 토큰이 파랑이고 나머지 토큰은 Neutral과 같다", async () => {
    const { appTheme } = await import("../ax/theme")
    const { neutralTheme } = await import("@astryxdesign/theme-neutral/built")
    const { generateThemeCSS } = await import("@astryxdesign/core/theme")
    const css = JSON.stringify(generateThemeCSS(appTheme))
    expect(css).toContain('data-astryx-theme=\\"workout\\"')
    expect(JSON.stringify(neutralTheme.tokens?.["--color-accent"])).not.toEqual(JSON.stringify(appTheme.tokens?.["--color-accent"]))
    expect(appTheme.tokens?.["--color-background-body"]).toEqual(neutralTheme.tokens?.["--color-background-body"])
  })
})

describe("v120 RR12 — 여백: 맞물림 기준과 검사", () => {
  it("v120 RR12: ui-space.mjs에 inPageInsetSymmetry·EXPECTED_PAIRS가 있고, 기대한 쌍이 0개이면 ok: false를 내는 갈래가 있다", () => {
    const t = text(LIB, "/scripts/lib/ui-space.mjs")
    expect(t).toMatch(/export const inPageInsetSymmetry/)
    expect(t).toMatch(/export const EXPECTED_PAIRS/)
    expect(t).toMatch(/const ok = bad\.length === 0 && lacking\.length === 0/)
    expect(t).toMatch(/lacking = expected\.filter\(\(k\) => !seen\.has\(k\)\)/)
  })

  it("v120 RR12: ui-check.mjs에 안쪽 대칭 칸이 있고 EXPECTED_PAIRS로 판정하며, 같은 역할은 spaceRoleVerdicts가 낸다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/'섬 버튼', '테마 토큰', '안쪽 대칭'\]/)
    expect(t).toMatch(/insetSymmetryVerdict\(.*EXPECTED_PAIRS\[scene\]/)
    expect(t).not.toMatch(/spaceSetVerdicts/)
  })

  it("v120 RR12: ax/index.tsx가 Groups·Group·Card·ClickableCard를 내보내고, 묶음 사이 5·카드 사이 3·카드 안쪽 4가 이 파일에만 있다", () => {
    const s = code("/src/ax/index.tsx")
    for (const n of ["Groups", "Group", "Card", "ClickableCard"]) expect(s).toMatch(new RegExp(`export function ${n}\\b`))
    expect(s).toMatch(/const GROUP_GAP = 5/)
    expect(s).toMatch(/const CARD_GAP = 3/)
    expect(s).toMatch(/const CARD_PADDING = 4/)
    expect(s).toMatch(/<VStack gap=\{GROUP_GAP\} className="ax-groups">/)
    expect(s).toMatch(/<VStack gap=\{CARD_GAP\} className="ax-group">/)
    // 화면은 클래스 이름을 직접 쓰거나 카드에 padding을 주지 않는다(숫자는 이 파일에만)
    const screens = Object.entries(SRC).filter(([p]) => !p.endsWith(".test.ts") && !p.startsWith("/src/ax/"))
    for (const [p, src] of screens) {
      expect(src, p).not.toMatch(/ax-groups?["' ]/)
      expect(src, p).not.toMatch(/<(Clickable)?Card\b[^>]*\bpadding=/)
    }
  })

  it("v120 RR12: 짝 — Card·ClickableCard는 padding 속성을 받지 않고(Omit) 기본값만 준다", () => {
    const s = code("/src/ax/index.tsx")
    expect(s).toMatch(/Omit<CardProps, 'padding'>/)
    expect(s).toMatch(/Omit<ClickableCardProps, 'padding'>/)
    expect(s).toMatch(/<AstryxCard padding=\{CARD_PADDING\} \{\.\.\.props\} \/>/)
  })
})


describe("v120 RR3 — 앱 틀과 아래 탭", () => {
  const FRAME = ["/src/App.tsx", "/src/components/TabBar.tsx", "/src/components/SessionResumeStrip.tsx", "/src/components/UpdatePrompt.tsx"]

  it("v120 RR3: App·TabBar·SessionResumeStrip·UpdatePrompt에 className=·style=·<button이 0건이고 ../ax(또는 ./ax)만 쓴다", () => {
    for (const f of FRAME) {
      const s = code(f)
      expect(s, f).not.toMatch(/className=|style=|<button/)
      expect(s, f).not.toContain("@astryxdesign")
    }
    expect(code("/src/App.tsx")).toMatch(/from '\.\/ax'/)
    for (const f of FRAME.slice(1)) expect(code(f), f).toMatch(/from '\.\.\/ax'/)
  })

  it("v120 RR3: 탭은 TabList layout=fill size=md aria-label=화면 + Tab 다섯이고 TABS 배열과 <Icon />을 그대로 둔다", () => {
    const s = code("/src/components/TabBar.tsx")
    expect(s).toMatch(/<TabList[\s\S]*layout="fill"[\s\S]*size="md"[\s\S]*aria-label="화면"/)
    expect(s).not.toMatch(/role=/)
    expect(s).toContain("<Tab key={id} value={id} label={label} icon={<Icon />} />")
    expect(s).toContain("onChange={(v) => onChange(v as TabId)}")
  })

  it("v120 RR3: 아래 띠 하나(<Bar position=bottom>)에 [재개 줄, 탭] 순서로 들어가고 .app 감싸개가 없다", () => {
    const s = code("/src/App.tsx")
    expect(s).toMatch(/<Bar position="bottom">[\s\S]*<SessionResumeStrip[\s\S]*<TabBar active=\{tab\} onChange=\{setTab\} \/>[\s\S]*<\/Bar>/)
    expect(s).not.toContain('className="app"')
  })

  it("v120 RR3: 재개 줄은 Item onClick이고 휴식 배지(neutral·success)와 이어서 ›를 끝에 둔다", () => {
    const s = code("/src/components/SessionResumeStrip.tsx")
    expect(s).toContain("<Item")
    expect(s).toContain("onClick={onResume}")
    expect(s).toContain('<Badge variant="neutral"')
    expect(s).toContain('<Badge variant="success" label="휴식 완료" />')
    expect(s).toContain("이어서 ›")
  })

  it("v120 RR3: 업데이트 알림은 Banner status=info collapsible=false에 업데이트·나중에 버튼이다", () => {
    const s = code("/src/components/UpdatePrompt.tsx")
    expect(s).toContain("<Banner")
    expect(s).toContain('status="info"')
    expect(s).toContain("collapsible={false}")
    expect(s).toContain('label="업데이트"')
    expect(s).toContain('variant="ghost" label="나중에"')
    expect(s).toContain("<StickyTop>")
  })

  it("v120 RR3: 불러오는 중·시작 실패는 Astryx 부품이고 문구가 그대로다", () => {
    const s = code("/src/App.tsx")
    expect(s).toContain("<Spinner />")
    expect(s).toContain('<Loading text="차트를 불러오는 중…" />')
    expect(s).toContain('<Loading text="불러오는 중…" />')
    expect(s).toContain("<Banner status=\"error\" title={bootError} collapsible={false} />")
    expect(s).toContain("사파리 프라이빗 브라우징에서는 IndexedDB를 쓸 수 없습니다. 일반 탭에서 열어 주세요.")
  })

  it("v120 RR3: Bar는 ax/index.tsx 안에 있고 자기 높이를 --ax-bar-top·--ax-bar-bottom으로 알린다 (새 .tsx 파일 없음)", () => {
    const s = code("/src/ax/index.tsx")
    expect(s).toMatch(/export function Bar\(/)
    expect(s).toContain("'--ax-bar-top'")
    expect(s).toContain("'--ax-bar-bottom'")
    expect(s).toContain("ResizeObserver")
    expect(s).toMatch(/import '\.\/parts\.css'/)
    for (const n of ["TabList", "Tab", "Center", "Spinner"]) expect(s).toMatch(new RegExp(`export \\{[^}]*\\b${n}\\b[^}]*\\} from '@astryxdesign`))
    expect(Object.keys(SRC).filter((p) => p.startsWith("/src/ax/") && p.endsWith(".tsx"))).toEqual(["/src/ax/index.tsx"])
  })

  it("v120 RR3: scripts/에 aria-current=page·inPagePillSeparation·inPageTabbarSpot 글자가 없고 BAR_SELECTOR 줄에 .tabbar·.resume-strip이 없다", () => {
    for (const files of [SCRIPTS, LIB]) {
      for (const [p, t] of Object.entries(files)) {
        if (p.endsWith(".test.mjs")) continue
        expect(t, p).not.toMatch(/aria-current=["']page["']|inPagePillSeparation|inPageTabbarSpot/)
      }
    }
    const line = text(LIB, "/scripts/lib/ui-check-lib.mjs").split("\n").find((l) => l.includes("export const BAR_SELECTOR"))
    expect(line).toBeTruthy()
    expect(line).not.toMatch(/\.tabbar|\.resume-strip/)
    expect(line).toContain(".ax-bar")
  })

  it("v120 RR3: ui-check.mjs에 지금 탭 칸(inPageCurrentTab)과 판정 켜기(탭 누름·지금 탭·마지막 요소)가 있고 재개 줄 장면의 띠 기대는 1이다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("inPageCurrentTab")
    expect(t).toMatch(/'탭 누름', '지금 탭', '마지막 요소'/)
    expect(t).toMatch(/'home-resume': 1,/)
    expect(text(LIB, "/scripts/lib/ui-check-lib.mjs")).toMatch(/export const inPageCurrentTab/)
  })
})


describe("v120 RR4 — 홈: 배치를 다시 짠다", () => {
  const FILES = ["/src/screens/HomeScreen.tsx", "/src/components/WeekDots.tsx", "/src/components/MuscleVolumeBars.tsx"]
  const home = () => code("/src/screens/HomeScreen.tsx")

  it("v120 RR4: 세 파일에 className=은 ax-week-*·ax-vol-* 뿐이고 style=·<button·<details·var(--·padding=이 0건이다", () => {
    for (const f of FILES) {
      const s = code(f)
      const names = [...s.matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/))
      for (const n of names) expect(n, `${f}의 ${n}`).toMatch(/^ax-(week|vol)-/)
      expect(s, f).not.toMatch(/style=|<button|<details|var\(--|padding=/)
      expect(s, f).not.toContain("@astryxdesign")
      expect(s, f).toMatch(/from '\.\.\/ax'/)
    }
  })

  it("v120 RR4 — 순서: 저장소 위험 < 다음 운동 < 시작 버튼 < 백업 미설정 < 알림 큐 < 식단 줄 < 이번 주 < 부위별 볼륨 < 디로드 카운터 < 제안 근거", () => {
    const s = home()
    // 화면 JSX(마지막 return)만 본다 — BANNER_VIEW나 ProgressBar 라벨의 같은 글자가 앞서지 않게
    const body = s.slice(s.lastIndexOf("<AxRoot>"))
    const order = ["storageAtRisk() && (", "다음 운동", "label={card.cta}", "!reminder.configured &&", "queue.slice(", "dietChip && (", "<WeekDots", "<MuscleVolumeBars", "디로드 카운터", "제안 근거"]
    let prev = -1
    for (const needle of order) {
      const i = body.indexOf(needle)
      expect(i, `${needle}의 자리`).toBeGreaterThan(prev)
      prev = i
    }
  })

  it("v120 RR4: 묶음 넷(머리·오늘·이번 주·주기)이 Group이고 저장소 위험 Banner가 Groups의 첫 자식이다", () => {
    const s = home()
    expect(s).toMatch(/<Groups>\s*\{storageAtRisk\(\) && \(\s*<Banner\s+status="error"/)
    expect((s.match(/<Group>/g) ?? []).length).toBe(4)
  })

  it("v120 RR4: 시작 버튼은 운동 카드 안의 마지막 자식이고 primary·lg·전체 폭이며 진행 중이면 onEnterSession이다", () => {
    const s = home()
    const card = /다음 운동[\s\S]*?<\/Card>/.exec(s)?.[0]
    expect(card, "카드를 못 찾았다").toBeDefined()
    expect(card).toMatch(/<Button\s+variant="primary"\s+size="lg"\s+width="100%"\s+label=\{card\.cta\}\s+onClick=\{\(\) => \(card\.resuming \? onEnterSession\(\) : start\(displayed\)\)\}\s+\/>\s*<\/VStack>\s*<\/Card>/)
  })

  it("v120 RR4: 알림과 식단 줄은 카드 뒤에 오고 큐는 첫 번째만 펼친다 (queue.slice 그대로)", () => {
    const s = home()
    expect(s).toContain("queue.slice(0, bannersOpen ? queue.length : 1)")
    expect(s).toMatch(/<ClickableCard onClick=\{onOpenDiet\} label=\{`\$\{dietLabel\} \$\{dietValue\}`\}>/)
  })

  it("v120 RR4: 배너 큐 여섯 종류는 Banner collapsible=false이고 status가 정해진 대로다 (복귀 info·디로드·백업·보상작용 warning·Phase success·증량 info)", () => {
    const s = home()
    const view = /const BANNER_VIEW[\s\S]*?\n {2}\}\n/.exec(s)?.[0] ?? ""
    const statusOf = (key: string): string | undefined => new RegExp(`key="${key}"\\s+status="(\\w+)"`).exec(view)?.[1]
    expect(statusOf("return")).toBe("info")
    expect(statusOf("deload")).toBe("warning")
    expect(statusOf("backup")).toBe("warning")
    expect(statusOf("phase")).toBe("success")
    expect(statusOf("compensation")).toBe("warning")
    expect(statusOf("progression")).toBe("info")
    expect((view.match(/<Banner\b/g) ?? []).length).toBe(6)
    expect((view.match(/collapsible=\{false\}/g) ?? []).length).toBe(6)
  })

  it("v120 RR4: 복귀 적용/안 함은 ToggleButton 둘이고 묶음에 role=group·aria-label이 그대로다", () => {
    const s = home()
    expect(s).toContain('<HStack gap={2} role="group" aria-label="복귀 프로토콜 적용 여부">')
    expect(s).toContain('<ToggleButton label="적용" isPressed={applyReturn} onPressedChange={() => setApplyReturn(true)} />')
    expect(s).toContain('<ToggleButton label="안 함" isPressed={!applyReturn} onPressedChange={() => setApplyReturn(false)} />')
  })

  it("v120 RR4: Phase 0 진행과 디로드 카운터는 카드 하나(Divider로 가른다)이고 Phase 0이 아니면 디로드 줄만 그려진다", () => {
    const s = home()
    expect(/currentPhase === 0 && \([\s\S]*?<Divider \/>[\s\S]*?디로드 카운터/.test(s), "주기 카드를 못 찾았다").toBe(true)
    expect((s.match(/<Divider \/>/g) ?? []).length).toBe(1)
    expect(s).toContain("variant={deload.due ? 'warning' : 'accent'}")
    expect(s).toContain("variant={phase0.achieved ? 'success' : 'accent'}")
  })

  it("v120 RR4: 볼륨은 부위 하나에 한 줄(이름·막대·n/m·빈도 뱃지)이고 목표를 넘기면 막대가 끝에서 멈춘다(value=min)", () => {
    const s = code("/src/components/MuscleVolumeBars.tsx")
    expect(s).toContain('<div className="ax-vol-row" key={bar.muscle}>')
    expect(s).toContain("value={Math.min(bar.performed, bar.target)}")
    expect(s).toContain("max={bar.target}")
    expect(s).toContain("variant={met ? 'success' : 'accent'}")
    expect(s).toContain("isLabelHidden")
    expect(s).toContain("title={`기대 ${bar.expectedExposures}회 / 실제 ${bar.exposures}회`}")
    expect(s).toContain("variant={bar.underFrequency ? 'warning' : 'neutral'}")
  })

  it("v120 RR4: 요일 점은 data-state(done·today·future·empty)로 상태를 말하고 🔥와 ×2가 그대로다", () => {
    const s = code("/src/components/WeekDots.tsx")
    expect(s).toContain("data-state={dot.isToday ? 'today' : dot.count > 0 ? 'done' : dot.isFuture ? 'future' : 'empty'}")
    expect(s).toContain("🔥")
    expect(s).toContain("×{dot.count}")
  })

  it("v120 RR4: 화면 문구가 그대로다 (배너 제목, 버튼, 머리글)", () => {
    const all = FILES.map((f) => code(f)).join("\n")
    for (const t of [
      "홈 화면에 추가하지 않으면 기록이 삭제될 수 있어요",
      "백업이 설정되지 않았어요",
      "복귀할까요?",
      "디로드 권장 — 세트 50%, 무게 유지",
      "마지막 백업이",
      "조건을 모두 충족했어요",
      "보상작용 반복 — 무게 하향 검토",
      "증량 제안",
      "나중에",
      "디로드로 시작",
      "변경",
      "다음 운동",
      "이번 주",
      "주간 부위별 볼륨",
      "Phase 0 진행",
      "디로드 카운터",
      "제안 근거 (부족분 점수)",
    ]) {
      expect(all, t).toContain(t)
    }
  })

  it("v120 RR4: ax/index.tsx가 Divider·ProgressBar·Collapsible·List·ListItem을 내보낸다", () => {
    const s = code("/src/ax/index.tsx")
    for (const n of ["Divider", "ProgressBar", "Collapsible", "List, ListItem"]) expect(s).toMatch(new RegExp(`export \\{ ${n} \\} from '@astryxdesign`))
  })

  it("v120 RR4: ui-check에 시작 자리 칸(inPageStartSpot·startSpotVerdict)과 홈 알림 장면 둘이 있고 홈 장면에서 카드·뱃지 쌍을 판정한다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("inPageStartSpot")
    expect(t).toContain("startSpotVerdict")
    expect(t).toContain("snap('home-banner')")
    expect(t).toContain("snap('home-banners-open')")
    expect(t).toMatch(/HOME_SYMMETRY_KINDS = new Set\(\[\.\.\.SYMMETRY_KINDS, 'card', 'badge'\]\)/)
    expect(t).toMatch(/ROLES_JUDGED = new Set\(\['묶음 사이', '카드 안쪽', '가까움 순서'\]\)/)
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    expect(lib).toMatch(/export const inPageStartSpot/)
    expect(lib).toMatch(/export function startSpotVerdict/)
  })

  it("v120 RR4: 시작 자리 판정 — 위 끝이 다르면 실패, 아래 띠에 가리면 실패, 장면이 하나뿐이면 실패", () => {
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    expect(lib).toMatch(/sameTop = tops\.every\(\(t\) => Math\.abs\(t - tops\[0\]\) <= 1\)/)
    expect(lib).toMatch(/spots\[n\]\.bottom > spots\[n\]\.barTop/)
    expect(lib).toMatch(/names\.length < 2/)
  })
})

describe("v120 RR5 — 홈의 시트 2개 + Sheet의 닫기", () => {
  const SHEETS = ["/src/components/DayPickerSheet.tsx", "/src/components/OpenSessionSheet.tsx"]
  const axSheet = () => {
    const s = code("/src/ax/index.tsx")
    return s.slice(s.indexOf("export function Sheet("), s.indexOf("export { TabList"))
  }

  it("v120 RR5: 두 파일이 ../ax의 Sheet를 쓰고 SheetFrame·className=·style=·<button이 0건이다", () => {
    for (const f of SHEETS) {
      const s = code(f)
      expect(s, f).toMatch(/from '\.\.\/ax'/)
      expect(s, f).toMatch(/<Sheet /)
      expect(s, f).not.toMatch(/SheetFrame|className=|style=|<button|@astryxdesign/)
    }
  })

  it("v120 RR5: 옮긴 시트의 닫기 버튼은 dismiss를 부른다 (onClick={onClose} 0건, 렌더 프롭으로 dismiss를 받는다)", () => {
    for (const f of SHEETS) {
      const s = code(f)
      expect(s, f).not.toMatch(/onClick=\{onClose\}|onClick=\{\(\) => onClose\(\)\}/)
      expect(s, f).toMatch(/\{\(dismiss\) =>/)
      expect(s, f).toMatch(/onClick=\{dismiss\}/)
    }
  })

  it("v120 RR5: Sheet의 children은 dismiss를 받는 함수일 수 있고 닫힘이 once를 거친다 (두 번 눌러도 onClose 한 번)", () => {
    const s = axSheet()
    expect(code("/src/ax/index.tsx")).toMatch(/children: ReactNode \| \(\(dismiss: \(\) => void\) => ReactNode\)/)
    expect(s).toMatch(/once\(\(\) => onCloseRef\.current\(\)\)/)
    // dismiss는 상태 하나만 바꾼다 → 두 번 불러도 타이머는 하나(effect는 closing이 바뀔 때만 돈다)
    expect(s).toMatch(/const dismiss = \(\) => setClosing\(true\)/)
    expect(s).toMatch(/\}, \[closing\]\)/)
  })

  it("v120 RR5: 막 누름·끌어내림·Esc(onOpenChange(false))도 dismiss를 지난다", () => {
    const s = axSheet()
    expect(s).toMatch(/onOpenChange=\{\(next\) => \{\s*if \(!next\) dismiss\(\)/)
    expect(s).not.toMatch(/onOpenChange=\{\(open\) => \{\s*if \(!open\) onClose\(\)/)
  })

  it("v120 RR5: 움직임 줄이기를 켜면 기다리지 않고 바로 끝낸다", () => {
    const s = axSheet()
    expect(s).toMatch(/prefers-reduced-motion: reduce/)
    expect(s.indexOf("prefers-reduced-motion")).toBeLessThan(s.indexOf("setTimeout(finish"))
  })

  it("v120 RR5: Sheet에 clearTimeout이 useEffect의 정리 함수 안에 있다 (저장으로 먼저 사라지면 늦은 onClose가 없다)", () => {
    // 타이머는 effect 안에서 걸고, 그 effect의 정리 함수가 지운다(언마운트·closing 바뀜 때)
    const s = axSheet()
    const effect = s.slice(s.indexOf("if (!closing) return"), s.indexOf("}, [closing])"))
    expect(effect).toMatch(/const timer = setTimeout\(finish, SHEET_CLOSE_MS\)/)
    expect(effect).toMatch(/return \(\) => clearTimeout\(timer\)/)
  })

  it("v120 RR5: BottomSheet에 className·style·xstyle을 넘기지 않는다 (키보드 대응이 꺼진다 — v118)", () => {
    const s = axSheet()
    const tag = s.slice(s.indexOf("<BottomSheet"), s.indexOf(">", s.indexOf("<BottomSheet")))
    expect(tag).not.toMatch(/className|style|xstyle/)
  })

  it("v120 RR5: OpenSessionSheet의 버리기 문구 앞 260자 안(같은 <Button 태그)에 variant=\"destructive\"가 있다", () => {
    const s = code("/src/components/OpenSessionSheet.tsx")
    for (const label of ['label="버리고 새로 시작"']) {
      let at = s.indexOf(label)
      expect(at).toBeGreaterThan(0)
      while (at >= 0) {
        const tagStart = s.lastIndexOf("<Button", at)
        expect(s.slice(Math.max(0, at - 260, tagStart), at)).toContain('variant="destructive"')
        at = s.indexOf(label, at + 1)
      }
    }
  })

  it("v120 RR5: 두 시트의 문구·로직이 그대로다 (Day 선택·진행 중 세션 처리, 이어하기·마감·버리기 2단계)", () => {
    const d = code("/src/components/DayPickerSheet.tsx")
    for (const w of ['label="Day 선택"', "오늘 할 운동", "하한 모드 · 30분", "routine.fallbackDays.length > 0", "onPick(day)", "lastDoneText"]) expect(d, w).toContain(w)
    const o = code("/src/components/OpenSessionSheet.tsx")
    for (const w of ['label="진행 중 세션 처리"', 'label="이어하기"', "마감하고 새로 시작", "setConfirmDiscard(true)", "setConfirmDiscard(false)", "onDiscardAndStart", "되돌릴 수 없습니다"]) expect(o, w).toContain(w)
  })

  it("v120 RR5: ui-check에 sheet-open-session 장면이 있고 두 시트 장면에서 sheet 쌍을 판정한다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("sheet-open-session")
    expect(t).toMatch(/HOME_SHEET_SCENES = \['sheet-home', 'sheet-open-session'\]/)
    // 진행 중 세션 처리 시트는 디로드 권장 배너의 `디로드로 시작`으로만 열린다 — 그 배너가 안 뜨는 데이터면 장면을 건너뛴다
    expect(t).toContain("name: '디로드로 시작', exact: true")
    expect(t).toContain("시트 닫기 두 번 누르기 진행 중 세션 처리")
    expect(t).toContain("시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리")
    expect(t).toContain("줄 시트 막으로 닫고 같은 줄 다시 열기")
    expect(t).toMatch(/HOME_SHEET_SYMMETRY_KINDS = new Set\(\[\.\.\.SYMMETRY_KINDS, 'sheet'\]\)/)
  })

  it("v120 RR5: 새 흐름 셋은 guardedFlow 안에 있어 예외가 나면 건너뜀이 아니라 흐름 실패로 센다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/const guardedFlow = async \(names, fn\) => \{[\s\S]*?catch \(e\)[\s\S]*?ok: false/)
    for (const name of ["시트 닫기 두 번 누르기 진행 중 세션 처리", "시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리", "줄 시트 막으로 닫고 같은 줄 다시 열기"]) {
      expect(t, name).toMatch(new RegExp("guardedFlow\\(\\[[^\\]]*'" + name + "'"))
    }
  })
})
