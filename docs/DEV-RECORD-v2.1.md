# 개발·테스트 내역 (검토용) — v2.1 (VV)

> PLAN-v2.1의 구현 기록. PR 1(VV1 → VV2 → VV3 → 기록)이 만들고 PR 2가 잇는다.
> "이 환경에서 확인된 제약" 목록은 PR 1 마지막 "기록" 커밋에서 v1.21 목록(웹 전용 항목 뺌)을 이어받아 맨 위에 넣는다.

## 배포 영향

**웹(Pages)은 바뀌지 않는다. 이 PR부터 배포가 없다.** 레포에서 웹 코드를 지웠다(`WEB_FINAL`에 있다). 남은 것은 코어·시드·검사 도구.

## WEB_FINAL

`gh run list --workflow deploy.yml --status success --limit 1 --json headSha,createdAt` →
`headSha` = `d87ef6d639ddfba433442f35b5e46823b5357c13`, `createdAt` = 2026-11-27T01:06:58Z.
(PLAN 작성 때의 `aa0f0be` 뒤 PLAN 개정 PR #61 머지가 다시 배포했다. 문서만 바뀌어 웹 코드는 같다.
지휘자는 PR 1 머지 직전에 같은 명령의 첫 줄이 같은지 본다.)

## VV1. 웹 배포 끄기

| 항목 | 내용 |
|---|---|
| 바뀐 파일 | `.github/workflows/deploy.yml` 삭제 · `README.md`(머리 소개·"배포" 절) · `docs/DEV-RECORD-v2.1.md` 신규 |
| 테스트 | 새로 만든 것 없음(워크플로 삭제). 기존 테스트·코드 무변경 |

검증 출력:

- `ls .github/workflows` → `ci.yml security.yml`
- `git grep -n "deploy-pages\|upload-pages-artifact" -- .github` → 0줄
- `ci.yml`(필수 검사 `ci`)·`security.yml` 무변경

사람이 볼 것(PR 1 머지 뒤): `gh run list --workflow deploy.yml --limit 1`의 `headSha`가 `WEB_FINAL` 그대로이고(새 실행 없음), 폰의 웹앱이 평소처럼 열린다.

## VV2. 웹 지우기

배포 영향: **웹(Pages)은 바뀌지 않는다.** 지운 것은 레포의 웹 코드뿐이다(`WEB_FINAL`에 있다 — 이 레포에는 아직 그 태그가 없다. 지휘자가 PR 1 머지 직전에 만든다).

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(VV2). `git rev-list --count main..HEAD` → 2 (VV1 · VV2) |
| 바뀐 파일 | 183개: 신규 4(`readModel.ts` `dietSlots.test.ts` `v21.test.ts` `test-paths.test.mjs`) · 지움 135 · 고침 44(이 기록 포함). `mealCalendar.test.ts` → `dietSlots.test.ts`는 `git mv`지만 남긴 `it`이 6개뿐이라 git은 이름 바꿈으로 보지 않고 삭제 + 신규로 센다 |
| 테스트 | 전 88파일/1921 → 후 **61파일/1318** (지운 630 + 더한 27) |
| 더한 테스트 | `v21.test.ts` describe `VV2` 20 · `properties.test.ts` 속성 2 · `test-paths.test.mjs` 5 |

### 1) 떼어 둔 것 (지우기 전, 식 그대로)

| 새 자리 | 담은 것 | 옛 자리 |
|---|---|---|
| `src/lib/readModel.ts`(새) | `RoutineBundle` `buildRoutineBundle` `dayTotalSets` `exerciseLabel` `settingValue` `pickActiveRoutine` `pickOpenSession` `DietReadModel` `buildDietData` `findPlan` `dietDayFor` | `useRoutine.ts` · `useDiet.ts` · `db/index.ts:74-133` |
| `src/lib/bannerQueue.ts` | `BANNER_DELOAD` `BANNER_BACKUP` `BANNER_PHASE` `BANNER_COMPENSATION` | `store/ui.ts:23-26` |
| `src/lib/diet.ts` 끝 | `parseTimeHint` `allSlots` `isTrainingOnlySlot` | `mealCalendar.ts` |
| 반쪽 파일 | `backup.ts` − `createBackup`·`restoreBackup`·`../db` import, `stripSecrets`에 `export`만 · `secrets.ts` − 토큰 함수 셋과 `PREFIX`·`GIST_TOKEN_KEY` · `db/seed.ts` − `SeedResult`·`ensureSeed`와 그것만 쓰던 import | |

`pickActiveRoutine`의 "기본키 순 첫 루틴"은 Dexie `toCollection().first()`(기본키 순)를 `id` 오름차순 정렬의 첫 원소로 옮겼다. `buildDietData`는 `useDiet`의 `?? fallback` 식을 그대로 쓴다(`settingValue`를 거치지 않는다 — PLAN대로).

### 2) 지운 것

화면·부품·앱 틀(`src/screens` `src/components` `src/ax` `src/store` `App.tsx` `main.tsx` `index.html` `public/`) · `src/db/index.ts` · `src/lib` 웹 전용 17(+테스트 `beep` `inputProps` `useRestTimer`) · `vite.config.ts` `tsconfig.app.json` `tsconfig.node.json` · 웹 검사 스크립트 6 + `scripts/lib/` + 웹 검사 테스트 17 · `docs/ASTRYX-INVENTORY.md` · dependencies 전부와 dev 8개(`knip.json`의 `ignoreDependencies`도). 안 지운 것: `docs/` 과거 기록·스크린샷, 뿌리 `PLAN-v1.1.md`.

설정: `tsconfig.json` 한 파일(`jsx`·PWA `types` 뺌, `types: ["vite/client"]`) · `src/vite-env.d.ts` 한 줄 · `package.json` `scripts`(`dev`·`build`·`preview` 지움, `typecheck` = `tsc --noEmit`) · `package-lock.json`(`npm install --package-lock-only`, `npm ci --dry-run` 통과) · `scripts/check.mjs`·`ci.yml`(`Astryx 뒷걸음`·`빌드`·`첫 화면 크기` 지움, `타입` 더함) · `eslint.config.js`(`jsx-a11y`만 지움) · `knip.json`(`entry`에 `src/lib/*.ts`·`src/db/*.ts`) · `eslint-suppressions.json`(`--prune-suppressions` — diff는 키 삭제·`count` 감소뿐, `+`줄 0) · `quality-allow.json`은 지울 항목이 없었다(`sourceScan`·`testFixtures` 둘 다 남는 테스트가 쓴다).

### 3) 테스트 정리 — 지운 이름 (파일 · 전 → 후 · 지운 이유)

규칙 줄은 PLAN VV2 3)의 표: 첫 줄 = 경로 배열 원소 빼기 · 기대 갱신 · 문장 지우기, R1 = 지우는 파일의 소스·CSS를 읽는다, R2 = 지우는 모듈의 함수·상수를 부른다, R3 = 브라우저·DOM·Dexie·localStorage 동작.

| 파일 | 전 → 후 | 지운 묶음 · 이유 |
|---|---|---|
| `scripts/{rr3 rr5-wrap rr7 rr8 rr9 rr10 rr11 ss0 ss2 ss3 ss4 ss5 ss6 ss7 ss8 ui-space ui-check-lib}.test.mjs` | 129 → 파일째 | 2) "웹 검사 테스트" — 지운 스크립트·화면·웹 CSS를 본다(R1) |
| `scripts/check.test.mjs` | 2 → 1 | "빌드와 첫 화면 크기만 --fast에서 빠진다" — 그 단계가 없다(첫 줄 규칙, PLAN 3)) |
| `src/components/NumberStepper.test.ts` | 9 → 파일째 | 지운 부품(R2) |
| `beep` · `useRestTimer` · `inputProps` `.test.ts` | 29 · 20 · 6 → 파일째 | 지운 웹 lib(R2). 6) 표가 v2.2로 넘기는 것(타이머 계산·소리 값)은 `git show WEB_FINAL:<경로>` |
| `mealCalendar.test.ts` → `dietSlots.test.ts` | 21 → 6 | `git mv`. 남김: 시각 파싱 3 · 슬롯 합집합 3. 지움: 기본 선택 3 · .ics 형식 9 · 텍스트 이스케이프 3(R2) |
| `audioIndependence` · `audioRecovery` · `guideFinish` | 8 · 16 · 8 → 파일째 | 소리 파일·`beep`·`components/*.tsx`(R1·R2) |
| `v117` · `v120` · `v121` · `v121ss7` · `v121ss8` | 21 · 118 · 56 · 7 · 3 → 파일째 | Astryx·화면·`ax` 소스, `chartTheme`·`sensoryDot`·`cellLabel`(R1·R2). `v120` 118개 중 하나("legacy 시트 목록이 비었다")는 통과했지만 `components/`가 비어 **헛돌며 통과**한 것이라 같이 지웠다 |
| `backupTime` | 15 → 8 | 리마인드 2·`GistPanel`·`ImportPanel`·`gistSync` 스캔 5(R1·R2). 남김: 로컬 시각 변환 6 · "UTC 날짜로 셌다면"(순수) · 시각 표시 `slice(0, 16)` 스캔(넓은 glob) |
| `bannerQueue` | 19 → 13 | 화면 배선 3 · 백업 미설정 3 — `HomeScreen` 소스(R1). 남김: 큐 순수 함수 전부·"미설정 상태는 큐에 들어가지 않는다" |
| `dayChoice` | 23 → 13 | AA1 4 · AA2 3 · EE3 3 — `/src/**/*.tsx`(R1) |
| `dietAccess` | 4 → 3 | "스캔이 실제로 참조를 찾는다" — `db.dietDays`를 쓰는 곳이 Dexie와 함께 사라졌다(R3). **표 밖 판단**(아래) |
| `dietBackup` | 12 → 5 | debounce 3(`gistSync`) · 백업 예약 지점 3(화면·`useDiet` 스캔) · 건너뛰기 1(`gistSync` 소스)(R1·R2). 남김: 백업 지문 5 |
| `gist.test` | 19 → 16 | 백업 리마인드 3(`gistSync.backupReminder` — 6) 표, v2.2) |
| `polish` | 19 → 2 | BB1 탭바·아이콘 6 · BB3 2 · BB5 3 · BB7 6 — 화면 소스·`__APP_VERSION__`·`chartTheme`(R1·R2). 남김: 정규식이 이모지·리터럴을 잡는다 2(순수) |
| `properties` | 10 → 9(+2) | `clampStep` · `sensoryDot` · `chartColor` 속성 3(3) "`properties.test.ts`" 줄, 6) 표 v2.2·v2.3) |
| `setRowState` | 15 → 11 | 화면 배선 4 — `ExerciseCard` 소스(R1) |
| `soundCancel` | 18 → 2 | CC2 8 · 경계음 5(`beep`) · 설정 미리 듣기 1 · 화면 배선 2(R1·R2). 남김: 글라이드 심볼 스캔 2(넓은 glob·순수) |
| `strengthWork` | 29 → 24 | 정규화 사본 2(`DietDayEditor` 예외 경로) · X1 식단 렌더 3(화면 소스)(R1). **표 밖 판단**(아래) |
| `tempo` | 48 → 43 | V1 종료 라벨 4(`TempoGuideSheet` 소스) · "템포 톤이 틱·차임 대역과 겹치지 않는다"(`beep.TICK`) |
| `timerOwnership` | 10 → 2 | 타이머 단일 소유 4 · 최소화 3 · 표시 두 곳 1(`App`·화면 소스)(R1) |
| `uiConsistency` | 19 → 3 | X6 2 · X8 2 · X9 2 · 캘린더 4 · AA3 식단 시트 3 · AA3 표기 1 · 기록 탭 2 — `/src/**/*.tsx`·`ax/parts.css`(R1). 남김: 주석 제거 · `NO_COMPENSATION` 값 · "표시 문구 사본이 diet.ts 하나뿐"(넓은 glob) |
| `v110` | 29 → 27 | 편집기·화면이 `pairedVariant`를 안 부른다 2(R1) |
| `v111` | 40 → 36 | GG1 `ExerciseCard` 칩 1 · GG2 `ExerciseCard`·`SessionScreen`·`HomeScreen` 스캔 3(R1) |
| `v112` | 67 → 66 | JJ3 `FinishSheet` 소스 스캔 1(R1) |
| `v113` | 105 → 101 | KK1 `HomeScreen` 1 · KK2 `ExerciseCard` 1 · KK3 `DayPickerSheet`·`HomeScreen` 2(R1) |
| `v115` | 50 → 45 | MM1 `useDiet` 1 · MM2 화면·`FoodLogSheet` 4(R1) |
| `v116` | 69 → 55 | NN1 `routineStore`·`seed` 2 · NN2 4 · NN3 3 · NN4 5(R1·R3). 표 기대 `v116:928·1157`이 여기 든다 |
| `v118` | 2 → 1 | PP2 `ax/index.tsx` Sheet(R1) |
| `v119` | 18 → 3 | QQ0 2 · QQ2 1 · QQ3 3 · QQ4 3 · QQ5 3 · QQ6 3(스크립트·`main.tsx`·`components`·`.tsx`)(R1). 남김: `useSheetDismiss` 이름 없음(넓은 glob) · `once` · 스캔 정규식 확인(순수) |
| `v18` | 85 → 66 | CC6 6(`useRestTimer` — v2.2) · 화면 배선 13(R1·R2) |
| `v19` | 60 → 54 | DD1 플랜 시트 1 · DD2 시드 이관 1(`ensureSeed`) · 편집기 훈련일 조작 2 · DD3 5-b 편집기 2(R1) |

합계: 전 1921 − 지운 630 + 더한 27 = 후 1318. 파일: 88 → 61(지운 파일 29 · 새 파일 2 · `mealCalendar` → `dietSlots`는 같은 파일로 센다).

### 4) 원소 빼기 · 기대 갱신 · 문장 지우기 (자리 표)

| 자리(후 줄) | 한 일 | 전 → 후 · 남은 경로 |
|---|---|---|
| `dietAccess.test.ts:28` | 원소 빼기 | `ALLOWED` `['/src/db/index.ts', '/src/lib/backup.ts', '/src/lib/useDiet.ts']` → `['/src/lib/backup.ts']` |
| `dietAccess.test.ts:57` | **기대 갱신** | `['/src/lib/useDiet.ts']` → `['/src/lib/readModel.ts']` |
| `strengthWork.test.ts:307-310` | **기대 갱신** | `derive`·`useDiet`·화면 셋(주석 줄 하나) → `['/src/lib/derive.ts', '/src/lib/readModel.ts']` |
| `strengthWork.test.ts:314-317` | 원소 빼기 | 근력 기준 판정 `for … of`에서 `'/src/lib/useDiet.ts'` 줄을 뺌 → `suggestNextDay.ts` · `dashboard.ts` |
| `v111.test.ts:609·710` | 원소 빼기 | glob `['/src/lib/*.ts', '/src/screens/*.tsx', '/src/components/*.tsx']` → `['/src/lib/*.ts']` |
| `v111.test.ts:618` | 원소 빼기 | `'/src/screens/SummaryScreen.tsx'` 뺌 → `prefill.ts` · `exportMarkdown.ts` |
| `v111.test.ts:626` | 원소 빼기 | `'/src/screens/SummaryScreen.tsx'` 뺌 → `exportMarkdown.ts` |
| `v1112.test.ts:222·226` | 원소 빼기 | glob·`for … of`에서 `'/src/components/DietDayEditor.tsx'` 뺌 → `exportMarkdown.ts` |
| `v113.test.ts:370` | 원소 빼기 | `HomeScreen.tsx` 뺌 → `sessionFactory.ts` · `lib/**` · `!lib/**/*.test.ts` |
| `v113.test.ts:649·654` | 원소 빼기 | `ExerciseCard.tsx`·`HomeScreen.tsx` 뺌 → `exportMarkdown.ts` · `setPlan.ts` / `for … of`는 `exportMarkdown.ts` |
| `v113.test.ts:755-760` | 원소 빼기(여러 줄 — 명령이 못 보는 자리) | `DayPickerSheet.tsx`·`HomeScreen.tsx` 줄 뺌 → `dayGap.ts` · `exportMarkdown.ts` |
| `v113.test.ts:909·915` | 원소 빼기 | `HomeScreen.tsx` 뺌 → `exportMarkdown.ts` · `progression.ts` / `for … of`는 `exportMarkdown.ts` |
| `v113.test.ts:920-922` | 문장 지우기 | `expect(count(src('/src/screens/HomeScreen.tsx'), 'dayGapNotice(')).toBe(1)` — 같은 `it`의 `sessionDayGapLine(` 문장이 남는다 |
| `v114.test.ts:357·454` | 원소 빼기 + `n` 줄임 | `SummaryScreen.tsx` 뺌 → `exportMarkdown.ts` · `history.ts` / `toHaveLength(3)` → `(2)` |
| `v114.test.ts:515` | 원소 빼기(**이름 배열**) | `['exportMarkdown.ts', 'HistoryScreen.tsx', 'SummaryScreen.tsx']` → `['exportMarkdown.ts']` — 경로가 아니라 파일 이름이라 아래 명령이 걸러 주지 못한다(그 밖의 줄 표) |
| `v115.test.ts:600` | 원소 빼기 | `'/src/components/DietDayEditor.tsx'` 뺌 → `exportMarkdown.ts` |
| `v19.test.ts:322-329` | 문장 지우기 | "스캔이 실제로 그 표현을 잡는다"의 마지막 `expect(editor()).not.toContain('diet-daytype')`(과 그 주석 줄)와 그것만 쓰던 `editor` 도우미 |
| `v116.test.ts:916-918` | 문장 지우기 | `routineStore.ts`를 읽는 `const store`·`expect` 둘 — 같은 `it`의 `진행 중인 세션을 마치거나` 스캔이 남는다 |

기대 표(`toEqual`·`toContain` 경로 18곳)의 나머지: "그대로" 7곳(`uiConsistency:207` `v112:520·524` `v113:387` `v114:512` `v116:902·921`)은 VV2 뒤 결과가 지금 기대와 같음을 실행으로 확인(통과), "지움" 9곳(`audioIndependence:47` `audioRecovery:235` `timerOwnership:39` `dietBackup:92` `strengthWork:395` `v116:928·1157` `v120:188·414`)은 위 3)의 파일째·묶음째 지움에 들어 있다. **실제 결과가 표와 달라 멈춘 곳은 없다.**

### 5) 과거 판정 불변 확인

**① 이름 집합** — `vitest --reporter=json`(전: 이 커밋 직전, 후: 이 커밋)의 `fullName` 개수 비교: **후에만 있거나 늘어난 이름 27개, 전부 VV2가 더한 것**(`VV2 …` 20 · `속성: 읽기 모델 (readModel — VV2) …` 2 · `헛도는 경로 막이 …` 5). 지운 이름은 위 3) 표.

**② 남긴 본문 불변** — PLAN의 명령(`d() { git diff -M --diff-filter=MR … }` · `comm -13`) 출력은 **49줄**(45 + 4)이고 전부 아래 분류에 든다:

| 줄 | 무엇 |
|---|---|
| 속성 줄 45 | `properties.test.ts`에 VV2가 더한 속성(`readModel — VV2` describe의 도우미·단언 — `properties.test.ts`를 빼고 돌리면 아래 4줄만 남는다) |
| `expect(Object.keys(ll3Sources)).toHaveLength(2)` | 3) 원소 빼기로 줄인 `toHaveLength(n)` |
| `expect(callers).toEqual(['/src/lib/readModel.ts'])` · `'/src/lib/readModel.ts',` | 3) 기대 표의 기대 갱신(`dietAccess:57` · `strengthWork:309`) |
| `for (const f of ['exportMarkdown.ts']) {` | **그 밖의 줄 1** — `v114.test.ts:515`. 경로가 아닌 파일 이름 배열의 원소 빼기라 명령의 `DEL` 정규식이 걸러 주지 못했다. 위 4) 표에 있다 |

빈 기대 `grep`(`toEqual([])`) → **빈 출력**(종료 코드 1).

**④ 골든 일곱** — 전후 JSON에서 `fullName`이 일곱 제목(`GG1 골든 (리팩터링 전 기준)` `JJ1 — 생성 불변 (골든)` `JJ2 — normal 불변 (골든)` `KK 골든` `LL0 골든 — v1.13 출력` `MM0 골든 — v1.14 출력 고정` `NN0 골든 — v1.15 출력 고정`)으로 시작하는 이름: 전 15 · 후 15, 차이 **빈 출력**. 골든 `it`은 어느 것도 규칙에 걸리지 않았다.

**⑥ 과거 판정 불변 표**(PLAN) — 판정·제안·내보내기·백업 형식의 로직 파일은 수정하지 않았다(`git diff --stat -- src/lib`의 코드 파일 변경: `bannerQueue.ts`(상수 4 이사) · `diet.ts`(끝에 함수 3 덧붙임) · `backup.ts`·`secrets.ts`(웹 쪽 함수 지움, `export` 한 단어) · `readModel.ts`(새)).

### 6) 결함 복원

| # | 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|---|
| ③ | `v116.test.ts`의 남긴 `it`에 `nn1Src("src/screens/HomeScreen.tsx")` 한 줄 | 헛도는 경로 막이 "리터럴" 실패 — `src/lib/v116.test.ts: src/screens/HomeScreen.tsx` | `cmp` 같음 · `git status` 같음 |
| ④ | `pickOpenSession`이 첫 번째 끝나지 않은 세션을 돌려줌 | 속성 "pickOpenSession은 배열 순서를 바꿔도 …" + `VV2 pickOpenSession 끝나지 않은 둘 중 …` | 〃 |
| ⑤a | 남긴 단언 한 줄 변경(`v1111.test.ts:58` `toBe('30')` → `toBe('31')`) | 남긴 본문 불변 명령이 그 줄을 출력(`>     expect(formatWeight(30)).toBe('31')`) | 〃 |
| ⑤b | `v111.test.ts:618` 배열에서 남는 원소 `exportMarkdown.ts`까지 뺌 | 같은 명령이 `>     for (const p of ['/src/lib/prefill.ts']) {` 출력 | 〃 |
| ⑤c | `dietAccess.test.ts:57`을 `toEqual([])`로 | 빈 기대 `grep`이 그 줄 출력 | 〃 |
| ⑤d | glob 배열에 웹 원소 `'/src/screens/HomeScreen.tsx'`를 남김(`v111.test.ts:609`) | 헛도는 경로 막이 "glob"·"리터럴" 둘 다 실패 | 〃 |

(③의 VV3 짝 — `v1111` glob을 옛 경로로 — 은 VV3.)

### 7) 변이 테스트 — `npm run mutation src/lib/readModel.ts` (새 파일. 옮기기만 한 파일 `bannerQueue`·`diet` 덧붙임 셋은 돌리지 않는다 — PLAN)

| 파일 | 점수 | 잡음 | 살아남음 |
|---|---|---|---|
| `src/lib/readModel.ts` | **92%** | 69 | 6 |

첫 실행은 89%·8건. 살아남은 `settingValue`의 `r.key === key`(`:58`)와 `findPlan`의 기본 플랜 갈래(`:135`)는 "다른 키의 행은 읽지 않는다" · "기본 플랜이 첫 번째가 아닐 때" 테스트를 더해 잡았다. 남은 6건:

| 줄 | 변이 | 남긴 이유 |
|---|---|---|
| `:70` | `if (activeId)` → `true` | 같다 — `activeId`가 `null`·`''`이면 `routines.find(r.id === activeId)`가 `undefined`라 같은 곳으로 떨어진다 |
| `:74` ×5 | 정렬 비교식의 `<`·`>`·삼항 | 같다 — 이 함수는 정렬 결과의 **첫 원소(최솟값)** 만 쓰고, 키(`id`)가 서로 다르면(기본키) V8 정렬은 `비교 > 0`만으로 자리를 정해 `-1`/`0` 변형이 같은 최솟값을 고른다. 모든 순열 테스트 + 속성이 최솟값을 본다 |

### 8) 검증 출력

- `npm run check`: 흔적 검사 · 린트 · 안 쓰는 파일·의존성 · 타입 · 테스트 **5단계 전부 통과**(0·2·1·1·2초). 린트는 "정리되지 않은 억제"로 실패하지 않는다.
- `npm test`: `Test Files  61 passed (61)` · `Tests  1318 passed (1318)`.
- `git ls-files src | sed 's#/[^/]*$##' | sort -u` → `src` `src/data` `src/db` `src/lib`.
- 헛도는 경로 막이 고정값(VV3에서 다시 센다): 템플릿으로 건너뛴 리터럴 **0** · glob 문자로 건너뛴 리터럴 **4** · 허용 목록 **0**.
- `package.json` `version` 1.21.0 그대로. 웹 배포 없음.

### 9) 표 밖 판단 — 리뷰어가 볼 것

PLAN 표가 정하지 않은 자리를 규칙의 문구대로 처리했다. 규칙이 갈리는 곳은 지움 쪽(헛도는 통과를 만들지 않는 쪽)을 골랐다.

| 자리 | 처리 | 이유 |
|---|---|---|
| `dietAccess.test.ts` "스캔이 실제로 참조를 찾는다" | 지움 | `db.dietDays`를 쓰는 곳이 Dexie와 함께 없어져 실패한다(R3). 같은 describe의 "db.dietDays를 허용된 파일에서만"(헛돌며 통과)과 "허용 목록의 파일이 존재"는 PLAN의 `ALLOWED` 원소 빼기가 전제하므로 남겼다 |
| `strengthWork.test.ts` "훈련일 정규화 사본을 두지 않는다" · "등록된 예외가 실제로 그 형태를 갖고 있다" | 지움 | 이 둘의 검사 대상(`DietDayEditor` 예외·`useDiet` 제외 경로)이 웹 파일뿐이다(R1). `NORMALIZE_ALLOWED`와 그 주석도 같이 |
| `v19.test.ts` "시드가 그 이관을 실제로 한다" | 지움 | `seed.ts`의 `successorOf(`·`defaultDietPlanId`는 `ensureSeed`(지운 함수) 안에 있었다(R2) |
| `v116.test.ts` "NN1 seed.ts의 activeRoutineId: BUNDLED_ROUTINE.id는 …" | 지움 | 같은 이유(`ensureSeed`). `shouldResetActiveRoutine`은 `seed.ts`에 남아 있고 다른 NN1 테스트가 본다 |
| `polish`·`soundCancel`·`uiConsistency`·`v119`의 순수 자기 확인 `it`("검사가 실제로 …를 잡는다" 등) | **남김** | 문자열만 다루고 지운 것을 읽지 않는다 — "위에 안 걸리면 남긴다". 짝 `it`이 지워져 의미는 줄었지만 본문은 그대로다. 그 `it`만 쓰던 도우미(`tsx` glob·`file`·`versionLine`·`TSX` …)는 지웠다 |
| README "내보내기" 절 | `navigator.share` 문단만 지움, 제목·Markdown 예시·`다음:` 설명은 남김 | PLAN은 "절을 지운다(`navigator.share` — 네이티브 공유는 v2.3)"인데 그 절의 예시는 내보내기 **형식**이라 코어에 그대로 남는다 |
| `scripts/check.mjs`의 `slow` 단계 장치 | 남김(머리 설명만 고침) | 지금은 `slow` 단계가 없지만 VV4가 번들 단계를 더한다 |

### 10) 하지 않은 것

- `README.md` "Tech Stack"·"프로젝트 구조"·"Getting Started"의 웹 서술은 그대로(VV4 "README 반영"이 고친다. PLAN VV2 "README 반영"의 일곱 줄만 했다).
- `docs/DESIGN.md` 9절(Astryx 우선)·`CLAUDE.md`·`agents/` 문서의 웹 서술 — VV9(규칙 정비).
- `WEB_FINAL` 태그 — 이 레포에 아직 없다(지휘자의 PR 1 머지 직전 확인 항목).

## VV3. 코어 이사와 경계 검사

배포 영향: **웹(Pages)은 바뀌지 않는다.** 파일 이사와 검사 도구뿐이다.

### 범위

| 항목 | 내용 |
|---|---|
| 커밋 | 이 커밋(VV3). `git rev-list --count main..HEAD` → 3 (VV1 · VV2 · VV3) |
| 이사 (`git mv`) | `src/lib/*` 95개(테스트 포함) · `src/types.ts` · `src/db/{seed,validateRoutine,validateDietPlan}.ts` → `src/core/`. `src/lib`·`src/db`는 없어졌다. 다시-내보내기 없음. 내용 변경은 import 경로·glob·경로 리터럴뿐 |
| 새 파일 | `scripts/boundary.mjs` · `scripts/boundary.test.mjs`(31개) |
| 고친 설정·도구 | `scripts/check.mjs` `STEPS`에 `경계`(흔적 검사 다음) · `.github/workflows/ci.yml` 같은 자리 · `scripts/mutation.mjs`(`isTarget`·`git diff` 경로·안내) · `stryker.config.json` · `knip.json`(`src/core/*.ts`만 — `src/db`는 없다) · `scripts/quality-allow.json` · `eslint-suppressions.json` 키 5개 · `scripts/quality-scan.mjs`(`stripComments`에 `export`만) · `README.md` |
| 테스트 | 이사분 61 파일 / 1318 테스트 — VV3 전후 같다. 새 `boundary.test.mjs` 1 파일 / 31 테스트가 더해져 `npm test` → **62 파일 / 1349 테스트** |
| 사람 필요 경로 | `.github/workflows/ci.yml`(경계 단계) · `scripts/check.mjs`(같은 단계) · `src/db/**`(남은 셋을 코어로) · `lib/backup.ts`·`gist*`·`secrets.ts`(경로만 옮김, 동작 무변경) — PLAN이 정한 그대로 |

### 1) 경계 검사

`checkCore(files)` — 코어 파일의 import 지정자(`import … from` · `export … from` · `import()` · `require()` · 부수효과 `import 'x'`)는 상대 경로이고 풀면 `src/core/` 안, 또는 `src/data/`의 `.json`만. 테스트는 `vitest`·`fast-check` 추가. 테스트 아닌 파일은 금지 전역(`window` `document` `navigator` `localStorage` `sessionStorage` `indexedDB` `AudioContext` `webkitAudioContext` `URL.createObjectURL` `import.meta` `__APP_VERSION__`)도 막는다. 지정자는 원문, 전역은 `stripComments`한 글에서 찾는다.

표 밖 판단: 정규식 리터럴 안의 글(`v113.test.ts:1043`의 `/… from '\.\/derive'/`)이 import로 읽혀 거짓 위반이 났다. 이스케이프(`\`)가 든 지정자는 실제 import가 아니므로 건너뛴다(`boundary.mjs`에 주석). 코어 파일 내용은 고치지 않았다.

```
$ node scripts/boundary.mjs --check; echo $?
경계 검사: src/core 99개 파일, 위반 0
0
```

| PLAN 검증 항목 | 테스트 (`scripts/boundary.test.mjs`) |
|---|---|
| `react`·`../db/schema`·`../platform/secureToken`·`expo-sqlite`·`dexie`·`@astryxdesign/core` 위반 / `./derive`·`../data/exercises.json` 통과 / `../data/x.ts` 위반 | `boundary: import 허용 목록 › '%s' → 위반 %i건` (9줄) |
| 테스트의 `vitest`·`fast-check` 통과 / 테스트 아닌 파일의 `vitest` 위반 | `테스트의 'vitest'·'fast-check'는 통과, …` |
| `await import('react-native')` 위반 | `export … from · await import('…') · require('…') · 부수효과 import 전부 본다` |
| `window.addEventListener` 위반 | `window.addEventListener는 위반` |
| 주석 안 "window"·문자열 `'document'` 통과 | `주석 안 "window"와 문자열 'document'는 통과` |
| `typeof document` 위반 | `typeof document는 위반` |
| `import.meta.glob` 위반(테스트 아닌 파일) | `import.meta.glob은 테스트 아닌 파일에서 위반, 테스트에서는 통과` |
| 지금 `src/core` 위반 0 | `boundary: 지금 레포 › src/core 전체에 위반 0 — 종료 코드 0` |
| `check.test.mjs` ci.yml = STEPS | 기존 `ci.yml의 run 단계가 STEPS와 같은 명령, 같은 순서다` 통과 |
| `fetch`·`crypto`·`Intl`·`structuredClone` 안 막음 (설계) | `fetch·crypto·Intl·structuredClone은 막지 않는다` |

### 2) 과거 판정 불변 확인 — 이름 그대로

`C` 대신 스테이징한 VV3 변경(`git diff -M --cached HEAD`)으로 PLAN 명령을 돌렸다(새 `boundary.test.mjs`는 옮긴 테스트가 아니라 뺐다).

① `diff <(d - cat) <(d + cat)` 출력 — 정렬 순서만 맞춘 기대 목록 한 줄과 머리 주석 한 줄:
```
33a34  > expect(norm(hits)).toEqual(["src/~/derive.ts", "src/~/routineEdit.ts", "src/~/types.ts", "src/~/validateRoutine.ts"])
35d35  < expect(norm(hits)).toEqual(["src/~/validateRoutine.ts", "src/~/derive.ts", "src/~/routineEdit.ts", "src/~/types.ts"])
78c78  < // scripts/mutation.mjs — 변이 테스트 대상을 src/lib의 코드로만 …   > … src/core의 코드로만 …
```
② `diff <(d - srt) <(d + srt)` 출력 — 정렬만 바뀐 `v116.test.ts:902`는 사라지고 **머리 주석 한 줄(`scripts/mutation.test.mjs:1`)만 남는다.** PLAN은 ②가 비어야 한다고 했으나, 이 줄은 코드가 아니라 경로 글(`src/lib의`)이고 정규화 규칙(`src/lib/`)이 끝의 `/` 없는 글을 못 본다. 판정 코드의 변화는 아니다(리뷰어가 볼 것).

①에 나온 줄: `v116.test.ts:902` (`src/db/validateRoutine.ts`가 맨 앞 → 정렬하면 맨 뒤) · `mutation.test.mjs:1`(머리 주석).

- 전후 테스트 수: 이사분 61/1318 → 61/1318 (새 `boundary.test.mjs` 31개 더해 62/1349).
- 골든 일곱(VV2 3)): import 줄 말고 한 글자도 안 고쳤고 통과(`npm test` 통과).
- 헛도는 경로 막이 통과, 건너뛴 수 단언을 다시 센 값: `SKIPPED_TEMPLATE` 0 · `SKIPPED_GLOB_CHARS` 4 · 허용 목록 0 — **VV2 고정값과 같다**(상수를 안 고쳤고 단언이 통과).
- `test-paths.test.mjs`(수정표 밖, 기계적 결과): 막이가 실제 파일을 보는 단위 테스트 `검사가 실제로 죽은 glob·리터럴을 잡는다`의 `src/lib/x.test.ts`·`/src/lib/**` 예시가 옮긴 뒤엔 `src/core`여야 한다.
- `git ls-files src | sed 's#/[^/]*$##' | sort -u` → `src` · `src/core` · `src/data`.

### 3) 결함 복원

| # | 되살린 결함 | 실패한 것 | 원상복구 |
|---|---|---|---|
| ① | `src/core/derive.ts` 끝에 `import '../db/schema'` | `boundary --check` 종료 코드 **1**, `src/core/derive.ts:265 — 허용되지 않는 import '../db/schema'` | `cmp` 같음 |
| ② | `src/core/dates.ts` 끝에 `localStorage.getItem('x')` | `src/core/dates.ts:194 — 금지된 전역 localStorage`, 종료 코드 1 | `cmp` 같음 |
| ③a | `v1111.test.ts:134` glob을 `/src/lib/exportMarkdown.ts`로 | `test-paths` 막이(glob) 실패 — `src/core/v1111.test.ts: /src/lib/exportMarkdown.ts` (리터럴 막이도 같이) | `cmp` 같음 |
| ③b | `v21.test.ts`에 `"src/screens/HomeScreen.tsx"` 리터럴 | 막이(리터럴) 실패 — `src/core/v21.test.ts: src/screens/HomeScreen.tsx` | `cmp` 같음 |
| ④ | `mutation.mjs` `isTarget`을 `src/lib`로 되돌림 | `mutation.test.mjs` 1건 실패(`src/core/setPlan.ts → true`) | `cmp` 같음 |

복원 뒤 `git status`에 의도 밖 변경 없음.

### 4) 변이 테스트

대상 없음 — VV3은 `src/core` 파일 내용을 안 바꿨다(경로만). `readModel.ts`는 VV2에서 돌렸고(위 VV2 7절) 옮기기만 했다. `scripts/mutation.mjs`는 `isTarget` 경로만 바뀌었고 `mutation.test.mjs`가 잠근다.

### 5) 실행 결과

- `npm run check` → 흔적 검사·경계·린트·knip·타입·테스트 전부 통과
- `npm test` → `Test Files  62 passed (62)` · `Tests  1349 passed (1349)`
- `npm run lint -- --prune-suppressions` → `eslint-suppressions.json` 키 5개만 이름이 바뀜(`src/lib/` → `src/core/`), 개수 그대로, 새 항목 없음
- 빌드 단계는 PR 1에 없다(STEPS에 타입이 대신). `git rev-list --count main..HEAD` → 3

### 6) 하지 않은 것

코어 파일 내용 수정 · `knip.json` `entry`에서 `src/core/*.ts` 걷기(v2.3 끝) · 버전 상향(1.21.0 그대로) · `scripts/*.test.mjs`의 `src/lib` 가짜 경로 예시 고치기(`quality-scan.test.mjs` 등은 파일 시스템을 안 읽는 입력 문자열이다).
