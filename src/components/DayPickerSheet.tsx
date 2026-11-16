import type { RoutineDay, RoutineTemplate } from '../types'
import { lastDoneText } from '../lib/dayGap'
import { dayTotalSets } from '../lib/useRoutine'
import { Badge, Button, Heading, HStack, List, ListItem, Sheet, Text, VStack } from '../ax'

/**
 * Day 선택 바텀시트 (DESIGN.md §4).
 * "홈 화면에서 제안 Day를 크게 표시하되, 탭하면 모든 Day + 하한 모드 선택 시트가 열림
 *  (요구사항: 잘못된 경우 변경 가능)"
 *
 * **시트는 선택만 바꾸고, 시작은 항상 시작 버튼이다** (AA1). 예전에는 행을 탭하는 순간
 * 세션이 만들어졌다 — 제안 Day는 2단(카드 → 시작)인데 다른 Day는 1단이어서 둘러보기가
 * 불가능했고, 잘못 탭하면 세션을 버리거나 강제 마감해야 했다.
 */
export default function DayPickerSheet({
  routine,
  suggestedDayId,
  /** 지금 직접 고른 Day (없으면 제안이 기준) — 무엇이 선택돼 있는지 시트가 말해야 한다 */
  pickedDayId,
  lastDone,
  onPick,
  onClose,
}: {
  routine: RoutineTemplate
  suggestedDayId?: string
  pickedDayId?: string | null
  /** 정규 Day id → 마지막 근력 수행 후 경과일 (KK3). 하한 모드 행에는 쓰지 않는다 */
  lastDone?: Map<string, number | null>
  onPick: (day: RoutineDay) => void
  onClose: () => void
}) {
  const renderDay = (day: RoutineDay) => (
    <ListItem
      key={day.id}
      label={
        <HStack gap={2} align="center" wrap="wrap">
          <span>{day.name}</span>
          {day.id === suggestedDayId && <Badge variant="info" label="제안" />}
          {day.id === pickedDayId && day.id !== suggestedDayId && <Badge variant="neutral" label="선택" />}
          {day.isBuffer && <Badge variant="warning" label="완충" />}
        </HStack>
      }
      description={
        // 부제와 "마지막 수행" 글이 한 줄에 안 들어가면 줄을 바꾼다(말줄임표로 잘리면 며칠 전인지가 안 보인다)
        <Text color="secondary" textWrap="wrap">
          {lastDone && lastDone.has(day.id)
            ? `${day.subtitle} · ${lastDoneText(lastDone.get(day.id) ?? null)}`
            : day.subtitle}
        </Text>
      }
      endContent={
        <Text color="secondary">
          {day.exercises.length}종목 · {dayTotalSets(day)}세트
        </Text>
      }
      onClick={() => onPick(day)}
    />
  )

  return (
    <Sheet label="Day 선택" purpose="info" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <VStack gap={2}>
            <Heading level={2}>오늘 할 운동</Heading>
            <Text color="secondary">고르면 홈 카드가 바뀝니다. 시작은 시작 버튼으로.</Text>
            <List>{routine.days.map(renderDay)}</List>
          </VStack>

          {routine.fallbackDays.length > 0 && (
            <VStack gap={2}>
              <Heading level={2}>하한 모드 · 30분</Heading>
              <Text color="secondary">
                시간이 없거나 컨디션이 나쁜 날. 기록은 정규 Day 라인에 이어서 남습니다.
              </Text>
              <List>{routine.fallbackDays.map(renderDay)}</List>
            </VStack>
          )}

          <Button variant="secondary" width="100%" label="닫기" onClick={dismiss} />
        </VStack>
      )}
    </Sheet>
  )
}
