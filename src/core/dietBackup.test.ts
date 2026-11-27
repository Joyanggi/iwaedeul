import { describe, expect, it } from 'vitest'
import { fingerprintPayload } from './backup'

/**
 * X7 — 식단만 기록한 날도 백업에 올라간다.
 *
 * v1.3까지 `requestSync` 호출처가 **세션 종료 한 곳뿐**이었다. 식단만 기록한 날은
 * 다음 세션을 마쳐야 같이 올라갔고, 실제로 gist 마지막 갱신이 이틀 전이었다.
 *
 * 여기서 지키는 것은 두 가지다:
 * ① 쓰기 chokepoint에서 백업을 예약한다 (화면마다 부르면 새 화면에서 빠뜨린다)
 * ② 연타가 업로드 폭주가 되지 않는다 (debounce가 흡수한다)
 */

/**
 * Y4 — 같은 내용을 다시 올리지 않는다 (리뷰 승인).
 *
 * X7이 식단 쓰기마다 동기화를 예약하면서 업로드 빈도가 크게 올랐다. 매 업로드가 전체
 * 백업(수십 KB)이므로 같은 내용 재업로드는 순수한 낭비다.
 *
 * **함정이 하나 있었다**: 백업 파일 전체를 해시하면 영원히 달라진다 — `exportedAt`이 매
 * 호출마다 바뀌고 `settings`에 업로드마다 갱신되는 부기 키가 들어 있다. 그것들을 빼야
 * "사용자 데이터가 바뀌었는가"를 물을 수 있다.
 */
describe('Y4 — 백업 지문', () => {
  const row = (key: string, value: unknown) => ({ key, value })
  const base = () => ({
    app: 'workout-tracker',
    schemaVersion: 3,
    exportedAt: '2026-08-08T10:00:00.000Z',
    routines: [],
    exercises: [],
    sessions: [],
    settings: [row('currentPhase', 0), row('gistId', 'abc'), row('lastBackupAt', '2026-08-08T09:00:00.000Z')],
    exerciseNotes: [],
    dietPlans: [],
    dietDays: [],
  })

  it('내보낸 시각이 달라도 지문은 같다', () => {
    const a = fingerprintPayload(base() as never)
    const b = fingerprintPayload({ ...base(), exportedAt: '2026-08-09T23:59:00.000Z' } as never)
    expect(a).toBe(b)
  })

  it('동기화 부기 키가 달라도 지문은 같다 (업로드마다 바뀌는 값들)', () => {
    const changed = {
      ...base(),
      settings: [
        row('currentPhase', 0),
        row('gistId', 'zzz'),
        row('lastBackupAt', '2026-08-09T09:00:00.000Z'),
        row('lastBackupHash', 'deadbeef'),
      ],
    }
    expect(fingerprintPayload(changed as never)).toBe(fingerprintPayload(base() as never))
  })

  it('사용자 데이터가 바뀌면 지문이 달라진다', () => {
    const withDiet = { ...base(), dietDays: [{ date: '2026-08-08', planId: 'cut-1800', isTrainingDay: false, slots: {} }] }
    expect(fingerprintPayload(withDiet as never)).not.toBe(fingerprintPayload(base() as never))
  })

  it('실제 설정이 바뀌면 지문이 달라진다 (부기 키만 무시한다)', () => {
    const phase = { ...base(), settings: [row('currentPhase', 2), row('gistId', 'abc'), row('lastBackupAt', '2026-08-08T09:00:00.000Z')] }
    expect(fingerprintPayload(phase as never)).not.toBe(fingerprintPayload(base() as never))
  })

  it('설정 순서가 흔들려도 지문은 같다 (불필요한 업로드 방지)', () => {
    const reordered = { ...base(), settings: [...base().settings].reverse() }
    expect(fingerprintPayload(reordered as never)).toBe(fingerprintPayload(base() as never))
  })
})
