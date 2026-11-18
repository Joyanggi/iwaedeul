# 개발·테스트 내역 (검토용) — v1.21 (SS)

> PLAN-v1.21의 구현 기록. SS0 → SS1 → … 순서로 이어 쓴다.

## 이 환경에서 확인된 제약 (누적 — v1.20 목록을 이어받는다)

1. `npx tsc --noEmit`은 `src`를 검사하지 않는다 → **`npm run build`로 타입 확인**.
2. 개발 브라우저 창은 `visibilityState`가 항상 `hidden`이다 → 소리가 들리지 않고, rAF·focus
   이벤트가 발화하지 않고, 250ms/80ms 인터벌이 ~1Hz로 스로틀된다.
3. vitest에서 `.css`를 `?raw`로 읽으면 **빈 문자열**이 온다 → 색·크기는 브라우저
   `getComputedStyle` 실측으로 확인한다 (이번 라운드에서 diff 줄 대비 6.28:1을 그렇게 쟀다).
4. `computer` 클릭은 pane이 hidden이면 타임아웃된다 → 조작은 `javascript_tool`로 한다.
   **단 `screenshot`은 hidden에서도 찍힌다** (이번에 ▾ 버튼 판정에 그게 결정적이었다).
5. React 렌더 테스트(RTL)가 없다 → 화면 규칙은 **순수 함수 + 소스 스캔** 2층으로 잠근다.
6. `javascript_tool`로 React 이벤트 일부를 재현할 수 없다: `.click()`은 `onPointerDown/Up`을
   발화시키지 않고(→ `PointerEvent` 디스패치), `blur()`는 포커스 없는 문서에서 이벤트를
   만들지 않는다(→ 버블링 `focusout`). **이번 라운드의 버튼들은 `onClick`이라 `.click()`으로
   충분했다.**
7. 소리는 이 창에서 들을 수 없다 (제약 2) → 오디오는 단위 스펙 + `createOscillator` 후킹.
8. `git checkout <파일>`은 커밋되지 않은 작업을 버린다 → 되돌리기는 `cp` 백업으로 한다
   (v1.9에서도 시드 편집 전에 백업을 먼저 떴다).
9. **새로 확인:** `innerText` 부분 문자열 매칭으로 요소를 고르면 안 된다. `find(c =>
   c.innerText.includes('올리브오일'))`이 **닭다리살 칩**을 잡았다 — 그 칩의 문구가
   "200g · 그날 올리브오일 생략"이기 때문이다. 한 번 잘못된 측정값(kcal 330)을 만들었고
   그건 앱 결함이 아니라 **내 선택자 결함**이었다. 인덱스나 정확 일치로 고른다.

10. **새로 확인 (EE3 라운드):** 이 브랜치에 들어올 때 EE3 구현과 테스트는 **이미 `e2d7093`에
    커밋돼 있었다.** 이번 작업은 구현이 아니라 PLAN 검증 항목 대조 · 결함 복원 확인 · 기록이다.
    작업 시작 전에 `git log`와 `grep returnChoiceReason`으로 먼저 확인했다.
11. **새로 확인 (EE2 라운드):** 이 환경의 Bash 도구에서 `python - <<'EOF'` heredoc 본문이 길고
    작은따옴표·백슬래시가 섞이면 셸 파싱이 깨진다(`unexpected EOF while looking for matching`).
12. **새로 확인 (NN1 라운드):** 11번이 또 났다 — 한 Bash 호출에 heredoc을 둘 이상 넣어도 깨진다. 파일은 Write 도구로 쓰고 Bash에는 짧은 명령만 둔다.
13. **새로 확인 (NN1 라운드):** 테스트에서 `node:fs`를 import하면 `npm run build`(타입 확인)가 실패한다(vitest는 통과). 소스 스캔은 `import.meta.glob(..., { query: '?raw' })`로 읽는다.
14. **새로 확인 (OO0 라운드):** 사람이 iOS 27(17.5 이상)을 확인했다 — Astryx 지원 조건 통과. Playwright 1.65.0 + chromium은 이 환경에서 받아졌고 `iPhone 14` 흉내(390×844, 터치, `pointer: coarse`)로 찍힌다(엔진은 chromium. webkit 아님). Playwright 기기 목록의 `iPhone 14` 뷰포트는 390×664라 844로 덮어썼다.
15. **새로 확인 (OO0 라운드):** `page.evaluate`로 보내는 함수는 바깥 스코프의 도우미를 못 본다 → 공유 도우미는 `addInitScript`로 `window.__vis`·`__scrollEnd`에 올려 쓴다.

16. **새로 확인 (OO3 라운드):** 스크린샷은 Playwright의 Chromium으로 찍는다. iOS Safari가 아니라서 `light-dark()`·`@scope`·`@starting-style`·safe-area·`<dialog>`·`dvh`·화면 키보드는 실기기 확인으로만 본다. `package-lock.json`에 `lucide-react`가 들어온다(theme-neutral의 의존성).
17. **새로 확인 (OO3 라운드):** 이 환경에서 Python으로 파일을 읽고 쓰면 CRLF로 저장된다(`git`이 "CRLF will be replaced" 경고를 내고, `v117` 소스 스캔 정규식이 `\n}\n`에서 깨진다). 고치면 `sed -i 's/\r$//'`로 LF로 되돌리거나, 파일 편집은 Edit 도구로 한다. 시트 `--check`는 5분 안팎이라 Bash 포그라운드 한도(10분)에 둘을 이어 돌리면 넘친다 → 하나씩 백그라운드로 돌린다.


18. **새로 확인 (PP0 라운드):** Chromium의 CDP `Emulation.setEmulatedMedia`로 `prefers-reduced-transparency: reduce`와 `prefers-contrast: more`가 **둘 다 먹는다**(흉내 뒤 `matchMedia`가 `true`). 그래서 `투명도 줄이기`·`대비 증가` 검사는 건너뛰지 않고 실제로 잰다. 이 호출은 Playwright가 건 `prefers-color-scheme`을 덮으므로 `features`에 다크를 같이 넣는다.
19. **새로 확인 (PP0 라운드):** WebKit(Playwright webkit v2388, WebKit 27.2)은 `npx playwright install webkit`으로 받아졌고 Windows에서 `before-*-webkit.png` 열 장이 찍힌다. 흐림이 실제로 그려지는지는 PP1·PP2 뒤 `after-*-webkit.png`에서 본다(지금 앱은 시트가 불투명이라 가릴 것이 없다).
20. **새로 확인 (PP0 라운드):** vitest의 `.css` 읽기 결과(`?inline`)는 PP1에서 `glass.css`를 만든 뒤 확인한다. PP0은 CSS를 건드리지 않아 아직 모른다.
    → **PP1에서 확인:** `?inline`도 **빈 문자열**이다(`global.css`·`glass.css`·`index.css` 길이 0). 그래서 CSS 규칙 검사는 `screenshots-glass.mjs --check`의 정적 검사만 두고, `v118.test.ts`에는 `.tsx` 스캔만 둔다.
21. **새로 확인 (PP0 라운드):** Windows에서 Python으로 파일을 읽고 쓰면 CRLF가 된다(제약 17과 같다). 이번에도 스크립트 세 개가 CRLF로 바뀌어 `sed -i 's/\r$//'`로 되돌렸다. 파일 편집은 Edit 도구로 한다.

22. **새로 확인 (PP2 라운드):** 이 환경의 Playwright WebKit(Windows)은 `backdrop-filter`를 **그리지 않는다.** `after-*-webkit.png`에서 탭바·재개 스트립·시트 뒤의 글자가 흐려지지 않고 또렷하게 비친다(`after-home-resume-webkit.png`, `after-sheet-finish-webkit.png`). 계산된 스타일은 값을 갖고 있다. 그래서 WebKit 스크린샷은 "반투명, 흐림 없음"일 때의 모습이지 iOS Safari의 모습이 아니다. 흐림이 실제로 그려지는지는 Chromium 스크린샷과 실기기로만 본다.
23. **새로 확인 (PP2 라운드):** Astryx 입력칸(`TextInput`·`NumberInput`)의 면을 칠하는 것은 `input`이 아니라 감싸는 `div.astryx-text-input`이고 **알파 1**이다. 루틴 편집 시트의 `내용은 불투명`이 처음부터 통과했고(23·19·21개), PLAN이 예비로 둔 `ax.css`의 입력칸 규칙은 **넣지 않았다.**
24. **새로 확인 (PP2 라운드):** `screenshots.mjs`의 `--check` 장면 폭 375에서 시트 가운데 점이 입력칸 위에 떨어지면 `유리 켜짐`이 "안쪽이 면을 칠한다: div.astryx-text-input"로 거짓 실패했다. 입력칸 자체의 면은 의도한 불투명이라 `glass-check.mjs`가 `input`·`textarea`·`astryx-text-input`·`astryx-number-input`을 이 검사에서 센다고 하지 않게 고쳤다(스크롤 영역이 면을 칠하는 결함은 그대로 잡힌다 — 결함 복원 ⑤).


25. **새로 확인 (QQ0):** `@axe-core/playwright` `4.14.0`(2026-10-15 공개), `@argos-ci/cli` `6.11.0`을 devDependency로 고정했다. `onPointerDown` 요소는 `grep -rn onPointerDown src --include=*.tsx` 결과 2건(스테퍼 둘)으로 PLAN과 같다.
26. **새로 확인 (QQ0):** `reducedMotion: 'reduce'` 흉내(`page.emulateMedia`)가 이 Chromium에서 먹는다(`matchMedia` true). axe는 유리 위 글자 대비를 `incomplete`로 낸다(장면마다 2~59노드) — 그래서 `color-contrast`는 찍기만 하고 실패로 세지 않는다.
27. **새로 확인 (QQ0):** 눌림 검사의 `mouse.up`을 (2,2)에서 하면 legacy 시트의 막이 클릭을 받아 시트가 닫힌다(공통 조상 click). 화면 밖 `(-1,-1)`에서 하면 닫히지 않는다.
28. **새로 확인 (QQ0):** Astryx 화면(`editor`·`line-sheet`)에서는 `mouse.down`이 눌림 추적기를 칠하지 않는다(이 `iPhone 14` 흉내에서 `editor` 21개 중 7개만, `line-sheet` 29개 전부 변화 없음). PLAN 지시대로 두 장면의 `눌림 반응`은 `건너뜀`으로 두고(검사에서 뺀다) 멈추지 않았다.
29. **새로 확인 (QQ0):** `astryx-inventory`의 인라인 여백은 181곳(PLAN "약 180"과 같은 범위), `.tsx` 48개·Astryx 4개·인라인 273곳은 PLAN 표와 같다.

30. **새로 확인 (RR0):** 제약 17이 또 났다 — Python(`open(…, 'w')`)과 Write·Edit 도구로 고친 스크립트·테스트 8개가 전부 CRLF로 저장돼 있었다(`git`이 "CRLF will be replaced" 경고를 내고, 줄바꿈을 `\n`으로 찾는 `v120` 스캔이 안 맞았다). 커밋 전에 `sed -i 's/\r$//' <파일>`로 LF로 돌렸다. 뒤 작업도 커밋 전에 `grep -c $'\r' <파일>`로 본다.
31. **새로 확인 (RR0):** 유리 검사(`glassVerdict`)가 CDP `Emulation.setEmulatedMedia`로 `prefers-color-scheme`을 흉내 낸 뒤 `detach`하면, **그 장면의 그 뒤 측정에서 색 체계가 라이트로 풀린다.** `테마 토큰` 칸을 유리 칸 뒤에서 재자 `line-sheet`(다크)의 문서 배경이 라이트 값(241)으로 읽혔다(`editor`는 유리 칸이 비어 CDP를 안 써서 멀쩡했다). 그래서 새 칸 다섯은 **유리 칸보다 먼저** 잰다(`v120` 스캔이 순서를 잠근다). 스크린샷은 검사 전에 찍으므로 영향이 없다.
32. **새로 확인 (RR0):** `ui-check before --check`는 장면 28 × 다크·라이트 56장을 5분 30초에 끝낸다(Bash 포그라운드 한도 10분 안). 일부 접근성 실패는 RR0 전부터 있던 것이다(`session`·`sheet-food`의 `label-content-name-mismatch` — 아래 표). 종료 코드 1은 RR0 전에도 1이었다.
33. **새로 확인 (RR0):** `first-screen.mjs`의 값은 PLAN "확인한 것" 3(923ms·271ms)보다 작다 — 끝 조건(`#root` 글자 20자 초과 + "불러오는 중" 없음)과 기계가 다르다. **RR1은 이 기록의 값과 견준다**(PLAN의 값이 아니다).
34. **새로 확인 (RR1):** `<Theme>`은 `<html>`에 `data-astryx-theme`만 다는 게 아니라 앱을 감싸는 `<div class="xjp7ctv …">`(`display: contents`)를 만들고, 거기에 `font-family: Figtree`·`color: #fff`를 건다. 안 옮긴 화면이 이것을 상속해 글자 폭이 달라졌다(`--same-layout`이 잡았다). 정적 `theme-neutral/theme.css`는 `@layer reset`에 `h1`~`h6`·`p`·`small`·`code`·`pre`·`hr` 요소 규칙도 문서 전체에 건다. 둘 다 `global.css`의 legacy `@scope` 안에서 되돌렸다.
35. **새로 확인 (RR1):** CSS `@scope (…) to (…)`는 이 Chromium과 vite 빌드에서 그대로 살아남는다(`dist`의 `index-*.css`에서 글자 그대로 확인). `:where(:scope) { … }`로 뿌리에 명시도 0 규칙을 걸 수 있다. 다만 `ax.css` 리셋의 `to (…)` 한계를 빼도 `--same-layout=settings`는 통과한다 — 이 검사는 그 구멍을 못 잡고 `scripts/legacy-scope.test.mjs`가 잡는다.
36. **새로 확인 (RR1):** `.css`를 읽는 스캔은 `src/`의 테스트에서 못 한다(제약 3·13). `scripts/*.test.mjs`는 `node:fs`를 쓸 수 있고 `npm test`가 같이 돌린다(`scripts/check.test.mjs`가 그 예). CSS 스캔은 거기에 둔다.
37. **새로 확인 (RR1):** 테마를 앱 뿌리에 올리면 `--duration-fast`가 `<html>`에서 읽혀(125ms) `measurePress`의 기다림이 짧아진다 → 눌림 검사가 무작위로 `안 돌아옴`. 기다림에 하한(195ms)을 뒀다. `ui-check`를 `--only`로 한 장면씩 돌리면 같은 요소가 통과하므로 무작위 실패는 하네스 쪽이다.

38. **새로 확인 (SS0):** `ui-check before --check`는 장면 약 77개 × 다크·라이트를 **약 17분**에 끝낸다(RR0의 5분 30초에서 늘었다). 그래서 이 환경의 Bash 포그라운드 한도(10분)를 넘는다 — 백그라운드로 돌리고 로그의 `exit` 줄을 기다린다.
39. **새로 확인 (SS0):** Bash 도구의 heredoc 안 `\n`·`\n`이 실제 줄바꿈으로 풀려 JS 템플릿 문자열이 깨진다(제약 11·12의 변종). 정규식·이스케이프가 든 코드는 Edit·Write 도구로 쓴다.
40. **새로 확인 (SS0):** `docs/screenshots/<ver>`의 `--ver`는 `v숫자.숫자` 꼴만 받는다(`v1.21x`는 종료 코드 2). 결함 복원용 임시 폴더는 `--ver=v9.99`로 찍고 지운다.
41. **새로 확인 (SS0):** 유산소 종류 알약과 Day 변경 후보가 같은 `.pill-row`라, `.pill-row` 버튼으로 Day를 고르면 유산소 알약을 누른다. Day 후보는 안내 문구 바로 뒤 형제로 고른다.
42. **새로 확인 (SS0):** `ARGOS_TOKEN`이 이 환경에 없어 `argos-upload.mjs before`는 `Argos 건너뜀`으로 끝난다(판정 아님, 종료 코드 0).
43. **새로 확인 (SS2):** Astryx `Collapsible`은 `defaultIsOpen`의 기본이 **true**(열림)다. 처음 닫으려면 `defaultIsOpen={false}`.
44. **새로 확인 (SS2):** `TimeInput`·`CheckboxList`를 `src/ax/index.tsx`가 읽으면 메인 청크가 약 87KB(gzip) 는다(353.5 → 441KB). 식단 전용 부품은 `src/ax/diet.tsx`(지연 화면만 import)에 둔다. `index.tsx`가 다시 내보내도 메인에 들어온다.
45. **새로 확인 (SS2):** Astryx `Item`은 줄마다 위·아래 8px 안쪽 여백이 있고 `as="button"`은 `nested-interactive`를 낸다. `ToggleButton`은 안 눌렸을 때 맨 글자라 `className="ax-toggle"`이 필요하다. `Button`의 `endContent`·`width`는 있고 `Heading`에 `hasTabularNumbers`, `HStack`에 `align="baseline"`은 없다.
46. **새로 확인 (SS5):** `ui-check --only=<장면>`은 `-light` 장면을 안 붙이면 라이트 쪽을 안 돌아서 `차트 색 … 다크·라이트 한 쪽을 못 쟀다`로 실패한다 — 분석만 볼 때는 `--only=analyze,…,analyze-light,…`로 둘 다 준다.
47. **새로 확인 (SS5):** Astryx `ToggleButton`의 `textContent`는 보이는 글자의 두 배(`암 풀다운 D2 · B암 풀다운 D2 · B` — 안 보이는 라벨 사본)다. 칩 이름은 `innerText`로 읽는다.
48. **새로 확인 (SS5):** Stryker 샌드박스는 소스를 바꿔 끼운다 — `?raw`로 소스 글자를 읽는 테스트는 초기 실행에서 깨진다(`chartTheme.ts`의 `TOKEN`). 동작(문서 흉내가 묻는 토큰 이름)으로 재야 한다. 실패한 Stryker 실행은 `.stryker-tmp`를 남기고 vitest가 그 안의 테스트를 또 돌려 가짜 실패를 낸다 — 지우고 다시 돌린다(git 무시 폴더).
49. **새로 확인 (SS5):** `npm run mutation`은 기본으로 **커밋된** 변경(`origin/main...HEAD`)만 대상으로 삼아 커밋 전에는 "대상 없음"이다 — 파일 경로를 인자로 준다.
50. **새로 확인 (SS5):** `chartColor`가 읽는 토큰 값은 `light-dark(…)` 글자라 SVG `stroke`·`fill`에 그대로 넣어도 색 체계 전환(`emulateMedia`)을 따라간다. 화면 모듈 맨 위에서 한 번 읽어도 새로 고침 없이 바뀐다(흐름 `SS5 실행 중 색 체계 전환`).

---

## SS0. 도구와 기준선

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `scripts/ui-check.mjs` | `requiredScene`(준비가 던지거나 기대한 장면을 못 찍으면 칸 전부 `실패`·`장면 실패 N건`·종료 코드 1, `--check` 없이도), 새 장면 24개(다크·라이트), 도우미 `wrapProbe`·`at375`·`withFreshPage`, 시드 도우미(`inPageDietSeed/Restore`·`inPageNoteSeed`), GitHub 호출 막기·세기 |
| `scripts/first-load.mjs`, `scripts/lib/first-load-lib.mjs` | 첫 화면 gzip 크기 도구(`collectFirstLoad`). `--check`는 360KB 한계. SS0에서는 `check.mjs`에 안 넣는다 |
| `scripts/astryx-inventory.mjs`, `docs/ASTRYX-INVENTORY.md` | `NOT_SCREENS`(`main.tsx`·`icons.tsx`)를 첫째 숫자에서 뺀다. 합계 줄에 `화면이 아니라 뺀 것 2개`가 늘었고 `--check` 정규식도 맞췄다 |
| `scripts/ss0.test.mjs` | SS0 스캔·`collectFirstLoad`·`first-load.mjs` 종료 코드·알려진 실패 테스트 24개(최초 14 → 리뷰 반영 후 24) |
| `scripts/lib/ui-check-lib.mjs` | (리뷰 반영) `KNOWN_FAILURES`·`applyKnownFailures` |
| `docs/screenshots/v1.21/before/` | 153장 + `layout.json` (장면 77개 × 다크·라이트, 온보딩 홈 화면 앱·빈 분석은 별도 문맥) |
| `docs/DEV-RECORD-v1.21.md` | 이 기록 |

`optional(`은 `home-375` 같은 앞 라운드 장면 열여섯 곳에 남아 있어 지우지 않았다(PLAN: 쓰는 곳이 0이 되면 지운다). 남은 화면의 다섯 장면과 새 장면은 전부 `requiredScene`이다. `src/`는 안 바꿨다(앱 동작·번들 그대로).

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| `requiredScene`·다섯 장면이 `optional(` 밖·`catch`가 표에 넣는 갈래 | `ss0.test.mjs`: `v121 SS0: ui-check.mjs에 requiredScene이 있고…`, `…장면 다섯이 optional( 호출 안에 없다`, `…새 장면이 전부 requiredScene 이름이나 snap 호출에 있다` |
| `collectFirstLoad` ①②③과 속성 | `v121 SS0: 스크립트 하나와 CSS 하나…`, `…script와 modulepreload에 둘 다…`, `…nomodule·rel=icon…`, `v121 SS0 속성: 어떤 태그를 섞어도…` |
| `first-load.mjs` 종료 코드 1 셋 | `first-load.mjs 종료 코드` 묶음(dist 없음·스크립트 0개·없는 파일 → 1, 정상 → 0) |
| `first-load.mjs` 출력을 기록, `vite build` gzip과 같은지 | 아래 표 |
| `astryx-inventory --check` 23 → 21, 두 파일 `제외` | 아래 확인, `v121 SS0: NOT_SCREENS가…` |
| `ui-check before --check`: 장면 실패 0개 | 아래 |
| 결함 복원 ⑳ | 아래 표 |
| 시드를 `finally`에서 지운다·GitHub 호출 0건 | `v121 SS0: 심은 시드는 finally에서…`, `…가짜 토큰 장면은 GitHub 호출을 막고…`, 흐름 `settings-gist GitHub을 부르지 않는다`(통과) |

### 첫 화면 크기 (`npm run build && node scripts/first-load.mjs`)

| 파일 | `first-load` gzip | `vite build`의 gzip |
|---|---|---|
| `assets/index-CHnxlm00.js` | 423.91 | 423.91 |
| `assets/index-Deurkv2C.css` | 49.98 | 49.98 |
| 합 | **473.89KB** (한계 360KB — 지금은 `--check` 없이 기록만, `--check`는 종료 코드 1) | |

### 인벤토리

`node scripts/astryx-inventory.mjs --check`: Astryx를 안 읽는 화면 파일 **23 → 21**(`icons.tsx`·`main.tsx`는 `제외`), 인라인 스타일 51 → 51, legacy 클래스 쓰임 270 → 270, 안 쓰는 선택자 0 → 0.

### `ui-check before --check --ver=v1.21` 결과

- 종료 코드 **1**. `장면 실패 0건`(requiredScene), 스크린샷 153장. `home-banners-open`은 앞 라운드의 `optional` 건너뜀(이번 작업 밖).
- 종료 코드 1의 이유는 **새 장면이 처음 드러낸 legacy 화면의 칸 실패 셋**이다(PLAN "전부터 있던 실패로 넘기는 칸은 없다"에 따라 그대로 적는다 — 해당 화면을 옮기는 작업이 고친다):

| 장면 | 칸 | 내용 | 고칠 작업 |
|---|---|---|---|
| `analyze-empty` | 여백 격자 | `p.center-note` 위·아래 13px | SS5(분석) |
| `settings-export-preview` | 접근성 | `scrollable-region-focusable` 1건 (`pre` — 미리보기 글 상자) | SS6(설정, `CodeBlock`) |
| `settings-export-preview` | 눌림 반응 | `"GitHub에서 토큰 발급"` `.ext-link` 변화 없음 | SS6(`Link`) |

- 새 장면 중 장면 준비가 막혔던 것 하나를 고쳤다: `history-detail-change`가 `.pill-row`로 Day를 골라 유산소 알약을 눌렀다(제약 41) → 안내 문구 뒤 형제로.

### 390·375 폭 글자 중간 꺾임 기록 (판정 아님 — 화면을 옮기는 작업이 `<장면> 390·375 폭 글자 중간 꺾임 없음` 흐름으로 건다)

| 장면 | 390 | 375 |
|---|---|---|
| onboarding | 2건 | 4건 |
| history | 0 | 0 |
| history-exercise-detail | 0 | 1건 |
| history-detail | 0 | 1건 |
| analyze | 1건 | 0 |
| diet | 2건 | 5건 |
| diet-streak | 4건 | 5건 |
| sheet-diet-plan | 1건 | 1건 |
| sheet-diet-slot | 0 | 0 |
| sheet-diet-variant | 2건 | 4건 |
| settings | 15건 | 20건 |
| settings-gist | 13건 | 19건 |

(`0점` 같은 숫자+단위 쌍은 `inPageMidWordBreaks`가 이웃 글자 노드를 한 덩어리로 보므로 이 목록에 들어간다. 샘플 글자는 `ui-check` 로그에 남는다.)

### 결함 복원

| 되살린 결함 | 실패한 검사 | 원상복구 |
|---|---|---|
| 새 장면 준비 선택자를 틀리게(`onboarding-standalone`의 `홈 화면 앱으로 실행 중입니다X`, `settings-gist`의 `토큰 저장됨X`) — PLAN ⑳ | 두 장면 `장면 실패`(칸 전부 실패), 종료 코드 **1**. `settings-gist`의 `finally`로 가짜 토큰이 지워졌다 | `cmp`로 백업과 같음 |
| `settings-open`을 `optional(`로 되돌림 | `ss0.test.mjs` `…장면 다섯이 optional( 호출 안에 없다` 실패 | `cmp` 같음, 14개 통과 |
| (리뷰 반영) `first-load.mjs` 35행(`fail('index.html에 모듈 스크립트 태그가 없다')`) 지움 | `…스크립트 태그가 0개면 종료 코드 1 (적힌 CSS는 실제로 있다)`, `…빈 index.html(<html></html>)도 종료 코드 1` 둘 실패(전엔 14개 그대로 통과했다) | `cmp` 같음 |
| (리뷰 반영, ㉔) `applyKnownFailures`의 상세 비교(`cell.detail === k.detail`)를 지움 | `…상세가 한 글자 다르면 실패 그대로`, `…장면 실패 행…은 하나도 안 바뀐다` 실패 | `cmp` 같음 |
| (리뷰 반영, ㉔) `KNOWN_FAILURES`에 넷째 항목(`settings-gist`·`접근성`)을 더함 | `…KNOWN_FAILURES는 늘지 않는다…` 외 3개 실패 | `cmp` 같음 |
| (리뷰 반영, ㉔) `KNOWN_FAILURES`의 `analyze-empty` 항목 `detail`을 한 글자(`13px`→`12px`) 바꿈 → `ui-check after --check --only=analyze-empty,settings-export-preview` | 그 칸이 `실패`로 남고 `알려진 실패 2건`, 종료 코드 **1** (정상은 3건·종료 코드 0) | `cmp` 같음 |

### 리뷰 반영 (SS0 반려 → 고침 커밋, PLAN 개정 1)

- **고칠 것 1:** `first-load.mjs` 종료 코드 1 테스트가 이유(`stderr`)까지 단언한다. 스크립트 0개 테스트는 적힌 `a.css`를 실제로 만들고, 빈 `<html></html>` 테스트를 더했다. (`ss0.test.mjs` 14 → 15 + 알려진 실패 9 = 24개.) `firstLoadScript`는 `fileURLToPath`로 바꿨다.
- **고칠 것 2 — 알려진 실패(개정 1):** `scripts/lib/ui-check-lib.mjs`에 `KNOWN_FAILURES`(`analyze-empty`·여백 격자·SS5, `settings-export-preview`·접근성·SS6, `settings-export-preview`·눌림 반응·SS6)와 `applyKnownFailures`. `ui-check.mjs`의 `printResults`가 `after`에서만 건다: `알려진 실패`는 실패에 세지 않고 `- 알려진 실패 … (<until>이 고친다)`와 `알려진 실패 N건`을 찍고, `stale`은 `실패`로 센다. `before`에는 안 건다. `detail`은 `before --check`를 이 커밋에서 다시 돌려 얻은 글자 그대로. 테스트 9개(`v121 SS0 — 알려진 실패 (개정 1)` 묶음: PLAN ①~⑥, 속성, 늘지 않음, 스캔).
- **재실행 결과** (`--ver=v9.99`로 찍고 지움): `ui-check after --check` 종료 코드 **0**, `장면 실패 0건`, **`알려진 실패 3건`**(세 칸 모두 `- 알려진 실패 … (SS5/SS6이 고친다)`로 찍힘). `before --check`는 알려진 실패를 걸지 않는 기준선이라(PLAN) 종료 코드 **1** 그대로이고 `실패`는 같은 세 칸뿐, `장면 실패 0건`. 결함 복원 ㉔ 확인은 결함 복원 표.
- 경미한 점: `v121.test.ts`(PLAN 설계 표)는 이 SS0에서 안 만든다 — 스캔을 `ss0.test.mjs`에 뒀고 빈 vitest 파일은 실패하므로 처음 쓰는 SS1에서 만든다. 흐름 RR8·`Day 선택 시트 375`의 재는 뿌리를 `'dialog[open]'` → `'dialog[open], .sheet'`로 넓힌 이유: 식단·기록 시트 일부가 아직 legacy `.sheet`(`<dialog>`가 아님)라 `dialog[open]`만으로는 시트를 못 찾아 글자 꺾임 기록이 빈 채로 나왔다(Astryx 시트로 옮겨지면 `dialog[open]`이 잡는다). `querySelector`는 문서 순서상 첫 요소를 고르지만 legacy `.sheet`는 열릴 때만 렌더돼 둘이 함께 떠 있지 않다.

### 하지 않은 것

- 변이 테스트: `src/lib`를 안 바꿨다(대상 없음).
- `docs/screenshots/v1.21/before`의 Argos 올리기: `ARGOS_TOKEN`이 없어 건너뜀(제약 42).
- 첫 화면 **시간** 판정, 가져오기·Gist 복원의 "파일을 고른 뒤" 상태(파일 고르기 창을 흉내 낼 수 없다 — SS6의 스캔과 화면 검증의 사진으로만 본다): PLAN 범위 제외.
- README 반영: 없음(PLAN이 없다고 적었다).

### 실기기·사람 눈 확인 목록

- `before` 폴더의 새 장면마다 다크·라이트 두 장이 의도한 상태인가(시트가 열려 있다, 폼이 펼쳐져 있다, 끝까지 스크롤됐다) — 화면 검증자.

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드). `Test Files  79 passed (79)`, `Tests  1818 passed (1818)`(리뷰 반영 후 — 최초 1808). 빌드 성공.
- `git rev-list --count main..HEAD`: 커밋 전 0 → 이 작업 커밋 1개.

## SS1. 첫 화면 코드 분할

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(`feat(SS1): …`) — 해시는 `git log`. 바뀐 파일 9개 |
| 바뀐 파일 | `src/App.tsx`(`LOADERS`·`PRELOAD`·미리 읽기·`Suspense`), `src/ax/index.tsx`(시트 `lazy`·`preloadSheet`), `scripts/check.mjs`·`.github/workflows/ci.yml`(`첫 화면 크기` 단계), `scripts/check.test.mjs`, `scripts/ui-check.mjs`(`runLazyFlows`), `src/lib/v121.test.ts`(새), `README.md`, 이 기록 |
| 테스트 | `Test Files 80 passed (80)` · `Tests 1825 passed (1825)` (SS0 뒤 79/1818 → 새 파일 1, 새 테스트 7) |
| 수정표 안 | `scripts/check.test.mjs`: `빌드만 --fast에서 빠진다` → `빌드와 첫 화면 크기만 --fast에서 빠진다` |
| 수정표 밖 | 없음(`v117`의 "astryxdesign은 src/ax 밖" 스캔이 새 테스트의 패키지 이름 글자를 잡아, 그 테스트가 이름을 조립해 적는다 — 기존 테스트는 안 고쳤다) |

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| 정적 import 0건·홈 정적 | `v121 SS1: 홈 밖 화면 여섯은 정적 import가 0건이고 홈은 정적이다` |
| `LOADERS` 여섯·`PRELOAD`에 onboarding 없음 | `v121 SS1: LOADERS의 열쇠가 여섯이고 PRELOAD에 onboarding이 없다` |
| 분석·루틴 편집 import 각 한 번, `lazy(() => ` 뒤에만 | `v121 SS1: 분석·루틴 편집 import는 각각 한 번, …` |
| 미리 읽기(1초·`catch`·`clearTimeout`) | `v121 SS1: 미리 읽기는 PRELOAD와 preloadSheet를 setTimeout 뒤에 …` |
| `Bar`가 탭 내용 `Suspense` 밖 | `v121 SS1: 탭바(<Bar position="bottom">)는 탭 내용 Suspense 뒤에 있고 그 Suspense 밖에 있다` |
| 시트 `import type` 한 줄·`lazy`·`preloadSheet` | `v121 SS1: BottomSheet는 import type 한 줄뿐이고 …` (+ 닫기 로직 그대로 1건) |
| `check.test.mjs` `slow` 단언 옮김 | `빌드와 첫 화면 크기만 --fast에서 빠진다` (`ci.yml`·`STEPS` 같음 단언은 안 고치고 통과) |
| 안 고치고 통과 | `timerOwnership`·`v117`·`v120` RR1·RR3·`audioRecovery` 전부 통과 |
| 새 흐름 ①②③ | 아래 `ui-check` 표 |

### 첫 화면 크기 (`npm run build && node scripts/first-load.mjs --check`)

| 파일 | gzip(kB) |
|---|---|
| `assets/index-DPQmOdO6.js` | 303.52 |
| `assets/index-Deurkv2C.css` | 49.98 |
| **합** | **353.50** (한계 360KB, 통과. SS0 기준선 473.89KB) |

`node scripts/first-screen.mjs`(판정 안 함): 캐시 없는 첫 방문 **786ms**, 다시 열기 **601ms** (RR10 값 740ms·300ms과 나란히).
서비스워커 precache: **45개, 2668.75 KiB** (청크가 늘었다 — 오프라인에서 여는 데 새로 필요한 것은 없다).
인벤토리 `--check`: 화면 아닌 파일 21→21, 인라인 스타일 51→51, legacy 클래스 쓰임 270→270, 안 쓰는 선택자 0→0(표 안 바뀜 — 화면 파일을 안 고쳤다).

### `ui-check after --check --ver=v1.21 --same-layout=all`

- 종료 코드 0 상당: `장면 실패 0건`, `알려진 실패 3건`(`KNOWN_FAILURES` 세 칸만), `- 실패` 0줄, 흐름 통과 107건·실패 0건, 배치 같음 전 장면 통과(화면이 그대로다).
- 새 흐름 셋(`runLazyFlows` — 전부 `guardedLazyFlow`라 예외는 흐름 실패로 센다. 0개 통과 없음: ②는 화면 다섯·시트 청크를 각각 1개 이상 세고 하나라도 0이면 실패, ③은 미리 읽기 전에 눌렀는지도 판정):

| 흐름 | 결과 |
|---|---|
| `지연 화면 오프라인` | 통과: 네트워크를 끊고 새로 고침 → 홈 → 세션·요약·식단·기록·설정·분석 화면이 열렸다 |
| `미리 읽기` | 통과: `SessionScreen-`1 `SummaryScreen-`1 `DietScreen-`1 `HistoryScreen-`1 `SettingsScreen-`1 시트 1 · 분석 0 |
| `시트 첫 열기` | 통과: 미리 읽기 전에 눌렀고(청크 요청 전) 누른 뒤 시트 청크가 요청돼 Day 선택 시트가 떴다 |

- 시트 청크는 Rollup이 `index-….js`로 이름 짓는다(`BottomSheet-` 접두사가 아니다). 흐름은 `dist/index.html`이 적은 것이 아닌 두 번째 `index-…js`로 가린다.
- 390·375 폭 글자 꺾임: 이 작업은 화면 마크업을 안 바꿔서(배치 같음 통과) 기존 흐름의 `390·375 글자 중간 꺾임 없음`이 전부 통과한 것으로 갈음한다. 로딩 대체 화면("불러오는 중…")은 `Center` 안 한 줄이다.

### 결함 복원

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| ① `DietScreen`을 다시 정적 import | `v121 SS1: 홈 밖 화면 여섯은 정적 import가 0건이고 …` | `cmp` 같음 |
| ② `PRELOAD` 줄 앞에 `void import('./screens/AnalyzeScreen')` | `v121 SS1: 분석·루틴 편집 import는 각각 한 번, …` | `cmp` 같음 |
| ③ `FIRST_LOAD_BUDGET_KB`를 300으로 / `dist` 치움 | `first-load --check` 종료 코드 1 / 종료 코드 1(빈 통과 아님) | 되돌림·`git status` 확인 |

### 하지 않은 것

- 결함 ②의 `미리 읽기` 흐름 쪽 실패 확인(ui-check 전체가 10분쯤 걸려 안 돌렸다 — 소스 스캔 쪽 실패만 확인). 흐름은 분석 청크 요청 수가 0이 아니면 실패하도록 짰다.
- `src/lib` 판정 함수는 안 바꿨다 → 변이·속성 테스트 대상 없음.
- `docs/screenshots/v1.21/after/`는 커밋하지 않는다(재생성 가능).

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드·첫 화면 크기). `Test Files  80 passed (80)`, `Tests  1825 passed (1825)`. 빌드 성공.
- `git rev-list --count main..HEAD`: 커밋 전 3 → 이 작업 커밋 후 4.

---

## SS2. 식단 탭

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(`feat(SS2): …`) — 해시는 `git log`. |
| 바뀐 파일 | `src/screens/DietScreen.tsx`·`src/components/DietDayEditor.tsx`·`MealReminderPanel.tsx`(Astryx로), `src/ax/index.tsx`(`Loading`)·`src/ax/diet.tsx`(새: `TimeField`·`CheckboxList`)·`src/ax/parts.css`, `src/App.tsx`(`Loading`을 `src/ax`에서), `src/components/NumberStepper.tsx`(`fieldWidth` — 화면 검증 반려 반영), `src/styles/global.css`·`space.css`(식단 규칙 삭제), `scripts/ui-check.mjs`·`scripts/lib/ui-space.mjs`·`ui-check-lib.mjs`(장면·흐름·판정), `scripts/astryx-inventory.mjs`, 테스트, `README.md`, `docs/ASTRYX-INVENTORY.md`, `docs/screenshots/v1.21/after`(식단·기록 장면만), 이 기록 |
| 테스트 | `Test Files 81 passed (81)` · `Tests 1839 passed (1839)` (SS1 뒤 80/1825 → 새 파일 1 `scripts/ss2.test.mjs`, 새 테스트 14: `v121` SS2 8 + `ss2.test.mjs` 6) |
| 옮긴 스캔(수정표 안) | `uiConsistency` X6(식단 줄) `btn-danger` → `/btn-danger\|variant="destructive"/`, `v120` RR7의 `DietDayEditor` 줄 `isProminent\|ax-scope` → `isProminent`만, `v120` RR3 `<Spinner />` `App.tsx` → `src/ax/index.tsx`의 `Loading` 본문 |
| 수정표 밖 | `scripts/rr10.test.mjs`: `.diet-mark-btn·.diet-mark-<등급>은 남는다` → 없다(PLAN이 지우라고 한 규칙) · `scripts/rr7.test.mjs`: `.btn-row > .ax-scope` 규칙이 있다 → `.btn-row`가 `parts.css`에 없다(PLAN이 지우라고 한 규칙, 줄 정렬은 ui-check 흐름 `SS2 먹은 것 줄`이 잰다. 주석의 "세 요소 한 줄"은 `80b53f1` 뒤 "시각 칸·스테퍼 한 줄, 삭제는 둘째 줄"로 고쳤다) · `v120.test.ts` RR3 "새 .tsx 파일 없음": `src/ax`의 `.tsx`가 `index.tsx` 하나 → `diet.tsx`·`index.tsx`(아래 1) |

### PLAN과 다르게 한 것 (이유)

1. **`TimeField`·`CheckboxList`는 `src/ax/diet.tsx`에 있다(PLAN: `src/ax/index.tsx`).** `index.tsx`에 두자 메인 청크에 `TimeInput`·`CheckboxList`가 딸려 와 첫 화면이 353.5 → 440.97KB(gzip)로 360KB 기준을 넘었다(`first-load --check` 실패). 식단 화면(지연 읽기)만 import하는 별도 파일로 나누고 `index.tsx`는 다시 내보내지 않는다. SS3 `RadioList`·`ScrollableArea`, SS6 `CodeBlock`·`Link`도 홈이 안 쓰면 같은 이유로 `index.tsx`가 아니라 지연 화면 쪽 파일에 둬야 한다(SS3·SS6 구현자에게).
2. **끼니 머리는 `Item`이 아니라 글자 + `Button variant="secondary" size="sm"` `대체·안 먹음`이다.** `Item as="button"`은 `nested-interactive`(접근성 실패 5건), 기본 `Item`은 위 여백 8px 때문에 `안쪽 대칭` 위 23·아래 15였다. 시트 여는 버튼의 접근성 이름은 `대체·안 먹음 — <끼니>`(보이는 글자가 앞).
3. **`ToggleButton`(원형·품목)에 `className="ax-toggle"`** (v1.20 RR7의 알약 모양 — 안 눌렸을 때 맨 글자가 되지 않게. 첫 스크린샷에서 맨 글자였다). `className=` 허용 이름에 `ax-toggle`·`ax-scope ax-diet`(편집기 맨 바깥 — 기록 화면 안에서도 한글 줄바꿈 규칙이 걸리게)가 더해졌다.
4. 요약 카드 첫 줄이 단백질 숫자(글자)이고 플랜 버튼이 같은 줄 오른쪽이다(`같은 역할`의 `카드 안쪽`이 첫 글자 왼쪽 여백을 재는데 버튼의 아이콘이 먼저 오면 51px로 읽혔다). `Heading`에 `hasTabularNumbers`가, `HStack`에 `align="baseline"`이 없어 `end` 정렬로 갈음.
5. 먹은 것 줄의 `삭제`는 `size="sm"`이 아니다(기본 36px). RR7 흐름이 요구하던 44px는 legacy `.btn`의 값이라 Astryx 기본 높이 36px(요약 `홈으로` 버튼과 같다)로 낮췄다 — 흐름 이름은 v120 스캔이 묶고 있어 그대로 두고 판정값(≥36)만 바꿨다.
6. `안쪽 대칭` 측정 보강(`ui-space.mjs`): 입력칸의 상자를 `<input>`이 아니라 눈에 보이는 테두리 상자로 잰다(Astryx 입력칸은 `<input>`이 테두리 상자 안쪽 5~6px에 있어 메모 카드가 위 15·아래 21로 읽혔다). 기존 장면(홈·요약·편집기)은 전부 통과 그대로.
7. `inPageWarnColor` → `inPageToneColor`(`tone` 인수, 기본 `warning`): PLAN이 이 이름을 가정했고 오류 토큰을 같은 흐름으로 잰다.
8. 편집기가 든 legacy 화면 `history-day`·`history-detail-end`의 `EXPECTED_PAIRS`는 카드·버튼만(`history-detail-end`는 카드)이다.

9. **먹은 것 줄의 삭제는 둘째 줄 전체 폭(크기 기본)이다(PLAN 설계 표 `HStack` 한 줄·검증 ③ "세 요소 한 줄 ≤ 2px"를 "시각 칸·스테퍼 한 줄 + 삭제 둘째 줄"로 바꿈, `80b53f1`).** 375 폭에서 카드 안쪽은 약 313px인데 시각 칸 면(Astryx 최소 120)·스테퍼(36+64+36)·삭제·간격을 더하면 한 줄에 안 들어간다. 삭제는 `VStack gap 2`의 둘째 줄이고 폭은 390에서 326·375에서 311px, 높이 36px이다. 흐름 `SS2 먹은 것 줄`의 세로 가운데 비교는 시각 칸·스테퍼 둘만 잰다(삭제의 잘림·겹침은 화면 검증자 흐름이 잰다). 탭 수는 그대로다.
10. **`바꾸기`는 `ghost`·`sm`이 아니라 `variant="secondary"`·기본 크기다.** `ghost`는 안 눌렸을 때 맨 글자였고 `sm`(28px)이라 칩(36px) 줄에서 4px 떴다(화면 검증 반려 둘). 지금은 칩과 같은 36px, 세로 가운데 차 0.
11. **`TimeField width={120}`·`NumberStepper fieldWidth={64}`(px 폭).** 시각 칸 면은 Astryx 최소 폭이 120px라 112를 주면 면이 칸 밖으로 8px 삐져나와 `−`에 붙었다(`4be8944`가 112, `80b53f1`이 120으로 고침). 개수 칸 64는 스테퍼 줄(36+64+36)이 시각 칸 120 옆에서 375 안쪽 폭에 들어가면서 개수 값이 잘리지 않는 폭이다(검증자 흐름 "잘림 없음"이 잰다). `src/ax`의 `Stepper inputWidth`(줄 시트)가 선례이고 버튼 높이·글자 크기를 다시 정하는 것이 아니다.
12. **PLAN 파일 목록 밖인 `src/components/NumberStepper.tsx`에 `fieldWidth` 속성을 더했다**(`4be8944`). 기본값 `'100%'`(전에는 `width="100%"` 고정)라 세트 행 같은 다른 쓰는 곳은 그대로다. 먹은 것 줄만 `64`를 준다.

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| 세 파일 `className=`·`style=`·`<button`·`<input`·`var(--`·`padding=` | `v121 SS2: className=은 ax- 이름뿐이고 …` |
| `전부 먹음`·품목 `ToggleButton`의 `isPressed` | `v121 SS2: 끼니 원형 버튼은 isPressed=… 품목 버튼은 isPressed={on}이다 …` + 흐름 `SS2 끼니 전부 먹음 1탭`(부분 등급은 눌림 아님) |
| 문구 | `v121 SS2: 문구가 세 파일에 그대로 있다` |
| `Loading`·`TimeField`(`native`·`AX_NO_AUTOFILL`), `App`에 `function Loading` 없음 | `v121 SS2: Loading은 src/ax/index.tsx, TimeField·CheckboxList는 src/ax/diet.tsx …` |
| 위험 구역·식사 알림·편집기 바깥·로직 줄 | `v121 SS2` 나머지 4건(`variant="destructive"`, `defaultIsOpen={false}`, `ax-scope ax-diet`, `seedVariantChoices`·`decimals={2}`) |
| CSS(`.ax-text-error`·`.ax-text-success` 세 겹, `.ax-slot-mark`, `.ax-diet`, 지운 규칙) | `scripts/ss2.test.mjs` 6건(fs로 읽음) |
| 옮긴 스캔 셋 | 위 범위 표 |
| `ui-check after --check` 장면 `diet` `diet-end` `diet-375` `diet-log-open` `diet-streak` `history-day` `history-detail-end` | 아래 |
| 경계(플랜 없음·기록 없는 날·변형·먹은 것 0건·4일/3일 연속) | 로직 줄은 안 바꿨고 기존 로직 테스트가 본다. 장면은 `diet`(기록 없는 날·변형 있는 품목·먹은 것 0건)·`diet-log-open`(먹은 것 1건)·`diet-streak`(줄인 플랜 4일 연속 경고)가 본다 |

### 인벤토리·첫 화면 크기

- `node scripts/astryx-inventory.mjs --check`: 화면 아닌 파일 21 → 18, 인라인 51 → 45, legacy 클래스 쓰임 270 → 235, 안 쓰는 선택자 0 → 0(PLAN 표와 같다. `--write`로 표를 새로 썼다). 지운 것: `.banner-warn`(마지막 쓰임), 인벤토리 템플릿 접두사 `diet-mark-`.
- `node scripts/first-load.mjs`: JS 303.87 + CSS 49.71 = **353.57KB**(한계 360KB, 통과. SS1 353.50KB).

### `ui-check after --check --ver=v1.21` (전체, 백그라운드 — 마지막 코드(`80b53f1`) 기준으로 다시 돌림)

- **종료 코드 0.** `장면 실패 0건 (requiredScene)`, `알려진 실패 3건`(`analyze-empty` 여백 격자 1 → SS5, `settings-export-preview` 접근성·눌림 반응 2 → SS6 — `KNOWN_FAILURES` 세 칸), `- 흐름 실패` 0줄, `- 흐름 통과` 128줄(다크·라이트 두 색 체계 합산). `home-banners-open`은 앞 라운드부터의 `optional` 건너뜀(2초 클릭 시간 초과, 이번 작업 밖).
- `같은 역할`: 화면 좌우 16(식단 포함) · 카드 사이 12 · 묶음 사이 20(`diet` 20) · 카드 안쪽 15(`diet` 15) · 가까움 순서 통과. `안쪽 대칭`·`가로 넘침`·`섬 버튼`(`history-day`·`history-detail-end`)이 식단 장면 전부 통과.
- 새 흐름(전부 `guardedFlow`, 대상 0개면 실패):

| 흐름 | 결과 |
|---|---|
| `SS2 끼니 전부 먹음 1탭 …` | 눌림 false → true → (품목 하나 뺌) false → true → false, 요약 kcal `225` → `460` → `225` |
| `SS2 품목 체크 1탭` | 눌림 false → true → false |
| `SS2 먹은 것 줄` | 접힘 → 펼침, `+` 1탭 1 → 1.5, 시각 칸·스테퍼 세로 가운데 차이 0px(390·375, 삭제는 둘째 줄이라 뺌) |
| `SS2 식사 알림 접힘` | 처음 닫힘(체크 0개) → 펼침 5개 → 다시 접음 0개 |
| `SS2 위험 구역 2단 확인` | 확인 문구 계산된 색 = `--color-text-error`(다크 `rgb(255,174,167)`·라이트 `rgb(192,38,44)`), 취소로 돌아옴 |
| `SS2 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안` | `diet`·`diet-end`·`diet-log-open`·`diet-streak`·`history-day` 5장면 모두 꺾임 0건(글자 372~452개 — 0개면 실패) |
| `RR7 식단 스테퍼` | 통과(삭제 36px·시각 칸 카드 안 — 위 5) |
| `SS2 검증 먹은 것 줄`(검증자) | 390·375: 시각 120·감소 36·개수 64·증가 36px, 삭제 326(375는 311)×36, 겹침 0쌍·잘림 없음, 이웃 간격 8/8/8/8px, 삭제 혼자 줄 false, 바꾸기–칩 36/36 가운데 차 0 |

- 390·375 폭 글자 꺾임 0건. 첫 시도에서 `history-day`가 `적습니/다.`로 꺾여 편집기 맨 바깥에 `ax-diet`을 달아 고쳤다. 식단에는 `0점` 같은 숫자+단위 줄이 없고 `/166g`·`1,781kcal`·`3개`는 `.ax-diet` 규칙(`keep-all`)이 한 덩어리로 지킨다.
- 장면 선택자를 역할·이름으로 바꿨다(`sheet-diet-plan`은 식단 틀 첫 버튼, `sheet-diet-slot`은 `대체·안 먹음 — 아침`, `sheet-diet-variant`는 `바꾸기 — …`, `diet-log-open`은 `aria-expanded` 버튼 중 `식사 알림` 아닌 것). `button.diet-item` 등 legacy 선택자 0.

### 결함 복원

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| ④ 원형 버튼 `isPressed={grade !== 'none'}` | `v121 SS2: 끼니 원형 버튼은 …` + 흐름 `SS2 끼니 전부 먹음 1탭`(품목 하나 뺀 뒤 눌림 true) | `cmp` 같음 |
| ⑤ 편집기 바깥 `ax-scope` 뺌 | `history-day` `섬 버튼` 실패(9/29개 min-height 44px) | `cmp` 같음 |
| ⑥ `defaultIsOpen={false}` 뺌 | `v121 SS2: 식사 알림은 …` + 흐름 `SS2 식사 알림 접힘`(처음 열림·체크 5개) | `cmp` 같음 |
| ⑦ `.ax-text-error` 세 겹 → 한 겹 | `scripts/ss2.test.mjs` 세 겹 + 흐름 `SS2 위험 구역 2단 확인`(계산된 색 흰색·검정) | `cmp` 같음 |

(④⑤⑥⑦을 한 번에 되살려 `--only=history-day`로 돌렸다. ⑤는 `ax-diet`도 같이 빠져 `SS2 history-day` 흐름도 실패했다.)

### 화면 검증 반려 반영

검증자가 ui-check에 흐름 셋(`SS2 검증 먹은 것 줄`·`SS2 검증 식단 탭 상태`·`SS2 검증 같은 부품 같은 모양`)과 장면 셋(`diet-grades`·`diet-grades-end`·`diet-reminder-open`)을 더했다(`7009c6b`). 반려는 두 번이었다.

**1차 반려(`7009c6b`) → `4be8944`**

| 반려 | 바꾼 것 |
|---|---|
| 먹은 것 줄 펼침에서 시각 값이 잘림(`17:12`가 `5:1`로 보임)·부품이 겹침·삭제 글자가 안 보임 | `TimeField width={112}`, `NumberStepper fieldWidth={64}`(새 속성, `NumberStepper.tsx`), `HStack wrap="wrap"`으로 줄 감김. 흐름 `SS2 먹은 것 줄`의 가운데 비교에서 삭제를 뺌 |
| `바꾸기`가 맨 글자(`ghost`) | `variant="secondary"` |
| (검증자 흐름 보강) | 시각 값 안 잘림·부품 상자 겹침 쌍·삭제 최소 크기(폭 48·높이 36) |

**2차 반려(`94c8f82`) → `80b53f1`**

| 반려 | 바꾼 것 |
|---|---|
| 시각 칸 면이 최소 120px라 112에서 8px 삐져나와 `−`에 1px로 붙음, 삭제가 혼자 떠 보임 | `TimeField width={120}`, 줄 감김(`wrap`) 대신 시각·스테퍼 한 줄 + 삭제 둘째 줄 전체 폭(`VStack gap 2`) → 이웃 부품 간격 8/8/8/8px |
| `바꾸기`(`sm` 28px)가 칩(36px) 줄에서 4px 뜸 | `size="sm"` 제거(36px), 칩과 같은 줄 세로 가운데 |
| (검증자 흐름 보강) | 이웃 간격 같음·삭제 혼자 줄 아님·바꾸기–칩 가운데 칸 |

재검증(`39c4c1b`)은 통과, 새 문제 없음.

**`80b53f1` 결함 복원**(리뷰어가 같은 두 결함을 되살려 다시 확인 — `--only=diet-log-open`, 종료 코드 1):

| 되살린 결함 | 실패한 칸 | 원상복구 |
|---|---|---|
| `바꾸기`에 `size="sm"` | `SS2 검증 먹은 것 줄` 바꾸기–칩 높이 `28/36`(차 ≠ 0) | `cmp` 같음 |
| `TimeField width={112}` | 같은 흐름 간격 `0/8/8/8px`(0 ≠ 8) | `cmp` 같음 |

(이 두 결함은 구현자 흐름 `SS2 먹은 것 줄`·`RR7 식단 스테퍼`는 통과하고 검증자가 더한 흐름만 잡는다. 흐름이 실제로 일한다는 뜻이다.)

### 과거 판정 불변

`src/db`·`src/store` 변경 없음, `src/lib`는 테스트뿐(`src/lib/v121.test.ts`, 판정 파일 없음. 골든 테스트 수정 없이 통과). 변이·속성 테스트 대상 없음.

### 하지 않은 것

- `docs/screenshots/v1.21/after`는 식단·기록 장면과 `layout.json`만 갱신했다(무관한 장면이 바뀐 것은 `git show HEAD:<경로>`로 되돌림).
- `--same-layout`은 안 돌렸다(식단 배치가 의도대로 바뀐다). Argos 업로드 안 함(토큰 없음).
- **사람 확인 필요:** 실기기에서 시각 칸이 iOS 시각 휠로 뜨고 확대되지 않는지, 끼니 원형 버튼·품목이 엄지로 한 번에 눌리는지.

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드·첫 화면 크기). `Test Files  81 passed (81)`, `Tests  1839 passed (1839)`. 빌드 성공.
- `git rev-list --count main..HEAD`: 커밋 전 5 → 이 작업 커밋 후 6.

---

## SS3. 식단 시트 넷 + `SheetFrame` 삭제

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(`feat(SS3): …`) — 해시는 `git log`. |
| 바뀐 파일 | `src/components/DietPlanSheet.tsx`·`DietSlotSheet.tsx`·`DietVariantSheet.tsx`·`FoodLogSheet.tsx`(Astryx `Sheet`로), `src/components/SheetFrame.tsx`(삭제), `src/ax/diet.tsx`(`RadioList`·`RadioListItem`·`ScrollableArea`), `src/ax/parts.css`(한글 줄바꿈 시트 목록 +넷)·`ax.css`·`src/styles/global.css`·`motion.css`(legacy 시트 규칙·뿌리 `.sheet-backdrop` 삭제), `scripts/ui-check.mjs`·`lib/ui-check-lib.mjs`·`lib/ui-space.mjs`(`.sheet` 선택자·움직임 검사 정리, SS3 흐름·장면 선택자), 테스트, `docs/ASTRYX-INVENTORY.md`·`eslint-suppressions.json`(줄어든 만큼 다시 씀·`--prune-suppressions`), 스크린샷(`sheet-diet-*`·`sheet-food*`·`layout.json`만) |
| 테스트 | `Test Files 82 passed (82)` · `Tests 1850 passed (1850)` (SS2 뒤 81/1839 → 새 파일 1 `scripts/ss3.test.mjs`, 새 테스트 `v121` SS3 7 + `ss3.test.mjs` 6 = 13, v119 QQ3 SheetFrame 테스트 둘 삭제) |
| Astryx 인벤토리 | `node scripts/astryx-inventory.mjs --check` 출력: `✓ Astryx를 안 읽는 화면 파일: 13 → 13` · `✓ 인라인 스타일: 38 → 38` · `✓ legacy 클래스 쓰임: 194 → 194` · `✓ 안 쓰는 legacy 선택자: 0 → 0`. SS2 뒤 → SS3 뒤: 안 읽는 화면 파일 18→13, 인라인 스타일 45→38, legacy 쓰임 235→194(PLAN 예상과 같음). `docs/ASTRYX-INVENTORY.md` 합계 줄: 읽는 것 34개·인라인 38곳·legacy 194곳·안 쓰는 선택자 0개 |
| 첫 화면 | `node scripts/first-load.mjs`(빌드 뒤) 출력 — JS `assets/index-B0c4joCN.js` 304.34 · CSS `assets/index-Bsuk-U7p.css` 49.29 · 합 **353.63**kB gzip(한계 360KB). 새 부품을 `src/ax/diet.tsx`에 둬 메인 청크가 안 큼 |
| 수정표 밖 | `legacy-scope.test.mjs` RR1(`.sheet-backdrop` 뿌리 → 없다)·RRM(`.sheet` 규칙 → 없다) · `rr10.test.mjs`(`.sheet`·`is-closing` 눌림 규칙 → 지움) · `ss2.test.mjs`(시트가 쓰느라 남긴 `.diet-item` 등 → 지웠다) · `inputProps.test.ts`(맨 입력 바닥 10 → 0 초과: 4개만 남음) · `uiConsistency.test.ts`(처음엔 AA3 창을 고쳤으나 리뷰 반려로 되돌림 — 지금은 변경 없음) · `v119.test.ts` QQ3(legacy 시트 4 → 0, SheetFrame 두 테스트 삭제) · `v120.test.ts`(RRM 보완의 aria-label 스캔을 `ListItem` 기준으로, RR8 legacy 목록 → 빔, RR7 `LEGACY` 문자열). `ui-check-lib.mjs`의 `inPageMotionDurations`와 정적 검사 3(`.sheet` 키프레임)은 legacy 시트가 없어져 지웠다 |

### 옮긴 스캔 (수정표 밖 테스트 — 이름·전→후·같은 뜻인 이유)

| 이름 | 전 | 후 | 같은 뜻인 이유 |
|---|---|---|---|
| `legacy-scope` RR1 | legacy 뿌리 목록에 `.sheet-backdrop`이 **있다** | 뿌리 네 개(`.screen`·`.onboarding`·`.center-note`·`.banner`)가 있고 `.sheet-backdrop`은 **없다** | 뿌리 목록이 global.css·ax.css에서 같다는 검사는 그대로. 시트가 모두 Astryx가 되어 `.sheet-backdrop` 뿌리를 지웠고, 남았으면 오히려 실패하게 뒤집었다 |
| `legacy-scope` RRM(시트 규칙) | `.sheet`가 막은 표면·테두리, `.sheet-backdrop`이 `--color-overlay`라는 규칙 | global.css에 `.sheet`·`.sheet-backdrop` 규칙이 **없다** | 표면·막은 이제 Astryx 시트가 정한다(ax.css가 덧칠하지 않는다는 RRM의 다음 테스트가 그대로 잠금). 규칙이 사라졌으니 "있는 규칙의 값" 검사는 "없다"로 바뀐다 |
| `rr10` 눌림 규칙 | 남는 규칙: `.btn`·`.pill`·`.chip`·`.segment button`·`.back-link`·`.sheet`·`.sheet-backdrop`·`is-closing` | `.sheet`·`.sheet-backdrop`·`is-closing` 뺀 다섯 | "안 옮긴 화면이 쓰는 규칙은 남는다"는 뜻은 그대로. 시트가 안 옮긴 화면에서 빠져 해당 세 개는 쓰는 곳이 없다 |
| `ss2` 남는다 → 지웠다 | `.diet-item`·`.diet-item-group`·`.diet-variant-btn`·`.diet-sheet-state`·`.diet-plan-diff`가 **남는다**(시트가 쓰느라) | 다섯 개가 **없다** | 남긴 이유가 "SS3까지 legacy 시트가 쓴다"였다. 시트가 Astryx가 되어 이유가 사라졌고, 쓰는 곳 없는 선택자를 두면 인벤토리 넷째 숫자(0)를 못 지킨다 |
| `inputProps` | 맨 입력 수 > 10 | > 0 (남은 맨 입력 4개) | 이 바닥은 "스캔이 헛돌지 않는다"(0개 통과 방지)가 뜻이다. 화면을 Astryx로 옮겨 맨 입력이 줄었을 뿐이고 0개면 여전히 실패한다 |
| `v119` QQ3 지운 둘 | `SheetFrame.tsx`가 `../ax`를 import 안 한다 · `SheetFrame`이 `once`로 닫힘을 감싼다 | 두 테스트 삭제(옆의 둘은 "legacy 시트 0개·SheetFrame 파일 없음", "sheet-backdrop 글자가 나오는 .tsx 없음"으로 바뀜) | 둘 다 `SheetFrame.tsx` 내용을 읽는 검사라 파일이 없으면 대상이 없다. `once` 자체의 동작 테스트(`once는 두 번 불러도…`)는 그대로 남음 |
| `v120` RR7 `LEGACY` | `const LEGACY = '.screen, .onboarding, .sheet-backdrop, .center-note, .banner'` | `.sheet-backdrop` 뺀 문자열 | 스캔 대상이 `ui-check-lib`의 같은 상수라 상수를 따라 바꿨다. "legacy 범위 안의 Astryx 버튼도 잰다"는 뜻은 그대로 |
| `v120` RR8 | legacy 시트 목록이 식단 시트 넷 | 목록이 **빔** | 같은 스캔(`*Sheet.tsx` 중 `../ax`를 안 읽는 것)이다. 넷을 옮겼으니 기대값이 4개 → 0개 |
| `v120` RRM 보완 | `.diet-item` 버튼 여는 태그에 `aria-label`이 없다 | `ListItem`(음식 줄)에 없다 + 안의 편집 `Button`에는 `편집 — 이름` 있다 | "줄 전체에 aria-label을 달면 안에서 읽는 이름을 덮는다"는 뜻은 같다. 줄이 `button.diet-item` → `ListItem`이 됐을 뿐이다 |

### PLAN과 다르게 한 것 (이유)

1. `RadioList`·`ScrollableArea`는 `src/ax/diet.tsx`에 있다(PLAN 표: `index.tsx`) — SS2 기록 1번과 같은 이유(첫 화면 크기).
2. 안 쓰게 된 `.diet-sheet-state`·`.diet-plan-diff`·`.diet-item-group`도 지웠다(PLAN은 `.diet-item*`·`.diet-variant-btn`만 적음 — 쓰는 곳이 없어졌다). `ss2.test.mjs`의 "남는다" 테스트를 "지웠다"로 뒤집음.
3. 정적 검사 `.screen·.ax-screen·.card·.sheet의 좌우 여백` → `.sheet` 뺀 셋(`ui-space.mjs`), `inPageLayout`의 `.sheet` 선택자 제거 — PLAN은 `SHEET_SELECTOR`만 적었으나 같은 `.sheet`를 읽는 곳이라 같이 정리.
4. SS2 검증자 흐름(`SS2 검증 식단 탭 상태`)이 끼니 시트의 품질 선택을 `button[aria-pressed]`로 찾았다 → 라디오(`getByRole('radio')`)로 바꿈.
5. 흐름 ③⑥⑦은 끝에 데이터를 원래대로 돌린다(대체 → 기록 지우기, 먹은 것·새 음식 삭제, 플랜·변형 복귀). 처음엔 `대체 지우기`만 해 슬롯 기록이 남아 `SS2 끼니 전부 먹음 1탭`이 깨졌다.

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| 네 파일 `Sheet`·0건 목록·`SheetFrame` 없음·`*Sheet.tsx` 전부 `../ax` | `v121 SS3: 네 파일이 ../ax의 Sheet를 쓰고 …` · `v121 SS3: SheetFrame.tsx가 없고 …` |
| `dismiss()`·`purpose` | `v121 SS3: 고른 뒤 닫힘은 …` · `v121 SS3: 끼니·먹은 것 추가는 purpose="form" …` |
| `RadioList value={quality}`·`mode` null·`onClearSubstitution` | `v121 SS3: 끼니 시트의 RadioList는 …` + `uiConsistency` AA3(리뷰 반려 뒤 안 고치고 통과 — 아래 리뷰 반영) |
| `ScrollableArea`·새 부품 위치, 문구 | `v121 SS3: 먹은 것 추가는 …` · `v121 SS3: 문구가 그대로다 …` |
| `ss3.test.mjs`(fs) | 6건: SheetFrame 파일·global.css·motion.css·뿌리 목록 두 파일 같음·한글 목록 네 시트·`SHEET_SELECTOR` |
| 안 고치고 통과: `v19` DD1·`v115` MM2·AA3 | DD1·MM2는 처음부터 통과. **AA3는 처음 커밋(`e307de4`)에서 테스트의 창을 글자 뒤쪽으로 고쳐서 통과시켰다(PLAN과 다름) → 리뷰 반려 뒤 테스트를 `48fd07f` 내용으로 되돌리고 코드 쪽(`대체 지우기` Button의 `onClick`을 `label` 앞으로)에서 통과시켰다.** `git diff 48fd07f -- src/lib/uiConsistency.test.ts` 비어 있음 |
| `ui-check after --check`: 시트 장면 일곱 | 종료 코드 0, 일곱 장면 전 칸 통과(안쪽 대칭·시트 버튼·가로 넘침·접근성 serious·critical 0) |
| 흐름 ①~⑧ | 아래 |

### ui-check (전체 `after --check --ver=v1.21`, 종료 코드 0, 알려진 실패 3건(SS5·SS6 몫), 흐름 통과 149)

| 흐름 | 결과 |
|---|---|
| `SS3 플랜 고르기` | 줄 2개, 감량 1,800 → 보정 1,500, 사라짐 397ms(300ms 안팎+측정 지연), 되돌린 뒤 원래 |
| `SS3 내일부터 2일` | 일수 버튼 3개, 402ms |
| `SS3 끼니 대체 저장` | 글 없을 때 저장 꺼짐, 라디오 3개, 401ms, 카드 메모 1 → 지운 뒤 0 |
| `SS3 입력 중 막 누름` | 막 누른 뒤·끌어내린 뒤 시트 1개, 친 글 그대로, Esc로 닫힘 |
| `SS3 단백질원 바꾸기` | 줄 3개, 닭가슴살 2팩 → 닭안심 180g, 392ms, 되돌림 |
| `SS3 먹은 것 추가 1탭` | "방금 추가" 1개, 시트 열림, 1 → 2줄 → 1줄, 음식 줄 aria-label 없음 |
| `SS3 새 음식 등록하고 추가` | `inputmode=decimal`, 목록에 새 음식, 삭제 뒤 0개, 먹은 것 1 → 2 → 1 |
| `SS3 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안` | 일곱 장면 모두 꺾임 0건(글자 33~389개 — 0개면 실패) |

(`ui-check`는 `--ver=v1.21`을 줘야 한다 — 안 주면 package.json 버전 v1.20 폴더에 찍힌다. 처음에 그렇게 찍혀 `git show HEAD:`로 되돌리고 새 파일은 지웠다.)

### 결함 복원

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| ⑧ 플랜 줄 `dismiss()` → `onClose()` | `v121 SS3: 고른 뒤 닫힘은 …` + 흐름 `SS3 플랜 고르기`(사라짐·움직임 검사 실패) | `cmp` 같음 |
| ⑨ 끼니 시트 `purpose="info"` | `v121 SS3: 끼니·먹은 것 추가는 purpose …` + 흐름 `SS3 입력 중 막 누름`(시트 0개·글 사라짐) | `cmp` 같음 |
| ⑩ `SheetFrame.tsx` 되살림 | `v121 SS3: SheetFrame.tsx 파일이 없다` 외 1건 | 파일 삭제 후 `git status`로 확인 |

### 과거 판정 불변·하지 않은 것

- `src/lib`는 테스트뿐, 판정 로직 변경 없음. 변이·속성 테스트 대상 없음. README 반영: PLAN이 "없음"이라 안 고침.
- `docs/screenshots/v1.21/after`는 `sheet-diet-*`·`sheet-food*`·`layout.json`만 갱신, 무관한 장면 변경은 `git show HEAD:<경로>`로 되돌림.
- 사람 확인 필요: 실기기에서 시트 열고 내려가는 움직임, 음식 목록 스크롤 칸 끝, 시각 칸(iOS 휠).

### 실행 결과 요약

- `npm run check` 통과. `Test Files  82 passed (82)`, `Tests  1850 passed (1850)`. 빌드 성공. `git rev-list --count main..HEAD`: 커밋 전 12 → 이 커밋 후 13.

### 리뷰 반영 (SS3 리뷰 반려 — 고칠 것 1~3)

1. AA3: `uiConsistency.test.ts`를 `48fd07f` 내용으로 되돌렸다(`git diff 48fd07f -- src/lib/uiConsistency.test.ts` 비어 있음). 코드 쪽에서 통과시켰다 — `DietSlotSheet.tsx`의 `대체 지우기`·`추가 지우기` `Button`에서 `onClick`을 `label` 앞에 둠. `v121.test.ts`의 두 정규식은 같은 `<Button …/>` 안에 `label`과 `act(…)`가 있으면 통과하게(속성 순서 무관) 고쳤다.
2. 이 절의 "옮긴 스캔" 표를 더하고 AA3·인벤토리·첫 화면 사실을 맞췄다.
3. 환경: 작업 트리의 `scripts/ui-check.mjs`가 CRLF라(`grep -cU $'\r'` 3324) `git show HEAD:`로 LF로 되돌렸다(커밋 내용 변화 없음).

---

## SS4. 기록 탭

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(`feat(SS4): …`) — 해시는 `git log`. |
| 바뀐 파일 | `src/screens/HistoryScreen.tsx`·`SessionDetailScreen.tsx`·`ExerciseHistoryScreen.tsx`, `src/components/MonthCalendar.tsx`(Astryx로), `src/ax/index.tsx`(`Row`·`Rows`를 `SummaryScreen`에서 옮김), `src/screens/SummaryScreen.tsx`(`../ax`에서 읽게), `src/ax/parts.css`(`.ax-cal-*`·`.ax-history`), `src/styles/global.css`·`motion.css`(기록 전용 legacy 규칙 38개·`.back-link` 눌림 삭제), `scripts/astryx-inventory.mjs`(`cal-diet-dot-` 접두사 삭제)·`docs/ASTRYX-INVENTORY.md`, `scripts/ui-check.mjs`·`lib/ui-space.mjs`(기록 장면 판정·SS4 흐름·시드), 테스트, 스크린샷(`history*`·`layout.json`만), `README.md`("Tech Stack" Astryx 줄에 `기록`) |
| 테스트 | `Test Files 83 passed (83)` · `Tests 1871 passed (1871)` (SS3 뒤 82/1850 → 새 파일 1 `scripts/ss4.test.mjs`, 새 테스트 `v121` SS4 13 + `ss4.test.mjs` 8 = 21) |
| Astryx 인벤토리 | `node scripts/astryx-inventory.mjs --check` 출력: `✓ Astryx를 안 읽는 화면 파일: 9 → 9` · `✓ 인라인 스타일: 30 → 30` · `✓ legacy 클래스 쓰임: 125 → 125` · `✓ 안 쓰는 legacy 선택자: 0 → 0`. SS3 뒤 → SS4 뒤: 13→9, 38→30, 194→125(PLAN 예상과 같음) |
| 첫 화면 | `node scripts/first-load.mjs` 출력 — JS `assets/index-B1DdATYm.js` 305.83 · CSS `assets/index-DViAYW_E.css` 48.98 · 합 **354.81**kB gzip(한계 360KB). `Row`·`Rows`만 `index.tsx`에 더했고 새 Astryx 부품은 안 끌어들였다 |
| 수정표 밖 | `rr7.test.mjs`(고아 카드 `.ex-*`가 남아 있다 → 없다) · `rr10.test.mjs`(`.back-link`가 눌림 목록에 남는다 → 없다) · `v120.test.ts` RR9(`<StackItem size="static">{end}`를 SummaryScreen에서 → `src/ax/index.tsx`에서 읽음) |

### 옮긴 스캔 (이름·전→후·같은 뜻인 이유)

| 이름 | 전 | 후 | 같은 뜻인 이유 |
|---|---|---|---|
| `uiConsistency` 캘린더 점 | `cal-diet-dot-${dietDot}`가 있다 | `data-diet={dietDot`가 있다 | 점 하나가 판정된 날·보류된 날의 등급을 다 나른다는 뜻 그대로(클래스 → 속성). "판정·보류가 같은 경로" 줄은 안 고치고 통과 |
| `rr7` 고아 카드 | `.ex-card`…`.ex-card-orphan`이 global.css에 **있다** | **없다** | 고아 카드가 `Card` + `Row`가 되어 쓰는 곳이 없다. 남았으면 인벤토리 넷째 숫자(0)가 깨진다 |
| `rr10` `.back-link` | motion.css 제외 목록·눌림 규칙에 `.back-link`가 있다 | 없다 | 뒤로 가기가 `Button variant="ghost"`(자기 눌림)가 되었다 |
| `v120` RR9 StackItem | SummaryScreen에 `<StackItem size="static">{end}</StackItem>` | `src/ax/index.tsx`에 같은 줄 | PLAN은 "안 고치고 통과"라 했으나 `Row`가 옮겨 가 불가능했다(아래 다르게 한 것 4). 마크업은 한 글자도 안 바뀜 |
| `uiConsistency` X6(세션 삭제) | `btn-danger\|variant="destructive"` 앞 260자 | 같음 | SS2에서 이미 옮겨 통과 |

### PLAN과 다르게 한 것 (이유)

1. 달력 칸의 **보이는 글자가 `17일`**이다(PLAN: 숫자만). 접근성 이름은 PLAN 원문(`17일 운동 2회 식단 준수`)이다. axe `label-content-name-mismatch`는 낱말 단위로 맞춰 `17`이 `17일`에 안 든다고 봤다(실측 42건; `aria-hidden`·화면 밖 글자로는 안 풀림, `17일`을 보이게 하면 0건).
2. 🔥과 같은 날 세션 수는 글자가 아니라 CSS `::before`·`::after`다(글자로 두면 이름과 어긋나 1건 실패). 🔥은 칸 위, 점은 칸 아래에 떠 있고 날짜 글자가 칸 가운데라 안쪽 대칭이 맞는다(이전 배치는 `위 -1·아래 26`).
3. 식단 점 값은 `poor`다(PLAN 표의 `bad`가 아니라 코드의 `Adherence`). 칸 열 간격은 0(누르는 영역 44 확보: 375에서 41 → 44.4).
4. `ui-space.mjs`의 카드 안쪽 측정이 달력 카드를 건너뛴다(첫 글자가 월 이름이라 가운데에 놓인다 — 119.5). 그다음 카드로 잰다.
5. 사람이 누르는 카드 면: `ClickableCard`의 이름 붙은 `button`은 안 보이는 안쪽 부품이라 흐름은 카드 면(바로 위 상자)을 누른다(`tapCard`).
6. `Row`는 `Rows`(role=list) 안에서만 쓴다(listitem의 부모 규칙 `aria-required-parent`) — 카드 하나에 `Row` 하나여도 `Rows`로 감싼다.

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| 네 파일 0건 목록·`data-diet` | `v121 SS4: 네 파일에 className=은 ax- 이름뿐이고 …` |
| 순서 | `v121 SS4 — 순서: …` |
| `Row`·`Rows` | `v121 SS4: src/ax/index.tsx가 Row·Rows를 내보내고 …` |
| `cellLabel` 한 곳·속성 | `v121 SS4: 칸 이름을 만드는 함수가 …` · `v121 SS4 속성: …`(fast-check) · `v121 SS4: 칸 이름 예 …` |
| 옮긴 스캔·안 고치고 통과 | 위 표. `uiConsistency` 기록 탭 두 줄·`v18`·`v114`(`cardioText(` — 아래 참고)·`v115`·`dietBackup`·`strengthWork`는 안 고치고 통과 |
| `ui-check after --check`(기록 아홉 장면 + summary*) | 아래 |
| 흐름 ①~⑧ | 아래 |
| 경계 | 시드: 같은 날 두 세션(복귀)·루틴에 없는 종목(`현재 루틴에 없음` 뱃지 2개, 고아 카드)·보조 무게 세션·식단 점 넷. 기록 0건·메모 0건·세션 하나뿐인 종목은 기본 데이터로 |

(`v114`의 `cardioText(` 스캔은 `HistoryScreen.tsx`가 `cardioText`를 쓰는 한 통과 — 세션 줄 설명에 그대로 둠.)

### ui-check (전체 `after --check --ver=v1.21`, 종료 코드 0, 알려진 실패 3건(SS5·SS6 몫), 흐름 통과 180, 장면 실패 0건)

| 흐름 | 결과 |
|---|---|
| `SS4 시드 심기` | 같은 날 두 번째 세션(복귀)·루틴에 없는 종목·보조 무게 세션·식단 1~4일 |
| `SS4 달력 칸 이름` | 오늘 칸·두 번 운동한 칸 1개·식단 점 칸 4개(준수·일부·미달·판정 전), 이름이 날짜로 시작 |
| `SS4 달력 칸 신호 구분` | 오늘 = 테두리(`--color-accent`), 고른 날 = 면(`--color-accent-muted`), 점 넷의 계산된 색 = 토큰이고 서로 다르며 강조색이 아님, 🔥 칸 2개 |
| `SS4 달력 칸 일곱 한 줄` | 390·375: 안쪽 폭 안·겹침 0·누르는 영역 44 이상·세로·가로 어긋남 0.0px·줄 간격 일정·요일 열 일치 |
| `SS4 날짜 고르기` | 그날 세션 카드 2개·식단 제목 1개 → 카드 1탭 → 상세 제목 → `기록` 1탭 → 고른 날 유지 |
| `SS4 다른 달` | 이전 달 → 선택 풀림·`이 달의 세션`·달 이름 바뀜 → 다음 달 |
| `SS4 종목별 → 세션` | 종목 카드 3개·`현재 루틴에 없음` 2개·세션 카드 2개 → 상세 → 돌아옴 |
| `SS4 보조 무게 종목` | e1RM·최고 뱃지·볼륨 0개, 안내 글자 계산된 색 = 경고 토큰(다크·라이트) |
| `SS4 Day 변경 2단계`·`SS4 위험 구역 2단 확인` | 취소로 끝냄, 기록 그대로, 확인 글자 계산된 색 = 오류 토큰 |
| `SS4 상세 유산소 토글 맨 글자 아님` | 토글 5개 모두 면·테두리가 있음, 높이 36px 하나 |
| `SS4 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안` | history·history-day·history-exercise·history-exercise-detail·history-detail·history-detail-change 모두 꺾임 0건, 안쪽 폭 안 |

### 결함 복원

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| ⑪ 상세에서 `<DietDayEditor`를 위험 구역 아래로 | `v121 SS4 — 순서: …` | `cmp` 같음 |
| ⑫ `cellLabel`이 날짜를 뒤에 붙임 | `v121 SS4 속성`·`칸 이름 예` + 흐름 `SS4 달력 칸 이름`(이름이 날짜로 시작 false) | `cmp` 같음 |
| ⑬ 세션 카드 하나를 `Card` + 안쪽 `ListItem`(제목 + 목록) | ui-check `history · 안쪽 대칭`: 카드 위 16·아래 23(차이 7). (제목 없이 `ListItem` 하나만 넣은 처음 시도는 위·아래가 같아 안 걸렸다 — 제목이 위에 있는 꼴로 되살림) | `cmp` 같음 |

### 과거 판정 불변·하지 않은 것

- `src/lib`는 테스트뿐이라 변이·속성(판정 함수) 대상 없음(`cellLabel`은 화면 파일의 이름 함수라 `v121`에 fast-check 속성으로 둠). README 반영: `Tech Stack`의 Astryx 줄에 `기록` 추가.
- `docs/screenshots/v1.21/after`는 `history*`·`layout.json`만 갱신, 무관한 장면은 `git show HEAD:<경로>`로 되돌림.
- 사람 확인 필요: 실기기에서 달력 칸(🔥·점 크기, 375 폭 누르는 느낌), 종목별 카드 누르기, 유산소 토글.

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드·첫 화면 크기). `Test Files  83 passed (83)`, `Tests  1871 passed (1871)`. 빌드 성공. `git rev-list --count main..HEAD`: 커밋 전 15 → 이 커밋 후 16.

---

## SS5. 분석 탭

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(`feat(SS5): …`) — 해시는 `git log`. |
| 바뀐 파일 | `src/screens/AnalyzeScreen.tsx`(Astryx로 — `AxRoot`+`Groups`+`Card`·`ScrollableArea`·`ToggleButton`·`SegmentedControl`·`Badge`·`Banner`·`Rows`/`Row`, 감각 점 판정 `sensoryDot`), `src/lib/chartTheme.ts`(`TOKEN` 아홉 값을 Astryx 토큰으로), `src/ax/scroll.tsx`(새 — `ScrollableArea`), `src/ax/diet.tsx`·`src/components/FoodLogSheet.tsx`(`ScrollableArea`가 `scroll.tsx`로), `src/ax/parts.css`(`.ax-analyze`·`.ax-chart`·`.ax-chips`·`.ax-sdots`·`.ax-sdot`), `src/styles/global.css`(분석 전용 legacy 규칙 12개 삭제 — `.chart`·`.chart .recharts-surface`·`.chip-scroll`·`.chip-scroll::-webkit-scrollbar`·`.chip-scroll .pill`·`.srow`·`.srow:last-of-type`·`.srow-head`·`.sdots`·`.sdot`·`.mbar-name`·`.center-note`와 legacy 뿌리 목록의 `.center-note`), `src/ax/ax.css`(뿌리 목록), `scripts/astryx-inventory.mjs`(`recharts-surface` 예외 삭제)·`docs/ASTRYX-INVENTORY.md`, `scripts/ui-check.mjs`·`scripts/lib/ui-space.mjs`·`scripts/lib/ui-check-lib.mjs`(분석 판정·SS5 흐름·시드, `KNOWN_FAILURES`에서 `analyze-empty` 삭제), 테스트, 스크린샷(`analyze*`·`layout.json`만), `README.md`("Tech Stack" Astryx 줄에 `분석`) |
| 테스트 | `Test Files 84 passed (84)` · `Tests 1893 passed (1893)` (SS4 뒤 83/1871 → 새 파일 1 `scripts/ss5.test.mjs`, 새 테스트 `v121` SS5 8 + `ss5.test.mjs` 11 + `properties.test.ts` 2 + `ss0.test.mjs` 1 = 22) |
| Astryx 인벤토리 | `node scripts/astryx-inventory.mjs --check` 출력: `✓ Astryx를 안 읽는 화면 파일: 8 → 8` · `✓ 인라인 스타일: 26 → 26` · `✓ legacy 클래스 쓰임: 103 → 103` · `✓ 안 쓰는 legacy 선택자: 0 → 0` (`--write`한 표 포함). SS4 뒤 → SS5 뒤: 9→8, 30→26, 125→103(PLAN 예상과 같음) |
| 첫 화면 | `node scripts/first-load.mjs` 출력 — JS `assets/index-Zt2OMjpc.js` 305.88 · CSS `assets/index-DEMP8kFn.css` 48.95 · 합 **354.83**kB gzip(한계 360KB). 분석 청크 `AnalyzeScreen-CH6eh7ua.js`에 `TimeInput`이 없다(0건). `ScrollableArea`는 `scroll.tsx`라 식단·분석이 같은 청크 `ScrollableArea-*.js`를 나눠 쓴다. precache 49개 2733.54 KiB |
| 수정표 밖 | `v120.test.ts` RR3(`src/ax/*.tsx` 목록에 `scroll.tsx`) · `v120.test.ts` RR1(legacy 뿌리 문자열에서 `.center-note`) · `scripts/legacy-scope.test.mjs`·`scripts/ss3.test.mjs`(같은 뿌리 목록) · `v121.test.ts` SS3 ScrollableArea 줄(`diet.tsx` → `scroll.tsx`) — 아래 "옮긴 스캔" |

### 옮긴 스캔 (이름·전→후·같은 뜻인 이유)

| 이름 | 전 | 후 | 같은 뜻인 이유 |
|---|---|---|---|
| `v120` RR3 `src/ax/*.tsx` 목록 | `diet.tsx`·`index.tsx` | + `scroll.tsx` | "첫 화면 코드에 안 딸려 오게 부품 파일을 나눈다"는 뜻 그대로. 분석이 `diet.tsx`를 읽으면 `TimeInput`(≈87KB gzip)을 청크에 끌어와서 따로 뺐다 |
| `v121` SS3 `ScrollableArea` 내보내기 | `axDiet`이 `export { ScrollableArea }`를 담는다 | `axScroll`이 담고 `axDiet`에는 없다, `FoodLogSheet`는 `../ax/scroll`에서 읽는다 | 새 부품이 `index.tsx`가 아닌 별도 파일에 있다는 뜻 그대로(파일만 바뀜) |
| legacy 뿌리 목록(`v120` RR1·`legacy-scope`·`ss3.test.mjs`·`ui-check-lib` `LEGACY`) | `.screen, .onboarding, .center-note, .banner` | `.screen, .onboarding, .banner` | 분석의 빈 화면(`.center-note`)이 `Center`+`Text`가 되어 그 뿌리를 쓰는 곳이 없다. 남기면 인벤토리 넷째 숫자(안 쓰는 legacy 선택자)가 1이 된다. 두 CSS의 목록이 글자 그대로 같아야 한다는 검사는 그대로 통과 |
| `polish`(BB7) AnalyzeScreen 줄·`v120` `chartTheme` 스캔 | — | 안 고치고 통과 | PLAN대로 |

### PLAN과 다르게 한 것 (이유)

1. **`ScrollableArea`를 `src/ax/scroll.tsx`에 둔다**(PLAN은 SS3이 `diet.tsx`에 더한 것을 그대로 쓴다고 함). 분석 화면이 `diet.tsx`를 읽으면 식단 전용 `TimeInput`이 분석 청크에 들어온다 — 새 부품 파일을 따로 둔다는 규칙(SS2 반려에서 배운 것)을 지켰다. 대신 위 표의 테스트 둘을 같은 뜻으로 옮겼다.
2. **약한 종목 `Banner`는 감각 점수 카드 안이 아니라 바로 아래 따로 둔다.** 카드 안에 두면 `안쪽 대칭`이 `위 15·아래 28`(`Banner`가 안쪽 여백이 있는 상자라 카드의 마지막 내용이 글자가 된다)로 실패했다. 카드 사이 간격(3)으로 이어져 한 묶음 안에서 카드 아래에 붙는다.
3. **`ui-space.mjs`의 안쪽 대칭 측정이 `role="img"`를 그림으로 센다.** 감각 점 줄은 글자 없는 `span`이라 카드의 마지막 내용(아래 점 줄 12px + 간격)이 안 잡혀 `위 15·아래 33`으로 실패했다. 그림(`svg`·`img`)과 같은 처리다.
4. **`ui-check`의 글자 중간 꺾임 검사가 `<br>` 뒤에서 줄을 새로 센다.** 분석 빈 화면의 두 줄 문구와 `Banner` 안내가 `<br />`로 줄을 바꾸는데, 앞뒤 글자 노드가 같은 부모라 낱말이 중간에서 꺾인 것으로 셌다(`/깊은`·`/무게·` 표본). 일부러 낸 줄바꿈이다. 이 변경을 빼면 SS5 흐름 둘이 실패하는 것을 확인했다(결함 복원 표).
5. **분석 장면(`analyze`·`-end`·`-375`)이 심은 데이터로 찍힌다.** 이전에는 A그룹 기록이 없어 종목 줄·감각 점·경고·대체 수행이 안 보였다. 흐름이 끝난 세션 7개(Day 하나의 A둘·B넷·대체 하나, 7주에 걸쳐)를 심고 Phase 2로 연 뒤(B그룹 종목도 추이에 든다) 끝나면 지우고 Phase를 되돌린다. `before` 스크린샷(`analyze*`)과는 내용이 다르다. 다른 장면의 데이터는 그대로다.
6. 감각 점의 높이는 12px(`--spacing-3`)·모서리 4px(`--radius-inner`)다(전 14px·3px — 토큰 단계 밖 값은 `parts.css`에 못 쓴다). 불투명도는 이어진 값이 아니라 네 단계(0.4·0.6·0.8·1)라 PLAN 표와 같다.
7. 빈 화면의 `Text`에 `justify="center"`를 더했다(전 `.center-note`가 가운데 정렬이었다). PLAN 표에는 `Center`+`Text`만 있다.
8. `chartTheme()`은 화면 모듈 맨 위에서 한 번 부르는 그대로다(`polish` BB7이 `const C = chartTheme()`를 요구). 토큰 값이 `light-dark(…)` 글자라 실행 중 색 체계가 바뀌어도 SVG 색이 따라간다 — 흐름 `SS5 실행 중 색 체계 전환`이 새로 고침 없이 확인한다.
9. `npm run mutation`을 파일을 주어(`src/lib/chartTheme.ts`) 돌렸다. 기본(바뀐 파일 찾기)은 커밋된 변경만 봐서 커밋 전에는 "대상 없음"이 나온다.

### PLAN 검증 항목 ↔ 확인

| PLAN 검증 | 확인 |
|---|---|
| `AnalyzeScreen`의 `className=` `ax-`뿐·`style=`·`<button`·`var(--` 0건 | `v121 SS5: className=은 ax- 이름뿐이고 style=·<button·var(--가 0건이다` |
| `data-tone` 식이 `<= 1`·`< 2.5` | `v121 SS5: 감각 점은 data-tone·data-level과 aria-label(기록 없음 포함)을 갖고 tone을 정하는 식이 <= 1·< 2.5 두 경계를 그대로 쓴다` · `v121 SS5: 경계 — 1은 경고, 1.01은 강조, …` |
| `TOKEN` 값이 전부 `--color-`·아홉 짝 | `v121 SS5: TOKEN 값이 아홉 개 전부 --color-로 시작한다` · `v121 SS5: 아홉 짝이 PLAN 표와 같다`(문서 흉내가 묻는 토큰 이름으로 잰다 — 소스 글자를 읽으면 Stryker의 바뀐 소스에서 깨진다) |
| 속성: `chartColor`는 빈 글자가 아니다·`sensoryDot` level 0~3 정수·단조 | `properties.test.ts` `chartColor는 어떤 열쇠에서도 빈 글자를 돌려주지 않는다 …` · `sensoryDot의 level은 0~3의 정수이고 점수가 커지면 줄지 않는다(단조)` |
| 안 고치고 통과 | `polish`의 AnalyzeScreen 줄·`v120`의 `chartTheme` 스캔 |
| 지운 것·남은 것·CSS | `scripts/ss5.test.mjs`(fs로 읽음 — 제약 3) 8: 지운 규칙 없음, `.segment`·`.pill*`·`.warn-box` 남음, 뿌리 목록, 감각 점 네 계열 토큰·네 단계 불투명도·`.ax-chart`·`.ax-chips` 줄어들지 않음 |
| `ui-check after --check` 분석 네 장면 | 아래 |
| 흐름 ①~⑤ | 아래 |
| `analyze-empty` `여백 격자` 통과 + 항목 삭제, `알려진 실패 2건` | `analyze-empty` 행 `여백 격자` 통과, `KNOWN_FAILURES`에서 항목 삭제(`v121 SS5: 고친 analyze-empty 항목은 KNOWN_FAILURES에 없다`), 출력 `알려진 실패 2건` |
| 변이 테스트 | 아래 |

### ui-check (전체 `after --check --ver=v1.21`, 종료 코드 0, 알려진 실패 2건(SS6 몫), 흐름 통과 208, 장면 실패 0건)

| 흐름 | 결과 |
|---|---|
| `SS5 시드 심기`·`SS5 되돌리기` | 끝난 세션 7개(d2)·Phase 2 → 지움·Phase 원래대로(시드 실패하면 SS5 흐름 열 개가 모두 실패 — 건너뜀 없음) |
| `SS5 종목 바꾸기` | 칩 7개 · 처음 하나만 눌림 → 둘째 1탭에 그것만 눌림 · 최근 값 줄이 `암 풀다운 (D2) …` → `랫풀다운 (D2) …` · 다시 눌러도 눌림 유지 · 첫째로 돌아옴 |
| `SS5 종목 칩 맨 글자 아님` | 칩 7개 모두 바탕·테두리 있음(안 눌린 바탕 `rgb(27, 27, 27)`, 눌린 바탕 `rgb(37, 60, 90)`), 높이 36px 하나 |
| `SS5 지표 바꾸기` | 라디오 3개 · 눌림 0 → 볼륨 1 → e1RM 2 → 무게×횟수 0 · 선 모양이 바뀜 |
| `SS5 감각 점 이름·네 단계` | 점 8개 모두 `aria-label`(기록 없음 1개 `… 기록 없음`, 나머지 `… N.N점`) · 계열 `none·warn·accent·ok`의 계산된 바탕 네 가지 · 불투명도 0.4→0.6→0.8→1 |
| `SS5 B그룹 경고 글자 색` | B 종목에서 안내 글자 계산된 색 = `--color-text-warning`(다크 `rgb(238, 196, 72)` · 라이트 `rgb(131, 103, 0)`), A 종목에서는 안내 0개 |
| `SS5 한 줄 부품 겹침·잘림·세로 가운데` | 390·375: 머리 줄 4개(이름·뱃지 세로 가운데 차이 0.0px)·점 줄 4개·칩 7개(스크롤 칸 안 위·아래 안 잘림)·차트 2개·대체 수행 값 한 줄 — 겹침·잘림 0 |
| `SS5 실행 중 색 체계 전환` | 새로 고침 없이 선 `rgb(90, 160, 248)` → `rgb(0, 116, 226)` → 다시 · 축 `rgb(158, 158, 158)` → `rgb(71, 71, 71)` · 계산된 선 색 = 화면 안 `--color-accent` 값(두 체계 모두) |
| `SS5 analyze 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`·`SS5 analyze-empty …` | 꺾임 0건(분석 글자 578개·빈 화면 50개), 안쪽 폭 안(상자 비교 33회) |
| `SS5 analyze 맨 아래 카드가 탭 바 위` | 카드 7장 · 맨 아래 카드 아래끝 770 / 탭 바 위 795 |
| 표 | 분석 장면 `안쪽 대칭`·`가로 넘침`·`접근성` 통과, `analyze-empty` `여백 격자` 통과, `차트 색`·`색 체계 전환 Chromium analyze` 통과 |

### 결함 복원

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| ⑭ `chartTheme.ts`의 `accent`를 `--accent`로 | `v121 SS5: TOKEN 값이 아홉 개 전부 --color-로 시작한다` · `아홉 짝이 PLAN 표와 같다` | `cmp` 같음 |
| ⑮ `sensoryDot`의 경계를 `< 1`로 | `v121 SS5: 경계 — 1은 경고, …` · `감각 점은 … <= 1·< 2.5 두 경계를 그대로 쓴다` | `cmp` 같음 |
| (추가) `level`을 `3 - round(score)`로 | `properties.test.ts` 단조 속성 · `v121 SS5: 경계 …` | `cmp` 같음 |
| (추가) `parts.css` `data-level='1'` 불투명도 0.9 | `ss5.test.mjs` `data-level 0~3은 불투명도 네 단계` | `cmp` 같음 |
| (추가) `global.css`에 `.sdot` 되살림 | `ss5.test.mjs` `지운 규칙이 없다` + 인벤토리 `안 쓰는 legacy 선택자 0 → 1` | `cmp` 같음 |
| (추가) `AnalyzeScreen`에 `style={{…}}` | `v121 SS5: className=은 ax- 이름뿐이고 style=·<button·var(--가 0건이다` | `cmp` 같음 |
| ㉕ `KNOWN_FAILURES`에 `analyze-empty` 항목을 남김 | ui-check `- 실패 analyze-empty · 여백 격자: 알려진 실패가 고쳐졌다 — KNOWN_FAILURES에서 지운다`, 종료 코드 1 | `cmp` 같음 |
| (추가) 종목 칩 `className="ax-toggle"` → 클래스 없음 | 흐름 `SS5 종목 칩 맨 글자 아님`(맨 글자 6개·바탕 `rgba(0, 0, 0, 0)`) | `cmp` 같음 |
| (추가) `inPageMidWordBreaks`의 `<br>` 처리 삭제 | 흐름 `SS5 analyze-empty 390·375 …`(`/깊은`)·`SS5 analyze 390·375 …`(`/무게·`) | `cmp` 같음 |

### 변이 테스트 (`npm run mutation -- src/lib/chartTheme.ts`)

| 파일 | 점수 | 잡음 | 살아남음 | 테스트 없음 |
|---|---|---|---|---|
| `src/lib/chartTheme.ts` | 95% | 35 | 2 | 0 |

살아남은 둘은 이번에 안 바꾼 줄이다(`chartTheme.ts:98` `chartColor('dim')`의 문자열 → `""`, `:108` 툴팁 객체 → `{}`). 이번에 바꾼 줄(`TOKEN` 아홉 값·주석)은 `v121 SS5` 두 테스트가 잡는다. 처음 돌렸을 때 `?raw`로 소스를 읽던 테스트가 Stryker의 바뀐 소스에서 깨져(`expected [] to have a length of 9`) 문서 흉내 동작 테스트로 바꿨다.

### 과거 판정 불변·하지 않은 것

- ① `git diff --stat main -- src/db src/store` 출력이 비어 있다. ② `git diff --stat main -- src/lib`: `chartTheme.ts`(+`TOKEN` 아홉 값)와 테스트(`inputProps`·`properties`·`uiConsistency`·`v119`·`v120`·`v121`)뿐이다 — 판정 파일(`diet.ts`·`dietOps.ts`·`history.ts`·`analysis.ts`·`phaseReadiness.ts`·`backup.ts`·`gist.ts`) 없음. ③ 골든 테스트는 한 글자도 안 고치고 통과. README 반영: `Tech Stack`의 Astryx 줄에 `분석` 추가.
- `docs/screenshots/v1.21/after`는 `analyze*`·`layout.json`만 갱신, 무관한 장면 스크린샷은 `git show HEAD:<경로>`로 되돌림.
- 하지 않은 것: 차트를 Astryx로 바꾸기(recharts 그대로 — 범위 제외), 감각 점을 눌러 값을 펼치는 조작(지금도 없다).
- 사람 확인 필요(실기기): 분석 차트를 손가락으로 눌러 툴팁이 뜨는지, 종목 칩 줄 가로 스크롤(손가락으로 밀어도 페이지가 안 밀리는지), 폰의 다크 ↔ 라이트 전환 뒤 차트 색.

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드·첫 화면 크기). `Test Files  84 passed (84)`, `Tests  1893 passed (1893)`. 빌드 성공. `git rev-list --count main..HEAD`: 커밋 전 18 → 이 커밋 후 19.
