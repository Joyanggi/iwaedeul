#!/usr/bin/env node
/**
 * 첫 화면이 뜨는 시간 재기 (PLAN v1.20 RR0 — DESIGN 9.2가 재라고 했다).
 *
 * 사용: npm run build && node scripts/first-screen.mjs
 *   `dist`를 vite preview로 띄우고, iPhone 14 흉내 + CDP `Emulation.setCPUThrottlingRate` 4(CPU를 4배 느리게)로 잰다:
 *   ① 캐시 없는 첫 방문 — 새 브라우저 문맥마다 한 번
 *   ② 서비스워커가 precache를 끝낸 뒤 `reload` — 헬스장에서 앱을 다시 여는 실제 경험
 *   각각 5번 재서 중앙값을 찍는다. 끝 조건: `#root`의 글자가 20자를 넘고 "불러오는 중"이 없다.
 *   판정하지 않는다(종료 코드 0). 러너마다 값이 흔들려 CI에 못 넣는다 — 사람이 읽는 숫자다.
 */
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'
import { preview } from 'vite'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '/workout-tracker/'
const RUNS = 5
const THROTTLE = 4

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('dist가 없다. 먼저 `npm run build`를 돌린다.')
  process.exit(2)
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer()
    s.once('error', reject)
    s.listen(0, () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const IPHONE = { ...devices['iPhone 14'] }
delete IPHONE.defaultBrowserType

/** 화면이 떴는가: #root의 글자가 20자를 넘고 "불러오는 중"이 없다 */
const shown = () => {
  const text = document.querySelector('#root')?.textContent ?? ''
  return text.trim().length > 20 && !text.includes('불러오는 중')
}

async function throttled(ctx) {
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  return page
}

const port = await freePort()
const server = await preview({ root: ROOT, preview: { port, strictPort: true, host: 'localhost' }, logLevel: 'silent' })
const browser = await chromium.launch()
const url = `http://localhost:${port}${BASE}`
try {
  // ① 캐시 없는 첫 방문
  const cold = []
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ ...IPHONE, locale: 'ko-KR', colorScheme: 'dark' })
    const page = await throttled(ctx)
    const t0 = Date.now()
    await page.goto(url, { waitUntil: 'commit' })
    await page.waitForFunction(shown, undefined, { timeout: 60000, polling: 'raf' })
    cold.push(Date.now() - t0)
    await ctx.close()
  }

  // ② 서비스워커 precache가 끝난 뒤 다시 열기
  const ctx = await browser.newContext({ ...IPHONE, locale: 'ko-KR', colorScheme: 'dark' })
  const page = await throttled(ctx)
  await page.goto(url)
  await page.waitForFunction(shown, undefined, { timeout: 60000, polling: 'raf' })
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForTimeout(1500) // precache 끝난 뒤 한 박자
  const reopen = []
  for (let i = 0; i < RUNS; i++) {
    const t0 = Date.now()
    await page.reload({ waitUntil: 'commit' })
    await page.waitForFunction(shown, undefined, { timeout: 60000, polling: 'raf' })
    reopen.push(Date.now() - t0)
  }
  const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
  await ctx.close()

  console.log(`첫 화면까지 (Chromium, CPU ${THROTTLE}배 느리게, localhost, ${RUNS}번의 중앙값)`)
  console.log(`- 캐시 없는 첫 방문: ${median(cold)}ms  (${cold.join(', ')})`)
  console.log(`- 서비스워커 캐시로 다시 열기: ${median(reopen)}ms  (${reopen.join(', ')})${controlled ? '' : ' — 서비스워커가 페이지를 제어하지 않았다(캐시 경로가 아닐 수 있다)'}`)
} finally {
  await browser.close()
  await server.close()
}
process.exit(0)
