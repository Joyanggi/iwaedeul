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

---

## SS0. 도구와 기준선

### 범위

| 바뀐 파일 | 내용 |
|---|---|
| `scripts/ui-check.mjs` | `requiredScene`(준비가 던지거나 기대한 장면을 못 찍으면 칸 전부 `실패`·`장면 실패 N건`·종료 코드 1, `--check` 없이도), 새 장면 24개(다크·라이트), 도우미 `wrapProbe`·`at375`·`withFreshPage`, 시드 도우미(`inPageDietSeed/Restore`·`inPageNoteSeed`), GitHub 호출 막기·세기 |
| `scripts/first-load.mjs`, `scripts/lib/first-load-lib.mjs` | 첫 화면 gzip 크기 도구(`collectFirstLoad`). `--check`는 360KB 한계. SS0에서는 `check.mjs`에 안 넣는다 |
| `scripts/astryx-inventory.mjs`, `docs/ASTRYX-INVENTORY.md` | `NOT_SCREENS`(`main.tsx`·`icons.tsx`)를 첫째 숫자에서 뺀다. 합계 줄에 `화면이 아니라 뺀 것 2개`가 늘었고 `--check` 정규식도 맞췄다 |
| `scripts/ss0.test.mjs` | SS0 스캔·`collectFirstLoad`·`first-load.mjs` 종료 코드 테스트 14개 |
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

### 하지 않은 것

- 변이 테스트: `src/lib`를 안 바꿨다(대상 없음).
- `docs/screenshots/v1.21/before`의 Argos 올리기: `ARGOS_TOKEN`이 없어 건너뜀(제약 42).
- 첫 화면 **시간** 판정, 가져오기·Gist 복원의 "파일을 고른 뒤" 상태(파일 고르기 창을 흉내 낼 수 없다 — SS6의 스캔과 화면 검증의 사진으로만 본다): PLAN 범위 제외.
- README 반영: 없음(PLAN이 없다고 적었다).

### 실기기·사람 눈 확인 목록

- `before` 폴더의 새 장면마다 다크·라이트 두 장이 의도한 상태인가(시트가 열려 있다, 폼이 펼쳐져 있다, 끝까지 스크롤됐다) — 화면 검증자.

### 실행 결과 요약

- `npm run check` 통과(흔적·Astryx 뒷걸음·린트·knip·테스트·빌드). `Test Files  79 passed (79)`, `Tests  1808 passed (1808)`. 빌드 성공.
- `git rev-list --count main..HEAD`: 커밋 전 0 → 이 작업 커밋 1개.
