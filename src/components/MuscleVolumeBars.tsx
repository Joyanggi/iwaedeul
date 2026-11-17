import type { MuscleBar } from '../lib/dashboard'
import { Badge, Card, ProgressBar, Text, VStack } from '../ax'

/**
 * 주간 부위별 볼륨 대시보드 (DESIGN.md §5.1).
 * §4 볼륨 예산의 가시화 — 왜 그 Day가 제안됐는지를 숫자로 보여준다.
 *
 * **목표 초과를 문제로 표시하지 않는다** (§5.1: 용량-반응 유효 범위 내).
 * 바는 100%에서 멈추고, 숫자만 초과분을 보여준다.
 */
export default function MuscleVolumeBars({
  bars,
  sessionCount,
  minSessionsToJudge,
}: {
  bars: MuscleBar[]
  sessionCount: number
  minSessionsToJudge: number
}) {
  return (
    <Card elevation="low">
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          주간 부위별 볼륨
        </Text>
        <div className="ax-vol-rows">
          {bars.map((bar) => {
            const met = bar.performed >= bar.target
            return (
              <div className="ax-vol-row" key={bar.muscle}>
                <Text>{bar.muscle}</Text>
                <ProgressBar
                  label={`${bar.muscle} 주간 볼륨`}
                  isLabelHidden
                  value={Math.min(bar.performed, bar.target)}
                  max={bar.target}
                  variant={met ? 'success' : 'accent'}
                />
                <Text type="supporting" color="secondary" hasTabularNumbers>
                  {bar.performed}/{bar.target}
                </Text>
                <span title={`기대 ${bar.expectedExposures}회 / 실제 ${bar.exposures}회`}>
                  <Badge variant={bar.underFrequency ? 'warning' : 'neutral'} label={`${bar.exposures}x`} />
                </span>
              </div>
            )
          })}
        </div>
        <Text type="supporting" color="secondary">
          {sessionCount < minSessionsToJudge
            ? `이번 주 ${sessionCount}회 — ${minSessionsToJudge}회부터 빈도 미달을 표시합니다`
            : '노란 뱃지 = 주 2회 노출이 기대되는데 아직 1회 이하'}
        </Text>
      </VStack>
    </Card>
  )
}
