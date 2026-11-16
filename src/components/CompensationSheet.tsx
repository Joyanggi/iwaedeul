import { useState } from 'react'
import { hasCompensation, parseCompensation, serializeCompensation } from '../lib/compensation'
import { Button, Heading, HStack, Sheet, Text, TextField, ToggleButton, VStack } from '../ax'

/**
 * 보상작용 입력 (DESIGN.md §5.2).
 * "보상작용: [없음] (탭하면 종목별 체크리스트 + 직접 입력)"
 *
 * 체크리스트는 카탈로그의 `Exercise.compensationSigns` — 루틴 문서 12장에서 온 종목별 신호다.
 * 체크리스트가 비어 있는 종목도 있어서 자유 입력은 항상 제공한다.
 */
export default function CompensationSheet({
  exerciseName,
  signs,
  current,
  onSave,
  onClose,
}: {
  exerciseName: string
  signs: string[]
  current: string
  onSave: (next: string) => void
  onClose: () => void
}) {
  const initial = parseCompensation(current, signs)
  const [selected, setSelected] = useState<string[]>(initial.signs)
  const [free, setFree] = useState(initial.free)

  const toggle = (sign: string) =>
    setSelected((prev) => (prev.includes(sign) ? prev.filter((s) => s !== sign) : [...prev, sign]))

  const preview = serializeCompensation({ signs: selected, free })

  return (
    <Sheet label="보상작용 입력" purpose="form" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <VStack gap={2}>
            <Heading level={2}>보상작용 · {exerciseName}</Heading>
            {signs.length > 0 ? (
              <VStack gap={2}>
                {signs.map((sign) => (
                  <ToggleButton
                    key={sign}
                    className="ax-toggle"
                    label={sign}
                    isPressed={selected.includes(sign)}
                    onPressedChange={() => toggle(sign)}
                  />
                ))}
              </VStack>
            ) : (
              <Text color="secondary">이 종목에는 등록된 체크리스트가 없습니다. 직접 입력하세요.</Text>
            )}
          </VStack>

          <VStack gap={2}>
            <Heading level={2}>직접 입력</Heading>
            <TextField
              label="보상작용 직접 입력"
              isLabelHidden
              value={free}
              onChange={setFree}
              placeholder="예: 마지막 세트 엉덩이 살짝 뜸"
            />
            <Text color="secondary">
              여기에 적으면 "보상작용 있음"으로 기록되고 다음 증량이 보류됩니다. 통증은 카드의 통증 칸에 적어 주세요.
            </Text>
          </VStack>

          {/* 저장될 값: 있음이면 경고 색(Text의 색 이름에 경고가 없어 ax-text-warning) */}
          {hasCompensation(preview) ? (
            <Text className="ax-text-warning">저장될 값: {preview}</Text>
          ) : (
            <Text color="secondary">저장될 값: {preview}</Text>
          )}

          <VStack gap={3}>
            <Button
              variant="primary"
              width="100%"
              label="저장"
              onClick={() => {
                onSave(preview)
                onClose()
              }}
            />
            <HStack gap={3}>
              {/*
                X9 — **지울 것이 있을 때만** 보인다. 이미 '없음'인 상태에서 "없음으로 비우기"는
                아무 일도 하지 않는 버튼이고, 그런 버튼이 있으면 자기 존재를 설명하지 못한다.
                기준은 저장된 현재 값이다 (편집 중인 선택이 아니다) — 편집 중 값으로 판단하면
                체크를 다 풀자마자 버튼이 사라져서 "되돌리기"를 못 한다.
              */}
              {hasCompensation(current) && (
                <Button
                  variant="secondary"
                  width="100%"
                  label="없음으로 비우기"
                  onClick={() => {
                    setSelected([])
                    setFree('')
                  }}
                />
              )}
              <Button variant="secondary" width="100%" label="취소" onClick={dismiss} />
            </HStack>
          </VStack>
        </VStack>
      )}
    </Sheet>
  )
}
