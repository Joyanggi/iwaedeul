// 헛도는 경로 막이 (v2.1 VV2 4)) — 테스트가 읽는 파일이 사라져도 통과해 버리는 길을 막는다.
// 웹을 지운 뒤 `import.meta.glob`은 파일이 0개여도 던지지 않고, `nn1Src`처럼 `?? ""`로 읽는 도우미는 빈 글에
// `.not.toMatch`를 걸어 **통과한다**(v116.test.ts). 그래서 (1) glob이 실제 파일과 맞는지 (2) 경로 리터럴이 실제 파일인지 본다.
// `node:fs`를 쓰므로 `scripts/`에 둔다(src의 타입 설정에는 node 타입이 없다).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 일부러 없는 파일을 가리키는 리터럴. 형식: `경로 — 이유`. 늘리려면 근거를 적고 리뷰어가 본다. */
const ALLOW = []

/** 템플릿(`${…}`)이나 glob 문자(`* { ?`)가 들어 있어 리터럴 검사에서 건너뛴 수 — VV2 끝에 센 값(VV3에서 다시 센다). */
const SKIPPED_TEMPLATE = 0
const SKIPPED_GLOB_CHARS = 4

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const rel = (p) => relative(ROOT, p).split('\\').join('/')
const ALL_FILES = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts')), ...walk(join(ROOT, 'docs')), ...walk(join(ROOT, '.github'))]
  .map(rel)
  .concat(readdirSync(ROOT).filter((n) => statSync(join(ROOT, n)).isFile()))

const SRC_TESTS = walk(join(ROOT, 'src')).filter((p) => /\.test\.tsx?$/.test(p))
const SCRIPT_TESTS = walk(join(ROOT, 'scripts')).filter((p) => /\.test\.mjs$/.test(p))

/** vite의 glob 패턴 → 정규식. `**`·`*`·`?`·`{a,b}`를 지원한다. */
export function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      i++
      if (glob[i + 1] === '/') {
        i++
        re += '(?:.*/)?'
      } else re += '.*'
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else if (c === '{') {
      const end = glob.indexOf('}', i)
      re += `(?:${glob
        .slice(i + 1, end)
        .split(',')
        .map((s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&'))
        .join('|')})`
      i = end
    } else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

const STRING = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g

/** `import.meta.glob(` 첫 인자의 문자열 리터럴들 (문자열이면 하나, 배열이면 원소마다). */
export function globPatterns(text) {
  const out = []
  let at = text.indexOf('import.meta.glob(')
  while (at !== -1) {
    let i = at + 'import.meta.glob('.length
    while (/\s/.test(text[i])) i++
    let arg
    if (text[i] === '[') arg = text.slice(i, text.indexOf(']', i) + 1)
    else {
      const m = new RegExp(STRING.source, 'y')
      m.lastIndex = i
      const hit = m.exec(text)
      arg = hit ? hit[0] : ''
    }
    for (const m of arg.matchAll(STRING)) out.push(m[2])
    at = text.indexOf('import.meta.glob(', at + 1)
  }
  return out
}

const matches = (file, pattern) => {
  const p = pattern.startsWith('!') ? pattern.slice(1) : pattern
  const base = p.startsWith('/') ? p.slice(1) : posix.join(posix.dirname(rel(file)), p)
  const re = globToRegExp(base)
  return ALL_FILES.some((f) => re.test(f))
}

const PATH_LITERAL = /(["'`])((?:src|\/src)\/[^"'`\n]*?\.(?:ts|tsx|mjs|css|json))\1/g

export function pathLiterals(text) {
  const real = []
  let template = 0
  let globChars = 0
  for (const m of text.matchAll(PATH_LITERAL)) {
    const lit = m[2]
    if (lit.includes('${')) template++
    else if (/[*{?]/.test(lit)) globChars++
    else real.push(lit)
  }
  return { real, template, globChars }
}

describe('헛도는 경로 막이', () => {
  it('glob: src·scripts 테스트의 import.meta.glob 패턴이 하나하나 실제 파일과 맞는다 (배열이면 원소마다)', () => {
    const dead = []
    let seen = 0
    for (const file of [...SRC_TESTS, ...SCRIPT_TESTS]) {
      for (const pattern of globPatterns(readFileSync(file, 'utf8'))) {
        seen++
        if (!matches(file, pattern)) dead.push(`${rel(file)}: ${pattern}`)
      }
    }
    expect(seen, '스캔이 glob을 하나도 못 찾았다 — 이 검사가 헛돈다').toBeGreaterThan(20)
    expect(dead).toEqual([])
  })

  it('리터럴: src 테스트의 src/·/src/ 경로 문자열이 실제 파일이다 (허용 목록 제외)', () => {
    const allowed = new Set(ALLOW.map((a) => a.split(' — ')[0]))
    const dead = []
    let seen = 0
    for (const file of SRC_TESTS) {
      for (const lit of pathLiterals(readFileSync(file, 'utf8')).real) {
        seen++
        const path = lit.replace(/^\//, '')
        if (!existsSync(join(ROOT, path)) && !allowed.has(lit)) dead.push(`${rel(file)}: ${lit}`)
      }
    }
    expect(seen, '스캔이 경로 리터럴을 하나도 못 찾았다 — 이 검사가 헛돈다').toBeGreaterThan(50)
    expect(dead).toEqual([])
  })

  it('건너뛴 수와 허용 목록 길이가 고정이다 (늘면 이유를 적고 이 값을 고친다)', () => {
    let template = 0
    let globChars = 0
    for (const file of SRC_TESTS) {
      const r = pathLiterals(readFileSync(file, 'utf8'))
      template += r.template
      globChars += r.globChars
    }
    expect({ template, globChars, allow: ALLOW.length }).toEqual({
      template: SKIPPED_TEMPLATE,
      globChars: SKIPPED_GLOB_CHARS,
      allow: 0,
    })
  })

  it('허용 목록의 항목은 `경로 — 이유` 형식이고 이유가 있다', () => {
    for (const a of ALLOW) expect(a, a).toMatch(/^\S+ — .{4,}/)
  })

  it('검사가 실제로 죽은 glob·리터럴을 잡는다 (헛돌지 않게)', () => {
    // 이 파일 자신을 glob으로 읽는 것으로 오해하지 않게, 호출 글자를 쪼개 만든다
    const G = 'import.meta' + '.glob('
    expect(globPatterns(`x = ${G}['/src/core/*.ts', '!/src/core/*.test.ts'], {})`)).toEqual([
      '/src/core/*.ts',
      '!/src/core/*.test.ts',
    ])
    expect(globPatterns(`${G}"/src/screens/*.tsx", { query: '?raw' })`)).toEqual(['/src/screens/*.tsx'])
    expect(matches(join(ROOT, 'src/core/x.test.ts'), '/src/screens/*.tsx')).toBe(false)
    expect(matches(join(ROOT, 'src/core/x.test.ts'), '/src/core/**/*.{ts,tsx}')).toBe(true)
    expect(matches(join(ROOT, 'src/core/x.test.ts'), '!/src/core/**/*.test.ts')).toBe(true)
    const tpl = '`' + '/src/core/${f}.ts' + '`'
    expect(pathLiterals(`a('src/screens/HomeScreen.tsx'); b(${tpl}); c("/src/**/*.tsx")`)).toEqual({
      real: ['src/screens/HomeScreen.tsx'],
      template: 1,
      globChars: 1,
    })
    expect(existsSync(join(ROOT, 'src/screens/HomeScreen.tsx'))).toBe(false)
  })
})
