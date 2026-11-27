#!/usr/bin/env node
/**
 * 경계 검사 — src/core는 순수 TS여야 한다(react·expo·DB·브라우저 전역을 모른다).
 * 허용 목록 방식이다: 코어 파일이 import할 수 있는 것을 적고, 그 밖은 전부 위반이다.
 *   코어의 모든 파일: 상대 경로이고 풀면 src/core/ 안, 또는 src/data/의 .json
 *   테스트 파일(*.test.ts)만 추가로: vitest, fast-check
 * import 지정자는 원문에서, 전역은 주석·문자열을 지운 글에서 찾는다(quality-scan.mjs의 stripComments).
 * VV4가 레이어 규칙(checkLayers)을 여기에 더한다.
 *
 * 사용: node scripts/boundary.mjs [--check]   --check이면 위반이 있을 때 종료 코드 1
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stripComments } from './quality-scan.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CORE = 'src/core/'
const DATA = 'src/data/'
const TEST_ONLY = new Set(['vitest', 'fast-check'])

// 지정자 자리의 문자열은 stripComments가 같은 길이의 공백으로 만든다 — 그 자리를 찾아 원문에서 읽는다.
const SPECIFIER_SITES = [
  /\bfrom\s*(["'])( *)\1/g, // import … from / export … from
  /\bimport\s*\(?\s*(["'])( *)\1/g, // import('x') · import 'x'
  /\brequire\s*\(\s*(["'])( *)\1/g,
]

const GLOBALS = [
  ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'AudioContext', 'webkitAudioContext', '__APP_VERSION__'].map((name) => ({
    name,
    re: new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, 'g'),
  })),
  { name: 'URL.createObjectURL', re: /(?<![\w$.])URL\s*\.\s*createObjectURL\b/g },
  { name: 'import.meta', re: /(?<![\w$.])import\s*\.\s*meta\b/g },
]

const isTest = (path) => /\.test\.[cm]?[jt]sx?$/.test(path)
const lineOf = (text, at) => text.slice(0, at).split('\n').length

function specifierAllowed(path, spec) {
  if (TEST_ONLY.has(spec)) return isTest(path)
  if (!spec.startsWith('.')) return false
  const to = posix.join(posix.dirname(path), spec)
  return to.startsWith(CORE) || (to.startsWith(DATA) && to.endsWith('.json'))
}

/**
 * 코어 파일 목록을 검사한다. 파일 시스템을 모르는 순수 함수다.
 * @param {{ path: string, text: string }[]} files  경로는 레포 뿌리 기준 `/` 구분
 * @returns {{ path: string, line: number, kind: 'import' | 'global', detail: string }[]}
 */
export function checkCore(files) {
  const out = []
  for (const f of files) {
    if (!f.path.startsWith(CORE)) continue
    const stripped = stripComments(f.text)
    for (const site of SPECIFIER_SITES) {
      for (const m of stripped.matchAll(site)) {
        const start = m.index + m[0].indexOf(m[1]) + 1
        const spec = f.text.slice(start, start + m[2].length)
        // 정규식 리터럴 안의 `from '\.\/x'` 같은 글 — 이스케이프가 든 지정자는 실제 import가 아니다
        if (spec.includes('\\')) continue
        if (!specifierAllowed(f.path, spec)) out.push({ path: f.path, line: lineOf(f.text, m.index), kind: 'import', detail: spec })
      }
    }
    if (isTest(f.path)) continue
    for (const g of GLOBALS) {
      for (const m of stripped.matchAll(g.re)) out.push({ path: f.path, line: lineOf(f.text, m.index), kind: 'global', detail: g.name })
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line))
}

const FIX = {
  import: '코어는 src/core 안의 상대 경로와 src/data의 .json만 import한다. 플랫폼·UI·DB에 닿는 일은 호출하는 쪽(platform·db·ui)으로 옮긴다',
  global: '코어에 브라우저·기기 전역을 쓰지 않는다. 값이 필요하면 인자로 받는다',
}

export function render(violations) {
  return violations.map((v) => `${v.path}:${v.line} — ${v.kind === 'import' ? `허용되지 않는 import '${v.detail}'` : `금지된 전역 ${v.detail}`} — ${FIX[v.kind]}`).join('\n')
}

function listCore(dir = join(ROOT, CORE)) {
  const files = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) files.push(...listCore(full))
    else if (/\.[cm]?[jt]sx?$/.test(e.name)) files.push({ path: full.slice(ROOT.length + 1).split('\\').join('/'), text: readFileSync(full, 'utf8') })
  }
  return files
}

function main() {
  const files = listCore()
  const violations = checkCore(files)
  if (violations.length === 0) {
    console.log(`경계 검사: src/core ${files.length}개 파일, 위반 0`)
    return
  }
  console.error(render(violations))
  console.error(`경계 검사: 위반 ${violations.length}건`)
  if (process.argv.includes('--check')) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
