import { describe, expect, it } from 'vitest'
import { applyAddSet, applyPatchSet } from './sessionOps'
import { BUNDLED_ROUTINE } from './seed'
import { buildSession } from './sessionFactory'
import type { Session } from './types'

/**
 * 워밍업 앞 삽입과 편집 커밋 순서 (v1.7 후속 1).
 *
 * 결함(v1.7 §3.2): 워밍업은 `[set, ...sets]`로 **앞에 삽입**해서 모든 인덱스를 민다.
 * `NumberStepper`는 타이핑 값을 로컬 `text`에 들고 있다가 blur에서 커밋하므로, 커밋 전에
 * 인덱스가 밀리면 그 값이 원래 세트를 떠나 옆 행의 숫자로 보인다 (실측 화면 40 / DB 0).
 *
 * 방어선은 "배열을 바꾸기 전에 커밋"이다. 여기서 잠그는 것은 **그 순서가 만들어 내는
 * 데이터**이고, 화면이 실제로 그 순서로 부르는지는 소스 스캔이 본다 (2층).
 */
const routine = BUNDLED_ROUTINE
const day = routine.days[0]

const fresh = (): Session =>
  buildSession({
    routine,
    day,
    mode: 'normal',
    sessions: [],
    phase: 0,
    today: '2026-08-05',
    isInverse: () => false,
    scales: new Map(),
  }).session

const key = () => fresh().entries[0].recordKey

describe('커밋 → 삽입 순서가 값을 제자리에 둔다', () => {
  it('먼저 커밋하면 타이핑한 값이 그 세트에 남는다', () => {
    const rk = key()
    // 1) 편집 커밋 (blur에서 일어나는 것) — 이때 인덱스 0은 아직 작업 세트다
    let s = applyPatchSet(fresh(), rk, 0, { weight: 40 })
    // 2) 그 다음에 워밍업 삽입
    s = applyAddSet(s, rk, { warmup: true })

    const sets = s.entries[0].sets
    expect(sets[0].warmup).toBe(true)
    // 타이핑한 40은 **작업 세트 1**(이제 인덱스 1)에 있어야 한다
    expect(sets[1].weight).toBe(40)
    expect(sets[1].warmup).toBeUndefined()
  })

  it('순서가 뒤집히면 값이 다른 세트로 간다 — 이 순서가 규칙인 이유', () => {
    const rk = key()
    // 삽입이 먼저면 인덱스 0은 워밍업이 되고, 뒤늦은 커밋이 그 위에 얹힌다
    let s = applyAddSet(fresh(), rk, { warmup: true })
    s = applyPatchSet(s, rk, 0, { weight: 40 })

    const sets = s.entries[0].sets
    expect(sets[0].warmup).toBe(true)
    expect(sets[0].weight).toBe(40) // ← 워밍업에 들어갔다
    expect(sets[1].weight).not.toBe(40) // ← 원래 세트는 못 받았다
  })

  it('워밍업은 앞에, 일반 세트는 뒤에 붙는다 (§3.2의 전제)', () => {
    const rk = key()
    const before = fresh().entries[0].sets.length
    const warm = applyAddSet(fresh(), rk, { warmup: true }).entries[0].sets
    const plain = applyAddSet(fresh(), rk).entries[0].sets

    expect(warm).toHaveLength(before + 1)
    expect(warm[0].warmup).toBe(true)
    expect(plain[plain.length - 1].warmup).toBeUndefined()
    // 일반 세트 추가는 앞선 인덱스를 건드리지 않는다 — 그래서 커밋 선행이 필요 없다
    expect(plain.slice(0, before).map((x) => x.warmup)).toEqual(
      fresh().entries[0].sets.map((x) => x.warmup),
    )
  })
})
