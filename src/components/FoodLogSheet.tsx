import { useMemo, useState } from 'react'
import { nutritionText } from '../lib/diet'
import {
  applyAddFood,
  applyRemoveFood,
  applyUpdateFood,
  foodCatalog,
  foodKey,
  validateFood,
  type CatalogFood,
  type FoodInput,
} from '../lib/foods'
import { mutateUserFoods } from '../lib/useDiet'
import type { DietDay, DietPlan, Food, FoodLogEntry } from '../types'
import { Button, Heading, HStack, List, ListItem, Sheet, Text, TextField, VStack } from '../ax'
import { TimeField } from '../ax/diet'
import { ScrollableArea } from '../ax/scroll'

/**
 * "먹은 것 추가" 시트 (MM2).
 *
 * 행을 누르면 그 시각·개수 1로 **바로 추가**하고 시트는 닫지 않는다 (여러 개를 이어 넣는다).
 * 저장은 `onAdd`(편집기의 `mutate`)와 `mutateUserFoods`가 맡는다 — 둘 다 쓰기 함수가
 * 백업을 예약하므로 이 파일은 동기화를 부르지 않는다.
 */

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 빈 칸은 미입력(undefined), 숫자가 아니면 NaN으로 넘겨 `validateFood`가 잡게 한다 */
function parseNum(text: string): number | undefined {
  const t = text.trim().replace(',', '.')
  if (t === '') return undefined
  return Number(t)
}

function toEntry(food: FoodInput, time: string): FoodLogEntry {
  const entry: FoodLogEntry = {
    id: crypto.randomUUID(),
    time,
    name: food.name.trim(),
    qty: food.qty.trim(),
    count: 1,
  }
  if (food.kcal !== undefined) entry.kcal = food.kcal
  if (food.proteinG !== undefined) entry.proteinG = food.proteinG
  return entry
}

interface Draft {
  editingId?: string
  name: string
  qty: string
  kcal: string
  proteinG: string
}

const EMPTY_DRAFT: Draft = { name: '', qty: '', kcal: '', proteinG: '' }

export default function FoodLogSheet({
  date,
  today,
  plans,
  days,
  userFoods,
  onAdd,
  onClose,
}: {
  date: string
  today: string
  plans: DietPlan[]
  days: DietDay[]
  userFoods: Food[]
  onAdd: (entry: FoodLogEntry) => void
  onClose: () => void
}) {
  // 오늘이면 지금 시각, 과거 날짜면 빈 값 — 과거 보정에서 엉뚱한 시각이 조용히 들어가지 않게
  const [time, setTime] = useState(date === today ? nowHHMM() : '')
  const [query, setQuery] = useState('')
  const [last, setLast] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const catalog = useMemo(() => foodCatalog(plans, userFoods, days), [plans, userFoods, days])
  const q = query.replace(/\s/g, '').toLowerCase()
  const shown = catalog.filter((f) => f.name.replace(/\s/g, '').toLowerCase().includes(q))
  const noTime = time === ''

  const input: FoodInput | null = draft
    ? {
        name: draft.name,
        qty: draft.qty,
        kcal: parseNum(draft.kcal),
        proteinG: parseNum(draft.proteinG),
      }
    : null
  const problems = input && draft ? validateFood(input, plans, userFoods, draft.editingId) : []

  const add = (food: FoodInput) => {
    onAdd(toEntry(food, time))
    setLast(food.name.trim())
  }

  const save = (alsoAdd: boolean) => {
    if (!input || !draft || problems.length > 0) return
    const clean: FoodInput = { ...input, name: input.name.trim(), qty: input.qty.trim() }
    if (draft.editingId) {
      mutateUserFoods((foods) => applyUpdateFood(foods, draft.editingId!, clean))
    } else {
      const food: Food = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...clean }
      mutateUserFoods((foods) => applyAddFood(foods, food))
    }
    if (alsoAdd) add(clean)
    setDraft(null)
    setConfirmRemove(false)
  }

  const edit = (f: CatalogFood) => {
    setDraft({
      editingId: f.id,
      name: f.name,
      qty: f.qty,
      kcal: f.kcal === undefined ? '' : String(f.kcal),
      proteinG: f.proteinG === undefined ? '' : String(f.proteinG),
    })
  }

  return (
    <Sheet label="먹은 것 추가" purpose="form" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <Heading level={2}>먹은 것 추가</Heading>

          {draft ? (
            <VStack gap={3}>
              <Heading level={3}>{draft.editingId ? '음식 수정' : '새 음식 등록'}</Heading>
              <TextField
                label="음식 이름"
                isLabelHidden
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                placeholder="이름 (예: 서브웨이 터키)"
              />
              <TextField
                label="분량"
                isLabelHidden
                value={draft.qty}
                onChange={(v) => setDraft({ ...draft, qty: v })}
                placeholder="분량 (예: 15cm, 1개)"
              />
              <HStack gap={2}>
                <TextField
                  label="칼로리"
                  isLabelHidden
                  inputMode="decimal"
                  value={draft.kcal}
                  onChange={(v) => setDraft({ ...draft, kcal: v })}
                  placeholder="kcal (1개 기준)"
                />
                <TextField
                  label="단백질"
                  isLabelHidden
                  inputMode="decimal"
                  value={draft.proteinG}
                  onChange={(v) => setDraft({ ...draft, proteinG: v })}
                  placeholder="단백질 g"
                />
              </HStack>
              <Text type="supporting" color="secondary">영양값을 비워 두면 “영양 미입력”으로 기록됩니다.</Text>
              {draft.name.trim() !== '' && problems.length > 0 && (
                <Text type="supporting" className="ax-text-error">
                  {problems.join(' · ')}
                </Text>
              )}
              <HStack gap={2} wrap="wrap">
                <Button variant="secondary" label="취소" onClick={() => setDraft(null)} />
                {draft.editingId ? (
                  <Button variant="primary" label="저장" isDisabled={problems.length > 0} onClick={() => save(false)} />
                ) : (
                  <>
                    <Button variant="secondary" label="등록" isDisabled={problems.length > 0} onClick={() => save(false)} />
                    <Button
                      variant="primary"
                      label="등록하고 추가"
                      isDisabled={problems.length > 0 || noTime}
                      onClick={() => save(true)}
                    />
                  </>
                )}
              </HStack>
              {!draft.editingId && noTime && (
                <Text type="supporting" color="secondary">먹은 시각을 먼저 골라 주세요</Text>
              )}
              {draft.editingId &&
                (confirmRemove ? (
                  <VStack gap={2}>
                    <Text type="supporting" className="ax-text-error">
                      목록에서 지웁니다. 이미 적은 먹은 것 기록은 그대로입니다.
                    </Text>
                    <HStack gap={2} wrap="wrap">
                      <Button variant="secondary" label="취소" onClick={() => setConfirmRemove(false)} />
                      <Button
                        variant="destructive"
                        label="정말 삭제"
                        onClick={() => {
                          mutateUserFoods((foods) => applyRemoveFood(foods, draft.editingId!))
                          setDraft(null)
                          setConfirmRemove(false)
                        }}
                      />
                    </HStack>
                  </VStack>
                ) : (
                  <Button variant="destructive" label="목록에서 삭제" onClick={() => setConfirmRemove(true)} />
                ))}
            </VStack>
          ) : (
            <VStack gap={3}>
              <TimeField label="먹은 시각" value={time} onChange={(v) => setTime(v ?? '')} />
              {noTime && <Text type="supporting" color="secondary">먹은 시각을 먼저 골라 주세요</Text>}
              {last && <Text type="supporting" color="secondary">방금 추가: {last}</Text>}
              <TextField
                label="음식 검색"
                isLabelHidden
                value={query}
                onChange={setQuery}
                placeholder="음식 검색"
              />

              <ScrollableArea axis="block" height="40vh" label="음식 목록">
                <List>
                  {shown.map((f) => (
                    <ListItem
                      key={`${f.source}:${foodKey(f.name, f.qty)}`}
                      isDisabled={noTime}
                      label={`${f.name} ${f.qty}`}
                      description={
                        <Text color="secondary" textWrap="wrap">
                          {f.source === 'plan' ? '플랜 · ' : ''}
                          {nutritionText(f.kcal, f.proteinG)}
                        </Text>
                      }
                      /* 음식 줄에 aria-label을 주지 않는다 — 보이는 글자가 이름이다 (v1.20 RRM 보완) */
                      endContent={
                        f.source === 'user' ? (
                          <Button variant="ghost" size="sm" label="편집" aria-label={`편집 — ${f.name}`} onClick={() => edit(f)} />
                        ) : null
                      }
                      onClick={() => add(f)}
                    />
                  ))}
                </List>
                {shown.length === 0 && <Text color="secondary">맞는 음식이 없습니다.</Text>}
              </ScrollableArea>

              <Text type="supporting" color="secondary">
                플랜에서 체크한 음식을 여기에도 적으면 합계에 두 번 들어갑니다.
              </Text>
              <Button variant="secondary" label="새 음식 등록" onClick={() => setDraft({ ...EMPTY_DRAFT })} />
            </VStack>
          )}

          <Button variant="secondary" width="100%" label="닫기" onClick={dismiss} />
        </VStack>
      )}
    </Sheet>
  )
}
