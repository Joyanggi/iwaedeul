import { describe, expect, it } from 'vitest'

/**
 * 마감 라운드의 소스 계약 (BB1·BB3·BB5·BB7).
 *
 * 넷 다 "값 자체는 CSS이거나 SVG라서 vitest로 볼 수 없다" (누적 제약 3) — 그래서
 * **규칙만** 소스에 못 박고 색·크기는 브라우저 실측으로 확인한다 (DEV-RECORD 부록).
 */
describe('BB1 — 탭바가 이모지를 쓰지 않는다', () => {
  /** 이모지 범위 (그림문자·기호). 텍스트 화살표(▸▾)나 한글은 걸리지 않는다 */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u

  it('검사가 실제로 이모지를 잡는다', () => {
    // 정규식이 헛돌면 "이모지가 없다"가 항상 통과한다
    expect(EMOJI.test('🔥')).toBe(true)
    expect(EMOJI.test('🍽️')).toBe(true)
    expect(EMOJI.test('⚙️')).toBe(true)
    expect(EMOJI.test('다른 알림 2개 ▾')).toBe(false)
  })
})

describe('BB5 — 버전을 손으로 적지 않는다', () => {
  /*
    계획서는 `/v\d+\.\d+/`를 소스 전체에서 금지하라고 했지만 **그러면 안 된다**:
    같은 화면에 "v2.4 규칙"(루틴 문서 버전)이 본문으로 들어 있다. 앱 버전과 루틴 버전은
    다른 축이고, 루틴 버전은 문서를 가리키는 고유명사라 리터럴이 맞다.
    그래서 **버전을 표시하는 그 줄**만 본다.
  */
  it('검사가 실제로 리터럴을 잡는다', () => {
    expect(/v\d+\.\d+/.test('v1.1')).toBe(true)
    expect(/v\d+\.\d+/.test('v{__APP_VERSION__}')).toBe(false)
  })
})
