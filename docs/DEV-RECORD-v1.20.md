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
