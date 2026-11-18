import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import MonthCalendar from '../components/MonthCalendar'
import { db } from '../db'
import { addMonths, monthStart, todayLocal, weekdayKo } from '../lib/dates'
import DietDayEditor from '../components/DietDayEditor'
import { MIN_SLOTS_FOR_VERDICT, dietMonthStats } from '../lib/diet'
import { useDiet } from '../lib/useDiet'
import { cardioText } from '../lib/cardio'
import { strengthDates } from '../lib/derive'
import { calendarCells, sessionsInMonth, summarize } from '../lib/history'
import { isInverseKey } from '../lib/weightScale'
import type { RoutineBundle } from '../lib/useRoutine'
import { AxRoot, Badge, Button, ClickableCard, Group, Groups, Heading, HStack, Row, Rows, SegmentedControl, SegmentedControlItem, Text, VStack } from '../ax'
import ExerciseHistoryScreen from './ExerciseHistoryScreen'
import SessionDetailScreen from './SessionDetailScreen'

type Mode = 'calendar' | 'byExercise'

/** 기록 탭 (DESIGN.md §5.3) */
export default function HistoryScreen({ bundle }: { bundle: RoutineBundle }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [month, setMonth] = useState(() => monthStart(todayLocal()))
  const [mode, setMode] = useState<Mode>('calendar')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const cells = useMemo(() => calendarCells(sessions, month), [sessions, month])
  const monthSessions = useMemo(() => sessionsInMonth(sessions, month), [sessions, month])
  const diet = useDiet()
  const dietStats = useMemo(
    () => dietMonthStats(diet.days, diet.plans, month),
    [diet.days, diet.plans, month],
  )

  if (detailId) {
    return (
      <SessionDetailScreen
        bundle={bundle}
        sessionId={detailId}
        onBack={() => setDetailId(null)}
      />
    )
  }

  /**
   * 날짜를 고르면 **항상 달력 아래에 펼친다** (상세로 넘어가지 않는다).
   *
   * 예전에는 세션이 하나뿐인 날만 곧바로 상세로 들어갔다. 그래서 "식단만 기록한 날은
   * 달력 아래에 바로 보이는데 운동까지 기록하면 페이지가 넘어가고, 보고 나서 또 뒤로
   * 나와야 한다"는 마찰이 생겼다 — 같은 탭 안에서 날짜를 훑는 동작이 세션 유무에 따라
   * 갈렸다. 이제 세션 0개·1개·여러 개가 모두 같게 동작하고, 상세는 **세션 행을 눌러**
   * 명시적으로 들어간다.
   */
  const pickDate = (date: string) => {
    const cell = cells.find((c) => c.date === date)
    setSelectedDate(cell?.inMonth ? date : null)
  }

  const listed = selectedDate
    ? monthSessions.filter((s) => s.date === selectedDate)
    : monthSessions

  return (
    <AxRoot>
      <Groups className="ax-history">
        <Group>
          <Heading level={1}>기록</Heading>
          <SegmentedControl label="보기" value={mode} onChange={(v) => setMode(v as Mode)}>
            <SegmentedControlItem value="calendar" label="달력" />
            <SegmentedControlItem value="byExercise" label="종목별" />
          </SegmentedControl>
        </Group>

        {mode === 'byExercise' ? (
          <ExerciseHistoryScreen bundle={bundle} sessions={sessions} onOpenSession={setDetailId} />
        ) : (
          <>
            <Group>
              <MonthCalendar
                cells={cells}
                month={month}
                onPrev={() => {
                  setMonth(addMonths(month, -1))
                  setSelectedDate(null)
                }}
                onNext={() => {
                  setMonth(addMonths(month, 1))
                  setSelectedDate(null)
                }}
                onPickDate={pickDate}
                selectedDate={selectedDate}
                adherenceByDate={dietStats.byDate}
                dietPartialDates={dietStats.partialDates}
              />
              {(dietStats.logged > 0 || dietStats.partialDates.size > 0) && (
                <Text type="supporting" color="secondary">
                  {/*
                    범례는 **점**을 설명한다 (테두리가 아니다 — 테두리는 오늘 표시다).
                    색만 다르고 설명이 없으면 "왜 이 날은 회색인가"가 된다.
                  */}
                  {dietStats.logged > 0 &&
                    `식단 준수 ${dietStats.good}/${dietStats.logged}일 (기록한 날 기준) · 날짜 아래 점이 그날 준수입니다 (초록·노랑·빨강)`}
                  {dietStats.partialDates.size > 0 &&
                    `${dietStats.logged > 0 ? ' · ' : ''}회색 점 = 기록 있음 / 판정 전 (${MIN_SLOTS_FOR_VERDICT}슬롯부터 판정)`}
                </Text>
              )}
            </Group>

            <Group>
              <HStack justify="between" align="center">
                <Text weight="semibold">
                  {selectedDate ? `${selectedDate} (${weekdayKo(selectedDate)})` : '이 달의 세션'}
                </Text>
                {selectedDate ? (
                  <Button variant="ghost" size="sm" label="전체 보기" onClick={() => setSelectedDate(null)} />
                ) : (
                  <Text weight="bold" hasTabularNumbers>
                    {monthSessions.length}회
                  </Text>
                )}
              </HStack>

              {listed.length === 0 && <Text color="secondary">기록이 없습니다.</Text>}
              {listed.map((session) => {
                const s = summarize(session, bundle.routine, (rk) => isInverseKey(bundle.catalog, rk))
                return (
                  <ClickableCard
                    key={session.id}
                    label={`${s.dayName} ${session.date}`}
                    onClick={() => setDetailId(session.id)}
                  >
                    <Rows>
                    <Row
                      label={
                        <HStack gap={2} align="center">
                          <Text weight="semibold">{s.dayName}</Text>
                          {session.mode !== 'normal' && (
                            <Badge variant="warning" label={session.mode === 'return' ? '복귀' : '디로드'} />
                          )}
                        </HStack>
                      }
                      description={
                        <Text type="supporting" color="secondary">
                          {session.date} ({weekdayKo(session.date)}) · {s.setCount}세트
                          {s.durationMin !== null && ` · ${s.durationMin}분`}
                          {session.cardio && ` · ${cardioText(session.cardio)}`}
                        </Text>
                      }
                      end={
                        <VStack gap={0} align="end">
                          <Text weight="semibold" hasTabularNumbers>
                            {Math.round(s.volume).toLocaleString()}
                          </Text>
                          <Text type="supporting" color="secondary">
                            kg·회
                          </Text>
                        </VStack>
                      }
                    />
                    </Rows>
                  </ClickableCard>
                )
              })}
            </Group>

            {/*
              선택한 날짜의 식단 — 당일 입력 누락 보정 경로 (D3).
              오늘 화면과 **같은 편집기**를 쓴다 (조작이 갈라지지 않게).
            */}
            {selectedDate && !diet.loading && diet.plans.length > 0 && (
              <>
                <Heading level={2}>{selectedDate} 식단</Heading>
                <DietDayEditor
                  date={selectedDate}
                  today={todayLocal()}
                  plans={diet.plans}
                  days={diet.days}
                  defaultPlanId={diet.defaultPlanId}
                  variantDefaults={diet.variantDefaults}
                  userFoods={diet.userFoods}
                  trainedThatDay={strengthDates(sessions).has(selectedDate)}
                />
              </>
            )}
          </>
        )}
      </Groups>
    </AxRoot>
  )
}
