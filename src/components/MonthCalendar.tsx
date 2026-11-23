import { monthLabel, parseDateStr, todayLocal } from '../lib/dates'
import type { Adherence } from '../lib/diet'
import type { CalendarCell } from '../lib/history'
import { Button, Card, Heading, HStack, Icon, Text, VStack } from '../ax'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

type DietDot = Adherence | 'partial' | null

const DIET_NAME: Record<Exclude<DietDot, null>, string> = {
  good: '준수',
  mid: '일부',
  poor: '미달',
  unlogged: '판정 전',
  partial: '판정 전',
}

/**
 * 칸의 접근성 이름. 보이는 숫자가 이름의 맨 앞이다(`label-content-name-mismatch`) — 보이는 글자는 `17🔥2` 꼴이라
 * 화면 낭독이 "17 불꽃 2"가 아니라 "17일 운동 2회 식단 준수"로 읽게 한다. 이름을 만드는 곳은 이 함수 하나다.
 */
export function cellLabel(dayNum: number, sessionCount: number, dietDot: DietDot): string {
  return [
    `${dayNum}일`,
    sessionCount > 0 ? `운동 ${sessionCount}회` : '',
    dietDot ? `식단 ${DIET_NAME[dietDot]}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * 월 달력 (DESIGN.md §5.3). 세션 있는 날 불꽃, 탭하면 상세.
 * 주 시작은 월요일 — 주간 집계(§7)와 같은 기준이어야 도트/카운트가 일관된다.
 *
 * 식단은 **점**으로 겹쳐 보여준다 (D3). 전용 달력을 만들지 않는 이유:
 * "그날 운동과 식단이 어땠나"를 한 화면에서 봐야 상관을 읽을 수 있다.
 * 미기록은 점을 그리지 않는다 — 점이 없는 것과 빨간 점은 다른 정보다.
 * Astryx `Calendar`는 칸에 내용을 못 넣어서 칸 격자만 직접 짓는다(칸은 `Button`이다).
 */
export default function MonthCalendar({
  cells,
  month,
  onPrev,
  onNext,
  onPickDate,
  selectedDate,
  adherenceByDate,
  dietPartialDates,
}: {
  cells: CalendarCell[]
  month: string
  onPrev: () => void
  onNext: () => void
  onPickDate: (date: string) => void
  selectedDate: string | null
  /** 날짜 → 식단 준수 등급 (D3). 없으면 점을 그리지 않는다 */
  adherenceByDate?: Map<string, Adherence>
  /** 기록은 있으나 판정 보류인 날 (X2) — 회색 점 */
  dietPartialDates?: Set<string>
}) {
  const today = todayLocal()

  return (
    <Card>
      <VStack gap={3}>
        <HStack justify="between" align="center">
          <Button variant="ghost" isIconOnly icon={<Icon icon="chevronLeft" />} label="이전 달" onClick={onPrev} />
          <Heading level={2}>{monthLabel(month)}</Heading>
          <Button variant="ghost" isIconOnly icon={<Icon icon="chevronRight" />} label="다음 달" onClick={onNext} />
        </HStack>

        <div className="ax-cal-grid">
          {WEEKDAYS.map((w) => (
            <Text key={w} type="supporting" color="secondary">
              {w}
            </Text>
          ))}
        </div>

        <div className="ax-cal-grid">
          {cells.map((cell) => {
            const hasSession = cell.sessions.length > 0
            const dayNum = parseDateStr(cell.date).getDate()
            const diet = adherenceByDate?.get(cell.date)
            const hasDiet = diet !== undefined && diet !== 'unlogged'
            // 판정 전이라도 기록이 있으면 표시한다 — "기록이 사라졌다"고 보이지 않게 (X2)
            const dietPartial = !hasDiet && dietPartialDates?.has(cell.date) === true
            /*
              식단 표시는 **점**이다 (테두리가 아니다).
              테두리로 두었더니 오늘 칸의 강조 테두리와 색·굵기가 거의 같아서 "오늘/선택"인지 "식단"인지 구분이 안 됐다.
              이제 역할을 분리한다: 테두리·배경 = 오늘·선택 (내비게이션 상태) / 🔥 = 운동 / 점 = 식단.
              점 색은 강조색을 쓰지 않는다 (그 색이 내비게이션 색이다).
            */
            const dietDot = hasDiet ? diet : dietPartial ? 'partial' : null
            return (
              <Button
                key={cell.date}
                variant="ghost"
                className="ax-cal-cell"
                width="100%"
                label={cellLabel(dayNum, cell.sessions.length, dietDot)}
                onClick={() => onPickDate(cell.date)}
                // 식단만 있는 날도 열려야 한다 (기록 보정 경로, D3)
                isDisabled={!hasSession && !hasDiet && !cell.inMonth}
                data-out={cell.inMonth ? undefined : ''}
                data-today={cell.date === today ? '' : undefined}
                data-selected={cell.date === selectedDate ? '' : undefined}
              >
                {/* 보이는 글자가 "17일"인 이유: 이름이 "17일 …"이라 숫자만 보이면 axe(label-content-name-mismatch)가 낱말 "17일"과 "17"을 다르다고 센다 */}
                <span className="ax-cal-num">{dayNum}일</span>
                {/* 🔥과 세션 수는 글자가 아니라 CSS 내용(::before·::after)이다 — 보이는 글자가 "17일"뿐이어야 이름("17일 운동 2회 …")과 맞는다(axe label-content-name-mismatch) */}
                {hasSession && <span className="ax-cal-flame" data-sessions={cell.sessions.length} aria-hidden="true" />}
                <span className="ax-cal-dot" data-diet={dietDot ?? undefined} aria-hidden="true" />
              </Button>
            )
          })}
        </div>
      </VStack>
    </Card>
  )
}
