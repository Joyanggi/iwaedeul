// PLAN v1.21 SS0 — 필수 장면, 첫 화면 크기 도구, 인벤토리의 "화면이 아닌 파일".
// CSS·스크립트는 vitest의 ?raw가 아니라 fs로 읽는다(제약 3).
import fc from 'fast-check'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { collectFirstLoad } from './lib/first-load-lib.mjs'
import { applyKnownFailures, KNOWN_FAILURES } from './lib/ui-check-lib.mjs'

const uiCheck = readFileSync(new URL('./ui-check.mjs', import.meta.url), 'utf8')
const inventory = readFileSync(new URL('./astryx-inventory.mjs', import.meta.url), 'utf8')
const firstLoadScript = fileURLToPath(new URL('./first-load.mjs', import.meta.url))

describe('v121 SS0 — 필수 장면', () => {
  it('v121 SS0: ui-check.mjs에 requiredScene이 있고 장면 실패를 표(칸 전부 실패)와 종료 코드로 센다', () => {
    const at = uiCheck.indexOf('const requiredScene = async')
    expect(at).toBeGreaterThan(-1)
    const body = uiCheck.slice(at, uiCheck.indexOf('const wrapProbe', at))
    expect(body).toMatch(/catch \(e\)/)
    expect(body).toContain('sceneFailures.push')
    expect(body).toMatch(/rows\.push\(\{ scene: n, cells: Object\.fromEntries\(COLUMNS\.map\(\(c\) => \[c, \{ status: '실패'/)
    // 예외 없이 찍지 못한 장면도 실패다(0개 통과 금지)
    expect(body).toContain('찍지 않았다')
    expect(uiCheck).toMatch(/failed \+= sceneFailures\.length/)
    expect(uiCheck).toMatch(/!CHECK && sceneFailures\.length[\s\S]{0,200}exitCode = 1/)
  })

  it('v121 SS0: 남은 화면 장면 다섯이 optional( 호출 안에 없다', () => {
    for (const name of ['history-detail', 'sheet-food', 'diet-log-open', 'settings-open', 'settings-routines']) {
      expect(uiCheck, name).not.toMatch(new RegExp(`optional\\(\\s*'${name}'`))
      expect(uiCheck, name).toMatch(new RegExp(`requiredScene\\(\\s*(?:\\[[^\\]]*)?'${name}'`))
    }
  })

  it('v121 SS0: PLAN이 적은 새 장면이 전부 requiredScene 이름이나 snap 호출에 있다', () => {
    const scenes = [
      'diet-end', 'diet-375', 'diet-streak', 'sheet-diet-plan', 'sheet-diet-plan-ahead', 'sheet-diet-slot', 'sheet-diet-slot-edit', 'sheet-diet-variant', 'sheet-food-new',
      'history-375', 'history-day', 'history-exercise', 'history-exercise-detail', 'history-detail-end', 'history-detail-change',
      'analyze-end', 'analyze-375', 'analyze-empty', 'settings-gist', 'settings-export-preview', 'settings-reset-confirm',
      'onboarding', 'onboarding-375', 'onboarding-standalone',
    ]
    for (const s of scenes) {
      expect(uiCheck, s).toContain(`snap('${s}'`)
      expect(uiCheck, s).toMatch(new RegExp(`requiredScene\\(\\s*(?:\\[[^\\]]*)?'${s}'`))
    }
  })

  it('v121 SS0: 심은 시드는 finally에서 되돌린다(식단 날·종목 메모·가짜 토큰)', () => {
    for (const marker of ['inPageDietRestore', 'inPageNoteSeed, originals', "removeItem('workout-tracker.gistToken')"]) {
      const at = uiCheck.indexOf(marker, uiCheck.indexOf('async function runScenes'))
      expect(at, marker).toBeGreaterThan(-1)
      expect(uiCheck.slice(Math.max(0, at - 400), at), marker).toContain('finally')
    }
  })

  it('v121 SS0: 가짜 토큰 장면은 GitHub 호출을 막고 0건임을 흐름으로 판정한다', () => {
    expect(uiCheck).toMatch(/ctx\.route\(\/api\\\.github\\\.com\//)
    expect(uiCheck).toContain("'settings-gist GitHub을 부르지 않는다'")
    expect(uiCheck).toMatch(/ok: made === 0/)
  })
})

describe('v121 SS0 — 인벤토리의 화면이 아닌 파일', () => {
  it('v121 SS0: NOT_SCREENS가 main.tsx·icons.tsx를 이유와 함께 들고 첫째 숫자에서만 뺀다', () => {
    expect(inventory).toMatch(/'src\/main\.tsx': '[^']+'/)
    expect(inventory).toMatch(/'src\/components\/icons\.tsx': '[^']+'/)
    expect(inventory).toContain("'제외'")
    expect(inventory).toMatch(/rows\.length - total\.ax - total\.ex/)
    // 둘째·셋째 숫자는 제외 파일도 그대로 센다
    expect(inventory).toMatch(/inline: a\.inline \+ r\.inlineCount/)
  })
})

describe('v121 SS0 — collectFirstLoad', () => {
  it('v121 SS0: 스크립트 하나와 CSS 하나인 HTML에서 둘을 모은다', () => {
    const html = '<script type="module" crossorigin src="/a/index.js"></script><link rel="stylesheet" crossorigin href="/a/index.css">'
    expect(collectFirstLoad(html)).toEqual(['/a/index.js', '/a/index.css'])
  })

  it('v121 SS0: 같은 파일을 script와 modulepreload에 둘 다 적어도 한 번만 센다', () => {
    const html = '<link rel="modulepreload" href="/a/x.js"><script type="module" src="/a/x.js"></script>'
    expect(collectFirstLoad(html)).toEqual(['/a/x.js'])
  })

  it('v121 SS0: nomodule·rel=icon·apple-touch-startup-image·manifest는 안 센다', () => {
    const html = [
      '<script nomodule src="/a/legacy.js"></script>',
      '<link rel="icon" href="/a/i.svg">',
      '<link rel="apple-touch-startup-image" href="/a/s.png">',
      '<link rel="manifest" href="/a/m.json">',
      '<script src="/a/plain.js"></script>',
    ].join('')
    expect(collectFirstLoad(html)).toEqual([])
  })

  it('v121 SS0 속성: 어떤 태그를 섞어도 결과에 중복이 없고 모든 항목이 입력에 나온 경로다', () => {
    const tag = fc.oneof(
      fc.constantFrom('/a/1.js', '/a/2.js', '/a/3.css').map((p) => `<script type="module" src="${p}"></script>`),
      fc.constantFrom('/a/1.js', '/a/2.js').map((p) => `<link rel="modulepreload" href="${p}">`),
      fc.constantFrom('/a/3.css', '/a/4.css').map((p) => `<link rel="stylesheet" href="${p}">`),
      fc.constantFrom('/a/i.svg', '/a/s.png').map((p) => `<link rel="icon" href="${p}">`),
    )
    fc.assert(
      fc.property(fc.array(tag, { maxLength: 12 }), (tags) => {
        const html = tags.join('\n')
        const got = collectFirstLoad(html)
        expect(new Set(got).size).toBe(got.length)
        for (const p of got) expect(html).toContain(p)
      }),
    )
  })
})

describe('v121 SS0 — first-load.mjs 종료 코드', () => {
  const run = (setup) => {
    const dir = mkdtempSync(join(tmpdir(), 'first-load-'))
    setup(dir)
    return spawnSync(process.execPath, [firstLoadScript, `--dist=${dir}`], { encoding: 'utf8' })
  }
  // 종료 코드만 보면 다른 갈래의 1에 헛통과한다 — 이유 문구(stderr)도 단언한다
  it('v121 SS0: dist/index.html이 없으면 종료 코드 1', () => {
    const r = run(() => {})
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('index.html가 없다')
  })
  it('v121 SS0: 스크립트 태그가 0개면 종료 코드 1 (적힌 CSS는 실제로 있다)', () => {
    const r = run((d) => {
      writeFileSync(join(d, 'a.css'), 'a{}')
      writeFileSync(join(d, 'index.html'), '<html><link rel="stylesheet" href="/workout-tracker/a.css"></html>')
    })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('모듈 스크립트 태그가 없다')
  })
  it('v121 SS0: 빈 index.html(<html></html>)도 종료 코드 1', () => {
    const r = run((d) => writeFileSync(join(d, 'index.html'), '<html></html>'))
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('모듈 스크립트 태그가 없다')
  })
  it('v121 SS0: index.html이 적은 파일이 없으면 종료 코드 1', () => {
    const r = run((d) => writeFileSync(join(d, 'index.html'), '<script type="module" src="/workout-tracker/assets/none.js"></script>'))
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('none.js')
    expect(r.stderr).toContain('없다')
  })
  it('v121 SS0: 파일이 다 있으면 종료 코드 0(--check 없이)', () => {
    const r = run((d) => {
      mkdirSync(join(d, 'assets'))
      writeFileSync(join(d, 'assets', 'a.js'), 'console.log(1)')
      writeFileSync(join(d, 'index.html'), '<script type="module" src="/workout-tracker/assets/a.js"></script>')
    })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('assets/a.js')
  })
})

describe('v121 SS0 — 알려진 실패 (개정 1)', () => {
  // 처음 목록(셋). SS5가 analyze-empty 항목을 고쳐 KNOWN_FAILURES에서 지웠다 — 판정 함수의 동작은 처음 목록으로 계속 잰다
  const FIXTURE = [
    { scene: 'analyze-empty', column: '여백 격자', detail: 'p.center-note marginTop 13px · p.center-note marginBottom 13px', until: 'SS5' },
    ...KNOWN_FAILURES,
  ]
  const fail = (detail) => ({ status: '실패', detail })
  const rowsFor = () => [
    { scene: 'analyze-empty', cells: { '여백 격자': fail(FIXTURE[0].detail), '접근성': { status: '통과' } } },
    { scene: 'settings-export-preview', cells: { '접근성': fail(FIXTURE[1].detail), '눌림 반응': fail(FIXTURE[2].detail) } },
  ]
  const count = (rows, status) => rows.flatMap((r) => Object.values(r.cells)).filter((c) => c && c.status === status).length

  it('v121 SS0 알려진 실패: 세 칸이 항목과 글자까지 같으면 알려진 실패 셋, 실패 0', () => {
    const r = applyKnownFailures(rowsFor(), FIXTURE)
    expect(r.known).toBe(3)
    expect(count(r.rows, '알려진 실패')).toBe(3)
    expect(count(r.rows, '실패')).toBe(0)
    expect(r.stale).toEqual([])
  })
  it('v121 SS0 알려진 실패: 상세가 한 글자 다르면 실패 그대로', () => {
    const rows = rowsFor()
    rows[0].cells['여백 격자'] = fail(FIXTURE[0].detail.replace('13px', '14px'))
    const r = applyKnownFailures(rows, FIXTURE)
    expect(r.rows[0].cells['여백 격자'].status).toBe('실패')
    expect(r.known).toBe(2)
  })
  it('v121 SS0 알려진 실패: 같은 상세가 다른 칸·다른 장면(-light 행 포함)에 있으면 실패 그대로', () => {
    const rows = [
      { scene: 'analyze-empty-light', cells: { '여백 격자': fail(FIXTURE[0].detail) } },
      { scene: 'analyze', cells: { '여백 격자': fail(FIXTURE[0].detail) } },
      { scene: 'analyze-empty', cells: { '가로 넘침': fail(FIXTURE[0].detail) } },
    ]
    const r = applyKnownFailures(rows, FIXTURE)
    expect(r.known).toBe(0)
    expect(count(r.rows, '실패')).toBe(3)
  })
  it('v121 SS0 알려진 실패: 칸이 통과인 항목은 stale', () => {
    const rows = rowsFor()
    rows[0].cells['여백 격자'] = { status: '통과' }
    const r = applyKnownFailures(rows, FIXTURE)
    expect(r.stale).toEqual([{ scene: 'analyze-empty', column: '여백 격자', until: 'SS5' }])
    expect(r.known).toBe(2)
  })
  it('v121 SS0 알려진 실패: 행이 없는 항목은 stale도 아니고 바뀐 칸도 없다', () => {
    const r = applyKnownFailures([], FIXTURE)
    expect(r).toEqual({ rows: [], known: 0, stale: [] })
  })
  it('v121 SS0 알려진 실패: 장면 실패 행(칸 전부 실패, 상세는 예외 줄)은 하나도 안 바뀐다', () => {
    const cells = Object.fromEntries(['여백 격자', '접근성', '눌림 반응'].map((c) => [c, fail('Error: 선택자를 못 찾았다')]))
    const rows = [{ scene: 'analyze-empty', cells }, { scene: 'settings-export-preview', cells: { ...cells } }]
    const r = applyKnownFailures(rows, FIXTURE)
    expect(r.rows).toEqual(rows)
    expect(r.known).toBe(0)
  })
  it('v121 SS0 알려진 실패 속성: 숨기기만 하고 만들지 않으며 두 번 걸어도 같다', () => {
    const cell = fc.oneof(
      fc.constant(null),
      fc.constantFrom('통과', '건너뜀', '기록').map((status) => ({ status })),
      fc.constantFrom('x', ...FIXTURE.map((k) => k.detail)).map((detail) => ({ status: '실패', detail })),
    )
    const row = fc
      .record({
        scene: fc.constantFrom('analyze-empty', 'analyze-empty-light', 'settings-export-preview', 'home'),
        cells: fc.dictionary(fc.constantFrom('여백 격자', '접근성', '눌림 반응', '가로 넘침'), cell),
      })
    fc.assert(
      fc.property(fc.array(row, { maxLength: 6 }), fc.subarray(FIXTURE), (rows, known) => {
        const r = applyKnownFailures(rows, known)
        expect(count(r.rows, '실패') + count(r.rows, '알려진 실패')).toBe(count(rows, '실패'))
        expect(count(r.rows, '알려진 실패')).toBe(r.known)
        rows.forEach((row0, i) => {
          for (const [c, v] of Object.entries(row0.cells)) if (!v || v.status !== '실패') expect(r.rows[i].cells[c]).toEqual(v)
        })
        expect(applyKnownFailures(r.rows, known).rows).toEqual(r.rows)
      }),
    )
  })
  it('v121 SS0 알려진 실패: KNOWN_FAILURES는 늘지 않는다(남은 두 쌍의 부분집합, 길이 2 이하)', () => {
    const allowed = new Set(['settings-export-preview·접근성', 'settings-export-preview·눌림 반응'])
    expect(KNOWN_FAILURES.length).toBeLessThanOrEqual(2)
    for (const k of KNOWN_FAILURES) expect(allowed.has(`${k.scene}·${k.column}`), `${k.scene}·${k.column}`).toBe(true)
    expect(new Set(KNOWN_FAILURES.map((k) => `${k.scene}·${k.column}`)).size).toBe(KNOWN_FAILURES.length)
  })
  it('v121 SS5: 고친 analyze-empty 항목은 KNOWN_FAILURES에 없다(남기면 stale 실패 — 같은 커밋에서 지운다)', () => {
    expect(KNOWN_FAILURES.map((k) => k.scene)).not.toContain('analyze-empty')
  })
  it('v121 SS0 알려진 실패: printResults는 after에서만 걸고 stale을 실패로 센다', () => {
    expect(uiCheck).toMatch(/phase === 'after' \? applyKnownFailures\(rows, KNOWN_FAILURES\)/)
    expect(uiCheck).toContain('알려진 실패가 고쳐졌다 — KNOWN_FAILURES에서 지운다')
    expect(uiCheck).toMatch(/for \(const s of known\.stale\) \{\s*failed\+\+/)
  })
})
