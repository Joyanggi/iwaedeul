/**
 * 앱이 Astryx를 쓰는 한 곳. 화면은 `@astryxdesign/…`를 직접 import하지 않고 여기서만 가져다 쓴다.
 * 버전을 올릴 때 고칠 자리가 이 폴더뿐이다. `App`이 정적으로 읽고, 테마는 `AppRoot`가 앱 뿌리에 한 번 건다.
 */
import '@astryxdesign/core/astryx.css'
import './ax.css'
import './parts.css'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { SizeProvider } from '@astryxdesign/core/SizeContext'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Card as AstryxCard, type CardProps } from '@astryxdesign/core/Card'
import { ClickableCard as AstryxClickableCard, type ClickableCardProps } from '@astryxdesign/core/ClickableCard'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { TextInput, type TextInputProps } from '@astryxdesign/core/TextInput'
import { TextArea, type TextAreaProps } from '@astryxdesign/core/TextArea'
import { BottomSheet, type BottomSheetProps } from '@astryxdesign/core/BottomSheet'
import { AX_NO_AUTOFILL } from '../lib/inputProps'
import { once } from '../lib/once'
import { appTheme } from './theme'
import { clampStep } from './clampStep'

/** 입력칸 글자 16px 이상 (iOS가 포커스 시 확대하지 않게) */
const CONTROL_STYLE = { fontSize: 'max(16px, 1em)' } as const

/** `NumberInput`은 autoComplete만 받는다. 값은 `NO_AUTOFILL`에서 온다(필드별로 속성을 직접 적지 않는다 — inputProps.test X5·Y2). */
const NUMBER_AUTOFILL = { autoComplete: AX_NO_AUTOFILL.autoComplete } as const

/** 테마·모드·기본 크기. 앱 전체에 한 번 건다. 폰의 라이트/다크 설정을 따른다. */
export function AppRoot({ children }: { children: ReactNode }) {
  return (
    <Theme theme={appTheme} mode="system">
      <SizeProvider value="lg">{children}</SizeProvider>
    </Theme>
  )
}

/** 화면 틀. 테마는 `AppRoot`가 이미 걸었다. */
export function AxRoot({ children }: { children: ReactNode }) {
  return <div className="ax-screen">{children}</div>
}

/**
 * 여백 역할 (v1.20 RR12). 묶음 사이·카드 사이·카드 안쪽의 단계 숫자는 이 파일에만 적는다.
 * 화면은 `Groups`·`Group`·`Card`를 쓰고 숫자를 적지 않는다 — 같은 역할에 다른 값이 생길 길이가 없다.
 * (안 옮긴 화면의 짝은 `styles/space.css`의 `--space-section`·`--space-card`·`--inset-card`이고 같은 길이다.)
 */
const GROUP_GAP = 5
const CARD_GAP = 3
const CARD_PADDING = 4

/** 화면 안의 묶음들을 세로로 쌓는다. 화면은 `AxRoot` 안에 `Groups` 하나를 둔다. */
export function Groups({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <VStack gap={GROUP_GAP} className={className ? `ax-groups ${className}` : 'ax-groups'}>
      {children}
    </VStack>
  )
}

/** 한 묶음 안의 카드들을 쌓는다. */
export function Group({ children }: { children: ReactNode }) {
  return (
    <VStack gap={CARD_GAP} className="ax-group">
      {children}
    </VStack>
  )
}

/** 카드. `padding`은 받지 않는다(카드 안쪽은 한 단계다). */
export function Card(props: Omit<CardProps, 'padding'>) {
  return <AstryxCard padding={CARD_PADDING} {...props} />
}

/** 눌리는 카드. `Card`와 같은 안쪽 여백. */
export function ClickableCard(props: Omit<ClickableCardProps, 'padding'>) {
  return <AstryxClickableCard padding={CARD_PADDING} {...props} />
}

/**
 * 화면 위나 아래에 붙어 있는 띠(Astryx에 없는 부품 — Layout은 iOS의 문서 스크롤을 잃게 해서 안 쓴다).
 * 재질은 `parts.css`의 `.ax-bar` 한 곳. 자기 높이를 `--ax-bar-top`·`--ax-bar-bottom`으로 문서에 알려
 * 화면 틀(`.ax-screen`)과 안 옮긴 화면(`.screen`)이 그만큼 비운다. 안전 영역은 띠가 스스로 띄운다.
 */
export function Bar({
  position,
  children,
  role,
  'aria-live': ariaLive,
  'aria-label': ariaLabel,
}: {
  position: 'top' | 'bottom'
  children: ReactNode
  role?: string
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-label'?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const name = position === 'top' ? '--ax-bar-top' : '--ax-bar-bottom'
    const root = document.documentElement
    // 짝수로 올린다: 띠 높이가 홀수면 비워 둔 자리가 2px 격자에서 어긋난다
    const publish = () => root.style.setProperty(name, `${Math.ceil(el.offsetHeight / 2) * 2}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [position])
  return (
    <div ref={ref} className={`ax-bar ax-bar-${position}`} role={role} aria-live={ariaLive} aria-label={ariaLabel}>
      {children}
    </div>
  )
}

/** 화면 위에 붙어 있는 알림 자리(업데이트 알림). 스타일은 `parts.css`. */
export function StickyTop({ children }: { children: ReactNode }) {
  return <div className="ax-sticky-top">{children}</div>
}

/**
 * 숫자 칸의 글자(가운데·표 숫자, 크게 켜면 테마의 제목 글자 단계)는 `parts.css`의 두 클래스가 입력칸에 건다.
 * `controlStyle`은 입력칸이 아니라 바깥 상자에 붙어 글자 크기가 안 닿는다(실측). 16px 하한은 그 CSS에도 있다.
 */
/** 크게 켠 숫자 칸은 바깥 상자의 좌우 안쪽 여백을 없앤다 — 세트 행의 좁은 열에서 142.5가 잘리지 않게 */
const PROMINENT_STYLE = { ...CONTROL_STYLE, paddingInline: 0 } as const

interface TextFieldProps extends TextInputProps {
  /** 숫자 칸 — 글자를 가운데에 놓고 표 숫자로 맞춘다 */
  isNumeric?: boolean
  /** 숫자를 제목 글자 크기로 키운다(세트 행의 무게·횟수). 가운데·표 숫자도 함께 켠다 */
  isProminent?: boolean
}

/** 텍스트 입력. 자동완성 억제(G5)와 16px 하한을 빠뜨릴 수 없게 한다. */
export function TextField({ isNumeric = false, isProminent = false, ...props }: TextFieldProps) {
  const numeric = isProminent ? 'ax-num-prominent' : isNumeric ? 'ax-num' : undefined
  return <TextInput {...AX_NO_AUTOFILL} controlStyle={isProminent ? PROMINENT_STYLE : CONTROL_STYLE} controlClassName={numeric} {...props} />
}

/** 여러 줄 입력. `TextField`처럼 자동완성 억제(G5)와 16px 하한을 빠뜨릴 수 없게 한다. */
export function TextAreaField(props: TextAreaProps) {
  return <TextArea {...AX_NO_AUTOFILL} controlStyle={CONTROL_STYLE} {...props} />
}

interface StepperProps {
  value: number
  step: number
  min: number
  max: number
  label: string
  /** 입력칸 폭(px). 안 주면 Astryx 기본 폭. 줄 시트는 이름(`반복 최소`)이 한 줄로 들어가도록 줄인다 */
  inputWidth?: number
  onChange: (v: number) => void
}

/** − 입력칸 ＋. `NumberInput`의 증감 버튼은 터치에서 숨어서 버튼을 따로 붙인다. */
export function Stepper({ value, step, min, max, label, inputWidth, onChange }: StepperProps) {
  return (
    <HStack gap={2}>
      <Button
        variant="secondary"
        isIconOnly
        icon={<span aria-hidden="true">−</span>}
        label={`${label} 감소`}
        onClick={() => onChange(clampStep(value, -1, step, min, max))}
      />
      <NumberInput
        label={label}
        isLabelHidden
        isIntegerOnly
        min={min}
        max={max}
        step={step}
        value={value}
        width={inputWidth}
        onChange={onChange}
        {...NUMBER_AUTOFILL}
        controlStyle={CONTROL_STYLE}
      />
      <Button
        variant="secondary"
        isIconOnly
        icon={<span aria-hidden="true">+</span>}
        label={`${label} 증가`}
        onClick={() => onChange(clampStep(value, 1, step, min, max))}
      />
    </HStack>
  )
}

interface SheetProps {
  label: string
  purpose?: 'required' | 'form' | 'info'
  height?: BottomSheetProps['height']
  onClose: () => void
  /** 함수면 `dismiss`를 받는다 — 닫기 버튼은 이것을 불러야 막·끌어내림과 같이 내려가며 닫힌다 */
  children: ReactNode | ((dismiss: () => void) => ReactNode)
}

/**
 * `BottomSheet`가 내려가는 시간(--motion-medium 300ms)보다 조금 길게. `BottomSheet`에 닫힘이 끝났다는 콜백이 없어 타이머로 기다린다.
 * 실제 사라지는 시간은 DEV-RECORD RR5에 잰 값이 있다.
 */
const SHEET_CLOSE_MS = 350

/**
 * 바텀 시트. 지금 시트처럼 "있으면 그리고 없으면 안 그리는" 쓰임을 받는다.
 * `dismiss()`와 막 누름·끌어내림·Esc가 같은 길을 지난다: 내려간 뒤 `onClose`를 한 번만 부른다.
 * 저장 버튼이 부모 상태를 바꿔 시트가 먼저 사라지면 타이머를 지워 `onClose`가 불리지 않는다(늦은 `onClose`가 다음 화면을 건드리지 않게).
 */
export function Sheet({ label, purpose = 'info', height = 'hug', onClose, children }: SheetProps) {
  // `dismiss`는 상태 하나만 바꾼다 — 두 번 불러도 같은 값이라 타이머는 하나다(effect가 `closing`이 바뀔 때만 돈다)
  const [closing, setClosing] = useState(false)
  // 최신 onClose는 효과에서 담는다(렌더 중 ref를 읽거나 쓰지 않는다)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    if (!closing) return
    const finish = once(() => onCloseRef.current())
    // 움직임 줄이기: 기다리지 않는다(BottomSheet도 바로 닫힌다)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish()
      return
    }
    const timer = setTimeout(finish, SHEET_CLOSE_MS)
    // 정리 함수: 저장 버튼이 부모 상태를 바꿔 시트가 먼저 사라지면 타이머가 지워져 늦은 onClose가 없다
    return () => clearTimeout(timer)
  }, [closing])

  const dismiss = () => setClosing(true)

  return (
    <BottomSheet
      label={label}
      purpose={purpose}
      height={height}
      isOpen={!closing}
      onOpenChange={(next) => {
        if (!next) dismiss()
      }}
    >
      {/* 시트는 화면과 다른 층에 그려져 크기 기본값이 새로 시작한다 → 화면과 같은 크기를 다시 건다 */}
      <SizeProvider value="lg">{typeof children === 'function' ? children(dismiss) : children}</SizeProvider>
    </BottomSheet>
  )
}

export { TabList, Tab } from '@astryxdesign/core/TabList'
export { Center } from '@astryxdesign/core/Center'
export { Grid } from '@astryxdesign/core/Grid'
export { Spinner } from '@astryxdesign/core/Spinner'
export { Icon } from '@astryxdesign/core/Icon'
export { Button } from '@astryxdesign/core/Button'
export { Banner } from '@astryxdesign/core/Banner'
export { Badge } from '@astryxdesign/core/Badge'
export { Heading } from '@astryxdesign/core/Heading'
export { Text } from '@astryxdesign/core/Text'
export { VStack, HStack, StackItem } from '@astryxdesign/core/Stack'
export { Item } from '@astryxdesign/core/Item'
export { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
export { Switch } from '@astryxdesign/core/Switch'
export { ToggleButton } from '@astryxdesign/core/ToggleButton'
export { Divider } from '@astryxdesign/core/Divider'
export { ProgressBar } from '@astryxdesign/core/ProgressBar'
export { Collapsible } from '@astryxdesign/core/Collapsible'
export { List, ListItem } from '@astryxdesign/core/List'
