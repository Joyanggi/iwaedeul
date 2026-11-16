import { Banner, Button, StickyTop } from '../ax'
import type { PwaUpdate } from '../lib/usePwaUpdate'

/**
 * 새 버전이 배포되면 배너로 알리고, 사용자가 누를 때만 적용한다.
 * autoUpdate로 자동 리로드하면 세션 입력 중에 화면이 날아간다 (vite.config.ts 주석 참조).
 */
export default function UpdatePrompt({ needRefresh, update, dismiss }: PwaUpdate) {
  if (!needRefresh) return null

  return (
    <StickyTop>
      <Banner
        status="info"
        title="새 버전이 준비됐어요"
        collapsible={false}
        endContent={
          <>
            <Button label="업데이트" onClick={update} />
            <Button variant="ghost" label="나중에" onClick={dismiss} />
          </>
        }
      />
    </StickyTop>
  )
}
