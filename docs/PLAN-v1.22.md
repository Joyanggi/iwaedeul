# PLAN v1.22 — 계정과 서버 DB: 로그인하면 기록이 계정별로 서버와 맞춰진다 (TT)

> 작성: Claude Opus 5.5 (설계자), 2026-11-23. 대상 코드: v1.21.0 (`main` `ef07b74`).
> 근거: 이슈 #31 (구조 변경) **요청 1·5**. 요청 2는 v1.16, 요청 3·4는 v1.15에서 끝났다.
> 승인: 이슈 #31 댓글 "사람 승인 기록 (구두, 2026-11-11)" — 요청 1·5가 README "서버를 두지 않는다"·"1인용"을 뒤집는 것을 승인했고, 서비스 선택·오프라인 유지 여부는 설계자에게 맡겼다.
>
> **성격**: Dexie 스키마 버전(3)과 백업 `SCHEMA_VERSION`(3)은 올리지 않는다. 동기화 장부는 **별도 IndexedDB**(`workout-tracker-sync`)에 둔다.
> 로그인하지 않으면 지금과 하나도 다르지 않다. 빌드에 서버 주소가 없으면(CI·설정 전) 계정 카드 자체가 없다.
> 판정·제안·내보내기는 바뀌지 않는다 — 동기화는 같은 행을 다른 기기로 옮길 뿐이다.

---

## 단계 지도 (이슈 #31 전체)

| 단계 | 요청 | 내용 | 상태 |
|---|---|---|---|
| ① | 3·4 | 내 음식 목록 + 시간별 먹은 것 | 끝남 (v1.15) |
| ② | 2 | 루틴을 앱에서 만들고 고친다 | 끝남 (v1.16) |
| ③ | 1·5 | 계정 · 서버 DB · 계정별 데이터 | **이 PLAN** (TT1~TT3 한 PR, TT4 다음 PR) |

v1.16이 ③을 위해 지켜 둔 것(루틴 = 행 하나, 내 종목 = `exercises`의 `custom` 행)을 그대로 쓴다.

---

## 설계자가 정한 것 (승인 댓글이 맡긴 갈림길)

| 갈림길 | 정한 것 | 택하지 않은 것과 이유 |
|---|---|---|
| 서비스 | **Supabase** (Postgres + Auth, 무료 플랜, 서울 지역). 앱은 **SDK 없이 `fetch`로** REST 두 개(`/auth/v1`, `/rest/v1`)만 부른다 — `gist.ts`와 같은 방식 | Firebase: Firestore가 자체 오프라인 캐시를 가져 Dexie와 진실 원천이 둘이 된다 · 자체 서버: 운영할 사람이 없다 · `supabase-js`: 첫 화면 360KB 기준에 부담이고, 쓰는 기능이 로그인·행 읽기/쓰기뿐이라 fetch로 충분하다. fetch 클라이언트는 `gist.test.ts`처럼 fetch를 모킹해 전부 테스트된다 |
| 오프라인 | **유지한다.** 화면은 지금처럼 기기 IndexedDB만 읽고 쓴다(저장 버튼 없음, 즉시 반영). 서버는 **계정별 사본**이고 뒤에서 맞춘다 | 서버를 직접 읽는 앱: 헬스장 신호가 없으면 기록이 안 된다(README "입력 즉시 반영"·DESIGN 9.3 "오프라인"을 잃는다) |
| 동기화 단위 | **행 단위.** 일곱 테이블의 행 하나 = 서버 `records` 행 하나 | 백업 파일 통째(Gist처럼): 두 기기가 다른 날을 적어도 한쪽이 통째로 진다 |
| 바뀐 행 찾기 | **내용 지문 비교.** 마지막으로 맞춘 행의 SHA-256을 장부에 두고, 동기화 때 지금 행의 지문과 비교한다. 쓰기 자리에 훅을 달지 않는다 | Dexie 훅/미들웨어로 바뀐 목록 쌓기: `clear()`·복원·시드·옛 버전(되돌리기 중)이 쓴 것을 놓치는 길이 생긴다. 지문 비교는 **누가 썼든** 잡는다. 비용은 지금 Gist 동기화가 이미 매번 하는 전체 덤프 + SHA-256과 같다 |
| 충돌 | **행마다 마지막으로 올린 쪽이 이긴다.** 받을 때 이 기기에서 아직 안 올린 행은 덮지 않는다 | 행 안 필드 병합: 세션·식단 하루는 한 사람이 한 기기에서 적는 것이 보통이라 값이 작다 |
| 로그인 방식 | 이메일 + 비밀번호(사람이 정할 것 1의 추천). iOS 홈 화면 앱에서 다른 창으로 나가지 않는다 | 아래 "사람이 정할 것" 1 |
| 장부 위치 | 별도 DB `workout-tracker-sync`. 백업 파일에 계정 정보가 섞이지 않고, 메인 DB 버전을 안 올려 v1.21로 되돌릴 수 있다 | Dexie v4에 테이블 추가: v1.21 코드가 v4 DB를 못 연다(되돌리기 불가) |

---

## 뒤집는 README 결정 (사람이 볼 목록)

| README의 지금 결정 | 바뀌는 것 | 작업 |
|---|---|---|
| 머리말 "서버도 로그인도 없고, 데이터는 전부 기기 안(IndexedDB)에 있습니다" | 기기 안이 먼저이고, 로그인하면 계정별로 서버와 맞춰진다 | TT3 |
| Why "서버를 두지 않는다" | 서버는 계정별 사본이다. iOS 홈 화면 앱으로 쓰는 것은 그대로 | TT3 |
| Limitations "1인용입니다. 다중 사용자, 로그인, 서버 동기화가 없습니다" | 지운다. 대신 충돌 규칙·무료 플랜 멈춤·운영자 열람을 적는다 | TT3 |
| "백업 · 비밀값"의 Gist 세 항목, Architecture의 Gist | 지운다 | TT4 |

---

## 작업 개요

| ID | 내용 | 화면 | 배포했을 때 |
|---|---|---|---|
| TT1 | 동기화 엔진: 무엇을 올리고 받는지 정하는 순수 함수 + 장부 DB | 없음 | 아무것도 부르지 않는다 |
| TT2 | 서버 스키마(`supabase/schema.sql`) + REST 클라이언트 + 설정값 + 로그인 세션 비밀값 차단 | 없음 | 아무것도 부르지 않는다 |
| TT3 | 계정 카드(가입·로그인·처음 연결·로그아웃·계정 삭제) + 자동 동기화 + 복원·초기화·배너 연결 | 설정 `계정·동기화` 묶음, 홈 백업 배너 문구 | 서버 주소가 빌드에 있을 때만 보인다 |
| TT4 | Gist 백업을 걷어낸다 | 설정의 Gist 카드가 사라진다 | 사람이 TT3를 실기기에서 확인한 뒤 별도 PR |

---

## 공통 진단 — 지금 데이터는 어디에 있고 무엇이 백업으로 나가나

| 사실 | 근거 |
|---|---|
| Dexie 테이블 일곱 개, 스키마 v3. PK: `routines.id` `exercises.id` `sessions.id` `settings.key` `exerciseNotes.recordKey` `dietPlans.id` `dietDays.date` (전부 문자열) | `src/db/index.ts:38-65` |
| 백업은 일곱 테이블 전체 덤프, 비밀 키는 거른다 | `src/lib/backup.ts:118-147` (`stripSecrets` `:88`) |
| 복원은 `clear()` 후 `bulkPut` 전체 교체 | `src/lib/backup.ts:259-301` |
| 비밀값은 localStorage, `setSetting`이 비밀 키를 거부한다 | `src/lib/secrets.ts:19-23`, `src/db/index.ts:83-96` |
| 동기화 예약을 부르는 곳은 정의·세션 종료·식단 쓰기·루틴 쓰기 네 곳이고 테스트가 고정한다 | `src/lib/gistSync.ts:160` · `src/lib/dietBackup.test.ts:91-98` |
| 부팅 순서: 시드 → 설정 읽기 → 진행 중 세션 복구 → 밀린 백업 | `src/App.tsx:98-106` |
| 시드가 **매 부팅** 번들 종목 카탈로그를 `bulkPut`한다. 번들 루틴·식단 플랜은 리비전이 다를 때만 쓴다 | `src/db/seed.ts:96`, `:98-110`, `:116-119` |
| 설정은 부팅 때 한 번 zustand로 읽는다 — 다른 곳에서 `settings` 행이 바뀌면 다시 읽어야 화면에 반영된다 | `src/store/settings.ts:65-104` |
| 진행 중 세션은 store의 사본을 화면이 보고, 쓰기는 `db.sessions.put`으로 따라간다 | `src/store/session.ts:31-35` |
| "모든 데이터 초기화"는 `db.delete()` | `src/screens/SettingsScreen.tsx:107-108` |
| 홈 백업 배너는 Gist 설정 여부와 `lastBackupAt`으로 정한다. 문구가 "설정 → Gist 백업"을 가리킨다 | `src/screens/HomeScreen.tsx:96-97`, `:273-277`, `:353-361`, `:481-482` |
| 입력칸은 `autoComplete`를 필드별로 덮지 못한다(테스트) | `src/lib/inputProps.test.ts:91-99` |
| 첫 화면 기준 360KB(gzip) | `scripts/first-load.mjs:18` |
| 변이 테스트는 `src/lib/` 바로 아래 `.ts`만 본다 — 새 파일을 하위 폴더에 두면 변이 테스트를 안 받는다 | `scripts/mutation.mjs:21-23` |
| 테스트에 IndexedDB가 없다(fake-indexeddb 없음) — 엔진은 순수 함수와 주입한 저장소로 테스트한다 | `grep -rn fake-indexeddb src` 결과 없음 |

**안 만들면:** 기기를 바꾸면 JSON·Gist로 손수 옮겨야 하고, 다른 사람은 GitHub 토큰을 발급해야 백업을 쓸 수 있다. 여러 사람이 쓰려는 요청의 목적을 기존 기능으로 이룰 수 없다(LLM 내보내기는 상관없다).

---

## TT1. 동기화 엔진

### 진단

동기화의 위험은 화면이 아니라 "무엇을 지우고 무엇을 덮는가"에 있다. 그 판단을 네트워크·IndexedDB 없이 테스트할 수 있게 순수 함수로 먼저 세운다.

### 설계

**파일:** `src/lib/syncPlan.ts`(순수), `src/lib/syncDb.ts`(장부 DB), `src/lib/syncEngine.ts`(한 번의 동기화 — 저장소와 서버를 주입받는다). 셋 다 `src/lib/` 바로 아래(변이 테스트 대상).

**1. 무엇이 동기화되나 — `isSyncedRow(tbl, row)` 한 곳 (초크포인트)**

| 테이블 | 올리고 받는 행 | 안 올리는 행과 이유 |
|---|---|---|
| `routines` | 전부 | — |
| `exercises` | `custom === true`인 행만 | 번들 카탈로그: 시드가 매 부팅 앱 번들에서 쓴다(`seed.ts:96`). 올리면 앱 버전이 다른 두 기기가 서로의 카탈로그를 번갈아 덮는다 |
| `sessions` | 전부(진행 중 세션도 올린다 — 운동 중 폰이 죽어도 서버에 남게) | — |
| `settings` | `DEVICE_LOCAL_SETTING_KEYS`와 비밀 키(`isSecretSettingKey`) 말고 전부 | `seededRoutineRevision` `seededDietRevision`(그 기기 앱 번들의 시드 장부 — 공유하면 버전이 다른 기기가 시드를 번갈아 다시 쓴다) · `gistId` `lastBackupAt` `lastBackupHash`(그 기기의 Gist 장부) · `soundVolume` `duckOthers`(그 기기의 스피커·이어폰에 따른 것) |
| `exerciseNotes` `dietPlans` `dietDays` | 전부 | — |

```ts
export const SYNC_TABLES = ['routines','exercises','sessions','settings','exerciseNotes','dietPlans','dietDays'] as const
export type SyncTable = (typeof SYNC_TABLES)[number]
export const DEVICE_LOCAL_SETTING_KEYS: readonly string[]  // 위 일곱 개
export function pkOf(tbl: SyncTable, row: unknown): string    // 위 PK 표
export function isSyncedRow(tbl: SyncTable, row: unknown): boolean
export function rowKey(tbl: SyncTable, pk: string): string     // `${tbl}\u0000${pk}`
```

**2. 지문**

```ts
export function stableStringify(value: unknown): string  // 객체 키를 정렬, undefined 필드는 뺀다(JSON.stringify와 같은 규칙), 배열 순서는 그대로
export async function rowHash(row: unknown): Promise<string>  // SHA-256 hex(stableStringify(row)). crypto.subtle이 없으면 예외 — 대체 해시를 두지 않는다(gistSync.ts:59-74와 같은 이유 — 약한 해시는 충돌이 "실제 변경을 건너뛰는" 사고가 된다)
```
키 정렬이 필요한 이유: 서버(jsonb)가 키 순서를 바꿔 돌려준다. 정렬하지 않으면 받은 행이 늘 "바뀐 행"으로 보인다.

**3. 장부 DB — `syncDb.ts`**

```ts
// new Dexie('workout-tracker-sync'), version(1): synced: '[tbl+pk]', meta: 'key'
interface SyncedEntry { tbl: SyncTable; pk: string; hash: string }   // 마지막으로 서버와 같았던 내용의 지문
interface SyncMeta {
  accountId: string        // 이 기기 기록이 묶인 계정(Supabase user id)
  email: string
  cursor: string | null    // 받은 서버 행 updated_at의 최댓값 (서버 시각만 쓴다 — 폰 시계를 믿지 않는다)
  lastSyncAt: string | null  // 마지막으로 한 바퀴를 끝낸 시각 (화면·배너 표시용)
  allowMassDelete: boolean // 복원 직후 한 번만 true (아래 6)
}
export async function forgetSyncDb(): Promise<void>  // DB를 통째로 지운다 (로그아웃·초기화)
```
메인 DB(`workout-tracker`)와 다른 DB라서 백업 파일(`createBackup`)에 실리지 않는다.

**4. 올릴 것 — `planPush`**

```ts
interface LocalRow { tbl: SyncTable; pk: string; row: unknown; text: string; hash: string }  // text = stableStringify(row)
export function planPush(local: Map<string, LocalRow>, synced: Map<string, SyncedEntry>):
  { upserts: LocalRow[]; deletes: { tbl: SyncTable; pk: string }[] }
```
- `upserts`: 동기화 대상 로컬 행 중 장부에 없거나 지문이 다른 것.
- `deletes`: 장부에 있는데 로컬에 없는 것(이 기기에서 지웠다). 서버에는 `deleted: true, data: null`로 올린다(행을 지우지 않는다 — 다른 기기가 "지워졌다"를 받아야 한다).
- 장부에 없고 로컬에도 없는 것은 아무것도 아니다.

**5. 받을 것 — `planPull`**

```ts
interface PulledRow { tbl: SyncTable; pk: string; data: unknown | null; deleted: boolean; updatedAt: string; hash: string | null }  // hash: deleted면 null
export function planPull(pulled: PulledRow[], local: Map<string, LocalRow>, synced: Map<string, SyncedEntry>):
  { puts: PulledRow[]; deletes: { tbl; pk; baseText: string }[]; setSynced: SyncedEntry[]; dropSynced: string[]; skipped: { key: string; reason: 'local-change' | 'open-session' | 'not-synced' }[] }
```
행마다 이 순서로 판정한다:

| # | 조건 | 결과 |
|---|---|---|
| 1 | `isSyncedRow`가 아니다(번들 종목·기기 전용 키가 어쩌다 서버에 있다) | `not-synced`로 건너뜀 |
| 2 | `sessions`이고 로컬 행이나 받은 행이 진행 중(`endedAt` 없음) | `open-session`으로 건너뜀. 끝나지 않은 세션은 그 기기에서 끝난 뒤에 온다. 같은 세션을 두 기기에서 열지 않게 하려는 것 |
| 3 | 받은 지문 = 로컬 지문(둘 다 없음 포함) | 쓰지 않고 장부만 맞춘다(`setSynced` 또는 `dropSynced`) |
| 4 | 로컬 지문 ≠ 장부 지문 (이 기기에서 아직 안 올린 변경) | `local-change`로 건너뜀. 다음 올리기가 서버를 덮는다 |
| 5 | 그 밖 | 받은 것으로 쓴다(`puts` 또는 `deletes`) + 장부 맞춤 |

`deletes`·`puts`에는 계획을 세운 순간의 로컬 `text`(`baseText`)를 함께 둔다 — 아래 7의 "쓰기 직전 재확인"에 쓴다.

**6. 한꺼번에 지우기 멈춤 — `massDeleteCount(deletes)`**

`settings`를 뺀 테이블의 지움이 `MASS_DELETE_LIMIT = 10`건 이상이면 그 바퀴는 **아무것도 올리지 않고** 상태를 `held`로 둔다(TT3 화면이 묻는다). `meta.allowMassDelete`가 true면(복원 직후) 그대로 올리고 false로 되돌린다.
이유: 기기 저장소가 비거나 잘못된 복원으로 로컬이 비면, 지문 비교는 "전부 지웠다"로 읽고 서버의 계정 기록을 지우러 간다. 조용히 잃는 가장 나쁜 길이라 사람에게 묻는다.

**7. 한 바퀴 — `syncEngine.ts`의 `runCycle(deps)`**

```ts
interface EngineDeps {
  readLocal(): Promise<Record<SyncTable, unknown[]>>
  /** 한 트랜잭션. 행마다 지금 로컬 stableStringify가 baseText와 같을 때만 쓴다(같지 않으면 건너뛰고 skipped에 센다) */
  applyLocal(puts, deletes): Promise<{ applied: number; settingsTouched: boolean }>
  readSynced(): Promise<SyncedEntry[]>; writeSynced(set: SyncedEntry[], drop: string[]): Promise<void>
  readMeta(): Promise<SyncMeta>; writeMeta(patch: Partial<SyncMeta>): Promise<void>
  pull(since: string | null): Promise<ServerRow[]>   // TT2 api — 페이지를 다 돈 결과
  push(rows: { tbl; pk; data; deleted }[]): Promise<void>
}
type CycleResult = { status: 'done'; pulled: number; pushed: number; conflicts: number } | { status: 'held'; deletes: number }
```
순서: ① `pull(cursor − 5분)` (cursor가 없으면 전부) → 지문 계산 → `planPull` → `applyLocal` → 장부 ② 로컬을 다시 읽어 `planPush` → 멈춤 검사 → `push`(200행·1MB씩 나눠, TT2가 나눈다) → 올린 행의 지문으로 장부 ③ `cursor = max(cursor, 받은 updatedAt)`, `lastSyncAt = now`.
- **5분 겹침:** 서버는 행마다 커밋 직전 시각을 매긴다. 늦게 커밋된 행이 이미 지나간 cursor보다 이른 시각을 가질 수 있어, 매번 5분을 겹쳐 다시 받는다. 다시 받은 행은 판정 3으로 아무것도 안 한다.
- **쓰기 직전 재확인:** `applyLocal`은 Dexie 트랜잭션 안에서 행을 다시 읽어 `baseText`와 **글자로** 비교한다. 트랜잭션 안에서 `crypto.subtle`을 기다리면 Dexie가 트랜잭션을 먼저 닫으므로 지문은 트랜잭션 밖에서만 계산한다. 계획을 세운 뒤 사용자가 적은 값을 받은 값이 덮지 않게 하는 장치다.
- 올리는 도중 사용자가 쓴 값은 장부 지문과 달라 다음 바퀴에 올라간다(놓치지 않는다).
- 한 번에 한 바퀴만 돈다(진행 중이면 끝난 뒤 한 번 더 예약).

**8. 처음 연결 — `joinCase`**

```ts
export function hasUserData(snapshot, bundled: { routineId: string; dietPlanIds: string[] }): boolean
// sessions·dietDays·exerciseNotes 중 하나라도 행이 있거나, 번들이 아닌 루틴·식단 플랜, custom 종목이 있으면 true. settings는 보지 않는다(온보딩이 쓴다)
export type JoinCase = 'resume' | 'upload' | 'download' | 'ask' | 'foreign'
export function joinCase(a: { linkedAccountId: string | null; accountId: string; serverHasData: boolean; localHasUserData: boolean }): JoinCase
```

| 장부의 계정 | 서버 | 이 기기 | 결과 |
|---|---|---|---|
| 같은 계정 | — | — | `resume`: 보통 바퀴 |
| 다른 계정 | — | 기록 있음 | `foreign`: 로그인하지 않는다(다른 사람 기록이 섞이지 않게) |
| 다른 계정 | — | 기록 없음 | 장부를 지우고 아래 줄로 |
| 없음 | 비었다 | — | `upload`: 장부 없이 바퀴를 돌면 전부 올라간다(지움 0) |
| 없음 | 있다 | 기록 없음 | `download`: 받기 |
| 없음 | 있다 | 기록 있음 | `ask`: 사람에게 묻는다(TT3) |

**받기(`download`)** = `receiveAll`: 서버 행 전부(지워진 것 제외)를 받아, 한 트랜잭션에서 **동기화 대상 행만** 지우고(번들 종목·기기 전용 키는 남긴다) 받은 행을 넣는다. 진행 중 세션은 넣지 않는다(판정 2와 같다). 장부 = 받은 지문, cursor = 받은 최댓값. 끝나면 화면을 새로 연다(복원과 같다, `GistPanel.tsx`의 `window.location.reload()`).

### 검증 (`src/lib/v122.test.ts`, describe `TT1`)

예시:
- `isSyncedRow('exercises', 번들 종목)` false, `custom: true` 종목 true. `settings`의 `seededRoutineRevision`·`soundVolume`·`gistToken` false, `currentPhase`·`userFoods` true.
- 처음 바퀴(장부 없음, 서버 빈 것): 로컬 동기화 대상 행이 전부 `upserts`, `deletes` 0.
- 한 번 맞춘 뒤 세션 하나를 고치면 그 세션 하나만 `upserts`.
- 세션 하나를 지우면 `deletes` 1, 서버 행은 `deleted: true, data: null`.
- 받은 행이 이 기기에서 안 올린 행이면 건너뛰고(`local-change`), 다음 `planPush`에 그 행이 남는다.
- 진행 중 세션은 받아도 쓰지 않는다(로컬이 진행 중일 때, 받은 것이 진행 중일 때 둘 다). 로컬 진행 중 세션은 올라간다.
- 세션 11건을 지운 바퀴는 `held`이고 `push`가 한 번도 불리지 않는다. `allowMassDelete` true면 올리고 false로 돌아간다. 지움 9건은 그대로 올린다. `settings` 지움은 세지 않는다.
- 5분 겹침: 가짜 서버가 cursor보다 2분 이른 `updatedAt`으로 행을 늦게 넣으면 다음 바퀴가 받는다(겹침을 없애면 못 받는다).
- 재확인: `planPull` 뒤 `applyLocal` 전에 같은 행을 로컬에서 고치면 받은 값이 덮지 않고, 다음 바퀴에 로컬 값이 올라간다.
- `joinCase` 표의 여섯 줄 그대로. 시드만 있는 새 기기(온보딩만 마침) + 서버 기록 있음 → `download`.
- `receiveAll` 뒤 번들 종목 행과 기기 전용 키(`soundVolume`)는 남아 있고, 서버에 없던 로컬 세션은 없다.

속성 (`src/lib/properties.test.ts`에 옮긴다):
- `stableStringify`는 객체 키 순서를 어떻게 섞어도 같은 글자다. `JSON.parse(stableStringify(x))`는 `JSON.parse(JSON.stringify(x))`와 깊이 같다.
- **수렴:** 어떤 로컬 행·서버 상태에서도 `runCycle`(멈춤 없이)을 한 번 돈 뒤 `planPush`는 빈 계획이다.
- **두 번 해도 같다:** 바뀐 것 없이 `runCycle`을 두 번 돌면 두 번째는 `push`를 부르지 않고 `applyLocal`이 아무것도 쓰지 않는다.
- **두 기기:** 기기 A·B가 서로 다른 행만 고치는 어떤 순서(각자 고침 → 바퀴)에서도, A 바퀴 → B 바퀴 → A 바퀴 뒤 두 기기의 동기화 대상 행이 같다.
- **기기 전용은 안 나간다:** 어떤 로컬에서도 `upserts`에 `DEVICE_LOCAL_SETTING_KEYS`·비밀 키·번들 종목이 없다.
- **안 올린 변경은 받기에 지지 않는다:** 어떤 받은 행에서도 `planPull`은 로컬 지문 ≠ 장부 지문인 행을 `puts`·`deletes`에 넣지 않는다.

### 범위 제외

- 필드 단위 병합: 같은 행을 두 기기가 오프라인에서 고치면 나중에 올린 쪽이 이긴다(README에 적는다).
- 서버 행 검증(`validateRoutine` 등): 같은 계정의 다른 기기에서 검증을 거쳐 쓰인 행이다. 복원 경로의 검증은 그대로다.
- 지움 표시(tombstone) 정리: 서버에 남는다. 크기가 작다(데이터 없음).

### README 반영

없음 (TT3에서 한꺼번에 적는다 — TT1만으로는 동작이 바뀌지 않는다).

---

## TT2. 서버 스키마 · REST 클라이언트 · 설정값

### 진단

서버의 "계정별 분리"는 앱 코드가 아니라 데이터베이스의 행 수준 보안(RLS)이 지킨다. 앱에 들어가는 키는 공개용 키(publishable key)뿐이고, public 레포에 있어도 되는 것은 RLS가 맞을 때뿐이다. 그래서 스키마를 레포에 파일로 두고 테스트가 그 글자를 확인한다.

### 설계

**1. `supabase/schema.sql`** (사람이 SQL 편집기에 붙여 한 번 실행한다. 다시 실행해도 같은 결과)

```sql
create table if not exists public.records (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tbl        text not null check (tbl in ('routines','exercises','sessions','settings','exerciseNotes','dietPlans','dietDays')),
  pk         text not null check (length(pk) between 1 and 200),
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, tbl, pk),
  check ((deleted and data is null) or (not deleted and data is not null))
);
create index if not exists records_user_updated on public.records (user_id, updated_at);

alter table public.records enable row level security;
revoke all on public.records from anon;
grant select, insert, update on public.records to authenticated;

drop policy if exists records_select on public.records;
create policy records_select on public.records for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- delete 정책은 없다. 지움은 deleted 표시로 하고, 행을 지우는 길은 계정 삭제(아래 함수)뿐이다.

create or replace function public.records_touch() returns trigger language plpgsql as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.records_touch();

create or replace function public.delete_my_account() returns void
  language sql security definer set search_path = '' as $$ delete from auth.users where id = auth.uid(); $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
```
`updated_at`을 서버가 매기는 이유: 폰 시계가 틀려도 cursor가 틀리지 않게.

**2. 설정값 — `src/lib/cloudConfig.ts`**

```ts
export const CLOUD_URL: string   // import.meta.env.VITE_SUPABASE_URL ?? ''
export const CLOUD_KEY: string   // import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
export function isCloudAvailable(): boolean  // 둘 다 있고 URL이 https:// 로 시작
```
- `src/vite-env.d.ts`에 `ImportMetaEnv` 두 칸을 선언한다.
- `.github/workflows/deploy.yml`의 `npm run build` 단계에 `env: VITE_SUPABASE_URL: ${{ vars.SUPABASE_URL }}`, `VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}`. `ci.yml`은 그대로(값 없음 → 계정 카드 없음).
- `.env.uicheck`(커밋한다): `VITE_SUPABASE_URL=https://uicheck.invalid`, `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_uicheck`. 화면 검사용 빌드(`npm run build -- --mode uicheck`)만 읽는다. 실제 키는 레포에 두지 않는다(공개용 키라도 저장소 변수로 둔다 — 프로젝트를 바꿀 때 코드를 안 고치게).

**3. 로그인 세션 — `src/lib/secrets.ts`에 더한다**

```ts
interface CloudSession { accessToken: string; refreshToken: string; expiresAt: number /* epoch ms */; userId: string; email: string }
export function getCloudSession(): CloudSession | null   // localStorage 'workout-tracker.cloudSession'
export function setCloudSession(s: CloudSession | null): void
// SECRET_SETTING_KEYS에 'cloudSession'을 더한다 → setSetting이 거부, createBackup·restoreBackup이 거른다 (세 겹, README "백업 · 비밀값")
```

**4. REST 클라이언트 — `src/lib/cloudApi.ts`** (`gist.ts`와 같은 꼴. 토큰은 헤더에만, 어떤 문자열에도 합성하지 않는다)

| 함수 | 요청 | 반환 |
|---|---|---|
| `signUp(email, password)` | `POST {URL}/auth/v1/signup` 본문 `{email, password}` | `CloudSession`. 응답에 `access_token`이 없으면(이메일 확인이 켜진 프로젝트) `CloudError('confirmRequired')` |
| `signIn(email, password)` | `POST /auth/v1/token?grant_type=password` | `CloudSession` |
| `refresh(refreshToken)` | `POST /auth/v1/token?grant_type=refresh_token` 본문 `{refresh_token}` | 새 `CloudSession`(refresh token도 바뀐다 — 새 것을 저장) |
| `signOutRemote(accessToken)` | `POST /auth/v1/logout` | 실패해도 무시(로컬 로그아웃은 계속) |
| `pullRecords(token, since)` | `GET /rest/v1/records?select=tbl,pk,data,deleted,updated_at&order=updated_at.asc,tbl.asc,pk.asc&limit=1000` + `since`가 있으면 `&updated_at=gte.<since>` | 행 전부. 한 페이지가 1000행이면 마지막 행의 `updated_at`으로 `gte` 다음 페이지(겹친 행은 `tbl+pk`로 하나만 남긴다) |
| `hasAnyRecord(token)` | `GET /rest/v1/records?select=pk&deleted=is.false&limit=1` | boolean |
| `countSessions(token)` | `HEAD /rest/v1/records?tbl=eq.sessions&deleted=is.false` + `Prefer: count=exact` → `Content-Range`의 `/n` | number (처음 연결 `ask` 문구에 쓴다) |
| `upsertRecords(token, userId, rows)` | `POST /rest/v1/records?on_conflict=user_id,tbl,pk` + `Prefer: resolution=merge-duplicates,return=minimal`. 행마다 `user_id`를 넣는다. 200행 또는 본문 1MB를 넘기 전에 끊어 여러 번 | void |
| `deleteMyAccount(token)` | `POST /rest/v1/rpc/delete_my_account` | void |

- 헤더: `apikey: <CLOUD_KEY>`, `Authorization: Bearer <access token>`(로그인 전 요청은 키를 넣지 않고 `apikey`만), `Content-Type: application/json`.
- `CloudError(kind)` — `gist.ts`의 `GistError`처럼 사용자가 할 일이 갈리는 대로 나눈다:

| kind | 언제 | 문구 |
|---|---|---|
| `credentials` | 로그인 400 (`invalid_credentials`·`invalid_grant`) | `이메일이나 비밀번호가 맞지 않습니다.` |
| `exists` | 가입 422/400 (`user_already_exists`) | `이미 가입된 이메일입니다. 로그인해 주세요.` |
| `weakPassword` | 가입 422 (`weak_password`) | `비밀번호가 너무 짧습니다. 6자 이상으로 해 주세요.` |
| `confirmRequired` | 가입 응답에 세션 없음 | `가입은 됐지만 서버가 이메일 확인을 요구합니다. 앱 운영자에게 알려 주세요.` |
| `auth` | 401, refresh 400 | `로그인이 만료됐습니다. 다시 로그인해 주세요.` |
| `rateLimit` | 429 | `요청이 너무 많습니다. 잠시 후 다시 시도하세요.` |
| `network` | fetch 실패 | `서버에 연결할 수 없습니다. 연결되면 다시 올립니다.` |
| `unknown` | 그 밖 | `서버 오류 <status>` |

- **오류 코드 확인:** 위 `error_code` 이름은 구현자가 Supabase Auth 문서(“Error codes”)로 확인하고 DEV-RECORD에 출처를 적는다. 문서와 다르면 문서를 따르고 이 표의 문구는 그대로 둔다.

**5. 엔진과 서버를 잇는 곳**

`syncEngine`의 `pull`·`push`는 TT3의 `cloudSync.ts`가 `cloudApi`로 채운다. TT2는 `cloudApi`만 만든다(부르는 곳 없음 — Knip이 안 쓰는 export로 잡으면 TT2 커밋에서 `v122.test.ts`가 쓰므로 통과한다).

### 검증 (`v122.test.ts`, describe `TT2`)

- 모든 요청에 `apikey` 헤더가 있고, 로그인 뒤 요청에는 `Authorization: Bearer <토큰>`이 있다. 토큰 문자열이 URL·본문·오류 메시지 어디에도 없다(오류 여덟 종류 전부 확인).
- 상태 코드·`error_code` → kind 표 그대로. fetch 예외 → `network`.
- `signUp` 응답에 `access_token`이 없으면 `confirmRequired`.
- `refresh`가 돌려준 새 refresh token을 쓴다(옛 것을 다시 보내지 않는다).
- `pullRecords`: 1000행 페이지 다음에 `updated_at=gte.<마지막 행>`으로 한 번 더 부르고, 겹친 행은 하나만 남는다. 999행이면 한 번만 부른다.
- `upsertRecords`: 450행 → 요청 3번(200·200·50). 큰 행(400KB) 5개 → 1MB 안 넘게 나뉜다. 모든 행에 `user_id`가 있다. 지움은 `deleted: true, data: null`.
- `countSessions`가 `Content-Range: 0-0/37`에서 37.
- `isCloudAvailable()`: 둘 중 하나라도 비면 false, `http://`면 false.
- `'cloudSession'`: `setSetting('cloudSession', …)`이 예외, `isSecretSettingKey` true.
- `supabase/schema.sql` 글자 스캔(`?raw`): `enable row level security`가 있다, 정책 셋이 모두 `auth.uid()) = user_id`를 쓴다, `for delete` 정책이 없다, `to anon`이 없다, `revoke all on public.records from anon`이 있다, 트리거가 `clock_timestamp()`, `delete_my_account`가 `security definer`와 `set search_path = ''`.

속성:
- `upsertRecords`가 나눈 요청들을 합치면 넣은 행과 순서까지 같고, 어떤 요청도 200행·1MB를 넘지 않는다(빈 요청 없음).

### 범위 제외

- `supabase-js`·실시간 구독(다른 기기의 변경을 즉시 밀어 받기): 앱을 열 때·돌아올 때 받는 것으로 충분하다.
- 서버 쪽 마이그레이션 도구(Supabase CLI): 테이블 하나라 SQL 파일 하나로 충분하다.

### README 반영

없음 (TT3).

---

## TT3. 계정 카드 · 자동 동기화 · 복원·초기화·배너 연결

### 진단

- 설정 탭에 계정 자리가 없다. 백업 묶음(`SettingsScreen.tsx:416-421`)은 내보내기·Gist·가져오기다.
- 자동 동기화의 계기는 이미 있다: `requestSync()`(세션 종료·식단 쓰기·루틴 쓰기)와 부팅·백그라운드 전환(`App.tsx:106`, `:114`). 부르는 곳 목록은 테스트가 고정하므로(`dietBackup.test.ts:91-98`) 새로 부르는 곳을 늘리지 않고 `gistSync.requestSync` 안에서 계정 동기화도 예약한다.
- 복원(`restoreBackup`)·초기화(`db.delete()`)는 로그인 상태에서 서버와의 관계를 정해 줘야 한다. 안 정하면 초기화 뒤 첫 바퀴가 "전부 지웠다"로 읽는다(멈춤이 잡지만 사람에게 엉뚱한 질문이 간다).

### 설계

**1. `src/lib/cloudSync.ts` — 상태와 계기**

```ts
type CloudState =
  | { status: 'signedOut' }
  | { status: 'idle' | 'pending' | 'syncing'; email: string }
  | { status: 'done'; email: string; at: string; pulled: number; pushed: number }
  | { status: 'ask'; email: string; serverSessions: number; localSessions: number }  // 처음 연결 — 사람이 고른다
  | { status: 'foreign'; email: string; linkedEmail: string }
  | { status: 'held'; email: string; deletes: number }
  | { status: 'expired'; email: string }        // refresh 실패. 기기 기록은 그대로, 다시 로그인하면 이어진다
  | { status: 'error'; email: string; message: string; offline: boolean }
export function getCloudState(): CloudState; export function subscribeCloud(l): () => void
export async function signUpAndJoin(email, password): Promise<void>
export async function signInAndJoin(email, password): Promise<void>   // 로그인 → joinCase → upload/download/ask/foreign
export async function resolveAsk(choice: 'download' | 'cancel'): Promise<void>   // cancel = 로그아웃(기기 기록 그대로, 장부 없음)
export async function resolveHeld(choice: 'push' | 'download'): Promise<void>    // push = 서버에서도 지움, download = 받기
export function requestCloudSync(delayMs: number): void   // 로그인 상태가 아니면 아무것도 안 한다
export function flushCloudSync(): void                    // 예약이 있으면 지금
export function installCloudLifecycle(): () => void       // hidden·pagehide → flush, visible → 바로 한 바퀴(다른 기기 변경 받기)
export async function startCloudSync(): Promise<void>     // 부팅: 세션이 있으면 한 바퀴
export async function signOutAndWipe(opts: { force: boolean }): Promise<'done' | 'unsynced'>
export async function deleteAccountKeepDevice(): Promise<void>
export async function forgetCloudOnDevice(): Promise<void> // 세션·장부를 지운다. 서버는 안 건드린다 (초기화·로그아웃이 쓴다)
export async function markLocalReplaced(): Promise<void>   // meta.allowMassDelete = true (복원이 부른다)
export function cloudBackupStatus(): { signedIn: boolean; lastSyncAt: string | null }
```
- 바퀴 전에 `expiresAt − 60초`가 지났으면 `refresh`. 동시에 두 번 refresh하지 않는다(진행 중 약속을 공유). `auth` 오류 → `expired`.
- 바퀴 뒤 `settingsTouched`면 `useSettings.getState().load()`(다른 기기의 Phase·체중·템포 설정이 화면에 반영되게).
- 진행 중 세션이 있으면 `signInAndJoin`의 받기·`signOutAndWipe`·`resolveAsk('download')`·`resolveHeld('download')`를 하지 않고 문구를 낸다(v1.16의 루틴 저장과 같은 규칙). 보통 바퀴는 돈다(판정 2가 진행 중 세션을 지킨다).
- `deps` 구현: `readLocal`은 일곱 테이블 `toArray`, `applyLocal`은 일곱 테이블 `rw` 트랜잭션(TT1의 재확인), 장부는 `syncDb`.

**2. 기존 코드에 잇는 곳 (줄 수를 최소로)**

| 자리 | 바꾸는 것 |
|---|---|
| `gistSync.ts` `requestSync` | 첫 줄에 `requestCloudSync(delayMs)`. 그 아래 Gist 검사는 그대로. 부르는 곳 목록 테스트는 고치지 않고 통과한다 |
| `App.tsx` 부팅 | `flushPendingSync()` 다음 줄에 `void startCloudSync()`. `installSyncLifecycle` 옆에 `useEffect(() => installCloudLifecycle(), [])` |
| `backup.ts` `restoreBackup` | 트랜잭션 뒤 `await markLocalReplaced()`. 로그인 상태에서 복원하면 **계정 기록도 그 백업으로 바뀐다**(백업에 없는 서버 행은 지움으로 올라간다). README의 "병합 아닌 전체 교체"와 같은 뜻 |
| `SettingsScreen.tsx` `resetAll` | `db.delete()` 앞에 `await forgetCloudOnDevice()`. 계정 기록은 서버에 남는다 |
| `HomeScreen.tsx` 백업 배너 | 아래 4 |

**3. 계정 카드 — `src/components/AccountPanel.tsx`**

자리: 설정 탭, `소리·템포` 묶음과 `기록 내보내기·백업` 묶음 사이에 새 묶음 `Group` + `Heading level={2}` `계정·동기화`. `isCloudAvailable()`가 false면 묶음째 그리지 않는다. 헬스장에서 바꾸는 것(위 두 묶음)보다 아래, 백업 옆이다(v1.21 SS6 순서 원칙).

부품(전부 `src/ax`를 거친다. 모양은 `GistPanel`의 카드와 같은 꼴):

| 상태 | 그리는 것 (Astryx 부품) |
|---|---|
| 공통 | `Card` > `VStack gap={3}` > 머리 `Text type="supporting" color="secondary"` `계정` |
| `signedOut` | 안내 `Text type="supporting" color="secondary"`(문구 A) · `SegmentedControl` + `SegmentedControlItem` 둘(`로그인`·`가입`, 설정의 `소리 크기`와 같은 쓰임) · `TextField type="email" label="이메일"` · `TextField type="password" label="비밀번호"` · `HStack` > `Button variant="primary" size="sm"`(`로그인`/`가입`, 진행 중 `확인 중…`, 빈 칸이면 `isDisabled`) · 오류는 상태 줄 `Text`(`GistPanel`의 `ax-text-error` 쓰임과 같다) |
| `ask` | `Banner status="warning" collapsible={false}`(문구 B) · `HStack gap={2}`: `Button variant="secondary"` `로그인 취소` · `Button variant="destructive"` `계정 기록 받기` → 누르면 `정말 받기`(두 단계, `GistPanel` 복원과 같은 꼴) |
| `foreign` | `Banner status="warning" collapsible={false}`(문구 C) · `Button variant="secondary"` `확인`(로그아웃 상태로) |
| 로그인됨 (`idle`·`pending`·`syncing`·`done`·`error`) | `Rows`: `Row` `계정`(이메일) · `Row` `마지막 동기화`(`formatDateTimeLocal` 또는 `아직 없음`) · 상태 줄 `Text` · `HStack gap={2} wrap="wrap"`: `Button variant="primary" size="sm"` `지금 동기화` · `Button variant="secondary" size="sm"` `로그아웃` · `Button variant="secondary" size="sm"` `계정 삭제` |
| `held` | 로그인됨 위에 `Banner status="warning" collapsible={false}`(문구 D) · `HStack gap={2}`: `Button variant="secondary"` `계정 기록으로 되돌리기` · `Button variant="destructive"` `계정에서도 지우기` → `정말 지우기` |
| `expired` | `Banner status="warning"`(문구 E) + `signedOut`의 폼(이메일 칸은 채워 둔다) |
| 로그아웃 누름 | 올라가지 않은 기록이 없으면 확인 한 번: `Banner status="warning"`(문구 F) + `취소`·`로그아웃`(destructive). 바퀴가 실패했으면 문구 G + `취소`·`그래도 로그아웃`(destructive) |
| 계정 삭제 누름 | `Banner status="warning"`(문구 H) + `취소`·`계정 삭제`(destructive) → `정말 삭제` |

- `AlertDialog`를 쓰지 않는 이유(한 줄): 설정의 다른 확인(Gist 복원·토큰 삭제·초기화)이 카드 안 두 단계 버튼이라 같은 꼴로 둔다.
- 입력칸의 자동완성: `TextField`가 주는 단일 처방(`AX_NO_AUTOFILL`) 그대로다. `autoComplete`를 필드별로 덮지 않는다(`inputProps.test.ts:91-99`). iOS 키체인이 비밀번호 칸을 알아보는지는 실기기에서 본다(아래 ⑦).
- 상태 줄 문구: `pending` `잠시 후 자동으로 맞춥니다…` · `syncing` `맞추는 중…` · `done` `맞춤 완료 <시각>`(받은·올린 것이 0이면 `변경 없음 — <시각>`) · `error`+offline `오프라인 — 연결되면 다시 맞춥니다` · `error` `실패: <message>`.

**4. 홈 백업 배너 (`HomeScreen.tsx:273-277`, `:353-361`, `:481-482`)**

`backupReminder` 함수는 그대로 두고 넣는 값만 고른다:

| 조건 | `configured` | `lastBackupAt` | 배너 문구 (제목 / 설명) |
|---|---|---|---|
| `isCloudAvailable()` false | 지금 그대로(Gist) | 지금 그대로 | 지금 그대로 |
| 로그인함 | true | `cloudBackupStatus().lastSyncAt` | 오래됨: `마지막 동기화가 N일 전이에요` / `연결되면 자동으로 맞춥니다. 지금 맞추려면 설정 → 계정 → 지금 동기화` |
| 로그인 안 함, Gist 설정됨 | 지금 그대로(Gist) | 지금 그대로 | 지금 그대로 |
| 로그인 안 함, Gist 없음 | false | null | 미설정: `백업이 설정되지 않았어요` / `설정 → 계정에서 로그인하면 기록이 서버에 저장되고 다른 기기에서도 이어집니다` |

배너 자리·우선순위(`bannerQueue`)는 그대로다.
`cloudBackupStatus()`는 메모리 값이다(`startCloudSync`가 장부 meta를 읽어 채우고 바퀴마다 갱신). 홈은 `useSyncExternalStore(subscribeCloud, getCloudState)`로 읽어 바퀴가 끝나면 다시 그린다. 고르는 규칙은 순수 함수 `pickBackupStatus({ cloudAvailable, cloud, gistConfigured, gistLastBackupAt })`(`src/lib/cloudSync.ts`) 한 곳이다.

**5. 화면 검사 장면 (`scripts/ui-check.mjs`)**

`npm run build -- --mode uicheck` 빌드에서, `https://uicheck.invalid/**` 요청을 `page.route`로 받아 정해진 응답을 준다(밖으로 나가는 요청 0 — `settings-gist` 흐름과 같은 검사 `settings-account 서버 말고는 부르지 않는다`).

| 장면 | 준비 |
|---|---|
| `settings-account` | 로그인 안 함, 폼 |
| `settings-account-375` | 같은 상태 375 폭 |
| `settings-account-error` | 로그인 누름 → 400 `invalid_credentials` |
| `settings-account-ask` | 로그인 → `hasAnyRecord` true, `countSessions` 37, 픽스처 세션 있음 |
| `settings-account-signed-in` | localStorage에 세션, 장부 DB에 meta, 서버 응답 빈 목록 → `done` |
| `settings-account-held` | 장부에 없는 세션 pk 12개를 장부 DB에 심고 → 바퀴 → `held` |
| `settings-account-logout-confirm` | 로그인됨에서 `로그아웃` 누름 |
| `home-backup-unset` | 로그인 안 함, Gist 없음, 세션 있음 → 미설정 배너 |
| `home-backup-stale` | 로그인됨, 장부 meta `lastSyncAt` 8일 전 → 오래됨 배너 |

`ui-space.mjs`에 장면마다 `['button', 'card']`. 기존 `settings*` 장면은 uicheck 빌드에서 계정 묶음이 하나 더 보인다 — `before`와 다른 것은 그 묶음뿐이어야 한다.

### 검증 (`v122.test.ts`, describe `TT3` — 엔진·API는 가짜 서버로)

- 가입 → 서버 빈 것 → `upload`: 픽스처의 세션·식단·내 종목·사용자 루틴이 전부 가짜 서버에 있고, 번들 종목·`soundVolume`·`seededRoutineRevision`·`gistId`는 없다.
- 기기 B(시드만, 온보딩 끝) 로그인 → `download` → B의 동기화 대상 행이 A와 같다. **B에서 `suggestNextDay`·`weekly`(홈 볼륨 바)·`sessionToMarkdown`(마지막 세션) 결과가 A와 같다**(과거 판정 불변 — 같은 행이면 같은 판정).
- 기록 있는 기기 + 서버 기록 있음 → `ask`. `cancel`이면 서버·기기 둘 다 그대로이고 세션이 지워져 있다. `download`면 기기가 서버와 같아진다.
- `foreign`: 장부가 다른 계정이고 기록이 있으면 로그인 세션이 저장되지 않는다.
- 로그인 상태에서 `restoreBackup`(세션 3개짜리 백업, 서버에는 20개) → 다음 바퀴가 `held`가 아니고 서버의 나머지 17개가 지움으로 올라간다.
- 로그인 상태에서 초기화(`forgetCloudOnDevice` → `db.delete`) → 서버 요청 0, 장부 DB 없음, localStorage 세션 없음.
- `signOutAndWipe`: 바퀴 성공 → 기기 DB·장부·세션이 지워진다. 가짜 서버가 네트워크 오류 → `'unsynced'`를 돌려주고 아무것도 지우지 않는다. `force: true`면 지운다.
- `deleteAccountKeepDevice`: RPC가 불리고, 기기 기록은 그대로, 장부·세션은 없다.
- 토큰 만료 직전 → 바퀴 전에 refresh 한 번. refresh 400 → `expired`, 기기 기록 그대로, 그 뒤 `requestCloudSync`는 요청을 보내지 않는다. 다시 로그인(같은 계정) → `resume`이고 그동안 적은 세션이 올라간다.
- 진행 중 세션이 있으면 `resolveAsk('download')`·`signOutAndWipe`가 아무것도 하지 않고 문구를 낸다.
- 바퀴가 `settings` 행을 받으면 `useSettings.load`가 한 번 불린다. 안 받으면 안 불린다.
- 홈 배너 값 고르기: 위 4의 표 네 줄(`isCloudAvailable`을 바꿔 가며, 순수 함수 `pickBackupStatus`로 빼서 테스트).
- 스캔: `AccountPanel`이 `isCloudAvailable`로 감싸져 그려진다(`SettingsScreen.tsx`) · `gistSync.ts` `requestSync`의 첫 문장이 `requestCloudSync(` · `resetAll` 안에서 `forgetCloudOnDevice`가 `db.delete` 앞 · `restoreBackup` 안에 `markLocalReplaced` · `cloudSync.ts`·`syncEngine.ts`의 `transaction(` 블록 안에 `rowHash(`·`crypto.subtle`이 없다 · `AccountPanel.tsx`에 `autoComplete=`가 없다.
- 기존 테스트는 **수정 없이** 통과한다: `dietBackup.test.ts`(부르는 곳 목록), `backupTime.test.ts`, `gist.test.ts`, `inputProps.test.ts`, `v121.test.ts`(설정 순서 — 새 묶음은 그 목록의 자리 사이에 들어가지 않는다: `템포 가이드` 뒤 `<ExportPanel` 앞. `at()` 순서가 오름차순으로 남는지 구현자가 먼저 돌려 본다. 깨지면 멈추고 보고).

속성:
- `pickBackupStatus`: 로그인했으면 Gist 값과 상관없이 계정 값을 쓴다. 서버 주소가 없으면 어떤 입력에서도 지금(v1.21)과 같은 값이다.

### 범위 제외

- 온보딩에서 로그인: 새 기기는 온보딩을 마친 뒤 설정에서 로그인하면 받기(`download`)로 온보딩 값이 계정 값으로 바뀐다. 온보딩을 고치지 않는다.
- 비밀번호 재설정·이메일 바꾸기: 메일 서버가 필요하다(사람이 정할 것 1). 운영자가 대시보드에서 바꾼다.
- 다른 사람과 기록 공유·코치 보기: 요청에 없다.
- 첫 화면: 계정 코드는 작다(SDK 없음). 정적 import로 두고 `first-load --check`가 360KB를 지키는지 본다. 넘으면 `AccountPanel`만 lazy(설정 탭이 이미 lazy라 대개 첫 화면에 안 든다).

### README 반영

- 머리말 셋째 단락 → `서버도 로그인도 없고, 데이터는 전부 기기 안(IndexedDB)에 있습니다.`를 `기록은 기기 안(IndexedDB)에 먼저 저장됩니다. 로그인하면 계정별로 서버(Supabase)와 맞춰져 다른 기기에서도 이어지고, 로그인하지 않으면 지금처럼 기기 안에만 있습니다.`
- Why 마지막 줄 → `서버는 계정별 사본이다. 화면은 늘 기기 안 데이터를 읽고 써서 헬스장 오프라인과 "저장 버튼 없음"이 그대로다. Apple Developer 등록 없이 iOS 홈 화면 앱으로 쓴다.`
- 기능 표 설정 칸에 `계정(가입·로그인·자동 동기화)` 추가.
- "핵심 설계 결정"에 새 절 `### 계정 · 동기화` (백업·비밀값 절 앞):
  - **기기가 먼저, 서버는 계정별 사본이다.** 화면은 IndexedDB만 읽고 쓴다. 동기화는 세션 종료·식단·루틴 쓰기 8초 뒤, 앱을 열 때와 돌아올 때, 백그라운드로 갈 때 돈다. 서버는 Supabase(Postgres + Auth)이고 앱은 SDK 없이 REST를 부른다.
  - **바뀐 행은 쓰기 자리가 아니라 내용 지문으로 찾는다.** 마지막으로 맞춘 행의 SHA-256을 장부(`workout-tracker-sync` DB)에 두고 비교한다. 복원·시드·옛 버전이 쓴 것도 빠짐없이 잡힌다. 장부를 메인 DB와 나눈 것은 Dexie 버전을 올리지 않아 배포를 되돌릴 수 있게 하고, 백업 파일에 계정 정보가 섞이지 않게 하려는 것이다.
  - **올리지 않는 것:** 번들 종목 카탈로그, 시드 장부(`seeded*Revision`), Gist 장부, 소리 크기·덕킹. 앱 번들이나 그 기기에서 오는 것이라, 올리면 버전이 다른 두 기기가 서로 덮는다.
  - **충돌은 행마다 나중에 올린 쪽이 이긴다.** 받을 때 이 기기에서 아직 안 올린 행은 덮지 않는다. 같은 세션·같은 날 식단·내 음식 목록을 두 기기가 오프라인에서 고치면 한쪽이 진다. 끝나지 않은 세션은 다른 기기로 받지 않는다.
  - **처음 연결:** 서버가 비었으면 올리고, 이 기기에 기록이 없으면 받고, 둘 다 있으면 묻는다(받으면 이 기기 기록은 지워진다). 다른 계정의 기록이 있는 기기는 로그인하지 않는다.
  - **한꺼번에 10건 이상 지우는 바퀴는 멈추고 묻는다.** 기기 저장소가 비면 지문 비교가 "전부 지웠다"로 읽기 때문이다. 복원 직후는 묻지 않는다(복원은 계정 기록도 그 백업으로 바꾼다).
  - **계정별 분리는 서버의 행 수준 보안(RLS)이 지킨다.** 앱의 키는 공개용 키(publishable)뿐이고, 스키마는 `supabase/schema.sql`에 있다. 로그인 세션은 localStorage에만 두고 Dexie·백업에 들어가지 않는다(비밀 키 목록에 `cloudSession`).
- Architecture 그림에 `Dexie -->|계정별 동기화| Cloud["Supabase<br/>records (RLS)"]`, `LS` 칸에 `로그인 세션`.
- Tech Stack "저장" 줄에 `+ Supabase(Postgres + Auth, REST 직접 호출 — 계정별 사본)`.
- Limitations: `1인용입니다. …` 줄을 지우고 넣는다:
  - `계정 서버는 Supabase 무료 플랜입니다. 1주일 동안 아무도 쓰지 않으면 서버가 멈추고, 그동안 동기화는 실패하지만 기록은 기기에 남습니다(운영자가 대시보드에서 다시 켭니다).`
  - `서버의 기록은 앱 운영자가 볼 수 있습니다. 비밀번호를 잊으면 운영자가 바꿔 줍니다(메일 발송이 없습니다).`

---

## TT4. Gist 백업 걷어내기 (별도 PR — 사람이 TT3를 실기기에서 확인한 뒤)

### 진단

요청 1은 "Gist 대신 DB"다. TT3 뒤에는 백업 길이 둘(Gist·계정)이라 설정과 배너가 둘을 다 말한다. 다만 TT3가 실기기에서 검증되기 전에는 Gist가 앱 밖의 유일한 사본이라 같은 PR에서 걷지 않는다(사람이 정할 것 3).

### 설계

| 지우는 것 | 옮기는 것 |
|---|---|
| `src/lib/gist.ts`, `src/components/GistPanel.tsx`, `src/lib/gist.test.ts`의 Gist 부분 | `src/lib/gistSync.ts` → `src/lib/sync.ts`(이름만이 아니라 내용도 줄인다): `requestSync(delayMs = SYNC_DEBOUNCE_MS)` = `requestCloudSync(delayMs)`, `SYNC_DEBOUNCE_MS`, `BACKUP_REMINDER_DAYS`, `backupReminder`. Gist 업로드·지문 건너뛰기·밀린 표시는 지운다(계정 동기화는 지문 비교라 밀린 표시가 필요 없다) |
| `App.tsx`의 `flushPendingSync`·`installSyncLifecycle` | 그 자리를 `startCloudSync`·`installCloudLifecycle`만 남긴다 |
| `HomeScreen` 배너의 Gist 줄 | `pickBackupStatus`에서 Gist 입력을 지운다. 서버 주소가 없는 빌드는 미설정 배너 `설명` = `설정 → 기록 내보내기에서 JSON 파일로 저장해 두세요` |
| 설정의 `<GistPanel />` | 지운다. 묶음 제목 `기록 내보내기·백업`은 그대로 |
| 부팅 한 번: localStorage `workout-tracker.gistToken`, `workout-tracker.gistSyncPending` 지움 · settings `gistId` `lastBackupAt` `lastBackupHash` 지움(`seed.ts`의 `deleteSettings`) | 쓰지 않는 비밀값을 남기지 않는다 |
| `ui-check.mjs`의 `settings-gist` 장면·흐름 | `SETTINGS_SCENES`에서 `settings-gist` 자리에 `settings-account` |

`SECRET_SETTING_KEYS`의 `'gistToken'`과 `DEVICE_LOCAL_SETTING_KEYS`의 Gist 세 키는 **남긴다** — 옛 백업을 복원할 때 그 값이 서버로 가지 않게(지우는 비용이 없다).

**테스트 옮김** (판정 테스트가 아니라 지운 코드의 스캔·예시라 옮기거나 지운다. DEV-RECORD "옮긴 스캔" 표에 이름·전·후·이유):

| 파일 | 처리 |
|---|---|
| `gist.test.ts` | Gist API 예시는 지운다. `backupReminder` describe는 `sync.ts`를 import해 **단언을 그대로** 옮긴다 |
| `backupTime.test.ts` | import를 `./sync`로. `gistSync.ts`·`GistPanel.tsx`를 읽는 스캔 셋은 `sync.ts`·`AccountPanel.tsx`가 공용 날짜 함수(`formatDateTimeLocal`·`localDateOf`)를 쓰는지로 옮긴다. `skipped` 스캔은 지운다(그 경로가 없다) |
| `dietBackup.test.ts` | `SYNC_DEBOUNCE_MS` import를 `./sync`로. 부르는 곳 목록의 정의 줄을 `/src/lib/sync.ts`로. `gistSync` 지문 건너뛰기 스캔은 지운다 |
| `v121.test.ts` | `GistPanel` raw import와 SS6 두 단언을 `AccountPanel`로(`variant="destructive"` 3개 이상, 상태 줄 `ax-text-error`). 설정 순서의 `'<GistPanel'`을 `'<AccountPanel'`로 — 순서가 `템포 가이드` → `<AccountPanel` → `<ExportPanel`이 된다 |
| `scripts/ss0.test.mjs` `scripts/ss6.test.mjs` `scripts/lib/ui-space.mjs` | `settings-gist`를 `settings-account`로, 흐름 이름 `settings-gist GitHub을 부르지 않는다`를 `settings-account 서버 말고는 부르지 않는다`로 |

### 검증 (`v122.test.ts`, describe `TT4`)

- `src`·`scripts`에 `api.github.com`·`GistPanel`·`readGist`가 없다(글자 스캔).
- 부팅 정리: 세 settings 키와 두 localStorage 키가 지워지고, 두 번 해도 같다.
- `requestSync`를 부르는 곳이 `sync.ts`(정의)·`routineStore.ts`·`useDiet.ts`·`SessionScreen.tsx`뿐이다.
- 옛 Gist 백업 JSON(`gistId`·`lastBackupAt` 행이 든 것)을 로그인 상태에서 복원하면 서버로 그 키들이 올라가지 않는다.
- `pickBackupStatus` 속성: 서버 주소가 없으면 언제나 미설정(파일 저장 안내)이다.

### 범위 제외

- GitHub에 남은 secret gist 지우기: 앱은 GitHub에 요청하지 않는다. README에 "예전 Gist는 GitHub에서 직접 지운다"를 적는다.

### README 반영

- "백업 · 비밀값" 절: Gist 세 항목을 지우고 첫 항목을 `- **비밀값(로그인 세션)은 세 겹으로 백업에서 차단한다** (§11)` + 지금 본문에서 "Gist 토큰"을 "로그인 세션"으로, "Gist에 올라간다"를 "서버에 올라간다"로.
- 기능 표 설정 칸의 `Gist 백업` 지움. 홈 칸의 `백업` 배너는 그대로(뜻이 동기화로 바뀜).
- Architecture의 `LS` 칸 `Gist 토큰` 지움, `Dexie -->|JSON 백업| Gist` 지움.
- Tech Stack "저장" 줄의 `백업 대기 플래그` 지움.
- Limitations: `Gist 백업용 토큰은 …`·`Gist는 secret gist입니다 …` 두 줄 지우고 `예전에 쓰던 Gist는 앱이 더 건드리지 않습니다. 필요 없으면 GitHub에서 직접 지웁니다.` 한 줄.
- `1인용입니다` 자리에서 기기를 옮기는 방법이 "로그인"으로 바뀐 것은 TT3에서 이미 적었다.

---

## 화면 검증 (화면 검증자 — `agents/SCREEN-CHECKER.md`)

uicheck 빌드(`npm run build -- --mode uicheck`)에서 `node scripts/ui-check.mjs after --check --ver=v1.22 --only=<장면>`의 표와 스크린샷(다크·라이트)을 본다.

| 작업 | 장면 (각각 다크·라이트) | 볼 것 |
|---|---|---|
| TT3 | `settings-account` `settings-account-375` | 안내 글이 카드 안에서 단어 사이로 꺾이는가(375), 로그인·가입 고르기의 고른 상태, 이메일·비밀번호 칸의 이름이 보이는가, 빈 칸일 때 버튼이 꺼져 보이는가 |
| TT3 | `settings-account-error` | 오류 줄이 오류 색으로 읽히는가(다크·라이트), 폼이 밀려 넘치지 않는가 |
| TT3 | `settings-account-ask` `settings-account-held` `settings-account-logout-confirm` | 경고 배너의 긴 글(세션 수 포함)이 잘리지 않는가, 되돌리기 쪽(취소·되돌리기)과 지우는 쪽(빨간 버튼)이 구분되는가, 두 버튼이 375에서 한 줄 또는 깔끔하게 두 줄 |
| TT3 | `settings-account-signed-in` | 긴 이메일(`very.long.address.for.uicheck@example.com`)이 줄 안에서 넘치지 않는가, 버튼 셋이 줄바꿈되어도 어긋나지 않는가 |
| TT3 | `settings` `settings-end` | 새 묶음 `계정·동기화`가 소리·템포와 기록 내보내기 사이에 있고, 묶음 사이 간격이 다른 묶음과 같은가(`같은 역할`). 그 밖은 `before`와 같은가 |
| TT3 | `home-backup-unset` `home-backup-stale` | 배너 문구가 두 줄을 넘어도 잘리지 않는가 |
| TT4 | `settings` `settings-end` `settings-account` | Gist 카드가 없고 `기록 내보내기·백업` 묶음이 내보내기·가져오기 둘로 자연스러운가 |

**정말 폰에서만 볼 수 있는 것:** "구현 순서와 검증"의 실기기 확인 ①~⑧(로그인 유지, 두 기기, 비행기 모드, 키체인).

---

## 데이터 이전

| 대상 | 어떻게 되나 |
|---|---|
| 기존 IndexedDB (`workout-tracker` v3) | 그대로. 스키마·행 형태 무변경. 로그인 전에는 아무것도 바뀌지 않는다 |
| 처음 로그인하는 기기(앱 주인의 폰) | 새 계정은 서버가 비어 있어 `upload` — 동기화 대상 행이 전부 올라간다. 기기 데이터는 그대로 |
| 둘째 기기 | `download` — 서버 행으로 바뀐다(번들 종목·기기 전용 키는 그 기기 것) |
| 기존 Gist·JSON 백업 | 그대로 복원된다. 로그인 상태에서 복원하면 계정 기록도 그 백업으로 바뀐다 |
| v1.22가 만든 백업 | `SCHEMA_VERSION` 3 그대로. 계정 정보·로그인 세션은 없다(장부는 다른 DB, 세션은 localStorage + 비밀 키) |
| 새 저장 자리 | IndexedDB `workout-tracker-sync`(장부), localStorage `workout-tracker.cloudSession`(로그인 세션), 서버 `public.records` |
| TT4 뒤 | localStorage의 Gist 토큰·밀린 표시, settings의 Gist 장부 세 키가 지워진다. GitHub의 gist는 남는다 |

## 되돌리기

| 상황 | 방법 | 데이터 |
|---|---|---|
| TT3 배포 뒤 계정 동기화가 이상하다 | GitHub 저장소 변수 `SUPABASE_URL`을 비우고 다시 배포(코드 그대로) — 계정 카드가 사라지고 동기화가 멈춘다 | 기기 기록 그대로. 서버 기록도 그대로 |
| 앱이 안 열린다 | PR 머지 커밋을 `git revert -m 1`(PR로). v1.21 코드는 `workout-tracker-sync` DB와 `cloudSession`을 읽지 않고 지우지도 않는다 | Dexie v3 그대로라 v1.21이 그대로 연다. Gist도 그대로 돈다 |
| 되돌린 동안 적은 기록 | 다시 v1.22를 배포하면 지문 비교가 되돌린 동안 바뀐 행을 찾아 올린다(쓰기 훅이 아니라 지문이라 옛 코드가 쓴 것도 잡힌다) | 잃지 않는다 |
| TT4 뒤 되돌리기 | TT4 PR만 `git revert` — Gist 카드가 돌아오지만 토큰이 지워졌으므로 다시 붙여 넣어야 한다 | 기기·계정 기록 그대로 |
| 서버(Supabase)가 멈췄다·없어졌다 | 앱은 오프라인처럼 동작한다(상태 줄 `오프라인 — …`). JSON 내보내기로 기기 기록을 받는다 | 기기 기록 그대로 |

**단계마다 배포할 수 있다:** TT1·TT2는 부르는 곳이 없어 동작이 같다. TT3는 서버 주소가 빌드에 들어갈 때만 보인다(저장소 변수를 넣기 전에 배포해도 안전하다). TT4는 따로 PR.

---

## 과거 판정 불변

바뀌지 않는 것: 판정·제안·내보내기·가져오기 전부. `git diff --stat main..HEAD -- src/lib`에 판정 파일(`suggestNextDay`·`dashboard`·`prefill`·`progression`·`phaseReadiness`·`exportMarkdown`·`diet*`·`history`·`analysis`)이 없다. `src/db`는 무변경, `src/store`는 무변경(`useSettings.load`를 부르기만 한다). 골든(`v113`~`v117` 내보내기 글자)은 한 글자도 안 고치고 통과한다.

달라지는 것:

| 무엇 | 언제 | 과거 기록 |
|---|---|---|
| 다른 기기에서 고친 세션·식단·루틴이 이 기기에 들어온다 | 로그인한 두 기기 | 그 기록의 판정이 고친 내용으로 다시 계산된다 — 그 기기에서 고친 것과 같다(TT3 검증: 받은 기기의 제안·볼륨·내보내기가 보낸 기기와 같다) |
| 같은 행을 두 기기가 오프라인에서 고쳤다 | 드묾 | 나중에 올린 쪽만 남는다 |
| 로그인 상태에서 복원 | 사람이 고를 때 | 계정 기록도 백업으로 바뀐다(다른 기기에도 퍼진다) |
| 로그아웃 | 사람이 고를 때 | 이 기기 기록이 지워진다(사람이 정할 것 2의 추천안). 계정에는 남는다 |

---

## 구현 순서와 검증

**TT1 → TT2 → TT3 → (사람 실기기 확인) → TT4.** TT3가 TT1의 엔진에 TT2의 API를 끼운다. TT4는 TT3 PR이 머지되고 사람이 아래 실기기 확인을 마친 뒤 새 브랜치에서 한다.
첫 PR 커밋: **TT1 · TT2 · TT3 · 화면 검증 · 기록·버전 = 5.** TT4 PR 커밋: **TT4 · 기록·버전 = 2.** 작업끼리 한 커밋에 섞지 않는다.

관례:
- `npm run check`(마무리), 작업 중에는 `npm run check -- --fast`와 `npx vitest run src/lib/v122.test.ts src/lib/properties.test.ts src/lib/dietBackup.test.ts src/lib/backupTime.test.ts src/lib/gist.test.ts src/lib/inputProps.test.ts src/lib/v121.test.ts`만. `tsc`를 직접 부르지 않는다.
- 커밋 개수는 실행 출력을 복사한다(`git log --oneline main..HEAD`). 커밋 메시지는 `git commit -F - <<'MSG'`.
- **기존 테스트는 TT1~TT3에서 수정하지 않는다.** 깨지면 멈추고 보고한다. TT4만 "테스트 옮김" 표대로 옮긴다(`npm test` 개수가 줄면 지운 이름을 DEV-RECORD에).
- 테스트에 실제 서버·토큰이 없다. fetch는 모킹하고, 엔진은 메모리 저장소와 가짜 서버(`records`를 흉내 내는 배열 — `updated_at`을 단조 증가로 매기고, 늦게 커밋되는 행을 넣을 수 있다)로 돈다. 가짜 서버는 `v122.test.ts` 안에 둔다(`testFixtures.ts`를 고치지 않는다).
- `node scripts/first-load.mjs --check`(일반 빌드)를 TT3 커밋에서 DEV-RECORD에 복사한다.
- `ui-check`: TT3 커밋에서 `npm run build -- --mode uicheck` 뒤 `node scripts/ui-check.mjs after --check --ver=v1.22; echo "종료 코드 $?"` 마지막 줄 `종료 코드 0`. `node scripts/argos-upload.mjs after` 출력을 DEV-RECORD에. 일반 빌드로 다시 `npm run build`해 `first-load`를 잰다(두 빌드를 섞지 않는다).
- 파일 편집은 Edit 도구로, 커밋 전 `grep -c $'\r' <파일>`로 CRLF가 없는지 본다.
- **새 스캔 결함 복원 확인:** `cp` 백업 뒤 결함을 되살려 실패를 보고 되돌린다(`cmp`로 같음 확인). 최소:
  ① (TT1) `planPull` 판정 4를 지운다 → 속성 "안 올린 변경은 받기에 지지 않는다" 실패
  ② (TT1) `isSyncedRow`가 `settings`를 전부 true로 → 속성 "기기 전용은 안 나간다" 실패
  ③ (TT1) `stableStringify`가 키를 정렬하지 않게 → 속성 키 순서 실패 + "두 번 해도 같다" 실패
  ④ (TT1) `MASS_DELETE_LIMIT` 검사를 지운다 → 세션 11건 `held` 단언 실패
  ⑤ (TT1) `joinCase`가 서버에 기록이 있어도 `upload` → 표 단언 실패
  ⑥ (TT1) 판정 2(진행 중 세션)를 지운다 → 진행 중 세션 단언 실패
  ⑦ (TT1) `pull(cursor − 5분)`을 `pull(cursor)`로 → 늦게 커밋된 행 단언 실패
  ⑧ (TT1) `applyLocal`의 `baseText` 재확인을 지운다 → 재확인 단언 실패
  ⑨ (TT2) `cloudApi`의 오류 문구에 토큰을 넣는다 → 토큰 노출 단언 실패
  ⑩ (TT2) `SECRET_SETTING_KEYS`에서 `'cloudSession'`을 뺀다 → `setSetting` 예외 단언 실패
  ⑪ (TT2) `schema.sql`에 `for delete` 정책을 더하거나 `enable row level security` 줄을 지운다 → 스캔 실패
  ⑫ (TT2) `upsertRecords`가 `user_id`를 빼게 → 단언 실패
  ⑬ (TT3) `resetAll`에서 `forgetCloudOnDevice`를 지운다 → 스캔 실패 + 초기화 단언(장부 남음) 실패
  ⑭ (TT3) `restoreBackup`에서 `markLocalReplaced`를 지운다 → 복원 뒤 `held` 아님 단언 실패
  ⑮ (TT3) `AccountPanel`을 `isCloudAvailable` 밖으로 → 스캔 실패
  ⑯ (TT3) `requestSync`에서 `requestCloudSync(` 줄을 Gist 검사 아래로 → 스캔 실패(Gist 없는 사용자는 계정 동기화가 안 돈다)
  ⑰ (TT3) `signOutAndWipe`가 바퀴 실패에도 지우게 → `'unsynced'` 단언 실패
  ⑱ (TT3) uicheck 흐름에서 `page.route` 하나를 뺀다 → `settings-account 서버 말고는 부르지 않는다` 실패
  ⑲ (TT4) `api.github.com`을 한 파일에 되살린다 → TT4 스캔 실패
- **변이 테스트:** TT1·TT2·TT3 커밋마다 `npm run mutation`(대상 `syncPlan.ts`·`syncEngine.ts`·`syncDb.ts`·`cloudApi.ts`·`cloudConfig.ts`·`cloudSync.ts`·`secrets.ts`·`backup.ts`·`gistSync.ts` 중 그 커밋에서 바뀐 것) 표를 DEV-RECORD에. `syncPlan.ts`·`syncEngine.ts`는 살아남은 변이마다 이유를 적는다(동기화는 조용히 틀리는 곳이다).
- **과거 판정 불변 확인 절**(DEV-RECORD): ① `git diff --stat main..HEAD -- src/db src/store` 출력이 비어 있다(복사) ② `git diff --stat main..HEAD -- src/lib`(복사)에 판정 파일이 없다 ③ 골든 수정 없이 통과 ④ TT3의 "받은 기기의 제안·볼륨·내보내기가 같다" 테스트 이름 ⑤ 달라지는 것: "과거 판정 불변" 표.
- 완료 후 `docs/DEV-RECORD-v1.22.md`(맨 위 "이 환경에서 확인된 제약"은 v1.21 목록을 이어받고 더한다: Dexie 트랜잭션 안에서 Dexie 밖 약속(`crypto.subtle`)을 기다리면 트랜잭션이 닫힌다 — 실제로 확인한 결과, Supabase Auth 오류 코드의 출처, uicheck 빌드와 일반 빌드의 첫 화면 크기). "배포 영향" 절에 아래를 남기고 PR 본문 맨 위에도 넣는다:
  - 설정에 `계정·동기화` 묶음이 생긴다. **저장소 변수 `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY`를 넣기 전에는 보이지 않고, 앱은 v1.21과 같다.**
  - 로그인하지 않으면 아무것도 바뀌지 않는다. 로그인하면 기록이 계정별로 서버에 올라가고 다른 기기에서 이어진다. 기록은 여전히 기기에 먼저 저장된다(오프라인 그대로).
  - Dexie 스키마와 백업 형식 버전은 그대로다. v1.21로 되돌려 배포해도 데이터가 남는다.
  - Gist 백업은 이번에는 그대로 있다. 사람이 계정 동기화를 확인한 뒤 다음 PR(TT4)에서 걷는다.
- README: 각 작업의 "README 반영"을 그 작업 커밋에서 고친다.
- `package.json` **1.22.0**은 첫 PR의 기록 커밋에서, **1.22.1**은 TT4 PR의 기록 커밋에서 올린다.
- 첫 PR 본문에 `Refs #31`, TT4 PR 본문에 `Closes #31`.
- **실기기 확인** (사람 — 구현자는 DEV-RECORD에 "사람 확인 필요"로 남긴다. 홈 화면에 추가한 앱에서):
  ① 가입 → 앱을 완전히 닫았다 열어도 로그인 상태다
  ② 처음 로그인(앱 주인 폰): 설정 → 내보내기의 세션 수와 Supabase 대시보드 Table Editor `records`에서 `tbl = sessions` 행 수가 같다
  ③ 둘째 기기에서 같은 계정 로그인 → 받기 → 홈의 제안·주간 도트·기록 달력이 첫 기기와 같다
  ④ 한쪽에서 세션을 마치고 다른 기기에서 앱을 열면 기록 탭에 보인다
  ⑤ 비행기 모드에서 세션을 기록하고 끈 뒤 앱을 열면 상태 줄이 `맞춤 완료`가 된다
  ⑥ 다른 계정 B로 로그인한 기기에서 A의 기록이 안 보인다
  ⑦ 비밀번호 칸에서 iOS 키체인이 저장·채우기를 제안하는가(자동완성 끔 상태 — 안 되면 적는다. 고치지 않는다)
  ⑧ 로그아웃 → 기기가 처음 상태 → 다시 로그인 → 받기로 전부 돌아온다
- TT4 실기기 확인: 설정에 Gist 카드가 없다. 홈 배너가 계정 문구다.

리뷰 단위: 작업별 — TT1은 무엇을 지우고 덮는지 정하는 엔진, TT2는 서버 권한(RLS)과 비밀값, TT3는 처음 연결·로그아웃·복원·초기화처럼 기록을 통째로 바꾸는 길이 모인다. 셋 다 틀리면 조용히 기록을 잃는다.

---

## 사람이 할 일 (TT3 PR 머지 전, 한 번)

1. supabase.com 가입 → New project. 지역 **Northeast Asia (Seoul)**, 플랜 Free. DB 비밀번호는 어디에도 적지 않는다(앱은 쓰지 않는다).
2. SQL Editor에 레포의 `supabase/schema.sql`을 붙여 Run.
3. Authentication → Sign In / Providers → Email: **Confirm email 끄기**(사람이 정할 것 1이 A일 때).
4. Project Settings → API Keys: Project URL과 **publishable key**(`sb_publishable_…`)를 복사 → GitHub 레포 Settings → Secrets and variables → Actions → **Variables**에 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. secret key(`sb_secret_…`)는 어디에도 넣지 않는다.
5. 머지 전에 폰에서 설정 → 기록 내보내기로 JSON을 한 번 저장해 둔다.

---

## 사람이 정할 것

**1. 로그인 방식**

| 안 | 내용 | 대가 |
|---|---|---|
| **A (추천)** 이메일 + 비밀번호, 확인 메일 끔 | 앱 안에서 끝난다. 메일 서버가 필요 없다 | 비밀번호를 잊으면 운영자가 대시보드에서 바꿔 준다. 남의 이메일로 가입할 수 있다(그 사람 기록에는 닿지 않는다) |
| B 이메일로 받은 6자리 코드 | 비밀번호가 없다 | 메일 서버(SMTP — Resend 등) 연결이 필요하다. Supabase 기본 메일은 개발용이라 팀원 주소 말고는 보내지 않고 시간당 몇 통으로 막혀 있다 |
| C 구글·애플 로그인 | 익숙하다 | iOS 홈 화면 앱에서 로그인 창이 Safari로 나가 돌아오지 않는 문제가 있다(홈 화면 앱과 Safari는 저장소가 다르다). 이번 범위에서는 검증할 수 없다 |

**2. 로그아웃할 때 이 기기의 기록**

| 안 | 내용 |
|---|---|
| **A (추천)** 지운다 | 기록은 계정에 있으니 기기를 처음 상태로 둔다. 다른 사람이 같은 기기로 로그인해도 섞이지 않는다. 올라가지 않은 기록이 있으면 한 번 더 묻는다 |
| B 남긴다 | 로그인 전처럼 기기에서 계속 쓴다. 다른 계정으로 로그인하면 `foreign`으로 막힌다(설정 → 초기화 뒤에 로그인) |

**3. Gist를 걷는 시점 (TT4)**

| 안 | 내용 |
|---|---|
| **A (추천)** TT1~TT3를 먼저 배포하고, 실기기 확인 ①~⑧ 뒤 TT4를 별도 PR | 계정 동기화가 검증되기 전까지 Gist가 앱 밖 사본으로 남는다 |
| B TT1~TT4를 한 PR | 설정이 한 번에 정리된다. 계정 동기화에 문제가 있으면 앱 밖 사본이 없다(JSON 파일뿐) |
| C Gist를 계속 둔다 | 백업 길이 둘로 남는다. 이슈 #31 요청 1과 어긋난다 |

**4. 무료 플랜**

| 안 | 내용 |
|---|---|
| **A (추천)** Free로 시작 | 500MB·월 5만 명까지. 1주일 동안 요청이 없으면 멈춘다(누가 하루라도 쓰면 안 멈춘다). 멈추면 동기화만 실패하고 기록은 기기에 남는다 |
| B Pro (월 $25) | 멈추지 않는다 |

**5. 화면 문구** (원문 — 고칠 것만 말하면 된다)

| 자리 | 문구 |
|---|---|
| 묶음 제목 / 카드 머리 | `계정·동기화` / `계정` |
| A 로그인 전 안내 | `로그인하면 기록이 계정별로 서버에 저장되고, 같은 계정으로 로그인한 다른 기기와 맞춰집니다. 기록은 지금처럼 이 기기에 먼저 저장되므로 오프라인에서도 그대로 씁니다. 서버는 앱 운영자가 관리하며, 운영자는 저장된 기록을 볼 수 있습니다. 로그인하지 않으면 이 기기에만 저장됩니다.` |
| 폼 | `로그인` · `가입` · `이메일` · `비밀번호` · `확인 중…` |
| B 처음 연결 — 둘 다 기록 있음 | 제목 `이 계정에 이미 기록이 있습니다` / `계정에 세션 <n>개, 이 기기에 세션 <m>개가 있습니다. 계정 기록을 받으면 이 기기의 기록은 지워지고 계정 기록으로 바뀝니다. 이 기기 기록이 필요하면 먼저 "기록 내보내기"로 JSON 파일을 저장해 두세요.` · `로그인 취소` · `계정 기록 받기` · `정말 받기` |
| C 다른 계정의 기기 | 제목 `이 기기에는 다른 계정의 기록이 있습니다` / `<이메일> 계정으로 로그인하거나, 설정 → 위험 구역에서 이 기기 데이터를 초기화한 뒤 로그인하세요.` · `확인` |
| D 한꺼번에 지움 | 제목 `기록 <n>건이 이 기기에서 사라졌습니다` / `계정의 기록은 아직 그대로입니다. 이 기기에서 일부러 지운 것이 아니면 계정 기록으로 되돌리세요.` · `계정 기록으로 되돌리기` · `계정에서도 지우기` · `정말 지우기` |
| E 만료 | `로그인이 만료됐습니다. 다시 로그인하면 그동안의 기록이 이어서 올라갑니다.` |
| F 로그아웃 확인 | `로그아웃하면 이 기기의 기록이 지워집니다. 기록은 계정에 남아 있어 다시 로그인하면 받아집니다.` · `취소` · `로그아웃` |
| G 올라가지 않은 기록 | `아직 계정에 올라가지 않은 기록이 있을 수 있습니다(서버에 연결하지 못했습니다). 지금 로그아웃하면 그 기록은 사라집니다.` · `취소` · `그래도 로그아웃` |
| H 계정 삭제 | `계정과 서버의 기록을 모두 지웁니다. 이 기기의 기록은 남습니다. 되돌릴 수 없습니다.` · `취소` · `계정 삭제` · `정말 삭제` |
| 진행 중 세션 | `진행 중인 세션을 마치거나 버린 뒤에 할 수 있습니다` |
| 줄 / 버튼 | `계정` · `마지막 동기화` · `아직 없음` · `지금 동기화` · `로그아웃` · `계정 삭제` |
| 상태 줄 | `잠시 후 자동으로 맞춥니다…` · `맞추는 중…` · `맞춤 완료 <시각>` · `변경 없음 — <시각>` · `오프라인 — 연결되면 다시 맞춥니다` · `실패: <메시지>` |
| 오류 | TT2 kind 표의 여덟 문구 |
| 초기화 확인에 더하는 줄 (로그인 상태일 때만) | `계정의 기록은 서버에 남습니다. 다시 로그인하면 받아집니다.` |
| 홈 배너 | 오래됨 `마지막 동기화가 N일 전이에요` / `연결되면 자동으로 맞춥니다. 지금 맞추려면 설정 → 계정 → 지금 동기화` · 미설정 `백업이 설정되지 않았어요` / `설정 → 계정에서 로그인하면 기록이 서버에 저장되고 다른 기기에서도 이어집니다` · (TT4, 서버 없는 빌드) `설정 → 기록 내보내기에서 JSON 파일로 저장해 두세요` |
