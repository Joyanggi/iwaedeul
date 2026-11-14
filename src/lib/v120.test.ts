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
    expect(t).toMatch(/const JUDGED = \{ '탭 누름': false, '마지막 요소': false, '세트 숫자': false, '섬 버튼': false, '테마 토큰': true \}/) // RR1이 '테마 토큰'만 켰다(PLAN: 작업이 끝날 때 해당 값을 true로)
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
    expect(app).toMatch(/import \{ AppRoot \} from '\.\/ax'/)
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
