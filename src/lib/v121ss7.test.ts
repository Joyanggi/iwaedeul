// PLAN v1.21 SS7 — 온보딩. 소스 스캔: 주석을 뺀 뒤 글자로 읽고, onClick의 `=>`·`>`에서 끊기는 태그 정규식을 쓰지 않는다.
// CSS·검사 도구는 `scripts/ss7.test.mjs`가 fs로 읽는다.
import { describe, expect, it } from 'vitest'
import onboardingScreen from '../screens/Onboarding.tsx?raw'

const code = onboardingScreen.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('v121 SS7 — 온보딩은 Astryx 부품뿐이다', () => {
  it('v121 SS7: className=은 ax-onboarding뿐이고 style=·<button·var(--·<ol·<li·<div 0건이다', () => {
    const classes = [...code.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])
    // ax-nowrap은 주소 조각이 하이픈 뒤에서 꺾이지 않게 하는 이름이다('/' 뒤에서만 꺾는다)
    expect(classes).toEqual(['"ax-onboarding"', '"ax-nowrap"'])
    for (const bad of ['style=', '<button', 'var(--', '<ol', '<li', '<div', '<p ', '<p>', '<h1']) expect(code, bad).not.toContain(bad)
  })

  it('v121 SS7: 틀은 AxRoot + Groups className="ax-onboarding"이고 화면은 @astryxdesign를 직접 import하지 않는다', () => {
    expect(code).toContain('<AxRoot>')
    expect(code).toContain('<Groups className="ax-onboarding">')
    expect(code).not.toContain('@astryxdesign')
  })

  it('v121 SS7: 준비 완료는 Banner success, 7일 삭제 경고는 Banner warning(둘 다 collapsible={false})이다', () => {
    expect(code).toMatch(/<Banner\s+status="success"\s+title="준비 완료"/)
    expect(code).toMatch(/<Banner\s+status="warning"\s+title="Safari 탭으로 쓰면 기록이 사라질 수 있습니다\."/)
    expect(code.match(/collapsible=\{false\}/g)?.length).toBe(2)
  })

  it('v121 SS7: 1단계는 Heading 2 + List listStyle="decimal"의 ListItem 셋이고 굵은 글자 넷이 그대로다', () => {
    expect(code).toContain('<Heading level={2}>1단계 — 홈 화면에 추가</Heading>')
    expect(code).toContain('<List listStyle="decimal">')
    expect(code.match(/<ListItem\b/g)?.length).toBe(3)
    for (const b of ['<strong>공유 버튼</strong>', '<strong>“홈 화면에 추가”</strong>', '<strong>추가</strong>', '<strong>운동기록</strong>']) expect(code, b).toContain(b)
  })

  it('v121 SS7: 시작 버튼은 primary lg 100% 폭 Button이고 한 번 누르면 setOnboardingDone(true)다(확인 단계 없음)', () => {
    expect(code).toMatch(/<Button\s+variant="primary"\s+size="lg"\s+width="100%"/)
    expect(code).toContain("label={standalone ? '시작하기' : '확인했어요, 그래도 계속'}")
    expect(code).toContain('onClick={() => void setOnboardingDone(true)}')
  })

  it('v121 SS7: 주소는 Card 안 Text label 제목 + Text supporting display="block"(코드 글꼴은 글자 상자가 줄 높이보다 작아 카드 안쪽 아래가 위보다 2px 헐거워 supporting으로 — DEV-RECORD)이고 iOS가 아닐 때 안내도 Text supporting이다', () => {
    expect(code).toMatch(/<Card>\s*<Text type="label" display="block">주소<\/Text>\s*<Text type="supporting" color="secondary" display="block">\s*\{window\.location\.href\.split\('\/'\)/)
    expect(code).toContain('<wbr />')
    expect(code).not.toContain('type="code"')
    expect(code).toMatch(/\{!ios && \(\s*<Text type="supporting" color="secondary">/)
  })

  it('v121 SS7: 문구가 그대로다 — 제목·소개·단계 셋·경고·주소·버튼 둘·안내', () => {
    for (const t of ['운동 기록', '피지크형 상체 루틴 v2.4 전용. 세트별 반복수 · 감각 점수 · 보상작용 · 수행 순서를', '헬스장에서 바로 입력합니다.', '준비 완료', '홈 화면 앱으로 실행 중입니다. 기록이 안전하게 보관됩니다.',
      'Safari 하단의 ', '(□↑)을 누릅니다.', '메뉴에서 ', '를 선택합니다.', '를 누르고, 홈 화면의 ', ' 아이콘으로', '다시 엽니다.',
      'iOS는 7일간 열지 않은 사이트의 저장 데이터를 자동 삭제합니다. 홈 화면 앱은 이 삭제 대상에서 제외됩니다.', 'iOS가 아닌 환경입니다. 브라우저 메뉴의 “앱 설치”를 사용하세요.', '주소',
      '시작하기', '확인했어요, 그래도 계속', '홈 화면에 추가하기 전까지 상단에 경고가 계속 표시됩니다.']) {
      expect(code, t).toContain(t)
    }
  })
})
