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
  it("v120 RR0: ui-check.mjs·screenshots-glass.mjs에 .btn-start·.resume-strip·.rest-bar 글자가 없다", () => {
    for (const f of ["/scripts/ui-check.mjs", "/scripts/screenshots-glass.mjs"]) {
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

  it("v120 RR0: 시작 버튼·재개 줄·휴식 바를 글자·역할로 고른다 (ui-check와 screenshots-glass가 같은 선택자)", () => {
    for (const f of ["/scripts/ui-check.mjs", "/scripts/screenshots-glass.mjs"]) {
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

  it("v120 RR0: glass-check.mjs에 띠 선택자 글자(.session-header)가 BAR_SELECTOR 한 줄에만 있고, 그 줄에 .ax-bar가 있다", () => {
    const t = text(LIB, "/scripts/lib/glass-check.mjs")
    const hits = t.split("\n").filter((l) => l.includes(".session-header"))
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain("BAR_SELECTOR")
    expect(hits[0]).toContain(".ax-bar")
  })

  it("v120 RR0: 띠 선택자 사본 세 곳은 설치 때 깔린 window.__glass.BARS를 읽는다", () => {
    const t = text(LIB, "/scripts/lib/glass-check.mjs")
    expect(t).toContain("BARS: window.__BARS")
    expect(t.match(/querySelectorAll\(g\.BARS\)/g)).toHaveLength(2)
    expect(t).toContain("querySelectorAll(window.__BARS)")
    expect(t).toContain("window.__BARS = ${JSON.stringify(BAR_SELECTOR)}")
  })

  it("v120 RR0: ui-check.mjs에 EXPECTED_BARS가 있고, 모자라면 유리 칸을 실패로 낸다 (0개 통과 금지)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    expect(t).toContain("const EXPECTED_BARS")
    expect(t).toMatch(/layers < expected\) return \{ status: '실패'/)
  })

  it("v120 RR0: cssVar는 토큰을 글자로 읽지 않고 임시 요소의 color로 풀어 읽는다 (light-dark(…) 대비)", () => {
    const t = text(LIB, "/scripts/lib/glass-check.mjs")
    const fn = t.slice(t.indexOf("const cssVar ="), t.indexOf("const sheetOf"))
    expect(fn).toContain("probe.style.color = `var(${name})`")
    expect(fn).toContain("getComputedStyle(probe).color")
    expect(fn).not.toContain("getPropertyValue")
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
    expect(t).toMatch(/const JUDGED = \{ '탭 누름': false, '마지막 요소': false, '세트 숫자': false, '섬 버튼': false, '테마 토큰': false \}/)
    expect(t).toContain("status: '기록'")
  })

  it("v120 RR0: 새 칸은 유리 검사보다 먼저 잰다 (유리 검사의 CDP detach가 color-scheme을 풀어 테마 토큰을 라이트로 읽게 한다)", () => {
    const t = text(SCRIPTS, "/scripts/ui-check.mjs")
    // 다크(runChecks)와 라이트(runLightOnly) 둘 다: 새 칸 줄 바로 다음 줄이 유리 줄이다
    const pairs = t.match(/await newColumns\(page, scene, cells, (false|true)\)\n\s*cells\['유리'\] = await glassVerdict\(page, scene\)/g)
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
