/**
 * 앱이 쓰는 Astryx 테마. 테마에 관한 것은 이 파일에만 둔다.
 * 바탕은 Astryx Neutral, 강조색만 파랑으로 바꾼다(PLAN v1.20 "테마" 절). 값은 팔레트의 단계로 고르고 hex를 직접 적지 않는다.
 * 이름이 `workout`이라 정적 `theme-neutral/theme.css`(`[data-astryx-theme="neutral"]` 범위)는 안 걸린다 —
 * `index.tsx`가 그 import를 하지 않고, 토큰은 `Theme`이 실행 중에 넣는다(PLAN "확인한 것" 1).
 */
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { neutralPalettes } from '@astryxdesign/theme-neutral'
import { defineTheme } from '@astryxdesign/core/theme'

const { blue, neutral } = neutralPalettes

export const appTheme = defineTheme({
  name: 'workout',
  extends: neutralTheme,
  tokens: {
    '--color-accent': [blue.light[50], blue.dark[65]],
    '--color-accent-muted': [blue.light[90], blue.dark[25]],
    '--color-text-accent': [blue.light[45], blue.dark[80]],
    '--color-icon-accent': [blue.light[45], blue.dark[80]],
    '--color-on-accent': [neutral.light[100], neutral.dark[5]],
  },
})
