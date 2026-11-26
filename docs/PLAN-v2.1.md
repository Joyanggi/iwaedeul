# PLAN v2.1 — 네이티브 앱의 골격: 코어 분리 · SQLite · Gist 가져오기 · 테마 두 벌 · 홈 (VV)

> 작성: Claude Opus 5.5 (설계자), 2026-11-26. 대상 코드: v1.21.0 (`main` `8404be8`).
> 검토 반영: 1라운드(`.reports/v2.1-review.md`, 검토 커밋 `67cb468`) — 끝의 "검토 반영 기록".
> 근거: `docs/PLAN-v2.0.md` 10절 v2.1 행(골격), 3·4.1·7·11·15·17절. 지휘자 지시(2026-11-26):
> ① Expo 앱 생성 ② `src/core` 분리와 경계 검사(Astryx 뒷걸음 검사 자리에) ③ SQLite(expo-sqlite + Drizzle) 스키마
> ④ **파일 가져오기 대신 Gist에서 가져오기**(PAT, `expo-secure-store`) ⑤ 테마 토큰 라이트·다크 한 벌 ⑥ 홈 화면 하나.
>
> **끝났다의 뜻**(PLAN v2.0 10절 그대로): 아이폰에서 앱이 뜨고, 웹 기록이 **수치가 같게** 들어오고, 홈이 라이트·다크 모두 읽힌다.
>
> **성격**: 웹앱은 이 라운드에서 **동작이 하나도 바뀌지 않는다**(VV1은 파일 자리만 옮긴다). 네이티브 앱은
> **웹 기록의 읽기 전용 사본**이다 — 세션 기록·쓰기는 v2.2부터다. Dexie 스키마·백업 `SCHEMA_VERSION`(3)은 그대로다.
>
> **PLAN v2.0과 달라진 것 (사람 지시, 2026-11-26)**
> - 4.2의 "내보내기 JSON → 파일 선택으로 가져오기"를 **Gist 백업을 PAT로 읽어 오기**로 바꾼다. 형식은 같다(`createBackup`이 올린 파일).
> - 13절 6번(웹 내리는 시점 "2주 연속 뒤")은 **바로 전환**으로 닫혔다. 전환일에 한 번 더 가져오고, 그날부터 웹은 쓰지 않는다(아래 "데이터 이전").
> - 4.2 3번 "두 앱을 한동안 같이 쓴다"는 v2.1~v2.2 사이에만 해당한다 — 그동안 네이티브는 보기만 한다.

---

## 설계자가 정한 것 (지시가 맡긴 갈림길)

| 갈림길 | 정한 것 | 택하지 않은 것과 이유 |
|---|---|---|
| 네이티브 앱의 자리 | **레포 안 `native/` 폴더 — 자기 `package.json`·잠금 파일을 가진 Expo 프로젝트.** 코어는 `src/core`에 하나만 두고 웹(Vite)과 네이티브(Metro)가 같이 읽는다 | 레포 뿌리를 Expo로: 웹(react-dom 19.3·Vite·PWA)과 Expo가 고정하는 React·RN 버전이 한 `package.json`에서 부딪힌다. 웹은 전환일까지 매일 쓰는 앱이라 그 의존성을 흔들 수 없다 · 코어를 npm 패키지로: 배포·버전 관리가 하나 더 생긴다. PLAN v2.0 15절의 최종 모양(`src/app` 등)은 **웹을 내리는 v2.5에서 `native/`를 뿌리로 올려** 맞춘다 |
| v2.1의 46개 중 못 가는 것 | 실측 **8개**(지시는 7개). `use*` 훅이 5개가 아니라 **6개**다 — `usePwaUpdate`(PWA 전용 `virtual:pwa-register`)가 더 있다. `bannerQueue`는 상수만 옮기면 코어로 **간다**. 나머지 7개는 `src/lib`에 남는다(VV1 표) | 훅을 코어용으로 다시 쓰기: 훅은 Dexie 구독 그 자체라 다시 쓸 것이 없다. **훅 안의 순수 조각**(읽기 정규화)만 `core/readModel.ts`로 뺀다 — 웹 훅과 네이티브가 같은 정규화를 부른다(판정은 한 곳에서) |
| 순수하지만 웹 전용인 3개 | `mealCalendar`(식사 알림 — PLAN v2.0 9절 "옮기지 않는다") · `inputProps`(HTML 입력 속성 — 네이티브는 `TextInput` 속성) · `sourceScan`(웹 소스를 읽는 테스트 도우미)은 `src/lib`에 남긴다 | 코어로: 네이티브가 영영 안 쓰는 것을 공유 코어가 들고 다닌다 |
| 화면 구조 | **Expo Router 스택 두 장**: 홈(`index`) + 가져오기(`import`, 시트로 뜬다). **탭바는 아직 없다** | 탭 4개를 지금: 홈 말고는 빈 탭이라 막다른 길만 늘어난다. 탭은 다음 화면이 생기는 v2.2에서 |
| 홈이 하는 일 | **읽기 전용.** 웹 홈의 판정·표시를 그대로 보이되, 기록을 만들거나 바꾸는 동작(시작·Day 변경·디로드로 시작·Phase 전환)은 없다. 기기에 쓰지 않는 동작(복귀 적용/안 함, 알림 "나중에", 알림 펼치기, 제안 근거 펼치기)은 있다 | 시작 버튼을 두고 막아 두기: 눌리지 않는 주 동작은 고장처럼 보인다 |
| 가져오기의 의미 | 웹 `restoreBackup`과 같은 **전체 교체**. 한 트랜잭션 안에서 넣고 → 다시 읽어 → 재고 → **다르면 되돌린다**(기기는 가져오기 전 그대로) | 병합: 웹이 원천이고 네이티브가 사본이라 합칠 것이 없다 · 넣은 뒤 재기만: "다르다"가 보여도 이미 바뀐 뒤다 |
| Gist를 어떻게 찾나 | **토큰만 받는다.** `GET /gists`에서 `workout-tracker-backup.json` 파일을 가진 gist 중 가장 최근에 고친 것을 쓴다 | gist id도 입력받기: 웹 설정에 들어가 id를 복사해야 하고, 폰에서 긴 hex를 옮기는 일이 실수의 자리다 |
| SQLite 행의 규칙 | **모든 테이블 = 기본키 + (승격 열) + `body`(원래 객체 전체 JSON).** 읽기는 `body`만 쓴다. 승격 열은 `body`에서 **한 함수**가 만든다 | 승격 열에서 객체를 다시 조립: 열과 JSON 두 곳이 같은 사실을 말하게 되고, `settings`의 값 없는 행(`{key}`)처럼 열로 옮기면 모양이 바뀌는 것이 생긴다 |
| 네이티브 테스트 | **vitest(node) + `better-sqlite3`** — 같은 Drizzle 스키마·같은 마이그레이션 파일을 메모리 SQLite에 올려 가져오기를 돌린다. 화면 테스트(RNTL)·E2E(Maestro)는 v2.2 | jest-expo + RNTL을 지금: v2.1 화면은 입력이 거의 없어 기기 검증으로 충분하고, 러너가 둘(vitest·jest)이 되는 비용을 아직 낼 이유가 없다 |
| 테마 값의 출처 | 뿌리의 **생성 스크립트** `scripts/native-tokens.mjs`가 설치된 Astryx 패키지에서 값을 읽어 `native/src/ui/palette.generated.ts`를 쓴다. 다크 처방 3개(PLAN v2.0 7절)와 앱 강조색(`src/ax/theme.ts`)은 스크립트 안에 **팔레트 단계**로 적는다 | 손으로 옮겨 적기: hex 사본은 출처를 잃는다(RELIABILITY R12 "토큰 사본에 hex를 적지 않는다") |
| 앱 `name` | Expo `name`은 **`iwaedeul`**(ASCII), 홈 화면 글자 **이왜들**은 `ios.infoPlist.CFBundleDisplayName`으로 준다 | `name: "이왜들"`: prebuild가 `name`으로 Xcode 프로젝트·타깃 이름을 만들고 비ASCII는 지워지거나 경로 문제를 낸다. 보이는 글자는 DisplayName이 정한다 |
| Xcode 서명 팀 | `app.config.ts`가 `process.env.APPLE_TEAM_ID`를 `ios.appleTeamId`로 넣는다. 값은 `native/.env.local`(커밋 안 함) | 팀 id를 커밋: public 레포에 개인 식별값을 남길 이유가 없다 · Xcode에서 손으로 고르기: `ios/`는 prebuild가 다시 만들어 선택이 지워진다 |
| `ios/`·`android/` | **커밋하지 않는다**(CNG — `npx expo prebuild`가 매번 만든다). `native/.gitignore` | 커밋: 설정이 `app.config.ts`와 `ios/` 두 곳에 갈라진다 |
| 매일 쓰는 설치본 | **Release 구성**으로 굽는다(`npx expo run:ios --device --configuration Release`) — JS가 앱 안에 들어가 Metro 없이 뜬다. 개발·검증은 Debug 개발 클라이언트 + Metro | Debug만: 맥북이 꺼져 있으면 폰 앱이 안 뜬다. 무료 계정 설치 한도(3개)라 둘을 같이 깔지 않는다 — 같은 번들 ID라 서로 덮는다 |

---

## 작업 개요

| ID | 내용 | PR | 웹이 바뀌나 |
|---|---|---|---|
| VV1 | `src/core` 분리 + 코어 경계 검사(Astryx 뒷걸음 검사 자리) | **PR 1** | 파일 자리만. 동작·번들 같음 |
| VV2 | Expo 앱 생성(`native/`) · 식별자 · 코어 연결 · 검사 묶음에 네이티브 추가 | PR 2 | 아니오(검사 스크립트·설정만) |
| VV3 | SQLite 스키마(Drizzle) · 행 변환 · 가져오기 엔진 · 기록 합계·지문 | PR 2 | 아니오(코어에 순수 함수 추가) |
| VV4 | Gist 찾기(`findBackupGist`) · 가져오기 화면 · 토큰은 Keychain | PR 2 | 아니오 |
| VV5 | 테마 토큰 라이트·다크 한 벌 + `ui` 부품 | PR 2 | 아니오 |
| VV6 | 네이티브 홈 화면 · `docs/FEATURE-MAP.md` | PR 2 | 아니오 |
| VV7 | 규칙 문서 사실 맞추기(`CLAUDE.md`·`agents/*`) — **규칙 정비자 몫** | PR R | 아니오(문서만) |

PR 1을 따로 내는 이유: `main`에 머지되면 **지금 쓰는 웹앱이 다시 배포된다.** 웹을 건드리는 유일한 작업이라 혼자 리뷰받고 혼자 되돌릴 수 있어야 한다.

---

## VV1. `src/core` 분리와 코어 경계 검사

### 진단

- `src/lib` 57개 중 브라우저 API를 쓰는 것은 11개(PLAN v2.0 3절)이고, 나머지 46개 중에서도 **8개는 코어에 못 간다**(실측, import 문 기준):

  | 파일 | 막는 import | 지시의 7개에 |
  |---|---|---|
  | `useDiet` `useExerciseSettings` `useRoutine` `useRoutineEditContext` | `dexie-react-hooks`, `../db` | 있음 |
  | `useSessionEditor` | `react`, `../db`, `../components/ExerciseCard` | 있음 |
  | `usePwaUpdate` | `virtual:pwa-register/react` | **빠져 있었다** |
  | `routineStore` | `../db/index`, `../db/seed`, `./gistSync` | 있음 |
  | `bannerQueue` | `../store/ui` (`BANNER_*` 상수 4개만) | 있음 — 방향이 거꾸로였을 뿐이다 |

- 코어 파일들이 `../types`(`src/types.ts`)·`../db/seed`(번들 상수)·`../db/validateRoutine`·`../db/validateDietPlan`을 읽는다. `seed.ts`는 Dexie를 import하고(`src/db/seed.ts:7`), 두 검증 파일은 순수하다(`validateRoutine.ts:1`, `validateDietPlan.ts:1-2`).
- 네이티브가 가져오기에 쓸 **순수한 절반**이 플랫폼 파일 안에 섞여 있다: `backup.ts`의 `parseBackup`·`fingerprintPayload`·`summarizeBackup`(Dexie를 쓰는 것은 `createBackup`·`restoreBackup`뿐, `backup.ts:118,259`), `secrets.ts`의 `isSecretSettingKey`(localStorage를 쓰는 것은 토큰 읽기·쓰기뿐), `gist.ts`는 전역 `fetch`만 쓴다.
- 읽기 정규화가 Dexie 훅 안에 있다: `useDiet`가 `resolveTrainingDays`로 훈련일을 고치고(`useDiet.ts:58-63`), `getActiveRoutine`이 활성 루틴을 고르고(`db/index.ts:115`), `getOpenSession`이 진행 중 세션을 고른다(`db/index.ts:125` — 웹 홈은 이것을 직접 부르지 않고 `useSessionStore`(`HomeScreen.tsx:75`)를 읽는데, 그 store가 부팅 때 `getOpenSession`으로 채운다(`store/session.ts:87`). 규칙은 같다). 네이티브가 이걸 **따로 쓰면** 같은 기록에서 홈이 다른 답을 낸다.
- 테스트가 `import.meta.glob('/src/lib/exportMarkdown.ts', …)`처럼 **경로 문자열로** 파일을 읽는다(`v1111.test.ts:134`, `v113.test.ts:1055`, `phaseGate.test.ts:118`의 `/src/lib/*.ts` 등). 파일을 옮기면 glob이 빈 객체를 돌려주고, "없어야 한다"를 검사하는 테스트는 **헛돌며 통과한다**.
- glob 인자만이 아니다. 테스트 **본문**에도 `'/src/lib/…'`·`'src/lib/…'` 경로 문자열이 114줄(23개 파일, glob 호출 줄 제외) 있다 — 소스 맵 키·허용 목록·기대 목록. 그중 `?? ''`로 읽는 도우미(`v116.test.ts:653` `nn1Src`, `v117.test.ts:15-16`, `audioRecovery.test.ts:239`)는 넓은 glob(`/src/**/*.{ts,tsx}`)이 옮긴 뒤에도 맞으므로 glob 막이로는 안 잡히고, 키만 틀려 **빈 글을 검사하며 통과한다**(예: `v116.test.ts:906`·`:912-913`의 `.not.toMatch`·`.not.toContain`).

### 설계

**1) 옮길 것 (`git mv`, 내용은 import 경로만)**

| 어디서 | → `src/core/` | 수 |
|---|---|---|
| `src/lib/` | `analysis` `bGroupGuide` `bannerQueue` `cardio` `compensation` `compensationWatch` `dashboard` `dates` `dayChange` `dayChoice` `dayGap` `derive` `diet` `dietOps` `exportMarkdown` `foods` `history` `korean` `noteHistory` `once` `pain` `phaseReadiness` `pr` `prefill` `progression` `routineEdit` `sessionFactory` `sessionOps` `setPlan` `setRowState` `substitute` `suggestNextDay` `tapJudge` `tempo` `testFixtures` `weightScale` | 36 |
| `src/types.ts` | `types.ts` | 1 |
| `src/db/` | `validateRoutine.ts` `validateDietPlan.ts` | 2 |
| `src/lib/gist.ts` | `gist.ts` (전역 `fetch`만 쓴다 — 웹·RN 둘 다 있다) | 1 |

`src/data/`(시드 JSON)는 그 자리에 둔다 — 코어가 읽어도 되는 유일한 바깥이다.

**2) 쪼갤 것 (순수한 절반을 코어로, 나머지는 원래 파일이 코어를 import)**

| 새 코어 파일 | 담는 것 (옛 자리) | 남는 쪽 |
|---|---|---|
| `core/seedData.ts` | `BUNDLED_EXERCISES` `BUNDLED_ROUTINE` `BUNDLED_DIET_REVISION` `BUNDLED_DIET_PLANS` `shouldResetActiveRoutine` (`db/seed.ts:11-35`) | `db/seed.ts`: `SeedResult`·`ensureSeed` |
| `core/secretKeys.ts` | `SECRET_SETTING_KEYS` `isSecretSettingKey` (`lib/secrets.ts:17-23`) | `lib/secrets.ts`: `getGistToken`·`setGistToken`·`maskToken` |
| `core/backupFormat.ts` | `SCHEMA_VERSION` `APP_ID` `BackupFile` `repairLegacyRoutine` `stripSecrets` `SYNC_BOOKKEEPING_KEYS` `fingerprintPayload` `BackupSummary` `summarizeBackup` `parseBackup` (`lib/backup.ts:36-243`) | `lib/backup.ts`: `createBackup`·`restoreBackup` |
| `core/readModel.ts` | `RoutineBundle` + **`buildRoutineBundle(routine, exercises)`** · **`pickActiveRoutine(routines, activeId)`**(`getActiveRoutine`의 규칙: 저장된 id가 있으면 그것, 없거나 깨졌으면 기본키 순 첫 루틴) · **`pickOpenSession(sessions)`**(`getOpenSession`의 규칙) · **`settingValue(rows, key, fallback)`** · **`buildDietData({ plans, rawDays, settings, sessions })`**(`useDiet`의 조립과 `resolveTrainingDays` 정규화 — `loading`은 빼고) · `findPlan` · `dietDayFor` (`useDiet.ts`) · `dayTotalSets` · `exerciseLabel` (`useRoutine.ts`) | 훅은 Dexie에서 행을 읽어 이 함수에 넘기기만 한다. `getActiveRoutine`은 `routines` 전체(수 건)를 읽어 `pickActiveRoutine`을, `getOpenSession`은 `pickOpenSession`을 부른다. `DietData`는 `DietReadModel & { loading }` |
| `core/bannerQueue.ts` (옮긴 파일) | `BANNER_DELOAD` `BANNER_BACKUP` `BANNER_PHASE` `BANNER_COMPENSATION` 상수를 `store/ui.ts:23-26`에서 이 파일로 | `store/ui.ts`가 코어에서 import |

**3) 남는 7개의 자리**: `useDiet` `useExerciseSettings` `useRoutine` `useRoutineEditContext` `useSessionEditor` `usePwaUpdate` `routineStore`는 **`src/lib`에 그대로** — 웹 전용 Dexie·PWA 접착제이고, 웹과 함께 v2.5에 지워진다. 네이티브의 같은 자리는 `native/src/db`(읽기)와 v2.2 이후의 쓰기 경로다. 웹 전용 순수 3개(`mealCalendar` `inputProps` `sourceScan`)와 플랫폼 11개도 `src/lib`에 남는다.

**4) 경로 고치기 규칙**
- 다시-내보내기 파일(`export * from '../core/…'`)을 옛 자리에 **남기지 않는다.** 모든 import를 새 경로로 고친다(`src/screens`·`src/components`·`src/ax`·`src/store`·`src/db`·`src/lib`·`src/App.tsx`). 같은 모듈에 길이 둘이면 경계 검사가 무엇을 막는지 흐려진다.
- `import.meta.glob`·`?raw`의 경로 문자열: 옮긴 파일을 가리키면 `/src/core/…`로, 디렉터리 glob `/src/lib/*.ts`는 `['/src/lib/*.ts', '/src/core/*.ts']`로 넓힌다.
- **테스트 본문의 경로 문자열 리터럴**(`'/src/…'`·`'src/…'` — 소스 맵 키, 허용 목록, 기대 목록)도 옮긴 파일을 가리키면 새 경로로 고친다. 기대 목록은 고친 뒤 정렬 순서가 바뀌면 순서만 맞춘다(항목을 더하거나 빼지 않는다).
- `eslint-suppressions.json`의 `src/lib/backup.ts` 항목(`no-unused-vars` 1 — `fingerprintPayload`의 `exportedAt: _ignored`)은 코드와 함께 `src/core/backupFormat.ts` 키로 옮긴다. 새 억제를 더하지 않는다.
- 뒤따라 고칠 설정: `stryker.config.json` `mutate`에 `src/core/**/*.ts`(테스트 제외) · `scripts/mutation.mjs`의 대상 판정(`isTarget`, `:21`)과 **바뀐 파일을 고르는 `git diff … -- 'src/lib'`(`:63`)** 둘 다 `src/core`를 더하고, 안내 글(`:8-9`·`:68`)도 같이 고친다 · `scripts/quality-allow.json` `testSupport`의 `src/lib/testFixtures.ts` → `src/core/testFixtures.ts`.

**5) 테스트를 옮기는 규칙** (정본은 규칙, 목록은 설계자 실측)
테스트 파일은 **고친 뒤의 import가 전부 `src/core`·`src/data`·`vitest`·`fast-check`이고 `import.meta.glob`·`?raw`·`vi.mock`을 쓰지 않으면** `src/core`로 옮긴다. 아니면 `src/lib`에 두고 import 경로만 고친다.
실측 목록(21개): `analysis` `bGroupGuide` `compensation` `compensationWatch` `dashboard` `diet` `dietExport` `dietOps` `export` `finishAndStart` `history` `inverseWeight` `phaseReadiness` `pr` `prefill` `sessionOps` `substitute` `substituteCoverage` `suggestNextDay` `warmup` `weightScale` (`.test.ts`). 규칙과 목록이 다르면 규칙을 따르고 DEV-RECORD에 적는다. `properties.test.ts`는 `../ax`·`../screens`를 읽어 `src/lib`에 남는다(DESIGNER·IMPLEMENTER 규칙이 가리키는 자리 그대로).

**6) 코어 경계 검사** — `scripts/core-boundary.mjs` (+ `scripts/core-boundary.test.mjs`)
- 순수 함수 `checkCore(files: {path, text}[]): {path, line, kind, detail}[]`와, `src/core/**/*.ts`를 읽어 부르는 `main`(`--check`면 위반 시 종료 코드 1, 위반마다 `경로:줄 — 무엇 — 고치는 법` 한 줄).
- **허용 목록 방식**(금지 목록이 아니다 — 새 라이브러리가 생겨도 기본이 막힘이다):

  | 대상 | 허용되는 import 지정자 |
  |---|---|
  | 코어의 모든 파일 | 상대 경로이고 **풀어 보면 `src/core/` 안**이거나, **`src/data/`의 `.json`** |
  | 테스트 파일(`*.test.ts`)만 추가로 | `vitest`, `fast-check` |

  `import … from`, `export … from`, `import(…)`, `require(…)` 전부 본다(지정자는 원문에서, 아래 전역은 주석·문자열을 지운 글에서 찾는다 — `quality-scan.mjs`의 `stripComments`와 같은 규칙).
- **금지 전역**(테스트 아닌 코어 파일): `window` `document` `navigator` `localStorage` `sessionStorage` `indexedDB` `AudioContext` `webkitAudioContext` `URL.createObjectURL` `import.meta`(Vite 전용 `glob`·`env` 포함) `__APP_VERSION__`. `fetch`·`crypto`·`Intl`·`structuredClone`은 막지 않는다(아래 "Hermes에서 확인할 전역").
- `scripts/check.mjs` `STEPS`의 `{ name: 'Astryx 뒷걸음', cmd: 'node scripts/astryx-inventory.mjs --check' }`를 **`{ name: '코어 경계', cmd: 'node scripts/core-boundary.mjs --check' }`로 바꾼다**(같은 자리, 같은 순서). `.github/workflows/ci.yml`도 같은 줄을 바꾼다. `astryx-inventory.mjs`·`docs/ASTRYX-INVENTORY.md`는 지우지 않는다(`ss0`·`ss4`·`ss5` 테스트가 스크립트 글을 읽는다, 손으로 돌릴 수는 있다) — 웹과 함께 v2.5에 지운다.
- **헛도는 경로 막이** — `scripts/vv1-paths.test.mjs`에 메타 테스트 둘(`node:fs`를 쓰므로 `scripts/`에 둔다 — `src` 아래 테스트는 `tsconfig.app.json`이 node 타입 없이 빌드에서 타입 검사한다):
  - glob: `src`·`scripts` 아래 테스트 파일의 `import.meta.glob(…)` 첫 인자 리터럴(문자열 또는 문자열 배열)을 전부 모아, 각 패턴이 **실제 파일 하나 이상과 맞는지** `node:fs`로 확인한다.
  - 경로 리터럴: 같은 테스트 파일들에서 `src/` 또는 `/src/`로 시작하고 `.ts`·`.tsx`·`.mjs`·`.css`·`.json`으로 끝나는 문자열 리터럴(작은·큰따옴표, 그리고 `${`가 없는 백틱)을 전부 모아, 각 경로가 **실제 파일인지** `node:fs`로 확인한다. 일부러 없는 파일을 가리키는 리터럴(지워진 파일이 다시 생기지 않았는지 보는 테스트 등)은 메타 테스트 안의 허용 목록에 `경로 — 이유`로 적는다.
  - 둘 다 템플릿 문자열(`${…}`)이 든 것은 건너뛰고 **건너뛴 수와 허용 목록의 길이를 단언한다**(구현자가 지금 수를 세어 고정 — 새로 생기면 테스트가 알린다).

**7) 문서 사실 맞추기** — **VV1에서 하지 않는다.** `CLAUDE.md`·`agents/**`는 규칙 정비자 몫이고(`agents/RULES-KEEPER.md` 첫 줄) REVIEW.md 3절의 사람 필요 경로다. VV7로 뗐다.

### Hermes에서 확인할 전역 (기록만 — 이번에 고치지 않는다)

| 코어가 쓰는 전역 | 어디서 | 네이티브 v2.1이 부르나 | 할 일 |
|---|---|---|---|
| `crypto.randomUUID()` | `sessionFactory.ts:127`, `routineEdit.ts:184` | 아니오(세션·루틴을 만들지 않는다) | **Hermes에 없다.** v2.2가 세션을 만들기 전에 `native/src/platform`에서 `expo-crypto`로 채운다 — v2.2 PLAN의 입력 |
| `structuredClone` | `routineEdit.ts:68,95` | 아니오 | v2.3(루틴 편집) 전에 기기에서 확인 |
| `Number#toLocaleString` | `diet.ts:605`(`formatPlanLabel` — `BUNDLED_DIET_PLANS`가 **모듈을 읽을 때** 부른다) | 예(가져오기가 `seedData`를 읽는다) | VV2 실기기 확인: 앱이 뜨면 통과(없으면 쉼표 없이 나올 뿐 죽지 않는다) |

### 정렬 동점의 순서 의존 (기록만 — 이번에 고치지 않는다)

| 규칙 | 어디서 | 동점이면 | 할 일 |
|---|---|---|---|
| 진행 중 세션 = `startedAt` 내림차순 첫 번째 | `db/index.ts:126-129` → `pickOpenSession` | 입력 순서(안정 정렬)를 따른다 | 지금 웹과 같은 동작. 아래 속성의 생성기는 `startedAt`을 세션마다 다르게 만든다 |
| 끝난 세션 = `date`·`startedAt` 내림차순 | `derive.ts:24-28` `completedSessions` (`compensationWatch.ts:43`·`dashboard.ts:373`이 기댄다) | 입력 순서를 따른다 | 같음. 같은 `startedAt`의 두 세션은 실제 기록에서 생기지 않는다(시작 시각이 ms까지 같아야 한다). 고치면 판정 내용이 바뀌므로 이번 범위가 아니다 |

### 검증 (`src/lib/v21.test.ts` describe `VV1`, `scripts/core-boundary.test.mjs`, `scripts/vv1-paths.test.mjs`)

- `checkCore`: `import { useState } from 'react'` → 위반 / `from '../db'` → 위반 / `from '../store/ui'` → 위반 / `from '../lib/beep'`(상대 경로지만 코어 밖) → 위반 / `from 'expo-sqlite'` → 위반 / `from 'dexie'` → 위반 / `from '@astryxdesign/core'` → 위반 / `from './derive'` → 통과 / `from '../data/exercises.json'` → 통과 / `from '../data/x.ts'` → 위반(JSON만) / 테스트 파일의 `from 'vitest'`·`'fast-check'` → 통과 / 테스트 아닌 파일의 `from 'vitest'` → 위반 / `await import('react-native')` → 위반 / `window.addEventListener` → 위반 / 주석 안의 "window" → 통과 / 문자열 `'document'` → 통과 / `typeof document` → 위반 / `import.meta.glob` → 위반.
- `checkCore`를 지금 `src/core` 전체에 돌리면 위반 0 (`node scripts/core-boundary.mjs --check; echo $?` → `0`, 출력 복사).
- `scripts/check.test.mjs`: 기존 두 단언이 그대로 통과한다(STEPS와 ci.yml이 같은 자리에서 같이 바뀌었다).
- 헛도는 경로 막이: 지금 모든 glob 리터럴과 경로 리터럴이 파일과 맞는다(허용 목록 제외). **결함 복원**: `v1111.test.ts`의 glob 경로를 옛 `/src/lib/exportMarkdown.ts`로 되돌리면 glob 쪽이, `v116.test.ts`의 `nn1Src("src/core/derive.ts")`를 옛 `"src/lib/derive.ts"`로 되돌리면 경로 리터럴 쪽이 실패한다.
- `readModel` 동등: `pickActiveRoutine` — 활성 id가 있고 존재 / 활성 id가 없음 / 활성 id가 지워진 루틴 / 루틴 0개 → `undefined`. `pickOpenSession` — 끝나지 않은 세션 둘 중 `startedAt`이 늦은 것 / 전부 끝남 → `undefined`. `buildDietData` — 옛 플랜을 쓰는 날의 `isTrainingDay`가 근력 세션 날짜로 고쳐진다(`resolveTrainingDays`가 하던 것), 유산소만 한 날은 휴식일로 남는다.
- **속성** (`src/lib/properties.test.ts`에 더한다): `pickOpenSession`은 세션 배열의 순서를 바꿔도 같은 세션을 고른다 · `pickActiveRoutine`은 루틴 배열의 순서를 바꿔도 같은 루틴을 고른다(기본키 순 첫 루틴 규칙이 순서가 아니라 id로 정해진다). **생성기는 세션 `startedAt`·루틴 `id`를 서로 다르게 만든다**(동점은 위 "정렬 동점" 표 — 지금 웹 동작이고 이 속성의 대상이 아니다).
- **이름 그대로**: 옮긴 테스트와 남은 테스트의 diff는 import 줄·glob 경로 줄·경로 리터럴 줄뿐이다 — `git diff -M main..HEAD -- '*.test.ts' | grep -E '^[-+][^-+]' | grep -vE "^[-+]\s*(import |\} from )|import\.meta\.glob|['\"\`]/?src/"`의 출력이 비어 있다(복사). 남는 줄이 있으면 줄마다 무엇인지(여러 줄 import 묶음 안의 이름 줄 등) DEV-RECORD에 적는다.
- 테스트 개수: VV1 전후 `npm test 2>&1 | tail -5`의 파일 수·테스트 수가 같다(+ VV1이 더한 새 테스트 수만큼). 두 출력을 DEV-RECORD에 복사.
- 웹 번들: `node scripts/first-load.mjs --check` 전후 숫자를 복사한다. 늘어나지 않는다(옮김만이라 같아야 한다 — 다르면 이유를 적는다).

### 범위 제외
- 코어 파일의 **내용** 수정(이름·시그니처 변경, 정리) — 옮김과 섞으면 diff가 읽히지 않는다.
- `mealCalendar`의 `allSlots`·`isTrainingOnlySlot`·`parseTimeHint`를 `diet.ts`로 옮기기(PLAN v2.0 9절) — 쓰는 네이티브 식단 화면이 v2.3이다.
- `crypto.randomUUID` 채우기 — v2.2.
- 웹 화면의 Astryx 규칙 문서(`docs/DESIGN.md` 9절) 개정 — 웹을 새로 짓지 않으므로 그대로 둔다.
- Astryx 뒷걸음 검사를 웹 PR용으로 따로 남기기 — PR 1 뒤로 웹 PR은 이 검사 없이 나간다. v2.2가 웹 Gist 자동 업로드를 끄는 한 줄 배포를 고르면(아래 "데이터 이전" 4) 그 PR도 그렇다. 화면이 아닌 한 줄이라 막을 것이 없다.

### README 반영
- "프로젝트 구조"의 `lib/` 줄을 둘로: `core/ 판정·계산·타입·백업 형식 — 웹과 네이티브가 같이 쓴다. react·expo·DB·store를 import하지 않는다(코어 경계 검사)` · `lib/ 웹 전용 — Dexie 훅, 소리, 공유, Gist 동기화`.
- 같은 절 끝 문단의 "`lib/`의 순수 함수로" → "`core/`의 순수 함수로".

---

## VV2. Expo 앱 생성과 코어 연결

### 진단
- 네이티브 앱이 없다. PLAN v2.0 17절의 식별자가 정해져 있다: 이름 `이왜들`, 번들 ID·안드로이드 applicationId `com.joyanggi.iwaedeul`, slug `iwaedeul`, scheme `iwaedeul`.
- 무료 Apple 계정이라 빌드는 맥북 Xcode다(PLAN v2.0 11.2-A). 번들 ID를 이것저것 바꾸면 7일 App ID 10개 한도를 먹는다.
- 뿌리 검사가 `native/`를 모르면: 뿌리 `vitest`가 `native/**/*.test.ts`를 집어 RN import에서 터지고, `eslint .`가 `native/ios` 생성물까지 읽는다.

### 설계

**1) 만들기**: `npx create-expo-app@latest native` (그때의 **최신 안정 SDK**, Expo Router 들어 있는 기본 템플릿). 예제 화면·예제 부품·예제 이미지는 지운다. SDK 번호와 React·RN 버전은 DEV-RECORD 첫 줄에 적는다(기억으로 적지 않고 `npx expo --version`·`package.json`에서).

**2) `native/` 구성**

```
native/
  package.json          name "iwaedeul", version "2.1.0", private
                        scripts: start · ios · typecheck(tsc --noEmit) · test(vitest run) · db:generate(drizzle-kit generate)
  app.config.ts         아래 표
  metro.config.js       watchFolders에 ../src (코어·시드 JSON), resolver.sourceExts에 'sql'
  babel.config.js       babel-preset-expo + inline-import(.sql — Drizzle 마이그레이션)
  tsconfig.json         extends expo/tsconfig.base, strict, paths "@core/*" → "../src/core/*",
                        include src/**, ../src/core/**, ../src/data/*.json · exclude ../src/core/**/*.test.ts
  vitest.config.ts      environment node, alias @core → ../src/core
  drizzle.config.ts     dialect sqlite, driver expo, schema src/db/schema.ts, out drizzle
  drizzle/              drizzle-kit가 만든 마이그레이션(.sql, meta/, migrations.js) — 손으로 고치지 않는다
  .gitignore            node_modules · ios · android · .expo · .env*.local · *.db
  src/
    app/                Expo Router — _layout.tsx · index.tsx(홈) · import.tsx(가져오기)
    db/                 schema · client · rows · importBackup · readAll (VV3)
    platform/           secureToken.ts (VV4) — expo-* 네이티브 모듈을 부르는 곳
    ui/                 palette.generated.ts · theme.ts · 부품 (VV5)
    home/               homeModel.ts(순수) · 홈 구역 부품 (VV6)
```

네이티브 코드는 코어를 **`@core/…`로만** import한다(`../../src/core/…` 상대 경로 금지 — 한 길로 둔다). 웹 쪽 `src/lib`·`src/db`·`src/store`·`src/ax`는 import하지 않는다(VV2 검증의 스캔이 막는다).

**3) `app.config.ts`**

| 키 | 값 |
|---|---|
| `name` | `iwaedeul` |
| `slug` | `iwaedeul` |
| `scheme` | `iwaedeul` |
| `version` | `2.1.0` |
| `orientation` | `portrait` |
| `userInterfaceStyle` | **`automatic`** — 이게 `light`면 `useColorScheme()`이 늘 라이트를 돌려줘 다크가 영영 안 뜬다 |
| `ios.bundleIdentifier` | `com.joyanggi.iwaedeul` |
| `ios.supportsTablet` | `false` |
| `ios.infoPlist.CFBundleDisplayName` | `이왜들` |
| `ios.appleTeamId` | `process.env.APPLE_TEAM_ID` (없으면 키를 넣지 않는다) |
| `android.package` | `com.joyanggi.iwaedeul` |
| `plugins` | `expo-router`, `expo-sqlite`, `expo-secure-store` (템플릿이 넣는 것 외에) |
| 아이콘·스플래시 | 템플릿 기본값 그대로(v2.5) |

**4) 의존성** (`npx expo install`로 SDK에 맞는 버전): `expo-sqlite` · `expo-secure-store` · `expo-dev-client` · `@react-native-segmented-control/segmented-control` · `drizzle-orm`. dev: `drizzle-kit` · `babel-plugin-inline-import` · `vitest` · `better-sqlite3` · `@types/better-sqlite3` · `fast-check`.

**5) 뿌리 검사에 넣기**

| 어디 | 바꿈 |
|---|---|
| `vite.config.ts` | `test.exclude`에 `native/**` (vitest 기본 제외 목록에 더한다) |
| `eslint.config.js` | `ignores`에 `native/ios` `native/android` `native/.expo` `native/drizzle` · `files: ['native/src/**/*.{ts,tsx}']` 블록: `react-hooks` 권장 규칙(`jsx-a11y`는 웹 DOM 규칙이라 넣지 않는다) |
| `scripts/check.mjs` `STEPS` | `테스트` 뒤에 `{ name: '네이티브 타입', cmd: 'npm --prefix native run typecheck' }`, `{ name: '네이티브 테스트', cmd: 'npm --prefix native test' }` |
| `.github/workflows/ci.yml` | `npm ci` 다음 줄 `npm ci --prefix native`, 위 두 단계를 같은 자리에. `setup-node`의 `cache-dependency-path`에 `package-lock.json`·`native/package-lock.json` |
| `scripts/check.test.mjs` | `ciRuns` 거르기를 `c !== 'npm ci'` → `!/^npm ci\b/.test(c)`로(설치 줄이 둘이 됐다). **이 프로젝트에서 이번에 고치는 유일한 기존 테스트**이고 이유는 이 줄이다 |
| `scripts/quality-scan.mjs` | 지금 검사(`src`+`scripts`)는 그대로 두고, **두 번째 검사**를 `native/src` + `src/core` 묶음에 돌려 결과를 합친다 — 같은 `scan`·`ciFailures`. 중복 정의는 이 묶음 안에서만 센다(웹 `src/ax`의 `Card`·`Banner`와 네이티브 `ui`가 같은 이름인 것은 중복이 아니다). 네이티브가 코어 함수를 베껴 쓰면 여기서 막힌다. `src/core`는 두 검사에 다 들어가므로 같은 실패 줄은 한 번만 낸다 |

knip은 `native/`를 보지 않는다(뿌리 `project`가 `src/**`·`scripts/**`) — 네이티브 쪽 안 쓰는 파일 검사는 v2.5에 뿌리를 옮길 때.

**6) 첫 실행 화면**: VV2 커밋 시점에는 `app/index.tsx`가 제목 한 줄(`이왜들`)과 코어 함수 하나를 부른 결과(`todayLocal()`)를 보이는 자리표시다 — **Metro가 `../src/core`를 실제로 묶는다**는 증거. VV6이 홈으로 바꾼다.

### 검증
- `npm --prefix native run typecheck` 통과, `npm --prefix native test` 통과(VV2 시점에는 아래 스캔 테스트 하나).
- `native/src/boundary.test.ts`: `native/src/**/*.{ts,tsx}`의 import 지정자 중 `../`로 시작해 `native/` 밖으로 나가는 것이 0개, `@core/`가 아닌 길로 `src/core`를 가리키는 것이 0개.
- 뿌리 `npm test`가 `native/` 테스트를 돌리지 않는다(뿌리 출력의 테스트 파일 수가 VV1 끝과 같다).
- `npm run check` 표에 `코어 경계`·`네이티브 타입`·`네이티브 테스트`가 보이고 전부 통과(표 복사).
- **실기기**(verify-device 1절): `npx expo run:ios --device <UDID>` 성공 → 아이폰 홈 화면에 **`이왜들`** 아이콘 → 실행하면 자리표시 화면에 오늘 날짜. mobile MCP `mobile_list_apps`에 `com.joyanggi.iwaedeul`(출력 복사), 스크린샷 `docs/screenshots/v2.1/device/boot-light.png`.

### 범위 제외
- 탭바, 아이콘·스플래시, 안드로이드 빌드(v2.5), EAS(유료 가입 뒤), OTA.
- 커밋 검증 도장(PLAN v2.0 11.5) — 단계가 정해지지 않았고 훅(`agent-guard`)을 바꾸는 하네스 일이다. 규칙 정비자 몫으로 남긴다.

### README 반영
- "Tech Stack"에 한 줄: `네이티브(전환 중): Expo · Expo Router · expo-sqlite + Drizzle · expo-secure-store — native/`.
- "프로젝트 구조"에 `native/  Expo 앱 (v2.1~, 전환 중). 코어는 @core로 src/core를 읽는다` 한 줄.

---

## VV3. SQLite 스키마와 가져오기 엔진

### 진단
- PLAN v2.0 4.1: 일곱 테이블 그대로(`routines` `exercises` `sessions` `settings` `exerciseNotes` `dietPlans` `dietDays`), 세션 중첩은 JSON, 쿼리에 쓰는 값만 열로 + 인덱스.
- 웹 행에는 열로 옮기면 모양이 바뀌는 것이 있다: `settings`의 값 없는 행(`db/index.ts:101` 주석 "undefined를 put하면 값이 undefined인 row가 남아 백업에 실린다") — 열 `value`에 넣으면 `NULL`이 되어 읽을 때 `{key, value: null}`로 바뀐다.
- "같다"를 보이려면 잴 함수가 **웹과 네이티브에서 같아야** 한다 — 코어에 둔다.

### 설계

**1) 스키마** — `native/src/db/schema.ts` (Drizzle `sqliteTable`)

| 테이블 | 기본키 | 승격 열 | 인덱스 | `body` |
|---|---|---|---|---|
| `routines` | `id` text | — | — | `RoutineTemplate` |
| `exercises` | `id` text | — | — | `Exercise` |
| `sessions` | `id` text | `date` text not null · `day_id` text not null · `routine_id` text not null · `mode` text not null · `started_at` text not null · `ended_at` text null | `sessions_date` (`date`) · `sessions_day_date` (`day_id`, `date`) | `Session` |
| `settings` | `key` text | — | — | `SettingRow` (행 전체 — `{key}`만 있는 행도 그대로) |
| `exercise_notes` | `record_key` text | — | — | `ExerciseSetting` |
| `diet_plans` | `id` text | — | — | `DietPlan` |
| `diet_days` | `date` text | — | (기본키가 날짜 범위 조회를 맡는다) | `DietDay` |

- `body`는 `text('body', { mode: 'json' }).$type<…>().notNull()`. **읽기는 `body`만 쓴다.**
- 마이그레이션: `npm --prefix native run db:generate`가 만든 `drizzle/0000_*.sql` 하나. 앱은 `useMigrations`(`drizzle-orm/expo-sqlite/migrator`)로, 테스트는 `migrate`(`drizzle-orm/better-sqlite3/migrator`)로 **같은 폴더**를 올린다.
- 승격 열을 지금 만드는 이유: v2.1 홈은 웹과 똑같이 세션 전체를 읽는다(RELIABILITY R17 — 늘리지 않는다). 열과 인덱스는 v2.2~의 기록 달력·기간 조회가 쓴다. 나중에 열을 더하면 마이그레이션이 하나 더 생긴다 — 원천 테이블을 처음 만들 때 넣는 것이 싸다(PLAN v2.0 1절 ⑥).

**2) 행 변환** — `native/src/db/rows.ts` (**유일한 쓰기 변환**)
- `sessionRow(s: Session)` → `{ id, date, dayId, routineId, mode, startedAt, endedAt: s.endedAt ?? null, body: s }`. 승격 열은 여기서만 만든다.
- 나머지 여섯 테이블도 `xxxRow(obj)` 하나씩(기본키 + `body`).

**3) 다시 읽기** — `native/src/db/readAll.ts`
- `readAllTables(db): BackupTables` — 일곱 테이블을 **기본키 오름차순**(Dexie `toArray()`와 같은 순서)으로 읽어 `body` 배열로. `BackupTables`는 `BackupFile`에서 `app`·`schemaVersion`·`exportedAt`을 뺀 것(코어 `backupFormat.ts`에 타입으로 둔다).

**4) 재기 — 코어** (`src/core/recordTotals.ts`, `src/core/backupFormat.ts`에 더함)
- `recordTotals(t: BackupTables): RecordTotals` →
  `{ sessions, sets, volumeKg, dietDays, routines, exercises, settings, exerciseNotes, dietPlans }`
  - `sessions` = 세션 행 수(진행 중 포함), `sets` = Σ `totalDoneSets(s)`(워밍업 포함, 진행 중 포함), `volumeKg` = Σ `totalVolume(s)`(**제외 없이** — 분석 탭의 어시스티드 제외 볼륨과 다를 수 있다. 이 값은 대조용이다), `dietDays` = 식단 기록 행 수, 나머지는 행 수.
- `toTables(file: BackupFile): BackupTables` — `app`·`schemaVersion`·`exportedAt`을 빼고, 옛 백업에 없는 `exerciseNotes`·`dietPlans`·`dietDays`를 `[]`로 채운다(웹 `restoreBackup`의 `?? []`와 같다). **재기와 지문은 늘 `toTables`를 거친 값에 한다** — 안 그러면 v1·v2 백업이 "없음 vs 빈 배열"로 거짓 불일치를 낸다.
- `sortTables(t)` — 각 테이블을 기본키로 정렬(`<` 비교). `contentDigest(t: BackupTables)` = `sortTables(t)`에서 `settings`의 동기화 부기 키를 빼고(`fingerprintPayload`와 같은 `SYNC_BOOKKEEPING_KEYS` — 거르는 식을 함수 하나로 빼서 둘이 같이 쓴다) `JSON.stringify`한 문자열. 해시하지 않는다(비교만 하므로 SHA가 필요 없다 — 웹 `lastBackupHash`와 무관).
- `SYNC_BOOKKEEPING_KEYS`에 `'nativeImport'`를 더한다(아래 5의 기기 부기 키). 웹에는 이 키가 없어 웹 지문은 그대로다.

**5) 가져오기 엔진** — `native/src/db/importBackup.ts`
```ts
type AppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>   // expo-sqlite·better-sqlite3 둘 다 'sync'
type ImportOutcome =
  | { ok: true;  before: RecordTotals; after: RecordTotals }
  | { ok: false; reason: 'mismatch'; before: RecordTotals; after: RecordTotals; digestMatch: boolean }
  | { ok: false; reason: 'error'; message: string }      // 트랜잭션 안의 예외(제약 위반·디스크 오류)
function importBackup(db: AppDb, file: BackupFile, now: Date): ImportOutcome   // 던지지 않는다
```
순서(한 `db.transaction` 안, 동기):
1. `want = sortTables(toTables(file))`에서 `settings`의 비밀 키 행을 뺀 것. `before = recordTotals(want)`, `wantDigest = contentDigest(want)`. (`want`를 기본키 순으로 정렬해 두는 이유: `after`는 SQLite 기본키 순으로 읽은 값이라, `volumeKg`의 부동소수 합이 더하는 순서에 기대지 않게 한다.)
2. 일곱 테이블 `delete`.
3. `want`를 행 변환으로 `insert` — 100행씩 끊어서(SQLite 바인드 변수 한도).
   비밀 키(`isSecretSettingKey`) 행은 1에서 이미 빠졌다(웹 `restoreBackup`과 같은 겹 — RELIABILITY R3).
4. `back = readAllTables(tx)`, `after = recordTotals(back)`, `digestMatch = contentDigest(back) === wantDigest`.
5. `before`와 `after`가 **아홉 칸 모두 같고**(`Object.is`) `digestMatch`면 → `settings`에 `{ key: 'nativeImport', value: { exportedAt: file.exportedAt, importedAt: now.toISOString() } }`를 넣고 커밋 → `ok: true`.
   아니면 `tx.rollback()` → `ok: false, reason: 'mismatch'`(기기는 가져오기 전 그대로).
- **예외 갈래**: `parseBackup`은 세션의 `id`·`date`·`entries`만 본다(`backup.ts:221-232`). 그래서 파일 안의 기본키 중복이나 승격 열 `not null`(`day_id`·`routine_id`·`mode`·`started_at`)이 빠진 세션은 파싱을 통과하고 `insert`에서 던진다(웹 `restoreBackup`은 `bulkPut`이라 받아들인다). 트랜잭션은 롤백되고 예외가 밖으로 나온다 — 엔진이 잡아 `reason: 'error'`로 돌려준다. 엔진은 **던지지 않는다**.
- 구현 모양(Drizzle): `tx.rollback()`은 `TransactionRollbackError`를 던지고 그 예외가 `db.transaction(…)` 밖으로 나온다. 그래서 `before`·`after`·`digestMatch`는 클로저 **밖** 변수에 담고, 바깥 `try/catch`에서 `TransactionRollbackError`면 `mismatch`, 그 밖의 예외면 `error`(`message` = `String(e.message ?? e)`)로 나눈다.
- 입력은 **이미 `parseBackup`을 통과한 파일**이다(VV4가 부른다). 엔진은 파싱하지 않는다.

### 검증 (`native/src/db/importBackup.test.ts` — better-sqlite3 메모리 DB에 같은 마이그레이션)
- 픽스처: 코어 `testFixtures`로 세션 3건(끝난 것 2 + 진행 중 1, 워밍업·어시스티드 종목 포함), 식단 기록 2일, 값 없는 `settings` 행 `{ key: 'legacyEmpty' }` 하나, 한글·이모지 문자열, 소수 무게(2.5·1.25)를 담은 `BackupFile`.
- 가져오면 `ok: true`, `before`와 `after`가 같고, `readAllTables`의 `settings`에 `{ key: 'legacyEmpty' }`가 **`value` 키 없이** 남는다.
- `dietPlans`·`dietDays`·`exerciseNotes`가 없는 옛(v1) 백업 → `ok: true`, 세 테이블이 비어 있다.
- 두 번 가져와도 `readAllTables` 결과가 같다(`nativeImport` 행의 `importedAt`만 다르다 — 그 행을 빼고 비교).
- 모든 `sessions` 행에서 승격 열 6개가 `body`의 같은 필드와 같다(`ended_at`은 진행 중이면 `NULL`).
- `settings`에 `gistToken` 행이 든 파일 → 들어가지 않는다, 가져오기는 `ok: true`.
- **되돌리기**: 먼저 픽스처 A를 넣고, 세트 무게가 `NaN`인 파일 B(JSON 왕복에서 `null`이 된다)를 가져오면 `ok: false, reason: 'mismatch'`, `before.volumeKg`는 `NaN`·`after.volumeKg`는 수, 그리고 `readAllTables`가 **A 그대로**다.
- **예외**: 픽스처 A를 넣은 뒤 ① `id`가 같은 세션 두 건을 담은 파일 ② `startedAt`이 없는 세션을 담은 파일을 가져오면 각각 `ok: false, reason: 'error'`이고 예외가 밖으로 나오지 않으며, `readAllTables`가 **A 그대로**다.
- 인덱스가 있다: `PRAGMA index_list('sessions')`에 `sessions_date`·`sessions_day_date`.
- **차등**(PLAN v2.0 11.1 ② — 코어가 한 벌이라 "웹 코어 vs 네이티브 코어"는 같은 파일이다. 남는 차이는 **저장소 왕복**이다): 픽스처를 가져와 다시 읽은 표와 원래 표에 대해 `suggestNextDay`·`progressionSuggestions`(마지막 끝난 세션)·`weeklyVolume`·`e1rm` 최댓값·`phaseReadiness`의 결과가 `toEqual`로 같다.
- **속성**:
  - (`native`) 임의의 `BackupTables`(fast-check — 세션 0~20, 세트 무게는 0.25의 배수, 설정 값은 `undefined`·`null`·수·문자열·중첩 객체) → 가져와 다시 읽으면 `contentDigest`가 같다.
  - (`src/lib/properties.test.ts`) `recordTotals`·`contentDigest`는 테이블 안 행 순서를 섞어도 같다 · 서로 다른 id의 두 세션 묶음 A·B에서 `recordTotals(A∪B)`의 `sessions`·`sets`·`volumeKg`는 A와 B의 합이다(무게가 0.25의 배수라 부동소수 오차가 없다) · 세트 하나의 `reps`를 바꾸면 `contentDigest`가 바뀐다.

### 범위 제외
- 쓰기 API(`setSetting` 등) — v2.1은 가져오기 말고 쓰지 않는다. v2.2가 만들 때 `isSecretSettingKey` 거부를 같이 옮긴다(R3 세 겹).
- `sync_ledger`(PLAN v2.0 4.3) — v2.4.
- `CardioRecord`에 시각 더하기(PLAN v2.0 1절 ⑩) — `body` JSON의 필드 추가라 스키마 마이그레이션이 필요 없다. 입력하는 화면이 생기는 v2.2에서.
- 번들 시드 넣기(`ensureSeed`의 네이티브판) — v2.1은 가져온 기록만 보인다. 빈 기기의 첫 실행은 v2.2(네이티브가 원천이 될 때).

### README 반영
- "핵심 설계 결정"에 새 절 `### 네이티브 앱 (v2.1~, 전환 중)`을 만들고 첫 두 줄:
  - **SQLite 행은 기본키 + 승격 열 + 원래 객체(JSON) 하나다.** 판정 함수가 세션 객체를 통째로 받으므로 정규화하지 않는다. 읽기는 JSON만 쓰고, 승격 열(`sessions`의 날짜·Day·시각)은 한 변환 함수가 JSON에서 만든다 — 같은 사실이 두 곳에서 갈라지지 않게.
  - **가져오기는 넣고 다시 읽어 잰 뒤 다르면 되돌린다.** 세션·세트·총 볼륨·식단 일수와 테이블별 행 수, 그리고 내용 지문(웹 `fingerprintPayload`)이 백업과 같아야 커밋된다. "들어갔다"가 아니라 "같다"가 조건이다.

---

## VV4. Gist에서 가져오기 (화면 · 토큰 · Gist 찾기)

### 진단
- 웹은 Gist에 `workout-tracker-backup.json` 하나를 올린다(`gist.ts:13`). gist id는 웹 `settings`의 `gistId`에만 있어 폰으로 옮기기 번거롭다.
- `readGist`가 1MB에서 잘린 응답을 `raw_url`로 다시 받는다(`gist.ts:154-176`, RELIABILITY R4) — 이 경로를 그대로 써야 한다.
- 토큰: 웹은 `localStorage`. 네이티브는 Keychain(PLAN v2.0 1절 ⑦ — v2.4 항목이지만 가져오기가 v2.1이라 **토큰 저장만 앞당긴다**).

### 설계

**1) Gist 찾기 — 코어** (`src/core/gist.ts`에 더함)
```ts
interface BackupGist { id: string; updatedAt: string }
function findBackupGist(token: string): Promise<BackupGist>
```
`GET /gists?per_page=100` → `files`에 `GIST_FILENAME`이 있는 것 중 `updated_at`이 가장 늦은 것. 없으면 `GistError('…', 'notFound')`. 오류 분류(`auth`·`scope`·`rateLimit`·`network`)는 기존 `send`·`toError`를 그대로 쓴다. 한 쪽(100개)만 본다 — gist가 100개를 넘으면 못 찾을 수 있다고 DEV-RECORD 제약에 적는다.

**2) 토큰 — `native/src/platform/secureToken.ts`**
`getGistToken(): Promise<string | null>` · `setGistToken(t: string): Promise<void>` · `clearGistToken()` — `expo-secure-store`, 키 `gistToken`, `keychainAccessible: AFTER_FIRST_UNLOCK`. SQLite에는 절대 넣지 않는다(`settings`에 쓰는 길이 가져오기뿐이고, 가져오기가 비밀 키를 거른다).

**3) 흐름** — `native/src/app/import.tsx`의 처리 함수(`runImport`)
1. 토큰: 입력칸 값, 비었으면 저장된 토큰.
2. `findBackupGist(token)` → `readGist(token, id)` → `parseBackup(content)`. 문제가 있으면 문제 목록을 보이고 멈춘다(기기 그대로).
3. **성공적으로 받은 뒤에만** 토큰을 Keychain에 저장한다(틀린 토큰이 저장되지 않게).
4. 기기에 세션이 1건 이상이면 확인(`Alert.alert`, 두 버튼 — 아래 문구 C). 취소면 멈춘다.
5. 단계 글을 `넣고 확인하는 중…`으로 바꾸고 **한 프레임 양보한 뒤**(`await new Promise(r => requestAnimationFrame(r))`) `importBackup(db, file, new Date())` → 결과. 동기 트랜잭션이 도는 동안 JS 스레드가 막혀 글이 바뀌지 못하므로 넣기·확인을 한 단계로 둔다.
   - `ok: true` → 결과 표 · `reason: 'mismatch'` → 문구 D + 결과 표 · `reason: 'error'` → 문구 G(실패 배너, 결과 표 없음).
6. 어느 갈래로 끝나든(던진 예외 포함 — `runImport` 전체를 `try/finally`) 도는 중 상태를 끈다. `가져오는 중…`에서 멈추지 않는다.

**4) 화면** — 시트(`presentation: 'modal'` — iOS 페이지 시트, 끌어내려 닫힌다), 머리 제목 `Gist에서 가져오기`, 왼쪽 `닫기`.

| 자리 | 부품 (VV5 `ui`) | 내용 |
|---|---|---|
| 토큰 구역 | `Section` + `TextField` | 저장된 토큰이 없으면 입력칸(`secureTextEntry`, `textContentType="none"`, `autoComplete="off"`, `autoCorrect={false}`, `autoCapitalize="none"`, `spellCheck={false}`). 있으면 `토큰 저장됨` 한 줄 + `Button`(plain) `바꾸기`(누르면 입력칸이 나온다). **토큰 글자를 한 글자도 보이지 않는다**(스크린샷이 public 레포에 간다) |
| 설명 | `Text` footnote secondary | 문구 A |
| 주 동작 | `Button` primary, 너비 전체 | `가져오기` / 도는 중 `가져오는 중…`(+ `ActivityIndicator`, 단계 글 `백업 찾는 중 → 받는 중 → 넣고 확인하는 중`). 토큰이 없고 칸이 비면 꺼진 모양 |
| 실패 | `Banner` error | `GistError.message` 그대로, 또는 `parseBackup` 문제 목록(최대 3줄 + `외 n건`), 또는 엔진 예외(문구 G — 아래에 `message`를 footnote로) |
| 결과 | `Section` + `ListRow` 4줄 + 한 줄 | 줄마다 `이름 · 백업 값 · 기기 값 · ✓/✗` — 세션 · 세트 · 총 볼륨(kg, 소수 한 자리) · 식단 일수. 아래에 `내용 지문 일치 ✓`와 `웹 백업 <YYYY-MM-DD HH:mm> 기준`(`exportedAt`을 로컬 시각으로). 행 수 다섯 칸(루틴·종목·설정·종목 메모·식단 플랜)은 접어 둔다(`Collapsible` `테이블별 행 수`) |
| 결과 아래 | `Button` secondary | `홈으로` (시트를 닫는다 — 홈이 포커스를 받으며 다시 읽는다) |
| 되돌림 | `Banner` warning + 결과 표 | 문구 D. 다른 칸은 `✗`와 오류 색 |

### 검증
- `src/core/v21.test.ts` describe `VV4` (fetch 모킹 — `gist.test.ts`의 방식): `/gists` 응답에 백업 파일을 가진 gist 둘(`updated_at` 다름)과 없는 것 하나 → 늦은 것의 id / 백업 파일 가진 것이 없음 → `kind: 'notFound'` / 401 → `auth` / 403 + `x-ratelimit-remaining: 0` → `rateLimit` / fetch 예외 → `network`. 요청 URL에 `per_page=100`, 헤더에 토큰.
- `native/src/db/runImport.test.ts`(처리 함수는 화면 파일 밖 `native/src/db/runImport.ts`로 두고 의존성 — `findBackupGist`·`readGist`·토큰 저장·확인 묻기·DB — 을 인자로 받는다): 받기 실패(`auth`) → 토큰을 **저장하지 않는다** / `parseBackup` 문제 → DB 그대로·토큰 저장 안 함 / 받기 성공 → 토큰 저장 / 기기에 세션이 있고 확인에서 취소 → DB 그대로 / 엔진이 `reason: 'error'`를 돌려줌 → 실패 표시(문구 G), DB 그대로(토큰은 이미 저장됐어도 됨 — 받기에 성공한 토큰이다), 도는 중 상태가 꺼진다 / 엔진 자리의 가짜가 **던짐** → 같은 실패 표시, 도는 중 상태가 꺼진다 / 잘린 응답(`truncated: true`)이면 `raw_url`의 전체 내용이 들어간다(`readGist`를 그대로 쓰는지 — R4).
- 스캔(`native/src/boundary.test.ts`에 더함): `native/src` 어디에도 `api.github.com` 문자열은 없다(코어 `gist.ts`만 부른다) · `secureToken.ts` 말고는 `expo-secure-store`를 import하지 않는다 · 토큰 값을 `console.`·화면 글로 보내는 곳이 없다(`getGistToken` 결과가 `Text` 자식으로 가지 않는다 — `import.tsx`에서 `token`이 JSX 안에 없음).
- **실기기**: 사람이 토큰을 붙여 넣은 뒤(아래 "사람이 할 일"), Claude가 `가져오기` → 결과 표의 네 줄 `✓`와 `내용 지문 일치 ✓` 스크린샷 `import-done-<light|dark>.png`. **표의 세션 수가 웹 설정 → 기록 내보내기의 세션 수와 같다**(사람이 웹에서 보고 PR에 적는다).

### 범위 제외
- 네이티브가 Gist에 **올리기** — v2.2(아래 "데이터 이전" 4).
- 자동 가져오기(앱을 열 때마다) — 사본이 사람 모르게 바뀌면 "아까 본 숫자"가 흔들린다. 전환 전까지 사람이 누를 때만.
- 파일 선택 가져오기(`expo-document-picker`) — 지시가 Gist로 바꿨다.

### README 반영
- `### 네이티브 앱 (v2.1~, 전환 중)`에 한 줄: **Gist 토큰은 Keychain(`expo-secure-store`)에만 둔다.** SQLite `settings`에 쓰는 길은 가져오기 하나이고 그 길이 비밀 키를 거른다. 화면은 토큰 글자를 보이지 않는다.

---

## VV5. 테마 토큰 한 벌 (라이트·다크) + `ui` 부품

### 진단
- 웹 다크에서 버튼 면·테두리가 바탕에 녹는다 — 원인은 토큰 값 셋(PLAN v2.0 7절). "라이트를 베껴 오고 다크를 나중에"가 그 결함을 만들었다.
- 설치된 Astryx에 RN이 쓸 수 있는 값이 다 있다: 팔레트(`@astryxdesign/theme-neutral`의 `neutralPalettes`), 토큰 지도(`neutralTheme` — 사람이 읽는 원문은 `theme-neutral/src/neutralTheme.ts:90-236`), 간격·굵기·시간(`@astryxdesign/core/dist/theme/tokens.stylex.js`), iOS 글자 크기표(`core/dist/theme/uikitTypography.js` — 텍스트 스타일별·범주별 pt).
- 실측(이 PLAN을 쓰며 팔레트로 계산 — 대비는 WCAG 상대 휘도비, 반투명은 그 아래 면에 합성):

  | 쌍 | 라이트 | 다크(처방 적용) |
  |---|---|---|
  | 카드 / 바탕 | 1.13 | 1.14 |
  | 보조 버튼 면 / 카드 | 1.14 | 1.63 |
  | 테두리 / 카드 | 1.19 | 1.94 |
  | 본문 글 / 카드 | 21.0 | 15.1 |
  | 보조 글 / 카드 · 바탕 | 9.29 · 8.23 | 5.65 · 6.43 |
  | 강조 면 위 글 / 강조 면 | **4.57** | 7.03 |
  | 강조 글 / 카드 | 5.48 | 8.94 |
  | 상태 글 / 상태 옅은 면(정보·성공·주의·오류) | 7.66 · 7.42 · 8.67 · 7.82 | 5.34 · 4.71 · 5.44 · 5.24 |

### 설계

**1) 생성 스크립트** — `scripts/native-tokens.mjs` (뿌리 — Astryx 패키지가 뿌리에 있다)
- 읽는 법: 패키지 진입점을 **import한다** — `import { neutralPalettes, neutralTheme } from '@astryxdesign/theme-neutral'`(`dist/source.mjs`, 빌드된 JS). `src/*.ts`는 읽지 않는다(Node 24는 `node_modules` 안 `.ts`의 타입 제거를 거부한다). `tokens.stylex.js`(`spacingDefaults`·`fontWeightDefaults`·`durationDefaults` 등 `*Defaults` 객체)·`uikitTypography.js`(`typography`)도 `@astryxdesign/core/dist/theme/`의 JS를 import한다(설계자가 Node 24에서 import해 이름을 확인했다). 표의 `neutralTheme.ts:줄`은 사람이 확인할 원문 자리다.
- 쓰는 파일: `native/src/ui/palette.generated.ts` — 맨 위 `// 생성물: node scripts/native-tokens.mjs — 손으로 고치지 않는다`.
- 내보내는 것:

  | 묶음 | 내용 | 출처 |
  |---|---|---|
  | `colors.light` · `colors.dark` | `bgBody` `bgCard` `bgSurface` `fillNeutral`(보조 버튼 면) `border` `borderEmphasized` `textPrimary` `textSecondary` `textDisabled` `textAccent` `accent` `accentMuted` `onAccent` `overlayPressed` · 상태 넷(`info` `success` `warning` `error`)마다 `{ text, muted, onMuted }` | `neutralTheme.ts`의 같은 이름 토큰(`--color-background-body` → `bgBody` …)을 팔레트로 풀어 hex(반투명은 `#RRGGBBAA` 그대로 — RN이 읽는다) |
  | 앱 강조색 | `accent` `accentMuted` `textAccent` `onAccent`를 파랑으로 | `src/ax/theme.ts:17-21`의 팔레트 단계를 스크립트에 같은 단계로 적는다 |
  | **다크 처방** | `bgCard` = `neutral.dark[15]` · `fillNeutral` = `neutral.dark[30]` · `border` = `neutral.dark[35]` | PLAN v2.0 7절 표 그대로. 라이트는 Astryx 값 그대로 |
  | `space` | `--spacing-*` 단계 → pt(rem × 16) | `tokens.stylex.js` |
  | `radius` | `inner` `element` `container` `page` → pt | `neutralTheme.ts:231-236` |
  | `type` | iOS 텍스트 스타일(`largeTitle` `title1` `title2` `title3` `headline` `body` `callout` `subheadline` `footnote` `caption1` `caption2`)의 **기본 범주(`large`)** pt | `uikitTypography.js` (Astryx가 웹에서 Dynamic Type을 흉내 낼 때 쓰는 그 표) |
  | `weight` · `duration` | `--font-weight-*`, `--duration-fast`·`medium` | `tokens.stylex.js` |
- `--check` 모드: 생성 결과와 커밋된 파일이 다르면 종료 코드 1. **`npm run check`에는 넣지 않는다**(Astryx가 바뀔 일이 없다 — 웹 의존성이 고정돼 있다). 대신 `scripts/native-tokens.test.mjs`가 같은지를 본다(뿌리 `npm test`).

**2) `native/src/ui/theme.ts`**: `Theme = { scheme, colors, space, radius, type, weight, duration }`. `useTheme()` = `useColorScheme()`(시스템 따름 — 선택 UI는 v2.3)로 `colors.light|dark`를 고른다. `_layout.tsx`가 같은 값을 `@react-navigation/native`의 `ThemeProvider`에 넘긴다(`background`=`bgBody`, `card`=`bgCard`, `text`=`textPrimary`, `border`=`border`, `primary`=`accent`) — 머리·시트가 같은 색을 쓴다. 상태 표시줄은 `expo-status-bar` `style="auto"`.

**3) 글꼴**: `fontFamily`를 지정하지 않는다(시스템 — SF Pro + Apple SD Gothic Neo, PLAN v2.0 8절 추천). 숫자 글에는 `fontVariant: ['tabular-nums']`. `allowFontScaling`은 기본(켜짐) — Dynamic Type이 그대로 먹는다.

**4) 부품** — `native/src/ui/` (화면은 이 부품만 쓴다. 화면 파일에 색·크기 숫자를 쓰지 않는다 — `StyleSheet`의 값은 `theme`에서)

| 부품 | 쓰는 곳 | 모양 · 질감 |
|---|---|---|
| `Screen` | 홈·가져오기 | `ScrollView` `contentInsetAdjustmentBehavior="automatic"`(큰 제목이 스크롤에 접힌다), 바탕 `bgBody`, 좌우 여백 `space` |
| `Section` | 카드 자리 전부 | inset grouped: `bgCard`, `radius.container`, 테두리 `hairlineWidth` `border`. 그림자는 라이트만 |
| `Text` | 전부 | `variant`(위 `type` 이름) × `tone`(`primary` `secondary` `accent` `info` `success` `warning` `error`) × `numeric`(tabular) |
| `Button` | 가져오기·홈으로·알림 펼치기·나중에·바꾸기 | `primary`(강조 면 + `onAccent`) · `secondary`(`fillNeutral` 면 + `textPrimary`) · `plain`(면 없이 `textAccent` — iOS 기본 버튼). `Pressable` 눌림은 `overlayPressed`를 겹친다. 꺼짐은 `textDisabled`. 터치 영역 44pt 이상(`hitSlop`) |
| `Badge` | 머리, 근육 바 | 알약 모양, `neutral`(`fillNeutral`) · `info` · `warning`(각 `muted`/`onMuted`) |
| `Banner` | 홈 알림, 가져오기 실패·되돌림 | 상태 `muted` 면 + `onMuted` 글, 제목·설명·버튼 줄 |
| `ProgressBar` | 디로드·Phase·근육 바 | 트랙 `fillNeutral`, 채움 `accent`·`success`·`warning` |
| `Segmented` | 복귀 적용/안 함 | `@react-native-segmented-control/segmented-control`(UISegmentedControl). `appearance`를 `scheme`에 맞춘다 |
| `Collapsible` | 제안 근거, 테이블별 행 수 | 머리 줄 `Pressable` + 꺾쇠. 펼침 움직임은 넣지 않는다(동작 줄이기 대응이 필요 없게) |
| `ListRow` | 제안 근거 목록, 가져오기 결과 | 왼쪽 이름·설명, 오른쪽 값. 행 사이 `hairlineWidth` 구분선 `border` |
| `TextField` | 토큰 | `bgSurface` 면 + `border`, 높이는 글자 크기에서 |
| `Divider` | 카드 안 구분 | `hairlineWidth` `border` |

Astryx 부품을 쓰지 않는 이유(한 줄): Astryx는 StyleX·DOM 전용이라 RN에서 돌지 않는다 — **값을 가져오고 구현은 RN 기본 + 플랫폼 부품**(PLAN v2.0 2·5절).

### 검증 (`native/src/ui/theme.test.ts`, `scripts/native-tokens.test.mjs`)
- 다크(PLAN v2.0 7절 검증 1 그대로): ① `bgCard` vs `bgBody` ≥ 1.1 ② `fillNeutral` vs `bgCard` ≥ 1.5 ③ `border` vs `bgCard` ≥ 1.5 ④ `border !== fillNeutral`.
- 두 모드: `textPrimary` vs `bgCard`·`bgBody` ≥ 7 · `textSecondary` vs `bgCard`·`bgBody` ≥ 4.5 · `onAccent` vs `accent` ≥ 4.5 · `textAccent` vs `bgCard` ≥ 4.5 · 상태 넷의 `onMuted` vs (`muted`를 `bgCard`에 합성한 색) ≥ 4.5 · `textPrimary` vs `fillNeutral`(카드에 합성) ≥ 4.5. 반투명은 놓이는 면에 합성해서 잰다(계산 함수를 테스트 안에 둔다).
- 라이트 값이 Astryx와 같다: `colors.light.bgCard`·`fillNeutral`·`border`가 `neutralTheme.ts`의 라이트 값 그대로(처방은 다크만 — `scripts/native-tokens.test.mjs`가 생성 스크립트의 결과로 확인).
- `palette.generated.ts`가 생성 결과와 같다(손으로 고치면 실패).
- 스캔: `native/src/app/**`·`native/src/home/**`에 `#` hex 색, `rgb(`, 숫자 `fontSize:` 리터럴이 없다(값은 `theme`에서).
- **결함 복원**: 생성 스크립트의 다크 처방 한 줄(`bgCard`)을 지우면 ① 실패 · `border`를 `neutral.dark[30]`으로 바꾸면 ④ 실패.

### 범위 제외
- 테마 선택(시스템·라이트·다크) — v2.3(PLAN v2.0 6절). v2.1은 폰 설정을 따른다.
- Pretendard — **글꼴은 시스템으로 확정**했다(PLAN v2.0 13절 1번, 검토 1라운드). 다시 볼 일이 생기면 화면이 늘기 전인 v2.2 PLAN 첫머리에서.
- 안드로이드 Material 갈래(PLAN v2.0 5절) — v2.5.

### README 반영
- `### 네이티브 앱 (v2.1~, 전환 중)`에 한 줄: **테마는 라이트·다크 두 벌을 같이 만들고, 값은 Astryx에서 생성한다.** 다크는 카드·보조 버튼 면·테두리를 팔레트 단계로 올린 값(PLAN v2.0 7절)으로 시작했고, 대비 하한을 테스트가 잰다. 생성물(`palette.generated.ts`)은 손으로 고치지 않는다.

---

## VV6. 네이티브 홈 화면 + `docs/FEATURE-MAP.md`

### 진단
- 웹 홈(`src/screens/HomeScreen.tsx`, 660줄)의 계산은 전부 코어 함수 호출이다: `suggestNextDay` · `weekDots` · `dayLastDone` · `strengthCountThisWeek` · `muscleBars` · `deloadState` · `phase0Progress` · `progressionSuggestions` · `phaseReadiness` · `bannerWatches(compensationWatches)` · `homeCardState` · `returnChoiceReason` · `dayGapNotice` · `staleDaysLine` · `bannerQueue` · `summarizeDietDay` · `nextUnloggedSlot`(`HomeScreen.tsx:123-298`). 화면에 남는 것은 **조립과 문구**다.
- 저장소 위험 배너(`storageAtRisk`, `HomeScreen.tsx:411`)는 앱 샌드박스에서 의미가 없다(PLAN v2.0 1절 ④). 백업 배너 둘은 네이티브가 백업하지 않는 v2.1에서 의미가 없다.

### 설계

**1) 조립 — `native/src/home/homeModel.ts`** (순수 TS, `@core`만 import)
```ts
interface HomeInput {
  tables: BackupTables          // readAllTables 결과
  today: string; now: Date
  applyReturn: boolean          // 복귀 배너의 적용/안 함 (화면 상태)
  dismissed: Partial<Record<BannerId, true>>   // "나중에" (화면 상태 — 저장 안 함, 웹 store/ui와 같은 뜻)
}
function homeModel(input: HomeInput): HomeModel | { empty: true }
```
- 루틴: `pickActiveRoutine(routines, settingValue(settings, 'activeRoutineId', null))` → `buildRoutineBundle`. 루틴이 없으면 `{ empty: true }`.
- `currentPhase` = `settingValue(settings, 'currentPhase', 0)` · 진행 중 세션 = `pickOpenSession(sessions)` · 종목 설정 = `exerciseNotes` · 식단 = `buildDietData({ plans: dietPlans, rawDays: dietDays, settings, sessions })`.
- 나머지는 **웹 `HomeScreen.tsx:123-298`과 같은 호출, 같은 인자**. 다른 점만:
  - `bannerQueue`의 `backupStale`은 늘 `false`. 백업 미설정 배너도 없다.
  - 배너 동작 중 기록을 만드는 것(디로드로 시작, Phase 전환)은 모델에서 뺀다 — `actions`에 `'dismiss'`(나중에)와 `'returnChoice'`(복귀 적용/안 함)만.
  - 카드의 `cta`는 쓰지 않는다. 대신 `card.note` = 문구 B.
  - `importedAt` = `settingValue(settings, 'nativeImport', null)?.exportedAt`.
- 배너 제목·설명 글은 웹 `BANNER_VIEW`(`HomeScreen.tsx:303-400`)와 **한 글자도 다르지 않게** 옮긴다. 식단 줄 글(`dietLabel`·`dietValue`)도 같다(`▸`는 뺀다 — 누를 곳이 없다).
- 웹 화면은 고치지 않는다(조립이 두 벌이 되는 것은 웹을 내리는 v2.5까지다). 대신 아래 "웹과 같은 답" 테스트가 둘을 묶는다.

**2) 화면 — `native/src/app/index.tsx`**: 머리 `headerLargeTitle`, 제목 문구 E, 오른쪽 `Button`(plain) `가져오기` → `/import`. 포커스를 받을 때마다(`useFocusEffect`) `readAllTables`를 다시 읽는다(가져오기에서 돌아오면 바로 바뀐다). 순서는 웹 홈 그대로(`HomeScreen.tsx:403` 주석: 머리 → 오늘 → 이번 주 → 주기).

| 자리 | 부품 | 내용 |
|---|---|---|
| 머리 아래 | `Badge` ×3 + `Text` footnote secondary | 루틴 이름(info) · `Phase n` · `누적 n세션` / `웹 기록 <YYYY-MM-DD HH:mm> 기준` |
| 다음 운동 | `Section` | `다음 운동`(footnote secondary) · Day 이름(title2) · 부제 또는 진행 중 줄 · 제안 이유(headline accent) · 공백 줄 · 오래된 줄 · 종목 줄(footnote secondary) · 문구 B(footnote secondary) |
| 알림 | `Banner` | 큐의 첫 번째만 펼친다. 복귀 배너는 `Segmented`(`적용`·`안 함` — 고르면 카드 이유 줄이 바뀐다, R11), 나머지는 `Button` plain `나중에`. 둘 이상이면 `Button` secondary `다른 알림 n개 ▾` / `알림 접기 ▴` |
| 식단 줄 | `Section` 한 줄 | 왼쪽 `다음 식단 …` 또는 `오늘 식단 <마크>`, 오른쪽 `단백질 n/mg`(numeric) |
| 이번 주 | `Section` (`home/WeekDots.tsx`) | `이번 주` · `n/m회` · 근력≠전체일 때 안내 한 줄 · 요일 7칸(불꽃·×n, 오늘 테두리 `accent`, 미래 `textDisabled`) — 웹 `WeekDots.tsx`와 같은 글 |
| 부위별 볼륨 | `Section` (`home/MuscleVolumeBars.tsx`) | 부위마다 이름 · `ProgressBar` · `n/m` · `Badge` `nx`(빈도 미달 warning) · 아래 안내 줄 — 웹 `MuscleVolumeBars.tsx`와 같은 글 |
| 주기 | `Section` | Phase 0이면 `Phase 0 진행 n/m주` + `ProgressBar` + 안내, `Divider`, `디로드 카운터 n/m주` + `ProgressBar` + 안내 |
| 제안 근거 | `Section` + `Collapsible` | `제안 근거 (부족분 점수)` → `ListRow`(Day 이름 + `회복 감쇠` Badge, 기여 글, 점수 numeric) + `★ = 이번 주 첫 노출…` |
| 빈 기기 | `Screen` 가운데 | 제목 문구 E · 문구 F · `Button` primary `Gist에서 가져오기` |

**3) `docs/FEATURE-MAP.md`** (PLAN v2.0 11.3 — 단계마다 줄을 더하는 채점표). v2.1 줄:

| # | 흐름 | 기기에서 확인 | 단계 |
|---|---|---|---|
| F1 | 앱이 뜬다 — 홈 화면 아이콘 `이왜들` → 실행 | 스크린샷 | v2.1 |
| F2 | 빈 기기 → `Gist에서 가져오기` → 토큰 → 결과 표 네 줄 ✓ + 지문 ✓ | 스크린샷 + 요소 목록 | v2.1 |
| F3 | 가져온 홈 — 머리·다음 운동·이번 주·볼륨·주기 | 라이트·다크 스크린샷 | v2.1 |
| F4 | 앱을 완전히 끄고 다시 열어도 가져온 기록이 남는다 | 스크린샷 | v2.1 |
| F5 | 다시 가져오기(기기에 기록 있음) → 확인 → 결과 | 요소 목록 | v2.1 |

### 검증 (`native/src/home/homeModel.test.ts`)
- **웹과 같은 답**: 같은 픽스처 표에 대해 `homeModel`의 카드 Day id·이유 줄·공백 줄·오래된 줄, 주간 도트, 근육 바, 디로드·Phase 0 수치, 배너 큐 순서가 **웹 홈이 부르는 코어 함수를 테스트 안에서 같은 인자로 직접 부른 값**과 같다. 픽스처 경우: 정상 주중 · 14일+ 공백(복귀 배너 — `applyReturn` true/false 둘 다, false면 이유 줄이 `returnChoiceReason`의 "안 함" 문구) · 디로드 도달 · Phase 0 달성 · 보상작용 연속 · 진행 중 세션이 있는 날(카드가 그 Day + `진행 중 · n분 · 완료 a/b세트`, `now`로 분 계산) · **대체 종목 세션과 어시스티드 종목**이 든 주(볼륨·증량 제안의 방향) · 식단 옛 플랜을 쓰는 날(훈련일 정규화) · **루틴은 있고 세션 0건**(웹을 막 시작한 날의 백업 — `lastSessionOf`가 `undefined`인 갈래: 카드 Day·이유 줄·도트·근육 바·디로드·Phase 0 수치가 코어 값과 같고, `progressions`가 `[]`이며 증량 제안 배너가 큐에 없다).
- **손으로 적은 기대값**: 위 경우 중 **정상 주중**과 **14일+ 공백**(`applyReturn` true/false) 둘은 기대값을 함수 호출이 아니라 **리터럴**로 적는다 — 카드 Day id, 이유 줄 문자열, 공백 줄 문자열, 도트 배열, 배너 큐 id 순서. 구현자가 픽스처와 `docs/DESIGN.md` 4절 규칙으로 값을 정하고, 정한 근거를 테스트 주석 한 줄로 남긴다. (나머지 경우는 코어 함수를 다시 불러 만든 값과 비교해도 된다 — 인자를 잘못 옮긴 실수는 이 두 경우와 아래 조립식 스캔이 잡는다.)
- 배너 글: 다섯 종류의 제목·설명이 웹 `BANNER_VIEW`와 같은 문자열이다(웹 파일에서 글 틀을 읽어 비교하지 않는다 — 기대 문자열을 테스트에 적고, 웹 쪽은 `src/lib/v21.test.ts` describe `VV6`에서 `HomeScreen.tsx` 소스에 같은 틀(`일 공백 — `, `디로드 권장 — 세트 50%, 무게 유지`, `조건을 모두 충족했어요`, `보상작용 반복 — 무게 하향 검토`, `증량 제안`)이 남아 있는지 본다 — 한쪽만 바뀌면 실패).
- **조립식 스캔**(같은 describe `VV6`): 웹 `src/screens/HomeScreen.tsx`와 네이티브 `native/src/home/homeModel.ts`(glob `/native/src/home/homeModel.ts` `?raw`) **양쪽 모두에** 아래 식이 주석을 지운 글에 들어 있다 — 한쪽만 바뀌거나 처음부터 다르게 옮겼으면 실패. 공백은 하나로 줄여 비교한다.
  `deload.due || deload.earlySignal` · `phase.allMet && phase.to !== null` · `watches.length > 0` · `progressions.length > 0` · `card.resuming` · `bannerWatches(compensationWatches(` · `buildScaleMap(exerciseSettings, routine.rules.weightIncrementKg)` · `hasReturnStep: Boolean(suggestion.returnStep)`.
  (`backupStale` 식은 넣지 않는다 — 네이티브는 늘 `false`로 일부러 다르다.) 변수 이름이 웹과 다르면 이 스캔이 실패하므로, `homeModel`은 웹과 **같은 지역 변수 이름**(`deload`·`phase`·`watches`·`progressions`·`card`·`suggestion`·`exerciseSettings`·`routine`)을 쓴다.
- `dismissed`에 든 배너는 큐에 없다 · `backupStale`이 늘 거짓이라 `backup`이 큐에 없다 · 모델의 배너 `actions`에 `'dismiss'`·`'returnChoice'` 말고는 없다.
- 루틴 없는 표 → `{ empty: true }`.
- **속성**: 세션 배열 순서를 섞어도 `homeModel` 결과가 같다(Dexie가 uuid 순으로 주던 것과 기본키 순이 같다는 가정에 기대지 않는다). **생성기는 세션마다 `startedAt`을 다르게 만든다** — 동점의 순서 의존은 지금 웹 동작이고 이번 범위 밖이다(VV1 "정렬 동점" 표).
- 스캔: `native/src/home/**`·`native/src/app/**`가 `@core`의 판정 함수를 부르되 같은 이름의 함수를 정의하지 않는다(VV2의 `quality-scan` 두 번째 묶음이 막는다 — 결함 복원으로 확인).

### 범위 제외
- 시작·Day 변경 시트·디로드로 시작·Phase 전환·진행 중 세션 시트 — v2.2(세션 화면과 같이).
- 식단 줄을 눌러 식단으로 가기 — v2.3.
- 웹 홈을 `homeModel`로 바꿔 끼우기 — 웹을 더 고치지 않는다(지시 "웹은 더 보호하지 않는다").

### README 반영
- `### 네이티브 앱 (v2.1~, 전환 중)`에 한 줄: **전환 전까지 네이티브 앱은 웹 기록의 읽기 전용 사본이다.** 홈은 웹과 같은 코어 함수로 같은 답을 보이되 기록을 만들거나 바꾸지 않는다. 세션 기록은 v2.2부터다.

---

## VV7. 규칙 문서 사실 맞추기 (규칙 정비자 — `agents/RULES-KEEPER.md`)

### 진단
- VV1이 `Astryx 뒷걸음` 검사를 `코어 경계`로 바꾸면, 그 검사를 가리키는 규칙 글이 사실과 어긋난다: `CLAUDE.md` "명령"(검사 목록) · `CLAUDE.md` "문서"의 "(CI가 막는다)" · `agents/README.md:148` 표 줄 · `agents/REVIEWER.md:16` · `agents/IMPLEMENTER.md:36`의 `astryx-inventory --check` · `agents/RULES-KEEPER.md:40`의 검사 목록.
- 이 파일들은 규칙 정비자 몫이고(`RULES-KEEPER.md` 첫 줄) REVIEW.md 3절 사람 필요 경로다. 특히 "(CI가 막는다)"를 고치는 것은 글 맞추기가 아니라 **웹 화면의 Astryx 우선 강제를 푸는 규칙 변경**이다 — 구현자 PR에 섞지 않는다.

### 설계
- 규칙 정비자가 **PR R**(문서만)로 낸다. 바꿀 사실(글은 규칙 정비자가 정한다):
  - 검사 목록의 `Astryx 뒷걸음` → `코어 경계`(`node scripts/core-boundary.mjs --check` — `src/core`가 react·expo·DB·store·브라우저 전역을 쓰지 않는다).
  - 웹 화면(`src/screens`·`src/components`·`src/ax`)의 Astryx 우선은 **규칙으로는 남고 CI가 막지 않는다**(v2.1부터, 웹은 전환과 함께 내린다). 네이티브 화면의 값 규칙은 VV5의 스캔이 막는다.
- 지휘자는 PR 1을 올릴 때 이 작업을 규칙 정비자에게 같이 맡긴다. **머지 순서: PR 1 → PR R**(PR R이 먼저 들어가면 없는 검사를 가리킨다).

### 검증
- `grep -rn "Astryx 뒷걸음\|astryx-inventory.mjs --check" CLAUDE.md agents/` → PR R 뒤 0줄(출력 복사).
- `npm run check -- --fast` 통과(문서만 바꿨으므로 같은 결과).

### 범위 제외
- `docs/DESIGN.md` 9절, `docs/ASTRYX-INVENTORY.md` — 웹과 함께 v2.5에.

### README 반영
- 없음.

---

## 화면 검증 (화면 검증자 — `agents/SCREEN-CHECKER.md`, 도구는 `.claude/skills/verify-device`)

유선 아이폰 + mobile MCP. 시뮬레이터는 쓰지 않는다. 라이트·다크 전환은 MCP로 **설정 앱**(`com.apple.Preferences`) → 디스플레이 및 밝기 → 라이트/다크를 누른다(앱은 폰 설정을 따른다). 요소는 `mobile_list_elements_on_screen`으로 찾고 좌표로 찍지 않는다.
스크린샷: `docs/screenshots/v2.1/device/<장면>-<light|dark>.png`.

| 작업 | 장면 (각각 라이트·다크) | 볼 것 |
|---|---|---|
| VV2 | `boot` | 아이콘 아래 `이왜들`(스프링보드), 자리표시 화면 |
| VV4 | `import-empty` | 토큰 칸의 이름이 보이는가, 빈 칸일 때 `가져오기`가 꺼져 보이는가, 설명 글이 잘리지 않는가 |
| VV4 | `import-done` | 결과 네 줄이 한 줄씩 정렬되는가(숫자 고정폭), ✓가 성공 색으로 읽히는가, **토큰 글자가 화면 어디에도 없다** |
| VV4 | `import-error` (토큰 칸에 `x`를 넣고 가져오기) | 오류 배너 글이 두 줄을 넘어도 잘리지 않는가, 다크에서 배너 면이 바탕과 구분되는가 |
| VV6 | `home-empty` (앱 데이터 지운 뒤 — `mobile_clear_app_data`가 안 되면 앱을 지웠다 다시 설치) | 주 버튼이 보이는가 |
| VV6 | `home` · `home-end`(끝까지 스크롤) | **다크에서 카드가 바탕과 구분되는가, `다른 알림 n개`(보조 버튼)의 면이 카드·바탕과 구분되는가, 진행 막대의 트랙이 보이는가**(PLAN v2.0 7절의 결함 자리) · 큰 제목이 스크롤에 접히는가 · 긴 Day 이름·긴 종목 줄이 넘치지 않는가 · 숫자가 고정폭 |
| VV6 | `home-banners-open` | 펼친 배너들 사이 간격이 같은가, `적용`/`안 함` 세그먼트의 고른 쪽이 다크에서 보이는가 |
| VV6 | `home-largetext` (설정 → 손쉬운 사용 → 더 큰 텍스트, 접근성 크기 아닌 가장 큰 단계 — 라이트만) | 카드 안 글이 잘리지 않고 줄을 바꾸는가 |

**정말 사람만 볼 수 있는 것**: 밝기를 낮춘 헬스장 조명(역광)에서 다크 홈이 읽히는가(PLAN v2.0 7절 검증 3) — 구현자는 DEV-RECORD에 "사람 확인 필요"로 남긴다.

---

## 데이터 이전

| 대상 | 어떻게 되나 |
|---|---|
| 웹 IndexedDB(`workout-tracker` v3) | 그대로. VV1은 파일 자리만 옮긴다 |
| 웹이 올리는 Gist 백업 | 그대로(세션을 마치거나 식단을 고치면 자동으로 올라간다). 형식 `SCHEMA_VERSION` 3 그대로 |
| 네이티브 SQLite(`iwaedeul.db`, 앱 샌드박스) | 새로 생긴다. **가져오기만이 쓴다** — 매번 전체 교체, 검증이 틀리면 되돌린다 |
| 토큰 | 네이티브 Keychain(`gistToken`). 웹 localStorage의 토큰은 그대로 |

**전환 절차** (v2.2가 끝나 네이티브에서 세션을 기록할 수 있게 된 날 — "바로 전환"):
1. 웹 설정 → Gist 백업 → **지금 백업**(식단만 고친 뒤 자동 업로드 전에 넘어가지 않게).
2. 네이티브 → 가져오기 → 결과 표 네 줄 ✓ + 지문 ✓. 표의 세션 수를 웹 설정 → 기록 내보내기의 세션 수와 맞춰 본다.
3. 그날부터 **웹에서 기록하지 않는다.** 웹은 원천의 자리를 잃고, 네이티브가 원천이다.
4. **v2.2 범위**(이 PLAN이 미리 적어 두는 것): 네이티브가 **같은 Gist에 백업을 올린다**(같은 `createBackup` 형식 — 웹 `gistSync`의 지문 비교·디바운스 규칙을 네이티브 저장소 위에서) · 웹은 쓰기를 멈춘다(웹 Gist 자동 업로드를 끄는 한 줄 배포 또는 웹을 내림 — v2.2 PLAN이 정한다. 웹이 전환 뒤에 한 번이라도 올리면 네이티브의 새 기록을 덮는다) · 전환 뒤에는 네이티브의 가져오기를 **덮어쓰기 경고**가 있는 복원으로 바꾼다.

## 되돌리기

| 상황 | 방법 | 데이터 |
|---|---|---|
| PR 1(VV1) 배포 뒤 웹이 이상하다 | PR 1 머지 커밋을 `git revert -m 1`(PR로) | 웹 IndexedDB·Gist 그대로(저장 형식 무변경) |
| 네이티브 가져오기 결과가 이상하다 | 다시 가져온다(전체 교체). 또는 앱을 지운다 | 웹은 영향 없음 — 네이티브는 사본이다 |
| 네이티브 앱이 안 뜬다 | 먼저 서명 만료(7일)를 본다(verify-device 1절). 아니면 PR 2 되돌리기 — `native/`만 사라지고 웹은 그대로 | 웹 그대로 |

**단계마다 배포할 수 있다:** PR 1은 웹 동작이 같다. PR 2는 `native/`와 검사 묶음만 더하고 웹 빌드 결과는 PR 1과 같다(`first-load` 숫자로 확인).

## 과거 판정 불변

바뀌지 않는 것: 판정·제안·내보내기·백업 형식의 로직 전부. VV1은 파일을 옮기고 import 경로만 고친다(검증의 "이름 그대로" diff). `readModel`로 뺀 함수는 훅 안의 식을 그대로 옮긴 것이다. 골든(`v113`~`v117` 내보내기 글자)은 import 줄 말고는 한 글자도 안 고치고 통과한다.
네이티브는 같은 코어 함수를 쓰므로 같은 기록에서 같은 판정이다(VV3 차등 테스트, VV6 "웹과 같은 답").

달라지는 것:

| 무엇 | 언제 | 과거 기록 |
|---|---|---|
| 웹 `fingerprintPayload`가 `nativeImport` 키를 뺀다 | VV3 | 웹에는 그 키가 없어 지문이 같다. 백업 업로드 판정 그대로 |
| 네이티브 홈에 백업 배너가 없다 | VV6 | 판정은 같고 표시만 없다(사본이라 백업하지 않는다) |

---

## 구현 순서와 검증

**PR 1: VV1 → 기록·버전.** **PR R: VV7**(규칙 정비자, PR 1 다음에 머지). **PR 2: VV2 → VV3 → VV5 → VV4 → VV6 → 화면 검증 → 기록·버전.** (PR 2는 PR 1이 머지된 `main`에서 새 브랜치로.)
VV5를 VV4보다 먼저 하는 이유: 가져오기 화면이 `ui` 부품을 쓴다. VV3를 VV4보다 먼저 하는 이유: 화면이 엔진을 부른다.
커밋 수: **PR 1 = 2**(VV1 · 기록·버전), **PR R = 1**(VV7), **PR 2 = 7**(VV2 · VV3 · VV5 · VV4 · VV6 · 화면 검증 · 기록·버전). 작업끼리 한 커밋에 섞지 않는다. 개수는 `git log --oneline main..HEAD` 출력을 복사한다.

**사람 필요 경로**(`REVIEW.md` 3절) — 리뷰어는 아래 PR을 통과시키지 않고 **사람 필요**로 올린다. 이 설계가 미리 알리는 것이고, 구현자는 이 때문에 멈추지 않는다(사람이 머지 때 본다):

| PR | 걸리는 경로 | 무엇을 하나 |
|---|---|---|
| PR 1 | `src/db/**` | `seed.ts` 쪼개기, `validateRoutine`·`validateDietPlan` 옮기기, `getActiveRoutine`·`getOpenSession` 본문이 `readModel`을 부르게(스키마·`version(` 무변경) |
| PR 1 | `lib/backup.ts` · `lib/gist.ts` · `lib/secrets.ts` | 순수한 절반을 `src/core`로(동작 무변경) |
| PR 1 | `scripts/check.mjs` · `.github/workflows/ci.yml` | `Astryx 뒷걸음` → `코어 경계` |
| PR R | `CLAUDE.md` · `agents/**` | VV7 |
| PR 2 | `scripts/check.mjs` · `.github/workflows/ci.yml` | 네이티브 설치·타입·테스트 단계 |
| PR 2 | 가져오기(`native/src/db/importBackup.ts`·`runImport.ts`)·비밀값(`native/src/platform/secureToken.ts`) | 표의 경로 이름은 아니지만 같은 이유("기록이 사라지는 길", "유출")라 같이 올린다 |

관례:
- `npm run check`(마무리 — PR 2부터 `네이티브 타입`·`네이티브 테스트` 포함), 작업 중에는 `npm run check -- --fast`와 관련 테스트만(`npx vitest run src/lib/v21.test.ts src/lib/properties.test.ts scripts/core-boundary.test.mjs scripts/vv1-paths.test.mjs`, `npm --prefix native test -- <파일>`). `tsc`를 직접 부르지 않는다(네이티브는 `npm --prefix native run typecheck`).
- 맥북 사양: Metro·Xcode 빌드가 떠 있을 때 `npm run check`를 같이 돌리지 않는다(PLAN v2.0 11.6).
- 커밋 메시지는 `git commit -F - <<'MSG'`, 줄바꿈 LF(`grep -c $'\r' <파일>` 0).
- **기존 테스트는 import 경로·glob 경로·테스트 본문의 경로 문자열 리터럴(VV1 4) 말고 고치지 않는다.** 예외는 `scripts/check.test.mjs`의 `npm ci` 거르기 한 줄(VV2) 하나다. `scripts/mutation.test.mjs`에는 `src/core/x.ts` → 대상, `src/core/x.test.ts` → 대상 아님 두 경우를 **더하기만** 한다(VV1). 그 밖에서 깨지면 멈추고 보고한다.
- 테스트에 실제 토큰·네트워크가 없다(fetch 모킹). 사람의 실제 Gist는 실기기 확인에서만 쓰고 레포에 내용을 남기지 않는다.
- **새 스캔 결함 복원 확인**(`cp` 백업 → 결함 되살림 → 실패 확인 → 되돌림 → `cmp`로 같음 확인). 최소:
  ① (VV1) `src/core/derive.ts`에 `import { db } from '../db'` 한 줄 → `core-boundary --check` 종료 코드 1
  ② (VV1) `src/core/dates.ts`에 `localStorage.getItem('x')` → 위반
  ③ (VV1) `v1111.test.ts` glob을 옛 `/src/lib/exportMarkdown.ts`로 → 헛도는 경로 막이(glob) 실패 · `v116.test.ts`의 `nn1Src("src/core/derive.ts")`를 옛 `"src/lib/derive.ts"`로 → 헛도는 경로 막이(리터럴) 실패
  ④ (VV1) `pickOpenSession`이 첫 번째 끝나지 않은 세션을 돌려주게 → 속성 "순서를 바꿔도 같다" 실패
  ⑤ (VV2) `native/src/app/index.tsx`에 `import … from '../../../src/core/dates'` → `boundary.test.ts` 실패
  ⑥ (VV3) `sessionRow`가 `endedAt`을 `''`로 넣게 → 승격 열 단언 실패
  ⑦ (VV3) `settingsRow`가 `body`에 `{ ...row, value: row.value ?? null }`을 넣게(열 방식 흉내) → 가져오기가 `ok: false`(지문 불일치)로 실패. 그 상태에서 판정의 `digestMatch` 조건까지 지우면 `ok: true`가 되고 `legacyEmpty` 단언만 실패한다 — **숫자가 못 보는 것을 지문이 본다**는 확인
  ⑧ (VV3) `tx.rollback()`을 지운다 → NaN 파일 되돌리기 단언 실패
  ⑨ (VV3) `importBackup`이 `isSecretSettingKey`를 안 거르게 → `gistToken` 단언 실패
  ⑩ (VV4) 받기 전에 토큰을 저장하게 → `auth` 실패 시 저장 안 함 단언 실패
  ⑪ (VV4) `import.tsx`에 `<Text>{token}</Text>` → 스캔 실패
  ⑫ (VV5) 생성 스크립트의 다크 `bgCard` 처방 줄을 지운다 → 대비 ① 실패
  ⑬ (VV5) `native/src/home/`의 한 파일에 `color: '#ffffff'` → 스캔 실패
  ⑭ (VV6) `homeModel`이 `bannerQueue`에 `backupStale: true`를 넘기게 → 단언 실패
  ⑮ (VV6) `native/src/home/homeModel.ts`에 `export function suggestNextDay() {}` → `quality-scan --ci` 중복 정의로 실패
  ⑯ (VV3) `importBackup`의 바깥 `catch`에서 `error` 갈래를 지워 예외를 다시 던지게 → 예외 단언 ①② 실패
  ⑰ (VV4) `runImport`의 `finally`를 지운다 → "던짐 → 도는 중 상태가 꺼진다" 단언 실패
  ⑱ (VV6) `homeModel.ts`의 `deload.due || deload.earlySignal`을 `deload.due`로 → `v21.test.ts` describe `VV6`의 조립식 스캔 실패
- **변이 테스트**: PR 1 — `npm run mutation`을 **새로 생기거나 내용이 바뀐 코어 파일만**: `backupFormat.ts` `seedData.ts` `secretKeys.ts` `readModel.ts` `bannerQueue.ts`(상수만이라 표만). 옮기기만 한 36개는 내용이 같아 돌리지 않는다(`git diff -M --diff-filter=R`로 이름만 바뀐 것). PR 2 — `recordTotals.ts`·`gist.ts`(`findBackupGist`)·`backupFormat.ts`(`sortTables`·`contentDigest`). 표를 DEV-RECORD에. `recordTotals.ts`의 살아남은 변이는 이유를 적는다(이 값이 "같다"의 근거다). `native/`는 stryker 밖이다(별도 패키지) — 결함 복원 ⑥~⑪·⑯·⑰이 그 자리를 맡는다.
- **과거 판정 불변 확인 절**(DEV-RECORD): ① 이름 그대로 diff 명령의 출력이 비어 있다(복사) ② 골든 수정 없이 통과 ③ VV1 전후 테스트 수(복사) ④ VV1 전후 `first-load` 숫자(복사) ⑤ VV3 차등 테스트·VV6 "웹과 같은 답" 테스트 이름 ⑥ "과거 판정 불변" 표.
- **실기기 확인**(verify-device 3절 형식으로 보고에 두 줄: `기기: …`, `사람이 볼 것: …`):
  ① VV2 — `이왜들` 아이콘, 자리표시 화면(F1)
  ② VV4 — 가져오기 결과 네 줄 ✓ + 지문 ✓(F2) · 세션 수가 웹 설정의 수와 같다(사람이 적는다)
  ③ VV6 — 홈 라이트·다크(F3) · 앱 종료 후 재실행(F4) · 다시 가져오기 확인(F5)
  ④ Release 구성으로 한 번 구워(`--configuration Release`) Metro를 끈 채로 앱이 뜬다
  기기 검증을 못 하면(기기·에이전트·서명 문제) **우회하지 않고 멈춘다**(verify-device 0절).
- 완료 후 `docs/DEV-RECORD-v2.1.md`. 맨 위 "이 환경에서 확인된 제약"은 v1.21 목록을 이어받고 더한다: Expo SDK·RN·React 실제 버전 · 무료 계정 7일 만료일 · Hermes의 `crypto.randomUUID` 없음(확인한 방법) · `toLocaleString`이 기기에서 쉼표를 찍는지 · gist 100개 한 쪽 제한 · `name`을 ASCII로 둔 이유와 확인 · 맥북에서 네이티브 빌드에 걸린 시간. "배포 영향" 절(PR 본문 맨 위에도):
  - PR 1: **웹앱 동작은 같다.** 파일 자리만 바뀌었고 번들 크기 같음(숫자). 검사 묶음의 `Astryx 뒷걸음`이 `코어 경계`로 바뀌었다.
  - PR 2: **웹은 바뀌지 않는다.** `native/`에 아이폰 앱이 생겼다 — 맥북에서 구워 폰에 설치(7일마다 재설치). 앱은 웹 기록을 Gist에서 가져와 홈을 보여 줄 뿐 기록하지 않는다.
- README: 각 작업의 "README 반영"을 그 작업 커밋에서 고친다.
- 버전: 뿌리 `package.json`(웹)은 **1.21.0 그대로** — 웹에 새 기능이 없고, 웹 설정 화면에 2.1이 보이면 거짓이다. `native/package.json`·`app.config.ts` `version`은 VV2에서 **2.1.0**으로 만든다.

리뷰 단위: **작업별** — VV1은 매일 쓰는 웹의 파일 수십 개를 옮기고, VV3는 "같다"를 판정하는 저장 엔진이며, VV4는 비밀값 경로다. 서로 다른 축에서 조용히 틀릴 수 있다.

---

## 사람이 할 일 (PR 2 실기기 확인 전, 한 번)

1. 아이폰 USB 연결·신뢰·개발자 모드, DeviceKit 에이전트 서명(verify-device 0절 — 이미 했으면 만료일만 확인).
2. Xcode → Settings → Accounts의 Personal Team ID를 `native/.env.local`에 `APPLE_TEAM_ID=<값>`으로 적는다(커밋하지 않는다).
3. 웹에서 Gist 백업이 켜져 있는지, 설정 → Gist 백업 → **지금 백업**.
4. 폰에서 네이티브 가져오기 화면이 뜨면 **토큰을 사람이 붙여 넣는다**(Claude에게 토큰을 주지 않는다 — MCP로 입력하면 대화에 남는다). 이후 Keychain에 남아 Claude는 `가져오기`만 누른다.
5. 웹 설정 → 기록 내보내기에 보이는 세션 수를 PR 댓글에 적는다(F2 대조).

---

## 화면 문구 (확정 — 검토 1라운드. 사람이 마지막에 고칠 수 있다, 고쳐도 설계는 같다)

| 키 | 자리 | 문구 |
|---|---|---|
| A | 가져오기 설명 | `웹 앱이 올려 둔 Gist 백업을 읽어 이 기기에 넣습니다. 토큰은 gist 권한만 있으면 되고, 이 기기의 키체인에만 저장됩니다.` |
| B | 홈 카드 아래(시작 버튼 자리) | `기록은 아직 웹에서 합니다 — 여기서는 보기만 합니다` |
| C | 다시 가져오기 확인 | 제목 `이 기기의 기록을 교체할까요?` · 본문 `Gist 백업(<YYYY-MM-DD HH:mm>)으로 이 기기의 기록을 모두 교체합니다.` · 버튼 `취소` / `교체`(빨강 — `destructive`) |
| D | 검증 불일치 | `가져온 값이 백업과 달라 되돌렸습니다. 이 기기의 기록은 가져오기 전 그대로입니다.` |
| E | 홈 큰 제목 | `이왜들` |
| F | 빈 기기 | `웹 앱의 기록을 가져오면 홈이 채워집니다.` |
| G | 가져오기 중 오류(엔진 예외) | `가져오는 중 오류가 나 되돌렸습니다. 이 기기의 기록은 가져오기 전 그대로입니다.` + 아래 footnote에 오류 `message` |
| — | 가져오기 단계 글 | `백업 찾는 중` → `받는 중` → `넣고 확인하는 중` |

**스크린샷**: 실기기 스크린샷은 `docs/screenshots/v2.1/device/`에 **커밋한다**(지금까지의 관례). 보이는 것은 운동 기록 수치뿐이고 토큰은 화면에 없다(VV4 스캔·결함 복원 ⑪). 같은 화면을 여러 번 찍는 장면(`home-largetext` 등)은 개인 수치가 반복될 뿐이니, 장면을 고를 때 개인 수치가 적은 것(빈 기기·가져오기 결과)을 먼저 둔다.

**글꼴**: 시스템(SF Pro + Apple SD Gothic Neo) — VV5 3).

## 사람이 정할 것

없음(검토 1라운드에서 세 항목 모두 설계자 추천안으로 확정 — 아래 기록).

---

## 검토 반영 기록

### 1라운드 (`.reports/v2.1-review.md`, Claude Opus 5.5, 검토 커밋 `67cb468`)

| 지적 | 판단 | 근거·반영 자리 |
|---|---|---|
| 고칠 것 1 — 테스트 본문의 경로 리터럴이 옮긴 뒤 헛돈다 | **반영** | `v116.test.ts:653`(`?? ""`)·`:906`·`:912-913` 확인, 경로 리터럴 114줄·23개 파일(설계자 grep, glob 줄 제외). VV1 진단·4)·6) 막이·검증·"이름 그대로" diff 패턴·관례의 예외·결함 복원 ③. **추가로 고친 것**: 막이가 `node:fs`를 쓰는데 `src` 아래 테스트는 `tsconfig.app.json`(node 타입 없음)이 빌드에서 타입 검사한다 — 막이를 `scripts/vv1-paths.test.mjs`로 옮겼다(1판의 `src/lib/v21.test.ts` 자리는 빌드를 깨뜨렸을 것이다) |
| 고칠 것 2 — REVIEW.md 3절 경로 명시, 규칙 문서는 규칙 정비자 몫 | **반영** | `main`의 REVIEW.md 3절 표와 `RULES-KEEPER.md` 첫 줄 확인. "구현 순서"에 사람 필요 경로 표, VV1 7)을 VV7(규칙 정비자, PR R)로 뗐다. `check.mjs`·`ci.yml`은 지휘자 지시 ②가 정한 일이라 구현자 PR에 남기고 사람 필요로 표시했다 |
| 고칠 것 3 — 가져오기 엔진의 예외 갈래 | **반영** | `backup.ts:221-232`(세션 검사가 `id`·`date`·`entries`뿐) 확인. `ImportOutcome`에 `reason: 'error'`, 엔진은 던지지 않음, `runImport`의 `finally`, 문구 G, 검증 두 줄씩, 결함 복원 ⑯·⑰ |
| 고칠 것 4 — 순서 무관 속성과 동점 | **반영** | `db/index.ts:126-129`·`derive.ts:24-28`의 안정 정렬 확인. 생성기가 `startedAt`·`id`를 서로 다르게 만든다고 적고, VV1에 "정렬 동점" 기록 표 |
| 고칠 것 5 — "웹과 같은 답"이 웹 조립에 묶이지 않는다 | **반영** | `HomeScreen.tsx:141-152·238-261·286-297`의 식 확인(`:152` `bannerWatches(compensationWatches(sessions))`). VV6에 조립식 스캔(양쪽 파일)과 손으로 적은 리터럴 두 경우, 결함 복원 ⑱. `backupStale` 식은 일부러 다르므로 뺐다 |
| 고칠 것 6 — 루틴은 있고 세션 0건 | **반영** | `HomeScreen.tsx:132`·`:141` `last` 갈래 확인. VV6 픽스처에 더함 |
| 1-1 웹 홈의 진행 중 세션은 store 경유 | **반영** | `HomeScreen.tsx:75`·`store/session.ts:87`. VV1 진단 한 줄 |
| 1-4 v2.2 웹 한 줄 배포가 Astryx 검사 없이 나간다 | **반영** | VV1 범위 제외 한 줄 |
| 1-4 PR 2를 둘로 나누기 | **기각** | 검토자도 "고칠 것은 아니다". 작업별 리뷰라 커밋 단위로 볼 수 있고, PR을 나누면 맥북에서 네이티브 빌드·기기 설치를 한 번 더 한다(사양 제약) |
| 경미 1 — `지금 올리기` → `지금 백업` | **반영** | `GistPanel.tsx:208`. 전환 절차·사람이 할 일 |
| 경미 2 — `before`도 정렬한 값에서 | **반영** | VV3 5) 1단계 `sortTables(toTables(file))` |
| 경미 3 — `tx.rollback()`의 예외와 클로저 밖 변수 | **반영** | VV3 5) "구현 모양" |
| 경미 4 — 동기 트랜잭션 중 단계 글이 안 바뀐다 | **반영** | 단계를 `넣고 확인하는 중` 하나로 합치고 한 프레임 양보(VV4 3) 5) |
| 경미 5 — `node_modules` 안 `.ts`를 Node가 못 읽는다 | **반영** | 패키지 진입점(`dist/source.mjs`)이 `neutralPalettes`·`neutralTheme`을, `core/dist/theme/*.js`가 `*Defaults`·`typography`를 내보내는 것을 Node 24.22에서 import해 확인. VV5 1) |
| 경미 6 — `mutation.mjs:63`의 경로 제한 | **반영** | `:8-9·20-21·63·68` 확인. VV1 4) |
| 경미 7 — 받은 파일의 `gistId`로 찾은 gist 교차 확인 | **기각** | 선택 사항. 결과 표의 `웹 백업 <시각> 기준`과 사람이 맞춰 보는 세션 수(F2)가 같은 것을 이미 본다. 경고 문구·갈래를 하나 더 만들 만큼의 효과가 없다. 100개 제한은 DEV-RECORD 제약에 남긴다 |
| 사람이 정할 것 1(글꼴) | **확정 A** | 검토자 동의 |
| 사람이 정할 것 2(문구) | **확정** | 검토자 동의. 조건(선택) "C를 웹과 같은 `교체`로"를 반영했다 — `GistPanel.tsx:232·240`. E는 `이왜들`. 검토 반영으로 생긴 G와 단계 글은 설계자가 정했다 |
| 사람이 정할 것 3(스크린샷) | **확정 A** | 검토자 동의. 메모(개인 수치 적은 장면 먼저)를 반영했다 |
