import { describe, expect, it } from 'vitest'

// PLAN v1.21 SS1 — 첫 화면 코드 분할. 소스 스캔(RTL이 없다). 화면이 실제로 나뉘어 읽히는지는 ui-check의 새 흐름 셋과 first-load --check가 본다.
// 소스는 ?raw로 읽는다(`node:fs`는 src의 타입 검사에 없다 — DEV-RECORD 제약 13). 이 둘은 .tsx라 ?raw가 빈 문자열이 되지 않는다(제약 3은 .css)
import app from '../App.tsx?raw'
import ax from '../ax/index.tsx?raw'

describe('v121 SS1 — App은 홈만 정적으로 읽는다', () => {
  it('v121 SS1: 홈 밖 화면 여섯은 정적 import가 0건이고 홈은 정적이다', () => {
    expect(app).not.toMatch(/import (SessionScreen|SummaryScreen|DietScreen|HistoryScreen|SettingsScreen|Onboarding) from/)
    expect(app).toContain("import HomeScreen from './screens/HomeScreen'")
  })

  it('v121 SS1: LOADERS의 열쇠가 여섯이고 PRELOAD에 onboarding이 없다', () => {
    const loaders = app.match(/const LOADERS = \{([\s\S]*?)\} as const/)
    expect(loaders).not.toBeNull()
    const keys = [...loaders![1].matchAll(/^\s+(\w+): \(\) => import\(/gm)].map((m) => m[1])
    expect(keys).toEqual(['session', 'summary', 'diet', 'history', 'settings', 'onboarding'])
    const preload = app.match(/const PRELOAD = \[([^\]]*)\] as const/)
    expect(preload).not.toBeNull()
    expect(preload![1]).not.toContain('onboarding')
    expect(preload![1].match(/'\w+'/g)).toHaveLength(5)
  })

  it('v121 SS1: 분석·루틴 편집 import는 각각 한 번, lazy(() => 바로 뒤에만 있다(미리 읽기 쪽에서 부르지 않는다)', () => {
    for (const name of ['AnalyzeScreen', 'RoutineEditorScreen']) {
      const all = app.split(`import('./screens/${name}')`).length - 1
      expect(all, name).toBe(1)
      expect(app, name).toContain(`lazy(() => import('./screens/${name}'))`)
    }
  })

  it('v121 SS1: 미리 읽기는 PRELOAD와 preloadSheet를 setTimeout 뒤에 부르고 정리 함수에서 clearTimeout 한다', () => {
    expect(app).toContain('const PRELOAD_DELAY_MS = 1000')
    const at = app.indexOf('setTimeout(')
    expect(at).toBeGreaterThan(-1)
    const body = app.slice(at, app.indexOf('[ready])', at))
    expect(body).toContain('LOADERS[key]()')
    expect(body).toContain('preloadSheet()')
    expect(body).toContain('.catch(() => undefined)')
    expect(body).toContain('clearTimeout(id)')
  })

  it('v121 SS1: 탭바(<Bar position="bottom">)는 탭 내용 Suspense 뒤에 있고 그 Suspense 밖에 있다', () => {
    const open = app.indexOf('<Suspense fallback={<Loading text="불러오는 중…" />}>\n        {tab ===')
    const bar = app.indexOf('<Bar position="bottom">')
    expect(open).toBeGreaterThan(-1)
    const close = app.indexOf('</Suspense>\n      <Bar position="bottom">')
    expect(close).toBeGreaterThan(open)
    expect(bar).toBeGreaterThan(close)
  })
})

// v117의 'astryxdesign은 src/ax 밖에서 import하지 않는다' 스캔이 글자 그대로의 패키지 이름을 잡으므로 이름을 조립한다
const SHEET_PKG = ['@astryx', 'design/core/BottomSheet'].join('')

describe('v121 SS1 — 시트 부품은 처음 열 때 읽는다', () => {
  it('v121 SS1: BottomSheet는 import type 한 줄뿐이고 lazy(import())로 읽고 preloadSheet를 내보낸다', () => {
    const lines = ax.split('\n').filter((l: string) => l.includes(`from '${SHEET_PKG}'`))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^import type \{/)
    expect(ax).toContain("lazy(loadBottomSheet)")
    expect(ax).toContain(`import('${SHEET_PKG}')`)
    expect(ax).toMatch(/export function preloadSheet\(\) \{\s*return loadBottomSheet\(\)/)
    expect(ax).toContain('<Suspense fallback={null}>')
  })

  it('v121 SS1: Sheet의 닫기(closing·SHEET_CLOSE_MS·once·clearTimeout)는 그대로다', () => {
    expect(ax).toContain('const SHEET_CLOSE_MS = 350')
    expect(ax).toContain('const finish = once(() => onCloseRef.current())')
    expect(ax).toContain('return () => clearTimeout(timer)')
  })
})
