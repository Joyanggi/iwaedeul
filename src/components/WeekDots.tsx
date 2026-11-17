import { weekdayKo } from '../lib/dates'
import type { WeekDot } from '../lib/dashboard'
import { Card, HStack, Text, VStack } from '../ax'

/**
 * 이번 주 월~일 도트 (DESIGN.md §5.1).
 * 완료 = 불꽃, 오늘 = 링. 같은 날 두 세션이면 ×2를 붙인다 (§4에서 허용).
 *
 * **도트는 "헬스장에 간 날"이다** (X3) — 유산소만 한 날도 불꽃이 켜진다.
 * 반면 디로드·Phase 카운터는 근력 세션만 센다. 두 숫자가 갈릴 때만 그 사실을
 * 한 줄로 알린다 — 항상 적으면 잡음이고, 안 적으면 다른 숫자가 버그로 보인다.
 */
export default function WeekDots({
  dots,
  target,
  strengthCount,
}: {
  dots: WeekDot[]
  target: number
  /** 근력 세션 수 (도트 합계와 다를 수 있다) */
  strengthCount: number
}) {
  const total = dots.reduce((n, d) => n + d.count, 0)

  return (
    <Card elevation="low">
      <VStack gap={3}>
        <HStack justify="between" align="center">
          <Text type="supporting" color="secondary">
            이번 주
          </Text>
          <Text weight="bold" hasTabularNumbers>
            {total}/{target}회
          </Text>
        </HStack>
        {total !== strengthCount && (
          <Text type="supporting" color="secondary">
            유산소만 한 날도 불꽃으로 표시합니다 — 디로드·Phase 카운터는 근력 {strengthCount}회로 셉니다.
          </Text>
        )}
        <div className="ax-week-dots">
          {dots.map((dot) => (
            <div key={dot.date} className="ax-week-day">
              <div
                className="ax-week-dot"
                data-state={dot.isToday ? 'today' : dot.count > 0 ? 'done' : dot.isFuture ? 'future' : 'empty'}
              >
                {dot.count > 0 ? '🔥' : ''}
                {dot.count > 1 && <span className="ax-week-multi">×{dot.count}</span>}
              </div>
              <Text type="supporting" color="secondary">
                {weekdayKo(dot.date)}
              </Text>
            </div>
          ))}
        </div>
      </VStack>
    </Card>
  )
}
