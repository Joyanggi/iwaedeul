import { useState } from 'react'
import {
  STEP_PRESETS,
  formatLadder,
  parseLadder,
  round2,
  type WeightScale,
} from '../lib/weightScale'
import { Button, Heading, HStack, SegmentedControl, SegmentedControlItem, Sheet, Text, TextAreaField, TextField, ToggleButton, VStack } from '../ax'

/**
 * 종목별 무게 단위 설정 (T9).
 *
 * 루틴 문서 10장의 증량 규칙은 "머신은 한 핀"인데, 한 핀이 몇 kg인지는 머신마다 다르고
 * 균일하지도 않다. 균일 머신은 스텝 하나로 끝나지만, 불규칙 스택은 실제 핀 값을
 * 나열해야 한다 (2.5씩 가다 3씩 뛰는 머신이 흔하다).
 *
 * 한 번 설정하면 recordKey에 영구 저장되므로, 같은 머신을 다시 설정할 일은 없다.
 */
export default function WeightScaleSheet({
  exerciseName,
  defaultStep,
  current,
  onSave,
  onClose,
}: {
  exerciseName: string
  defaultStep: number
  current: { weightStepKg?: number; weightLadderKg?: number[] }
  onSave: (next: { weightStepKg?: number; weightLadderKg?: number[] }) => void
  onClose: () => void
}) {
  const hasLadder = (current.weightLadderKg?.length ?? 0) > 0
  const [mode, setMode] = useState<'step' | 'ladder'>(hasLadder ? 'ladder' : 'step')
  const [stepText, setStepText] = useState(String(current.weightStepKg ?? defaultStep))
  const [ladderText, setLadderText] = useState(
    current.weightLadderKg?.length ? formatLadder(current.weightLadderKg) : '',
  )

  const parsedStep = Number(stepText.replace(',', '.'))
  const stepValid = Number.isFinite(parsedStep) && parsedStep > 0
  const ladderResult = parseLadder(ladderText)

  const preview: WeightScale | undefined =
    mode === 'ladder'
      ? ladderResult.ladder
        ? { step: defaultStep, ladder: ladderResult.ladder }
        : undefined
      : stepValid
        ? { step: round2(parsedStep) }
        : undefined

  const error =
    mode === 'ladder'
      ? (ladderResult.error ?? (ladderResult.ladder ? undefined : '핀 값을 입력하세요'))
      : stepValid
        ? undefined
        : '0보다 큰 숫자를 입력하세요'

  const save = () => {
    if (!preview) return
    onSave(
      mode === 'ladder'
        ? { weightLadderKg: preview.ladder }
        : { weightStepKg: preview.step },
    )
    onClose()
  }

  return (
    <Sheet label="무게 단위 설정" purpose="form" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <VStack gap={2}>
            <Heading level={2}>무게 단위 · {exerciseName}</Heading>
            <Text color="secondary">
              이 종목의 머신 한 핀이 몇 kg인지. 증량 제안과 ± 버튼이 이 값을 따릅니다.
            </Text>
          </VStack>

          <SegmentedControl label="방식" layout="fill" value={mode} onChange={(v) => setMode(v as 'step' | 'ladder')}>
            <SegmentedControlItem value="step" label="균일 간격" />
            <SegmentedControlItem value="ladder" label="불규칙 (핀 목록)" />
          </SegmentedControl>

          {mode === 'step' ? (
            <VStack gap={2}>
              <HStack gap={2} wrap="wrap">
                {STEP_PRESETS.map((preset) => (
                  <ToggleButton
                    key={preset}
                    className="ax-toggle"
                    label={`${preset}kg`}
                    isPressed={parsedStep === preset}
                    onPressedChange={() => setStepText(String(preset))}
                  />
                ))}
              </HStack>
              <TextField
                label="무게 단위 직접 입력 (kg)"
                isLabelHidden
                inputMode="decimal"
                value={stepText}
                onChange={setStepText}
                placeholder="직접 입력 (kg)"
              />
            </VStack>
          ) : (
            <VStack gap={2}>
              <Text color="secondary">
                머신에 적힌 핀 값을 순서 상관없이 나열하세요. 예: 5, 10, 15, 20, 25, 30, 35, 41, 47
              </Text>
              <TextAreaField
                label="핀 목록"
                isLabelHidden
                rows={3}
                value={ladderText}
                onChange={setLadderText}
                placeholder="5, 10, 15, 20, 25, 30, 35, 41, 47"
              />
            </VStack>
          )}

          {/* 오류 문구는 경고 색(Text의 색 이름에 경고가 없어 ax-text-warning) */}
          {error ? (
            <Text className="ax-text-warning">{error}</Text>
          ) : mode === 'ladder' && preview?.ladder ? (
            <Text color="secondary">
              핀 {preview.ladder.length}개 · {formatLadder(preview.ladder)}
            </Text>
          ) : (
            <Text color="secondary">± 버튼과 증량 제안이 {preview?.step}kg 단위로 움직입니다</Text>
          )}

          <VStack gap={3}>
            <Button variant="primary" width="100%" label="저장" isDisabled={!preview} onClick={save} />
            <HStack gap={3}>
              <Button
                variant="secondary"
                width="100%"
                label={`기본값(${defaultStep}kg)으로`}
                onClick={() => {
                  onSave({})
                  onClose()
                }}
              />
              <Button variant="secondary" width="100%" label="취소" onClick={dismiss} />
            </HStack>
          </VStack>
        </VStack>
      )}
    </Sheet>
  )
}
