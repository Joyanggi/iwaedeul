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
