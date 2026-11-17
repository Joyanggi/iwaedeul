// PLAN v1.20 RRM — 새 검사의 Node 쪽 판정(시트 버튼·정적). 브라우저 안 함수(inPage*)는 ui-check.mjs가 실제 화면에서 돈다.
import { describe, expect, it } from 'vitest'
import { barStaticChecks, sheetButtonVerdict } from './lib/ui-check-lib.mjs'

describe('v120 RRM — 시트 버튼 판정', () => {
  it('v120 RRM: 시트 버튼: 버튼이 0개면 실패한다 (아무것도 안 쟀다)', () => {
    expect(sheetButtonVerdict([], null).ok).toBe(false)
    expect(sheetButtonVerdict(undefined, null).ok).toBe(false)
  })

  it('v120 RRM: 시트 버튼: 다크에서만 시트 면과 같은 색이 되면 실패한다 (RR2 화면 검증이 sheet-food 다크에서 본 것)', () => {
    const r = sheetButtonVerdict([['0:추가', 1]], [['0:추가', 2.4]])
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('다크에서 시트 면과 같은 색')
  })

  it('v120 RRM: 시트 버튼: 다크·라이트 둘 다 면·선이 없는 글자만 버튼은 판정에서 빼고 개수만 찍는다', () => {
    const r = sheetButtonVerdict([['0:1:00', 1], ['1:시작', 5]], [['0:1:00', 1], ['1:시작', 5]])
    expect(r.ok).toBe(true)
    expect(r.detail).toContain('글자만 1개 제외')
  })

  it('v120 RRM: 시트 버튼: 다크 값이 라이트보다 0.05 넘게 낮고 3:1에도 못 미치면 실패한다', () => {
    expect(sheetButtonVerdict([['0:저장', 1.8]], [['0:저장', 2.5]]).ok).toBe(false)
  })

  it('v120 RRM: 시트 버튼: 반전 버튼처럼 다크 13:1 · 라이트 17:1이면 값이 낮아도 통과한다 (sheet-finish의 기록 마치기)', () => {
    expect(sheetButtonVerdict([['5:기록 마치기', 13.399]], [['5:기록 마치기', 17.224]]).ok).toBe(true)
  })

  it('v120 RRM: 시트 버튼: 0.05 이내의 차이는 통과한다 (경계)', () => {
    expect(sheetButtonVerdict([['0:저장', 2.0]], [['0:저장', 2.05]]).ok).toBe(true)
    expect(sheetButtonVerdict([['0:저장', 2.0]], [['0:저장', 2.06]]).ok).toBe(false)
  })

  it('v120 RRM: 시트 버튼: 라이트 값이 없으면(다크 장면 칸) 버튼이 있는지만 본다', () => {
    expect(sheetButtonVerdict([['0:추가', 1]], null).ok).toBe(true)
  })
})

describe('v120 RRM — 정적 검사', () => {
  it('v120 RRM: src/**/*.css에 backdrop-filter가 있으면 실패하고 파일 이름을 댄다 (주석 속 글자는 뺀다)', () => {
    expect(barStaticChecks({ 'a.css': '.x { color: red }' })[0].ok).toBe(true)
    expect(barStaticChecks({ 'a.css': '/* backdrop-filter 지웠다 */ .x {}' })[0].ok).toBe(true)
    const bad = barStaticChecks({ 'a.css': '.x {}', 'b.css': '.y { backdrop-filter: blur(4px) }' })[0]
    expect(bad.ok).toBe(false)
    expect(bad.detail).toBe('b.css')
  })
})
