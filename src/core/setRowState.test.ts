import { describe, expect, it } from 'vitest'
import { setRowClass, zeroWeightHint } from './setRowState'
import type { SetRecord } from './types'

const set = (over: Partial<SetRecord> = {}): SetRecord => ({
  weight: 40,
  reps: 10,
  done: false,
  ...over,
})

describe('완료 행 클래스 (BB2)', () => {
  it('미완료는 기본 클래스만', () => {
    expect(setRowClass(set())).toBe('set-row')
  })

  it('완료하면 틴트 클래스가 붙는다', () => {
    expect(setRowClass(set({ done: true }))).toBe('set-row set-row-done')
  })

  it('워밍업은 완료해도 틴트를 받지 않는다 (opacity 0.62와 겹쳐 안 읽힌다)', () => {
    expect(setRowClass(set({ done: true, warmup: true }))).toBe(
      'set-row set-row-warmup set-row-done-warmup',
    )
  })

  it('워밍업 미완료는 그대로', () => {
    expect(setRowClass(set({ warmup: true }))).toBe('set-row set-row-warmup')
  })

  it('세트가 없으면 기본 클래스 — 렌더가 죽지 않는다', () => {
    expect(setRowClass(undefined)).toBe('set-row')
  })
})

describe('무게 미입력 힌트 (BB6)', () => {
  it('체크했고 무게가 0이면 뜬다', () => {
    expect(zeroWeightHint(set({ done: true, weight: 0 }), false)).toBe(true)
  })

  it('체크 전에는 뜨지 않는다 — 입력 중인 행에 경고를 미리 띄우지 않는다', () => {
    expect(zeroWeightHint(set({ done: false, weight: 0 }), false)).toBe(false)
  })

  it('무게가 있으면 뜨지 않는다', () => {
    expect(zeroWeightHint(set({ done: true, weight: 2.5 }), false)).toBe(false)
  })

  it('**어시스티드(inverse)는 제외한다** — 보조 무게 0은 최고 난도 달성이다', () => {
    expect(zeroWeightHint(set({ done: true, weight: 0 }), true)).toBe(false)
  })

  it('워밍업도 같게 판정한다 (0kg 워밍업은 여전히 미입력이다)', () => {
    expect(zeroWeightHint(set({ done: true, weight: 0, warmup: true }), false)).toBe(true)
  })

  it('세트가 없으면 뜨지 않는다', () => {
    expect(zeroWeightHint(undefined, false)).toBe(false)
  })
})
