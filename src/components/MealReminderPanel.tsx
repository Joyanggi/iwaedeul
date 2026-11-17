import { useState } from 'react'
import { Button, Card, Collapsible, HStack, Text, VStack } from '../ax'
import { CheckboxList, CheckboxListItem } from '../ax/diet'
import {
  allSlots,
  buildMealIcs,
  defaultSelectedSlots,
  isTrainingOnlySlot,
} from '../lib/mealCalendar'
import { OUTCOME_MESSAGE, shareFile } from '../lib/share'
import { todayLocal } from '../lib/dates'
import type { DietPlan } from '../types'

/**
 * 식사 알림 내보내기 (Z4) — iOS 캘린더에 위임한다.
 *
 * **"알림 켜기" 토글을 만들지 않는다.** iOS PWA는 스스로 예약 알림을 울릴 수 없다
 * (로컬 예약 알림 API 폐기, Web Push는 서버 필요 — 무서버가 전제). 토글을 두면
 * **켜져 있는데 안 울리는 거짓 UI**가 된다. 그 사실을 안내 문구가 정직하게 말한다.
 */
export default function MealReminderPanel({ plan }: { plan: DietPlan }) {
  const slots = allSlots(plan)
  const [selected, setSelected] = useState<string[]>(() => defaultSelectedSlots(plan))
  const [message, setMessage] = useState<string | null>(null)

  const onExport = async () => {
    const ics = buildMealIcs({
      plan,
      slotIds: selected,
      from: todayLocal(),
      stamp: new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    })
    const outcome = await shareFile({
      filename: `meal-reminders-${plan.id}.ics`,
      text: ics,
      mimeType: 'text/calendar',
      title: '식사 알림',
    })
    setMessage(OUTCOME_MESSAGE[outcome])
  }

  const slotNote = (slotId: string, timeHint: string) =>
    isTrainingOnlySlot(plan, slotId) && selected.includes(slotId)
      ? // 훈련일 전용 슬롯은 매일 반복이라 휴식일에도 울린다 — 고르기 전에 알린다
        `${timeHint} · 휴식일에도 울립니다 (훈련일 전용 끼니인데 매일 반복입니다)`
      : timeHint

  return (
    <Card>
      <Collapsible defaultIsOpen={false} trigger={<Text weight="semibold">식사 알림</Text>}>
        <VStack gap={3}>
          <Text>
            <strong>앱이 직접 알림을 보낼 수는 없습니다</strong> (iOS 웹앱 제약). 대신 선택한 끼니를 매일
            반복되는 캘린더 일정으로 내보내고, <strong>아이폰 캘린더가 울립니다.</strong>
          </Text>

          <CheckboxList label="알림 받을 끼니" isLabelHidden value={selected} onChange={setSelected}>
            {slots.map((slot) => (
              <CheckboxListItem
                key={slot.id}
                value={slot.id}
                label={slot.name}
                description={slotNote(slot.id, slot.timeHint)}
              />
            ))}
          </CheckboxList>

          <HStack>
            <Button
              variant="secondary"
              label={`📅 캘린더로 내보내기 (${selected.length}개)`}
              isDisabled={selected.length === 0}
              onClick={() => void onExport()}
            />
          </HStack>

          <Text type="supporting" color="secondary">
            시간을 바꿔 다시 내보냈다면 <strong>캘린더에서 기존 알림을 지우고</strong> 추가하세요 —
            아이폰은 같은 일정을 갱신하지 않고 하나 더 만들 수 있습니다.
          </Text>
          {message && <Text type="supporting">{message}</Text>}
        </VStack>
      </Collapsible>
    </Card>
  )
}
