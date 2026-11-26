# 에이전트 하네스 지도 (사람용)

이 레포를 Claude 여러 모델로 설계·구현·리뷰하는 방식 전체를 한 장에 모은 것이다.
에이전트는 이 파일을 읽지 않는다. 에이전트용 규칙은 `CLAUDE.md`와 이 폴더의 역할 파일이다.

## 1. 흐름

```
요청 ─ 지휘자에게 보낸 기획(지휘자가 이슈로 만든다), GitHub 이슈, 또는 docs/FIELD-REPORT-*.md
  │  지휘자가 흐름을 고른다. 모르면 설계다 (coordinator/INTAKE.md)
  │
  ├─ 작은 수정 ── 구현자(Sonnet) → 리뷰어(Opus) ──────────────────────┐
  │                                                                    │
  └─ 설계 ── 설계자(Opus) → 검토자 Opus(코드 대조) ∥ Fable(빠진 경우)    │
              → 설계자가 검토 반영                                      │
              → 자동 승인 조건 맞음 ─┐   안 맞음 → PLAN PR ─[사람 머지]─┐  │
                                    ▼                                ▼  │
          여러 작업 구현: 작업마다 구현자 → (화면 변경이면 화면 검증자) → 리뷰어 (반려 1회까지)
                                    │                                   │
                                    ▼                                   ▼
              PR (CI: npm run check와 같은 목록, 필수) ──[사람: 화면 확인 → 머지]──▶ main
                                    │                                   │
                PR 본문 "규칙 메모"·"토큰 사용"                GitHub Pages 배포 → 폰 앱
                                    ▼                                   │
                     규칙 정비(주간) → 규칙 PR ─[사람 머지]        실사용 → 다음 실사용 보고

PLAN 구현 PR이 머지되면 (같은 지휘자 세션에서 이어서)
  품질 정리 ── 품질 관리자(Sonnet) → 리뷰어(Opus) → 정리 PR(동작 변경 없음) ─[사람 머지]
```

## 2. 역할과 모델

| 역할 | 파일 | 에이전트·모델 | 왜 |
|---|---|---|---|
| 지휘자 | `COORDINATOR.md` (+ `coordinator/`) | Claude Sonnet · low | 코드를 안 읽고 보고 첫 줄만 보고 판단한다. 싸게 오래 돈다 |
| 설계자 | `DESIGNER.md` | Claude Opus · high (첫 메시지에 `설계자 모델: fable`처럼 지정하면 그 Run만 바뀜) | 품질 차이가 가장 큰 단계. 호출은 적다 |
| 설계 검토자 ① | `PLAN-REVIEWER.md` | Claude Opus · high | **코드 대조** 담당(진단이 코드와 맞는가·원칙). PLAN이 가리키는 파일을 직접 열어 맞추는 일이라 읽기 정확도가 값이다 |
| 설계 검토자 ② | `PLAN-REVIEWER.md` | Claude Fable · high | **빠진 경우** 담당(놓치는 경우·검증 항목·범위). 설계자(Opus)와 다른 모델이어야 겹치는 사각이 줄어든다. 동시에 돌리고 서로의 보고는 안 본다 |
| 구현자 | `IMPLEMENTER.md` | Claude Sonnet · medium | 토큰을 가장 많이 쓰는 단계 |
| 화면 검증자 | `SCREEN-CHECKER.md` | Claude Sonnet · medium | 화면 파일이 바뀐 작업만. 폰 크기 브라우저(Chromium·WebKit)로 찍어 **직접 보고** 넘침·잘림·겹침·가림을 거른다. 실기기는 아니다 — 못 보는 것은 "실기기에서 볼 것"으로 PR에 넘긴다 |
| 리뷰어 | `REVIEWER.md` | Claude Opus · high (작은 수정은 medium) | 구현자와 다른 모델이어야 한다. 읽는 양은 적다 |
| 규칙 정비자 | `RULES-KEEPER.md` | Claude Sonnet · high (사람이 직접 띄움) | 규칙 메모를 키로 묶어 세고(`scripts/incidents.mjs`), 문제 대장(`docs/INCIDENTS.md`)을 따라 같은 문제가 다시 안 나오게 규칙·안전장치를 고친다 |
| 품질 관리자 | `QUALITY-KEEPER.md` (+ `coordinator/QUALITY.md`) | Claude Sonnet · high, 리뷰는 Opus | PLAN 구현 PR이 머지되면 지휘자가 이어서 띄운다. 복사본·안 쓰는 코드·테스트만 살린 코드를 동작 변경 없이 치운다 |

**일꾼은 전부 Claude다.** 예전에는 설계 검토를 다른 회사 모델(Codex·Antigravity)에게 맡겨 "회사가 다르니
놓치는 곳이 다르다"를 샀는데, 그 자리를 Claude 둘로 바꿨다. 바뀐 것과 그 몫을 메우는 방법:

| 잃은 것 | 메우는 방법 | 어디 |
|---|---|---|
| 회사가 다른 모델의 다른 사각 | 검토자 둘의 **모델을 다르게**(Opus·Fable) 하고 **보는 각도를 나눈다**(코드 대조 / 빠진 경우) | `coordinator/DESIGN.md` "일꾼 배치" |
| 두 회사가 모두 통과시켰다는 신뢰 | **`구조 변경` 라벨 이슈는 자동 승인하지 않는다.** 데이터 모델·저장 위치·플랫폼·README 결정을 뒤집는 설계는 사람이 PLAN을 읽고 머지한다 | `coordinator/DESIGN.md` "자동 승인" |
| 무료 한도(Claude 한도를 안 쓰던 몫) | 검토자 ②를 Fable로 두고, 한도에 걸리면 동시가 아니라 **순차**로 다시 띄운다 | `coordinator/DESIGN.md` "검토자 선택" |

모델·effort를 역할마다 다르게 두는 기준은 하나다 — **틀렸을 때 비용이 큰 단계에 좋은 모델을 쓰고,
토큰을 많이 쓰는 단계는 싸게 돌린다.** 설계·리뷰·검토는 틀리면 구현 전체가 헛돌고, 구현은 양이 많다.

## 3. 사람이 하는 말

지휘자는 main 작업 트리에서 띄운다: `claude --model sonnet --effort low --add-dir C:\Users\jyg66\orca\workspaces`
첫 메시지는 `/coord ` 다음에 아래 중 하나를 붙인다. `/coord`는 `.claude/commands/coord.md`이고, `agents/COORDINATOR.md를 읽고 진행해.` 아래에 붙인 말을 넣어 보낸다(그 문장을 직접 쳐도 같다).
일꾼은 이 명령을 스스로 부르지 못한다(`disable-model-invocation`).

| 하고 싶은 것 | 말 |
|---|---|
| **기획 던지기 (기본)** | 하고 싶은 것을 그냥 쓴다(여러 줄이면 Shift+Enter). 지휘자가 이슈를 만들고 흐름·PLAN 버전·작업 ID를 정한다 |
| 이미 있는 이슈 | `이슈 #24 진행해` (흐름은 지휘자가 고른다) |
| 작은 수정으로 정해서 | `이슈 #23을 작은 수정으로 진행해` |
| 설계로 정해서 | `설계 작업. 주제: 이슈 #24` (PLAN 파일·작업 ID는 적으면 그대로 쓴다) |
| 설계 검토자 지정 | 위 문장 끝에 `검토자: opus` (하나만 쓰고 싶을 때. 안 적으면 opus·fable 둘) |
| 모델 지정 (그 Run만) | 위 문장 끝에 `설계자 모델: fable`. 구현자와 리뷰어를 같은 모델로 만드는 지정은 거절된다 |
| PLAN 작업 하나 | `docs/PLAN-v1.14.md의 LL1을 진행해` |
| PLAN 남은 작업 전부 | `docs/PLAN-v1.14.md의 미구현 작업을 전부 진행해` |
| 멈춘 일 이어서 | 새 세션에서 `/coord 이어서 진행해` (진행 파일 `.reports/run-*.md`를 읽고 이어간다) |
| 규칙 정비 | (지휘자 말고 그냥 Claude 세션에서) `agents/RULES-KEEPER.md를 읽고 규칙 정비해` |
| 품질 정리 (따로) | `품질 정리해` (PLAN이 끝나면 지휘자가 알아서 하므로 보통은 필요 없다) |

## 4. 사람이 하는 일 (관문)

1. **요청 쓰기.** 지휘자에게 기획을 보내거나 이슈 양식을 채운다. "무엇이 되면 끝인지"(성공 기준)를 한 줄이라도 쓰면 설계·리뷰가 그걸 기준으로 삼는다.
2. **PLAN PR 판단** (자동 승인 안 됐을 때만). 기각된 지적과 설계자가 정한 문구를 읽고 이견을 말하거나 머지한다.
3. **구현 PR 머지.** PR 본문의 "배포 영향"과 "사람이 화면에서 확인할 것"을 보고 머지한다. 머지 = 폰 앱 배포다.
   화면이 바뀐 PR은 `docs/screenshots/<버전>/`의 스크린샷을 먼저 보고, "실기기에서 볼 것"은 폰에서 본다(스크린샷은 브라우저 흉내라 Safari·노치·키보드는 다를 수 있다).
   지휘자가 접수한 일이면 PR 맨 위 `흐름: … — 이유` 줄도 본다. 작은 수정으로 갔는데 판정 규칙이 바뀌었으면 머지하지 말고 말한다.
   **머지 전에 PR의 Commits 탭을 본다.** 마지막 커밋이 PR 화면에 올라온 뒤 머지한다(#16·#18에서 머지 뒤에 올라온 커밋이 main에 빠졌다).
4. **멈췄을 때.** 지휘자가 gate를 걸면 이유가 온다(한도, 권한 창, 사람 판단 필요). 해결하고 "이어서"라고 한다.
5. **품질 정리 PR 머지.** PLAN이 끝나면 하나 올라온다. 동작이 그대로라 화면 확인은 없다. 지운 줄이 더한 줄보다 많은지만 본다.
6. **가끔 규칙 정비.** PLAN 하나가 끝났거나 모델이 바뀌었을 때.

## 5. 무엇이 무엇을 강제하나

글로 쓴 규칙은 모델이 잊을 수 있다. 되돌릴 수 없는 것은 장치가 막는다.

| 장치 | 막는 것 | 위치 |
|---|---|---|
| GitHub ruleset `mainRuleset` | main 직접 push, 강제 push, 삭제, CI 실패한 PR 머지 | 레포 Settings → Rules |
| CI (`ci`) | 아래 검사가 하나라도 깨진 PR. 로컬의 `npm run check`와 같은 목록이다(`scripts/check.test.mjs`가 둘이 같은지 본다) | `.github/workflows/ci.yml`, `scripts/check.mjs` |
| 린트 (ESLint, CI에서) | **새로 생긴** React 훅 규칙 위반(렌더 중 ref 쓰기, effect 안 setState), 접근성 위반(jsx-a11y), 안 쓰는 변수. 도입 전부터 있던 34건은 `eslint-suppressions.json`에 묶여 있고 줄어들기만 한다 | `eslint.config.js` |
| 안 쓰는 파일·의존성 (Knip, CI에서) | 아무도 import하지 않는 파일, `package.json`에 없는데 쓰는 패키지, 있는데 안 쓰는 패키지 | `knip.json` |
| Astryx 뒷걸음 (CI에서) | Astryx를 안 읽는 화면 파일, 인라인 스타일, 손으로 짠 클래스 쓰임이 **늘어난** PR | `scripts/astryx-inventory.mjs --check` (기준: `docs/ASTRYX-INVENTORY.md` 합계 줄) |
| 속성 테스트 (fast-check, `npm test` 안에서) | "어떤 입력에서도 성립해야 하는 것"이 깨진 계산 함수 | `src/lib/properties.test.ts` |
| 보안 (`Security`, 필수 아님) | 코드의 취약 패턴(CodeQL), PR이 새로 들인 취약 의존성(OSV). 결과는 레포 Security 탭 | `.github/workflows/security.yml` |
| 흔적 검사 (`quality-scan --ci`, CI에서) | 새로 생긴 같은 이름 함수·상수 복사본, `.skip`·`.only`·`.todo` 테스트, `@ts-ignore`·`@ts-nocheck`, 무력화(`if (false)` 같은 늘 같은 조건, `any`, 이유 없이 빈 `catch`) | `scripts/quality-scan.mjs` (알고 있는 중복: `scripts/quality-allow.json`) |
| 배포 전 테스트 | 깨진 코드 배포 | `.github/workflows/deploy.yml` |
| 에이전트 안전장치 훅 | Claude 일꾼의 `gh pr merge`, main push, 강제 push, `reset --hard`, `clean -f`, `checkout --`, `branch -D`, 그리고 위 ruleset을 끄는 명령(`gh repo edit/delete`, API로 ruleset·브랜치 보호·main 삭제) | `.claude/settings.json` → `scripts/agent-guard.mjs` (테스트: `scripts/agent-guard.test.mjs`) |
| `.gitattributes` | CRLF 섞임 | 레포 |
| `.gitignore`의 `.reports/` | 검토 보고·진행 파일이 커밋되는 것 | 레포 |

ruleset은 승인 리뷰 0개로 되어 있다(혼자 쓰는 레포라 자기 PR을 승인할 수 없다). 그래서 **에이전트가 `gh pr merge`를 하면 서버는 막지 못한다.** 훅이 그 자리를 막는다.

### CI 밖에서 도는 검사 (에이전트가 돌린다)

| 도구 | 누가 언제 | 무엇을 |
|---|---|---|
| 변이 테스트 (StrykerJS) `npm run mutation` | 구현자가 `src/lib`를 바꿨을 때 | 바뀐 파일의 줄마다 결함을 넣어 보고 테스트가 잡는지. 살아남은 변이 = 테스트의 구멍. 파일당 1분쯤 걸려 CI에 넣지 않았다 |
| 화면 검사 `node scripts/ui-check.mjs after --check` | 화면 검증자 | 화면마다 접근성(axe-core), 넘침, 눌림 반응, 움직임, 여백. Playwright 브라우저가 필요해 CI에 넣지 않았다 |
| 화면 비교 (Argos) `node scripts/argos-upload.mjs` | 화면 검증자, `ARGOS_TOKEN`이 있을 때만 | 바꾸기 전·후 스크린샷의 달라진 픽셀 |
| 검사 루프 | 구현자 | `npm run check`가 통과할 때까지 고치고 다시 돌린다. 다섯 번까지, 같은 실패가 두 번이면 멈춘다(`IMPLEMENTER.md` 3절) |

## 6. 상태가 있는 곳

| 무엇 | 어디 |
|---|---|
| 해야 할 일 | GitHub 이슈 |
| 지금 하는 일의 진행 | `.reports/run-<대상>.md` (지휘자가 단계마다 고친다. 대화가 끊겨도 이어갈 수 있다) |
| 설계 검토 결과 | `.reports/<PLAN 버전>-<검토자>.md` |
| 설계 | `docs/PLAN-*.md` (바뀐 부분의 기록) |
| 화면의 기준 | `docs/DESIGN.md` 9절 (Astryx 우선), 옮긴 정도는 `docs/ASTRYX-INVENTORY.md` |
| 리뷰 판정 전문 | `.reports/review-<작업 ID>.md` |
| 지금 동작의 명세 | `README.md` "핵심 설계 결정" |
| 구현 기록 | `docs/DEV-RECORD-*.md`, 작은 수정은 PR 본문 |
| 계획대로 안 된 일 | PR 본문 `## 규칙 메모`, 댓글 `## 규칙 메모 (추가)` (줄마다 `[분류]`와 `(키: …)`) |
| 반복되는 문제와 막은 방법 | `docs/INCIDENTS.md` (규칙 정비자가 고친다) |
| 화면 검증 | `.reports/screen-check-<작업 ID>.md`, 스크린샷 `docs/screenshots/<버전>/` |
| 역할·모델별 토큰 | PR 본문 `## 토큰 사용` (지휘자가 PR 직전에 잰다. 표 아래 주석이 기계용 원본) |

## 7. 새 PC 설정 (Windows)

레포 설정 (한 번만, GitHub 웹):
- Settings → General → Pull Requests → **Automatically delete head branches** 켜기 (지휘자는 로컬 브랜치만 지운다. 원격 브랜치는 이 설정이 지운다)
- Issues → Labels에 `개선`, `새 기능`, `구조 변경` 라벨이 있어야 이슈 양식의 라벨이 붙는다

PC마다:

- Orca 에이전트 설정: Claude 인자 `--permission-mode auto`. **다른 회사 에이전트는 쓰지 않는다**(2절)
- Orca 설정: 하위 에이전트 깊이 1, 끝난 일꾼 자동 닫기, 캐시 타이머 1시간, 잠자기 방지
- `gh auth login` (지휘자가 PR을 만들고 머지를 기다린다)
- 하지 않는 것: bypass 권한을 기본값으로 두기(`--permission-mode auto`까지만), `powershell.exe`를 백신 예외에 넣기

## 8. 자주 걸리는 것

| 증상 | 원인 | 해결 |
|---|---|---|
| 검토자가 worker_done 없이 끝남 | 일꾼이 완료 신호를 못 보냄 | 보고 파일의 둘째 줄 SHA가 맞고 첫 줄에 판정이 있으면 지휘자가 정상으로 본다 (`coordinator/DESIGN.md`) |
| 일꾼이 엉뚱한(main) 작업 트리에 뜸 | `--worktree current` | 경로로 지정(`COORDINATOR.md` "작업 트리 지정") |
| 설계자가 "main에 없다"고 함 | 지휘자 main 작업 트리가 옛것 | 지휘자 시작 때 `git pull --ff-only` (`COORDINATOR.md` 1-4) |
| 한글 깨짐 | PowerShell로 파일을 씀(CP949) | 파일은 편집 도구로 쓴다. `CLAUDE.md` "환경" |
| 지휘자가 작업 트리 파일을 못 읽음 | `--add-dir` 없이 띄움 | 3절 명령으로 다시 띄우기 |
| `[agent-guard] 막음` | 안전장치 | 정상이다. 정말 필요한 명령이면 사람이 직접 터미널에서 한다 |
| Claude 한도 초과 | 주간·5시간 한도. 검토자 둘이 모두 Claude라 설계 단계에서 특히 빨리 닿는다 | 검토자는 순차로 다시(`coordinator/DESIGN.md`), 그래도 걸리면 지휘자가 시각을 알려주고 멈춘다. 풀리면 "이어서" |
| 지휘자가 "이슈 #N"이 뭐냐고 물음 | 예시 문장의 `#N`을 그대로 보냄 | 이슈가 없으면 번호 대신 요청 본문을 보낸다(기획 던지기) |
| PR 검사(CI)가 `npm ci`에서 실패 | 잠금 파일은 npm 11로 만들었는데 CI의 Node가 옛 버전 | CI·배포는 Node 24(npm 11). PC의 npm을 크게 올렸으면 CI도 맞춘다 |
| 같은 요청 이슈가 두 개 | 이슈 만들기를 두 번 시킴 | 지휘자는 만들기 전에 같은 제목의 열린 이슈를 찾는다(INTAKE.md 1절). 남은 하나는 사람이 닫는다 |

## 9. 규칙을 바꾸는 법

- 규칙도 PR로 바꾼다. 지휘자는 규칙을 고치지 않고 메모만 남긴다.
- 메모가 두 번 이상 나오면 고친다. "하지 않는다"가 반복해서 어겨지면 글 대신 장치(훅·테스트·CI)로 옮긴다.
- 막았다고 대장에 적은 문제가 다시 나오면(재발) `scripts/incidents.mjs`가 표 맨 위에 올린다. 글로 막았던 것은 장치로 바꾼다.
- 한 정책은 한 파일에만 둔다. PR 관련은 `coordinator/PR.md` 한 곳이다.
- 모델이 바뀌면 규칙 정비를 한 번 돌린다. 예전 모델 때문에 생긴 규칙은 지울 수 있는지 본다.

## 10. 토큰 기록

- **재는 것:** 지휘자가 PR을 만들기 직전에 `scripts/token-usage.mjs`를 돌려, 그 Run 동안 이 레포 폴더에서 돈 Claude 세션을 역할·모델별로 합쳐 PR 본문에 붙인다. 역할은 세션의 첫 지시문(`agents/DESIGNER.md를 읽고…`)으로 가린다. 프롬프트 내용은 남기지 않는다.
- **못 재는 것:** Orca 밖에서 한 일(claude.ai 채팅 같은 것)
- **입력 환산:** 새 입력 1을 기준으로 캐시 읽기 0.1, 캐시 쓰기 2(1시간), 출력 5로 센 근삿값이다. 같은 모델 안에서 역할끼리 비교하는 용도다. Opus·Sonnet·Fable 사이 차이는 모델 칸을 같이 본다. 모델이 한 회사가 됐으니 이 표가 한도를 보는 유일한 눈이다.
- **보는 법:** `node scripts/token-usage.mjs --collect` (gh 필요) — 머지된 PR들을 모아 역할별 몫·캐시 적중·출력 몫을 보여준다. 주간 규칙 정비가 이 표로 아낄 구간을 고르고(`RULES-KEEPER.md` 5절), 모델 바꾸기는 사람에게 제안만 한다.
- **지금 Run만 보기:** `node scripts/token-usage.mjs --since 2026-11-10T13:00:00+09:00`
