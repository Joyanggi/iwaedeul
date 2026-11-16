# 개발·테스트 내역 (검토용) — v1.20 (RR)

> PLAN-v1.20의 구현 기록. RR0 → RR1 → … 순서로 이어 쓴다.

## 이 환경에서 확인된 제약 (누적 — v1.19 목록을 이어받는다)

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

---

## RR0. 도구와 기준선

### 범위

| 커밋 | 바뀐 파일 | 내용 |
|---|---|---|
| `20df230` | 65개: `scripts/ui-check.mjs`·`scripts/lib/{glass-check,ui-check-lib}.mjs`·`scripts/{screenshots-glass,astryx-inventory}.mjs`·`scripts/first-screen.mjs`(새)·`src/lib/v120.test.ts`(새)·`docs/ASTRYX-INVENTORY.md`·`docs/screenshots/v1.20/before/`(56장 + `layout.json`) | 도구와 기준선. 앱 코드(`src/`의 화면·로직)는 안 바뀌었다 |
| 이 기록과 같은 커밋 | 4개: `scripts/lib/ui-check-lib.mjs`(`세트 숫자`가 토큰이 비면 실패로 — 거짓 통과 수정)·`src/lib/v120.test.ts`(그 스캔 한 줄)·`docs/screenshots/v1.20/before/history-detail-edit.png`(다시 찍음)·`docs/DEV-RECORD-v1.20.md` | 위 첫 커밋 뒤에 발견한 것 |

테스트 파일 수는 RR0 전 68 → 69, 테스트 수는 1622 → 1640(`v120.test.ts` 18개).

### PLAN 검증 항목 ↔ 테스트·확인

| PLAN 검증 | 어디서 |
|---|---|
| `.btn-start`·`.resume-strip`·`.rest-bar` 글자가 없다, `ASTRYX_SCENES`가 없다 | `v120.test.ts` "ui-check.mjs·screenshots-glass.mjs에 …", "ui-check.mjs에 ASTRYX_SCENES가 없다" (+ 글자·역할 선택자가 있다는 짝 테스트) |
| `BAR_SELECTOR` 한 줄에만 `.session-header`, 그 줄에 `.ax-bar`; `EXPECTED_BARS` | "glass-check.mjs에 띠 선택자 글자 …", "띠 선택자 사본 세 곳은 …BARS를 읽는다", "EXPECTED_BARS가 있고 …실패로 낸다" |
| `ui-check before --check`: `유리`·`눌림 반응` 칸 판정이 RR0 전과 같다 | 아래 "RR0 전·후 출력" 표 (실행 확인) |
| `first-screen.mjs`가 `setCPUThrottlingRate`·`serviceWorker.ready`를 쓴다 | "first-screen.mjs가 setCPUThrottlingRate와 serviceWorker.ready를 쓴다" |
| 사람 눈: before 폴더에 장면마다 다크·라이트 두 장 | 28장면 × 2 = 56장 (`ls docs/screenshots/v1.20/before | wc -l` = 57, 하나는 `layout.json`). 새 장면 `session-open-b`·`history-detail-edit`·`diet-log-open`은 눈으로 봤다 |
| 합계 줄의 `안 쓰는 legacy 선택자`, `--check`가 견줌 | "ASTRYX-INVENTORY.md의 합계 줄에 …", "astryx-inventory.mjs의 --check가 그 수를 견주고 …" |
| 설계: `cssVar`를 임시 요소로, 눌림을 요소 단위로, `ax-scope`를 legacy에서 뺌, 새 검사 다섯·배치 기록·`--press-shot`·`--same-layout`·`--layout-base` | "cssVar는 …임시 요소의 color로 …", "눌림 대상에서 Astryx 요소를 요소 단위로 뺀다", "ax-scope는 …빠진다", "새 검사 다섯과 …", "세트 숫자 검사의 기준은 테마 토큰", "새 칸은 before에서는 기록만", "새 칸은 유리 검사보다 먼저 잰다" |

### 결함 복원 (파일 `cp` 백업 → 결함 → `v120` 테스트 → 복구 → `cmp`)

| # | 되살린 결함 | 실패한 테스트 | 원상복구 |
|---|---|---|---|
| ① | `ui-check.mjs`의 시작 버튼을 `.btn-start` 클래스로 되돌림 | "…에 .btn-start·.resume-strip·.rest-bar 글자가 없다" 외 2개 (3건 실패) | `cmp` 같음 |
| ② | `glass-check.mjs`에 띠 선택자 글자 사본(`.session-header`) 한 곳 더 | "…BAR_SELECTOR 한 줄에만 있고 …", "…BARS를 읽는다" (2건) | 같음 |
| ③ | `cssVar`를 `getPropertyValue` 글자 읽기로 되돌림 | "cssVar는 토큰을 글자로 읽지 않고 …" | 같음 |
| ④ | `EXPECTED_BARS` 모자람을 실패로 안 냄 (`if (false) return`) | "EXPECTED_BARS가 있고, 모자라면 유리 칸을 실패로 낸다" | 같음 |
| ⑤ | 눌림 대상에서 Astryx 요소를 안 뺌 | "눌림 대상에서 Astryx 요소를 요소 단위로 뺀다" | 같음 |
| ⑥ | `--check`가 넷째 숫자를 안 견줌 | "astryx-inventory.mjs의 --check가 그 수를 견주고 …" | 같음 |
| ⑦ | `first-screen.mjs`에서 CPU 늦추기를 뺌 | "first-screen.mjs가 setCPUThrottlingRate와 …" | 같음 |
| ⑧ | 새 칸을 유리 칸 뒤로 옮김 | "새 칸은 유리 검사보다 먼저 잰다" | 같음 |

⑧은 처음에 **테스트가 못 잡았다**(순서를 "뒤에서 찾기"로 견줘 다른 함수의 줄에 걸렸다) — 두 줄이 붙어 있는지 보는 정규식으로 보강한 뒤 다시 잡혔다. ⑦도 처음엔 주석의 같은 글자가 먼저 바뀌어 안 잡힌 것처럼 보여 전부 바꿔 다시 확인했다.

### 변이 테스트

대상 없음 — `src/lib`의 코드를 바꾸지 않았다(`src/lib/v120.test.ts`만 새로 생겼다).

### RR0 전·후 출력 (`node scripts/ui-check.mjs before --check --ver=v1.20`)

RR0 전 = 이 브랜치의 도구 그대로(`HEAD`), 후 = RR0 도구. 다크 장면 25개의 접근성·움직임 줄이기·여백 격자·가로 넘침·줄 안 버튼 칸은 **전부 같다.** 일곱 칸 모두 같은 장면: 23/25. 종료 코드는 전·후 모두 1(RR0 전부터 있던 접근성 실패 둘: `session`의 `자리 없음 — 대체운동 고르기`, `sheet-food`의 `… 추가` 10건 — `label-content-name-mismatch`). 후에는 새 장면 home-375, session-375, session-open-b, history-detail-edit, diet-log-open가 더해졌고 `session` 계열 셋이 같은 접근성 실패를 가진다.

| 장면 | 눌림 반응 전 | 눌림 반응 후 | 유리 전 | 유리 후 | 나머지 5칸 |
|---|---|---|---|---|---|
| home | 통과 | 통과 | 통과 | 통과 | 같음 |
| home-end | 통과 | 통과 | 통과 | 통과 | 같음 |
| sheet-home | 통과 | 통과 | 통과 | 통과 | 같음 |
| session | 통과 | 통과 | 통과 | 통과 | 같음 |
| home-resume | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-open | 통과 | 통과 | 통과 | 통과 | 같음 |
| session-rest | 통과 | 통과 | 통과 | 통과 | 같음 |
| sheet-finish | 통과 | 통과 | 통과 | 통과 | 같음 |
| sheet-timer | 통과 | 통과 | 통과 | 통과 | 같음 |
| summary | 통과 | 통과 | · | · | 같음 |
| history | 통과 | 통과 | 통과 | 통과 | 같음 |
| history-detail | 통과 | 통과 | 통과 | 통과 | 같음 |
| analyze | 통과 | 통과 | 통과 | 통과 | 같음 |
| diet | 통과 | 통과 | 통과 | 통과 | 같음 |
| sheet-food | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-end | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-375 | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-routines-375 | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-routines-confirm-375 | 통과 | 통과 | 통과 | 통과 | 같음 |
| settings-routines | 통과 | 통과 | 통과 | 통과 | 같음 |
| editor | 건너뜀 | 건너뜀 | · | · | 같음 |
| line-sheet | 건너뜀 | 건너뜀 | 통과 | 통과 | 같음 |

`editor`·`line-sheet`의 `눌림 반응`은 전: `건너뜀 — Astryx 화면: mouse.down으로 눌림이 안 칠해진다(제약)`, 후: `건너뜀 — 누를 요소가 없다`(요소 단위로 빠졌다). 판정은 같다.

### EXPECTED_BARS (실제로 잰 층 수 — `유리` 상세의 `층 N개`)

| 장면 | 기대(이상) | 잰 값 |
|---|---|---|
| home · home-end · home-375 · history · history-detail · history-detail-edit · analyze · diet · diet-log-open · settings · settings-end · settings-375 · settings-routines(-375·-confirm-375) | 1 | 1 |
| home-resume · settings-open | 2 | 2 |
| session · session-375 · session-open-b | 1 | 1 |
| session-rest | 2 | 2 |
| sheet-home · sheet-food | 1 | 2 (탭바 + 시트) |
| sheet-finish · sheet-timer | 1 | 3 |
| line-sheet | 1 | 1 |
| summary · editor | (없음) | 0 (유리 칸 비움) |

### 새 칸 (before에서는 기록만)

`탭 누름`·`섬 버튼`: 모든 장면 `건너뜀`(Astryx 탭·섬이 아직 없다). `마지막 요소`: 화면 아래에 붙은 띠가 없어 `건너뜀`(RR3 전의 탭바는 떠 있다). `세트 숫자`: `session`·`session-375`·`history-detail-edit`에서 `기록 — 실패였을 것: --text-heading-2-size가 비었다(테마 토큰이 안 걸린 장면)` — 토큰이 없으면 `var()`가 무효라 `font-size`가 물려받은 16px로 풀려 거짓 통과하므로(처음 구현에서 "8개 ≥ 16px"로 통과가 찍혔다), 토큰이 비면 실패로 내게 고쳤다. RR1부터 토큰이 있어 기준이 20px(`--text-heading-2-size`)로 풀리고, 세트 숫자가 그보다 작으면 RR7 전까지 이 칸은 실패일 것이다(판정은 RR7에서 켠다). `테마 토큰`: `editor`·`line-sheet`만 판정(통과, 다크 `rgb(27, 27, 27)` · 라이트 `rgb(241, 241, 241)`), 나머지 `건너뜀`(테마가 안 걸린 장면). 판정을 켜는 때는 `ui-check.mjs`의 `JUDGED` 표 주석에 있다.

### 배치 기록·기준선

- `docs/screenshots/v1.20/before/layout.json`: **28장면**(다크). 라이트 장면은 기록하지 않는다(요소 사각형이 같아야 하는 쪽이 다크 — PLAN).
- 안 쓰는 legacy 선택자 `--unused`: `diet-head`, `diet-mark` (2개). 템플릿 접두사 허용 목록 3개(`cal-diet-dot-`·`diet-mark-`·`tempo-ring-`, 이유는 스크립트에 있다), 라이브러리 클래스 1개(`recharts-surface`).
- 세 숫자 + 넷째 (`node scripts/astryx-inventory.mjs --check`):

```
✓ Astryx를 안 읽는 화면 파일: 45 → 45
✓ 인라인 스타일: 97 → 97
✓ legacy 클래스 쓰임: 520 → 520
✓ 안 쓰는 legacy 선택자: 2 → 2
```

머리 표의 예상값과 같다(RR0은 화면 파일을 안 고친다 — "늘지 않는다"만 성립).

### 첫 화면 (`npm run build && node scripts/first-screen.mjs` — 앱을 안 바꾼 지금의 값)

```
첫 화면까지 (Chromium, CPU 4배 느리게, localhost, 5번의 중앙값)
- 캐시 없는 첫 방문: 415ms  (443, 423, 406, 413, 415)
- 서비스워커 캐시로 다시 열기: 146ms  (207, 137, 146, 150, 138)
```

PLAN "확인한 것" 3의 923ms·271ms보다 작다(제약 33). RR1의 3배 선은 **이 값**(415·146ms)이 기준이다 — 첫 방문 1245ms, 다시 열기 438ms를 넘으면 멈추고 묻는다.

### 실행 결과

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드).
- `Test Files  69 passed (69)` · `Tests  1640 passed (1640)`
- 빌드 성공(`npm run build` — 위 check에 포함).
- `git rev-list --count main..HEAD` = 2 (작업 커밋 + 이 기록 커밋).
- Argos: `ARGOS_TOKEN 없음` → 건너뜀.

### 하지 않은 것

- `ui-check.mjs`의 `--check` 정적 검사(`after` 전용)는 안 건드렸다 — RR3이 `탭바 자리`를, RR10이 `.stepper` 항목을 고친다(PLAN).
- `scripts/screenshots-glass.mjs`의 `탭바 자리` 줄은 RR3이 지운다(PLAN). 이 도구(`--engine=webkit`)는 선택자만 바꿨고 돌려 보지 않았다(`npm run check`·CI에 안 걸린다).
- `tests`가 못 보는 동작(새 `inPage*` 검사의 브라우저 안 동작)은 `ui-check` 실행에서 본다: `inPageThemeTokens`·`inPageSetNumber`·`inPageRects`·`compareRects`는 이번 실행으로 확인했고, `inPageTabHit`·`inPageIslandButtons`·`inPageLastVisible`(띠가 있는 경우)·`--press-shot`·`--same-layout`은 **대상(Astryx 탭·섬·붙은 띠)이 아직 없어** 실제 판정 경로는 RR3·RR7에서 처음 돈다. 그때 이 검사가 틀리면 도구 쪽을 먼저 의심한다.

### 실기기 확인

없음(RR0은 앱 코드를 안 바꿨다).

### 리뷰어에게 묻는 것

- `ui-check`가 라이트까지 전 장면을 찍어 `before`가 5분 30초로 늘었다. 이대로 두어도 되는가(`--only`로 줄일 수 있다).

---

## RR1. 테마를 앱 뿌리에

### 범위

| 커밋 | 바뀐 파일 | 내용 |
|---|---|---|
| `171d509` | 72개: `src/ax/theme.ts`(새)·`src/ax/index.tsx`(`AppRoot` 신설, `AxRoot`는 틀만)·`src/App.tsx`(`AppBody` + `<AppRoot>` 한 곳)·`src/main.tsx`(`index.css`를 App보다 먼저)·`index.html`·`src/ax/ax.css`·`src/styles/{global,glass}.css`·`scripts/ui-check.mjs`·`scripts/legacy-scope.test.mjs`(새)·`src/lib/{v117,v120}.test.ts`·`README.md`·`docs/ASTRYX-INVENTORY.md`·`docs/screenshots/v1.20/after/`(57개) | 테마를 앱 뿌리에, legacy CSS 가두기, 번짐 되돌리기, 검사 |
| 이 기록과 같은 커밋 | `scripts/lib/ui-check-lib.mjs`(눌림 기다림 하한)·`docs/screenshots/v1.20/after/`(다시 찍음)·이 문서 | 아래 "PLAN과 다르게 한 것" 3 |

테스트: 파일 69 → 70(`scripts/legacy-scope.test.mjs`), 테스트 1640 → 1655(`v120.test.ts` +6, `legacy-scope.test.mjs` +8, `v117.test.ts`는 두 테스트를 같은 뜻으로 바꿔 개수가 그대로).

### PLAN 검증 항목 ↔ 테스트·확인

| PLAN 검증 | 어디서 |
|---|---|
| `AppRoot`를 정적으로 import, 반환 갈래가 `<AppRoot>` 밖에 없다 | `v120.test.ts` "v120 RR1: App.tsx가 ./ax에서 AppRoot를 정적으로 import하고 …" |
| `<Theme`은 `AppRoot` 안에 한 번 `mode="system"`, `AxRoot` 본문에 `Theme`·`SizeProvider` 없음 | "v120 RR1: ax/index.tsx에서 <Theme은 AppRoot 안에 한 번 …" |
| `/built`·`defineTheme`을 import하는 파일은 `theme.ts` 하나, 이름과 정적 CSS의 짝 | "…theme.ts 하나이고 defineTheme은 0건이다", "…이름과 …theme-<이름>/theme.css의 이름이 같다" |
| `main.tsx`는 Astryx를 직접 안 읽고 `styles/index.css`를 읽는다 | "v120 RR1: main.tsx는 … index.css를 App보다 먼저 읽는다", `v117`의 옮긴 테스트 |
| `index.html` color-scheme `light dark` | "v120 RR1: index.html의 color-scheme 메타가 light dark다" |
| `global.css`에 `@scope` 밖 맨 `button`·`input` 규칙 없음, `ax.css`에 `[data-astryx-theme] button` 없음, 두 뿌리 목록이 같다 | `scripts/legacy-scope.test.mjs` 앞 다섯 (`.css`는 vitest에서 `?raw`가 비어(제약 3) `node:fs`를 쓰는 `.mjs` 테스트로 읽는다 — `src/`의 테스트는 `node:fs`를 못 쓴다, 제약 13) |
| `v117.test.ts:93`·`:105`를 옮기고 `:147`은 그대로 통과 | `v117.test.ts` "main.tsx는 … App.tsx는 ./ax만 읽는다", "AppRoot는 mode=system만 …"; `:147`("OO3 화면 맨 바깥이 AxRoot이고 App은 lazy로만")은 안 고치고 통과 |
| `ui-check after --check`의 `테마 토큰` 전 장면 × 다크·라이트 통과 | 아래 "ui-check 결과" (56/56). `JUDGED['테마 토큰']`을 `true`로 켰다 |
| `--same-layout`: 다크 28장면 요소 사각형이 `before`와 같다 | 28/28 "요소 같다" |
| 기존 검사(`줄 안 버튼`·`여백 한 벌`·`눌림 반응`)가 그대로 통과 | 아래 "ui-check 결과" |
| 첫 화면, 오프라인 | 아래 |

### ui-check 결과 (`node scripts/ui-check.mjs after --check --ver=v1.20 --same-layout=all`)

- 56장 (28장면 × 다크·라이트). `--same-layout`: **28/28 통과** (editor 163, line-sheet 201 포함).
- `테마 토큰` 칸: **56/56 통과** (다크 `rgb(27, 27, 27)` · 라이트 `rgb(241, 241, 241)`).
- 실패는 RR0 전부터 있던 `label-content-name-mismatch` 네 곳뿐: `session`·`session-375`·`session-open-b`(`자리 없음 — 대체운동 고르기`), `sheet-food`(`… 추가` 10건). 종료 코드 1은 RR0와 같다.
- `유리` 칸: 다크·라이트 전부 통과(라이트 실패 0). `눌림 반응`: 전부 통과. `여백 한 벌`·`줄 안 버튼`·`가로 넘침`·`여백 격자` 통과.
- 흐름: 막 눌러 닫기·막 두 번 누르기·움직임 줄이기에서 닫기 통과, **오프라인 통과** (새 흐름 — precache가 끝난 뒤 `setOffline(true)` → `reload` → 홈 → 시작 → 세트 ✓ → 휴식 바).

### 첫 화면·번들·precache (`npm run build && node scripts/first-screen.mjs`)

| | RR0 (앱을 안 바꾼 값) | RR1 | 배수 | 멈춤 선(3배) |
|---|---|---|---|---|
| 캐시 없는 첫 방문 | 415ms | 542ms (579, 538, 542, 539, 542) | 1.31 | 1245ms |
| 서비스워커 캐시로 다시 열기 | 146ms | 233ms (262, 234, 217, 233, 232) | 1.60 | 438ms |

- 선 아래다. 판단은 실기기 확인 ⑨가 한다.
- `index.js` gzip 342.57KB + `index.css` gzip 54.90KB ≈ 397KB (PLAN 위쪽 한계 449KB 안; 전은 약 190KB).
- `precache  27 entries (2573.44 KiB)` (PLAN 확인 때: 28개, 2,569.51KiB).

### 세 숫자 + 넷째 (`node scripts/astryx-inventory.mjs --check`)

```
✓ Astryx를 안 읽는 화면 파일: 45 → 44
✓ 인라인 스타일: 97 → 97
✓ legacy 클래스 쓰임: 520 → 520
✓ 안 쓰는 legacy 선택자: 2 → 2
```

머리 표의 예상값(45→44 / 97 / 520)과 같다. `App.tsx`가 Astryx를 읽게 되어 한 칸 줄었다.

### legacy 뿌리 목록

`.app, .screen, .session, .onboarding, .sheet-backdrop, .center-note, .banner` — `grep`으로 확인했다. PLAN의 목록에서 **`.banner`를 더했다**: `UpdatePrompt`의 `.banner.update-prompt`가 시작 실패·불러오는 중·온보딩 갈래에서는 `.app`·`.screen` 밖에 놓여, 그 안의 버튼(`업데이트`·`나중에`)이 legacy 규칙을 잃는다. `.update-prompt`를 새로 적으면 legacy 클래스 쓰임이 520 → 521로 늘어 "늘지 않는다"를 어기므로 이미 `global.css`에 있는 `.banner`를 뿌리로 썼다(화면 안의 배너는 이미 `.screen` 안이라 겹쳐도 해가 없다).

### PLAN과 다르게 한 것

1. **테마가 앱 전체에 걸리면서 번지는 것이 PLAN("확인한 것" 4)보다 많았다.** `--same-layout`이 잡았다(전 장면의 제목 높이 40.5 → 39, 버튼 폭 1~1.5px, 카드 한 줄 높이). 원인 둘을 같은 `@scope` 블록(`global.css`, legacy 뿌리 → `.ax-scope`까지)에서 되돌렸다:
   - `Theme`이 앱 전체를 감싸는 `<div display: contents>`에 `font-family: Figtree`·`color: #fff`를 건다 → 뿌리에 `:where(:scope) { font-family: var(--font-sans); color: var(--text) }`. `--font-sans`는 `:root`에 새로 둔 토큰이고 `body`도 같은 토큰을 쓴다(글꼴 목록이 한 곳).
   - 정적 `theme-neutral/theme.css`의 `@layer reset`이 `h1`~`h6`·`p`·`small`·`code`·`pre`·`hr`에 글꼴·크기·줄 높이·색·테두리를 건다(범위가 문서 전체) → `:where(h1, …) { font-family·font-size·font-weight·line-height·color: revert }`, `:where(hr) { border: revert }`. 명시도 0이라 legacy 클래스 규칙이 이긴다.
2. **`glass.css`·`ax.css`의 `html[data-astryx-theme] { --glass-solid·--glass-sheet·--glass-edge }`를 `html[data-astryx-theme] .astryx-bottom-sheet`로 좁혔다.** PLAN은 "legacy 시트의 면·테두리가 저절로 달라진다"를 예상 변화로 적었지만, 그러면 다크의 `유리` 칸(`sheet-home`·`sheet-finish`·`sheet-timer`·`sheet-food`)이 글자 대비 4.34:1(기준 4.5)로 실패했다. legacy 시트는 RR2가 이을 때까지 예전 색 그대로다. 문서 배경은 PLAN대로 바뀐다(다크 `#0b0b0d` → `rgb(27,27,27)`).
3. **`ui-check` 하네스 두 곳.** (a) 유리 칸이 CDP로 미디어를 흉내 내고 `detach`하면 색 체계가 라이트로 풀린다(제약 31). legacy 시트가 `html[data-astryx-theme]`의 라이트 규칙을 받던 때에는 `시트 비침`이 라이트 값(α0.7)으로 나와 다크 장면이 실패했다 — `detach` 뒤 `page.emulateMedia({ colorScheme })`로 복원. (b) `measurePress`의 기다림이 `--duration-fast`(테마 토큰)를 읽는데, 테마가 앱 뿌리에 오자 토큰이 읽혀 기다림이 195 → 145ms로 줄었고(전엔 못 읽어 175+20) legacy의 뗄 때 전이(125ms)가 안 끝나 `안 돌아옴`이 전체 실행마다 무작위 1건씩 났다 → 하한을 195ms로(`Math.max(…, 195)`). 하한을 둔 뒤 전체 실행에서 눌림 실패 0건.
4. `ui-check`의 재개 줄 선택자(`/진행 중/`)를 `.last()`로: 홈 카드(`today-card-btn`, "… 진행 중 · 0분")와 재개 줄이 둘 다 `진행 중`을 담아 strict mode로 걸렸다(RR0 `before` 때는 한쪽만 맞았다 — 이유는 확인 못 했다). 재개 줄이 DOM에서 뒤라 `.last()`가 그것이다. `screenshots-glass.mjs`도 같게.
5. 오프라인 흐름은 PLAN대로 `ui-check`에 더했다(다른 장면은 서비스워커를 막으므로 서비스워커를 허용하는 새 문맥에서 따로).

### 결함 복원 (`cp` 백업 → 결함 → 테스트 → 복구 → `cmp`)

| # | 되살린 결함 | 실패한 검사 | 원상복구 |
|---|---|---|---|
| ① | `App.tsx`에서 `<AppRoot>` 감싸기를 뺌 | `v120` "App.tsx가 ./ax에서 AppRoot를 … 갈래가 없다" | `cmp` 같음 |
| ② | `global.css` 끝에 `@scope` 밖 `button { min-height: 44px }` | `legacy-scope.test.mjs` "@scope 밖의 맨 button·input 규칙이 없다" + `ui-check --same-layout=editor`: `editor` 0번째 button `[16,12,65.5,36] → [16,12,65.5,44]` (Astryx 버튼이 44로 부푼다) | 같음 |
| ③ | `ax.css` 리셋에서 `to (…)` 한계를 뺌 | **`--same-layout=settings`는 못 잡는다**(통과 — 이 검사의 구멍). `legacy-scope.test.mjs` "리셋은 … to (legacy 뿌리)로 감싸여 있다"·"두 파일의 뿌리 목록이 …" 2건이 잡는다(PLAN이 시킨 선택자 스캔) | 같음 |
| ⑳ | `theme.ts`를 `defineTheme({ name: 'workout', extends: neutralTheme })`로 | `v120` "…defineTheme은 0건이다", "…theme-<이름>/theme.css의 이름이 같다" | 같음 |
| 새① | `global.css`의 `font-family: revert`를 `inherit`로 | `legacy-scope.test.mjs` "테마의 h1·p 규칙이 번지지 않게 …되돌린다" | 같음 |
| 새② | `glass.css`의 `.astryx-bottom-sheet`를 `html`로 | "테마에서 만든 시트 면·테두리 토큰은 html이 아니라 …" | 같음 |
| 새③ | `:where(:scope)` 규칙을 없앰 | "Theme 감싸개가 거는 글꼴·글자색을 … 되돌린다" | 같음 |

④(RR2)·⑤~⑲·㉑·㉒(RR3~)는 이번 작업의 범위가 아니다.

### 과거 판정 불변 확인

- `git diff --stat main..HEAD -- src/db src/store`: 출력 없음.
- `git diff --stat main..HEAD -- src/lib`: `src/lib/v117.test.ts`(스캔 옮김)·`src/lib/v120.test.ts`뿐 — 판정 파일 없음.
- 골든 테스트 수정 없음. 달라지는 것: 문서 배경(다크 `#0b0b0d` → 테마 본문 배경), 앱 전체가 `color-scheme: light dark`.

### 변이 테스트

대상 없음 — `src/lib`의 판정·계산 코드를 안 바꿨다(위 `git diff --stat`: 테스트 파일 둘뿐).

### 수정표 밖 테스트

- `src/lib/v120.test.ts`: "v120 RR0: 새 칸은 before(와 판정을 안 켠 칸)에서는 기록만 하고 …" — `JUDGED`의 `'테마 토큰'`을 `false` → `true`로. PLAN("작업이 끝날 때 해당 값을 true로")의 기계적 결과다.

### 실행 결과

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드).
- `Test Files  70 passed (70)` · `Tests  1655 passed (1655)`
- 빌드 성공. `git rev-list --count main..HEAD` = 5 (RR0 + RR1 작업·기록 커밋 + 계획 병합분 포함).

### 하지 않은 것

- `theme-color` 메타·매니페스트·스플래시·상태바(범위 제외). 폰이 라이트일 때 안 옮긴 화면은 색이 아직 어둡다 — RR2.
- `README.md` "Limitations"의 "나머지 화면은 아직 다크 고정"은 RR2·RR9가 고친다.

### 실기기 확인

사람 확인 필요 — 이 작업은 RR2와 떼어 배포하지 않는다(PLAN). 폰이 라이트일 때 안 옮긴 화면의 글자가 읽히는지는 RR2 뒤 ①로 본다. 지금 다크 폰에서는 ⑨(첫 화면이 "색 없이 잠깐 뜨는가", 위 값 542·233ms)와 ②~⑤ 중 헬스장 경로(✓ 1탭, `+`·`−`)가 전과 같은지만 본다.

### 리뷰어에게 묻는 것

- "PLAN과 다르게 한 것" 2: legacy 시트의 면을 PLAN의 예상(테마색으로 바뀜)과 달리 그대로 뒀다. RR2가 `--glass-*`를 어떻게 이을지에 따라 `.astryx-bottom-sheet`로 좁힌 이 선택이 RR2 쪽에서 되돌려질 수 있다.
- 같은 3: 눌림 검사의 `안 돌아옴` 무작위 실패의 원인을 "기다림이 짧아졌다"로 정했는데, 하한을 둔 뒤 전체 실행 한 번에서 0건이었다(여러 번 돌려 본 것은 아니다).

---

## RR2. 안 옮긴 화면의 색을 테마에 잇기

| 항목 | 내용 |
|---|---|
| 바뀐 것 | `global.css` `:root` 색 토큰 13개(PLAN 12 + `--text-placeholder`)를 `var(--color-…)`로, 리터럴 약 50곳을 `color-mix`·테마 토큰으로, `color-scheme: dark` 삭제. `glass.css`: `html[data-astryx-theme]`에 `--glass-bar`, 루트의 `--glass-sheet/solid/edge`를 테마 토큰으로, 라이트에서 legacy 띠 흐림의 `brightness()` 뺌. `ax.css`: 상태바 받침 `.ax-screen::before` → `body::before`. README Limitations 문구. `ui-check`: 차트 색·라이트 배경이 다크보다 밝은지 판정 추가 |
| 테스트 | `scripts/legacy-scope.test.mjs`의 `v120 RR2 — 색 다리` 6개(CSS는 `?raw`가 빈 문자열이라 fs로 읽는 이 파일에 둠). 전체 70파일/1661개 통과, `npm run check` 통과 |
| 세 숫자 | 44→44 · 97→97 · 520→520 · 선택자 2→2 (늘지 않음 — 화면 파일 안 고침) |
| 옮긴 스캔 | `legacy-scope.test.mjs` "테마에서 만든 시트 면·테두리 토큰은…": 전 `html[data-astryx-theme] {` 블록 금지 → 그 블록에 `--glass-sheet|solid|edge` 금지. 같은 뜻(목적이 시트 토큰) — RR1 리뷰 경미 1 |
| 결함 복원 | ④ `:root`의 `--bg`를 `#0b0b0d`로 → `v120 RR2` 2건 실패, 원상복구 확인(`git diff --stat` 동일) |
| 차트 | `getPropertyValue`로 읽은 `light-dark(…)` 글자가 SVG에 그대로 먹어 계산된 값이 `rgb(`: 선 `241→27`, 축 `158→71`(다크→라이트). `chartColor` 안 고침. 전환을 저절로 따라간다 |
| 라이트 배경 | `rgb(241,241,241)` > 다크 `rgb(27,27,27)` 전 장면 통과 |
| 접근성 | 심각 위반 칸은 RR1과 같다(`session`·`sheet-food` 기존 실패만) |
| 변이 | 대상 없음(`src/lib` 안 고침) |

**실패로 남은 것 — `유리` 칸 `글자 대비` (전 장면 다크·라이트, RR1에선 통과)**: 검사가 띠 뒤에 accent·ok 면이 있다고 가정하고 글자를 잰다. Neutral 테마의 accent는 다크에서 `#f1f1f1`, 라이트에서 `#1b1b1b`라 `--text-dim`(secondary)이 2.5~4.3:1이 된다(예: `"식단" 2.52:1 (accent 위)`). 옛 주황 accent 가정에서 맞춘 검사다. 이 대비는 어떤 띠 색으로도 못 올린다(다크: 뒤 비침 0.30만으로 이미 모자람). 고칠 자리는 테마(RRT)나 검사의 가정이다 — RR2에서 검사를 끄거나 고치지 않았다. 지휘자 판단 필요. `after --check` 종료 코드는 1.

**하지 않은 것:** `bodyLuminance`를 `inPageLayout`에 더하지 않고 기존 `테마 토큰` 칸의 배경색으로 견줬다. 라이트 `유리` 값 재조정은 RRM 몫. 화면 검증(스크린샷 육안)은 안 했다. 실기기 ① 사람 확인 필요.

---

## RRM. 유리를 걷고 Astryx 표면으로

RR2(`e159efc`)와 **한 묶음으로 리뷰**한다(RR2 "구현 뒤 처리"). RR2 단독으로는 `유리` `글자 대비`가 51장면 실패였다 — 그 칸이 이 작업에서 없어졌다.

### 범위

| 항목 | 내용 |
|---|---|
| 지운 것 | `src/styles/glass.css`(+`index.css` import), `ax.css`의 시트 유리 블록(195-271)과 막 덧칠, `src/lib/glassDiag.ts`·`glassDiag.test.ts`, 설정의 "유리" 줄(import·상태·줄), `scripts/lib/glass-check.mjs`, `scripts/screenshots-glass.mjs`, `screenshots.mjs`의 유리 칸·`GLASS_COLUMNS`, `ui-check.mjs`의 `유리` 칸·`glassVerdict`·`--glass=`·`알약 구별`·`inPageGlassOn` 쓰는 흐름 |
| 옮긴 것 | `BAR_SELECTOR`·`SHEET_SELECTOR`·`inPageVisibleDef`·`installScript`·`freePort`·`inPageOverflow`·`inPageTabbarSpot` → `ui-check-lib.mjs`. `window.__glass` → `window.__ui`(색 도우미는 쓰는 것만 남김) |
| legacy 재질 | `.tabbar`·`.resume-strip`·`.session-header`·`.rest-bar`·`.sheet` = `--color-background-surface` + `--color-border`(그림자·빛 선언 삭제). 알약 = `--color-background-muted` + `--color-border-emphasized`. `.sheet-backdrop` = `--color-overlay`. `.rest-bar-done`은 같은 초록 두 겹을 표면 위에. `motion.css` 주석 |
| 새 검사 | `띠`(`inPageBars` — `EXPECTED_BARS` 이상·`backdrop-filter` none·배경 알파 1, `탭바 자리`는 이 칸의 하위로), `시트 버튼`(`inPageSheetButtons` + `sheetButtonVerdict`), 정적 `backdrop-filter` 0건(`barStaticChecks`) |
| README | "유리는 떠 있는 층에만…" 항목 전체와 Limitations의 "투명도 줄이기" 줄 삭제 (표면 문장은 RRT) |
| 테스트 | 새 `scripts/ui-check-lib.test.mjs` 8개, `legacy-scope.test.mjs`에 `v120 RRM` 5개. 전체 **70파일/1658개**, `npm run check` 통과 |
| 커밋 | 아래 "실행 결과" |

### PLAN 검증 항목 ↔ 테스트·측정

| PLAN 검증 | 결과 |
|---|---|
| 글자 0건 + 파일 없음 + 설정에 `유리` 없음 | `legacy-scope.test.mjs` `v120 RRM` 1~3번. **`backdrop-filter`만 예외 세 파일**: 검사기 `ui-check-lib.mjs`(none인지 재는 곳)·`ui-check-lib.test.mjs`·`v118.test.ts`(기존 "앱 코드에 backdrop-filter 없음" 스캔)는 낱말을 담을 수밖에 없다 |
| `ui-check after --check` 종료 코드 0 | **1 — 남은 실패는 RRM 것이 아니다.** 접근성 `label-content-name-mismatch` 네 칸(`session`·`session-375`·`session-open-b`·`sheet-food`, 제약 32·RR2 `screen-check`와 같은 노드)과 `--same-layout`의 `settings` 계열 일곱(아래). `띠`·`시트 버튼`·정적·흐름·테마·차트·여백 한 벌은 전부 통과 (`.reports/rrm-uicheck.txt`). `유리` `글자 대비` 51장면 실패는 없다 |
| `띠` 칸이 전 장면 다크·라이트 통과, 장면별 띠 수 | 56장면 전부 통과, 빈 통과 0(0이면 실패로 내는 `EXPECTED_BARS` 유지). 수: 탭 장면 1(`tabbar`), `home-resume`·`settings-open`·`session-rest` 2, 세션 장면 1(`session-header`), `sheet-home`·`sheet-food` 2(탭바+시트), `sheet-finish`·`sheet-timer` 3(상단 바+휴식 바+시트), `line-sheet` 1(`astryx-bottom-sheet`). 라이트도 같다. 모든 층 α1 |
| axe 대비·심각 위반이 RR2보다 늘지 않음 | 대비 위반 수 같음(`sheet-timer` 1건 외 0), 심각 위반 수 같음. `incomplete`만 줄었다(sheet-home 23→13, sheet-food 57→25, line-sheet 9→4 …: 면이 불투명해져 판정 불가가 줄었다) |
| `시트 버튼`이 시트 다섯 장면 다크·라이트 통과 | 통과. 값은 아래 "판정을 좁힌 것" |
| `--same-layout=all`(RR2 배치 기록 `.reports/rr2-layout-base.json`) | 25장면 중 **18 통과, 7 실패 = 전부 `settings` 계열**(`settings`·`-end`·`-375`·`-open`·`-routines`·`-routines-375`·`-routines-confirm-375`): 진단 목록의 한 요소 높이 627→557.5(−69.5, "유리" 줄 한 줄 높이) 외 같다. PLAN의 예외. 줄 아래 요소가 69.5만큼 올라간 것만 다른지는 화면 검증자가 본다 |
| 대비 증가(`prefers-contrast: more`)로 `home`·`session`·`sheet-finish` | 다크·라이트 6칸 모두 `pageerror` 0, 가로 넘침 없음(scrollWidth 390/390). 일회용 스크립트로 쟀다(레포에 안 남김) |
| `npm run knip`·`npm run check` | 통과 |
| 화면 검증자 | 이 기록의 몫이 아니다. 스크린샷은 `docs/screenshots/v1.20/after/`(56장, `layout.json`)를 새로 찍었다 |

### 판정을 좁힌 것 (PLAN과 다르게 한 것)

`시트 버튼`을 PLAN 문장 그대로(모든 버튼 × "시트 면과 같은 색 아님" × "다크 값이 라이트보다 0.05 넘게 낮지 않음")로 돌리니 처음 실행이 실패했다 — 버튼이 나쁜 것이 아니라 판정이 거칠었다:

1. **글자만 있는 버튼**(목록 줄 `Day 1 — Push`, 시간 칩 `1:00`, 종목 칩 `가슴`)은 다크·라이트 모두 면·선이 시트와 같은 색(대비 1)이다. 면으로 알려지는 버튼이 아니라 판정에서 빼고 "글자만 N개 제외"로 개수를 찍는다. 다크·라이트 **둘 다** 1일 때만 뺀다 — 다크에서만 1이면(RR2가 본 `sheet-food` 다크) 실패다.
2. **다크가 라이트보다 낮은 것**은 3:1(WCAG 비텍스트 대비) 미만일 때만 실패다. 반전 버튼(`기록 마치기`·`2:30 시작`)은 다크 13.4:1 · 라이트 17.2:1로 값이 달라도 둘 다 또렷한데, 낮다는 것만으로 실패가 났다.

PLAN의 뜻("다크에서만 버튼이 면에 묻히는 일을 잡는다")은 그대로다. 경계는 `ui-check-lib.test.mjs`가 잠근다. **리뷰어에게 묻는 것**: 이 좁힘이 맞는지(특히 1 — 글자만 버튼은 뺐다).

값(다크 · 라이트 대비): `sheet-food` 추가 버튼 1.37 · 1.20(RR2가 묻힌다고 본 버튼 — 이제 면이 있는 버튼으로 잡힌다), `sheet-finish` 종목 칩 1.14 · 1.13, `sheet-timer` 시작 13.4 · 17.2, `line-sheet` 세트 증감 1.37 · 1.14.

### 그 밖에 PLAN과 다르게 한 것

| 무엇 | 까닭 |
|---|---|
| `v120.test.ts`의 RR0 스캔 여섯 중 **`cssVar` 스캔은 지웠다** (옮기지 않음) | `cssVar`를 쓰던 것이 `알약 구별`(지워짐)뿐이라 도우미째 안 옮겼다. 안 쓰는 코드를 옮겨 두지 않는다 |
| `v120.test.ts`: `ui-check.mjs`의 "새 칸은 유리 검사보다 먼저 잰다" → "띠 칸 옆에서 돈다" | CDP `detach`가 색 체계를 푸는 순서 걱정(제약 31)은 유리 검사가 없어져 사라졌다. 다크·라이트 두 짝의 위치만 잠근다 |
| `astryx-inventory` 세 숫자 `520→515` 예상이 **`520→520`** | 세는 단위가 "파일마다 서로 다른 legacy 클래스 이름"이라, 설정 줄이 쓰던 `row`·`row-main`… 은 같은 파일의 다른 줄이 계속 쓴다. 표(`ASTRYX-INVENTORY.md`)는 안 새로 썼다 |
| `ui-check.mjs`가 `미디어 흉내`(`emulate`)·`SCHEME`을 잃었다 | 유리 끄기 검사만 쓰던 것(린트 `no-unused-vars`) |
| `screenshots.mjs`(v1.18 도구)는 유리 칸만 지우고 `freePort`·`inPageOverflow`·`installScript`를 `ui-check-lib.mjs`에서 가져온다 | |

### 지운 테스트 (RRM 스캔 규칙 4의 예외)

- `src/lib/glassDiag.test.ts` 12개(`glassDiag.ts`와 함께)
- `src/lib/v119.test.ts` "SettingsScreen이 glassDiagnosis를 부르고 '유리' 줄을 가진다" (`QQ1 — 유리 재료`)
- `scripts/legacy-scope.test.mjs` "v120 RR1: 테마에서 만든 시트 면·테두리 토큰은 html이 아니라 Astryx 시트에만…", "v120 RR2: html[data-astryx-theme] 블록이 --glass-bar를…", "v120 RR2: 라이트에서 legacy 띠 넷의 흐림에 brightness()가 없다"
- `v118.test.ts`의 주석만 고쳤다.

### 결함 복원 (`cp` 백업 → 결함 → 테스트 → 복구 → `cmp`)

| 되살린 결함 | 실패한 테스트 | 원상복구 |
|---|---|---|
| `global.css` `.sheet`의 면을 `rgba(22,22,26,.5)`로 | `v120 RRM: 띠·시트…테마 표면` + `v120 RR2: # 색 리터럴과 rgba( 0건` | `cmp` 같음 |
| `sheetButtonVerdict`의 "다크에서 시트 면과 같은 색" 검사를 `if (false)`로 | `v120 RRM: 시트 버튼: 다크에서만 시트 면과 같은 색이 되면 실패한다` | `cmp` 같음 |
| `barStaticChecks`가 `backdrop-filter`를 못 알아보게 | `v120 RRM: src/**/*.css에 backdrop-filter가 있으면 실패하고…` | `cmp` 같음 |
| 설정 화면에 "유리" 줄을 되살림 | `v120 RRM: SettingsScreen.tsx에 유리 글자가 없다` | `cmp` 같음 |

### 과거 판정 불변·변이

`src/lib`의 판정 코드는 안 건드렸다(`glassDiag.ts` 삭제뿐 — 판정이 아니라 진단 표시). 변이 테스트: **대상 없음**(바뀐 `src/lib` 파일 없음).

### 실행 결과

- `npm run check`: 흔적·Astryx 뒷걸음·린트·knip·테스트·빌드 전부 통과. 린트 경고 1건(`SessionScreen.tsx:131` 안 쓰는 `eslint-disable`)은 이 작업이 안 건드린 파일의 기존 것
- `npm test`: Test Files 70 passed (70) · Tests 1658 passed (1658)
- `git rev-list --count main..HEAD`: 11 (RR2 구현 `e159efc` 이후 RRM 코드 커밋 `1e5cb01` + 이 스크린샷·기록 커밋)
- 커밋: `1e5cb01` 20파일(코드·테스트·README·기록), 이어서 `docs/screenshots/v1.20/after/` 새로 찍음(56장+`layout.json`)

### 하지 않은 것

- 화면 검증(스크린샷 육안) — 화면 검증자 몫. `settings` 계열 배치 차이(−69.5px)와 라이트·다크 `sheet-food` 하단 버튼, 띠 뒤 글자 겹침이 사라졌는지는 눈으로 봐야 한다
- `label-content-name-mismatch` 네 칸 — RR0 전부터 있던 legacy 마크업의 `aria-label`이라 이 작업 범위가 아니다(RR5·RR7이 옮길 때 사라진다). 그래서 `ui-check after --check` 종료 코드는 0이 아니다

### 실기기 확인

- 폰(라이트·다크)에서 띠 뒤로 지나가는 글자가 띠 글자와 겹쳐 지저분하던 것이 사라졌는지(`settings`·`history-detail`·`diet`을 스크롤하며)
- 시트가 뜰 때 뒤 막이 라이트에서 눈부시지 않은지 — 막은 이제 테마 `--color-overlay`(라이트 50%·다크 80% 검정)다. 예전보다 진하다
- iOS "대비 증가"를 켠 채 시트·탭바 (유리 끄기 규칙이 없어졌다 — 처음부터 불투명이라 변화가 없어야 한다)

### RRM 보완 (개정 3 — 화면 검증 반려 반영)

`1e5cb01`은 그대로 두고 둘째 커밋으로 더했다. `ExerciseCard` `대체` 버튼 이름 → `대체 — 자리 없음, 대체운동 고르기`, `FoodLogSheet` `.diet-item` 버튼의 `aria-label` 삭제, `ui-check.mjs` sheet-food의 찾는 이름 → `/(kcal|g|영양 미입력)$/`, `uiConsistency` X8 81줄을 새 이름으로. `v120.test.ts`에 보완 스캔 셋 추가. 판정 명령(`--layout-base`·`--same-layout` 21장면): **종료 코드 0**, 출력 `.reports/rrm-fix-uicheck.txt`. 접근성 네 칸 없어짐, 심각 위반 0건. 변이: 대상 없음.

리뷰 반영: `.diet-item` 스캔이 `onClick={() => …}`의 `>`에서 멈춰 결함을 못 잡던 것을 className부터 첫 `</button>` 앞까지 자르는 방식으로 고쳤다. 결함 복원: `onClick={() => add(f)}` 다음 줄에 `aria-label`을 넣으면 이 테스트가 실패하고, 되돌리면 통과(`cmp` 동일). `SettingsScreen.tsx`의 지운 `glass` 상태 고아 주석도 지웠다.

---

## RR11. 라이트/다크가 폰 설정을 따른다

### 범위

| 바뀐 것 | 내용 |
|---|---|
| `index.html` | `theme-color` 한 줄 → 둘(`media` light `#f1f1f1` · dark `#1b1b1b`, `neutralTheme.tokens['--color-background-body']` = `light-dark(#f1f1f1, #1b1b1b)`의 A·B) |
| `src/ax/ax.css` | 상태바 받침 `background: #0b0b0d` → `var(--color-on-light)`(테마 값 `#111111`, 라이트·다크 같음) |
| `scripts/ui-check.mjs` | `색 체계 전환` 흐름(`runSchemeFlow`, 여덟 장면, Chromium은 `after --check`마다), `--webkit`(같은 흐름 WebKit + `after/webkit/`에 장면 × 다크·라이트), `--safe-area`(`runSafeArea`, 위 47·아래 34, `상태바 받침`) |
| 테스트 | `v120.test.ts` RR11 describe 4개, `scripts/rr11.test.mjs` 1개(.css는 vitest ?raw가 비어 fs — 제약 3) |

### PLAN 검증 항목 ↔ 테스트·확인

| PLAN 검증 | 테스트·확인 |
|---|---|
| theme-color 둘, media light·dark | `v120 RR11: index.html에 theme-color 메타가 정확히 둘이고…` |
| 두 값 = 테마 토큰의 A·B | `v120 RR11: 두 theme-color 값이 테마의 … A·B와 글자 그대로 같다` (패키지를 import해 견줌) |
| 다크 고정 글자 0건 | `v120 RR11: index.html·src(테스트 제외)에 content="dark"·color-scheme: dark·…가 0건이다` (`prefers-color-scheme: dark`는 뺀다) |
| 받침 규칙에 `#` 리터럴 없음 | `scripts/rr11.test.mjs` `v120 RR11: ax.css의 상태바 받침 규칙…` |
| 도구가 흐름·옵션을 가짐 | `v120 RR11: ui-check.mjs에 색 체계 전환 흐름…` |
| `색 체계 전환` 여덟 장면 (Chromium·WebKit) | `ui-check after --check --safe-area --webkit --ver=v1.20` 종료 코드 0 (아래) |
| `상태바 받침` 세 장면 × 다크·라이트 | 같은 실행, 6건 전부 통과 |
| 스크린샷 | `docs/screenshots/v1.20/after/` 전 장면 다시 찍음 + `home-safe`·`session-safe`·`sheet-finish-safe`(각 `-light`) + `webkit/`(8장면 × 2). 화면 검증자 몫 |

### ui-check 출력 (발췌, `.reports/rr11-uicheck.txt`)

```
- 흐름 통과 색 체계 전환 Chromium home: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 1건(기준 1)
- 흐름 통과 색 체계 전환 Chromium session: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 Chromium summary: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 Chromium history: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 Chromium analyze: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0) · 차트 
- 흐름 통과 색 체계 전환 Chromium diet: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 Chromium settings: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 Chromium editor: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 상태바 받침 home-safe: 받침 없음 · 아래 끝 810/810
- 흐름 통과 상태바 받침 session-safe: 받침 없음
- 흐름 통과 상태바 받침 sheet-finish-safe: 받침 없음 · 아래 끝 790/810
- 흐름 통과 상태바 받침 home-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17) · 아래 끝 810/810
- 흐름 통과 상태바 받침 session-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17)
- 흐름 통과 상태바 받침 sheet-finish-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17) · 아래 끝 790/810
- 흐름 통과 색 체계 전환 WebKit home: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 1건(기준 1)
- 흐름 통과 색 체계 전환 WebKit session: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 WebKit summary: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 WebKit history: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 WebKit analyze: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0) · 차트 �
- 흐름 통과 색 체계 전환 WebKit diet: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 WebKit settings: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 색 체계 전환 WebKit editor: 배경 rgb(27, 27, 27)→rgb(241, 241, 241)→rgb(27, 27, 27) · 제목 rgb(255, 255, 255)→rgb(0, 0, 0) · 대비 위반 0건(기준 0)
- 흐름 통과 상태바 받침 home-safe: 받침 없음 · 아래 끝 810/810
- 흐름 통과 상태바 받침 session-safe: 받침 없음
- 흐름 통과 상태바 받침 sheet-finish-safe: 받침 없음 · 아래 끝 790/810
- 흐름 통과 상태바 받침 home-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17) · 아래 끝 810/810
- 흐름 통과 상태바 받침 session-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17)
- 흐름 통과 상태바 받침 sheet-finish-safe-light: 받침 47px rgb(17, 17, 17) · 픽셀 rgb(17,17,17) · 아래 끝 790/810
```

### 판정을 정한 것 (PLAN에 없던 세부)

- 장면 순서는 `home → session → summary → history → analyze → diet → settings → editor`(PLAN 여덟 장면). `③ 라이트 대비 위반`의 기준은 **같은 걸음을 colorScheme light로 처음부터 연 별도 문맥**이 만든다.
- 제목 글자색은 `h1`, 없으면(`session`) 세션 머리의 `.session-day`를 잰다. `body` 배경은 `AppRoot`의 `mode`와 무관하게 뒤집혀서(리뷰 4절) 배경만으로는 앱의 테마를 못 잰다.
- `home-safe`의 아래 끝은 띠(`.tabbar`) 자체로 잰다. 안의 버튼은 legacy 높이가 띠보다 1px 커서 811이 나온다(이 작업 밖의 기존 마크업).
- `--same-layout=all`을 `before` 기준에 견주면 `settings` 계열 7장면이 실패한다(−69.5px, RRM의 "유리" 줄 삭제 — 이미 DEV-RECORD RRM에 적힌 차이). RR11은 화면 파일을 안 고쳐서 이 실행에서는 쓰지 않았다.
- WebKit은 이 환경에서 장면을 열었고 통과했다(제약 추가 없음).

### 수정표 밖

- `src/lib/v117.test.ts:"@astryxdesign/을 import하는 파일은 src/ax/ 밖에 없다"` — 허용 목록에 `v120.test.ts`를 더했다(RR11 검증이 테마 패키지를 직접 읽어야 해서. 기계적 결과).

### 결함 복원 (`cp` 백업 → 결함 → 테스트 → 복구 → `cmp`)

| 되살린 결함 | 실패한 검사 | 원상복구 |
|---|---|---|
| ㉓ `AppRoot`의 `mode="system"` → `mode="dark"` | `v120 RR11: …0건이다`(+RR1의 mode=system 테스트) · `ui-check after --check`의 `색 체계 전환 Chromium` 7장면(제목 글자색이 안 뒤집힘; `session`도 `.session-day`로 재서 실패) | `cmp` 같음 |
| `index.html` 라이트 `theme-color`를 `#f2f2f2`로 | `v120 RR11: 두 theme-color 값이 …` | `cmp` 같음 |
| `ax.css` 받침 `z-index: 100` → `1` | `ui-check --safe-area`의 `상태바 받침 session-safe-light`(픽셀 255,255,255)·`sheet-finish-safe-light`(127,127,127), 종료 코드 1 | `cmp` 같음 |
| `ax.css` 받침을 `#0b0b0d`로 | `v120 RR11: ax.css의 상태바 받침 규칙…` | `cmp` 같음 |

### 과거 판정 불변·변이

판정 파일(`src/lib`)은 안 건드렸다(테스트 파일 둘만) → 변이 테스트 **대상 없음**. 세 숫자(`astryx-inventory --check`)는 늘지 않았다(check 통과).

### 실행 결과

- `npm run check`: 흔적·Astryx 뒷걸음·린트·knip·테스트·빌드 전부 통과
- `npm test`: Test Files 71 passed (71) · Tests 1666 passed (1666)
- `git rev-list --count main..HEAD`: 16 (이 커밋 전)

### 하지 않은 것

- 수동 전환 버튼, 매니페스트·스플래시 색, 상태바 방식 변경(PLAN 범위 제외)
- 스크린샷 육안 판정(화면 검증자 몫)

### 실기기 확인

- 폰 설정에서 다크 ↔ 라이트를 바꿀 때 홈 화면에 추가한 앱이 따라 바뀌는지(v1.20이 `main`에 머지돼 업데이트된 뒤)
- 라이트에서 앱을 열 때 어두운 스플래시가 잠깐 보이는 것(범위 제외)

리뷰 반영(RR11 반려, 새 커밋): ① `ax.css` 받침 `z-index` 1→100으로 세션 머리·시트 막 위에 그렸다. ② `runSafeArea`가 스크린샷 위 47px의 픽셀을 읽어 판정한다(라이트는 어두움, 다크는 밝지 않음) — ①을 되돌리면 session·sheet-finish 라이트가 실패. ③ `schemeProbe`가 `h1` 없으면 `.session-day`를 잰다 — ㉓에서 session도 실패. ④ `session-safe-light`·`sheet-finish-safe-light` 스크린샷 다시 찍음(상태바 자리 17,17,17), 위 출력 발췌 갱신. 경미: WebKit 흐름은 `after --check`일 때만 돈다.


---

## RRT. 테마 확정: Neutral + 파랑 강조

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `src/ax/theme.ts` | `defineTheme({ name: 'workout', extends: neutralTheme, tokens })` — 덮은 토큰 다섯 |
| `src/ax/index.tsx` | 정적 `theme-neutral/theme.css` import 한 줄 삭제 |
| `src/lib/v120.test.ts` | RR1 테스트 둘(defineTheme 0건·이름 짝)을 RRT 꼴로 옮기고 RRT describe(4개 테스트) 추가 |
| `README.md` | "모양은 테마 한 벌이 정한다" 항목(`parts.css` 문장은 RR3 커밋에서) |
| `docs/screenshots/v1.20/after/` | 56장 + `layout.json` 다시 |

### 단계 (PLAN 출발점 그대로 — 대비 위반이 늘지 않아 45로 내리지 않았다)

| 토큰 | 라이트 | 다크 |
|---|---|---|
| `--color-accent` | blue 50 | blue 65 |
| `--color-accent-muted` | blue 90 | blue 25 |
| `--color-text-accent`·`--color-icon-accent` | blue 45 | blue 80 |
| `--color-on-accent` | neutral 100 | neutral 5 |

### 검증 대응

| PLAN 검증 | 테스트·명령 |
|---|---|
| hex 없음 | `v120 RRT: theme.ts에 #으로 시작하는 색 리터럴이 없다` |
| 이름과 CSS의 짝 | `v120 RRT: 이름과 CSS의 짝 …` (RR1의 스캔을 옮김) |
| 토큰 다섯만, 파랑 단계 | `v120 RRT: 덮는 토큰은 강조 다섯뿐이고 …`, `…주입된 테마의 강조 토큰이 파랑이고 나머지 토큰은 Neutral과 같다` |
| 배치 불변 | `ui-check after --check --same-layout=all --layout-base=<RRT 직전 after/layout.json>` — 전 장면 "요소 같다", 종료 코드 0 |
| 테마 토큰·색 체계 전환(RR11) | 같은 실행, 전 장면 통과(전환 흐름 8장면, 대비 위반 수가 기준과 같다) |
| 대비 | axe serious·critical 0건, color-contrast 위반 수는 색 체계 전환의 "기준"과 같다 |

### 결함 복원

| 되살린 결함 | 실패한 테스트 | 원상복구 |
|---|---|---|
| `index.tsx`에 정적 `theme.css` import 되살림 | `…이름과 CSS의 짝` | `cmp` 같음 |
| `theme.ts`에 `'#2563eb'` 직접 적음 | `…색 리터럴이 없다`, `…토큰 다섯뿐이고` | 같음 |
| 덮는 토큰 하나를 `--color-background-body`로 바꿈 | `…토큰 다섯뿐이고`, `…주입된 테마의…` | 같음 |

### 첫 화면 (`node scripts/first-screen.mjs`)

| | RR0 | RR1 | RRT | RR0 대비 | 멈춤 선(3배) |
|---|---|---|---|---|---|
| 캐시 없는 첫 방문 | 415ms | 542ms | 693ms (693, 693, 712, 667, 670) | 1.67 | 1245ms |
| 서비스워커 캐시로 다시 열기 | 146ms | 233ms | 299ms (351, 285, 298, 299, 300) | 2.05 | 438ms |

선 아래다(테마 CSS 주입 비용이 보인다). 판단은 실기기 확인 ⑨.

### 제약·메모

- 개발 모드에서 실행 중 주입 경고("is using runtime style injection")가 한 번 난다(빌드에서는 안 남). `ui-check`는 `pageerror`만 센다.
- **RR4에서 볼 것(지휘자 전달):** 다크 홈 '이번 주'의 빈 요일 동그라미가 배경에 묻힌다. RRT 범위가 아니라 고치지 않았다.
- Argos: `Argos 건너뜀: ARGOS_TOKEN 없음`. `astryx-inventory --check`: 늘지 않음(97·520·2).

### 실행 결과

- `npm run check`: 전부 통과 (린트·knip·테스트·빌드 포함)
- `npm test`: Test Files 71 passed (71) · Tests 1669 passed (1669)
- 변이 테스트: 대상 없음(`src/lib` 판정 코드 불변, 테스트 파일만)

### 하지 않은 것

- 터치 `adaptations`(크기 토큰) — PLAN대로 올리지 않고 시작. 스크린샷 육안 판정(화면 검증자 몫)

---

## RR12. 여백 — 맞물림 기준과 검사

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `src/ax/index.tsx` | `Groups`(묶음 사이 5)·`Group`(카드 사이 3)·`Card`·`ClickableCard`(안쪽 4, `padding` 속성은 받지 않는다). 단계 숫자는 이 파일의 상수 셋뿐. 안의 `export { Card }`는 감싼 것으로 대체 |
| `scripts/lib/ui-space.mjs` | `inPageInsetSymmetry`·`EXPECTED_PAIRS`·`insetSymmetryVerdict`(기대한 쌍 0개면 `ok: false`)·`nearnessVerdict`. `inPageLayout`에 묶음 사이·카드 안쪽·줄 사이를 더했고 `spaceSetVerdicts`를 `spaceRoleVerdicts`로 넓혔다(옛 이름은 지웠다) |
| `scripts/ui-check.mjs` | `안쪽 대칭` 칸(다크·라이트), `같은 역할` 출력. 판정은 `SYMMETRY_JUDGED`(editor·line-sheet)의 `button` 쌍만, `ROLES_JUDGED`는 비어 있다(RR4부터) |
| `scripts/ui-space.test.mjs`(새) | 판정 함수 13개(예시 + fast-check 속성 둘) |
| `src/lib/v120.test.ts` | RR12 describe 4개 |
| `src/lib/v119.test.ts` | 수정표 밖 1건 — 아래 |
| `README.md` | "여백은 역할 토큰 한 벌이다" 끝에 PLAN 문장 |

**수정표 밖:** `src/lib/v119.test.ts: ui-check.mjs가 정적 검사와 여백 한 벌 비교를 부른다` — 기대 정규식 `spaceSetVerdicts(layouts)` → `spaceRoleVerdicts(layouts`. PLAN이 함수 이름을 바꾼 기계적 결과(같은 비교).

### 검증 대응

| PLAN 검증 | 테스트·명령 |
|---|---|
| 함수·상수·0쌍 실패 갈래 | `v120 RR12: ui-space.mjs에 inPageInsetSymmetry·EXPECTED_PAIRS가 있고 …`, `ui-space.test.mjs: 기대한 쌍 종류가 0개면 실패한다` |
| `Groups`·`Group`·`Card`·`ClickableCard` 내보내기, 단계 숫자가 이 파일에만 | `v120 RR12: ax/index.tsx가 … 이 파일에만 있다`, `v120 RR12: 짝 — Card·ClickableCard는 padding …` |
| 칸이 `ui-check`에 있다 | `v120 RR12: ui-check.mjs에 안쪽 대칭 칸이 …` |
| 대칭 허용 1px·방향별 판정 | `ui-space.test.mjs`: 17/14 실패, 1px 이하 통과, lr·tb·both, 속성 테스트 |
| 같은 역할 = 지금의 여백 한 벌과 같은 결론 | `ui-space.test.mjs: 화면 좌우·카드 사이·시트 좌우는 …` + 아래 나란히 출력 |
| 가까움 순서 | `ui-space.test.mjs: 가까움 순서 …`, 속성 테스트 |
| `--same-layout=<전 장면>` | 아래 |
| legacy 알약의 위·아래 차이가 0이 아닌 값으로 찍힌다 | 아래 출력 |
| editor 버튼 쌍이 판정되고 통과 | 아래 출력 |

### `ui-check after --check --same-layout=all --layout-base=<직전 after/layout.json>` (출력 `.reports/rr12-full.txt`)

종료 코드 0. `--same-layout` 전 장면 "요소 같다"(부품을 더했을 뿐 쓰는 화면이 아직 없다). `안쪽 대칭` 칸:

```
- 기록 home · 안쪽 대칭: 실패였을 것 — legacy-pill nav.tabbar 위 6·아래 4(차이 2)      ← 탭바 안 선택 알약이 0이 아닌 값으로 찍힌다
- 기록 session · 안쪽 대칭: 실패였을 것 — set-row div.set-row 위 16.5·아래 12.6(차이 3.9) …  ← RR7이 고친다
- 기록 summary · 안쪽 대칭: 통과였을 것 — 쌍 0개 대칭 (없음)                               ← 기대 쌍이 없는 장면(RR4가 card·badge를 더한다)
editor·line-sheet: 통과 (button 쌍 판정; card 쌍은 "기록만"에 위 16·아래 21 같은 차이가 찍힌다 — RR4 몫)
```

`같은 역할` — 앞의 셋이 RR12 전(`.reports/rrt-uicheck.txt`)과 같다:

| | RR12 전 (`여백 한 벌`) | RR12 (`같은 역할`) |
|---|---|---|
| 화면 좌우 | 통과 home·session·summary·history·analyze·diet·settings·editor 16 | 같음 |
| 카드 사이 | 통과 12px (home·summary·history·analyze·diet·settings) | 같음 |
| 시트 좌우 | 통과 sheet-finish·sheet-home·sheet-food·line-sheet 16 | 같음 |
| 묶음 사이 / 카드 안쪽 / 가까움 순서 | — | 기록만: `.ax-groups` 쓰는 장면 없음 / home 16·summary 60·history 35·analyze 16·diet 135·settings 16·editor 15 / 없음 |

"카드 안쪽"이 장면마다 크게 다른 것은 legacy 카드의 첫 글자가 아이콘·머리 줄 뒤에 있기 때문이다. `Card`(RR4)로 옮긴 뒤 판정을 켜므로, 그때 "첫 글자" 대신 카드 안 첫 내용 상자로 잴지 RR4가 본다.

### 결함 복원 (PLAN ㉔·㉖은 RR3·RR4 뒤 항목이라 RR12 단독으로 가능한 같은 뜻의 결함으로 했다)

| 되살린 결함 | 실패한 검사 | 원상복구 |
|---|---|---|
| `insetSymmetryVerdict`가 기대한 쌍 0개를 통과시킨다 | `ui-space.test.mjs: 기대한 쌍 종류가 0개면 …`, `v120 RR12: ui-space.mjs에 …` | `cmp` 같음 |
| 대칭 허용치 1px → 5px (㉔의 뜻: 어긋남을 못 잡는다) | `ui-space.test.mjs` 3개(17/14, 1.5px, 속성) | 같음 |
| `Group`의 카드 사이 3 → 5 (㉖의 뜻: 같은 역할에 다른 단계) | `v120 RR12: ax/index.tsx가 … 이 파일에만 있다` | 같음 |
| `inPageInsetSymmetry`의 버튼 선택자를 놓친다 | `ui-check --only=editor` 종료 코드 1: `실패 editor · 안쪽 대칭: 쌍 없음: button (기대)` | 같음 |

㉔(띠 아래 안쪽 여백)·㉖(홈 묶음을 `VStack gap={5}`로)은 띠·홈이 아직 안 옮겨져 RR3·RR4에서 한다.

### 실행 결과

- `npm run check`: 전부 통과(흔적·Astryx 뒷걸음 `44 → 44`·`97 → 97`·`520 → 520`·`2 → 2`·린트·knip·테스트·빌드)
- `npm test`: Test Files 72 passed (72) · Tests 1686 passed (1686) (RRT 때 71·1669)
- 변이 테스트: 대상 없음(`src/lib` 변경 없음 — 바뀐 것은 `scripts/`와 `src/ax`, 테스트)
- 과거 판정 불변: `src/db`·`src/store`·`src/lib` 판정 파일 변경 없음

### 하지 않은 것

- 안 옮긴 화면의 대칭 고치기(범위 제외). 판정을 켠 쌍은 `button`뿐이다 — `bar`·`tab-*`는 RR3, `card`·`badge`는 RR4, `sheet`는 RR5, 위 띠는 RR6, `set-row`는 RR7이 켠다(`SYMMETRY_KINDS`·`ROLES_JUDGED`)
- `tab-indicator`의 선택자(`[class*="indicator"]`)는 Astryx 탭이 아직 화면에 없어 확인하지 못했다 — RR3이 확인한다


---

## RR3. 앱 틀과 아래 탭

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `src/ax/index.tsx`·`src/ax/parts.css`(새) | `Bar`(위·아래 띠, 높이를 `--ax-bar-top/bottom`으로 알림 — 2px 단위로 올림)·`StickyTop`, `TabList`·`Tab`·`Center`·`Spinner` 내보내기. 띠 재질은 `parts.css`의 `.ax-bar` 한 곳 |
| `src/components/TabBar.tsx`·`SessionResumeStrip.tsx`·`UpdatePrompt.tsx`·`src/App.tsx` | Astryx `TabList`/`Tab`·`Item`+`Badge`·`Banner`·`Center`+`Spinner`. `<div className="app">`은 Fragment로. 로직은 한 줄도 안 바꿈 |
| `src/styles/global.css`·`motion.css`·`space.css`·`src/ax/ax.css` | `.app`·`.tabbar`·`.tab-icon`·`.resume-*`·`.update-prompt`·`--tabbar-*`·`--resume-strip-h`와 눌림 규칙 삭제. 뿌리 목록 두 곳에서 `.app` 삭제. `.screen`·`.ax-screen` 아래 여백은 `--ax-bar-bottom` |
| `scripts/ui-check.mjs`·`lib/ui-check-lib.mjs`·`lib/ui-space.mjs` | `inPageCurrentTab`(`지금 탭` 칸) 추가·`inPageTabbarSpot` 삭제, `BAR_SELECTOR`에서 옛 띠 삭제, `탭 누름`·`지금 탭`·`마지막 요소` 판정 켬, `안쪽 대칭`을 탭 장면(`home`·`home-375`·`home-resume`·`home-safe`·`settings`)에서 판정(`bar`·`tab-*`), `home-safe`의 안쪽 대칭 흐름, 시트가 띠를 덮는 장면은 `탭 누름`을 건너뜀 |
| `scripts/rr3.test.mjs`(새)·`src/lib/v120.test.ts` | RR3 테스트 15개(CSS 스캔 6 + 소스 스캔 9) |
| `README.md`·`docs/ASTRYX-INVENTORY.md` | "모양은 테마 한 벌이 정한다" 끝 문장(`parts.css`), 인벤토리 새로 씀 |
| `docs/screenshots/v1.20/after/*` | 다크·라이트 장면 갱신 |

세 숫자: Astryx 안 읽는 `.tsx` 44→41 · 인라인 스타일 97→94 · legacy 클래스 쓰임 520→504(PLAN의 515→499와 같은 −16; 기준선이 520이었다) · 안 쓰는 legacy 선택자 2→2.

**수정표 밖:** `src/lib/v117.test.ts: main.tsx는 Astryx를 직접 읽지 않고 …`·`src/lib/v120.test.ts: v120 RR1: App.tsx가 ./ax에서 AppRoot를 정적으로 import …`(import 줄에 이름이 더 들어갔다 — 정규식만 넓힘) · `src/lib/v120.test.ts: v120 RR0: 새 칸은 before …`(`JUDGED` 값 — PLAN이 RR3에서 켜라고 한 것) · `scripts/legacy-scope.test.mjs: 두 파일의 legacy 뿌리 목록 …`(`.app` 삭제)·`v120 RRM: 띠 …`(`.tabbar`·`.resume-strip` 규칙 삭제, 알약 규칙 확인 삭제) · `scripts/ui-space.test.mjs: EXPECTED_PAIRS …`(`legacy-pill` → 띠·탭 쌍).

### PLAN 검증 ↔ 테스트·명령

| PLAN 검증 | 테스트·명령 |
|---|---|
| 네 파일에 `className=`·`style=`·`<button` 0건, `../ax`만 | `v120 RR3: App·TabBar·SessionResumeStrip·UpdatePrompt에 …` |
| `parts.css` 색 리터럴 0·px는 1px뿐·흐림 없음, `.ax-bar` 재질은 한 곳 | `scripts/rr3.test.mjs`: `parts.css에 색 리터럴 …`, `.ax-bar의 배경을 정하는 규칙이 parts.css에만 있다` |
| `global.css`에 옛 선택자·변수 없음 | `scripts/rr3.test.mjs`: `global.css에 .app·.tabbar …`, `어느 CSS에도 옛 탭바·재개 줄 선택자가 남지 않는다` |
| `polish.test.ts` BB1·`timerOwnership.test.ts` 안 고치고 통과 | `npm test` 통과(두 파일 수정 없음) |
| `scripts/`에 `aria-current="page"`·`inPagePillSeparation`·`inPageTabbarSpot` 0, `BAR_SELECTOR`에 옛 띠 0 | `v120 RR3: scripts/에 aria-current=page …` |
| `띠` 칸이 `.ax-bar`를 쟀고 `지금 탭` 통과 | 아래 출력, `v120 RR3: ui-check.mjs에 지금 탭 칸 …` |
| `안쪽 대칭`(띠↔탭 줄, 탭↔선택 표시, 탭↔아이콘+글자, 버튼↔글자; `home-safe` 포함) | 아래 출력 |
| `탭 누름`·`마지막 요소` | 아래 출력 |
| 탭 다섯 한 줄(`home-375`), 아래 띠 안 버튼 5 + 재개 줄 | `지금 탭`의 `탭 5개`와 `home-375` 장면 통과 |
| 탭 다섯 차례 누름·세션 최소화 뒤 재개 줄 | 자동 테스트 없음(RTL이 없다). `ui-check`가 탭을 눌러 장면(`diet`·`history`·`analyze`·`settings`)에 도착하고 최소화 뒤 재개 줄(`home-resume`)을 찍는다 — 화면 검증자·실기기 확인으로 본다 |

### `ui-check after --check --safe-area` (출력 `.reports/rr3-full.txt`)

종료 코드 0. 탭 장면 다크·라이트 전부 `띠` 통과(`.ax-bar` 1개 불투명, 재개 줄이 있는 `home-resume`도 1개 — 재개 줄은 같은 띠 안에 쌓인다), `지금 탭` 통과, `탭 누름`·`마지막 요소` 통과(시트가 띠를 덮는 `sheet-home`·`sheet-food`는 건너뜀 — 막이 덮는 것이 맞다), `안쪽 대칭` `home`·`home-375`·`home-resume`·`settings` 통과, 나머지 탭 장면은 기록(`통과였을 것 — 쌍 12개 대칭 (bar 1 · tab-indicator 1 · tab-content 5 · button 5)`). `--safe-area`: `안쪽 대칭 home-safe`·`-light` 통과(쌍 12개), `상태바 받침 home-safe` 아래 끝 802/810 통과(옛 떠 있는 탭바 기준이던 "띠 아래 끝"은 안전 영역을 품은 띠에서는 뜻이 없어 탭 줄 `nav[aria-label="화면"]`의 아래 끝으로 바꿨다).

### 결함 복원

| 되살린 결함 | 실패한 검사 | 원상복구 |
|---|---|---|
| ⑧ `parts.css`에 `color: #ff7a1a`와 `gap: 12px` | `scripts/rr3.test.mjs: parts.css에 색 리터럴 …` | `cmp` 같음 |
| ㉔ `.ax-bar`의 아래 안쪽 여백만 `--spacing-3` | `home · 안쪽 대칭: bar div.ax-bar 위 8·아래 12(차이 4)` + `탭 누름: … 아래 끝` | 같음 |
| ⑱ `BAR_SELECTOR`에서 `.ax-bar` 삭제 | `home · 띠: 띠 0개 — 기대 1개` | 같음 |
| 탭 눌림 영역 확장(`::after`의 `inset-block`)을 0으로 | `home · 탭 누름: 홈 위 끝 · 아래 끝 …` | 같음 |

### 실행 결과

- `npm run check`: 전부 통과(흔적·Astryx 뒷걸음 `44 → 41`·`97 → 94`·`520 → 504`·`2 → 2`·린트·knip·테스트·빌드)
- `npm test`: Test Files 73 passed (73) · Tests 1701 passed (1701) (RR12 때 72·1686)
- 변이 테스트: 대상 없음(`src/lib` 변경 없음)
- 과거 판정 불변: `src/db`·`src/store`·`src/lib` 판정 파일 변경 없음(`src/lib`의 두 파일은 테스트뿐)
- Argos: `Argos 건너뜀: ARGOS_TOKEN 없음`

### 하지 않은 것

- `--same-layout`: 띠·탭이 바뀐 작업이라 요소 위치가 달라지는 것이 정상이다. 안 옮긴 화면은 `--check`의 `여백 격자`·`같은 역할`이 본다.
- `set-row`·`card`·`badge`·`sheet`·위 띠 대칭 판정(RR4~RR7이 켠다). 탭 아이콘과 글자가 한 줄(가로)로 놓이는 것은 Astryx `Tab size="md"`의 모양이다.

### 실기기 확인 목록

- 탭의 눌림 반응(Astryx 눌림은 이 Chromium에서 `mouse.down`으로 안 칠해진다), 홈 화면 앱(PWA)에서 아래 띠가 홈 바 위에 알맞게 놓이는지, 업데이트 알림이 위 안전 영역 아래에 붙는지.

### RR3 보완 (화면 검증 반려 반영)

리뷰 반영: ① `src/ax/parts.css` 아래 탭 버튼을 `flex: 1 1 0; min-width: 0`, 좌우 안쪽 여백·아이콘-글자 간격 `--spacing-1`로 줄어들게 해 다섯 탭이 줄 폭을 균등하게 나눈다. ② `ui-check`의 `지금 탭`에 `탭이 줄 안`(nav `scrollWidth ≤ clientWidth`, 모든 탭 `left ≥ nav.left`·`right ≤ nav.right`)을 더했다. 결과: `home`·`home-375`(다크·라이트) 통과, 스크린샷 `home-375-light.png`에서 설정 글자가 안 잘린다.
결함 복원: `parts.css`를 고치기 전 것으로 되돌리면 `지금 탭`이 실패(`scrollWidth 372 · clientWidth 343(375)/358(390) · 밖 1개`), 고친 것으로 되돌리면 통과(`cmp` 동일).
실행: `npm run check` 통과(Test Files 73 · Tests 1701), `ui-check after --check` 실패 칸 없음.


## RR4. 홈 — 배치를 다시 짠다

### 범위

| 바뀐 것 | 내용 |
|---|---|
| `src/screens/HomeScreen.tsx` | `AxRoot`+`Groups`+`Group` 넷(머리·오늘·이번 주·주기). 순서: 저장소 위험 → 머리 → 운동 카드(안에 [변경]·전체 폭 [시작]) → 백업 미설정 → 알림 큐 → 식단 줄 → 이번 주 → 주기 → 제안 근거. 배너는 `Banner collapsible={false}`, 복귀 적용/안 함은 `ToggleButton`. 로직(`dash`·`create`·`start`·`homeCardState`·`bannerQueue`·`queue.slice`)은 안 바꿨다 |
| `WeekDots.tsx`·`MuscleVolumeBars.tsx` | `Card`+`Text`·`ProgressBar`·`Badge`. 볼륨은 부위 하나에 한 줄(이름·막대·n/m·빈도) |
| `src/ax/index.tsx` | `Divider`·`ProgressBar`·`Collapsible`·`List`·`ListItem` 내보내기 |
| `src/ax/parts.css` | `.ax-week-*`(요일 점), `.ax-vol-rows`·`.ax-vol-row`(subgrid — 열 폭이 `auto`·`1fr`이라 막대가 줄마다 같은 자리에서 시작한다) |
| `src/styles/global.css` | 홈만 쓰던 선택자 33개 삭제(−218줄). 안 쓰는 legacy 선택자 2 → 2, 쓰임 504 → 447, 인라인 94 → 72, 화면 파일 41 → 38 |
| `scripts/` | `ui-check`: `시작 자리` 칸(`inPageStartSpot`·`startSpotVerdict`), 장면 `home-banner`·`home-banner-375`, 홈 장면에서 카드·뱃지 대칭과 `같은 역할`(묶음 사이·카드 안쪽·가까움 순서) 판정 켜기. `ui-space.mjs`: `content()`가 버튼·진행 막대의 상자도 내용으로 센다, 쌍 라벨에 카드·뱃지 글자 10자, Collapsible 펼침 줄은 `button` 쌍에서 뺌 |
| 테스트 | `v120.test.ts`에 RR4 14개 |

### 다크 홈의 묻힘 (넘어온 메모)

빈 요일 점은 `--color-background-muted` 면에 1px `--color-border-emphasized` 테두리(미래는 점선, 오늘은 `--color-accent` 링, 완료는 `--color-accent-muted` 면+accent 테두리)로 그린다. 볼륨 막대 바닥은 `.ax-vol-row [role='progressbar']`에 같은 면+1px 외곽선을 준다(Phase·디로드 막대는 카드 안 단독이라 Astryx 기본 바닥 그대로 — 스크린샷 `after/home-end.png`에서 카드 면과 구분된다). 직접 `home`·`home-end` 스크린샷으로 확인했다.

### 여백(RR12) — 관계로 잰다

카드 안쪽은 일률 값이 아니라 **카드의 첫 내용과 마지막 내용이 안쪽에서 대칭**인가로 쟀다. 처음에 운동 카드가 위 18·아래 23이었다 — 측정기가 카드 맨 아래 버튼을 글자 상자로만 세어 버튼 안쪽 여백이 카드 여백으로 오인됐다. 앱이 아니라 측정기의 결함이라 `content()`가 버튼·진행 막대의 상자를 세게 고쳤다(`ui-space.mjs`). 제안 근거 카드는 펼침 줄 머리글을 다른 카드와 같은 `supporting`·`secondary`로 맞추자 대칭이 됐다(위 14.1·아래 16 → 통과). `카드 안쪽`의 `같은 역할` 비교는 Astryx `Card`를 쓰는 장면(`home`·`home-375`·`home-banner`·`editor` — 모두 15)끼리만 한다 — 안 옮긴 화면(summary 60·history 35·diet 135)은 legacy `.card`라 값이 다르다. 옮기는 작업(RR5~RR9)이 `INSET_SCENES`에 더한다.

### PLAN 검증 항목 ↔ 테스트·확인

| PLAN | 확인 |
|---|---|
| 세 파일 `className`·`style`·`<button`·`<details`·`var(--`·`padding=` | `v120 RR4: 세 파일에 className=은 ax-week-*·ax-vol-* 뿐이고 …` |
| 순서 | `v120 RR4 — 순서: …` |
| 묶음 넷, 저장소 위험이 첫 자식 | `v120 RR4: 묶음 넷(…)이 Group이고 …` |
| 시작 버튼 위치·속성 | `v120 RR4: 시작 버튼은 운동 카드 안의 마지막 자식이고 …` |
| 알림은 카드 뒤, 큐는 첫 번째만 | `v120 RR4: 알림과 식단 줄은 카드 뒤에 오고 …` |
| 배너 status·collapsible | `v120 RR4: 배너 큐 여섯 종류는 …` |
| 복귀 적용/안 함 | `v120 RR4: 복귀 적용/안 함은 ToggleButton 둘이고 …` + `dayChoice.test.ts` 옮긴 것 |
| 주기 카드 하나 | `v120 RR4: Phase 0 진행과 디로드 카운터는 카드 하나 …` |
| 볼륨 한 줄·목표 초과 | `v120 RR4: 볼륨은 부위 하나에 한 줄 …` |
| 요일 점 상태 | `v120 RR4: 요일 점은 data-state …` |
| 문구 그대로 | `v120 RR4: 화면 문구가 그대로다 …` |
| `Divider` 등 내보내기 | `v120 RR4: ax/index.tsx가 …` |
| `ui-check` 시작 자리 | `v120 RR4: ui-check에 시작 자리 칸 …`, `… 시작 자리 판정 …` + 실행(아래) |
| `ui-check` 여백 | 실행: `home`·`home-375`·`home-banner` `안쪽 대칭` 통과, `같은 역할`·`가까움 순서` 통과 |
| 흐름(시작 1탭, [변경]→시트, 식단 줄) | `ui-check`의 기존 흐름(`변경` 클릭 → `Day 선택` 시트, `시작$` 클릭 → 세션)이 그대로 통과 |
| 속성 테스트 | 판정·계산 함수를 안 건드려 없음 |

### 옮긴 기존 테스트

PLAN 표의 셋: `dayChoice.test.ts` `카드와 시작 버튼이 같은 파생 상태를 쓴다`(블록 정규식만 옮김), `두 버튼이 각각 적용 / 안 함을 고르고…`(`isPressed`). 안 고치고 통과: `bannerQueue.test.ts` 나머지, `v18`·`v113`·`v111`·`timerOwnership`.

**수정표 밖** (PLAN 변경의 기계적 결과):
- `dayChoice.test.ts:카드 탭 지름길은 남아 있다` → `카드 전체를 누르는 지름길은 없어졌다 …` — PLAN이 "운동 카드 전체를 누르는 지름길은 없어진다"고 했다. 이제 [변경] 버튼이 `setPicking(true)`를 한 번 부르고 카드 감싸개에는 `setPicking`이 없다는 것을 본다.
- `bannerQueue.test.ts:큐의 백업 배너 문구가 한 가지만 말한다` — 정규식이 JSX 글자(`{reminder.daysSince`)에서 템플릿 글자(`${reminder.daysSince`)로 바뀐 것뿐.
- `scripts/ui-space.test.mjs:EXPECTED_PAIRS…` — 홈 장면 기대 쌍이 늘었다(버튼·카드·뱃지).

### 결함 복원 (`cp` 백업 → 결함 → 테스트 → 복구 → `cmp`)

| 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|
| 알림 큐 줄을 운동 카드 위에 더한다 | `v120 RR4 — 순서` | ✓ |
| `WeekDots`의 `Card`에 `padding={2}` | `v120 RR4: 세 파일에 …`·`v120 RR12: …` | ✓ |
| 볼륨 막대 `value={bar.performed}`(목표 초과를 안 멈춤) | `v120 RR4: 볼륨은 부위 하나에 한 줄 …` | ✓ |
| 홈 제목에 `className="card"` | `v120 RR4: 세 파일에 …` + `astryx-inventory --check`(447 → 448) | ✓ |
| 운동 카드를 `<ClickableCard onClick={() => setPicking(true)}>`로 바꿔 지름길을 되살림 (리뷰 반려 1번) | `dayChoice.test.ts:카드 전체를 누르는 지름길은 없어졌다 …` (고치기 전 테스트는 23개 전부 통과했다) | ✓ (`cmp` 동일) |

리뷰 반영(RR4 반려, 새 커밋): ① `dayChoice.test.ts` 지름길 테스트가 `<Card>`/`<ClickableCard>` 여는 태그부터 시작 버튼까지를 보고, 여는 태그를 화살표 `=>`에서 안 끊기는 정규식으로 읽어 `onClick`·`setPicking`·`ClickableCard`가 없는지 검사한다. 결함 복원 표에 한 줄 더했다(테스트 수는 그대로).

### 변이 테스트

대상 없음(`src/lib`의 판정 파일을 안 바꿨다. 새 파일은 테스트뿐).

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20`)

- `시작 자리`: 390 폭 `home` 384 · `home-banner` 384 · `home-resume` 384 통과, 375 폭 `home-375` 408 · `home-banner-375` 408 통과(버튼 아래 끝은 모두 아래 띠 위).
- `같은 역할`: 화면 좌우 16, 카드 사이 12, 묶음 사이 20(홈 세 장면), 카드 안쪽 15(`home`·`home-375`·`home-banner`·`editor`), 가까움 순서 `12 ≤ 12 < 20` 통과.

### 과거 판정 불변

`git diff --stat main..HEAD -- src/db src/store`가 비어 있다. `src/lib`는 테스트 두 개와 `v120.test.ts`만 바뀌었다.

### 하지 않은 것

- **`home-banners-open`(알림을 펼친 장면)은 못 찍는다.** 예시 데이터로 큐를 둘 이상 채우려면 IndexedDB를 심어야 하는데 이 라운드에서는 하지 않았다. 세션을 하나 마친 홈에서 큐가 한 개뿐이라 `다른 알림 N개` 버튼이 없어 장면이 `건너뜀`이다(ui-check 코드는 있고, 큐가 둘 이상이면 찍는다). 그래서 시작 자리는 390 폭에서 세 장면을 견준다.
- 알림 3개 이상·14일 공백·유산소만 한 날 경계는 화면으로 못 봤다(소스 스캔으로 큐·`dayGapNotice` 로직이 안 바뀐 것만 잠겼다) — 화면 검증자에게 맡긴다.
- 인벤토리 표(`docs/ASTRYX-INVENTORY.md`)는 `--write`로 새로 썼다.

### 실기기 확인 목록

- iOS Safari의 CSS `subgrid`(막대 열 정렬 — 16+ 필요), 다크에서 빈 요일 점 테두리·막대 바닥이 눈에 보이는지.

---

## RR5. 홈의 시트 2개 + `Sheet`의 닫기

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `src/ax/index.tsx` | `Sheet`의 `children`이 `dismiss`를 받는 렌더 프롭. `dismiss`·막 누름·끌어내림·Esc가 한 길: `closing` 상태 → `BottomSheet`가 내려감 → 타이머 `SHEET_CLOSE_MS`(350) 뒤 `onClose`를 `once`로 한 번. 움직임 줄이기면 기다리지 않음. 타이머는 effect 정리 함수가 지운다 |
| `src/components/DayPickerSheet.tsx` | `SheetFrame` → `Sheet`. `List`+`ListItem`(Day 이름 + 제안·선택·완충 `Badge`, 부제·며칠 전, 종목·세트 수), 제목 `Heading`, 설명 `Text`, 닫기 `Button` |
| `src/components/OpenSessionSheet.tsx` | `SheetFrame` → `Sheet`. `Item` 한 줄 + `Button` 넷 + 버리기 2단계(`destructive`) |
| `src/lib/v119.test.ts` | QQ3 legacy 시트 14 → 12개(홈 둘이 `../ax`로 옮김) — PLAN 수정표대로 |
| `src/lib/v120.test.ts` | `v120 RR5` 묶음 11개 |
| `scripts/ui-check.mjs`, `scripts/lib/ui-space.mjs` | 홈 시트 둘의 `안쪽 대칭`(`sheet` 쌍)·`같은 역할` 시트 좌우 판정, `sheet-open-session` 장면, 흐름 셋 |
| `docs/ASTRYX-INVENTORY.md` | `--write`: legacy 클래스 쓰임 447 → 426 (PLAN의 442→421과 같은 21 줄어듦, 기준선만 다름) |

### 설계에서 PLAN과 다르게 한 것

| PLAN | 한 것 | 이유 |
|---|---|---|
| 위험 문구 `Text color="error"` | `Banner status="error" collapsible={false} title=…` | `Text`에는 `error` 색이 없다(`BuiltinTextColor` = primary·secondary·disabled·placeholder·accent·inherit — 빌드가 거부). 루틴 편집의 오류 줄(`RoutineEditorScreen.tsx:237`)과 같은 부품 |
| `Sheet` 안에 `startedRef`·`timerRef` | `closing` 상태 하나 + effect | `react-hooks/refs` 린트가 렌더 중 ref 읽기·쓰기를 막고 `SheetFrame`의 같은 패턴은 `eslint-suppressions.json`의 옛 위반이라 새 파일에 못 늘린다. `dismiss = () => setClosing(true)`는 두 번 불러도 같은 값이라 타이머가 하나이고, effect 정리 함수가 언마운트 때 타이머를 지운다 — PLAN의 세 요구(한 번만·정리·두 번 눌러도 하나)가 같다 |
| 고르는 줄 설명 | `description`을 `<Text textWrap="wrap">`로 | `ListItem`은 설명을 한 줄에서 말줄임표로 잘랐다(`기록 없음`·며칠 전이 안 보임). 줄바꿈을 허용했다 |
| `DayPickerSheet` 줄의 `endContent` = 마지막 수행 며칠 전 | 며칠 전은 `description`(부제 뒤), `endContent`는 `N종목`/`N세트`를 `VStack` 두 줄로 쌓음(문구 그대로) | 종목·세트 수를 둘 자리가 없고(문구 유지), 한 줄로 두니 오른쪽이 넓어져 390 폭에서 부제가 글자 중간에서 꺾였다(`기/록 없음`). 두 줄로 쌓아 오른쪽 폭을 예전처럼 줄이자 `after/sheet-home.png`에서 부제가 공백에서만 꺾인다. 375 폭 스크린샷은 `ui-check`에 그 장면이 없어 못 찍었다(실기기 확인 목록) — 리뷰 반영 |
| 한글 줄바꿈(375 재검증) | `parts.css`에 `dialog[aria-label='Day 선택'] :is(p, span, div) { word-break: keep-all; overflow-wrap: anywhere }` | 375 폭에서 부제가 `없/음`·`기/록`, 시트 머리 설명이 `버튼으/로.`로 글자 중간에서 꺾였다. 한글은 기본이 음절 단위 줄바꿈이다. Astryx `Text`의 `wordBreak`는 `break-word`·`break-all`만 받아 `keep-all`을 못 넘기고 `Sheet`는 `className`을 안 받아서(`BottomSheet`에 className·style·xstyle 금지), Astryx 부품 안이라 앱 CSS를 시트 이름(`<dialog aria-label>`)으로 좁혀 걸었다. `anywhere`는 한 단어가 줄보다 길 때만 끊게 한다. 간격은 안 건드린다 |

닫힘 대기 길이: **350ms**. `BottomSheet` 나가는 움직임이 `--motion-medium`(300ms) 대역이라 그보다 길게 잡았다(`SheetFrame`의 `SAFETY_MS`와 같은 값). 다이얼로그가 DOM에서 빠지는 시간을 `ui-check` 안에서 쟀더니 첫 눌림부터 **399~406ms**(타이머 350 + 눌림·프레임 오버헤드)였다. 보이는 것이 사라지는 시간은 화면 검증(`.reports/screen-check-RR5.md` 2절)이 봤다: 60·180ms에는 떠 있고 **약 300ms** 뒤 사라진다. 그래서 350 > 300이다.

### 테스트 ↔ PLAN 검증 항목

| PLAN 검증 | 테스트 |
|---|---|
| 두 파일이 `Sheet`를 쓰고 `SheetFrame`·`className=`·`style=`·`<button` 0건 | `v120 RR5: 두 파일이 ../ax의 Sheet를 쓰고 …` |
| QQ3 목록에서 둘을 빼고, 닫기는 `dismiss`(`onClick={onClose}` 0건) | `v119 QQ3: legacy 시트 12개가 …` · `v120 RR5: 옮긴 시트의 닫기 버튼은 dismiss를 부른다 …` |
| `once`를 거친다·두 번 눌러도 한 번 | `v120 RR5: Sheet의 children은 dismiss를 받는 함수일 수 있고 닫힘이 once를 거친다 …` + `ui-check` 흐름 `시트 닫기 두 번 누르기 진행 중 세션 처리` |
| 막·끌어내림·Esc도 `dismiss`를 지난다 | `v120 RR5: 막 누름·끌어내림·Esc(onOpenChange(false))도 dismiss를 지난다` |
| 움직임 줄이기면 바로 끝남 | `v120 RR5: 움직임 줄이기를 켜면 기다리지 않고 바로 끝낸다` |
| `clearTimeout`이 정리 함수 안 | `v120 RR5: Sheet에 clearTimeout이 useEffect의 정리 함수 안에 있다 …` |
| `BottomSheet`에 `className`·`style`·`xstyle` 금지 | `v120 RR5: BottomSheet에 className·style·xstyle을 넘기지 않는다 …`(+ 안 고친 `v118`) |
| 버리기 문구 앞 260자에 `destructive` | `v120 RR5: OpenSessionSheet의 버리기 문구 앞 260자 안 …` |
| 문구·로직 그대로 | `v120 RR5: 두 시트의 문구·로직이 그대로다 …` |
| 저장으로 먼저 사라지는 길 | `ui-check` 흐름 `시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리` |
| 기존 사용처(줄 시트) 닫고 같은 줄 다시 열기 | `ui-check` 흐름 `줄 시트 막으로 닫고 같은 줄 다시 열기`. `v117`·`v118` 스캔은 안 고치고 통과 |
| `v113` `DayPickerSheet.tsx` 스캔 | 안 고치고 통과 |
| `ui-check` 스캔 연결 | `v120 RR5: ui-check에 sheet-open-session 장면이 있고 …` |

### 결함 복원

| 되살린 결함 | 실패한 테스트 | 원상복구 |
|---|---|---|
| ⑩ `DayPickerSheet`의 닫기를 `onClick={onClose}`로 | `v120 RR5: 옮긴 시트의 닫기 버튼은 dismiss를 부른다 …` | `cmp` 같음 |
| ㉑ `Sheet` 정리 함수(`return () => clearTimeout(timer)`)를 뺀다 (effect 형태로 바꾼 뒤 다시 확인) | `v120 RR5: Sheet에 clearTimeout이 useEffect의 정리 함수 안에 있다 …`. **흐름으로는 못 잡는다** — 그 흐름(버리기 → 세션)은 `dismiss`를 부르지 않아 타이머가 안 걸린다. 스캔만 잡는다 | `cmp` 같음 |
| ⑪ `Sheet`의 `once`를 뺀다(`const finish = () => onCloseRef.current()`) | `v120 RR5: Sheet의 children은 … once를 거친다 …` 스캔 1건. **흐름 `시트 닫기 두 번 누르기`는 실패하지 않는다** — `closing` 상태가 `false→true` 한 번이라 effect 한 번에 `finish`가 한 번 불려 `once`가 막는 것이 없다. 이 구조에서는 스캔만 잡고 흐름은 못 잡는다 | `cmp` 같음 |
| ⑫(리뷰) 줄 시트 `onClose={() => setLineAt(null)}`를 `onClose={() => {}}`로 (`ui-check after --check --only=line-sheet`) | 흐름 `줄 시트 막으로 닫고 같은 줄 다시 열기`가 예외 → `흐름 실패`, **종료 코드 1** (고치기 전에는 건너뜀으로 삼켜져 0). 되돌리면 0 | `cmp` 같음 |

### 변이 테스트

대상 없음(`src/lib`를 안 바꿨다. `once.ts`는 그대로 가져다 썼다).

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20; echo "종료 코드 $?"` → **종료 코드 0**)

- `sheet-home` 다크·라이트: `접근성` 통과, `시트 버튼` 통과, `안쪽 대칭` 통과, `같은 역할 · 시트 좌우` 16(`sheet-finish`·`sheet-food`·`line-sheet`와 같다).
- `sheet-food` `접근성` 통과, `session`·`session-375`·`session-open-b` 포함 RR0 전부터 있던 네 칸이 **다시 생기지 않았다**.
- 흐름 통과: `줄 시트 막으로 닫고 같은 줄 다시 열기`(시트 1개·오류 0건).
- **375 재검증 반영**: `sheet-home-375`에서 부제·머리 설명이 단어 사이에서만 꺾인다(`docs/screenshots/v1.20/after/sheet-home-375.png`). 새 흐름 `Day 선택 시트 375 글자 중간 꺾임 없음`이 글자마다 줄을 재서 공백 없이 이어진 두 글자 사이의 줄바꿈을 센다. 결함 복원 ⑫: `keep-all`을 `normal`로 → 그 흐름 실패(`버튼으/로.` · `록 없/음` · `기/록 없` 3건, 종료 코드 1)와 `scripts/rr5-wrap.test.mjs` 실패, 복구 후 `cmp` 같음. 테스트는 `v120.test.ts` 1개 + `rr5-wrap.test.mjs` 1개 늘었다.
- **리뷰 반영**: 새 흐름 셋은 `guardedFlow` 안에 있어 예외가 나면 `흐름 실패`로 센다(장면 찍기만 `optional`). `v120 RR5` 스캔 1개 추가. `DayPickerSheet`의 `endContent`는 두 줄로 쌓음. `ui-check after --check --ver=v1.20` 종료 코드 0, 흐름 셋 통과. `scripts/ui-check.mjs`는 LF로 되돌림.
- **`sheet-open-session`은 기본 예시 데이터에서는 열리지 않아 건너뛴다.** 진행 중 세션이 있을 때 이 시트로 가는 길은 디로드 권장 배너의 `디로드로 시작`뿐이고(운동 카드는 진행 중이면 `이어서 하기`로 세션에 들어간다) 예시 데이터는 디로드가 안 뜬다. 그래서 확인은 **임시로** `HomeScreen`의 `이어서 하기`를 `start(displayed)`로 바꿔 시트를 열어 했고(백업→복구, `git status`로 원상 확인) 결과: `접근성` 통과·`시트 버튼` 통과(이어하기 5.634, 취소 1.366, 버리기 1.638)·`안쪽 대칭` 통과, 흐름 `시트 닫기 두 번 누르기 진행 중 세션 처리` 통과(오류 0건, 사라짐 399~406ms), 흐름 `시트가 저장으로 먼저 사라진 뒤 진행 중 세션 처리`(버리기 2단계 → 세션 화면에서 800ms 뒤에도 그대로, 오류 0건) 통과. 그 임시 변경은 남기지 않았다. 스크린샷 `sheet-open-session(.png/-light.png)`은 이 임시 상태에서 찍은 것을 화면 검증자가 볼 수 있게 `docs/screenshots/v1.20/after/`에 넣었다(앱 코드는 임시 변경 없이 같다).

### 실행 결과

- `npm test`: `Test Files  73 passed (73)` / `Tests  1725 passed (1725)`
- `npm run build`: 성공
- `git rev-list --count main..HEAD`: 커밋 전 31
- `npm run check`: 흔적·Astryx 뒷걸음·knip·테스트·빌드 통과. **린트는 `.reports/rr4-edge-states.mjs`(git이 무시하는 화면 검증 때 남은 스크래치 파일, 이 작업 것이 아님)에서만 실패한다** — `npx eslint src scripts`는 오류 0(경고 1: `SessionScreen.tsx:131` 기존). CI에는 그 파일이 없다.

### 하지 않은 것

- `마감하고 시작`(기록이 있는 세션) 흐름은 화면에서 안 눌렀다 — 예시 데이터의 세션은 세트 0개다. 같은 `Sheet` 경로(부모 상태 변경으로 먼저 사라짐)를 `버리고 새로 시작`으로 확인했다.
- `Day 선택` 줄 탭 → 카드가 바뀌는 흐름은 `onPick`·`setPicking(false)` 로직을 안 바꿨고 화면에서 따로 안 눌렀다.

### 실기기 확인 목록

- iOS Safari: 시트를 아래로 끌어 닫을 때와 `닫기`를 누를 때 내려가는 움직임이 같은지, 막 누르고 곧바로 같은 줄 시트를 다시 열 때.
- Day 선택 줄의 부제가 두 줄로 접히는 폭(375)에서 `7종목 · 22세트`가 부제와 겹치지 않는지.

---

## RR6. 세션 화면 틀과 휴식 바

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `src/screens/SessionScreen.tsx` | 상단 바 `Bar position="top"` + `HStack`, 최소화·타이머는 `Button isIconOnly`(`Icon` chevronLeft·clock), Day 이름·경과·세트 수·복귀/디로드 `Badge`, 본문 `AxRoot`+`VStack`, `+ 종목 추가` `Button`, 세션/Day 없음은 `Center`+`Text`. 로직 그대로 |
| `src/components/RestTimerBar.tsx` | `Bar position="bottom" role="timer" aria-live="off"`, `ProgressBar`(값으로 그림, 끝나면 success), `Heading level=2` 남은 시간, 버튼 셋(조건 그대로), 닫기는 `<button className="ax-bar-dismiss">` 하나 |
| `src/ax/index.tsx` | `Bar`가 `aria-live`를 받는다. `Icon` 내보내기 |
| `src/ax/parts.css` | `.ax-bar-dismiss`(내용 뒤에 깔림, 그 뒤 형제는 눌림을 넘기고 안의 버튼만 되살림) |
| `src/styles/global.css`·`motion.css`·`ax/ax.css` | `.session-*`·`.rest-*` 규칙 삭제, legacy 뿌리 목록에서 `.session` 뺌(두 파일 같게) |
| `scripts/lib/ui-check-lib.mjs`·`ui-space.mjs`·`ui-check.mjs`·`legacy-scope.test.mjs` | `BAR_SELECTOR='.ax-bar'`, 세션 장면 `마지막 요소`(+위 띠 가림), 휴식 바 흐름 넷, 제목 찾기·옛 클래스 참조 정리 |
| `src/lib/v120.test.ts`·`useRestTimer.test.ts` | `v120 RR6` 묶음 8개, RR0 `BAR_SELECTOR` 테스트를 RR6 기준으로 고침, `rest-dismiss`→`ax-bar-dismiss`(PLAN 수정표대로) |
| `docs/ASTRYX-INVENTORY.md` | `--write`: legacy 쓰임 426→404, 인라인 71→70(PLAN 값과 같은 줄어듦) |

### 설계에서 PLAN과 다르게 한 것

| PLAN | 한 것 | 이유 |
|---|---|---|
| 진행 막대 폭을 읽어 움직임 확인 | 채움 요소의 `--_progress-bar-fill` 값을 읽음 | `ProgressBar` 채움은 폭이 아니라 CSS 변수로 그려 요소 폭이 늘 트랙 전체다. 움직임 줄이기에서 0%→3.3%로 따라가서 **대안(직접 짓는 막대)은 쓰지 않았다**: 인라인 스타일 `71→70`, `style=` 0건 |
| 휴식 끝 바의 초록 배경 | 안 칠함 | `Bar`에 면 변형이 없다. 끝나면 `ProgressBar`가 success, 제목이 `휴식 완료` |

### 테스트 ↔ PLAN 검증

| PLAN 검증 | 테스트 / 검사 |
|---|---|
| className은 `ax-bar-dismiss`뿐·style 0·`<button` 하나 | `v120 RR6: 두 파일의 className=…` |
| 다른 스캔 안 고치고 통과, `useRestTimer.test.ts` 한 줄만 | 전체 테스트 통과 |
| `BAR_SELECTOR`가 `.ax-bar`뿐 | `v120 RR0·RR6: …BAR_SELECTOR 줄이 '.ax-bar'뿐이다` |
| `띠` 1·2개 | `EXPECTED_BARS` session 1 / session-rest 2, 통과 |
| `마지막 요소`·위 띠 가림 | `session`·`session-375`·`session-rest` 통과 |
| 세트 체크→+30→건너뜀, 끝난 바 1탭, 최소화 재개 줄 | 흐름 `휴식 바 +30초 건너뛰기`(59→88초)·`끝난 휴식 바 1탭 닫기`·`최소화하면 재개 줄에 남은 휴식` 통과 |
| 움직임 줄이기에서 진행 | 흐름 `움직임 줄이기에서 휴식 진행 막대` 통과 |
| 안쪽 대칭·같은 역할 | `session*` 칸 기록(통과였을 것), 같은 역할 화면 좌우 16 통과 |

### 결함 복원

| 되살린 결함 | 잡은 것 | 원상복구 |
|---|---|---|
| `BAR_SELECTOR`에 `.rest-bar` | `v120 RR0·RR6` 1건 | `cmp` 같음 |
| 닫기 `<button>`을 `<div onClick>`으로 | `useRestTimer.test` 1건 + `v120 RR6` 2건 | `cmp` 같음 |
| `.ax-bar-dismiss ~ *`의 `pointer-events: none` 뺌 | 흐름 `끝난 휴식 바 1탭 닫기` 실패(바 남음) | `cmp` 같음 |
| `.ax-screen` 위 여백에서 `--ax-bar-top` 뺌 | `마지막 요소` 칸 `session`·`session-rest` 실패, 종료 코드 1 | `cmp` 같음 |
| 흐름 안 `2세트 완료`를 없는 이름으로 | 흐름 셋이 `예외: …`로 **흐름 실패**, 종료 코드 1(건너뜀으로 안 삼켜짐) | `cmp` 같음 |
| (리뷰 반영) `global.css` 끝에 `.session-header {}`·`.session-day-name {…}` | 새 `legacy-scope` 옛 세션 CSS 스캔 실패 | `cmp` 같음 |
| (리뷰 반영) 두 파일 뿌리 목록에 `.session`을 같이 되살림 | 새 스캔 둘 다 실패 | `cmp` 같음 |
| (리뷰 반영, ㉔의 세션판) `parts.css` `.ax-bar-bottom`의 아래 안쪽 여백만 `--spacing-2`→`--spacing-4` | `session-rest`의 `안쪽 대칭` 칸 **실패**, 종료 코드 1 | `cmp` 같음 |
| (리뷰 반영) `restartRest`의 `2세트 완료`를 없는 이름으로 | 새 흐름 `휴식 바 다시 띄우기 (건너뛰기 뒤)`가 `예외: …`로 실패 | `cmp` 같음 |

### 옮긴 스캔 (RR6 리뷰 반영 — 규칙 3)

| 스캔 | 전 | 후 | 같은 뜻인 이유 |
|---|---|---|---|
| `legacy-scope.test.mjs` "v120 RR1: 두 파일의 legacy 뿌리 목록이…" | 필요한 뿌리 `.screen`·`.session`·`.onboarding`·… | `.session` 뺌 | RR6이 `.session`을 뿌리에서 뺀 PLAN 변경의 기계적 결과. 빠졌다는 검사는 아래 새 테스트가 맡는다 |
| `legacy-scope.test.mjs` "v120 RRM: 띠(.session-header·.rest-bar…)와 시트(.sheet)…" → "시트(.sheet) — …" | `.session-header`·`.rest-bar`·`.sheet`의 면·테두리, `.rest-bar-done` 면 | `.sheet`만 | 두 띠 클래스가 RR6에서 지워졌다. 띠의 면은 `parts.css`의 `.ax-bar`와 `ui-check` `띠` 칸이 본다 |
| `v120.test.ts` "v120 RR0: ui-check-lib.mjs에 띠 선택자 글자(.session-header)가…" → "v120 RR0·RR6: …BAR_SELECTOR 줄이 '.ax-bar'뿐이다" | `.session-header` 글자가 `BAR_SELECTOR` 한 줄에만, 그 줄에 `.ax-bar` | `BAR_SELECTOR = '.ax-bar'` 한 줄, `.session-header`·`.rest-bar` 글자 0건 | 선택자가 `.ax-bar` 하나로 줄어든 PLAN 변경. 목적(띠 선택자가 한 곳)은 같고 옛 클래스가 없다는 것까지 본다 |
| `v120.test.ts` "v120 RR6: 옛 세션·휴식 클래스(.session-*·.rest-*)가 CSS에 하나도 안 남고…" → `legacy-scope.test.mjs` 2개 | vitest `?raw`로 읽음 — CSS가 빈 글자라 **실패할 수 없었다**(`.session-header`를 되살려도 통과) | fs로 `src/**/*.css` 전부를 읽는다. 정규식 `/\.session(-[\w-]+)?(?![\w-])/`(하이픈 여럿 포함), 읽은 글자가 비지 않았는지 확인, 두 뿌리 목록에 `.session` 없음 | 같은 뜻을 일하게 옮김. 테스트 수: `v120.test.ts` −1, `legacy-scope.test.mjs` +2 |

리뷰 반영(RR6 반려): ① CSS 스캔을 fs로 옮김(위 표) ② `SYMMETRY_JUDGED`에 `session`·`session-375`·`session-rest`·`session-safe`를 더함(`button`·`bar` 종류만, 운동 카드 안의 card·badge·set-row는 RR7 전까지 기록만). `session-safe`(다크·라이트)에 `안쪽 대칭` 흐름 추가 — 쌍 9개 대칭. 세션 세 장면 `안쪽 대칭` 통과, `after --check --safe-area` 종료 코드 0. `같은 역할` 카드 사이 12px는 홈·요약·기록 등 8장면의 값이고 세션 장면은 카드 사이 값을 재지 않는다(세션 카드는 RR7이 옮길 때 잰다). ③ 휴식 바 흐름 둘의 정리(다시 띄우기)를 판정과 따로 `guardedFlow`로 뺐다. ④ 위 표. ⑤ `scripts/ui-check.mjs` 작업 트리 CRLF를 LF로.

### 변이 테스트

대상 없음(`src/lib`를 안 바꿨다).

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20` → **종료 코드 0**)

- 세션 네 장면 `접근성` 통과(이름 4칸 유지), `띠` 통과, `마지막 요소` 통과. 375·390 스크린샷에서 한글이 글자 중간에서 꺾이지 않는다(`세/트` 헤더는 RR6 전 `before`에도 있던 것). 무관한 스크린샷은 `git show HEAD:`로 되돌렸다.
- **알려 둠:** 운동 카드(legacy, RR7에서 옮김)가 `.session` 뿌리에서 빠져 맨 `button`의 `min-height: 44px`를 잃었다. 머신 메모 줄 높이 130→106px. RR7이 카드를 옮길 때 같이 정리한다.

### 실행 결과

- `npm test`: `Test Files  74 passed (74)` / `Tests  1736 passed (1736)`
- `npm run check`: 전부 통과(빌드 포함)
- `git rev-list --count main..HEAD`: 커밋 전 37

### 실기기 확인 목록

- 끝난 휴식 바를 글자·빈 곳 어디서나 1탭으로 닫히는지(iOS Safari), 휴식 바 버튼 셋이 375 폭에서 안 잘리는지.

## RR7. 운동 카드와 스테퍼

### 범위

| 파일 | 바뀐 것 |
|---|---|
| `src/components/NumberStepper.tsx` | 로직(`text`·`isAllowedInput`·`commitText`·`bump`·`release`·`abort`·`latest`·`ladder`) 그대로. 그리는 것만 `HStack className="ax-scope"` + `Button`(−·+, 같은 네 처리기, `onClick` 없음) + `TextField`. `pressed` 상태 삭제. `isProminent`·`status` 속성 추가 |
| `src/components/ExerciseCard.tsx` | `Card`(스킵이면 `muted`, 뿌리 `ax-scope`) + `Collapsible`(머리 = `trigger`) + `Badge`·`Text`·`List`·`ListItem`·`ToggleButton`·`TextField`. 칩 줄을 본문 맨 위로. 세트 행은 직접 짓고 `setRowClass`·`zeroWeightHint`·로직 그대로. 시트 넷은 카드(섬) **밖**으로 뺌 |
| `src/ax/index.tsx` | `TextField`에 `isNumeric`·`isProminent` 추가(입력칸에 `ax-num`·`ax-num-prominent`를 건다) |
| `src/ax/parts.css` | 세트 표(`.ax-set-head`·`.set-row`가 열 정의 한 곳을 읽는다)·완료/워밍업 행·숫자 칸·스테퍼 줄 폭·`.ax-text-warning` |
| `src/styles/global.css` | `.stepper*`·`.set-*`·`.setup-row/-value/-empty/-icon`·`.setting-rows`·`.ex-chips/-note/-cue/-body`·`.note-prev`·`.chip-tap`·`button.chip`·`.btn-warn`·`.ex-card-done/-skipped`·`.ex-count-done` 삭제 (−325줄: 341 삭제, 16 추가 — 대체 시트가 쓰는 `.setup-edit` 셋) |
| `scripts/ui-check.mjs`·`scripts/lib/ui-check-lib.mjs` | `세트 숫자`·`섬 버튼` 판정 켬, 세트 행·식단 스테퍼 흐름(guardedFlow), `inPageTouchReach`·`inPageSetTable`·`inPageNumberFit`, `섬 버튼`이 legacy 범위 안 Astryx 버튼도 잼, `CARD_SCENES`의 카드·뱃지·세트 행 대칭 |
| 테스트 | `src/lib/v120.test.ts`(+10), `scripts/rr7.test.mjs`(신규 6), 옮긴 스캔 둘(`polish`·`setRowState`) |
| 기타 | `docs/ASTRYX-INVENTORY.md` 새로 씀(인라인 70→66, legacy 쓰임 404→363, Astryx 읽는 파일 15→17), `eslint-suppressions.json`에서 `ExerciseCard`의 `no-autofocus`(더 안 난다)와 이미 없는 `glass-check.mjs` 줄을 `--prune-suppressions`로 뺌 |

### PLAN과 달라진 것·알아낸 것

| 항목 | 내용 |
|---|---|
| `Text color="warning"` | 없다(`TextColorMap`은 primary·secondary·disabled·placeholder·accent·inherit). 경고 글자는 `parts.css`의 `.ax-text-warning`(`--color-text-warning`)으로 건다 |
| `TextField`의 숫자 글자 | `controlStyle`은 입력칸이 아니라 **바깥 상자**에 붙어 글자 크기가 안 닿는다(실측 16px). 그래서 `controlClassName`으로 `.ax-num(-prominent) input`에 건다. 크게 켠 칸의 좌우 여백은 0(142.5가 375에서 잘렸다) |
| `.setup-*` 전부 삭제 | 틀렸다 — `.setup-edit`(+`.field`·`.btn-sm`)를 `SubstituteSheet`가 쓴다. 그 셋은 `global.css` 끝에 남기고 이유를 적었다 |
| 세트 열 | 번호 `--spacing-6` · 무게 1.2fr · 횟수 1fr, 스테퍼 안 간격 `--spacing-2`. Astryx는 터치에서 누르는 영역을 **이웃과의 간격 절반**까지만 넓혀서, `−`·`+`와 숫자 칸 사이가 4px이면 20px까지(21 미달), 8px이면 22px이다 |
| 스테퍼 줄(식단 편집) | `.btn-row > .ax-scope`에 `min-width: 0`을 주면 폭 0으로 줄어 단추가 삭제 버튼 위에 겹쳤다(문서가 390→511로 넓어짐). 단추 둘+숫자 칸 최소 폭(`calc(2 * var(--spacing-9) + var(--spacing-12))`)을 둔다 |
| `섬 버튼` | 섬 안 버튼만 재면 **카드가 섬을 잃어도 못 잡는다**(스테퍼가 스스로 섬). legacy 범위(`.screen` 등) 안의 Astryx 버튼도 같이 재도록 고쳤다 — 결함 복원 ⑭에서 발견 |
| 수정 커밋 `2a8d5cd`(화면 검증 반려) — `parts.css` 규칙 넷 | `.ax-tip`(자극 요령 카드 테두리 + `word-break: keep-all`, 375에서 `상/태` 꺾임), `.ax-toggle`(감각 점수·통증 토글), 식단 줄 둘 `.btn-row:has(> .ax-scope) > input[type='time']`·`> .btn-danger`. 흐름 둘 추가: `RR7 팁 카드 375 글자 중간 꺾임 없음`, 식단 스테퍼 흐름의 `삭제 오른쪽 끝≤메모 칸`(390·375). `ExerciseCard.tsx`는 클래스를 거는 4줄 |
| **편차: 식단 편집 legacy 요소에 `parts.css`로 `flex`/`width`** | 시각 칸(`input[type='time']`)에 `flex: 0 1 8rem; min-width: 0`, 삭제 버튼(`.btn-danger`)에 `width: auto; flex: 0 0 auto`. PLAN 범위 제외("시각 입력칸·삭제 버튼·줄 배치는 옮기지 않는다")와 `parts.css` 머리 규칙(`ax-` 이름)에서 벗어난다. 머리 주석의 예외 목록에 두 선택자를 적었다. **이유:** 스테퍼가 들어오며 삭제 버튼 오른쪽 끝이 메모 칸보다 약 11px 밖(카드 테두리 5px 앞)으로 나갔다(화면 검증 고칠 것 3). `DietDayEditor.tsx`를 안 고치는 PLAN에서 줄을 맞추려면 legacy 두 요소의 폭을 건드릴 수밖에 없었다. `:has(> .ax-scope)`로 스테퍼가 든 줄에만 걸어 다른 `.btn-row`는 안 바뀐다 |
| 왜 스테퍼 폭으로 못 맞췄나 | 화면 검증자가 먼저 낸 길(식단 스테퍼 폭 줄이기)은 이미 한계다 — 식단 스테퍼는 `isProminent`가 꺼져 있고, 단추 둘+숫자 칸 최소 폭(`calc(2 * var(--spacing-9) + var(--spacing-12))`)을 더 줄이면 위 "스테퍼 줄" 행처럼 폭 0으로 겹친다. 남은 여유는 시각 칸과 삭제 버튼뿐이다 |
| 삭제 버튼 `before` 대비 | 전: `.btn`의 `width: 100%`가 flex 줄에서 줄어 남는 폭을 나눠 가졌다(스테퍼가 최소 폭을 지키자 카드 밖으로 밀림). 후: 내용 폭(`btn-sm` 좌우 12px + 글자)으로 고정. **높이 44px 그대로**(흐름 `삭제 44px` 통과). 폭의 픽셀 값은 따로 재어 두지 않았다 |
| `.ax-toggle`가 `ToggleButton` 모양을 덮어쓰는 이유 | Astryx `ToggleButton`(`ToggleButton.d.ts`)에 `variant`가 없어 안 눌렸을 때 바탕·테두리 없는 맨 글자가 된다(화면 검증 고칠 것 2). 속성으로 못 고쳐 `.ax-toggle`가 `--color-background-muted`·`--color-border-emphasized`로 알약 모양을 주고, 눌림(`aria-pressed='true'`)은 `--color-accent-muted`·굵은 글씨로 구분한다. 세트 행 `✓`에는 안 건다(리뷰가 실기기 목록에 올림) |
| 앞 작업에서 넘어온 것 (1) 다크 칩·번호 동그라미 배경 | `Badge`로 바뀌어 사라졌다. 다크 `history-detail-edit`에서 순번 동그라미·그룹/휴식 칩 배경이 보인다 |
| (2) `세/트` 꺾임 | 머리가 행과 열 정의를 공유하고 `nowrap`. 390·375 둘 다 한 줄(`세트 표 머리` 두 줄 이상 0개, 열 왼쪽 끝 차이 0px) |
| (3) 카드 버튼 터치 영역 | `inPageTouchReach`(행 둘, 버튼 10개 × 4방향 중심 21px `elementFromPoint`) 390·375 통과. 카드 뿌리가 `ax-scope`이고 `섬 버튼` 통과(44px로 안 부푼다) |
| (4) 식단 스테퍼 | 스스로 섬. `diet-log-open` `섬 버튼` 통과, 390·375 가로 넘침 없음, 삭제 버튼 44px |
| 알려 둠 | `SessionScreen.tsx:132`의 `Unused eslint-disable directive` 경고 한 줄은 RR7 전부터 있다(손대지 않음). 감각 점수·통증 `ToggleButton`은 안 눌렸을 때 테두리가 없어 글자만 보인다 — 화면 검증자가 본다 |

### 테스트 ↔ PLAN 검증

| PLAN 검증 | 테스트 / 검사 |
|---|---|
| 카드 className·style·`<button`·`<input` | `v120 RR7: ExerciseCard의 className=…` |
| 스테퍼 className·`<button`·`<input`·`onClick` 없음 | `v120 RR7: NumberStepper의 className=…` |
| `global.css`에 `.stepper` 없음 | `scripts/rr7.test.mjs` `global.css에 .stepper·.set-*…`(fs) |
| `DietDayEditor` 안 고침 | `v120 RR7: …식단 편집은 안 고친다` (`isProminent`·`ax-scope` 없음) |
| 안 고치고 통과: v18·warmupInsert·guideFinish·inputProps·setRowState·uiConsistency·v111·v113·v114·NumberStepper | 전체 통과(스캔 둘만 옮김 — 아래) |
| `inputProps`의 `<input` 검사가 비면 `TextField`만 | `v120 RR7: 입력은 TextField…만 쓴다` |
| 탭 수(1탭 완료·1탭 한 단계·끌어도 안 바뀜·`40.123456`·횟수 소수점·워밍업) | 흐름 `RR7 1세트 완료 1탭`·`무게 증가 1탭에 한 단계`(0→2.5)·`세로로 끌면 안 바뀐다`·`숫자 칸 입력 패턴`(40.12·125)·`워밍업 …원래 세트에 남는다`(77) |
| `세트 숫자` | `session`·`session-375`·`history-detail-edit` 통과(22px) |
| `−`·`+`·`✓` 21px | 흐름 `RR7 세트 행 390/375 폭`의 누르는 영역 |
| 접근성 칸·종료 코드 0 | `session`·`session-375`·`session-open-b` `접근성` 통과, 전체 실행 `종료 코드 0` |
| 375 넘침·`142.5`·`12` | 같은 흐름의 `142.5·12`(잘린 칸 0, 넘친 행 0) |
| 세트 표 머리 한 줄·열 정렬 | 같은 흐름의 `세트 표 머리` + `rr7.test.mjs` 머리·행 한 규칙 |
| 순서(칩 줄 → 메모 → 자극 요령 → 세팅 → 무게 단위 → 표) | `v120 RR7: 순서 — 칩 줄이 본문의 맨 위다` |
| 여백(`안쪽 대칭`·`가까움 순서`) | `session`·`session-375`·`session-open-b`·`history-detail-edit` `안쪽 대칭` 통과(카드·뱃지·세트 행·버튼), 같은 역할 `가까움 순서` 통과 |
| 기록 편집 `섬 버튼` | `history-detail-edit` 통과 |
| 식단 스테퍼(+0.5·1.555→1.55·글자 작음·삭제 44px·넘침 없음, 390·375) | 흐름 `RR7 식단 스테퍼…` 통과 |

### 옮긴 스캔 (규칙 3)

| 스캔 | 전 | 후 | 같은 뜻인 이유 |
|---|---|---|---|
| `polish.test.ts` BB3 "빈 상태와 채운 상태를 텍스트 색으로" | `setupNote ? 'setup-value' : 'setup-empty'` | `setupNote ? <Text>… : <Text color="secondary">…`(무게 단위 줄도) | 빈 값은 흐린 글자, 채운 값은 보통 글자 — 클래스에서 `Text`의 색으로 옮겼을 뿐 |
| `setRowState.test.ts` "경고가 문구와 숫자 양쪽에" | `set-ghost set-ghost-warn` + `stepper-slot-warn` | `className="ax-text-warning"` + `status={zeroHint ? 'warning' : undefined}` | 문구와 숫자 양쪽에 경고가 걸린다 |
| `v120.test.ts` RR0 "JUDGED" | `'세트 숫자': false, '섬 버튼': false` | 둘 다 `true` | PLAN: 작업이 끝날 때 true로 |

### 결함 복원

| 되살린 결함 | 잡은 것 | 원상복구 |
|---|---|---|
| ⑫ `+`에 `onClick={() => bump(1)}` | `v120 RR7` 1건(`NumberStepper의 className=…onClick이 없다`) + 흐름 `무게 증가 1탭에 한 단계` 실패(0→5)·`끌면 안 바뀐다` 실패 | `cmp` 같음 |
| ⑬ 카드에서 `isProminent` 뺌 | `v120 RR7` + `session` `세트 숫자` 실패(8/8개가 22px 미만) | `cmp` 같음 |
| ⑭ 카드 `Card`의 `ax-scope` 뺌 | **처음엔 못 잡음**(스테퍼가 섬이라 `섬 버튼` 통과) → `섬 버튼`이 legacy 안 Astryx 버튼도 재게 고침 → `history-detail-edit` `섬 버튼` 실패(17/25개 44px), 종료 코드 1 | `cmp` 같음 |
| ⑲ 스테퍼 뿌리의 `ax-scope` 뺌 | 전체 실행이 `diet-log-open` 뒤 `설정` 탭 클릭에서 **중단**(스테퍼 숫자 칸이 탭을 가림 — 줄이 넓어져 문서가 커진다), 종료 코드 1. `섬 버튼` 칸까지 못 가고 죽는다 | `cmp` 같음 |
| `.ax-set-head,`를 `.ax-set-head-x,`로(머리가 열 정의를 따로) | `scripts/rr7.test.mjs` 머리·행 한 규칙 1건 | `cmp` 같음 |

### 변이 테스트

대상 없음(`src/lib`를 안 바꿨다).

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20` → **종료 코드 0**)

- `session`·`session-375`·`session-open-b`·`history-detail-edit` 전 칸 통과(접근성 4칸, `세트 숫자`, `섬 버튼`, `안쪽 대칭`). `diet-log-open` `섬 버튼` 통과.
- 접근성 이름: `워밍업` 버튼에 `aria-label="워밍업 세트 추가"`, `대체`에 `대체 — 자리 없음, 대체운동 고르기`를 그대로 넘겼다(`label-content-name-mismatch` 0건).

### 하지 않은 것·실기기 확인 목록

- 감각 점수·통증 토글, 자극 요령 카드의 모양은 화면 검증자가 본다. 팔 뻗은 거리(50%)와 `--press-shot`(`+`·`✓`)는 화면 검증 몫이다.
- 실기기: 세트 `+`·`−`를 한 번 눌러 한 단계씩 오르는지, 땀 묻은 손으로 `✓`가 한 번에 눌리는지, 숫자 칸 탭 → iOS 키패드(소수점 키는 무게에만), 식단 편집의 개수 스테퍼.

### 실행 결과

- `npm test`: `Test Files  75 passed (75)` / `Tests  1753 passed (1753)`
- `npm run check`: 전부 통과(빌드 포함)
- `node scripts/ui-check.mjs after --check --ver=v1.20`: `종료 코드 0`
- `git rev-list --count main..HEAD`: 커밋 전 40

## RR8. 세션의 시트 8개

### 범위

| 파일 | 바뀐 것 |
|---|---|
| `src/components/{FinishSheet,AddExerciseSheet,ManualTimerSheet,SubstituteSheet,CompensationSheet,CompensationWatchSheet,WeightScaleSheet,TempoGuideSheet}.tsx` | `SheetFrame` → `../ax`의 `Sheet`(RR5의 `dismiss` 렌더 프롭). 로직·문구·`label` 그대로. 고르는 줄 `ListItem`, 읽는 줄 `Item`, 켜고 끄는 고르기 `ToggleButton`(`className="ax-toggle"`), 하나 고르기 `SegmentedControl`, 입력 `TextField`·`TextAreaField`, 2단계 삭제 확인은 `Banner error`. `purpose`: 종료·대체·보상작용·무게 단위 `form`, 나머지 넷 `info` |
| `src/ax/index.tsx` | `TextAreaField` 추가(`TextField`처럼 자동완성 억제·16px 하한을 품는다) |
| `src/ax/parts.css` | 템포 무대 `.ax-tempo-*`(링 크기는 `--ax-tempo-scale`), 여덟 시트 이름으로 좁힌 한글 `keep-all` 규칙 |
| `src/styles/global.css` | `.tempo-*`·`.sheet-row`·`.sub-field*`·`.chip-row`·`.chip-btn*`·`.setup-edit*` 삭제(−138줄) |
| `scripts/ui-check.mjs`·`scripts/lib/ui-space.mjs` | 시트 장면 12개(종료·유산소·끝·타이머·고른 타이머·추가·대체·보상작용·고른 보상작용·무게 단위·오류·템포), 흐름 14개+시트별 390·375 글자 중간 꺾임 7개(전부 `guardedFlow`), `sheet-*` 쌍·같은 역할 판정, 종료 시트 닫기 세 흐름을 Astryx dialog 기준으로 다시 씀 |
| 테스트 | `src/lib/v120.test.ts`(+15), `scripts/rr8.test.mjs`(신규 4, CSS는 fs로 읽는다) |
| 기타 | `docs/ASTRYX-INVENTORY.md` 새로 씀, `docs/screenshots/v1.20/after/` 신규 장면 20장 + `sheet-finish`·`sheet-timer`(다크·라이트) + `layout.json` |

세 숫자(`astryx-inventory --check`): Astryx를 안 읽는 파일 32→**24**, 인라인 66→**55**, legacy 쓰임 363→**288**(RR8 몫은 −75로 PLAN 예상 그대로. PLAN 예상 283과의 차이 5는 RR7이 363에서 끝나 넘어온 것이다), 안 쓰는 선택자 2→**2**(늘지 않음).

### PLAN과 달라진 것·알아낸 것

| 항목 | 내용 |
|---|---|
| 경고 글자색 | `Text`의 색 이름에 `warning`·`error`가 없다(`BuiltinTextColor`). PLAN의 `Text color="warning"`은 RR7이 만든 `className="ax-text-warning"`로, `Text color="error"`는 RR5와 같이 `Banner status="error"`로 했다 |
| 막 누름으로 안 닫히는 시트 | `purpose="form"` 시트(종료·대체·보상작용·무게 단위)는 막을 눌러도 안 닫힌다(실측: 종료 시트에서 막을 눌러도 `dialog`가 남고 Esc는 닫는다). **끌어내려도 안 닫힌다** — Astryx `BottomSheet`의 `isSwipeDismissAllowed`가 `purpose === 'info'`뿐이고(`BottomSheet.js:752`), 막 누름도 `info`만 받는다(`:387`). 닫는 길은 시트 안 닫기·취소 버튼과 Esc다. 입력을 실수로 잃지 않는 쪽이라 PLAN의 `purpose` 규칙 그대로 두었다(PLAN 개정 4가 사람 결정으로 "버튼·Esc로만 닫힌다"를 확정). 종료 시트의 옛 동작(막 누름으로 닫힘)이 바뀌는 점이라 여기 적는다. `ui-check`의 닫기 세 흐름은 이름을 `Esc로 닫기`·`Esc 두 번 누르기`·`움직임 줄이기에서 닫기`로 바꿨다 |
| 템포 가이드 `purpose` | 지금 막 누름으로 닫혀서 `info`(PLAN의 지시). `required`가 아니다 |
| 링 크기 | `style=` 속성을 안 쓰려고 효과에서 `style.setProperty('--ax-tempo-scale', …)`로 건넨다(인라인 스타일 수 안 늘어남) |
| 대체 후보 1탭 | 예시 데이터에는 원 종목 기록이 있는 후보가 없어(후보가 전부 `no-history`로 막힘) 흐름이 **건너뜀**으로 통과한다(`ok: true`, 이유 적음). 경계 상태는 `sheet-substitute` 장면이 찍는다. 보상작용 징후 둘 고르기도 예시 카드에 체크리스트가 없어 직접 입력으로 같은 저장 길을 탄다 |
| 템포 장면 | 템포 가이드는 설정에서 켜야 버튼이 보인다 → `sheet-tempo` 구간이 설정을 켜고 새 세션을 시작해 흐름을 돌린 뒤 세션을 버리고 설정을 되돌린다 |
| 제목 정렬 | 템포 시트 제목을 가운데로 두면 `같은 역할`의 시트 좌우가 18로 어긋나(다른 시트 16) 왼쪽 맞춤으로 했다 |
| 옮긴 스캔 | `v119` QQ3 legacy 시트 12→4, `v112` `FinishSheet` 한 줄(`<Text color="secondary">`), `uiConsistency` X9(`<Button`), `scripts/rr7.test.mjs`(`.setup-edit` 삭제) — 수정표의 둘 + 아래 `수정표 밖` |

수정표 밖: `v119.test.ts`(QQ3 개수 12→4), `scripts/rr7.test.mjs`(`.setup-edit` 남김 → 삭제 확인).

### 테스트 ↔ PLAN 검증 항목

| PLAN 검증 | 확인 |
|---|---|
| 여덟 파일 `Sheet`·`SheetFrame` 0·className `ax-tempo-` 뿐·`style=`·`<button`·`<input`·`<textarea` 0 | `v120` RR8 첫 둘(className은 `ax-toggle`·`ax-text-warning`도 허용 — 위 표) |
| QQ3 목록이 식단 넷, 열 시트 닫기가 `dismiss` | `v120` RR8 "legacy 시트 목록이…", "열 시트 열의 닫기는 dismiss" |
| 안 고치고 통과(`guideFinish`·`tempo`·`soundCancel`·`audioIndependence`·`v18`·`uiConsistency` X9 첫 검사·`v112`) | 전체 테스트 통과 |
| 옮기는 둘(`v112:815`·`uiConsistency:96`) | 위 표 |
| `FinishSheet` 버리기 앞 `destructive` | `v120` RR8 |
| 흐름: 종료→기록→요약 / 버리기 2단계→홈 / 수동 타이머 / 대체 / 보상작용 / 무게 단위 / 템포 Z2 체인 | `ui-check` 흐름 `RR8 …`(종료→요약은 기존 장면 순서, 대체는 건너뜀 — 위 표) |
| 화면 검증: 끝까지 스크롤·고른 상태·오류 문구·도는 중 한 장·375·390 | 장면 12개, `RR8 종료 시트 끝까지 스크롤…`, `…글자 중간 꺾임 없음` 7개(390·375) |
| 경계: 경고(미완료)·대체 후보 막힘·체중·보상작용 없음·핀 목록 오류 | `sheet-finish`(미완료 경고)·`sheet-substitute`·`sheet-scale-error` 장면. 체중 입력 칸은 후보가 열려야 나와 소스 스캔(`v120` RR8 로직 그대로)만 |

### 결함 복원 (`cp` 백업 → 결함 → 테스트 → 복구 → `cmp`)

| 되살린 결함 | 실패한 테스트 | 복구 |
|---|---|---|
| `FinishSheet` `이 세션 버리기`의 `variant="destructive"` 제거 | `v120` RR8 "버리기 문구 앞…" | `cmp` 같음 |
| `AddExerciseSheet` 닫기 `onClick={dismiss}` → `{onClose}` | `v120` RR8 "닫기는 dismiss를 지난다" | 같음 |
| `parts.css` keep-all 목록에서 `무게 단위 설정` 제거 | `rr8.test.mjs` "여덟 시트의 이름…" | 같음 |
| `ManualTimerSheet`의 `ax-toggle` 하나 제거 | 처음엔 **못 잡았다**(정규식이 다른 `ToggleButton`의 클래스에 걸림) → 태그 수 = 클래스 수 비교로 고친 뒤 `v120` RR8 "켜고 끄는 고르기" 실패 | 같음 |
| `CompensationSheet`의 `hasCompensation(current)` → `(preview)` | `uiConsistency` X9 둘 | 같음 |

### 변이 테스트

대상 없음 — `src/lib`의 판정 파일을 안 고쳤다(`git diff --stat main..HEAD -- src/lib`는 테스트 파일뿐).

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20` → **종료 코드 0**)

- 접근성(axe) serious·critical 0건, 새 장면 12개의 `띠`·`시트 버튼`·`안쪽 대칭`·`같은 역할`(시트 좌우 16으로 열두 장면 같음) 통과.
- 처음 실행의 실패와 고친 것: 종료 시트 닫기 흐름이 legacy 막(`.sheet-backdrop`)·막 누름에 묶여 있었다(위 표), 수동 타이머 흐름이 "안 눌린 첫 버튼"을 매번 다시 골라 거짓 실패, 닫힌 직후 바로 다시 열면 안 열려 450ms 기다림 추가, 템포 제목 가운데 정렬이 `같은 역할`에서 18.
- 이 실행은 `--same-layout`을 안 붙였다(옮긴 화면의 배치 기록이 `before`와 달라 RR3~RR7에서도 판정 명령이 아니다).

### 하지 않은 것·실기기 확인 목록

- (RR8 리뷰 반려 반영으로 해소: 대체 후보 1탭·보상작용 징후 둘·`CompensationWatchSheet`는 아래 "리뷰 반영"에서 시드로 실제로 잰다.)
- 실기기: 종료 시트 메모·무게 단위 핀 목록에 키보드가 올라와도 입력칸이 안 가리는지(Chromium에는 키보드가 없다), 템포 가이드 소리·화면 꺼짐, 종료·대체·보상작용·무게 단위 시트가 막 누름·끌어내림으로 안 닫히고 버튼·Esc로만 닫히는 것(위 표)이 불편한지.

### 실행 결과

- `npm test`: `Test Files  76 passed (76)` / `Tests  1773 passed (1773)`
- `npm run check`: 전부 통과(빌드 포함)
- `node scripts/ui-check.mjs after --check --ver=v1.20`: `종료 코드 0`
- `git rev-list --count main..HEAD`: 커밋 전 45(이 반려 반영 커밋 뒤 46)

### RR8 화면 검증 반려 반영 (경고 글자색)

| 고친 것 | 내용 |
|---|---|
| 원인(실측) | 시트 안 `.ax-text-warning`(0,1,0)이 같은 `astryx-theme` 층의 `.astryx-text[data-color="primary"]`(0,2,0)에 졌다. 계산된 color가 제목과 같은 흰색/검정 |
| 고침 | `parts.css`의 선택자를 `.ax-text-warning.ax-text-warning.ax-text-warning`(0,3,0)으로. 같은 클래스를 쓰는 RR7 세션 카드(`ExerciseCard`)도 같은 규칙이라 함께 고쳐진다 |
| 새 검사 | `ui-check`의 보상작용·무게 단위 흐름이 시트 안 경고 글자의 계산된 `color`가 `--color-text-warning`과 같은지 다크·라이트 둘 다 잰다(`inPageWarnColor`, `emulateMedia`로 체계 전환) |
| 결함 복원 | 선택자를 클래스 하나로 되돌리면 두 흐름이 실패(`rgb(255,255,255) / rgb(0,0,0)` ≠ 토큰 `rgb(238,196,72) / rgb(131,103,0)`) → 복구 후 통과, `cmp` 확인 |
| 사진 | `sheet-comp-picked`·`sheet-scale-error`(다크·라이트) 다시 찍음 |

하지 않은 것: 보상작용 징후 0개로 통과·대체 후보 1탭 건너뜀·`sheet-watch` 장면 없음은 남은 일이다. 시드로 Day 1을 세 번 끝낸 상태를 만들어 셋을 함께 돌려야 하는데 ui-check 시드 흐름을 새로 짜야 해서 이번 반려 범위 밖으로 뒀다.

### RR8 리뷰 반려 반영 (대체·보상작용 흐름 0개 통과, sheet-watch, 수치)

| 고칠 것 | 내용 |
|---|---|
| 1 흐름이 0개로 통과 | 첫 세션을 끝낸 뒤 그 세션을 같은 Day의 세 세션(`ui-check-seed-1~3`, 보상작용 기록)으로 복제해 IndexedDB에 넣고 새로고침한 뒤 같은 Day를 시작한다(블록 끝에서 지운다 — 뒤 장면은 시드 없는 데이터). 시드·시작·세 흐름은 한 `guardedFlow`(이름 넷)라 어느 단계서 던져도 넷 다 실패로 센다. 대체: 열린 후보 0개면 `ok:false`, 후보 1탭 뒤 시트 닫힘 + `대체` 뱃지가 늘었는지 잰다. 보상작용: `nSigns >= 2 && pressed === 2`(0=0 통과 제거), 카드는 클래스 유무가 아니라 저장한 문구(징후 이름 둘)가 `li .ax-text-warning`에 저장 전 0줄 → 저장 뒤 1줄인지 본다. 로그: 징후 목록 2개·눌린 징후 2개, 열린 후보 2개·대체 뱃지 1→2 (`.reports/ui-RR8-fix.log`) |
| 2 sheet-watch | `보상작용 3/3` 버튼으로 연 `CompensationWatchSheet`를 `sheet-watch`·`sheet-watch-end`(끝까지 스크롤) 장면으로 다크·라이트 찍고 `SESSION_SHEET_SCENES`·`ui-space.mjs` 두 목록에 더했다. 흐름 둘 추가(`그대로 두기` 버튼이 화면 안, 390·375 꺾임 없음). 템포 흐름 이름의 거짓 문구 `+ 막을 눌러 닫히지 않는다(purpose)`를 지웠다(템포는 `info`) |
| 3 DEV-RECORD | 위 RR8 절의 `358→288`을 `363→288`로, form 시트가 끌어내림으로도 안 닫힌다(`isSwipeDismissAllowed`는 `info`만)를 막 누름 줄·실기기 목록에 더했다 |
| 같이 | 예시 세션의 `sheet-comp` 장면은 판정 흐름을 시드 세션으로 옮기고 저장 대신 `취소`로 닫는다 |

결함 복원: `CompensationSheet`의 `ToggleButton` `onPressedChange`를 `() => void toggle`로(컴파일은 되게) 바꾸자 보상작용 흐름이 다크·라이트 둘 다 실패(눌린 징후 0개) → 복구, `cmp` 확인. 시드 `evaluate`가 던진 처음 실행에서는 넷이 모두 `흐름 실패`로 셌다(건너뜀 없음). 테스트: `v120` RR8에 "0개로 통과하지 않는다" 하나를 더했고 장면·이름 목록을 고쳤다.

## RR9. 요약

### 범위

| 파일 | 바뀐 것 |
|---|---|
| `src/screens/SummaryScreen.tsx` | legacy 18·인라인 4 → `AxRoot`+`Groups`/`Group` 셋(이번 세션 → 다음에 할 것 → 되돌아보기, 홈으로는 맨 아래). 숫자 셋 `Grid columns={3}`, 줄은 `Row`(HStack·VStack·Text), 뱃지 PR info·앞당김 info·미룸 neutral, 경고색 `ax-text-warning`, 증량 `Text color="accent"`. 계산·카드 내용·보이는 조건은 그대로 |
| `src/ax/index.tsx` | `Grid` 내보내기, `Groups`가 `className`을 더 받는다 |
| `src/ax/parts.css` | `.ax-summary` — 한글을 단어 사이에서만 꺾는다(375 폭에서 "보상작/용"이 꺾이던 것) |
| `scripts/ui-check.mjs`·`scripts/lib/*.mjs` | 장면 4개(`summary-zero`·`-pr`·`-assist`·`-memo`)와 `summary` 판정(안쪽 대칭 card·badge·button, 카드 안쪽 같은 역할), 안쪽 폭 넘침(`inPageInnerOverflow`, 가로 넘침 칸에 합침), 카드 순서·긴 글 안 잘림·390·375 꺾임 흐름 — 전부 `guardedFlow`/`try-finally`, 시드는 끝에 지움 |
| `README.md` | Tech Stack 줄, 프로젝트 구조에 `ax/` 줄(PLAN 문구) |
| 테스트 | `src/lib/v120.test.ts`(+10, RR12 한 건 문구만 수정), `scripts/rr9.test.mjs`(신규 2, CSS는 fs로) |
| 기타 | `docs/ASTRYX-INVENTORY.md`, 스크린샷 `summary`(다크·라이트)·`summary-zero|pr|assist|memo`·`layout.json`. 무관한 스크린샷은 `git show HEAD:`로 되돌림 |

세 숫자: Astryx 안 읽는 파일 24→**23**, 인라인 55→**51**, legacy 쓰임 288→**270**(RR8 몫 PLAN 대비 +5 차이가 그대로 넘어옴, RR9 몫은 −18로 예상과 같다), 안 쓰는 선택자 2→**2**.

### PLAN과 달라진 것·알아낸 것

| 항목 | 내용 |
|---|---|
| `List`/`ListItem` 대신 `Row` | `ListItem`은 줄마다 위·아래 안쪽 여백 8px이라 줄 목록 카드의 아래가 제목 위보다 **9px 넓었다**(`안쪽 대칭` 실측: 위 15·아래 24 — "확인한 것" 9의 비대칭). 그래서 `HStack`/`VStack`/`Text`로 줄을 짓고 `role="list"/"listitem"`을 단다. `ListItem`의 문자열 label·description이 한 줄로 잘리는 것(Item.js)도 함께 피한다 |
| `className=` | PLAN은 0건이나 `Text`에 경고색 이름이 없어(RR8과 같다) `ax-text-warning`, 줄바꿈 범위 `ax-summary` 둘이 남는다 |
| 최고 세트 줄 | `Text color="secondary"`→`type="supporting"`: 본문 크기 글자의 줄 높이 때문에 숫자 카드 아래가 2px 넓었다 |
| 유산소 줄 | 값이 길면(`걷기 · 강도 …` 503px) 카드 밖으로 나가 안쪽 폭 검사가 잡았다. 값을 설명 줄로 내렸다 |
| 안쪽 폭 검사 | 처음엔 진행 막대 채움(움직이는 transform)을 상자 밖으로 잡아 홈 6장면·템포 시트가 실패 → 가로 스크롤·`hidden`·`clip` 칸 안은 뺐다(글 잘림은 `inPageNotClipped`가 따로 본다) |
| 못 만든 장면 | `감각 저하 — 이전 무게로 복귀` 카드는 Phase 2+의 증량 이력이 필요해 ui-check 시드로 못 만들었다 — 소스 스캔과 `bGroupGuide` 테스트가 맡는다 |

### 테스트 ↔ PLAN 검증

| PLAN 검증 | 테스트·흐름 |
|---|---|
| `className=`·`style=`·`<button`·`var(--` 0건 | `v120 RR9: SummaryScreen.tsx에 …` |
| v111·v114 스캔 그대로 통과 | `v111.test.ts` GG1, `v114.test.ts` LL3 (안 고침) |
| 세션 종료 → 요약 → 홈으로 → 홈 | ui-check 기본 흐름(`summary` 뒤 `홈으로` 1탭, 기록 탭 확인) |
| 경계: 0세트 | 흐름 `RR9 요약 0세트로 종료` |
| 경계: PR 셋 이상·수행 순서 뱃지 | 흐름 `RR9 요약 PR 셋 이상`(PR 줄 7, 앞당김 1·미룸 1) |
| 경계: 증량 대상 없음 | 0세트 흐름의 `증량 카드 0개` (증량 카드가 있는 쪽은 PR 장면 1개) |
| 경계: 어시스트만 | 흐름 `RR9 요약 어시스트 종목만`(볼륨 0, 제외 안내 1, 최고 세트 0) |
| 경계: 긴 메모 3줄 이상 | 흐름 `RR9 요약 긴 메모·감각 약함`(세션 메모 6줄, 감각 메모 3줄, 안 잘림, 경고색 계산값 = 토큰 다크·라이트) |
| 경계: 유산소만·디로드 | 소스 스캔(`cardioText(` v114)과 기존 화면 — 시드로는 안 만들었다 |
| `summary`·`summary-light` 넘침 없음 | `가로 넘침` 칸(문서 폭 + 안쪽 폭) |
| 순서 | `v120 RR9 — 순서` + 흐름 `RR9 요약 카드 순서`(화면에서 잰 순서) |
| 여백(RR12) | `안쪽 대칭`·`같은 역할`(카드 안쪽 summary 15)·`가까움 순서` 통과 |
| 390·375 꺾임 | 흐름 `RR9 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`(장면 5개) + `scripts/rr9.test.mjs` |

### 결함 복원

| 되살린 결함 | 실패한 것 | 복구 |
|---|---|---|
| 홈으로 버튼 이름을 바꿔 순서·묶음 관계를 깸 | `v120 RR9` 3건 | `cmp` 같음 |
| `.ax-summary` 선택자 이름을 틀리게 | `scripts/rr9.test.mjs` 1건 | `cmp` 같음 |
| (ui-check 실측) `ListItem`을 쓴 첫 구현 | `안쪽 대칭` 실패(위 15·아래 24), 375 꺾임 3건 | `Row`로 바꿔 통과 |

### 변이 테스트

`src/lib`을 바꾸지 않아 대상 없음.

### ui-check (`node scripts/ui-check.mjs after --check --ver=v1.20` → **종료 코드 0**)

접근성(axe) 장면 5개 모두 serious·critical 0건. 새 흐름 12개 통과, 전체 흐름 88개 통과.

### 실행 결과

- `npm test`: `Test Files  77 passed (77)` / `Tests  1786 passed (1786)`
- `npm run check`: 전부 통과(빌드 포함)
- `node scripts/ui-check.mjs after --check --ver=v1.20`: `종료 코드 0`
- `git rev-list --count main..HEAD`: 커밋 전 51(이 커밋 뒤 52)
- 실기기 확인: 없음(요약은 흉내로 다 볼 수 있다)
