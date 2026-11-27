import { describe, expect, it } from "vitest"
import { once } from "./once"

/**
 * v1.19 QQ — 유리·움직임·여백. 이 파일의 describe는 작업별(QQ0, QQ1…)로 이어 붙는다.
 * 소스는 import.meta.glob(?raw)로 읽는다(`node:fs`는 DEV-RECORD 제약 13).
 */

const ALL_SRC = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>

describe("QQ3 — 시트 틀 하나", () => {
  it("useSheetDismiss라는 이름이 src에 0건이다 (훅을 두지 않는다 — dismiss는 렌더 프롭)", () => {
    const hits = Object.entries(ALL_SRC)
      .filter(([path, text]) => !/v119\.test\.ts$/.test(path) && /useSheetDismiss/.test(text))
      .map(([path]) => path)
    expect(hits).toEqual([])
  })

  it("once는 두 번 불러도 한 번, 다른 인자로 불러도 한 번만 통과시킨다", () => {
    const calls: number[] = []
    const f = once((n: number) => calls.push(n))
    f(1)
    f(1)
    f(2)
    expect(calls).toEqual([1])
  })
})

describe("QQ5 — 인라인 여백을 클래스로", () => {
  // 여러 줄로 적힌 style={{ … }}도 잡도록 [\s\S]*? (한 줄 [^}]*는 SubstituteSheet의 여러 줄 style을 놓쳤다)
  const STYLE = /style=\{\{[\s\S]*?\}\}/g
  const SPACE_KEY = /\b(margin(Top|Bottom|Left|Right|Inline|Block)?|padding(Top|Bottom|Left|Right|Inline|Block)?|gap|rowGap|columnGap)\s*:/

  it("스캔 정규식이 여러 줄 style과 gap을 잡는다 (SubstituteSheet 사례)", () => {
    const sample = "<span style={{\n  flex: 1,\n  gap: 2,\n}}>"
    const m = sample.match(STYLE)
    expect(m).not.toBeNull()
    expect(SPACE_KEY.test(m![0])).toBe(true)
    expect(SPACE_KEY.test("style={{ marginTop: 10 }}")).toBe(true)
    expect(SPACE_KEY.test("style={{ color: 'red', whiteSpace: 'normal' }}")).toBe(false)
  })
})
