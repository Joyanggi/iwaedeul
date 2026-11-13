/**
 * 앱이 쓰는 Astryx 테마. 테마에 관한 것은 이 파일에만 둔다.
 * 빌드된 Neutral을 그대로 다시 내보낸다 — 이름이 `neutral`이라 `index.tsx`가 읽는 정적 `theme-neutral/theme.css`가 걸리고,
 * `__built`라 실행 중 주입이 없다. `defineTheme`으로 감싸면 이름이 바뀌어 정적 CSS가 조용히 안 걸린다(PLAN v1.20 "확인한 것" 1).
 */
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

export const appTheme = neutralTheme
