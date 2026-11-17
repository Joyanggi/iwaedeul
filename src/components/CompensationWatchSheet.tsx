import type { CompensationWatch } from '../lib/compensationWatch'
import { WATCH_WINDOW } from '../lib/compensationWatch'
import { describeScale, easierWeight, type WeightScale } from '../lib/weightScale'
import { Badge, Button, Heading, Item, Sheet, Text, VStack } from '../ax'

/**
 * 반복 보상작용 → 무게 하향 제안 (T11).
 *
 * 자동으로 낮추지 않는 이유: A그룹 원칙이 "자극을 찾으려고 무게를 내리지 않는다"이므로
 * 하향은 항상 사용자 결정이다. 앱이 할 수 있는 것은 **셈을 보여주는 것**까지다.
 *
 * 하향 폭은 종목별 무게 단위(T9)를 따른다 — 5kg 머신에서 2.5kg를 제안하면
 * 존재하지 않는 무게가 된다.
 */
export default function CompensationWatchSheet({
  exerciseName,
  watch,
  scale,
  currentWeight,
  onApply,
  onClose,
}: {
  exerciseName: string
  watch: CompensationWatch
  scale: WeightScale
  currentWeight: number
  onApply: (weight: number) => void
  onClose: () => void
}) {
  /*
    "하향"의 의미는 **더 쉽게**다. 어시스티드(T8)에서는 보조를 올려야 쉬워지므로
    숫자가 반대로 움직인다 — stepDown을 직접 부르면 더 어렵게 만든다.
  */
  const lowered = easierWeight(currentWeight, scale)
  const canLower = lowered !== currentWeight

  return (
    <Sheet label="보상작용 반복 — 무게 하향" purpose="info" onClose={onClose}>
      {(dismiss) => (
        <VStack gap={5} paddingBlockEnd={3}>
          <VStack gap={2}>
            <Heading level={2}>보상작용 반복 · {exerciseName}</Heading>
            <Text color="secondary">
              최근 {WATCH_WINDOW}회 수행 중 {watch.count}회에서 기록됐습니다. 루틴 문서 13장: 세트 중 이 신호가 보이면 무게가
              과한 것입니다.
            </Text>
            <VStack gap={2}>
              {watch.notes.map((note) => (
                <Item key={note} label={note} startContent={<Badge variant="warning" label="보상작용" />} />
              ))}
            </VStack>
          </VStack>

          {canLower ? (
            <VStack gap={1}>
              <Text>
                {scale.inverse ? '보조 +' : '한 단위 하향: '}
                {currentWeight}kg → {lowered}kg ({describeScale(scale)})
                {scale.inverse && ' — 보조를 늘리면 더 쉬워집니다'}
              </Text>
              <Text color="secondary">체크하지 않은 세트에만 적용됩니다. 이미 기록한 세트는 그대로입니다.</Text>
            </VStack>
          ) : (
            <Text color="secondary">더 조절할 단위가 없습니다 ({describeScale(scale)}).</Text>
          )}

          <VStack gap={3}>
            <Button
              variant="primary"
              width="100%"
              label={`${lowered}kg로 ${scale.inverse ? '보조 늘리기' : '낮추기'}`}
              isDisabled={!canLower}
              onClick={() => {
                onApply(lowered)
                onClose()
              }}
            />
            <Button variant="secondary" width="100%" label="그대로 두기" onClick={dismiss} />
          </VStack>
        </VStack>
      )}
    </Sheet>
  )
}
