# PLAN v2.1 — 네이티브로 완전 전환: 웹 지우기 · 코어 · Expo(뿌리) · SQLite · Gist 가져오기 · 테마 두 벌 · 홈 (VV)

> 작성: Claude Opus 5.5 (설계자), 2026-11-26. 대상 코드: v1.21.0 (`main` `aa0f0be`).
> **개정판**(2026-11-26). 사람 지시(`.reports/coord-prompt-v2.1-rev.md` "설계 작업" ①②③): **웹을 지금 버리고 네이티브로 완전 전환한다.**
> 1판(PR #60, 검토 2라운드 끝)을 이 문서가 대신한다. 개정 검토 1라운드 반영 2026-11-27(끝의 "검토 반영 기록"). 1판의 SQLite 스키마·Gist 가져오기·테마 토큰·홈 설계는 **내용 그대로**(③) 옮기고 경로만 바꿨다 — VV5~VV8.
> 근거: `docs/PLAN-v2.0.md` 3·4·7·10·11·14·15·17절, 지휘자 지시(1판 머리말의 ①~⑥).
>
> **구조 변경이다**(저장 위치·플랫폼·배포·README 결정을 뒤집는다). 뒤집기는 사람 지시 ①②가 직접 정했다 — 그것이 승인 표시다(DESIGNER 3절). 자동 승인하지 않고 PR로 올린다.
>
> **끝났다의 뜻**: 레포에 웹 코드가 없고(웹은 GitHub Pages의 마지막 배포본으로 남는다), 아이폰에서 앱이 뜨고, 웹 기록이 Gist에서 **수치가 같게** 들어오고, 홈이 라이트·다크 모두 읽힌다.
>
> **성격**: 레포 변경은 **이제 웹에 닿지 않는다**(배포 워크플로를 지운다). 웹은 v2.2 세션 화면이 나올 때까지 마지막 배포본을 그대로 쓴다.
> 네이티브 앱은 이 라운드에서 **웹 기록의 읽기 전용 사본**이다 — 세션 기록·쓰기·Gist 올리기는 v2.2부터. 백업 형식 `SCHEMA_VERSION`(3)은 그대로다.

### 개정이 바꾼 것

| 자리 | 1판 · PLAN v2.0 | 개정 |
|---|---|---|
| 웹을 내리는 때 | v2.0 10절 v2.5 "웹 내리기", 2절 "Pages 배포는 웹을 내릴 때 끈다" | **지금.** `deploy.yml`을 지우고(VV1) 웹 코드를 지운다(VV2). Pages의 마지막 배포본은 그대로 둔다 |
| 앱의 자리 | 1판 `native/` 폴더, v2.5에 뿌리로 | **레포 뿌리**(v2.0 15절 모양을 지금, VV4) |
| 코어 분리 | 1판 웹과 같이 쓰도록 웹 import를 전부 고치고, 웹 전용 7+3+11개를 `src/lib`에 남김 | **웹 쪽 절반을 지우고 순수한 것만 `src/core`로.** `src/lib`·`src/store`가 없어진다(VV2·VV3) |
| PR 나눔 | 1판 PR 1 단독 — 매일 쓰는 웹을 혼자 되돌리려고 | 웹 보호 이유는 사라졌다. **PR 1 = 정리(VV1~VV3, 기기 불필요), PR 2 = 앱(VV4~VV8)** — 이유는 "설계자가 정한 것" |
| 검사 묶음 | 1판 웹 검사 그대로 + 네이티브 단계 추가 | 웹 검사(Astryx 뒷걸음·빌드·첫 화면 크기·화면 촬영)를 지우고 **한 패키지 한 묶음**: 흔적·경계·린트·knip·타입·테스트·번들 |
| 홈 "웹과 같은 답"의 조립식 스캔 | 1판 웹 `HomeScreen.tsx`와 양쪽을 읽는 상시 테스트 | 웹 소스가 레포에 없다 → **마지막 웹 소스(`WEB_FINAL`)와 한 번 대조하는 명령**(VV8, DEV-RECORD). 코어 함수를 다시 불러 비교하는 테스트는 그대로 |
| 데이터 이전 4 | 1판 v2.2가 "웹 업로드를 끄는 한 줄 배포"를 고를 수 있었다 | 배포가 없으므로 그 갈래가 없다. **사람이 웹에서 기록하지 않는 것**에 더해, v2.2 앱의 업로드가 **Gist가 자기 뒤에 바뀌었으면 건너뛰지 않는다**("데이터 이전" 4) |
| 식사 알림 | v2.0 9절 "웹에서는 지우지 않는다", 슬롯 함수 3개는 `diet.ts`로 | **지금 지운다**, 슬롯 함수 3개는 `diet.ts`로(VV2) |
| 첫 로드 크기 | v2.0 11.4 "앱 시작 시간과 빌드 크기" | v2.1은 **번들이 만들어지는가**만 검사(`expo export`). 크기 상한은 v2.5 |
| 디렉토리 | v2.0 15절 | 15절 그대로 + **화면 단위 폴더 `src/<화면>/`**(VV4 — `app/`은 파일마다 라우트가 된다) |

그대로인 것(③): SQLite 스키마(VV5) · Gist 가져오기(VV7) · 테마 토큰(VV6) · 홈(VV8) · 화면 문구 · 데이터 이전의 "전환일에 Gist에서 가져온다". 앱 → Gist 백업은 v2.2.

---

## 설계자가 정한 것 (지시가 맡긴 갈림길)

| 갈림길 | 정한 것 | 택하지 않은 것과 이유 |
|---|---|---|
| 앱의 자리 | **레포 뿌리 하나의 `package.json`**(Expo). 코어는 `src/core`, 앱은 v2.0 15절의 `src/app`·`src/db`·`src/platform`·`src/ui` | `native/` 유지: 1판의 이유(웹 React·Vite와 Expo 버전 충돌)가 웹을 지우면서 사라졌다. 패키지가 둘이면 설치·검사·테스트 러너가 두 벌이다 |
| PR을 몇 개로 | **PR 1 정리(VV1~VV3) · PR 2 앱(VV4~VV8)** | 하나로: 수천 줄 지움과 새 앱이 한 diff에 섞여 리뷰의 초점("순수한 것을 잃지 않았나")이 묻히고, 기기 검증이 막히면(서명 만료 등) 정리까지 묶인다. PR 1은 기기가 필요 없어 맥북 빌드를 한 번 더 하지 않는다(1판 1라운드 "PR 2를 둘로" 기각 이유가 여기엔 없다) |
| 웹 배포 끄는 법 | **`deploy.yml` 파일을 지운다** | `on:`을 `workflow_dispatch`만: 지운 웹을 빌드할 수 없는 손잡이만 남는다 · `gh workflow disable`: 저장소 설정이라 레포에 흔적이 없고, 사람 몫의 바깥 동작이다 |
| 마지막 웹 소스 | **`WEB_FINAL` = 마지막으로 성공한 배포의 커밋 SHA**를 README·DEV-RECORD·PR 1 본문에 적는다. 태그는 만들지 않는다 | 태그: 레포 밖으로 나가는 동작이 하나 늘고, `git show <SHA>:<경로>`로 충분하다 |
| 웹 쪽 절반 | **지운다.** 순수하지만 v2.2 이후에 쓸 조각(휴식 타이머 계산·소리 값·동기화 규칙)도 지금은 지우고, 단계 PLAN이 `git show WEB_FINAL:<경로>`로 가져온다(VV2 "다음 단계가 가져올 것" 표) | 지금 순수 절반을 떼어 코어로: v2.2 모듈 모양을 미리 정하게 되고, VV2가 기계적인 지우기에서 설계 작업으로 커진다 |
| `src/store`·zustand | **지운다**(의존성도) | 남기기: 세 store 모두 Dexie·웹 화면에 묶여 있다. v2.0 2절 "zustand 유지"는 v2.2가 세션 store를 SQLite 위에 다시 지을 때 다시 들인다 |
| 반쪽 파일의 이름 | `backup.ts`·`secrets.ts`·`seed.ts`는 **웹 쪽 함수를 지운 뒤 이름 그대로 코어로**. 새로 생기는 것은 `readModel.ts` 하나 | 1판의 `backupFormat`·`secretKeys`·`seedData`: 반쪽이 남는 쪽과 이름이 겹치지 않게 지은 이름이었다. 남는 쪽이 없다 |
| 웹과 섞인 테스트 | **`it` 단위로 주제가 지워진 것만 지운다. 남긴 `it`의 본문은 한 글자도 고치지 않는다**(VV2 3) — 기계 확인 둘(이름 집합·`+`줄). 웹·코어 경로를 한 배열에 섞은 스캔은 **지우는 원소만 뺀다**(코어 파일의 단일 출처 감시를 잃지 않으려고) | 파일째 지우기: 골든(GG1·JJ·KK·LL0·MM0·NN0)이 섞인 파일 안에 있어 같이 사라진다 · 고쳐서 살리기: 지운 웹을 흉내 내는 테스트가 된다 |
| 모듈 경로 | **상대 경로 하나. 별칭(`@core/…`)을 쓰지 않는다** | 1판의 `@core`: 패키지가 둘일 때 `../../src/core`를 막는 길이었다. 한 패키지에서는 vitest·Metro·tsc 셋에 별칭을 맞출 일만 남는다 |
| 테스트 러너 | **vitest 하나(뿌리, node 환경).** 테스트는 `react-native`를 읽는 파일을 import하지 않는다 — 화면 파일 밖의 순수 모듈(`homeModel`·`runImport`·`importBackup`·`palette.generated`)만 | jest-expo + RNTL: 1판 그대로 v2.2 |
| 레이어 경계 | `scripts/boundary.mjs` 하나가 **v2.0 15절의 규칙 셋**을 다 본다(코어 = VV3, 나머지 = VV4) | 코어만: 15절 규칙 2·3(`platform`만 기기 모듈, `ui`만 플랫폼 분기)이 글로만 남는다 |
| README 본문 | **구현자가 작업 커밋에서 고친다**(각 작업의 "README 반영") — 사람 확정 | 규칙 정비로: README는 지금 동작의 명세라 코드와 같은 커밋에 맞아야 하고, `RULES-KEEPER.md` 첫 줄의 범위(`CLAUDE.md`·`AGENTS.md`·`agents/`·안전장치)에 없다. 대신 **`CLAUDE.md`가 README 결정을 가리키는 줄**("뒤집는 것은 PLAN v2.0 목록뿐")은 규칙 정비에 넘긴다(VV9) |
| Astryx 패키지 | **사람 확정 A**: 토큰 생성의 출처로 **dev 의존성 고정(0.7.13)** — PR 1이 지우고 VV6이 dev로 다시 들인다. VV6 설치가 피어 충돌(ERESOLVE)을 내면 **B**(잠깐 깔아 한 번 생성, 패키지를 남기지 않는다 — VV6 0). 잠금 파일이 한 번 왕복하는 것은 일부러다: PR 1 시점에는 쓰는 곳이 없어 knip이 "안 쓰는 의존성"으로 막는다(`eslint-plugin-react-hooks`는 PR 1에도 `react-hooks` 블록이 써서 남긴다) | B 먼저: R12 "토큰 사본에 hex를 적지 않는다"를 기계가 확인하지 못한다. 지시 ③("토큰은 v2.1 그대로")을 A가 글자대로 지킨다 |

1판에서 그대로 둔 결정(경로만 바뀜): 화면 구조(스택 두 장, 탭바 없음) · 홈은 읽기 전용 · 가져오기는 전체 교체 + 다르면 되돌림 · Gist는 토큰만 받고 찾는다 · SQLite 행 = 기본키 + 승격 열 + `body` · 네이티브 테스트 vitest + `better-sqlite3` · 테마 값은 생성 스크립트 · Expo `name`은 `iwaedeul`(DisplayName `이왜들`) · `APPLE_TEAM_ID`는 `.env.local`(커밋 안 함) · `ios/`·`android/`는 커밋하지 않는다(CNG) · 매일 쓰는 설치본은 Release 구성.

---

## 작업 개요

| ID | 내용 | PR | 웹(Pages)이 바뀌나 |
|---|---|---|---|
| VV1 | 웹 배포 끄기(`deploy.yml` 지움) · `WEB_FINAL` 기록 | **PR 1** | 아니오 — 이 커밋부터 배포가 없다 |
| VV2 | 웹 지우기: 순수 조각 떼어 두기(`readModel` 등) → 화면·Dexie·PWA·웹 lib·웹 검사·Astryx 자료 지움 · 섞인 테스트 정리 · 헛도는 경로 막이 | **PR 1** | 아니오 |
| VV3 | 코어 이사(`src/lib`·`src/db`·`src/types.ts` → `src/core`) · 경계 검사(코어) | **PR 1** | 아니오 |
| VV4 | Expo 앱을 레포 뿌리에 · 식별자 · 경계 검사(레이어) · 검사 묶음에 번들 | PR 2 | 아니오 |
| VV5 | SQLite 스키마(Drizzle) · 행 변환 · 가져오기 엔진 · 기록 합계·지문 | PR 2 | 아니오 |
| VV6 | 테마 토큰 라이트·다크 한 벌 + `ui` 부품 | PR 2 | 아니오 |
| VV7 | Gist 찾기 · 가져오기 화면 · 토큰은 Keychain | PR 2 | 아니오 |
| VV8 | 홈 화면 · `docs/FEATURE-MAP.md` | PR 2 | 아니오 |
| VV9 | **규칙 정비에 넘길 것**(`CLAUDE.md`·`agents/**`·`REVIEW.md`·`RELIABILITY.md`·스킬) — 규칙 정비자 몫 | PR R1(PR 1 뒤) · PR R2(PR 2 뒤) | 아니오 |

---

## VV1. 웹 배포 끄기

### 진단
- `.github/workflows/deploy.yml`: `main` push → `npm ci` → `npm test` → `npm run build` → Pages. 웹 코드를 지운 뒤 이 워크플로가 남으면 `main` 머지마다 빌드가 실패하거나(스크립트가 없다), 무엇이든 만들어지면 그것이 폰의 웹앱을 덮는다.
- 마지막 성공 배포: `aa0f0be`(2026-11-26T11:28Z, `gh run list --workflow deploy.yml`). 앱 코드는 v1.21.0(`8404be8`)과 같고 그 뒤 커밋은 문서뿐이다.
- GitHub는 push된 커밋에 있는 워크플로 파일로 실행 여부를 정한다 — 파일이 없는 머지 커밋에서는 돌지 않는다. Pages는 새 배포가 없으면 마지막 배포본을 그대로 낸다.

### 설계
- `git rm .github/workflows/deploy.yml`. `ci.yml`(필수 검사 `ci` — `main` 보호 규칙이 이 job 이름을 본다, 이름을 바꾸지 않는다)·`security.yml`은 남긴다.
- `WEB_FINAL`: `gh run list --workflow deploy.yml --status success --limit 1 --json headSha,createdAt`의 `headSha`. PR 1 본문 맨 위·`docs/DEV-RECORD-v2.1.md`·README에 적는다. 지휘자는 PR 1 머지 직전에 같은 명령의 첫 줄이 같은지 본다 — 그사이 다른 PR(문서)이 머지돼 다시 배포됐으면 그 SHA로 고친다(웹 코드는 같다).
- 이 PLAN의 PR과 PR 1 사이에 머지되는 것은 문서뿐이라, 그 머지가 다시 배포해도 같은 웹이다.

### 검증
- `ls .github/workflows` → `ci.yml security.yml`(출력 복사). `git grep -n "deploy-pages\|upload-pages-artifact" -- .github` → 0줄.
- **사람이 볼 것**(PR 1 머지 뒤): `gh run list --workflow deploy.yml --limit 1`의 `headSha`가 `WEB_FINAL` 그대로이고(새 실행 없음), 폰의 웹앱이 평소처럼 열린다.

### 범위 제외
- Pages 사이트 내리기·`github-pages` 환경 지우기 — 웹을 v2.2까지 쓴다. 전환 뒤 사람이 한다(v2.5 체크리스트 입력).

### README 반영
- 머리 소개(1~11줄): `1인용 운동 기록 앱. 웹앱(PWA, v1.21.0)은 마지막 배포본으로 아래 주소에 남아 있고 레포에서는 지웠다(소스: 커밋 WEB_FINAL). 레포는 iOS 네이티브 앱(Expo)으로 옮기는 중이다 — docs/PLAN-v2.0.md.` 기술 줄(`React 19 · … · GitHub Pages`)은 VV4에서 바꾼다.
- "배포" 절: `배포 워크플로는 없다(v2.1~). 웹은 마지막 배포본(WEB_FINAL)이 Pages에 그대로 있고, 레포 변경은 그 웹에 닿지 않는다.` iOS 홈 화면 추가 안내 문단은 웹을 쓰는 동안 필요하므로 남긴다.

---

## VV2. 웹 지우기

### 진단
- `src/lib` 테스트 아닌 파일 57개(실측 `ls src/lib | grep -v '\.test\.'` — `testFixtures.ts`가 이름에 `test`를 가져 `grep -v test`로 세면 56이 된다): 그대로 코어로 갈 순수 파일 **37**(1판 VV1 표의 36 + `gist`) · 웹 쪽 함수만 지우면 순수해지는 **2**(`backup` — `createBackup`·`restoreBackup`이 Dexie, `backup.ts:118,259` / `secrets` — 토큰 읽기·쓰기·`maskToken`이 localStorage) · 남는 테스트가 쓰면 가는 **1**(`sourceScan`) · 지울 **17**.
- 읽기 정규화가 지울 훅·Dexie 안에 있다: `useDiet`가 `resolveTrainingDays`로 훈련일을 고치고(`useDiet.ts:58-63`), `getActiveRoutine`이 활성 루틴을(`db/index.ts:115`), `getOpenSession`이 진행 중 세션을(`db/index.ts:125`) 고른다. 그대로 지우면 네이티브가 규칙을 **따로 다시 쓰게** 된다.
- 순수한 것이 웹 파일에 섞여 있다: `bannerQueue`가 `store/ui.ts:23-26`의 상수 4개를 읽고, `mealCalendar`의 `parseTimeHint`(`:35`)·`allSlots`(`:52`)·`isTrainingOnlySlot`(`:157`)은 식단 슬롯 계산이다(v2.0 9절 "`diet.ts`로"). `useRoutine`의 `dayTotalSets`·`exerciseLabel`(`:27,31`)과 `useDiet`의 `findPlan`·`dietDayFor`(`:121,132`)는 순수 함수다.
- 테스트: `src/lib` 64개 + `src/components/NumberStepper.test.ts`, `it`·`test` 줄 1,668개(grep 근사). 웹을 전혀 읽지 않는 파일은 20개(364개). **나머지 45개는 웹 소스(`import.meta.glob`·`?raw`·`sourceScan`)나 웹 lib를 읽는 `it`이 섞여 있다**(`v120` 118개 중 96줄, `v121` 56개 중 40줄 등). 골든(`v111` GG1 · `v112` JJ1·JJ2 · `v113` KK · `v114` LL0 · `v115` MM0 · `v116` NN0)은 섞인 파일 안에 있다.
- **웹 경로와 코어 경로를 한 배열에 섞은 스캔이 19곳**(설계자 grep — 9개 파일: `audioIndependence` `dietAccess` `strengthWork` `v111` `v1112` `v113` `v114` `v115` `v116`). glob 인자 배열(`v113.test.ts:370` `sessionFactory.ts` + `HomeScreen.tsx` + `/src/lib/**`, `v114.test.ts:357` `ll3Sources`)과 `for … of [...]` 루프 배열(`v111.test.ts:618` 증량 판정이 `progression.ts` 밖에 없다 — `prefill`·`exportMarkdown`·`SummaryScreen`)이다. `it`을 통째로 지우면 남는 코어 파일(`exportMarkdown.ts`·`prefill.ts` 등)의 "판정·문구가 한 곳" 감시(REVIEW.md 2절 A부류)가 같이 사라진다. 배열 결과의 개수를 고정한 단언도 있다(`v114.test.ts:454` `toHaveLength(3)`).
- `backup.ts`의 `stripSecrets`(`:88`, export 안 됨)를 쓰는 곳은 지우는 `createBackup`(`:138`) 하나다. `secrets.ts:15-16` `PREFIX`·`GIST_TOKEN_KEY`도 지우는 토큰 함수만 쓴다. 그대로 두면 `noUnusedLocals`(`tsconfig.app.json:18`)가 타입 검사를 깨뜨린다.
- 테스트가 경로 문자열로 파일을 읽는다(`v116.test.ts:653` `nn1Src`는 `?? ""` — 없는 파일을 빈 글로 읽고 `.not.toMatch`가 **헛돌며 통과한다**, `:906`). 웹을 지우면 이런 자리가 대량으로 생긴다.
- `scripts/check.test.mjs:15-17`의 두 번째 단언은 느린 단계가 `npm run build`·`first-load`라고 고정한다 — 그 단계가 없어진다.

### 설계

**1) 떼어 둘 것** (같은 커밋, 지우기 전에 — 리뷰어는 같은 diff의 `-`줄과 `+`줄로 식이 같은지 본다)

| 새 자리 | 담는 것 | 옛 자리 |
|---|---|---|
| `src/lib/readModel.ts` (새 파일, VV3에서 코어로) | `RoutineBundle` + `buildRoutineBundle(routine, exercises)` · `pickActiveRoutine(routines, activeId)`(저장된 id가 있으면 그것, 없거나 깨졌으면 기본키 순 첫 루틴) · `pickOpenSession(sessions)`(끝나지 않은 것 중 `startedAt` 내림차순 첫 번째) · `settingValue(rows, key, fallback)`(`getSetting`(`db/index.ts:74-76`)의 식 그대로 — 행이 없으면 `fallback`, 있으면 `row.value`. `{key}`만 있는 행은 `undefined`다. 웹의 `currentPhase`·`activeRoutineId`가 이 길로 읽혔다(`store/settings.ts:78`, `db/index.ts:115`). `buildDietData`는 이것을 쓰지 않고 `useDiet`의 `?? fallback` 식을 그대로 옮긴다) · `buildDietData({ plans, rawDays, settings, sessions })`(`useDiet`의 조립과 `resolveTrainingDays` 정규화, `loading` 뺌) · `DietReadModel` · `findPlan` · `dietDayFor` · `dayTotalSets` · `exerciseLabel` | `useRoutine.ts` · `useDiet.ts` · `db/index.ts:74-133` |
| `src/lib/bannerQueue.ts` | `BANNER_DELOAD` `BANNER_BACKUP` `BANNER_PHASE` `BANNER_COMPENSATION` | `store/ui.ts:23-26` |
| `src/lib/diet.ts` (끝에 덧붙임, 본문 그대로) | `parseTimeHint` `allSlots` `isTrainingOnlySlot` | `mealCalendar.ts` |

반쪽 파일(남는 함수 본문은 그대로): `backup.ts`에서 `createBackup`·`restoreBackup`과 그것만 쓰던 import(`../db`) · `secrets.ts`에서 `getGistToken`·`setGistToken`·`maskToken`과 그것만 쓰던 비공개 상수 `PREFIX`·`GIST_TOKEN_KEY` · `db/seed.ts`에서 `SeedResult`·`ensureSeed`.
**`stripSecrets`(`backup.ts:88`)는 앞에 `export`만 붙여 남긴다(본문 그대로)** — 백업 형식의 "무엇을 빼는가" 규칙이라 `SYNC_BOOKKEEPING_KEYS` 옆에 있어야 하고(`:99` 주석), VV5 가져오기가 같은 함수를 부른다(걸러내기를 두 곳에 두지 않는다). 쓰는 곳이 VV5까지 없지만 knip `entry`(5)가 받는다. REVIEW.md 3절 사람 필요 경로(`lib/backup.ts`·`lib/secrets.ts`)라 이 줄로 정한다 — 구현자가 고르지 않는다.

**2) 지울 것** (`git rm`)

| 묶음 | 경로 |
|---|---|
| 화면·부품·앱 틀 | `src/screens/` `src/components/` `src/ax/` `src/store/` `src/App.tsx` `src/main.tsx` `index.html` `public/` |
| Dexie | `src/db/index.ts` (`src/db/`에 남는 `seed.ts` `validateRoutine.ts` `validateDietPlan.ts`는 VV3이 옮긴다) |
| `src/lib` 웹 전용 17 | `beep` `chartTheme` `commitEdits` `gistSync` `inputProps` `mealCalendar` `pickFile` `platform` `routineStore` `share` `useDiet` `useExerciseSettings` `usePwaUpdate` `useRestTimer` `useRoutine` `useRoutineEditContext` `useSessionEditor` |
| 빌드·PWA 설정 | `vite.config.ts` `tsconfig.app.json` `tsconfig.node.json` |
| 웹 검사 스크립트 | `scripts/argos-upload.mjs` `astryx-inventory.mjs` `first-load.mjs` `first-screen.mjs` `screenshots.mjs` `ui-check.mjs` · `scripts/lib/`(`first-load-lib` `ui-check-lib` `ui-space`) |
| 웹 검사 테스트 | `scripts/rr3` `rr5-wrap` `rr7` `rr8` `rr9` `rr10` `rr11` `ss0` `ss2` `ss3` `ss4` `ss5` `ss6` `ss7` `ss8` `ui-space` `ui-check-lib` (`.test.mjs`) |
| Astryx 자료 | `docs/ASTRYX-INVENTORY.md` (`docs/DESIGN.md` 9절은 규칙 문서라 VV9) |
| 의존성 | dependencies 전부(`@astryxdesign/core` `@astryxdesign/theme-neutral` `@stylexjs/stylex` `dexie` `dexie-react-hooks` `react` `react-dom` `recharts` `zustand`) · dev: `@argos-ci/cli` `@axe-core/playwright` `playwright` `@vitejs/plugin-react` `vite-plugin-pwa` `eslint-plugin-jsx-a11y` `@types/react` `@types/react-dom` · `knip.json`의 `ignoreDependencies: ["@argos-ci/cli"]`(의존성과 함께 — 남기면 knip이 설정 힌트를 낸다) |

남는 dev 의존성: `typescript` `vitest` `vite`(`src/vite-env.d.ts`의 `vite/client` 타입 — 테스트의 `import.meta.glob`. vitest는 자기 안의 vite 8 `node_modules/vitest/node_modules/vite`로 돈다) `fast-check` `eslint` `@eslint/js` `typescript-eslint` `eslint-plugin-react-hooks`(VV4가 다시 쓴다 — 지우고 다시 들이는 잠금 파일 왕복을 피한다) `globals` `knip` `@stryker-mutator/*`.
지우지 않는 것: `docs/` 아래 과거 기록·스크린샷(`docs/screenshots/**`, `docs/v1.1*`·`v1.20` 폴더) — REVIEW.md 4절 "지난 판단의 기록". 뿌리 `PLAN-v1.1.md`도 같다.

**3) 테스트 처리 규칙** (`it`·`test` 하나마다. 정본은 규칙이다)

| 그 `it`이 | 처리 |
|---|---|
| **경로 배열**(`import.meta.glob` 첫 인자 배열, `for … of [...]`의 경로 문자열 배열)에 2)에서 지우는 경로(파일, 또는 지우는 폴더 아래를 가리키는 glob — `'/src/screens/*.tsx'`)와 남는 경로가 섞여 있다 — `describe`·모듈 단위의 배열도 같다 | **지우는 원소만 뺀다.** 같은 줄의 나머지는 한 글자도 고치지 않는다. 그 배열 결과의 개수를 고정한 단언(`toHaveLength(n)` — `v114.test.ts:454`)은 `n`만 뺀 원소 수만큼 줄인다(헛돌기 막이라 남긴다). 배열이 비면 첫 줄 규칙. 원소를 뺀 뒤 아래 줄들을 다시 본다 |
| 단언 문장 하나(`expect(…)` 한 문장)가 지우는 경로**만** 읽는다(배열 밖 경로 리터럴 — `v113.test.ts:939` `count(src('/src/screens/HomeScreen.tsx'), 'dayGapNotice(')`)이고 같은 `it`에 남는 경로를 읽는 단언이 있다 | **그 문장만 지운다.** 남는 단언이 없으면 첫 줄 규칙 |
| 2)에서 지우는 파일의 소스·CSS를 읽는다(glob·`?raw`·`fs`·`sourceScan` 맵의 키나 경로 리터럴이 지우는 경로) | **지운다** — 주제가 없어졌다 |
| 2)에서 지우는 모듈의 함수·상수를 부른다 | **지운다** |
| 브라우저·DOM·Dexie·localStorage·서비스워커 동작을 단언한다 | **지운다** |
| 위에 안 걸린다 | **남긴다. 본문을 한 글자도 고치지 않는다.** 1)에서 옮긴 이름은 지운 것이 아니다 — import 줄만 새 자리로 고친다(`'./useRoutine'` → `'./readModel'`, `'../store/ui'` → `'./bannerQueue'`, `'./mealCalendar'` → `'./diet'`) |

- `describe`의 `it`이 전부 지워지면 `describe`를, 그 `describe`만 쓰던 픽스처·도우미·상수를 지운다(남은 것은 `noUnusedLocals`·린트가 알린다). 파일의 `it`이 전부 지워지면 파일째 지운다. `mealCalendar.test.ts`는 남는 `it`(시각 파싱·슬롯 합집합)만 두고 `git mv`로 `dietSlots.test.ts`가 된다.
- 위 두 줄(원소 빼기·문장 지우기)로 바꾼 자리는 DEV-RECORD에 **파일:줄 · 뺀 원소나 지운 문장 · 남은 경로** 표로 적는다. `it`·`describe` 제목은 고치지 않는다(제목에 웹 파일 이름이 남아도 — 이름 집합 확인이 제목으로 본다).
- **넓은 glob 스캔은 남긴다**: `/src/**/*.{ts,tsx}` 같은 패턴으로 "어디서도 X를 쓰지 않는다"를 보는 `it`(예 `v116.test.ts:901`)은 범위가 남은 파일로 줄 뿐 단언은 여전히 참이다. 특정 웹 파일을 키로 읽는 `it`(`nn1Src("src/screens/…")`)은 첫 줄 규칙으로 지운다.
- `properties.test.ts`: `../ax/clampStep`·`../screens/AnalyzeScreen`·`./chartTheme`을 쓰는 속성만 지운다(6) 표 — 그 단계가 함수와 같이 가져온다).
- `scripts/check.test.mjs:15-17`(느린 단계가 빌드·첫 화면 크기다)은 첫 줄 규칙으로 지운다. VV4가 번들 단계의 단언을 새로 더한다.
- **골든은 전부 남는다.** 골든은 아래 일곱 `describe`(제목 그대로)이고 그 밖은 골든이 아니다: `'GG1 골든 (리팩터링 전 기준)'`(`v111:350`) · `'JJ1 — 생성 불변 (골든)'`(`v112:157`) · `'JJ2 — normal 불변 (골든)'`(`v112:172`) · `'KK 골든'`(`v113:488`) · `'LL0 골든 — v1.13 출력'`(`v114:81`) · `'MM0 골든 — v1.14 출력 고정'`(`v115:149`) · `'NN0 골든 — v1.15 출력 고정'`(`v116:620`). 이 일곱의 `it`이 하나라도 규칙에 걸리면 **멈추고 보고한다** — 골든은 내보내기·판정 글자를 고정한 것이라 웹을 읽을 리 없다. 걸리면 규칙이나 판단이 틀린 것이다. 이름이 `GG1`·`JJ1`·`JJ2`·`KK`로 시작하는 나머지 `describe`(`'GG1 — 소스 스캔 (초크포인트)'` 등)는 골든이 아니라 위 규칙을 그대로 따른다.
- 판단이 서지 않는 `it`(웹 소스와 코어 함수를 같이 쓰는 등)은 지우지 않고 DEV-RECORD에 줄 번호와 함께 적고 멈춘다.

**4) 헛도는 경로 막이** — `scripts/test-paths.test.mjs` (1판 `vv1-paths` 규칙 그대로, `node:fs`라 `scripts/`에)
- glob: `src`·`scripts` 테스트의 `import.meta.glob(…)` 첫 인자 리터럴(문자열·문자열 배열 — **배열이면 원소마다**)이 **실제 파일 하나 이상과 맞는다.** 그래서 3) 원소 빼기에서 웹 원소를 남기면 이 막이가 잡는다. `!` 제외 패턴은 `!`를 뗀 패턴으로 본다(`v113.test.ts:369`).
- 경로 리터럴: `src/**/*.test.ts(x)`만. `src/`·`/src/`로 시작하고 `.ts` `.tsx` `.mjs` `.css` `.json`으로 끝나는 문자열 리터럴(따옴표·`${` 없는 백틱)이 **실제 파일이다.** `*` `{` `?`가 든 것은 건너뛴다(glob 쪽이 본다). `scripts/*.test.mjs`는 대상이 아니다(순수 함수에 넣는 가짜 입력). 일부러 없는 파일을 가리키는 것은 허용 목록에 `경로 — 이유`.
- 템플릿(`${…}`)·glob 문자로 건너뛴 수와 허용 목록 길이를 단언한다(구현자가 VV2 끝에 세어 고정, VV3에서 다시 센다).

**5) 설정**

| 파일 | 바꿈 |
|---|---|
| `tsconfig.json` | `references` 묶음을 **한 파일**로: 지금 `tsconfig.app.json`의 `compilerOptions`에서 `jsx`와 `types`(PWA 둘 + `vite/client`)를 빼고 `include: ["src"]`. `lib`의 DOM은 둔다(코어가 `fetch`·`crypto`·`structuredClone`의 타입을 거기서 받는다 — 브라우저 전역을 막는 것은 경계 검사다) |
| `src/vite-env.d.ts` | `/// <reference types="vite/client" />` 한 줄만(테스트의 `import.meta.glob` 타입). `__APP_VERSION__` 선언은 지운다 |
| `package.json` `scripts` | `dev` `build` `preview` 지움 · `typecheck`를 `tsc --noEmit`로 |
| `scripts/check.mjs` `STEPS` · `ci.yml` | `Astryx 뒷걸음`·`빌드`·`첫 화면 크기` 지움, `테스트` 앞에 `{ name: '타입', cmd: 'npm run typecheck' }`(지금까지 빌드의 `tsc -b`가 하던 일). 결과: 흔적 검사 · 린트 · 안 쓰는 파일·의존성 · 타입 · 테스트 |
| `eslint.config.js` | `jsx-a11y` 가져오기·규칙을 지운다(DOM 규칙). `react-hooks` 블록은 그대로 둔다 |
| `knip.json` | 화면이 없어 아무도 import하지 않는 코어 파일이 생긴다 — `entry`에 `src/lib/*.ts`(VV3에서 `src/core/*.ts`). 소비자(화면)는 v2.1~v2.3에 다시 생긴다. `src/db/*.ts`도 knip이 알리면 같은 이유로 |
| `eslint-suppressions.json` | VV2 끝에 `npm run lint -- --prune-suppressions` — 지운 파일의 키와, `it`을 지워 줄어든 개수(`v113`·`v116`·`v18` 등)를 맞춘다. **새 항목·늘어난 개수는 없다**(`--suppress-all`·`--suppress-rule`을 쓰지 않는다). diff는 키 삭제와 `count` 감소뿐이다(복사) |
| `scripts/quality-allow.json` | 지운 파일을 가리키는 항목을 지운다(새 항목을 더하지 않는다). `testSupport`의 `sourceScan`은 남는 테스트가 쓰면 둔다, 아니면 파일과 함께 지운다 |

**6) 다음 단계가 가져올 것** (지금 지우되 잃지 않는다 — 단계 PLAN의 입력. 원본은 `git show WEB_FINAL:<경로>`)

| 무엇 | 원본 | 받는 단계 |
|---|---|---|
| 휴식 타이머 계산(`extendEndTime` `adjustTotalSec` `isRestorable` `countdownSecond` `dismissIfUnchanged` 상수)과 그 테스트(`useRestTimer.test.ts`, `v18.test.ts`의 해당 `it`) | `src/lib/useRestTimer.ts` | v2.2 |
| 소리 값(`TICK` `CHIME` `LAST_CYCLE_CUE` `VOLUME_SCALES` — v2.0 2절 "값으로 그대로") | `src/lib/beep.ts` | v2.2 |
| Gist 자동 백업 규칙(디바운스 `SYNC_DEBOUNCE_MS`, 지문이 같으면 건너뜀, `backupReminder`)과 테스트(`backupTime`·`dietBackup`·`gist.test.ts`의 `gistSync` 부분) | `src/lib/gistSync.ts` | v2.2 |
| 세션 store(진행 중 세션 부팅), 세션 편집 훅 | `src/store/session.ts` `src/lib/useSessionEditor.ts` | v2.2 |
| 루틴 저장 규칙(번들과 같은 id로 저장하지 않는다 — RELIABILITY R16) | `src/lib/routineStore.ts` | v2.3 |
| 스테퍼의 다음 값 `clampStep`과 그 속성(`properties.test.ts` "[min, max]를 벗어나지 않는다") | `src/ax/clampStep.ts` | v2.2 (세트 입력) |
| 감각 점수 점 `sensoryDot`과 그 속성(단조·0~3) | `src/screens/AnalyzeScreen.tsx:59` | v2.3 (분석) |
| 차트 색 `chartColor`·`ChartColorKey`와 그 속성(v2.0 3절 어댑터 목록) | `src/lib/chartTheme.ts` | v2.3 (분석) |
| 공유 결과 문구 `OUTCOME_MESSAGE` | `src/lib/share.ts:85` | v2.3 (내보내기) |
| 웹 화면의 문구·배치 | `src/screens/*` `src/components/*` | v2.2·v2.3 (홈은 VV8) |

### 검증 (`src/lib/v21.test.ts` describe `VV2`, `scripts/test-paths.test.mjs`)
- **이름 집합**: VV2 전(`main`)과 후에 `npx vitest run --reporter=json --outputFile=<스크래치>/{before,after}.json`. 테스트 이름(`assertionResults[].fullName` — 파일 경로 없음)별 개수로 비교해 **후에만 있는 이름이 0개**(VV2가 더한 `VV2` describe와 새 속성, `test-paths` 제외). 지운 이름은 DEV-RECORD에 **파일 · 전 · 후 · 지운 이유(규칙 줄)** 표로(개수와 `describe` 묶음 단위. 이름 1천여 개를 늘어놓지 않는다).
- **남긴 본문 불변**: 아래 출력에 남는 줄은 **`properties.test.ts`에 VV2가 더한 속성 줄**과 **3) 원소 빼기로 줄인 `toHaveLength(n)` 줄**뿐이다(복사). 그 밖의 줄이 있으면 줄마다 무엇인지 DEV-RECORD에. `-`줄에서 지우는 경로 원소를 뺀 것과 같은 `+`줄은 거른다 — 원소 빼기로 바뀐 줄은 나오지 않는다.
  ```sh
  W="beep|chartTheme|commitEdits|gistSync|inputProps|mealCalendar|pickFile|platform|routineStore|share|useDiet|useExerciseSettings|usePwaUpdate|useRestTimer|useRoutine|useRoutineEditContext|useSessionEditor"
  DEL="['\"](/?src/(screens|components|ax|store)/[^'\"]*|/?src/(App|main)\.tsx|/?src/db/index\.ts|/?src/lib/($W)\.ts)['\"]"
  d() { git diff -M --diff-filter=MR main..HEAD -- '*.test.ts' '*.test.mjs' | grep -E "^[$1][^-+]" \
        | grep -vE '^[-+]\s*(import |\} from |[A-Za-z_, ]+,?$)' | sed -E "s#$DEL,? ?##g; s#, *\]#]#g" | cut -c2- | LC_ALL=C sort -u; }
  LC_ALL=C comm -13 <(d -) <(d +)
  ```
  (`--diff-filter=MR` — 새 파일 `v21.test.ts`·`test-paths.test.mjs`는 빠지고, `mealCalendar` → `dietSlots` 같은 이름 바꿈은 들어간다. 여러 줄 import 묶음 안의 이름 줄은 둘째 `grep`이 거른다. 원소 빼기로 바뀐 줄은 3)의 DEV-RECORD 표가 센다.)
- 골든 `describe` 일곱(3)의 제목 그대로 — `GG1 골든 (리팩터링 전 기준)` · `JJ1 — 생성 불변 (골든)` · `JJ2 — normal 불변 (골든)` · `KK 골든` · `LL0 골든 — v1.13 출력` · `MM0 골든 — v1.14 출력 고정` · `NN0 골든 — v1.15 출력 고정`)의 `it` 이름이 후에도 전부 있다. 전후 JSON에서 `fullName`이 이 일곱 제목으로 시작하는 이름 목록을 뽑아 `diff` → 빈 출력(복사).
- 원소 빼기·문장 지우기 표(3))의 자리마다 남은 `it`이 통과한다. 그 표의 "남은 경로"는 전부 코어에 남는 파일이다.
- 헛도는 경로 막이: 지금 모든 glob·경로 리터럴이 파일과 맞는다(허용 목록 제외).
- `readModel` 동등(1판 그대로): `pickActiveRoutine` — 활성 id가 있고 존재 / 없음 / 지워진 루틴 / 루틴 0개 → `undefined`. `pickOpenSession` — 끝나지 않은 둘 중 `startedAt`이 늦은 것 / 전부 끝남 → `undefined`. `buildDietData` — 옛 플랜을 쓰는 날의 `isTrainingDay`가 근력 세션 날짜로 고쳐진다, 유산소만 한 날은 휴식일. `settingValue` — 행 없음 → `fallback` / `{ key, value: 0 }` → `0`(거짓 값도 값이다) / `{key}`만 있는 행 → `undefined`(`getSetting`과 같다. 그런 행은 웹의 `deleteSettings`가 막아 실제로는 없다).
- **속성**(`src/lib/properties.test.ts`): `pickOpenSession`·`pickActiveRoutine`은 배열 순서를 바꿔도 같은 것을 고른다. 생성기는 `startedAt`·루틴 `id`를 서로 다르게 만든다(동점은 아래 "정렬 동점" — 지금 동작이고 이 속성의 대상이 아니다).
- `npm run check -- --fast` 표 복사(5개 단계 전부 통과). 린트가 "정리되지 않은 억제"로 실패하지 않는다(5) prune).
- `git ls-files src | sed 's#/[^/]*$##' | sort -u` → `src` `src/data` `src/db` `src/lib`만(복사).

### 정렬 동점의 순서 의존 (기록만 — 1판 그대로)

| 규칙 | 어디서 | 동점이면 |
|---|---|---|
| 진행 중 세션 = `startedAt` 내림차순 첫 번째 | `pickOpenSession`(옛 `db/index.ts:126-129`) | 입력 순서(안정 정렬). 실제 기록에서 ms까지 같은 시작 시각은 생기지 않는다 |
| 끝난 세션 = `date`·`startedAt` 내림차순 | `derive.ts:24-28` `completedSessions` | 같음. 고치면 판정 내용이 바뀌므로 범위 밖 |

### 범위 제외
- 남는 코어 파일의 **내용** 수정(이름·시그니처·정리) — 지우기와 섞으면 diff가 읽히지 않는다. 예외는 1)의 `stripSecrets` 앞 `export` 한 단어와 반쪽 파일의 지우기뿐이다.
- 6) 표의 조각을 지금 코어로 떼기 — "설계자가 정한 것".
- `crypto.randomUUID`(Hermes에 없다, `sessionFactory.ts:127`·`routineEdit.ts:184`) — v2.2가 세션을 만들기 전에 `src/platform`에서 `expo-crypto`로. `structuredClone`(`routineEdit.ts:68,95`)은 v2.3 전에 기기에서 확인. `Number#toLocaleString`(`diet.ts:605`, 모듈을 읽을 때 부른다)은 VV4 실기기에서 앱이 뜨면 통과.

### README 반영
- "기능" 표 위에 한 줄: `웹앱 v1.21.0(마지막 배포본) 기준이다. 네이티브로 옮기는 순서는 PLAN v2.0 10절.`
- "핵심 설계 결정" `### iOS · PWA` 절을 세 줄로 바꾼다: `웹앱(PWA)의 결정 — 서비스워커·AudioContext·Astryx 테마·화면 나눠 읽기·여백·한글 줄바꿈 — 은 웹 소스와 함께 WEB_FINAL의 README에 있다. 네이티브가 이어받는 것은 그 단계 PLAN이 이 문서에 다시 적는다(휴식 타이머는 종료 시각을 저장한다 — v2.2).`
- "백업 · 비밀값" 첫 항목: `세 겹` 설명을 `웹(WEB_FINAL)은 세 겹으로 막았다. 레포에는 백업 형식이 거르는 겹(stripSecrets·isSecretSettingKey, src/core/backup.ts·secrets.ts)이 남고, 네이티브의 토큰 저장은 VV7.`로. 나머지 두 항목(1MB `raw_url`, 403 구분)은 `gist.ts` 그대로라 둔다.
- "Architecture" 그림을 지운다(VV4가 새로 그린다). "내보내기" 절을 지운다(`navigator.share` — 네이티브 공유는 v2.3).
- "Limitations" 맨 위에 한 줄: `아래는 웹앱(v1.21.0)의 한계다. 네이티브에서 열리는 것은 PLAN v2.0 1절.`
- "데이터 모델" 끝 문단의 `Dexie 테이블은` → `웹 IndexedDB(Dexie)의 테이블은`(VV5가 SQLite 줄을 더한다). "구현 현황"은 과거 기록이라 둔다.

---

## VV3. 코어 이사와 경계 검사

### 진단
- VV2 뒤 `src/lib`·`src/db`·`src/types.ts`에는 순수한 것만 남는다. 웹 테스트가 지워져 남은 테스트의 import도 그 안과 `src/data`·`vitest`·`fast-check`뿐이다 — 1판의 "옮길 테스트를 고르는 규칙"이 필요 없다.
- 남은 테스트의 glob·경로 리터럴이 `/src/lib/…`을 가리킨다(`v1111.test.ts:134` 등). 옮기면 헛돈다 — VV2의 막이가 잡는다.
- `scripts/mutation.mjs`가 `src/lib`만 본다(`:20-21`·`:63`·안내 `:8-9`·`:68`). `stryker.config.json` `mutate`도 `src/lib`.

### 설계
**1) 옮기기** (`git mv`, 내용은 import 경로·glob 경로·경로 리터럴만)
- `src/lib/*`(테스트 포함 전부) → `src/core/` · `src/types.ts` → `src/core/types.ts` · `src/db/seed.ts` `validateRoutine.ts` `validateDietPlan.ts` → `src/core/`. `src/lib`·`src/db`는 없어진다(VV5가 `src/db`를 SQLite로 다시 만든다). `src/data/`는 그대로(`../data/x.json`은 깊이가 같아 그대로 맞는다).
- 다시-내보내기 파일을 남기지 않는다. import `../types` → `./types`, `../db/seed` → `./seed` 등.
- glob·`?raw` 경로와 테스트 본문의 경로 리터럴: `/src/lib/…`·`/src/db/…`·`/src/types.ts` → `/src/core/…`. 기대 목록은 정렬 순서만 맞춘다.
- 뒤따라: `stryker.config.json` `mutate` → `src/core/**/*.ts`(테스트 제외) · `scripts/mutation.mjs`의 `isTarget`·`git diff … -- 'src/lib'`·안내 글을 `src/core`로 · `scripts/mutation.test.mjs`의 `src/lib` 경로 리터럴을 `src/core`로(판정 대상 디렉터리가 옮겨졌다 — 경로만) · `quality-allow.json` `testSupport` · `eslint-suppressions.json` **모든 키**의 `src/lib/`·`src/db/` → `src/core/`(VV2 뒤 남는 키 — `backup.ts`의 `fingerprintPayload` `exportedAt: _ignored`와 남는 테스트 파일들 `dayChoice`·`guideFinish`·`polish`·`seedRepair`·`uiConsistency`·`v113`·`v116`·`v18` 등), 이어 `npm run lint -- --prune-suppressions`로 개수가 그대로인지 본다(diff는 키 이름만 — 복사. 새 항목을 더하지 않는다) · `knip.json` `entry` `src/core/*.ts`.

**2) 경계 검사** — `scripts/boundary.mjs` (+ `scripts/boundary.test.mjs`)
- 순수 함수 `checkCore(files: {path, text}[]): {path, line, kind, detail}[]`와 `main`(`--check`면 위반 시 종료 코드 1, 위반마다 `경로:줄 — 무엇 — 고치는 법`). VV4가 `checkLayers`를 더한다.
- 허용 목록 방식(1판 그대로):

  | 대상 | 허용되는 import 지정자 |
  |---|---|
  | 코어의 모든 파일 | 상대 경로이고 풀면 `src/core/` 안, 또는 `src/data/`의 `.json` |
  | 테스트 파일(`*.test.ts`)만 추가로 | `vitest`, `fast-check` |

  `import … from` · `export … from` · `import(…)` · `require(…)` 전부. 지정자는 원문에서, 전역은 주석·문자열을 지운 글에서(`quality-scan.mjs`의 `stripComments` 규칙).
- 금지 전역(테스트 아닌 코어 파일): `window` `document` `navigator` `localStorage` `sessionStorage` `indexedDB` `AudioContext` `webkitAudioContext` `URL.createObjectURL` `import.meta` `__APP_VERSION__`. `fetch`·`crypto`·`Intl`·`structuredClone`은 막지 않는다(VV2 범위 제외의 Hermes 표).
- `STEPS`·`ci.yml`: `흔적 검사` 다음 자리에 `{ name: '경계', cmd: 'node scripts/boundary.mjs --check' }`.

### 검증 (`src/core/v21.test.ts`, `scripts/boundary.test.mjs`)
- `checkCore`(1판 목록): `'react'` 위반 / `'../db/schema'` 위반 / `'../platform/secureToken'` 위반 / `'expo-sqlite'` 위반 / `'dexie'` 위반 / `'@astryxdesign/core'` 위반 / `'./derive'` 통과 / `'../data/exercises.json'` 통과 / `'../data/x.ts'` 위반 / 테스트의 `'vitest'`·`'fast-check'` 통과 / 테스트 아닌 파일의 `'vitest'` 위반 / `await import('react-native')` 위반 / `window.addEventListener` 위반 / 주석 안 "window" 통과 / 문자열 `'document'` 통과 / `typeof document` 위반 / `import.meta.glob` 위반(테스트 아닌 파일).
- 지금 `src/core` 전체에 위반 0(`node scripts/boundary.mjs --check; echo $?` → `0`, 복사).
- `scripts/check.test.mjs`의 남은 단언(ci.yml과 STEPS가 같다) 통과.
- **이름 그대로**: 옮긴 테스트의 diff는 import·glob·경로 리터럴뿐이다(복사. `C` = VV3 커밋 해시).
  ```sh
  d() { git diff -M "$C~1" "$C" -- '*.test.ts' '*.test.mjs' | grep -E '^[-+][^-+]' | grep -vE '^[-+]\s*(import |\} from )' \
        | sed -E 's#/?src/(lib|db|core)/#src/~/#g; s#/?src/types\.ts#src/~/types.ts#g' | grep "^$1" | cut -c2- | $2 | sort; }
  srt() { perl -pe 's{\[([^\[\]]*)\]}{"[".join(", ", sort split /,\s*/, $1)."]"}ge'; }
  diff <(d - cat) <(d + cat)    # ① 그대로 비교
  diff <(d - srt) <(d + srt)    # ② 한 줄 배열의 원소를 정렬해 비교
  ```
  ②의 출력은 **비어 있다.** ①의 출력은 **정렬 순서만 맞춘 기대 목록 줄**뿐이다(예 `v116.test.ts:902` — `src/db/validateRoutine.ts`가 맨 앞에서 맨 뒤로 간다). ①에 나온 줄마다 DEV-RECORD에 파일:줄을 적는다 — ①과 ②의 차이가 곧 "정렬만 바뀐 줄"이다.
- 테스트 수: VV3 전후 `npm test 2>&1 | tail -5`의 파일 수·테스트 수가 같다(복사).
- 헛도는 경로 막이 통과, 건너뛴 수 단언을 다시 센 값으로(VV2 고정값과 같아야 한다 — 다르면 이유).
- `git ls-files src | sed 's#/[^/]*$##' | sort -u` → `src`(`vite-env.d.ts`) `src/core` `src/data`(복사).

### 범위 제외
- 코어 파일 내용 수정 — VV2와 같은 이유.
- `knip.json` `entry`의 `src/core/*.ts`를 걷기 — 화면이 다 생기는 v2.3 끝에(그때 안 쓰는 코어 파일을 knip이 다시 찾는다). v2.3 PLAN 입력.

### README 반영
- "프로젝트 구조"를 PR 1 모양으로: `src/core/ 판정·계산·타입·백업 형식·시드 상수 — 순수 TS. react·expo·DB를 import하지 않는다(경계 검사)` · `src/data/ 시드 JSON` · `scripts/ 검사·하네스 도구`. 끝 문단의 "`lib/`의 순수 함수로" → "`core/`의 순수 함수로", "IndexedDB 없이" → "DB 없이".
- "Tech Stack"을 PR 1 모양으로: `TypeScript · Vitest(fast-check) · ESLint · Knip · StrykerJS` + `앱: 전환 중 — VV4`. "Getting Started"를 `npm install` · `npm test` · `npm run check`로.

---

## VV4. Expo 앱을 레포 뿌리에

### 진단
- 앱이 없다. 식별자는 PLAN v2.0 17절로 정해졌다: `이왜들` · `com.joyanggi.iwaedeul` · slug·scheme `iwaedeul`.
- 무료 Apple 계정이라 빌드는 맥북 Xcode다(v2.0 11.2-A). 번들 ID를 바꾸면 7일 App ID 10개 한도를 먹는다.
- Expo Router는 `src/app`의 **파일마다 라우트**를 만든다 — 그 안에 부품·모델·테스트를 두면 라우트가 된다.

### 설계
**1) 만들기**: `npx create-expo-app@latest <스크래치>/iwaedeul`(그때의 최신 안정 SDK, 기본 템플릿)로 만든 뒤 **필요한 것만 뿌리로 옮긴다**: `package.json`의 `main`·dependencies·Expo 스크립트(뿌리 `package.json`에 합친다), tsconfig의 `extends`, `assets/`(템플릿 아이콘·스플래시 — v2.5에 바꾼다), `.gitignore` 항목. 예제 화면·부품·훅·상수·이미지, 템플릿의 ESLint 설정, `reset-project` 스크립트, 경로 별칭은 가져오지 않는다. SDK·React·RN 버전은 DEV-RECORD 첫 줄에(`npx expo --version`·`package.json`에서 — 기억으로 적지 않는다).

**2) 뿌리 구성**

```
package.json        name "iwaedeul", version "2.1.0", private, main "expo-router/entry" · "type": "module"을 뺀다(아래)
                    scripts: start · ios(expo run:ios) · typecheck(tsc --noEmit) · test(vitest run)
                             · lint · knip · mutation · check · db:generate(drizzle-kit generate)
app.config.ts       아래 표
metro.config.js     getDefaultConfig + resolver.sourceExts에 'sql' (CommonJS — module.exports)
babel.config.js     babel-preset-expo + inline-import(.sql — Drizzle 마이그레이션) (CommonJS)
eslint.config.mjs   지금 eslint.config.js를 git mv (ESM 그대로)
tsconfig.json       extends expo/tsconfig.base · strict와 지금 켠 엄격 옵션(noUnusedLocals 등) 유지 · 별칭 없음
vitest.config.mts   environment node · include 기본값 · exclude에 ios android .expo dist node_modules
drizzle.config.ts   dialect sqlite, driver expo, schema src/db/schema.ts, out drizzle
drizzle/            drizzle-kit가 만든 마이그레이션 — 손으로 고치지 않는다
assets/             템플릿 기본 아이콘·스플래시
.gitignore          + ios android .expo dist .env*.local *.db expo-env.d.ts
src/
  core/ data/       PR 1 그대로
  app/              Expo Router — _layout.tsx · index.tsx(홈) · import.tsx(가져오기). 라우트만 둔다
  db/               schema · client · rows · readAll · importBackup · runImport (VV5·VV7)
  platform/         secureToken.ts (VV7) — 기기 모듈을 부르는 곳
  ui/               palette.generated.ts · theme.ts · 부품 (VV6)
  home/             homeModel.ts(순수) · 홈 구역 부품 (VV8) — 화면 단위 폴더
```

**`"type": "module"`을 빼는 이유**: 지금 뿌리 `package.json`은 `"type": "module"`이다. 그대로면 Expo 템플릿 모양인 CommonJS `babel.config.js`·`metro.config.js`를 Babel·Metro가 동기로 읽다가 실패한다. Expo 도구가 기대하는 기본(`type` 없음)에 맞추고, ESM으로 쓰는 우리 파일만 확장자로 밝힌다 — `eslint.config.mjs`·`vitest.config.mts`(`scripts/*.mjs`는 이미 `.mjs`). 반대 길(`type` 유지 + `babel.config.cjs`·`metro.config.cjs`)은 Expo의 설정 탐색이 `.cjs`를 찾는지에 기대야 한다. `app.config.ts`·`drizzle.config.ts`는 각 도구가 직접 변환해 읽는다 — 검증의 `npx expo config`가 본다.

v2.0 15절에 더하는 것은 **화면 단위 폴더 `src/<화면>/`** 하나다(`app/`에 둘 수 없는 화면의 모델·구역 부품). v2.2는 `src/session/`을 만든다.

**3) `app.config.ts`** (1판 그대로)

| 키 | 값 |
|---|---|
| `name` · `slug` · `scheme` | `iwaedeul` |
| `version` | `2.1.0` |
| `orientation` | `portrait` |
| `platforms` | `['ios', 'android']` — Expo 웹 대상은 쓰지 않는다 |
| `userInterfaceStyle` | **`automatic`** — `light`면 `useColorScheme()`이 늘 라이트다 |
| `ios.bundleIdentifier` · `android.package` | `com.joyanggi.iwaedeul` |
| `ios.supportsTablet` | `false` |
| `ios.infoPlist.CFBundleDisplayName` | `이왜들` |
| `ios.appleTeamId` | `process.env.APPLE_TEAM_ID`(없으면 키를 넣지 않는다). 값은 뿌리 `.env.local` |
| `plugins` | `expo-router` `expo-sqlite` `expo-secure-store`(템플릿 것 외에) |
| 아이콘·스플래시 | 템플릿 기본값(v2.5) |

**4) 의존성**(`npx expo install`): `expo-sqlite` `expo-secure-store` `expo-dev-client` `@react-native-segmented-control/segmented-control` `drizzle-orm`. dev: `drizzle-kit` `babel-plugin-inline-import` `better-sqlite3` `@types/better-sqlite3`. 템플릿 의존성 중 예제를 지운 뒤 knip이 안 쓴다고 하는 것은 뺀다.

**5) 레이어 경계** — `scripts/boundary.mjs`에 `checkLayers(files)`를 더한다(v2.0 15절 규칙 2·3)

| 규칙 | 위반 |
|---|---|
| `expo-sqlite`·`drizzle-orm/expo-sqlite*` | `src/db/` 밖에서 import |
| 기기 모듈 — `expo-secure-store` `expo-haptics` `expo-audio` `expo-notifications` `expo-file-system` `expo-sharing` `expo-crypto` | `src/platform/` 밖에서 import |
| `Platform.select`·`Platform.OS` | `src/ui/` 밖에서 씀(주석·문자열 제외) |
| 테스트 파일(`*.test.*`) | `src/app/` 안에 있으면 위반(Expo Router가 라우트로 만든다) |

**6) 검사 묶음**

| 어디 | 바꿈 |
|---|---|
| `scripts/check.mjs` `STEPS` · `ci.yml` | 맨 끝에 `{ name: '번들', cmd: 'npx expo export --platform ios --output-dir dist', slow: true }` — Metro가 앱 전체(`src/core`·시드 JSON·`.sql` 포함)를 묶고 Hermes로 굽는가. `ci.yml`의 `setup-node`는 그대로(잠금 파일 하나) |
| `scripts/check.test.mjs` | `it` 하나를 **더한다**: `번들만 --fast에서 빠진다` → `['npx expo export --platform ios --output-dir dist']` |
| `eslint.config.mjs` | `ignores`에 `ios` `android` `.expo` `dist` `drizzle`. `react-hooks` 블록(VV2가 남겨 둔 것)이 `src/**/*.tsx`를 그대로 본다 |
| `knip.json` | `entry`에 `src/app/**/*.tsx`(라우트 — 파일이 곧 진입점), knip이 Expo를 알면 생략. 설정 파일들(`app.config.ts`·`metro`·`babel`·`drizzle`)은 knip이 알리면 `entry`에 |
| `scripts/quality-scan.mjs` | 고치지 않는다 — `src`·`scripts` 하나로 이미 다 본다(1판의 "두 번째 검사"가 필요 없다). 홈이 코어 함수를 베끼면 중복 정의로 막힌다 |
| `scripts/app-scans.test.mjs` (새) | 앱 쪽 소스 스캔을 모으는 곳(`node:fs`): VV6·VV7·VV8이 줄을 더한다 |

**7) 첫 실행 화면**: VV4 커밋 시점의 `src/app/index.tsx`는 제목 `이왜들`과 `todayLocal()`(코어) 결과를 보이는 자리표시 — Metro가 `src/core`를 실제로 묶는다는 증거. VV8이 홈으로 바꾼다.

### 검증
- `checkLayers`: `src/app/index.tsx`의 `'expo-sqlite'` 위반 / `src/db/client.ts`의 `'expo-sqlite'` 통과 / `src/home/x.ts`의 `'expo-haptics'` 위반 / `src/platform/secureToken.ts`의 `'expo-secure-store'` 통과 / `src/home/x.tsx`의 `Platform.OS` 위반 / `src/ui/Button.tsx`의 `Platform.select` 통과 / `src/app/x.test.ts` 위반 / 주석 안 `Platform.OS` 통과.
- `node -p "require('./package.json').type"` → `undefined` · `npx expo config --type public | grep -E "name|slug|bundleIdentifier"` → `iwaedeul`·`com.joyanggi.iwaedeul`(설정 파일이 읽힌다, 복사).
- `npm run check` 표에 `경계`·`타입`·`번들`이 보이고 전부 통과(복사). 린트 단계가 `eslint.config.mjs`를 읽는다(린트 위반 하나를 일부러 넣으면 실패 — 결함 복원 ⑥). `dist/`에 `_expo/static/js/ios/*.hbc`가 생긴다(`ls` 복사).
- **실기기**(verify-device 1절): `npx expo run:ios --device <UDID>` 성공 → 아이폰 홈 화면에 **`이왜들`** → 자리표시 화면에 오늘 날짜. `mobile_list_apps`에 `com.joyanggi.iwaedeul`(복사), `docs/screenshots/v2.1/device/boot-light.png`.

### 범위 제외
- 탭바, 아이콘·스플래시, 안드로이드 빌드(v2.5), EAS(유료 가입 뒤), OTA.
- 번들 크기 상한·시작 시간 측정 — v2.5(v2.0 11.4). v2.1은 `dist` 크기를 DEV-RECORD에 적기만 한다.
- 커밋 검증 도장(v2.0 11.5) — 훅을 바꾸는 하네스 일이라 규칙 정비자 몫(VV9).

### README 반영
- 머리 기술 줄: `Expo · React Native · TypeScript · expo-sqlite + Drizzle · expo-secure-store`(Pages 링크 줄은 VV1 문장 그대로).
- "Tech Stack": 런타임 Expo SDK(버전은 `package.json`이 말한다) · 화면 Expo Router · 저장 expo-sqlite + Drizzle · 비밀값 expo-secure-store · 테스트 Vitest(node) + better-sqlite3 · 검사 `npm run check`(흔적·경계·린트·knip·타입·테스트·번들) · 배포 맥북 Xcode → 아이폰(7일마다 재설치).
- "프로젝트 구조": 위 2) 트리의 `src/` 부분과 한 문단 — `app/은 라우트만, 화면의 모델·구역 부품은 src/<화면>/. core는 아무것도 모르고, 기기 모듈은 platform만, 플랫폼 분기는 ui만 부른다(scripts/boundary.mjs).`
- "Architecture": 그림 하나 — `src/app` → `src/home`·`src/ui` → `src/core` / `src/db`(SQLite) ← 가져오기 ← Gist / `src/platform`(Keychain).
- "Getting Started": `npm install` → `.env.local`에 `APPLE_TEAM_ID` → `npx expo run:ios --device` · `npm test` · `npm run check`.

---

## VV5. SQLite 스키마와 가져오기 엔진

(1판 VV3 그대로. 경로만 `native/src/db` → `src/db`, 코어 `backupFormat.ts` → `src/core/backup.ts`.)

### 진단
- PLAN v2.0 4.1: 일곱 테이블 그대로, 세션 중첩은 JSON, 쿼리에 쓰는 값만 열로 + 인덱스.
- 웹 행에는 열로 옮기면 모양이 바뀌는 것이 있다: `settings`의 값 없는 행(옛 `db/index.ts:101` 주석) — 열 `value`에 넣으면 `NULL`이 되어 `{key, value: null}`로 바뀐다.
- "같다"를 보이려면 잴 함수가 백업 쪽과 기기 쪽에서 같아야 한다 — 코어에 둔다.

### 설계

**1) 스키마** — `src/db/schema.ts` (Drizzle `sqliteTable`)

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
- 마이그레이션: `npm run db:generate`가 만든 `drizzle/0000_*.sql` 하나. 앱은 `useMigrations`(`drizzle-orm/expo-sqlite/migrator`), 테스트는 `migrate`(`drizzle-orm/better-sqlite3/migrator`)로 **같은 폴더**를 올린다.
- 승격 열을 지금 만드는 이유: 열과 인덱스는 v2.2~의 기록 달력·기간 조회가 쓴다. 원천 테이블을 처음 만들 때 넣는 것이 싸다(v2.0 1절 ⑥). v2.1 홈은 세션 전체를 읽는다(RELIABILITY R17 — 늘리지 않는다).

**2) 행 변환** — `src/db/rows.ts` (**유일한 쓰기 변환**): `sessionRow(s)` → `{ id, date, dayId, routineId, mode, startedAt, endedAt: s.endedAt ?? null, body: s }`. 승격 열은 여기서만 만든다. 나머지 여섯 테이블도 `xxxRow(obj)` 하나씩.

**3) 다시 읽기** — `src/db/readAll.ts`: `readAllTables(db): BackupTables` — 일곱 테이블을 **기본키 오름차순**으로 읽어 `body` 배열로. `BackupTables`는 `BackupFile`에서 `app`·`schemaVersion`·`exportedAt`을 뺀 것(`src/core/backup.ts`에 타입).

**4) 재기 — 코어** (`src/core/recordTotals.ts`, `src/core/backup.ts`에 더함)
- `recordTotals(t): RecordTotals` → `{ sessions, sets, volumeKg, dietDays, routines, exercises, settings, exerciseNotes, dietPlans }`. `sets` = Σ `totalDoneSets(s)`(워밍업·진행 중 포함), `volumeKg` = Σ `totalVolume(s)`(**제외 없이** — 대조용이다).
- `toTables(file)` — `app`·`schemaVersion`·`exportedAt`을 빼고 옛 백업에 없는 `exerciseNotes`·`dietPlans`·`dietDays`를 `[]`로(웹 `restoreBackup`의 `?? []`와 같다). **재기와 지문은 늘 `toTables`를 거친 값에.**
- `sortTables(t)` — 각 테이블을 기본키로 정렬(`<`). `contentDigest(t)` = `sortTables(t)`에서 `settings`의 동기화 부기 키를 빼고(`fingerprintPayload`와 같은 `SYNC_BOOKKEEPING_KEYS` — 거르는 식을 함수 하나로 빼서 둘이 같이 쓴다) `JSON.stringify`. 해시하지 않는다.
- `SYNC_BOOKKEEPING_KEYS`에 `'nativeImport'`를 더한다. 배포된 웹에는 닿지 않는다(웹 코드는 레포에 없다).

**5) 가져오기 엔진** — `src/db/importBackup.ts`
```ts
type AppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>   // expo-sqlite·better-sqlite3 둘 다 'sync'
type ImportOutcome =
  | { ok: true;  before: RecordTotals; after: RecordTotals }
  | { ok: false; reason: 'mismatch'; before: RecordTotals; after: RecordTotals; digestMatch: boolean }
  | { ok: false; reason: 'error'; message: string }
function importBackup(db: AppDb, file: BackupFile, now: Date): ImportOutcome   // 던지지 않는다
```
한 `db.transaction` 안, 동기:
1. `want = sortTables(toTables(file))`의 `settings`를 코어 `stripSecrets`(VV2 1)에서 export한 것 — 백업을 만들 때와 같은 함수)로 거른 것. `before = recordTotals(want)`, `wantDigest = contentDigest(want)`.
2. 일곱 테이블 `delete`.
3. `want`를 행 변환으로 `insert` — 100행씩.
4. `back = readAllTables(tx)`, `after = recordTotals(back)`, `digestMatch = contentDigest(back) === wantDigest`.
5. 아홉 칸이 모두 같고(`Object.is`) `digestMatch`면 → `settings`에 `{ key: 'nativeImport', value: { exportedAt: file.exportedAt, importedAt: now.toISOString() } }`를 넣고 커밋 → `ok: true`. 아니면 `tx.rollback()` → `mismatch`(기기는 그대로).
- 예외 갈래: `parseBackup`은 세션의 `id`·`date`·`entries`만 본다(`backup.ts:221-232`) — 기본키 중복·승격 열 `not null` 빠짐은 `insert`에서 던진다. 엔진이 잡아 `reason: 'error'`. `before`·`after`·`digestMatch`는 클로저 **밖** 변수, 바깥 `try/catch`에서 `TransactionRollbackError`면 `mismatch`, 그 밖은 `error`(`message` = `String(e.message ?? e)`).
- 입력은 이미 `parseBackup`을 통과한 파일이다(VV7이 부른다).

### 검증 (`src/db/importBackup.test.ts` — better-sqlite3 메모리 DB에 같은 마이그레이션)
- 픽스처: 코어 `testFixtures`로 세션 3건(끝난 2 + 진행 중 1, 워밍업·어시스티드 포함), 식단 2일, `{ key: 'legacyEmpty' }`, 한글·이모지, 소수 무게(2.5·1.25).
- 가져오면 `ok: true`, `before`=`after`, `settings`에 `{ key: 'legacyEmpty' }`가 **`value` 키 없이** 남는다.
- v1 백업(세 테이블 없음) → `ok: true`, 세 테이블이 비어 있다.
- 두 번 가져와도 `readAllTables`가 같다(`nativeImport` 행 빼고).
- 모든 `sessions` 행에서 승격 열 6개가 `body`의 같은 필드와 같다(`ended_at`은 진행 중이면 `NULL`).
- `gistToken` 행이 든 파일 → 들어가지 않는다, `ok: true`.
- **되돌리기**: A를 넣고 세트 무게 `NaN`인 B(JSON 왕복에서 `null`)를 가져오면 `mismatch`, `before.volumeKg`는 `NaN`·`after`는 수, `readAllTables`가 **A 그대로**.
- **예외**: A를 넣은 뒤 ① 같은 `id` 세션 둘 ② `startedAt` 없는 세션 → 각각 `reason: 'error'`, 예외가 밖으로 안 나오고 **A 그대로**.
- `PRAGMA index_list('sessions')`에 `sessions_date`·`sessions_day_date`.
- **차등**(v2.0 11.1 ② — 남는 차이는 저장소 왕복): 가져와 다시 읽은 표와 원래 표에서 `suggestNextDay`·`progressionSuggestions`(마지막 끝난 세션)·`weeklyVolume`·`e1rm` 최댓값·`phaseReadiness`가 `toEqual`로 같다.
- **속성**:
  - (`src/db/importBackup.test.ts`) 임의의 `BackupTables`(fast-check — 세션 0~20, 무게는 0.25의 배수, 설정 값은 `undefined`·`null`·수·문자열·중첩 객체) → 가져와 다시 읽으면 `contentDigest`가 같다.
  - (`src/core/properties.test.ts`) `recordTotals`·`contentDigest`는 행 순서를 섞어도 같다 · 서로 다른 id의 두 묶음 A·B에서 `recordTotals(A∪B)`의 `sessions`·`sets`·`volumeKg`는 합이다 · 세트 하나의 `reps`를 바꾸면 `contentDigest`가 바뀐다.

### 범위 제외
- 쓰기 API — v2.2가 만들 때 `isSecretSettingKey` 거부를 같이(R3).
- `sync_ledger`(v2.0 4.3) — v2.4. `CardioRecord` 시각(v2.0 1절 ⑩) — `body` 필드라 마이그레이션 불필요, v2.2. 번들 시드 넣기(빈 기기 첫 실행) — v2.2.

### README 반영
- "핵심 설계 결정"에 새 절 `### 네이티브 앱 (v2.1~)`, 첫 두 줄(1판 그대로):
  - **SQLite 행은 기본키 + 승격 열 + 원래 객체(JSON) 하나다.** 판정 함수가 세션 객체를 통째로 받으므로 정규화하지 않는다. 읽기는 JSON만 쓰고, 승격 열은 한 변환 함수가 JSON에서 만든다.
  - **가져오기는 넣고 다시 읽어 잰 뒤 다르면 되돌린다.** 세션·세트·총 볼륨·식단 일수와 테이블별 행 수, 내용 지문이 백업과 같아야 커밋된다. "들어갔다"가 아니라 "같다"가 조건이다.
- "데이터 모델" 끝에 한 줄: `앱은 같은 일곱 테이블을 SQLite(src/db/schema.ts)에 둔다 — 행 = 기본키 + 승격 열 + body(JSON).`

---

## VV6. 테마 토큰 한 벌 (라이트·다크) + `ui` 부품

(1판 VV5 그대로. 경로만 바뀌고, 앱 강조색의 출처가 지운 `src/ax/theme.ts`라 그 값을 아래에 적는다.)

### 진단
- 웹 다크에서 버튼 면·테두리가 바탕에 녹는다 — 원인은 토큰 값 셋(v2.0 7절). "라이트를 베껴 오고 다크를 나중에"가 그 결함을 만들었다.
- Astryx에 RN이 쓸 값이 다 있다: 팔레트(`@astryxdesign/theme-neutral`의 `neutralPalettes`), 토큰 지도(`neutralTheme` — 원문 `theme-neutral/src/neutralTheme.ts:90-236`), 간격·굵기·시간(`@astryxdesign/core/dist/theme/tokens.stylex.js`), iOS 글자 크기표(`core/dist/theme/uikitTypography.js`).
- 실측 대비(1판 표 그대로):

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

**0) 출처 패키지**(사람 확정 A — 충돌하면 B): `npm i -D -E @astryxdesign/core@0.7.13 @astryxdesign/theme-neutral@0.7.13`. 피어 `react-dom`은 `npx expo install react-dom`이 고르는 버전으로 dev에 둔다(npm이 피어를 최신으로 골라 Expo의 React와 부딪히지 않게 — knip이 안 쓴다고 하면 `ignoreDependencies`에 `react-dom`, 이유 "Astryx 피어"). `@stylexjs/stylex`는 npm이 피어로 깐다. **설치가 ERESOLVE로 실패하면** `--legacy-peer-deps`·`overrides`로 넘기지 않고 **B로 한다**: `npm i --no-save`로 같은 두 패키지를 잠깐 깔아 생성 스크립트를 한 번 돌리고, 생성물과 스크립트를 커밋하고, 아래 "생성물이 생성 결과와 같다" 테스트는 두지 않는다(대비 테스트는 그대로). 어느 쪽을 했는지 DEV-RECORD에. PR 1이 지운 두 패키지를 여기서 dev로 다시 들이는 잠금 파일 왕복은 일부러다 — PR 1 시점에는 쓰는 파일이 없어 knip이 "안 쓰는 의존성"으로 막는다.

**1) 생성 스크립트** — `scripts/theme-tokens.mjs` (+ `scripts/theme-tokens.test.mjs`)
- 패키지 진입점을 **import한다**: `neutralPalettes`·`neutralTheme`(`@astryxdesign/theme-neutral`, `dist/source.mjs`), `*Defaults`(`@astryxdesign/core/dist/theme/tokens.stylex.js`), `typography`(`…/uikitTypography.js`). `src/*.ts`는 읽지 않는다(Node 24가 `node_modules` 안 `.ts`를 거부한다).
- 쓰는 파일: `src/ui/palette.generated.ts` — 맨 위 `// 생성물: node scripts/theme-tokens.mjs — 손으로 고치지 않는다`.

  | 묶음 | 내용 | 출처 |
  |---|---|---|
  | `colors.light` · `colors.dark` | `bgBody` `bgCard` `bgSurface` `fillNeutral` `border` `borderEmphasized` `textPrimary` `textSecondary` `textDisabled` `textAccent` `accent` `accentMuted` `onAccent` `overlayPressed` · 상태 넷(`info` `success` `warning` `error`)마다 `{ text, muted, onMuted }` | `neutralTheme`의 같은 이름 토큰을 팔레트로 풀어 hex(반투명은 `#RRGGBBAA`) |
  | 앱 강조색 | `accent` = `[blue.light[50], blue.dark[65]]` · `accentMuted` = `[blue.light[90], blue.dark[25]]` · `textAccent` = `[blue.light[45], blue.dark[80]]` · `onAccent` = `[neutral.light[100], neutral.dark[5]]` | 웹 `src/ax/theme.ts:17-21`(`WEB_FINAL`)의 단계 그대로 — 스크립트에 같은 단계로 적는다 |
  | **다크 처방** | `bgCard` = `neutral.dark[15]` · `fillNeutral` = `neutral.dark[30]` · `border` = `neutral.dark[35]` | v2.0 7절. 라이트는 Astryx 값 그대로 |
  | `space` · `radius` · `type` · `weight` · `duration` | `--spacing-*`(rem×16 pt) · `inner` `element` `container` `page` · iOS 텍스트 스타일 11개의 `large` 범주 pt · `--font-weight-*` · `--duration-fast`·`medium` | `tokens.stylex.js` · `neutralTheme.ts:231-236` · `uikitTypography.js` |
- `--check`: 생성 결과와 커밋된 파일이 다르면 1. `npm run check`에는 넣지 않는다(Astryx는 고정) — `theme-tokens.test.mjs`가 같은지 본다.

**2) `src/ui/theme.ts`**: `Theme = { scheme, colors, space, radius, type, weight, duration }`. `useTheme()` = `useColorScheme()`(시스템 따름 — 선택 UI는 v2.3). `_layout.tsx`가 같은 값을 `@react-navigation/native` `ThemeProvider`에(`background`=`bgBody`, `card`=`bgCard`, `text`=`textPrimary`, `border`=`border`, `primary`=`accent`). 상태 표시줄 `expo-status-bar` `style="auto"`.

**3) 글꼴**: `fontFamily`를 지정하지 않는다(시스템 — SF Pro + Apple SD Gothic Neo). 숫자는 `fontVariant: ['tabular-nums']`. `allowFontScaling` 기본(켜짐).

**4) 부품** — `src/ui/` (화면은 이 부품만 쓴다. 화면 파일에 색·크기 숫자를 쓰지 않는다)

| 부품 | 쓰는 곳 | 모양 · 질감 |
|---|---|---|
| `Screen` | 홈·가져오기 | `ScrollView` `contentInsetAdjustmentBehavior="automatic"`, 바탕 `bgBody`, 좌우 여백 `space` |
| `Section` | 카드 자리 전부 | inset grouped: `bgCard`, `radius.container`, `hairlineWidth` `border`. 그림자는 라이트만 |
| `Text` | 전부 | `variant`(`type` 이름) × `tone`(`primary` `secondary` `accent` `info` `success` `warning` `error`) × `numeric` |
| `Button` | 가져오기·홈으로·알림 펼치기·나중에·바꾸기 | `primary` · `secondary`(`fillNeutral`) · `plain`(`textAccent`). 눌림 `overlayPressed`, 꺼짐 `textDisabled`, 터치 44pt 이상 |
| `Badge` | 머리, 근육 바 | 알약, `neutral` · `info` · `warning` |
| `Banner` | 홈 알림, 가져오기 실패·되돌림 | 상태 `muted` 면 + `onMuted` 글 |
| `ProgressBar` | 디로드·Phase·근육 바 | 트랙 `fillNeutral`, 채움 `accent`·`success`·`warning` |
| `Segmented` | 복귀 적용/안 함 | `@react-native-segmented-control/segmented-control`, `appearance`를 `scheme`에 |
| `Collapsible` | 제안 근거, 테이블별 행 수 | 머리 줄 `Pressable` + 꺾쇠, 움직임 없음 |
| `ListRow` | 제안 근거, 가져오기 결과 | 왼쪽 이름·설명, 오른쪽 값, `hairlineWidth` 구분선 |
| `TextField` | 토큰 | `bgSurface` + `border` |
| `Divider` | 카드 안 구분 | `hairlineWidth` `border` |

Astryx 부품을 쓰지 않는 이유: StyleX·DOM 전용이라 RN에서 돌지 않는다 — **값을 가져오고 구현은 RN 기본 + 플랫폼 부품**(v2.0 2·5절).

### 검증 (`src/ui/palette.test.ts` — `palette.generated.ts`만 import한다. `theme.ts`는 `react-native`를 읽어 node에서 못 돈다 · `scripts/theme-tokens.test.mjs` · `scripts/app-scans.test.mjs`)
- 다크: ① `bgCard` vs `bgBody` ≥ 1.1 ② `fillNeutral` vs `bgCard` ≥ 1.5 ③ `border` vs `bgCard` ≥ 1.5 ④ `border !== fillNeutral`.
- 두 모드: `textPrimary` vs `bgCard`·`bgBody` ≥ 7 · `textSecondary` ≥ 4.5 · `onAccent` vs `accent` ≥ 4.5 · `textAccent` vs `bgCard` ≥ 4.5 · 상태 `onMuted` vs (`muted`를 `bgCard`에 합성) ≥ 4.5 · `textPrimary` vs `fillNeutral`(카드에 합성) ≥ 4.5. 합성·대비 계산은 테스트 안에.
- 라이트 `bgCard`·`fillNeutral`·`border`가 `neutralTheme` 라이트 값 그대로(`theme-tokens.test.mjs`).
- `palette.generated.ts`가 생성 결과와 같다(A일 때만).
- 스캔(`app-scans`): `src/app/**`·`src/home/**`에 `#` hex 색, `rgb(`, 숫자 `fontSize:` 리터럴이 없다.
- **결함 복원**: 다크 `bgCard` 처방 줄을 지우면 ① 실패 · `border`를 `neutral.dark[30]`으로 바꾸면 ④ 실패.

### 범위 제외
- 테마 선택(시스템·라이트·다크) — v2.3. Pretendard — 시스템으로 확정(1판 검토 1라운드). 안드로이드 Material 갈래 — v2.5.

### README 반영
- `### 네이티브 앱 (v2.1~)`에 한 줄: **테마는 라이트·다크 두 벌을 같이 만들고, 값은 Astryx에서 생성한다.** 다크는 카드·보조 버튼 면·테두리를 팔레트 단계로 올린 값(v2.0 7절)으로 시작했고, 대비 하한을 테스트가 잰다. 생성물(`palette.generated.ts`)은 손으로 고치지 않는다.

---

## VV7. Gist에서 가져오기 (화면 · 토큰 · Gist 찾기)

(1판 VV4 그대로. 경로만 바뀜.)

### 진단
- 웹은 Gist에 `workout-tracker-backup.json` 하나를 올린다(`gist.ts:13`). gist id는 웹 `settings`의 `gistId`에만 있다.
- `readGist`가 1MB에서 잘린 응답을 `raw_url`로 다시 받는다(`gist.ts:154-176`, RELIABILITY R4) — 그대로 쓴다.
- 토큰: Keychain(v2.0 1절 ⑦ — v2.4 항목이지만 가져오기가 v2.1이라 **저장만 앞당긴다**).

### 설계
**1) Gist 찾기 — 코어** (`src/core/gist.ts`에 더함)
```ts
interface BackupGist { id: string; updatedAt: string }
function findBackupGist(token: string): Promise<BackupGist>
```
`GET /gists?per_page=100` → `files`에 `GIST_FILENAME`이 있는 것 중 `updated_at`이 가장 늦은 것. 없으면 `GistError('…', 'notFound')`. 오류 분류는 기존 `send`·`toError`. 한 쪽(100개)만 본다 — DEV-RECORD 제약에.

**2) 토큰 — `src/platform/secureToken.ts`**: `getGistToken()` · `setGistToken(t)` · `clearGistToken()` — `expo-secure-store`, 키 `gistToken`, `keychainAccessible: AFTER_FIRST_UNLOCK`. SQLite에는 넣지 않는다.

**3) 흐름** — `src/db/runImport.ts`의 `runImport(deps)` (의존성 — `findBackupGist`·`readGist`·토큰 읽기/저장·확인 묻기·DB·`yieldFrame` — 을 인자로. 화면 `src/app/import.tsx`가 실제 것을 넘긴다)
1. 토큰: 입력칸 값, 비었으면 저장된 토큰.
2. `findBackupGist` → `readGist` → `parseBackup`. 문제면 목록을 보이고 멈춘다.
3. **성공적으로 받은 뒤에만** 토큰을 저장한다.
4. 기기에 세션이 1건 이상이면 확인(`Alert.alert`, 문구 C). 취소면 멈춘다.
5. 단계 글을 `넣고 확인하는 중…`으로 바꾸고 **한 프레임 양보한 뒤**(`await deps.yieldFrame()` — 화면이 `() => new Promise(r => requestAnimationFrame(r))`, 테스트가 `() => Promise.resolve()`) `importBackup(db, file, new Date())`. `ok: true` → 결과 표 · `mismatch` → 문구 D + 결과 표 · `error` → 문구 G.
6. `try/finally`로 어느 갈래든 도는 중 상태를 끈다.

**4) 화면** — 시트(`presentation: 'modal'`), 제목 `Gist에서 가져오기`, 왼쪽 `닫기`.

| 자리 | 부품 | 내용 |
|---|---|---|
| 토큰 구역 | `Section` + `TextField` | 저장된 토큰이 없으면 입력칸(`secureTextEntry`, `textContentType="none"`, `autoComplete="off"`, `autoCorrect={false}`, `autoCapitalize="none"`, `spellCheck={false}`). 있으면 `토큰 저장됨` + `Button`(plain) `바꾸기`. **토큰 글자를 한 글자도 보이지 않는다** |
| 설명 | `Text` footnote secondary | 문구 A |
| 주 동작 | `Button` primary, 너비 전체 | `가져오기` / 도는 중 `가져오는 중…`(+ `ActivityIndicator`, 단계 글). 토큰이 없고 칸이 비면 꺼진 모양 |
| 실패 | `Banner` error | `GistError.message` 그대로, 또는 `parseBackup` 문제(최대 3줄 + `외 n건`), 또는 문구 G + footnote `message` |
| 결과 | `Section` + `ListRow` 4줄 + 한 줄 | `이름 · 백업 값 · 기기 값 · ✓/✗` — 세션 · 세트 · 총 볼륨(kg, 소수 한 자리) · 식단 일수. 아래 `내용 지문 일치 ✓`와 `웹 백업 <YYYY-MM-DD HH:mm> 기준`(백업의 `exportedAt`을 코어 `formatDateTimeLocal`(`dates.ts:168`)로 — ISO 문자열을 잘라 쓰면 UTC 시각이 보인다, RELIABILITY R5. 문구 C·VV8 머리의 시각도 같다). 행 수 다섯 칸은 `Collapsible` `테이블별 행 수` |
| 결과 아래 | `Button` secondary | `홈으로` |
| 되돌림 | `Banner` warning + 결과 표 | 문구 D. 다른 칸은 `✗`와 오류 색 |

### 검증
- `src/core/v21.test.ts` describe `VV7`(fetch 모킹 — `gist.test.ts` 방식): 백업 파일을 가진 gist 둘(`updated_at` 다름)과 없는 것 하나 → 늦은 것 / 없음 → `notFound` / 401 → `auth` / 403 + `x-ratelimit-remaining: 0` → `rateLimit` / fetch 예외 → `network`. URL에 `per_page=100`, 헤더에 토큰.
- `src/db/runImport.test.ts`(`runImport.ts`에 `requestAnimationFrame` 글자가 없다): `auth` 실패 → 토큰 **저장 안 함** / `parseBackup` 문제 → DB 그대로·저장 안 함 / 받기 성공 → 저장 / 세션 있고 취소 → DB 그대로 / 엔진 `error` → 문구 G, DB 그대로, 도는 중 꺼짐 / 엔진 자리 가짜가 **던짐** → 같은 표시, 도는 중 꺼짐 / `truncated: true`면 `raw_url` 전체가 들어간다(R4).
- 스캔(`scripts/app-scans.test.mjs`): 테스트 아닌 `src` 파일 중 `api.github.com`은 `src/core/gist.ts`에만 · `expo-secure-store`는 `src/platform/secureToken.ts`에만 · `src/app/import.tsx`의 JSX 안에 `token` 식별자가 없다 · 토큰 값을 `console.`로 보내는 곳이 없다.
- **실기기**: 사람이 토큰을 붙여 넣은 뒤 Claude가 `가져오기` → 네 줄 `✓`와 `내용 지문 일치 ✓` 스크린샷 `import-done-<light|dark>.png`. **표의 세션 수가 웹 설정 → 기록 내보내기의 세션 수와 같다**(사람이 PR에 적는다).

### 범위 제외
- 네이티브가 Gist에 **올리기** — v2.2. 자동 가져오기 — 사람이 누를 때만. 파일 선택 가져오기 — 지시가 Gist로 바꿨다.

### README 반영
- `### 네이티브 앱 (v2.1~)`에 한 줄: **Gist 토큰은 Keychain(`expo-secure-store`)에만 둔다.** SQLite `settings`에 쓰는 길은 가져오기 하나이고 그 길이 비밀 키를 거른다. 화면은 토큰 글자를 보이지 않는다.
- "백업 · 비밀값" 첫 항목 끝의 `네이티브의 토큰 저장은 VV7.`을 위 줄을 가리키게(`→ 네이티브 앱 절`).

---

## VV8. 홈 화면 + `docs/FEATURE-MAP.md`

(1판 VV6 그대로. 웹 화면이 레포에 없어 "웹과 묶는 스캔"을 **한 번 대조**로 바꿨다.)

### 진단
- 웹 홈(`WEB_FINAL:src/screens/HomeScreen.tsx`, 660줄)의 계산은 전부 코어 함수 호출이다: `suggestNextDay` · `weekDots` · `dayLastDone` · `strengthCountThisWeek` · `muscleBars` · `deloadState` · `phase0Progress` · `progressionSuggestions` · `phaseReadiness` · `bannerWatches(compensationWatches)` · `homeCardState` · `returnChoiceReason` · `dayGapNotice` · `staleDaysLine` · `bannerQueue` · `summarizeDietDay` · `nextUnloggedSlot`(`:123-298`). 화면에 남는 것은 조립과 문구다.
- 저장소 위험 배너(`:411`)는 앱 샌드박스에서 의미가 없고(v2.0 1절 ④), 백업 배너 둘은 백업하지 않는 v2.1에서 의미가 없다.

### 설계
**1) 조립 — `src/home/homeModel.ts`** (순수 TS, `../core/…`만 import)
```ts
interface HomeInput {
  tables: BackupTables; today: string; now: Date
  applyReturn: boolean                              // 복귀 배너의 적용/안 함 (화면 상태)
  dismissed: Partial<Record<BannerId, true>>        // "나중에" (화면 상태 — 저장 안 함)
}
function homeModel(input: HomeInput): HomeModel | { empty: true }
```
- 루틴: `pickActiveRoutine(routines, settingValue(settings, 'activeRoutineId', null))` → `buildRoutineBundle`. 없으면 `{ empty: true }`.
- `currentPhase` = `settingValue(settings, 'currentPhase', 0)` · 진행 중 = `pickOpenSession(sessions)` · 종목 설정 = `exerciseNotes` · 식단 = `buildDietData(…)`.
- 나머지는 **웹 `HomeScreen.tsx:123-298`과 같은 호출, 같은 인자, 같은 지역 변수 이름**(`deload` `phase` `watches` `progressions` `card` `suggestion` `exerciseSettings` `routine`). 다른 점: `backupStale`은 늘 `false`, 백업 미설정 배너 없음 · 배너 `actions`는 `'dismiss'`·`'returnChoice'`만 · 카드 `cta` 대신 `card.note` = 문구 B · `importedAt` = `settingValue(settings, 'nativeImport', null)?.exportedAt`.
- 배너 제목·설명은 웹 `BANNER_VIEW`(`:303-400`)와, 식단 줄 글(`dietLabel`·`dietValue`, `▸` 뺌)은 웹과 **한 글자도 다르지 않게** 옮긴다.

**2) 화면 — `src/app/index.tsx`**: `headerLargeTitle`, 제목 문구 E, 오른쪽 `Button`(plain) `가져오기` → `/import`. `useFocusEffect`마다 `readAllTables`를 다시 읽는다. 순서는 웹 홈 그대로(머리 → 오늘 → 이번 주 → 주기).

| 자리 | 부품 | 내용 |
|---|---|---|
| 머리 아래 | `Badge` ×3 + `Text` footnote secondary | 루틴 이름(info) · `Phase n` · `누적 n세션` / `웹 기록 <YYYY-MM-DD HH:mm> 기준`(`formatDateTimeLocal(importedAt)` — `homeModel`이 만든다) |
| 다음 운동 | `Section` | `다음 운동` · Day 이름(title2) · 부제 또는 진행 중 줄 · 제안 이유(headline accent) · 공백 줄 · 오래된 줄 · 종목 줄 · 문구 B |
| 알림 | `Banner` | 큐의 첫 번째만 펼친다. 복귀 배너는 `Segmented`(`적용`·`안 함` — 카드 이유 줄이 바뀐다, R11), 나머지는 `Button` plain `나중에`. 둘 이상이면 `Button` secondary `다른 알림 n개 ▾` / `알림 접기 ▴` |
| 식단 줄 | `Section` 한 줄 | `다음 식단 …` 또는 `오늘 식단 <마크>`, 오른쪽 `단백질 n/mg`(numeric) |
| 이번 주 | `Section` (`src/home/WeekDots.tsx`) | `이번 주` · `n/m회` · 근력≠전체 안내 · 요일 7칸 — 웹 `WeekDots.tsx`와 같은 글 |
| 부위별 볼륨 | `Section` (`src/home/MuscleVolumeBars.tsx`) | 이름 · `ProgressBar` · `n/m` · `Badge` `nx` · 안내 — 웹 `MuscleVolumeBars.tsx`와 같은 글 |
| 주기 | `Section` | Phase 0 진행 + `ProgressBar` + 안내, `Divider`, 디로드 카운터 + `ProgressBar` + 안내 |
| 제안 근거 | `Section` + `Collapsible` | `제안 근거 (부족분 점수)` → `ListRow` + `★ = 이번 주 첫 노출…` |
| 빈 기기 | `Screen` 가운데 | 문구 E · 문구 F · `Button` primary `Gist에서 가져오기` |

**3) `docs/FEATURE-MAP.md`** (v2.0 11.3 채점표). v2.1 줄:

| # | 흐름 | 기기에서 확인 | 단계 |
|---|---|---|---|
| F1 | 앱이 뜬다 — 홈 화면 아이콘 `이왜들` → 실행 | 스크린샷 | v2.1 |
| F2 | 빈 기기 → `Gist에서 가져오기` → 토큰 → 결과 네 줄 ✓ + 지문 ✓ | 스크린샷 + 요소 목록 | v2.1 |
| F3 | 가져온 홈 — 머리·다음 운동·이번 주·볼륨·주기 | 라이트·다크 스크린샷 | v2.1 |
| F4 | 앱을 완전히 끄고 다시 열어도 기록이 남는다 | 스크린샷 | v2.1 |
| F5 | 다시 가져오기(기록 있음) → 확인 → 결과 | 요소 목록 | v2.1 |

### 검증 (`src/home/homeModel.test.ts`)
- **웹과 같은 답**: 같은 픽스처에서 `homeModel`의 카드 Day id·이유 줄·공백 줄·오래된 줄, 주간 도트, 근육 바, 디로드·Phase 0 수치, 배너 큐 순서가 **웹 홈이 부르던 코어 함수를 테스트 안에서 같은 인자로 직접 부른 값**과 같다. 경우: 정상 주중 · 14일+ 공백(`applyReturn` true/false) · 디로드 도달 · Phase 0 달성 · 보상작용 연속 · 진행 중 세션이 있는 날(`진행 중 · n분 · 완료 a/b세트`) · 대체 종목과 어시스티드 종목이 든 주 · 식단 옛 플랜을 쓰는 날 · 루틴은 있고 세션 0건(`progressions` `[]`, 증량 배너 없음).
- **손으로 적은 기대값**: 정상 주중과 14일+ 공백(true/false)은 기대값을 **리터럴**로 — 카드 Day id, 이유 줄, 공백 줄, 도트 배열, 배너 큐 id 순서. 근거(`docs/DESIGN.md` 4절 규칙)를 주석 한 줄.
- 배너 글: 다섯 종류의 제목·설명이 기대 문자열(테스트에 적는다)과 같다.
- `importedAt`이 `'2026-11-26T15:30:00.000Z'`일 때 머리 시각 글이 `formatDateTimeLocal`의 결과와 같다(UTC를 잘라 쓰지 않는다) ·
- `dismissed`에 든 배너는 큐에 없다 · `backup`이 큐에 없다 · `actions`에 `'dismiss'`·`'returnChoice'` 말고 없다 · 루틴 없는 표 → `{ empty: true }`.
- **속성**: 세션 배열 순서를 섞어도 결과가 같다(생성기는 `startedAt`을 다르게).
- 스캔(`app-scans`): `src/home/homeModel.ts`는 `../core/…`만 import한다 · `src/home/**`·`src/app/**`가 코어 판정 함수와 같은 이름의 함수를 정의하면 `quality-scan --ci`가 중복으로 막는다(결함 복원).
- **한 번 대조** — 웹 마지막 소스와 묶기(1판의 상시 조립식 스캔 자리. 출력을 DEV-RECORD에 복사):
  ```sh
  W=$(git show WEB_FINAL:src/screens/HomeScreen.tsx | sed -E 's#//.*##' | tr -s ' \n\t' ' ')
  N=$(sed -E 's#//.*##' src/home/homeModel.ts | tr -s ' \n\t' ' ')
  while IFS= read -r e; do printf '%s | 웹 %s | 앱 %s\n' "$e" "$(grep -cF -- "$e" <<<"$W")" "$(grep -cF -- "$e" <<<"$N")"; done <<'EOF'
  deload.due || deload.earlySignal
  phase.allMet && phase.to !== null
  watches.length > 0
  progressions.length > 0
  card.resuming
  bannerWatches(compensationWatches(
  buildScaleMap(exerciseSettings, routine.rules.weightIncrementKg)
  hasReturnStep: Boolean(suggestion.returnStep)
  일 공백 — 
  디로드 권장 — 세트 50%, 무게 유지
  조건을 모두 충족했어요
  보상작용 반복 — 무게 하향 검토
  증량 제안
  EOF
  ```
  모든 줄이 `웹 1 | 앱 1`(배너 글이 `homeModel.ts` 밖 파일에 있으면 `N`에 그 파일을 더한다). `WeekDots`·`MuscleVolumeBars`의 안내 글도 같은 방식으로 `WEB_FINAL:src/components/<같은 이름>.tsx`와 대조한다.

### 범위 제외
- 시작·Day 변경·디로드로 시작·Phase 전환·진행 중 세션 시트 — v2.2. 식단 줄을 눌러 식단으로 — v2.3.

### README 반영
- `### 네이티브 앱 (v2.1~)`에 한 줄: **전환 전까지 앱은 웹 기록의 읽기 전용 사본이다.** 홈은 웹과 같은 코어 함수로 같은 답을 보이되 기록을 만들거나 바꾸지 않는다. 세션 기록은 v2.2부터다.

---

## VV9. 규칙 정비에 넘길 것 (규칙 정비자 — `agents/RULES-KEEPER.md`)

### 진단
- PR 1·PR 2가 지우고 옮긴 것을 규칙 파일이 가리킨다(설계자 grep — 웹·Astryx·빌드·Pages·`src/lib` 언급: `agents/SCREEN-CHECKER.md` 11 · `CLAUDE.md` 10 · `agents/README.md` 8 · `IMPLEMENTER.md` 6 · `DESIGNER.md` 6 · `RELIABILITY.md` 4 · `RULES-KEEPER.md` 3 · `REVIEWER.md` 3 · `verify` 스킬 3 · `REVIEW.md` 2 · `coordinator/SMALL.md`·`coordinator/DESIGN.md`·`QUALITY-KEEPER.md`·`PLAN-REVIEWER.md` 각 1).
- 이 파일들은 규칙 정비자 몫이고 REVIEW.md 3절 사람 필요 경로다. 구현자 PR에 섞지 않는다.

### 설계 — 바꿀 사실(글은 규칙 정비자가 정한다)

**PR R1 (PR 1 머지 뒤)**

| 파일 | 사실 |
|---|---|
| `CLAUDE.md` "이 앱" | 웹은 Pages의 마지막 배포본(`WEB_FINAL`)이고 레포에서 지웠다. "전환이 끝날 때까지 위 설명이 현행이고, 뒤집는 것은 PLAN v2.0 '뒤집는 README 결정'뿐" → 이 PLAN이 더 뒤집은 것(웹 배포·웹 코드·`native/` 대신 뿌리)을 더한다 |
| `CLAUDE.md` "명령" | 검사 목록 `흔적·경계·린트·knip·타입·테스트`(PR 2에서 `번들`) · `npm run build` 줄 지움 · "`tsc`를 직접 호출하지 않는다 — `npx tsc --noEmit`은 `src`를 검사하지 않는다" → tsconfig가 하나라 `npm run typecheck` · 변이 `src/lib` → `src/core` |
| `CLAUDE.md` "브랜치와 배포" | "`main`에 push하면 Pages로 배포되고 폰 앱이 바뀐다"가 거짓이 된다. `main`은 PR로만·머지는 사람이 — 규칙은 남고 이유가 바뀐다(필수 검사·리뷰 흐름) |
| `CLAUDE.md` "문서" · `agents/DESIGNER.md` 1·2절 · `IMPLEMENTER.md` · `REVIEWER.md` · `agents/README.md` · `RULES-KEEPER.md` 검사 목록 · `QUALITY-KEEPER.md` · `PLAN-REVIEWER.md` · `coordinator/SMALL.md`·`DESIGN.md` | Astryx 우선·`src/ax`·`astryx-inventory --check`·"CI가 막는다"·Playwright·`ui-check` → 웹 화면이 없다. 화면 규칙은 `src/ui` 부품과 `theme` 값(VV6), 막는 것은 `boundary`·`app-scans` · `src/lib/properties.test.ts` → `src/core/properties.test.ts` |
| `docs/DESIGN.md` 9절 | 규칙 문서가 가리키는 "UI 방향"(Astryx 우선) — 네이티브 화면 규칙으로 고치거나 "웹 시절"로 표시. 4·7절(판정 근거)은 그대로 |
| `agents/SCREEN-CHECKER.md` · `.claude/skills/verify` 3절 | 웹 촬영(`npm run dev`·`ui-check`·`screenshots.mjs`) 지움 → 실기기(`verify-device`)만 |
| `.claude/launch.json` | 웹 dev 서버(5173) → 지우거나 `npx expo start` |
| `REVIEW.md` 3·5절 | 경로 `lib/backup.ts`·`lib/gist*.ts`·`lib/secrets.ts` → `src/core/backup.ts`·`gist.ts`·`secrets.ts`(PR 2에서 `src/db/**`·`src/platform/**`) · 5절 "Astryx 뒷걸음" → "경계" |
| `docs/RELIABILITY.md` | 방아쇠가 지운 파일인 행: R12(`src/ax/theme.ts`·`parts.css` → `scripts/theme-tokens.mjs`·`src/ui/palette.generated.ts`) · R14(`beep.ts` → v2.2의 `src/platform` 소리) · R15(서비스워커 → 지움 또는 v2.5 OTA) · R17(`db.sessions.toArray()` → SQLite 세션 전체 조회) |
| `docs/INCIDENTS.md` | 막은 방법이 지운 장치(`astryx-inventory`·`ui-check`·`first-load`)인 키의 상태 |

**PR R2 (PR 2 머지 뒤)**: `CLAUDE.md` 명령에 `번들`·`npx expo run:ios --device`·`npm run db:generate` · `verify-device` 스킬의 `native/` 경로 → 뿌리 · `REVIEW.md` 3절에 `src/db/**`(SQLite·가져오기)·`src/platform/**`(비밀값) · v2.0 11.5 검증 도장(훅)을 할지.

- `scripts/agent-guard.mjs`·`.claude/settings.json`: 웹·Pages에 묶인 규칙이 없다(grep 0줄) — 고칠 것 없음.
- 순서: **PR 1 → PR R1 → PR 2 → PR R2.** PR R1이 PR 2 구현 전에 들어가야 구현자가 읽는 `CLAUDE.md`가 맞다. PR 1·PR 2를 진행하는 동안은 **이 PLAN의 명령이 `CLAUDE.md`보다 앞선다**(PR 본문에 한 줄).

### 검증
- PR R1 뒤: `grep -rn "Astryx 뒷걸음\|astryx-inventory\|ui-check\|first-load\|npm run build\|GitHub Pages로 바로" CLAUDE.md AGENTS.md REVIEW.md agents/ .claude/` → 0줄(복사). `npm run check -- --fast` 통과.

### 범위 제외
- 과거 기록(`docs/PLAN-*`·`DEV-RECORD-*`·스크린샷) — 고치지 않는다(REVIEW.md 4절).

### README 반영
- 없음.

---

## 화면 검증 (화면 검증자 — `agents/SCREEN-CHECKER.md`, 도구는 `.claude/skills/verify-device`)

유선 아이폰 + mobile MCP. 시뮬레이터는 쓰지 않는다. 라이트·다크는 MCP로 **설정 앱**(`com.apple.Preferences`) → 디스플레이 및 밝기에서 바꾼다. 요소는 `mobile_list_elements_on_screen`으로 찾는다.
스크린샷: `docs/screenshots/v2.1/device/<장면>-<light|dark>.png`.

| 작업 | 장면 (각각 라이트·다크) | 볼 것 |
|---|---|---|
| VV4 | `boot` | 아이콘 아래 `이왜들`, 자리표시 화면 |
| VV7 | `import-empty` | 토큰 칸 이름이 보이는가, 빈 칸일 때 `가져오기`가 꺼져 보이는가, 설명 글이 잘리지 않는가 |
| VV7 | `import-done` | 결과 네 줄 정렬(고정폭), ✓가 성공 색, **토큰 글자가 화면 어디에도 없다** |
| VV7 | `import-error` (토큰 칸에 `x`) | 오류 배너가 두 줄을 넘어도 안 잘리는가, 다크에서 배너 면이 바탕과 구분되는가 |
| VV8 | `home-empty` (앱 데이터를 지운 뒤 — `mobile_clear_app_data`가 안 되면 지웠다 다시 설치) | 주 버튼이 보이는가 |
| VV8 | `home` · `home-end`(끝까지 스크롤) | **다크에서 카드가 바탕과, `다른 알림 n개`의 면이 카드·바탕과 구분되는가, 진행 막대의 트랙이 보이는가**(v2.0 7절) · 큰 제목이 접히는가 · 긴 Day 이름·종목 줄이 넘치지 않는가 · 숫자 고정폭 |
| VV8 | `home-banners-open` | 배너 사이 간격이 같은가, `적용`/`안 함`의 고른 쪽이 다크에서 보이는가 |
| VV8 | `home-largetext` (더 큰 텍스트, 접근성 크기 아닌 가장 큰 단계 — 라이트만) | 카드 안 글이 잘리지 않고 줄을 바꾸는가 |

**정말 사람만 볼 수 있는 것**: 밝기를 낮춘 헬스장 조명에서 다크 홈이 읽히는가(v2.0 7절 검증 3) — DEV-RECORD에 "사람 확인 필요".

---

## 데이터 이전

| 대상 | 어떻게 되나 |
|---|---|
| 웹 IndexedDB(Pages 웹앱, 폰 Safari 저장소) | 그대로. **레포 변경이 닿지 않는다** — 배포가 없다 |
| 웹이 올리는 Gist 백업 | 웹을 쓰는 동안 그대로 올라간다(세션을 마치거나 식단을 고치면). 형식 `SCHEMA_VERSION` 3 |
| 앱 SQLite(`iwaedeul.db`, 앱 샌드박스) | 새로 생긴다. **가져오기만이 쓴다** — 매번 전체 교체, 검증이 틀리면 되돌린다 |
| 토큰 | 앱 Keychain(`gistToken`). 웹 localStorage의 토큰은 그대로 |
| 레포의 웹 소스 | 지운다. `WEB_FINAL` 커밋에 그대로 있다 |

**전환 절차** (v2.2가 끝나 앱에서 세션을 기록할 수 있게 된 날 — "바로 전환"):
1. 웹 설정 → Gist 백업 → **지금 백업**.
2. 앱 → 가져오기 → 결과 네 줄 ✓ + 지문 ✓. 세션 수를 웹 설정 → 기록 내보내기의 수와 맞춘다.
3. 그날부터 **웹에서 기록하지 않는다.** 앱이 원천이다. 홈 화면의 웹 아이콘을 지운다(사람) — 웹은 기록이 바뀌어야 올리므로, 쓰지 않으면 Gist를 덮지 않는다.
4. **v2.2 범위**(미리 적어 둔다): 앱이 같은 Gist에 백업을 올린다(같은 백업 형식 — `WEB_FINAL:src/lib/gistSync.ts`의 지문 비교·디바운스 규칙을 SQLite 위에서) · 전환 뒤 앱의 가져오기는 **덮어쓰기 경고**가 있는 복원으로 · **앱의 건너뛰기는 자기 지문만 보지 않는다**: 올리기 전에 Gist의 `updated_at`이 앱이 마지막으로 올린 시각과 다르면 건너뛰지 않고 올린다(또는 알린다). 웹의 건너뛰기는 기기에 저장한 `lastBackupHash`만 본다(`WEB_FINAL:src/lib/gistSync.ts:107-117`). v2.2가 그 규칙을 그대로 옮기면, 전환 뒤 웹이 한 번이라도 올리면(습관적인 식단 수정, 백업 배너) 기록이 바뀌지 않은 앱은 "직전과 같다"며 건너뛰고 Gist에 웹의 낡은 사본이 남는다. 폰을 잃고 그 Gist로 복원하면 기록을 잃는다(REVIEW.md 1.5-1). 1판의 "웹 업로드를 끄는 한 줄 배포" 갈래는 없다(배포가 없다) — 이 확인이 그 자리를 막는다. v2.1 앱은 올리지 않으므로 이번 구현 범위는 바뀌지 않는다.

## 되돌리기

| 상황 | 방법 | 데이터 |
|---|---|---|
| PR 1 머지 뒤 코어·검사가 이상하다 | PR 1 머지 커밋을 `git revert -m 1`(PR로). 되돌림에 `deploy.yml`도 돌아와 그 머지가 웹을 **다시 배포한다** — 코드가 `WEB_FINAL`과 같아 같은 웹이다 | 웹 IndexedDB·Gist 그대로 |
| 웹(Pages)이 사라지거나 고장 | 위와 같은 되돌림이 `main`에서 웹을 다시 올리는 길이다(또는 사람이 `WEB_FINAL`에서 브랜치를 만들어 배포 — 환경 보호 규칙은 사람이 본다) | 같음 |
| 앱 가져오기 결과가 이상하다 | 다시 가져온다(전체 교체). 또는 앱을 지운다 | 웹 영향 없음 — 앱은 사본이다 |
| 앱이 안 뜬다 | 먼저 서명 만료(7일, verify-device 1절). 아니면 PR 2 되돌리기 — 레포는 PR 1 모양(코어만)으로 | 웹 그대로 |

**각 PR이 검사 통과 상태로 끝난다.** 웹은 어느 PR에서도 바뀌지 않는다. PR 1 뒤 `main`에는 앱이 없다 — 그동안 쓰는 앱은 Pages의 웹이다.

## 과거 판정 불변

바뀌지 않는 것: 판정·제안·내보내기·백업 형식의 로직 전부. VV2는 웹을 지우고 순수 조각을 **식 그대로** 옮기며, 남은 테스트의 본문을 고치지 않는다. VV3는 파일을 옮기고 경로만 고친다. 골든 일곱(VV2 3)에 제목 그대로)은 import 줄 말고는 한 글자도 안 고치고 통과한다. 웹·코어를 섞은 스캔은 웹 원소만 빼서 남는 코어 파일의 단일 출처 감시를 잃지 않는다.
앱은 같은 코어 함수를 쓰므로 같은 기록에서 같은 판정이다(VV5 차등, VV8 "웹과 같은 답" + 한 번 대조).

달라지는 것:

| 무엇 | 언제 | 과거 기록 |
|---|---|---|
| 웹 화면·소스를 보던 테스트가 지워진다 | VV2 | 판정이 아니라 지운 화면·CSS·웹 lib를 본 테스트다. 목록은 DEV-RECORD |
| 섞인 스캔이 웹 원소를 빼고 줄어든다 | VV2 | 감시 대상이 남는 코어 파일로 준다. 단언은 그대로. 자리 표는 DEV-RECORD |
| `fingerprintPayload`가 `nativeImport` 키를 뺀다 | VV5 | 배포된 웹에는 닿지 않는다. 앱의 v2.2 업로드 판정의 입력 |
| 앱 홈에 백업 배너가 없다 | VV8 | 판정은 같고 표시만 없다 |

---

## 구현 순서와 검증

**PR 1: VV1 → VV2 → VV3 → 기록.** **PR R1: VV9 앞절**(PR 1 머지 뒤). **PR 2: VV4 → VV5 → VV6 → VV7 → VV8 → 화면 검증 → 기록·버전**(PR R1이 머지된 `main`에서 새 브랜치). **PR R2: VV9 뒷절.**
VV6을 VV7보다 먼저: 가져오기 화면이 `ui` 부품을 쓴다. VV5를 VV7보다 먼저: 화면이 엔진을 부른다.
커밋 수: **PR 1 = 4**(VV1 · VV2 · VV3 · 기록), **PR 2 = 7**(VV4 · VV5 · VV6 · VV7 · VV8 · 화면 검증 · 기록·버전). PR R1·R2는 규칙 정비자가 정한다. 작업끼리 한 커밋에 섞지 않는다. 개수는 `git log --oneline main..HEAD` 출력을 복사한다.
각 작업 커밋은 `npm run check -- --fast`가 통과한 상태로 끝난다(그 커밋이 바꾼 `STEPS`로).

**사람 필요 경로**(`REVIEW.md` 3절) — 리뷰어는 통과시키지 않고 **사람 필요**로 올린다. 결정은 이 PLAN이 미리 정했다 — 구현자는 PLAN에 없는 결정(스키마·백업 형식·토큰 저장 방식을 다르게, 골든이 VV2 규칙에 걸림)이 필요할 때만 멈춘다:

| PR | 걸리는 경로 | 무엇을 하나 |
|---|---|---|
| PR 1 | `.github/workflows/**` | `deploy.yml` 지움 · `ci.yml` 단계(웹 단계 지움, 타입·경계 더함) |
| PR 1 | `scripts/check.mjs` | 같은 단계 |
| PR 1 | `src/db/**` | Dexie(`index.ts`) 지움, `seed.ts` 반쪽, 남은 셋을 코어로 |
| PR 1 | `lib/backup.ts` · `lib/gist*.ts` · `lib/secrets.ts` | 웹 쪽 함수 지움(`gistSync` 통째), `stripSecrets` 앞에 `export`, 나머지를 코어로(동작 무변경) |
| PR 2 | `scripts/check.mjs` · `ci.yml` | 번들 단계 |
| PR 2 | `src/db/**` · `src/platform/secureToken.ts` · `src/core/backup.ts`·`gist.ts` | SQLite·가져오기 엔진·토큰 — "기록이 사라지는 길", "유출" |

관례:
- `npm run check`(마무리), 작업 중에는 `npm run check -- --fast`와 관련 테스트만(`npx vitest run <파일>`). 타입은 `npm run typecheck`.
- 맥북 사양: Metro·Xcode 빌드가 떠 있을 때 `npm run check`를 같이 돌리지 않는다(v2.0 11.6).
- 커밋 메시지는 `git commit -F - <<'MSG'`, 줄바꿈 LF(`grep -c $'\r' <파일>` 0).
- **기존 테스트는 VV2 3)의 규칙(주제가 지워진 `it` 지우기, 옮긴 이름의 import)과 VV3의 경로 말고 고치지 않는다.** 더하는 것: `scripts/check.test.mjs`의 번들 단언(VV4), `scripts/mutation.test.mjs`에 `src/core/x.ts` → 대상 · `src/core/x.test.ts` → 대상 아님(VV3). 그 밖에서 깨지면 멈추고 보고한다.
- 테스트에 실제 토큰·네트워크가 없다(fetch 모킹). 사람의 Gist는 실기기 확인에서만 쓰고 레포에 내용을 남기지 않는다.
- **새 스캔 결함 복원 확인**(`cp` 백업 → 결함 되살림 → 실패 확인 → 되돌림 → `cmp`). 최소:
  ① (VV3) `src/core/derive.ts`에 `import '../db/schema'` → `boundary --check` 종료 코드 1
  ② (VV3) `src/core/dates.ts`에 `localStorage.getItem('x')` → 위반
  ③ (VV2) 남긴 테스트 하나에 `nn1Src("src/screens/HomeScreen.tsx")`를 읽는 줄 → 헛도는 경로 막이(리터럴) 실패 · (VV3) `v1111.test.ts` glob을 옛 `/src/lib/exportMarkdown.ts`로 → 막이(glob) 실패
  ④ (VV2) `pickOpenSession`이 첫 번째 끝나지 않은 세션을 돌려주게 → 속성 "순서를 바꿔도 같다" 실패
  ⑤ (VV2) 남긴 테스트의 단언 한 줄을 바꾼다 → "남긴 본문 불변" 명령이 그 줄을 출력한다 · 원소 빼기에서 남는 원소(`'/src/lib/exportMarkdown.ts'`)까지 뺀다 → 같은 명령이 그 줄을 출력한다 · 웹 원소(`'/src/screens/HomeScreen.tsx'`)를 glob 배열에 남긴다 → 헛도는 경로 막이(glob) 실패
  ⑥ (VV4) `src/app/index.tsx`에 `import … from 'expo-sqlite'` → `checkLayers` 실패 · `src/home/`에 `Platform.OS` → 실패 · `src/core/dates.ts`에 안 쓰는 변수 → 린트 실패(`eslint.config.mjs`가 읽힌다)
  ⑦ (VV5) `sessionRow`가 `endedAt`을 `''`로 → 승격 열 단언 실패
  ⑧ (VV5) `settingsRow`가 `body`에 `{ ...row, value: row.value ?? null }` → `ok: false`(지문). 그 상태에서 `digestMatch` 조건까지 지우면 `ok: true`가 되고 `legacyEmpty` 단언만 실패 — **숫자가 못 보는 것을 지문이 본다**
  ⑨ (VV5) `tx.rollback()`을 지운다 → NaN 되돌리기 단언 실패
  ⑩ (VV5) `importBackup`의 `stripSecrets` 호출을 지운다 → `gistToken` 단언 실패
  ⑪ (VV5) 바깥 `catch`의 `error` 갈래를 지워 다시 던지게 → 예외 단언 ①② 실패
  ⑫ (VV6) 다크 `bgCard` 처방 줄을 지운다 → 대비 ① 실패
  ⑬ (VV6) `src/home/`의 한 파일에 `color: '#ffffff'` → `app-scans` 실패
  ⑭ (VV7) 받기 전에 토큰을 저장하게 → `auth` 단언 실패
  ⑮ (VV7) `import.tsx`에 `<Text>{token}</Text>` → `app-scans` 실패
  ⑯ (VV7) `runImport`의 `finally`를 지운다 → "던짐 → 도는 중 꺼짐" 실패
  ⑰ (VV8) `homeModel`이 `bannerQueue`에 `backupStale: true` → 단언 실패
  ⑱ (VV8) `homeModel.ts`에 `export function suggestNextDay() {}` → `quality-scan --ci` 중복 정의 실패
  ⑲ (VV8) `deload.due || deload.earlySignal`을 `deload.due`로 → 한 번 대조 명령의 그 줄이 `앱 0`
- **변이 테스트**: PR 1 — `npm run mutation src/core/readModel.ts`(새 파일). 옮기기만 한 파일과 덧붙인 슬롯 함수 셋은 내용이 같아 돌리지 않는다. PR 2 — `src/core/recordTotals.ts`·`gist.ts`(`findBackupGist`)·`backup.ts`(`sortTables`·`contentDigest`), 그리고 `scripts/mutation.mjs`의 대상을 `src/db`·`src/home`의 `.ts`(테스트·`client.ts` 제외)로 넓혀 `rows.ts`·`importBackup.ts`·`homeModel.ts`. 표를 DEV-RECORD에. `recordTotals.ts`의 살아남은 변이는 이유를 적는다("같다"의 근거).
- **과거 판정 불변 확인 절**(DEV-RECORD): ① VV2 이름 집합(후에만 있는 이름 0, 지운 이름 표) ② VV2 남긴 본문 불변 명령 출력(빈 것) ③ VV3 이름 그대로 명령 출력(빈 것)과 전후 테스트 수 ④ 골든 일곱 통과(이름) ⑤ VV5 차등·VV8 "웹과 같은 답" 테스트 이름과 VV8 한 번 대조 출력 ⑥ "과거 판정 불변" 표.
- **실기기 확인**(verify-device 3절 형식 두 줄: `기기: …`, `사람이 볼 것: …`): ① VV4 — `이왜들` 아이콘, 자리표시(F1) ② VV7 — 네 줄 ✓ + 지문 ✓(F2), 세션 수 대조(사람) ③ VV8 — 홈 라이트·다크(F3), 재실행(F4), 다시 가져오기(F5) ④ Release 구성(`--configuration Release`)으로 구워 Metro 없이 뜬다. 기기 검증을 못 하면 **우회하지 않고 멈춘다**(verify-device 0절).
- 완료 후 `docs/DEV-RECORD-v2.1.md` — PR 1이 만들고 PR 2가 잇는다. 맨 위 "이 환경에서 확인된 제약"은 v1.21 목록에서 **웹 전용 항목(제약 3 `.css ?raw` 등)을 빼고** 잇는다. 더할 것: `WEB_FINAL` · Expo SDK·RN·React 실제 버전 · 무료 계정 7일 만료일 · Hermes의 `crypto.randomUUID` 없음(확인한 방법) · `toLocaleString` 쉼표 · gist 100개 한 쪽 · `name` ASCII · 네이티브 빌드 시간 · `dist` 크기 · Astryx A/B 중 무엇을 했는지. "배포 영향" 절(PR 본문 맨 위에도):
  - PR 1: **웹(Pages)은 바뀌지 않는다. 이 PR부터 배포가 없다.** 레포에서 웹 코드를 지웠다(`WEB_FINAL`에 있다). 남은 것은 코어·시드·검사 도구.
  - PR 2: **웹은 바뀌지 않는다.** 레포 뿌리에 아이폰 앱이 생겼다 — 맥북에서 구워 설치(7일마다). 앱은 웹 기록을 Gist에서 가져와 홈을 보일 뿐 기록하지 않는다.
- README: 각 작업의 "README 반영"을 그 작업 커밋에서.
- 버전: PR 1은 `package.json` `version` **1.21.0 그대로**(앱이 없다 — 새 버전을 붙일 것이 없다). PR 2의 VV4가 `name` `iwaedeul`·`version` **2.1.0**, `app.config.ts` `version` 2.1.0.

리뷰 단위: **작업별** — VV2는 수천 줄을 지우며 순수한 것을 잃지 않아야 하고, VV5는 "같다"를 판정하는 저장 엔진, VV7은 비밀값 경로다. 서로 다른 축에서 조용히 틀릴 수 있다.

---

## 사람이 할 일

PR 1 머지 뒤 한 번: `gh run list --workflow deploy.yml --limit 1`이 새 실행 없이 `WEB_FINAL`이고, 폰의 웹앱이 평소처럼 열린다(VV1 "사람이 볼 것").

PR 2 실기기 확인 전 한 번:
1. 아이폰 USB 연결·신뢰·개발자 모드, DeviceKit 에이전트 서명(verify-device 0절 — 했으면 만료일만).
2. Xcode → Settings → Accounts의 Personal Team ID를 뿌리 `.env.local`에 `APPLE_TEAM_ID=<값>`(커밋하지 않는다).
3. 웹 설정 → Gist 백업이 켜져 있는지, **지금 백업**.
4. 앱 가져오기 화면이 뜨면 **토큰을 사람이 붙여 넣는다**(Claude에게 주지 않는다 — MCP로 입력하면 대화에 남는다). 이후 Keychain에 남아 Claude는 `가져오기`만 누른다.
5. 웹 설정 → 기록 내보내기의 세션 수를 PR 댓글에(F2 대조).

---

## 화면 문구 (확정 — 1판 검토 1라운드. 사람이 마지막에 고칠 수 있다, 고쳐도 설계는 같다)

| 키 | 자리 | 문구 |
|---|---|---|
| A | 가져오기 설명 | `웹 앱이 올려 둔 Gist 백업을 읽어 이 기기에 넣습니다. 토큰은 gist 권한만 있으면 되고, 이 기기의 키체인에만 저장됩니다.` |
| B | 홈 카드 아래(시작 버튼 자리) | `기록은 아직 웹에서 합니다 — 여기서는 보기만 합니다` |
| C | 다시 가져오기 확인 | 제목 `이 기기의 기록을 교체할까요?` · 본문 `Gist 백업(<YYYY-MM-DD HH:mm>)으로 이 기기의 기록을 모두 교체합니다.` · 버튼 `취소` / `교체`(`destructive`) |
| D | 검증 불일치 | `가져온 값이 백업과 달라 되돌렸습니다. 이 기기의 기록은 가져오기 전 그대로입니다.` |
| E | 홈 큰 제목 | `이왜들` |
| F | 빈 기기 | `웹 앱의 기록을 가져오면 홈이 채워집니다.` |
| G | 가져오기 중 오류 | `가져오는 중 오류가 나 되돌렸습니다. 이 기기의 기록은 가져오기 전 그대로입니다.` + footnote에 오류 `message` |
| — | 가져오기 단계 글 | `백업 찾는 중` → `받는 중` → `넣고 확인하는 중` |

**스크린샷**: 실기기 스크린샷은 `docs/screenshots/v2.1/device/`에 **커밋한다**. 보이는 것은 운동 기록 수치뿐이고 토큰은 화면에 없다(VV7 스캔·결함 복원 ⑮). 개인 수치가 적은 장면(빈 기기·가져오기 결과)을 먼저 둔다.

**글꼴**: 시스템(SF Pro + Apple SD Gothic Neo) — VV6 3).

## 사람이 정할 것

없음. 1건(Astryx 패키지)은 사람이 A로 정했다(설치 충돌이면 B) — "설계자가 정한 것"·VV6 0)에 녹였다. README 본문은 구현자, `CLAUDE.md`가 README 결정을 가리키는 줄은 VV9 — 이것도 사람이 PLAN대로 확정했다.

---

## 검토 반영 기록

### 개정 (2026-11-26, 사람 지시 — 웹을 지금 버린다)

1판 ID → 개정 ID: VV1(코어 분리) → **VV2·VV3** · VV2(Expo) → **VV4** · VV3(SQLite) → **VV5** · VV4(가져오기) → **VV7** · VV5(테마) → **VV6** · VV6(홈) → **VV8** · VV7(규칙 문서) → **VV9**. 아래 두 라운드의 표는 1판에 대한 것이고 ID도 1판 번호다.

개정으로 뜻을 잃거나 바뀐 1판 반영:

| 1판 반영 | 개정에서 |
|---|---|
| 1라운드 고칠 것 1 — 테스트 본문 경로 리터럴 114줄, `vv1-paths` 막이 | 막이는 그대로(`scripts/test-paths.test.mjs`, VV2). 웹을 읽던 리터럴은 그 `it`과 함께 지워지므로 VV2 끝에 다시 센다 |
| 1라운드 고칠 것 2 — `check.mjs`·`ci.yml`은 구현자 PR, 규칙 문서는 규칙 정비자 | 그대로. 규칙 문서는 VV9(PR R1·R2) |
| 1라운드 고칠 것 5 — 웹·네이티브 양쪽을 읽는 조립식 스캔(상시 테스트) | 웹 소스가 레포에 없어 상시 테스트가 될 수 없다 → `WEB_FINAL`과 **한 번 대조**(VV8). "웹과 같은 답" 테스트와 리터럴 두 경우는 그대로 |
| 1라운드 1-4 — v2.2 웹 한 줄 배포가 Astryx 검사 없이 나간다 | 배포가 없다. 지움 |
| 1라운드 1-4 기각 — PR 2를 둘로 나누지 않는다 | 그대로(PR 2는 하나). 개정의 PR 1/PR 2 분리는 기기가 필요 없는 정리를 앞에 떼는 것이라 그 기각 이유(맥북 빌드 한 번 더)가 해당하지 않는다 |
| 2라운드 고칠 것 1 — 경로 리터럴 막이 실측 0건 | 규칙 그대로. 수는 VV2 뒤 다시 센다 |
| 2라운드 경미 3 — "이름 그대로" diff | VV3에 그대로. VV2에는 "남긴 본문 불변"(`+`줄)과 "이름 집합"을 더했다 |

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

### 2라운드 (`.reports/v2.1-review.md` "2라운드", Claude Opus 5.5, 검토 커밋 `a410845`) — 1판 검토는 이 라운드로 끝났다

| 지적 | 판단 | 근거·반영 자리 |
|---|---|---|
| 고칠 것 1 — 경로 리터럴 막이가 지금 46건 실패한다 | **반영** | 설계자가 같은 정규식으로 `src/**/*.test.ts(x)`·`scripts/*.test.mjs`를 세어 확인: glob 문자(`*`·`{`·`?`) 든 것 25건 + `scripts` 21건 = 46건, `src`만 보고 glob 문자를 건너뛰면 0건. 25건은 전부 `import.meta.glob` 첫 인자(여러 줄 배열 포함, 예 `v113.test.ts:370`)라 glob 쪽이 본다. VV1 6) 경로 리터럴 규칙을 `src` 테스트로 좁히고 glob 문자를 건너뛰게, 건너뛴 수 단언을 템플릿·glob 문자 각각으로. 결함 복원 ③(`v116.test.ts`)은 `src` 안이라 그대로 잡힌다 |
| 경미 1 — "구현자는 이 때문에 멈추지 않는다"가 REVIEW.md 3절과 부딪혀 보인다 | **반영** | 검토자 문장 그대로("이 경로의 결정은 이 PLAN이 미리 정했다 — 구현자는 PLAN에 없는 결정이 필요할 때만 멈춘다"). 구현 순서의 사람 필요 경로 표 위 |
| 경미 2 — `requestAnimationFrame`을 `yieldFrame`으로 주입 | **반영** | `runImport`가 다른 의존성처럼 인자로 받는다. VV4 3) 5단계와 `runImport.test.ts` 의존성 목록 |
| 경미 3 — "이름 그대로" diff가 경로 리터럴 줄 전체를 빼서 같은 줄의 단언 변경이 안 보인다 | **반영** | 검토자는 고칠 것으로 올리지 않았지만 비용이 명령 한 줄이라 넣었다. 경로를 `src/~/`로 맞춘 뒤 `-`줄·`+`줄을 정렬해 짝으로 비교(VV1 검증). 가짜 diff로 확인: 경로만 바뀐 줄은 빈 출력, 같은 줄의 `toMatch(/b/)`→`/c/`는 남는다 |
| (설계자가 더함) glob 쪽의 `!` 제외 패턴 | **반영** | 고칠 것 1을 확인하다 `v113.test.ts:369`의 `'!/src/lib/**/*.test.ts'`를 봤다 — 그대로 맞춰 보면 파일과 안 맞는다고 나올 수 있어 `!`를 뗀 패턴으로 본다고 적었다(VV1 6) glob) |
| 사람이 정할 것 | — | 2라운드 검토자도 "없음". 1라운드 확정 그대로 |

### 개정 1라운드 (`.reports/v2.1-review.md`, Claude Opus 5.5, 검토 커밋 `730c977`)

| 지적 | 판단 | 근거·반영 자리 |
|---|---|---|
| 고칠 것 1 — 웹·코어 경로를 섞은 배열에 규칙이 없다 | **반영** | `v113.test.ts:369-371·654-656·926-928`, `v114.test.ts:356-358`, `v111.test.ts:609·618·626`, `v1112.test.ts:222·226`, `v115.test.ts:633` 확인. 설계자 grep으로 같은 모양 **19곳·9개 파일**(검토자가 든 것 외에 `audioIndependence`·`dietAccess`·`strengthWork`·`v116:928`). 검토자의 방향(원소만 뺀다)을 택했다. VV2 진단·3) 규칙 두 줄(경로 배열, 단언 문장 하나)·DEV-RECORD 자리 표·4) glob을 원소마다·검증의 "남긴 본문 불변" 명령(원소를 뺀 `-`줄과 같은 `+`줄을 거른다 — 가짜 입력 4줄로 확인)·결함 복원 ⑤ 둘 더함·"과거 판정 불변" 표. **추가로 고친 것**: 원소를 빼면 `v114.test.ts:454` `toHaveLength(3)`이 깨진다 — `n`만 줄인다고 정했다. 배열이 아닌 단언 문장(`v113.test.ts:939`)도 같은 이유로 문장 단위 지우기를 더했다 |
| 고칠 것 2 — `stripSecrets`가 안 쓰는 함수가 되고, 걸러내기가 두 곳 | **반영** | `backup.ts:88·138`, `secrets.ts:15-16·27·35-36`, `tsconfig.app.json:18` 확인. VV2 진단·1) 반쪽 파일(`stripSecrets` export, `PREFIX`·`GIST_TOKEN_KEY` 지움)·범위 제외의 예외, VV5 1단계, 결함 복원 ⑩ |
| 고칠 것 3 — 골든 일곱을 제목으로 | **반영** | `v111:350·367·497·542·577·608`, `v112:157·172·235·534`, `v113:488`, `v114:81`, `v115:149`, `v116:620` 확인. VV2 3)에 일곱 제목과 줄, "그 밖은 골든이 아니다"(`GG1 — 소스 스캔 (초크포인트)` 등). 검증의 이름 목록을 제목으로 뽑는다 |
| 고칠 것 4 — 전환 뒤 웹이 Gist를 덮는 길 | **반영** | `gistSync.ts:107-117`(`lastHash === fingerprint && lastAt !== null`이면 건너뜀) 확인. "데이터 이전" 4에 v2.2 범위 한 줄(`updated_at` 확인), "개정이 바꾼 것" 표. v2.1 구현 범위는 그대로 |
| 고칠 것 5 — VV3 명령과 억제 파일 | **반영** | `v116.test.ts:902`, `eslint-suppressions.json`의 `src/lib/*.test.ts` 키 10개 확인, `eslint --help`에 `--prune-suppressions`(ESLint 9.39). "이름 그대로"를 두 명령(그대로·한 줄 배열 정렬)으로 — ②는 비고, ①에 나온 줄을 DEV-RECORD에. 억제 파일은 VV2 5)에 prune, VV3 1)에 모든 키 경로 바꿈 + prune |
| 사람이 정할 것 1에 단 조건 — 잠금 파일 왕복의 이유 | **반영** | "설계자가 정한 것" Astryx 줄과 VV6 0)에 한 줄(PR 1 시점엔 knip이 막는다). 사람이 A로 확정해 절을 지웠다 |
| 경미 1 — 수치(56·65) | **기각** | `ls src/lib \| grep -v '\.test\.' \| wc -l` → **57**, `grep -c '\.test\.'` → **64**. 검토자의 56·65는 `testFixtures.ts`(이름에 `test`)를 테스트 쪽으로 센 값이다. PLAN 진단에 세는 법을 적었다 |
| 경미 1 — 남는 `vite`의 이유, `knip.json` `ignoreDependencies` | **반영** | `node_modules/vitest/node_modules/vite` 8.2.0 · 루트 5.4.21, `knip.json` 확인. VV2 2) |
| 경미 2 — 뿌리 `"type": "module"` | **반영** | `package.json` `type` `module`, 뿌리 `.js` 설정 파일은 `eslint.config.js` 하나 확인. **`type`을 뺀다**(Expo 기본) + `eslint.config.mjs`·`vitest.config.mts` — 검토자의 두 길 중 Expo 도구의 `.cjs` 탐색에 기대지 않는 쪽. VV4 2) 이유 문단·검증(`expo config`)·결함 복원 ⑥ |
| 경미 3 — `settingValue` 규칙이 둘 | **반영** | `db/index.ts:74-76`(행이 있으면 `row.value`), `useDiet.ts:64-65`(`?? fallback`), `store/settings.ts:78` 확인. **`getSetting` 식 그대로**로 정했다 — 웹 홈이 읽은 `currentPhase`·`activeRoutineId`가 이 길이었다. `buildDietData`는 `useDiet`의 `??`를 그대로. 검증의 `{key}`만 행 → `undefined` |
| 경미 4 — 6) 표에 빠진 순수 조각 | **반영** | `src/ax/clampStep.ts`, `AnalyzeScreen.tsx:59` `sensoryDot`, `chartTheme.ts`, `share.ts:85` `OUTCOME_MESSAGE` 확인. 6) 표 네 줄 |
| 경미 5 — 시각은 `formatDateTimeLocal`로(R5) | **반영** | `dates.ts:168` 확인. VV7 결과 표(문구 C·VV8 머리 포함), VV8 머리, `homeModel` 검증 한 줄 |

화면에 보이는 문구는 이 라운드에서 바뀌지 않았다.

기각한 지적: 1라운드 "1-4 PR 2를 둘로", "경미 7" 둘 · 개정 1라운드 "경미 1의 수치"(위 표).
