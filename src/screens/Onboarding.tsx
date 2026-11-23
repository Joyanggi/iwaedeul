import { Fragment } from 'react'
import { isIOS, isStandalone } from '../lib/platform'
import { useSettings } from '../store/settings'
import { AxRoot, Banner, Button, Card, Group, Groups, Heading, List, ListItem, Text } from '../ax'

/**
 * §2 요구사항: 첫 실행에 "홈 화면에 추가" 안내 필수.
 * Safari 탭으로만 쓰면 7일 미사용 시 ITP로 IndexedDB가 지워질 수 있다 (§11).
 */
export default function Onboarding() {
  const setOnboardingDone = useSettings((s) => s.setOnboardingDone)
  const standalone = isStandalone()
  const ios = isIOS()

  return (
    <AxRoot>
      <Groups>
        <Group>
          <Heading level={1}>운동 기록</Heading>
          <Text type="large" color="secondary">
            피지크형 상체 루틴 v2.4 전용. 세트별 반복수 · 감각 점수 · 보상작용 · 수행 순서를
            헬스장에서 바로 입력합니다.
          </Text>
        </Group>

        {standalone ? (
          <Group>
            <Banner
              status="success"
              title="준비 완료"
              description="홈 화면 앱으로 실행 중입니다. 기록이 안전하게 보관됩니다."
              collapsible={false}
            />
          </Group>
        ) : (
          <>
            <Group>
              <Heading level={2}>1단계 — 홈 화면에 추가</Heading>
              <List listStyle="decimal">
                <ListItem
                  label={
                    <>
                      Safari 하단의 <strong>공유 버튼</strong>(□↑)을 누릅니다.
                    </>
                  }
                />
                <ListItem
                  label={
                    <>
                      메뉴에서 <strong>“홈 화면에 추가”</strong>를 선택합니다.
                    </>
                  }
                />
                <ListItem
                  label={
                    <>
                      <strong>추가</strong>를 누르고, 홈 화면의 <strong>운동기록</strong> 아이콘으로
                      다시 엽니다.
                    </>
                  }
                />
              </List>
            </Group>

            <Group>
              <Banner
                status="warning"
                title="Safari 탭으로 쓰면 기록이 사라질 수 있습니다."
                description="iOS는 7일간 열지 않은 사이트의 저장 데이터를 자동 삭제합니다. 홈 화면 앱은 이 삭제 대상에서 제외됩니다."
                collapsible={false}
              />
              {!ios && (
                <Text type="supporting" color="secondary">
                  iOS가 아닌 환경입니다. 브라우저 메뉴의 “앱 설치”를 사용하세요.
                </Text>
              )}
            </Group>

            <Group>
              <Card>
                <Text type="label" display="block">주소</Text>
                <Text type="supporting" color="secondary" display="block">
                  {window.location.href.split('/').map((part, i, all) => (
                    // 주소는 '/' 뒤에서만 줄을 바꾼다(글자 중간·하이픈 뒤 꺾임 없음)
                    <Fragment key={i}>
                      <span className="ax-address-part">{part}</span>
                      {i < all.length - 1 && <>/<wbr /></>}
                    </Fragment>
                  ))}
                </Text>
              </Card>
            </Group>
          </>
        )}

        <Group>
          <Button
            variant="primary"
            size="lg"
            width="100%"
            label={standalone ? '시작하기' : '확인했어요, 그래도 계속'}
            onClick={() => void setOnboardingDone(true)}
          />
          {!standalone && (
            <Text type="supporting" color="secondary" justify="center">
              홈 화면에 추가하기 전까지 상단에 경고가 계속 표시됩니다.
            </Text>
          )}
        </Group>
      </Groups>
    </AxRoot>
  )
}
