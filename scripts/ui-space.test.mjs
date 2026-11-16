// scripts/lib/ui-space.mjs의 판정 — v1.20 RR12 (안쪽 대칭·같은 역할·가까움 순서). 브라우저 없이 Node에서 돈다.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { EXPECTED_PAIRS, insetSymmetryVerdict, nearnessVerdict, spaceRoleVerdicts } from './lib/ui-space.mjs'

const pair = (over = {}) => ({ kind: 'button', label: 'button.x', axes: 'tb', top: 8, bottom: 8, left: 12, right: 12, ...over })

describe('v120 RR12: 안쪽 대칭', () => {
  it('v120 RR12: 위·아래가 같으면 통과한다', () => {
    expect(insetSymmetryVerdict([pair()], ['button']).ok).toBe(true)
  })

  it('v120 RR12: 위 17·아래 14(사람이 짚은 선택 알약의 어긋남)는 실패한다 — 차이 3', () => {
    const r = insetSymmetryVerdict([pair({ kind: 'bar', label: 'nav.tabbar', top: 17, bottom: 14 })], ['bar'])
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('차이 3')
  })

  it('v120 RR12: 차이 1px 이하(반올림 오차)는 통과, 1.5px는 실패', () => {
    expect(insetSymmetryVerdict([pair({ top: 8, bottom: 9 })], []).ok).toBe(true)
    expect(insetSymmetryVerdict([pair({ top: 8, bottom: 9.5 })], []).ok).toBe(false)
  })

  it('v120 RR12: 방향이 lr인 쌍은 좌·우만, tb인 쌍은 위·아래만 잰다', () => {
    expect(insetSymmetryVerdict([pair({ axes: 'lr', top: 1, bottom: 30, left: 12, right: 12 })], []).ok).toBe(true)
    expect(insetSymmetryVerdict([pair({ axes: 'tb', left: 1, right: 30 })], []).ok).toBe(true)
    expect(insetSymmetryVerdict([pair({ axes: 'both', left: 1, right: 30 })], []).ok).toBe(false)
  })

  it('v120 RR12: 기대한 쌍 종류가 0개면 실패한다 — 선택자를 놓쳐 빈 통과하지 않게', () => {
    const r = insetSymmetryVerdict([], ['button'])
    expect(r.ok).toBe(false)
    expect(r.detail).toContain('쌍 없음: button')
    expect(insetSymmetryVerdict([pair({ kind: 'card' })], ['button']).ok).toBe(false)
  })

  it('v120 RR12: 기대가 없는 장면은 쌍이 0개여도 통과한다', () => {
    expect(insetSymmetryVerdict([], []).ok).toBe(true)
  })

  it('v120 RR12: EXPECTED_PAIRS는 Astryx인 장면의 버튼 쌍과 아래 탭 장면의 띠·선택 표시·탭 내용 쌍을 적는다 (RR3이 legacy 알약을 바꿨다)', () => {
    expect(EXPECTED_PAIRS.editor).toContain('button')
    expect(EXPECTED_PAIRS['line-sheet']).toContain('button')
    for (const scene of ['home-resume', 'home-safe', 'settings']) expect(EXPECTED_PAIRS[scene]).toEqual(['bar', 'tab-indicator', 'tab-content'])
    // RR4: 홈을 Astryx로 옮겨 홈 장면은 버튼·카드·뱃지 쌍도 기대한다
    for (const scene of ['home', 'home-375']) expect(EXPECTED_PAIRS[scene]).toEqual(['bar', 'tab-indicator', 'tab-content', 'button', 'card', 'badge'])
  })

  it('v120 RR12 속성: 위·아래(좌·우)가 같은 쌍은 어떤 값에서도 통과하고, 허용(1px)을 넘기면 실패한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 64 }), fc.integer({ min: 0, max: 64 }), (a, b) => {
        expect(insetSymmetryVerdict([pair({ axes: 'both', top: a, bottom: a, left: b, right: b })], ['button']).ok).toBe(true)
        expect(insetSymmetryVerdict([pair({ top: a, bottom: a + 2 })], []).ok).toBe(false)
      }),
    )
  })
})

describe('v120 RR12: 같은 역할', () => {
  const same = { home: { screenX: 16, cardGaps: [12], sectionGaps: [], cardInset: 16, rowMax: null, sheetInset: null }, editor: { screenX: 16, cardGaps: [12], sectionGaps: [], cardInset: 16, rowMax: null, sheetInset: null } }
  const sheets = { 'sheet-home': { sheetInset: 16, cardGaps: [], sectionGaps: [] }, 'line-sheet': { sheetInset: 16, cardGaps: [], sectionGaps: [] } }
  const byName = (rs) => Object.fromEntries(rs.map((r) => [r.name, r]))

  it('v120 RR12: 화면 좌우·카드 사이·시트 좌우는 지금의 여백 한 벌과 같은 결론이다', () => {
    const r = byName(spaceRoleVerdicts({ ...same, ...sheets }))
    expect([r['화면 좌우'].ok, r['카드 사이'].ok, r['시트 좌우'].ok]).toEqual([true, true, true])
    const bad = byName(spaceRoleVerdicts({ ...same, home: { ...same.home, screenX: 20, cardGaps: [12, 16] }, ...sheets }))
    expect([bad['화면 좌우'].ok, bad['카드 사이'].ok]).toEqual([false, false])
  })

  it('v120 RR12: 판정을 안 켠 역할(묶음 사이·카드 안쪽·가까움 순서)은 값만 찍고 실패로 세지 않는다', () => {
    const r = byName(spaceRoleVerdicts({ ...same, ...sheets }))
    for (const n of ['묶음 사이', '카드 안쪽', '가까움 순서']) expect([n, r[n].record, r[n].ok]).toEqual([n, true, true])
  })

  it('v120 RR12: 판정을 켠 역할은 잰 장면이 2개 미만이면 실패하고, 값이 갈리면 실패한다', () => {
    const one = { home: { ...same.home, sectionGaps: [20] } }
    expect(byName(spaceRoleVerdicts(one, new Set(['묶음 사이'])))['묶음 사이'].ok).toBe(false)
    const two = { home: { ...same.home, sectionGaps: [20] }, summary: { ...same.home, sectionGaps: [20] } }
    expect(byName(spaceRoleVerdicts(two, new Set(['묶음 사이'])))['묶음 사이'].ok).toBe(true)
    const split = { home: { ...same.home, sectionGaps: [20] }, summary: { ...same.home, sectionGaps: [24] } }
    expect(byName(spaceRoleVerdicts(split, new Set(['묶음 사이'])))['묶음 사이'].ok).toBe(false)
    const insets = { home: same.home, editor: { ...same.editor, cardInset: 12 } }
    expect(byName(spaceRoleVerdicts(insets, new Set(['카드 안쪽'])))['카드 안쪽'].ok).toBe(false)
  })

  it('v120 RR12: 가까움 순서 — 줄 사이 ≤ 카드 사이 < 묶음 사이가 깨지면 실패한다', () => {
    expect(nearnessVerdict({ rowMax: 8, cardGap: 12, sectionGap: 20 }).ok).toBe(true)
    expect(nearnessVerdict({ rowMax: 12, cardGap: 12, sectionGap: 20 }).ok).toBe(true)
    expect(nearnessVerdict({ rowMax: 16, cardGap: 12, sectionGap: 20 }).ok).toBe(false)
    expect(nearnessVerdict({ rowMax: 8, cardGap: 20, sectionGap: 20 }).ok).toBe(false)
    expect(nearnessVerdict({ rowMax: 8, cardGap: 12, sectionGap: null }).skip).toBe(true)
  })

  it('v120 RR12 속성: 줄 ≤ 카드 < 묶음인 어떤 값 셋도 통과하고, 묶음이 카드보다 좁거나 같으면 실패한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), fc.integer({ min: 0, max: 40 }), fc.integer({ min: 1, max: 40 }), (row, extra, more) => {
        const card = row + extra
        expect(nearnessVerdict({ rowMax: row, cardGap: card, sectionGap: card + more }).ok).toBe(true)
        expect(nearnessVerdict({ rowMax: row, cardGap: card, sectionGap: card }).ok).toBe(false)
      }),
    )
  })
})
