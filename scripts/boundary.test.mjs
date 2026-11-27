// scripts/boundary.mjs — 코어(src/core)가 허용 목록 밖을 import하거나 금지 전역을 쓰면 잡는지 잠근다. (v2.1 VV3)
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { checkCore, render } from './boundary.mjs'

const core = (text, path = 'src/core/derive.ts') => checkCore([{ path, text }])
const imp = (spec, path) => core(`import x from '${spec}'\n`, path)

describe('boundary: import 허용 목록', () => {
  it.each([
    ['react', 1],
    ['../db/schema', 1],
    ['../platform/secureToken', 1],
    ['expo-sqlite', 1],
    ['dexie', 1],
    ['@astryxdesign/core', 1],
    ['../data/x.ts', 1],
    ['./derive', 0],
    ['../data/exercises.json', 0],
  ])("'%s' → 위반 %i건", (spec, n) => {
    expect(imp(spec)).toHaveLength(n)
  })

  it("테스트의 'vitest'·'fast-check'는 통과, 테스트 아닌 파일의 'vitest'는 위반", () => {
    expect(imp('vitest', 'src/core/a.test.ts')).toEqual([])
    expect(imp('fast-check', 'src/core/a.test.ts')).toEqual([])
    expect(imp('vitest', 'src/core/a.ts')).toHaveLength(1)
    expect(imp('fast-check', 'src/core/a.ts')).toHaveLength(1)
  })

  it('테스트도 react 같은 것은 못 쓴다', () => {
    expect(imp('react', 'src/core/a.test.ts')).toHaveLength(1)
  })

  it("export … from · await import('…') · require('…') · 부수효과 import 전부 본다", () => {
    expect(core("export { a } from 'react'\n")).toHaveLength(1)
    expect(core("const m = await import('react-native')\n")).toHaveLength(1)
    expect(core("const m = require('react')\n")).toHaveLength(1)
    expect(core("import 'react'\n")).toHaveLength(1)
    expect(core("import {\n  a,\n  b,\n} from \"react\"\n")).toHaveLength(1)
  })

  it('위반은 경로·줄·종류·지정자를 알려 준다', () => {
    const [v] = core("const a = 1\nimport x from 'react'\n")
    expect(v).toEqual({ path: 'src/core/derive.ts', line: 2, kind: 'import', detail: 'react' })
    expect(render([v])).toMatch(/^src\/core\/derive\.ts:2 — .*'react'.* — .+/)
  })

  it('주석 안의 import 글은 위반이 아니다', () => {
    expect(core("// import x from 'react'\n/* import('react') */\n")).toEqual([])
  })

  it('코어 밖 파일은 보지 않는다', () => {
    expect(imp('react', 'src/home/a.ts')).toEqual([])
  })
})

describe('boundary: 금지 전역', () => {
  it('window.addEventListener는 위반', () => {
    expect(core('window.addEventListener("x", f)\n')).toMatchObject([{ kind: 'global', detail: 'window' }])
  })
  it('주석 안 "window"와 문자열 \'document\'는 통과', () => {
    expect(core('// window 는 쓰지 않는다\nconst a = "document"\nconst b = `navigator`\n')).toEqual([])
  })
  it('typeof document는 위반', () => {
    expect(core('const a = typeof document\n')).toMatchObject([{ kind: 'global', detail: 'document' }])
  })
  it('import.meta.glob은 테스트 아닌 파일에서 위반, 테스트에서는 통과', () => {
    expect(core("const r = import.meta.glob('/src/core/*.ts')\n")).toMatchObject([{ kind: 'global', detail: 'import.meta' }])
    expect(core("const r = import.meta.glob('/src/core/*.ts')\n", 'src/core/a.test.ts')).toEqual([])
  })
  it.each(['localStorage.getItem("x")', 'sessionStorage.x', 'indexedDB.open', 'new AudioContext()', 'new webkitAudioContext()', 'URL.createObjectURL(b)', '__APP_VERSION__', 'navigator.userAgent'])(
    '%s → 위반',
    (code) => {
      expect(core(`const a = ${code}\n`)).toHaveLength(1)
    },
  )
  it('fetch·crypto·Intl·structuredClone은 막지 않는다', () => {
    expect(core('fetch(u); crypto.randomUUID(); new Intl.NumberFormat(); structuredClone(a); new URL(u)\n')).toEqual([])
  })
  it('객체의 .window 속성이나 이름의 일부는 전역이 아니다', () => {
    expect(core('const a = { x: o.window, windowSize: 1, documentCount: 2 }\n')).toEqual([])
  })
  it('테스트 파일은 전역 검사를 받지 않는다', () => {
    expect(core('const a = typeof window\n', 'src/core/a.test.ts')).toEqual([])
  })
})

describe('boundary: 지금 레포', () => {
  it('src/core 전체에 위반 0 — 종료 코드 0', () => {
    expect(() => execFileSync('node', ['scripts/boundary.mjs', '--check'], { stdio: 'pipe' })).not.toThrow()
  })
})
