/**
 * 설정 화면에서만 쓰는 Astryx 부품. `index.tsx`에 두면 홈이 읽는 첫 화면 코드(메인 청크)에 `CodeBlock`(문법 강조)·`Link`가 딸려 온다.
 * 이 파일은 설정과 그 패널(지연 읽기)만 import하고, `index.tsx`가 다시 내보내지 않는다(PLAN v1.21 SS6).
 */
export { CodeBlock } from '@astryxdesign/core/CodeBlock'
export { Link } from '@astryxdesign/core/Link'
