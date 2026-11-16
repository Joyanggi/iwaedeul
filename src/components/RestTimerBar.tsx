import { Bar, Button, Heading, HStack, ProgressBar, Text, VStack } from '../ax'
import { mmss } from '../lib/dates'
import type { RestTimer } from '../lib/useRestTimer'

/**
 * 하단 고정 휴식 타이머 바 (DESIGN.md §5.2).
 * +30초 / 건너뛰기. 종료 시 색이 바뀌고 차임이 울린다.
 *
 * **종료 후에는 확인 버튼이 없다 (W4).** 바가 스스로 사라지고(`AUTO_DISMISS_MS`),
 * 기다리기 싫으면 바를 탭해서 즉시 닫는다 — 다음 세트로 넘어가려고 확인을 누르는
 * 동작이 매 세트 반복되는 것이 실사용 피드백이었다.
 * 닫기 영역은 내용 **뒤에 깔린 버튼**이다 (버튼 안에 버튼을 넣을 수 없으므로 — Astryx에
 * "띠 전체가 버튼"인 부품이 없어 직접 짓는다. 모양은 `parts.css`의 `.ax-bar-dismiss`).
 */
export default function RestTimerBar({ timer }: { timer: RestTimer }) {
  if (!timer.running && !timer.finished) return null

  return (
    <Bar position="bottom" role="timer" aria-live="off">
      {timer.finished && (
        <button className="ax-bar-dismiss" onClick={timer.dismiss} aria-label="휴식 완료 — 닫기" />
      )}
      <ProgressBar
        label="휴식 진행"
        isLabelHidden
        value={timer.totalSec - timer.remainingSec}
        max={Math.max(1, timer.totalSec)}
        variant={timer.finished ? 'success' : 'accent'}
      />
      <HStack justify="between" align="center" gap={2}>
        <VStack>
          <Heading level={2}>{timer.finished ? '휴식 완료' : mmss(timer.remainingSec)}</Heading>
          <Text type="supporting" color="secondary" maxLines={1}>
            {timer.finished ? `${timer.label} · 탭하면 닫기` : timer.label}
          </Text>
        </VStack>
        <HStack gap={2} align="center">
          {/*
            −30초 (CC6). 진행 중에만 보여준다 — 이미 끝난 타이머에서 뺄 시간이 없다.
            남은 시간이 30초 미만이면 0이 되어 **정상 종료 플로우**(차임 + 자동 닫힘)를 탄다:
            건너뛰기와 같은 결과이고 "휴식을 지금 끝낸다"라는 뜻이 같다.
          */}
          {!timer.finished && (
            <Button variant="secondary" label="−30초" onClick={() => timer.addSeconds(-30)} />
          )}
          <Button variant="secondary" label="+30초" onClick={() => timer.addSeconds(30)} />
          {!timer.finished && <Button variant="primary" label="건너뛰기" onClick={timer.dismiss} />}
        </HStack>
      </HStack>
    </Bar>
  )
}
