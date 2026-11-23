/**
 * 식단 화면에서만 쓰는 Astryx 부품. `index.tsx`에 두면 홈이 읽는 첫 화면 코드(메인 청크)에 `TimeInput`·`CheckboxList`가 딸려 와
 * 첫 화면이 약 87KB(gzip) 늘어난다(PLAN v1.21 SS1의 360KB 기준을 넘는다). 이 파일은 식단 화면(지연 읽기)만 import하고, `index.tsx`가 다시 내보내지 않는다.
 */
import { TimeInput, type TimeInputProps } from '@astryxdesign/core/TimeInput'
import { AX_NO_AUTOFILL } from '../lib/inputProps'
import { CONTROL_STYLE } from './index'

export { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
// SS3: 식단 시트(끼니 입력·먹은 것 추가)만 쓴다 — 같은 이유로 index.tsx가 아니라 여기에 둔다
export { RadioList, RadioListItem } from '@astryxdesign/core/RadioList'

/**
 * 시각 칸. OS의 시각 고르기를 쓴다(`presentation="native"` — iOS 시각 휠). 16px 하한과 자동완성 억제(G5)를 빠뜨릴 수 없게 한다.
 * 값은 `'HH:MM'` 그대로 주고받는다.
 */
export function TimeField({
  value,
  onChange,
  ...props
}: Omit<TimeInputProps, 'value' | 'onChange'> & { value: string; onChange: (value: string | undefined) => void }) {
  // `ISOTimeString`은 'HH:MM' 글자에 붙인 표식일 뿐이라 화면은 글자 그대로 주고받는다
  return (
    <TimeInput
      {...AX_NO_AUTOFILL}
      presentation="native"
      controlStyle={CONTROL_STYLE}
      value={value as TimeInputProps['value']}
      onChange={onChange}
      {...props}
    />
  )
}
