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
