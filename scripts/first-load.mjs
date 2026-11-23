#!/usr/bin/env node
/**
 * 첫 화면 크기 (PLAN v1.21 SS0): 앱을 처음 여는 순간 읽는 파일의 gzip 크기와 합.
 *
 * 사용: npm run build && node scripts/first-load.mjs [--check] [--dist=<폴더>]
 *   dist/index.html에서 모듈 스크립트·modulepreload·스타일시트를 모아 파일마다 zlib.gzipSync(기본값 — vite build의 gzip과 같다) 크기를 kB(1000)로 찍는다.
 *   --check이면 합이 FIRST_LOAD_BUDGET_KB를 넘을 때 종료 코드 1.
 *   dist/index.html이 없거나, 모은 파일이 0개이거나, 적힌 파일이 없으면 종료 코드 1 (빈 통과 없음).
 *   시간은 재지 않는다(흔들린다) — 그건 first-screen.mjs가 기록만 한다.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { collectFirstLoad } from './lib/first-load-lib.mjs'

/** 첫 화면 gzip 합의 한계(kB). 근거: PLAN v1.21 "확인한 것" 2 — 코드 분할 뒤 약 353KB + 옮기는 작업 몫의 여유 */
const FIRST_LOAD_BUDGET_KB = 360
const BASE = '/workout-tracker/'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const distFlag = args.find((a) => a.startsWith('--dist='))
const DIST = distFlag ? distFlag.slice(7) : join(ROOT, 'dist')

const fail = (msg) => {
  console.error(`첫 화면 크기: ${msg}`)
  process.exit(1)
}

const indexPath = join(DIST, 'index.html')
if (!existsSync(indexPath)) fail(`${indexPath}가 없다. 먼저 npm run build`)
const files = collectFirstLoad(readFileSync(indexPath, 'utf8'))
if (!files.some((f) => /\.js(?:$|\?)/.test(f))) fail('index.html에 모듈 스크립트 태그가 없다')

let total = 0
console.log('| 파일 | gzip(kB) |\n|---|---|')
for (const f of files) {
  const rel = f.startsWith(BASE) ? f.slice(BASE.length) : f.replace(/^\//, '')
  const path = join(DIST, rel)
  if (!existsSync(path)) fail(`index.html이 적은 ${f}가 ${DIST}에 없다`)
  const kb = gzipSync(readFileSync(path)).length / 1000
  total += kb
  console.log(`| ${rel} | ${kb.toFixed(2)} |`)
}
console.log(`| **합** | **${total.toFixed(2)}** |`)
console.log(`\n첫 화면 gzip 합 ${total.toFixed(2)}KB (한계 ${FIRST_LOAD_BUDGET_KB}KB${CHECK ? '' : ' — --check 없이 기록만'})`)
if (CHECK && total > FIRST_LOAD_BUDGET_KB) fail(`${total.toFixed(2)}KB > ${FIRST_LOAD_BUDGET_KB}KB`)
