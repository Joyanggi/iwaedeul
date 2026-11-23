// PLAN v1.21 SS8 — 소스 스캔: 주석을 뺀 뒤 글자로 읽고, onClick의 `=>`·`>`에서 끊기는 태그 정규식을 쓰지 않는다.
import { describe, expect, it } from 'vitest'

const SRC = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const files = Object.entries(SRC).filter(([p]) => !/\.test\./.test(p))

describe('v121 SS8 — 인라인 스타일·틀 이름이 없다', () => {
  it('v121 SS8: .tsx 전부에 style=이 0건이다(RoutineEditorScreen.tsx 포함)', () => {
    expect(files.length).toBeGreaterThan(40)
    expect(files.filter(([, t]) => code(t).includes('style=')).map(([p]) => p)).toEqual([])
    expect(code(SRC['/src/screens/RoutineEditorScreen.tsx'])).toContain('<StackItem size="fill">')
  })

  it('v121 SS8: Groups는 className을 받지 않고 화면은 <Groups className=…>를 쓰지 않는다', () => {
    const ax = code(SRC['/src/ax/index.tsx'])
    expect(ax).toMatch(/export function Groups\(\{ children \}: \{ children: ReactNode \}\)/)
    expect(files.filter(([, t]) => /<Groups\s+className/.test(code(t))).map(([p]) => p)).toEqual([])
  })

  it('v121 SS8: 루틴 편집의 나란한 칸은 GROW 상수 없이 StackItem size="fill"이다', () => {
    const s = code(SRC['/src/screens/RoutineEditorScreen.tsx'])
    expect(s).not.toContain('GROW')
    expect(s.match(/<StackItem size="fill">/g)?.length).toBe(5)
  })
})
