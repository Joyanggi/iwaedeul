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

  it("v120 RR0·RR6: ui-check-lib.mjs의 BAR_SELECTOR 줄이 '.ax-bar'뿐이다 (RR6이 .session-header·.rest-bar를 뺐다 — 옛 클래스 글자는 어디에도 없다)", () => {
    const t = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    const hits = t.split("\n").filter((l) => l.includes("BAR_SELECTOR ="))
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatch(/BAR_SELECTOR = '\.ax-bar'/)
    expect(t).not.toContain(".session-header")
    expect(t).not.toContain(".rest-bar")
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
    expect(t).toMatch(/const JUDGED = \{ '탭 누름': true, '지금 탭': true, '마지막 요소': true, '세트 숫자': true, '섬 버튼': true, '테마 토큰': true \}/) // RR7이 '세트 숫자'·'섬 버튼'을 켰다(작업이 끝날 때 true). RR1이 '테마 토큰'을, RR3이 '탭 누름'·'마지막 요소'와 새 칸 '지금 탭'을 켰다(PLAN: 작업이 끝날 때 해당 값을 true로)
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

  it("v120 RR5 재검증: ui-check가 375에서 Day 선택 시트의 글자 중간 꺾임을 흐름으로 잰다 (keep-all 규칙은 scripts/rr5-wrap.test.mjs)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("Day 선택 시트 375 글자 중간 꺾임 없음")
    expect(t).toContain("inPageMidWordBreaks")
  })

  it("v120 RR5: 새 흐름 셋은 guardedFlow 안에 있어 예외가 나면 건너뜀이 아니라 흐름 실패로 센다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/const guardedFlow = async \(names, fn\) => \{[\s\S]*?catch \(e\)[\s\S]*?ok: false/)
    for (const name of ["시트 닫기 두 번 누르기 진행 중 세션 처리", "시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리", "줄 시트 막으로 닫고 같은 줄 다시 열기"]) {
      expect(t, name).toMatch(new RegExp("guardedFlow\\(\\[[^\\]]*'" + name + "'"))
    }
  })
})

describe("v120 RR6 — 세션 화면 틀과 휴식 바", () => {
  const FILES = ["/src/screens/SessionScreen.tsx", "/src/components/RestTimerBar.tsx"]

  it("v120 RR6: 두 파일의 className=은 ax-bar-dismiss뿐이고 style= 0건, <button은 그 닫기 버튼 하나다", () => {
    const all = FILES.map((f) => code(f)).join("\n")
    const classNames = [...all.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])
    expect(classNames).toEqual(['"ax-bar-dismiss"'])
    expect(all).not.toMatch(/style=/)
    expect(all.match(/<button/g) ?? []).toHaveLength(1)
    expect(code("/src/components/RestTimerBar.tsx")).toMatch(/<button className="ax-bar-dismiss"/)
  })

  it("v120 RR6: 두 파일은 ../ax에서만 가져온다 (@astryxdesign 직접 import 0건)", () => {
    for (const f of FILES) {
      expect(code(f), f).toMatch(/from '\.\.\/ax'/)
      expect(code(f), f).not.toMatch(/@astryxdesign/)
    }
  })

  it("v120 RR6: 상단 바는 Bar position=top, 휴식 바는 Bar position=bottom role=timer aria-live=off다", () => {
    expect(code(FILES[0])).toMatch(/<Bar position="top">/)
    expect(code(FILES[1])).toMatch(/<Bar position="bottom" role="timer" aria-live="off">/)
  })

  it("v120 RR6: 상단 바의 아이콘 버튼 둘은 이름이 있고(세션 최소화·휴식 타이머 시작) 종료 버튼도 그대로다", () => {
    const s = code(FILES[0])
    expect(s).toMatch(/isIconOnly[\s\S]{0,80}label="세션 최소화"[\s\S]{0,40}onClick=\{onMinimize\}/)
    expect(s).toMatch(/isIconOnly[\s\S]{0,80}label="휴식 타이머 시작"[\s\S]{0,40}onClick=\{\(\) => setManualTimer\(true\)\}/)
    expect(s).toMatch(/label="종료" onClick=\{\(\) => setFinishing\(true\)\}/)
    expect(s).toMatch(/label="\+ 종목 추가" onClick=\{\(\) => setAddingExercise\(true\)\}/)
  })

  it("v120 RR6: 로직 그대로 — 세트 체크가 휴식을 시작하고, 세션 없음·Day 없음 문구가 그대로다", () => {
    const s = code(FILES[0])
    expect(s).toMatch(/unlockAudio\(\)\s*\n\s*timer\.start\(ex\.restSec/)
    expect(s).toContain("진행 중인 세션이 없습니다.")
    expect(s).toContain("이 세션의 Day 정의를 찾을 수 없습니다 ({session.dayId}).")
    expect(s).not.toMatch(/center-note/)
  })

  it("v120 RR6: 휴식 바 — 진행은 값으로 그리고(인라인 scaleX 0건) 끝나면 success, 버튼 셋의 조건·동작이 그대로다", () => {
    const s = code(FILES[1])
    expect(s).toMatch(/<ProgressBar[\s\S]*?label="휴식 진행"[\s\S]*?isLabelHidden[\s\S]*?value=\{timer\.totalSec - timer\.remainingSec\}[\s\S]*?variant=\{timer\.finished \? 'success' : 'accent'\}/)
    expect(s).not.toMatch(/scaleX/)
    expect(s).toMatch(/\{!timer\.finished && \(\s*<Button variant="secondary" label="−30초" onClick=\{\(\) => timer\.addSeconds\(-30\)\} \/>\s*\)\}/)
    expect(s).toMatch(/label="\+30초" onClick=\{\(\) => timer\.addSeconds\(30\)\}/)
    expect(s).toMatch(/\{!timer\.finished && <Button variant="primary" label="건너뛰기" onClick=\{timer\.dismiss\} \/>\}/)
    expect(s).toContain("휴식 완료 — 닫기")
    expect(s).toMatch(/<Heading level=\{2\}>/)
  })

  it("v120 RR6: ui-check — 세션 장면의 마지막 요소 칸과 휴식 바 흐름 넷이 guardedFlow 안에 있고, 띠 기대 개수가 그대로다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/LAST_SCENES = new Set\(\['session', 'session-375', 'session-rest'/)
    for (const name of ["휴식 바 +30초 건너뛰기", "움직임 줄이기에서 휴식 진행 막대", "최소화하면 재개 줄에 남은 휴식", "끝난 휴식 바 1탭 닫기"]) {
      expect(t, name).toContain("guardedFlow(['" + name + "']")
    }
    expect(t).toMatch(/'session-rest': 2/)
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    expect(lib).toContain("위 띠 아래")
  })
})

describe("v120 RR7 — 운동 카드와 스테퍼", () => {
  const CARD = "/src/components/ExerciseCard.tsx"
  const STEP = "/src/components/NumberStepper.tsx"
  const classNames = (s: string) => [...s.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])

  it("v120 RR7: ExerciseCard의 className=은 ax-scope·{setRowClass(set)}·ax- 이름뿐이고 style=·<button·<input 0건이다", () => {
    const s = code(CARD)
    for (const c of classNames(s)) {
      expect(c, c).toMatch(/^"ax-[\w-]+"$|^\{setRowClass\(set\)\}$/)
    }
    expect(classNames(s)).toContain('"ax-scope"')
    expect(classNames(s)).toContain("{setRowClass(set)}")
    expect(s).not.toMatch(/style=|<button|<input|<textarea/)
  })

  it("v120 RR7: NumberStepper의 className=은 ax-scope 하나뿐이고 <button·<input·onClick이 없다 (처리기는 뗄 때 한 번만 센다)", () => {
    const s = code(STEP)
    expect(classNames(s)).toEqual(['"ax-scope"'])
    expect(s).not.toMatch(/<button|<input|onClick/)
    expect(s).toMatch(/<TextField\b/)
  })

  it("v120 RR7: 입력은 TextField(자동완성 억제를 품은 부품)만 쓴다 — 카드·스테퍼에 <input·NO_AUTOFILL 직접 사용이 없다", () => {
    for (const f of [CARD, STEP]) {
      expect(code(f), f).not.toMatch(/<input|<textarea|NO_AUTOFILL/)
      expect(code(f), f).toMatch(/from '\.\.\/ax'/)
      expect(code(f), f).not.toMatch(/@astryxdesign/)
    }
  })

  it("v120 RR7: 스테퍼 — 로직 그대로: 두 단추가 같은 네 처리기(pointerdown의 preventDefault·up은 release·cancel·leave는 abort)를 쓰고 pressed 상태가 없다", () => {
    const s = code(STEP)
    expect(s.match(/onPointerDown=\{\(e\) => \{\s*e\.preventDefault\(\)/g) ?? []).toHaveLength(2)
    expect(s).toMatch(/onPointerUp=\{\(e\) => release\(-1, e\)\}/)
    expect(s).toMatch(/onPointerUp=\{\(e\) => release\(1, e\)\}/)
    expect(s.match(/onPointerCancel=\{abort\}/g) ?? []).toHaveLength(2)
    expect(s.match(/onPointerLeave=\{abort\}/g) ?? []).toHaveLength(2)
    expect(s).not.toMatch(/setPressed|pressed/)
    expect(s).toMatch(/label=\{`\$\{ariaLabel\} 감소`\}/)
    expect(s).toMatch(/label=\{`\$\{ariaLabel\} 증가`\}/)
  })

  it("v120 RR7: 스테퍼 — isProminent·status를 받아 TextField로 넘기고, 카드는 세트 행에서만 isProminent를 켜며 무게 0 경고를 status로 준다. 식단 편집은 안 고친다", () => {
    const s = code(STEP)
    expect(s).toMatch(/isProminent = false/)
    expect(s).toMatch(/isProminent=\{isProminent\}/)
    expect(s).toMatch(/status=\{status === 'warning' \? \{ type: 'warning' \} : undefined\}/)
    const card = code(CARD)
    expect(card.match(/\bisProminent\b/g) ?? []).toHaveLength(2)
    expect(code("/src/components/DietDayEditor.tsx")).not.toMatch(/isProminent|ax-scope/)
  })

  it("v120 RR7: 순서 — 칩 줄이 본문의 맨 위다: 칩 줄 < 메모·무게 기준 < 자극 요령 < 세팅 메모 줄 < 무게 단위 줄 < 세트 표 머리", () => {
    const s = code(CARD)
    const at = (needle: string) => {
      const i = s.indexOf(needle)
      expect(i, `${needle}를 못 찾았다`).toBeGreaterThan(-1)
      return i
    }
    const order = [
      at("label={`${routineExercise.group}그룹`}"),
      at("{routineExercise.note &&"),
      at("{cueTip &&"),
      at("머신 세팅 메모 추가"),
      at("무게 단위 · {describeScale(weightScale)}"),
      at('className="ax-set-head"'),
    ]
    expect(order).toEqual([...order].sort((a, b) => a - b))
    // 칩 줄이 본문 맨 위: `open &&` 바로 뒤 첫 요소다
    expect(s).toMatch(/\{open && \(\s*<VStack gap=\{3\}>\s*(?:\{\}\s*)?<HStack gap=\{1\} wrap="wrap">\s*\{showPrefillHints && modeIntensity/)
  })

  it("v120 RR7: 머리는 Collapsible의 trigger이고 본문은 open일 때만 그린다 (닫힌 카드의 스테퍼를 그리지 않는다)", () => {
    const s = code(CARD)
    expect(s).toMatch(/<Collapsible\s+isOpen=\{open\}\s+onOpenChange=\{\(\) => onToggleOpen\(\)\}\s+trigger=\{/)
    expect(s).toMatch(/\{open && \(\s*<VStack/)
    expect(s).toMatch(/<Card variant=\{entry\.skipped \? 'muted' : undefined\} className="ax-scope">/)
  })

  it("v120 RR7: 세트 행 — 완료는 ToggleButton(이름 `n세트 완료`)이고 템포·워밍업 커밋 순서가 그대로다. 스킵하면 개수 자리가 스킵 뱃지다", () => {
    const s = code(CARD)
    expect(s).toMatch(/<ToggleButton[\s\S]*?label=\{`\$\{i \+ 1\}세트 완료`\}[\s\S]*?isPressed=\{set\.done\}[\s\S]*?onPressedChange=\{\(\) => onCheck\(i, set\.done\)\}/)
    expect(s).toMatch(/label=\{`\$\{i \+ 1\}세트 템포 가이드`\}/)
    expect(s).toMatch(/entry\.skipped \? \(\s*<Badge variant="neutral" label="스킵" \/>/)
    expect(s).toMatch(/commitPendingEdits\(\)\s*\n\s*actions\.addSet\(entry\.recordKey, \{ warmup: true \}\)/)
  })

  it("v120 RR7: 시트 넷(템포·보상작용 관찰·무게 단위·보상작용)은 카드(.ax-scope) 밖에 그려진다 — 섬 안에서는 legacy 시트 규칙이 꺼진다", () => {
    const s = code(CARD)
    const cardEnd = s.indexOf("</Card>")
    expect(cardEnd).toBeGreaterThan(-1)
    for (const sheet of ["<TempoGuideSheet", "<CompensationWatchSheet", "<WeightScaleSheet", "<CompensationSheet"]) {
      expect(s.indexOf(sheet), sheet).toBeGreaterThan(cardEnd)
    }
  })

  it("v120 RR7: ui-check — 세트 숫자·섬 버튼을 판정하고, 세트 행 흐름(탭 수·끌기·입력 패턴·워밍업·누르는 영역)과 식단 스테퍼 흐름이 guardedFlow 안에 있다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toMatch(/'세트 숫자': true, '섬 버튼': true/)
    for (const name of [
      "RR7 무게 증가 1탭에 한 단계",
      "RR7 숫자 칸 입력 패턴 (무게 소수 둘째까지, 횟수 소수점 없음)",
      "RR7 타이핑 중 워밍업을 누르면 친 값이 원래 세트에 남는다",
      "RR7 1세트 완료 1탭 → 완료 표시 + 휴식 바",
      "RR7 식단 스테퍼: 1탭 0.5 단위·입력 패턴·글자 크기·삭제 버튼 44px·넘침 없음",
    ]) {
      expect(t, name).toContain("guardedFlow(['" + name + "'")
    }
    expect(t).toContain("RR7 세트 행 ${width} 폭: 누르는 영역·머리 열·숫자 안 잘림")
    expect(t).toMatch(/for \(const width of \[390, 375\]\)/)
    expect(t).toMatch(/CARD_SCENES = \['session', 'session-375', 'session-open-b', 'history-detail-edit'\]/)
    const lib = text(LIB, "/scripts/lib/ui-check-lib.mjs")
    expect(lib).toContain("export const inPageTouchReach")
    expect(lib).toContain("export const inPageSetTable")
    expect(lib).toContain("export const inPageNumberFit")
    // 누르는 영역은 중심에서 21px 네 방향이다
    expect(lib).toMatch(/const REACH = 21/)
    // `섬 버튼`은 섬 안만이 아니라 legacy 범위 안의 Astryx 버튼도 잰다 — 카드가 섬을 잃어도 스테퍼가 스스로 섬이라 섬 안만 재면 못 잡는다(결함 복원 ⑭)
    expect(lib).toContain("const LEGACY = '.screen, .onboarding, .sheet-backdrop, .center-note, .banner'")
    expect(lib).toMatch(/b\.closest\(LEGACY\)/)
  })
})

describe("v120 RR8 — 세션의 시트 8개", () => {
  const EIGHT = ["FinishSheet", "AddExerciseSheet", "ManualTimerSheet", "SubstituteSheet", "CompensationSheet", "CompensationWatchSheet", "WeightScaleSheet", "TempoGuideSheet"].map((n) => `/src/components/${n}.tsx`)
  const OPEN = [...EIGHT, "/src/components/DayPickerSheet.tsx", "/src/components/OpenSessionSheet.tsx"]
  /** 모든 className= 값(문자열 또는 {…}) */
  const classNames = (s: string) => [...s.matchAll(/className=("[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g)].map((m) => m[1])

  it("v120 RR8: 여덟 파일이 ../ax의 Sheet를 쓰고 SheetFrame·style=·<button·<input·<textarea·@astryxdesign이 0건이다", () => {
    for (const f of EIGHT) {
      const s = code(f)
      expect(s, f).toMatch(/from '\.\.\/ax'/)
      expect(s, f).toMatch(/<Sheet /)
      expect(s, f).not.toMatch(/SheetFrame|style=|<button|<input|<textarea|@astryxdesign/)
    }
  })

  it("v120 RR8: className=은 ax-tempo-(템포 무대)·ax-toggle(켜고 끄는 글자 버튼)·ax-text-warning(경고 글자색)뿐이다", () => {
    const all = EIGHT.flatMap((f) => classNames(code(f)))
    expect(all.length).toBeGreaterThan(0)
    for (const c of all) expect(c).toMatch(/^("ax-(tempo-|toggle|text-warning)|\{`ax-tempo-|\{[^}]*'ax-text-warning')/)
    // 템포 말고는 ax-tempo-를 안 쓴다
    for (const f of EIGHT.filter((x) => !/TempoGuideSheet/.test(x))) expect(code(f), f).not.toMatch(/ax-tempo-/)
  })

  it("v120 RR8: 열 시트 열의 닫기는 dismiss를 지난다 — onClick={onClose} 0건, 렌더 프롭으로 dismiss를 받고 닫기 버튼이 dismiss를 부른다(템포는 닫기 버튼 없이 종료가 onDone→onClose)", () => {
    for (const f of OPEN) {
      const s = code(f)
      expect(s, f).not.toMatch(/onClick=\{onClose\}|onClick=\{\(\) => onClose\(\)\}/)
      if (/TempoGuideSheet/.test(f)) continue
      expect(s, f).toMatch(/\{\(dismiss\) =>/)
      expect(s, f).toMatch(/onClick=\{dismiss\}/)
    }
  })

  it("v120 RR8: v119 QQ3의 legacy 시트 목록이 식단 시트 넷만 남는다", () => {
    const legacyLeft = Object.keys(SRC).filter((p) => /\/components\/\w*Sheet\.tsx$/.test(p) && !/SheetFrame\.tsx$/.test(p) && !/from '\.\.\/ax/.test(SRC[p]))
    expect(legacyLeft.sort()).toEqual(["/src/components/DietPlanSheet.tsx", "/src/components/DietSlotSheet.tsx", "/src/components/DietVariantSheet.tsx", "/src/components/FoodLogSheet.tsx"])
  })

  it("v120 RR8: FinishSheet의 버리기 문구 앞(같은 <Button 태그)에 variant=\"destructive\"가 있다 — 이 세션 버리기·정말 버리기", () => {
    const s = code("/src/components/FinishSheet.tsx")
    for (const label of ['label="이 세션 버리기"', 'label="정말 버리기"']) {
      const at = s.indexOf(label)
      expect(at, label).toBeGreaterThan(0)
      const tagStart = s.lastIndexOf("<Button", at)
      expect(s.slice(tagStart, at), label).toContain('variant="destructive"')
    }
    // 2단계 그대로: 확인 상태가 있고, 취소가 되돌린다
    expect(s).toContain("setConfirmDiscard(true)")
    expect(s).toContain("setConfirmDiscard(false)")
    expect(s).toMatch(/discard\(\)\.then\(onDiscarded\)/)
  })

  it("v120 RR8: 시트 purpose — 입력칸이 있는 넷(종료·대체·보상작용·무게 단위)은 form, 고르기·읽기뿐인 넷은 info다", () => {
    const form = ["FinishSheet", "SubstituteSheet", "CompensationSheet", "WeightScaleSheet"]
    const info = ["AddExerciseSheet", "ManualTimerSheet", "CompensationWatchSheet", "TempoGuideSheet"]
    for (const n of form) expect(code(`/src/components/${n}.tsx`), n).toMatch(/<Sheet label="[^"]+" purpose="form"/)
    for (const n of info) expect(code(`/src/components/${n}.tsx`), n).toMatch(/<Sheet label="[^"]+" purpose="info"/)
  })

  it("v120 RR8: 템포 가이드도 지금처럼 막을 눌러 닫힌다(info) — required가 아니다. 소리 취소는 언마운트 정리가 한다", () => {
    const s = code("/src/components/TempoGuideSheet.tsx")
    expect(s).not.toMatch(/purpose="required"/)
    expect(s).toMatch(/return \(\) => cancelTag\('tempo'\)/)
  })

  it("v120 RR8: 템포 무대 — 큰 카운트 Heading level 1, 진행은 ProgressBar, 링 크기는 style 속성이 아니라 CSS 변수(--ax-tempo-scale)로 건넨다", () => {
    const s = code("/src/components/TempoGuideSheet.tsx")
    expect(s).toMatch(/<Heading level=\{1\} type="display-1">/)
    expect(s).toMatch(/<ProgressBar[\s\S]*?label="반복 진행"/)
    expect(s).toContain("style.setProperty('--ax-tempo-scale'")
    expect(s).toContain("`종료 — 약 ${rep.reps}회 기록 · 휴식 시작`")
  })

  it("v120 RR8: 켜고 끄는 고르기(유산소 종류·초 프리셋·징후·무게 단위 프리셋)는 ToggleButton이고, 하나 고르기(무게 단위 방식)는 SegmentedControl이다", () => {
    for (const n of ["FinishSheet", "ManualTimerSheet", "CompensationSheet", "WeightScaleSheet"]) {
      const c = code(`/src/components/${n}.tsx`)
      const tags = c.match(/<ToggleButton/g)?.length ?? 0
      expect(tags, n).toBeGreaterThan(0)
      // 하나라도 ax-toggle이 빠지면 안 눌린 버튼이 맨 글자가 된다 → 태그 수와 클래스 수가 같아야 한다
      expect(c.match(/className="ax-toggle"/g)?.length ?? 0, `${n}: 모든 ToggleButton에 ax-toggle`).toBe(tags)
    }
    expect(code("/src/components/WeightScaleSheet.tsx")).toMatch(/<SegmentedControl label="방식"/)
  })

  it("v120 RR8: 여러 줄 입력은 src/ax의 TextAreaField(자동완성 억제·16px 하한)로 하고, 종료 메모·핀 목록이 그것을 쓴다", () => {
    const ax = code("/src/ax/index.tsx")
    expect(ax).toMatch(/export function TextAreaField\(props: TextAreaProps\) \{\s*return <TextArea \{\.\.\.AX_NO_AUTOFILL\} controlStyle=\{CONTROL_STYLE\} \{\.\.\.props\} \/>/)
    expect(code("/src/components/FinishSheet.tsx")).toContain("<TextAreaField")
    expect(code("/src/components/WeightScaleSheet.tsx")).toContain("<TextAreaField")
  })

  it("v120 RR8: 로직·문구가 그대로다 (저장·취소·계산 — 종료·추가·타이머·대체·보상작용·관찰·무게 단위)", () => {
    const f = code("/src/components/FinishSheet.tsx")
    for (const w of ['label="기록 마치기"', 'label="계속하기"', "await finish()", "onFinished()", "손대지 않은 종목", "그대로 종료하면 기록되지 않습니다", "partialEntries(", "compensationEntriesOf(", "resolveSessionAdjust("]) expect(f, w).toContain(w)
    const a = code("/src/components/AddExerciseSheet.tsx")
    for (const w of ["makeRecordKey(ex.exerciseId, recordDayIdOf(day))", "onAdd({ recordKey, setCount: ex.sets, repMin: ex.repMin })", "추가할 수 있는 종목이 없습니다"]) expect(a, w).toContain(w)
    const m = code("/src/components/ManualTimerSheet.tsx")
    for (const w of ["unlockAudio()", "onStart(selected, isDefault", "TIMER_PRESETS.includes(defaultSec as never)"]) expect(m, w).toContain(w)
    const s = code("/src/components/SubstituteSheet.tsx")
    for (const w of ["onSaveBodyWeight(Math.round(parsedBodyWeight * 10) / 10)", "onSelect(preview)", "이 종목에는 등록된 대체가 없습니다", "원 종목 기록이 없어 시작 무게를 추정할 수 없습니다", "체중을 입력하면 보조 무게를 계산합니다"]) expect(s, w).toContain(w)
    const c = code("/src/components/CompensationSheet.tsx")
    for (const w of ["serializeCompensation({ signs: selected, free })", "{hasCompensation(current) &&", "setSelected([])"]) expect(c, w).toContain(w)
    const w = code("/src/components/CompensationWatchSheet.tsx")
    for (const x of ["easierWeight(currentWeight, scale)", "onApply(lowered)", "더 조절할 단위가 없습니다"]) expect(w, x).toContain(x)
    const u = code("/src/components/WeightScaleSheet.tsx")
    for (const x of ["parseLadder(ladderText)", "0보다 큰 숫자를 입력하세요", "핀 값을 입력하세요", "onSave({})", "isDisabled={!preview}"]) expect(u, x).toContain(x)
  })

  it("v120 RR8: 경고·오류 글자는 ax-text-warning이고(Text의 색 이름에 경고가 없다), 2단계 삭제 확인은 Banner error다", () => {
    expect(code("/src/components/WeightScaleSheet.tsx")).toContain('className="ax-text-warning"')
    expect(code("/src/components/CompensationSheet.tsx")).toContain('className="ax-text-warning"')
    expect(code("/src/components/FinishSheet.tsx")).toMatch(/<Banner\s+status="error"/)
    expect(code("/src/components/FinishSheet.tsx")).toMatch(/<Banner\s+status="warning"/)
    for (const f of EIGHT) expect(code(f), f).not.toMatch(/color="(warning|error)"/)
  })

  it("v120 RR8: ui-check — 시트 장면(종료·유산소·끝·타이머·고른 타이머·추가·대체·보상작용·고른 보상작용·무게 단위·오류·템포)을 찍고 sheet 쌍을 판정한다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    for (const scene of ["sheet-finish", "sheet-finish-cardio", "sheet-finish-end", "sheet-timer", "sheet-timer-picked", "sheet-add", "sheet-substitute", "sheet-comp", "sheet-comp-picked", "sheet-scale", "sheet-scale-error", "sheet-tempo", "sheet-watch", "sheet-watch-end"]) {
      expect(t, scene).toContain(`'${scene}'`)
      expect(t, scene).toContain(`snap('${scene}')`)
    }
    expect(t).toContain("SESSION_SHEET_SCENES.includes(scene)")
    expect(text(LIB, "/scripts/lib/ui-space.mjs")).toContain("'sheet-tempo'")
  })

  it("v120 RR8: 새 흐름은 전부 guardedFlow 안에 있어 예외가 나면 건너뜀이 아니라 흐름 실패로 센다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    for (const name of [
      "Esc로 닫기",
      "RR8 종료 시트 유산소 고르기 → 눌린 상태 하나 + 입력칸 둘",
      "RR8 종료 시트 버리기 2단계: 눌러도 바로 지워지지 않고 취소로 돌아온다",
      "RR8 종료 시트 끝까지 스크롤하면 버리기 버튼이 화면 안에 있다",
      "RR8 수동 타이머: 초 고르기(눌린 것 하나) → 시작 → 휴식 바",
      "RR8 종목 추가: 줄 1탭 → 시트가 닫히고 카드가 하나 늘어난다",
      "RR8 무게 단위 핀 목록 잘못된 형식 → 오류 문구가 보이고 저장이 막힌다",
      "RR8 무게 단위 핀 목록 입력 → 저장 → + 가 다음 핀으로 간다",
      "RR8 템포 가이드 도는 중: 링이 단계 색을 갖고 크기가 변수로 간다",
      "RR8 템포 가이드 → 종료 → 세트 체크 + 휴식 시작",
      "RR8 종료 시트: 이 세션 버리기 → 정말 버리기 → 홈",
    ]) {
      expect(t, name).toMatch(new RegExp("guardedFlow\\(\\[(?:[^\\]]*, )?'" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "'"))
    }
    // 시드 세션에서 재는 셋은 seedFlows 이름으로 guardedFlow(Object.values(seedFlows)) 하나에 묶여 있다 — 어느 단계서 던져도 셋 다 실패로 센다
    for (const name of ["RR8 보상작용: 징후 둘 고르기 → 저장 → 카드의 보상작용 줄이 바뀐다", "RR8 대체: 후보 1탭 → 시트가 닫히고 카드에 대체 뱃지가 생긴다", "RR8 보상작용 반복 시트: 3/3 버튼 → 시트 → 끝까지 스크롤하면 그대로 두기 버튼이 화면 안에 있다"]) expect(t, name).toContain(`: '${name}'`)
    // 글자 중간 꺾임은 시트마다 390·375 두 폭에서 잰다
    expect(t).toContain("const wrapFlow = async (label) =>")
    expect(t).toMatch(/r390\.count === 0 && r375\.count === 0/)
    for (const label of ["종료 시트", "휴식 타이머 시트", "종목 추가 시트", "대체 시트", "보상작용 시트", "무게 단위 시트", "템포 가이드 시트", "보상작용 반복 시트"]) expect(t, label).toContain(`wrapFlow('${label}')`)
  })

  it("v120 RR8 반려: 대체·보상작용 흐름은 0개로 통과하지 않는다 — 시드로 후보 1탭·징후 둘을 실제로 재고, 카드는 저장한 문구로 판정한다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    // 후보 0개를 통과로 세던 옛 줄이 없다
    expect(t).not.toMatch(/ok: true, detail: '건너뜀/)
    expect(t).toContain("열린 대체 후보가 0개다")
    // 징후 둘 고르기: 목록 2개 이상·눌린 징후 2를 요구한다(Math.min(2, 0) = 0 = 0 통과가 없다)
    expect(t).toMatch(/nSigns >= 2 && pressed === 2/)
    expect(t).not.toContain("pressed === Math.min(2, nSigns)")
    // 카드 판정은 클래스 유무가 아니라 저장한 문구(징후 이름)
    expect(t).toMatch(/li \.ax-text-warning'\)\.filter\(\{ hasText: saved \}\)/)
    expect(t).toMatch(/beforeText === 0 && shown === 1/)
    // 시드는 흐름 이름 전부를 건 guardedFlow 안에서 만들고, 블록 끝에서 지운다
    expect(t).toContain("guardedFlow(Object.values(seedFlows)")
    expect(t).toContain("await unseedWatch()")
    // 템포 흐름 이름은 실제로 재는 것만 적는다(템포는 info라 막을 누르면 닫힌다)
    expect(t).not.toContain("막을 눌러 닫히지 않는다(purpose)")
  })

  it("v120 RR8: 종료 시트 닫기 세 흐름은 legacy 막(.sheet-backdrop·.is-closing)이 아니라 Astryx dialog로 잰다", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    const fn = t.slice(t.indexOf("async function closeFlows(page)"), t.indexOf("/** 라이트 장면"))
    expect(fn).toContain("getByRole('dialog', { name: '세션 종료' })")
    expect(fn).not.toMatch(/sheet-backdrop|is-closing/)
  })
})
