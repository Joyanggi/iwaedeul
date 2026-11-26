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
  └─ 설계 ── 설계자(Opus) → 설계 검토자(Opus, 한 명 · REVIEW.md로 튜닝)   │
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
| 설계자 | `DESIGNER.md` | Claude Opus · **medium** (구조 변경이면 high. 첫 메시지에 `설계자 모델: sonnet`처럼 지정하면 그 Run만 바뀜) | 품질 차이가 가장 큰 단계. 호출은 적다. **medium이 기본**이고, 모자라면 effort를 한 칸 올리는 것이 모델을 바꾸는 것보다 먼저다 |
| 설계 검토자 | `PLAN-REVIEWER.md` | Claude **Sonnet · high** (구조 변경이면 Opus · medium) | **한 명이다.** 검토자를 쌓는 대신 `REVIEW.md`와 `docs/RELIABILITY.md`로 튜닝한다. 반복해서 도는 검토 작업은 Sonnet이 제자리다 |
| 구현자 | `IMPLEMENTER.md` | Claude Sonnet · medium | 토큰을 가장 많이 쓰는 단계. 범위가 정해진 구현은 Sonnet·medium이 제자리다 |
| 화면 검증자 | `SCREEN-CHECKER.md` | Claude Sonnet · medium | 화면 파일이 바뀐 작업만. 폰 크기 브라우저(Chromium·WebKit)로 찍어 **직접 보고** 넘침·잘림·겹침·가림을 거른다. 실기기는 아니다 — 못 보는 것은 "실기기에서 볼 것"으로 PR에 넘긴다 |
| 리뷰어 | `REVIEWER.md` | Claude Opus · **medium** (반려 뒤 재리뷰·위험 경로는 high) | 구현자와 다른 모델이어야 한다. 읽는 양은 적다 |
| 규칙 정비자 | `RULES-KEEPER.md` | Claude Sonnet · high (사람이 직접 띄움) | 규칙 메모를 키로 묶어 세고(`scripts/incidents.mjs`), 문제 대장(`docs/INCIDENTS.md`)을 따라 같은 문제가 다시 안 나오게 규칙·안전장치를 고친다 |
| 품질 관리자 | `QUALITY-KEEPER.md` (+ `coordinator/QUALITY.md`) | Claude Sonnet · high, 리뷰는 Opus | PLAN 구현 PR이 머지되면 지휘자가 이어서 띄운다. 복사본·안 쓰는 코드·테스트만 살린 코드를 동작 변경 없이 치운다 |

**일꾼은 전부 Claude이고 요금제는 Pro다.** 예전에는 설계 검토를 다른 회사 모델(Codex·Antigravity)에게
맡겨 "회사가 다르니 놓치는 곳이 다르다"를 샀다. 그 자리를 **검토자 한 명 + 장치**로 바꿨다.

| 잃은 것 | 메우는 방법 | 어디 |
|---|---|---|
| 회사가 다른 모델의 다른 사각 | **`REVIEW.md`로 일차 검토자를 튜닝한다.** 검토자를 쌓는 것보다 낫다는 것이 Claude Code 팀의 결론이기도 하다 | 레포 루트 `REVIEW.md` |
| 두 눈이 모두 통과시켰다는 신뢰 | ① `구조 변경`은 **자동 승인 금지** ② 같은 검토자를 **2라운드**(앞 라운드 위에 쌓기) | `coordinator/DESIGN.md` |
| 사람이 기억하던 과거 사고 | **`docs/RELIABILITY.md`** — 항목마다 diff에서 읽히는 **방아쇠**가 있어, 바뀐 파일에 걸리는 3~10개만 본다 | `docs/RELIABILITY.md` |
| 무료 한도(Claude 한도를 안 쓰던 몫) | 일꾼은 언제나 하나씩 · 싼 검사 먼저 · 검토자는 테스트·빌드를 안 돌린다 | `coordinator/DESIGN.md` "검토자 선택과 한도" |

**Fable은 Pro에서 못 쓴다.** 모델 지정에 Fable을 적지 않는다.

### 모델과 effort를 정하는 규칙

Claude 팀이 공개한 모델 선택 지침을 이 레포 크기에 맞춰 옮긴 것이다. 네 줄이면 끝난다.

1. **medium에서 시작한다.** 모자라면 **모델을 바꾸기 전에 effort를 한 칸** 올린다. effort가 더 싼 손잡이다.
2. **모델을 올리기 전에 "스스로 검증할 수단이 있는가"를 먼저 본다.** 테스트·빌드·스크립트를 쥐여 주는 것이
   effort를 올리는 것보다 싸고 효과가 크다(`verify` 스킬이 그 자리다).
3. **싸게 돌리고 실패만 올려 다시 돌린다.** 결과를 기계가 판정할 수 있으면(검사·테스트) 전부 낮은 설정으로
   돌리고 **실패한 것만** 한 칸 올려 재실행한다. 전부를 높은 설정으로 돌리는 것보다 싸고 결과가 같거나 낫다.
4. **작은 모델은 틀려도 싼 일에만.** 파일 찾기·로그 읽기·요약은 Haiku 서브에이전트(`.claude/agents/`)에 맡기고,
   **코드 수정과 판단은 주 모델이** 한다. 비싼 모델의 맥락은 결정에만 쓴다.

큰 기준은 그대로다 — **틀렸을 때 비용이 큰 단계에 좋은 모델, 토큰을 많이 쓰는 단계는 싸게.**

### 이 하네스가 따르는 바깥 사례

Claude Code 팀이 공개한 두 글에서 **이 레포 크기에 맞는 것만** 골라 넣었다. 글의 수치나 조직 구조가 아니라
**규칙과 장치**를 가져왔다.

| 가져온 것 | 어디에 들어갔나 | 출처 |
|---|---|---|
| PR 전에 이미 검증·리뷰가 끝나 있다 ("review runs continuously, more like spellcheck") | 구현자가 PR 전에 `/verify` 스킬 + 셀프 리뷰 | `IMPLEMENTER.md`, `.claude/skills/verify/` |
| `REVIEW.md` — 코드 소유자가 쓰는 "여기서 무엇이 실패인가" | 레포 루트에 신설. 검토자·리뷰어가 읽는다 | 코드 리뷰 글 |
| 검토 규칙은 **그 변경이 못 고치는 곳**에서 읽는다 | 리뷰어는 `REVIEW.md`·`RELIABILITY.md`를 **base 브랜치 판본**으로 읽는다 | 검증 글 |
| 라운드를 쌓되 앞 라운드 위에 쌓고, 3라운드면 멈추고 사람 | 검토 2라운드 규칙, 검사 루프 상한 | `coordinator/DESIGN.md`, `IMPLEMENTER.md` |
| 지적은 **Important / Nit / Pre-existing**로 나누고, 스타일만인 것은 버린다 | 리뷰어 출력 형식 | `REVIEWER.md`, `REVIEW.md` |
| 과거 사고를 **방아쇠 달린 체크리스트**로 | `docs/RELIABILITY.md` | 검증 글 |
| 검증은 "돌려 보는 것"이고, 모바일은 **기기 MCP**로 | 실기기 검증 설계(`docs/PLAN-v2.0.md` 11절) | 검증 글 |
| 새 관문은 **observe 모드**로 켠다 | 커밋 검증 도장(`agent-guard` 확장) | 검증 글 |

| 모델은 medium에서 시작하고, 모델보다 effort를 먼저 올린다 · 실패만 올려 재실행 | 위 "모델과 effort를 정하는 규칙" | 모델 선택 글 |
| 서브에이전트는 작은 모델에, 판단은 주 모델에 | `.claude/agents/log-reader.md`·`Explore.md` (`model: haiku`) | 모델 선택 글 |
| push 전에 `/code-review` | `IMPLEMENTER.md`, `CLAUDE.md` "검증" | PR 이후 작업 글 |
| 되돌리기 어려운 결정은 **미리 목록으로** 정해 두고 그때 멈춰 묻는다 | `REVIEW.md` 3절, `coordinator/DESIGN.md` 자동 승인 | 카오스 루프 글 |
| 언제나 성립해야 하는 **불변**을 적어 두고 테스트로 잠근다 | `REVIEW.md` 1.5절 | 카오스 루프 글 |
| 무거운 검사는 **클라우드 세션**으로 돌리고 기기 검증만 로컬 | `docs/PLAN-v2.0.md` 11절 | 클라우드 세션 글 |

출처: [코드 리뷰](https://claude.dev/blog/solving-code-review-at-anthropic/) (2026-10-15) ·
[검증](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification/) (2026-11-16) ·
[모델 선택](https://claude.dev/blog/which-claude-model-should-you-build-with/) (2026-11-09) ·
[PR 이후 작업](https://claude.dev/blog/the-work-after-you-open-a-pr/) ·
[클라우드 세션](https://claude.dev/blog/claude-code-in-the-cloud/) ·
[카오스 루프](https://claude.dev/blog/chaos-loop-claude-docs-launch/).

**가져오지 않은 것**: `/ship`의 PR 감시(이 레포처럼 `.claude/settings.json`에 Bash PreToolUse 훅이 있으면
돌지 않는다 — 후속은 지휘자가 한다) · 머지 큐·피처 플래그·단계 출시(혼자 쓰는
앱이라 되돌리기가 이미 싸다) · 1,000 에이전트 규모의 샌드박스·게이트웨이(규모가 다르다) ·
사고 기반 일일 eval(표본이 몇 건뿐이라 `docs/RELIABILITY.md`로 대신한다).

## 3. 사람이 하는 말

지휘자는 main 작업 트리에서 띄운다: `claude --model sonnet --effort low --add-dir ~/orca/workspaces`
(경로는 Orca가 작업 트리를 만드는 폴더다. 다르면 그 경로로 바꾼다.)
첫 메시지는 `/coord ` 다음에 아래 중 하나를 붙인다. `/coord`는 `.claude/commands/coord.md`이고, `agents/COORDINATOR.md를 읽고 진행해.` 아래에 붙인 말을 넣어 보낸다(그 문장을 직접 쳐도 같다).
일꾼은 이 명령을 스스로 부르지 못한다(`disable-model-invocation`).

| 하고 싶은 것 | 말 |
|---|---|
| **기획 던지기 (기본)** | 하고 싶은 것을 그냥 쓴다(여러 줄이면 Shift+Enter). 지휘자가 이슈를 만들고 흐름·PLAN 버전·작업 ID를 정한다 |
| 이미 있는 이슈 | `이슈 #24 진행해` (흐름은 지휘자가 고른다) |
| 작은 수정으로 정해서 | `이슈 #23을 작은 수정으로 진행해` |
| 설계로 정해서 | `설계 작업. 주제: 이슈 #24` (PLAN 파일·작업 ID는 적으면 그대로 쓴다) |
| 설계 검토자 모델 지정 | 위 문장 끝에 `검토자: sonnet` (한도가 빠듯할 때. 안 적으면 opus 하나) |
| 모델 지정 (그 Run만) | 위 문장 끝에 `설계자 모델: sonnet`. 구현자와 리뷰어를 같은 모델로 만드는 지정은 거절된다. **Pro에서 못 쓰는 모델(Fable)은 지정할 수 없다** |
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
| 리뷰 기준 (이 코드에서 무엇이 실패인가) | `REVIEW.md` · `docs/RELIABILITY.md` (방아쇠 달린 과거 사고) |
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

## 7. 새 PC 설정 (macOS)

레포 설정 (한 번만, GitHub 웹):
- Settings → General → Pull Requests → **Automatically delete head branches** 켜기 (지휘자는 로컬 브랜치만 지운다. 원격 브랜치는 이 설정이 지운다)
- Issues → Labels에 `개선`, `새 기능`, `구조 변경` 라벨이 있어야 이슈 양식의 라벨이 붙는다

PC마다:

- Orca 에이전트 설정: Claude 인자 `--permission-mode auto`. **다른 회사 에이전트는 쓰지 않는다**(2절)
- Orca 설정: 하위 에이전트 깊이 1, 끝난 일꾼 자동 닫기, 캐시 타이머 1시간, 잠자기 방지.
  **동시 일꾼은 하나.** 이 맥북에서 여럿을 돌리면 Metro·Xcode와 겹쳐 둘 다 느려진다
- `gh auth login` (지휘자가 PR을 만들고 머지를 기다린다)
- 네이티브 작업(v2.1~)을 위해 맥북에 한 번 해 둘 것: Xcode + Command Line Tools, Node 20+,
  아이폰 USB 신뢰 + 개발자 모드, mobile MCP의 DeviceKit 에이전트(7일마다 재서명) — 절차는 `.claude/skills/verify-device/SKILL.md` 0절
- 하지 않는 것: bypass 권한을 기본값으로 두기(`--permission-mode auto`까지만), `powershell.exe`를 백신 예외에 넣기

## 8. 자주 걸리는 것

| 증상 | 원인 | 해결 |
|---|---|---|
| 검토자가 worker_done 없이 끝남 | 일꾼이 완료 신호를 못 보냄 | 보고 파일의 둘째 줄 SHA가 맞고 첫 줄에 판정이 있으면 지휘자가 정상으로 본다 (`coordinator/DESIGN.md`) |
| 일꾼이 엉뚱한(main) 작업 트리에 뜸 | `--worktree current` | 경로로 지정(`COORDINATOR.md` "작업 트리 지정") |
| 설계자가 "main에 없다"고 함 | 지휘자 main 작업 트리가 옛것 | 지휘자 시작 때 `git pull --ff-only` (`COORDINATOR.md` 1-4) |
| 지휘자가 작업 트리 파일을 못 읽음 | `--add-dir` 없이 띄움 | 3절 명령으로 다시 띄우기 |
| `[agent-guard] 막음` | 안전장치 | 정상이다. 정말 필요한 명령이면 사람이 직접 터미널에서 한다 |
| Claude 한도 초과 | Pro 한도(주간·5시간). 일꾼이 전부 Claude라 설계 단계에서 특히 빨리 닿는다 | 검토자를 sonnet으로 한 번 내려 다시(`coordinator/DESIGN.md`), 그래도 걸리면 지휘자가 시각을 알려주고 멈춘다. 풀리면 "이어서" |
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
- **입력 환산:** 새 입력 1을 기준으로 캐시 읽기 0.1, 캐시 쓰기 2(1시간), 출력 5로 센 근삿값이다. 같은 모델 안에서 역할끼리 비교하는 용도다. Opus·Sonnet 사이 차이는 모델 칸을 같이 본다. 일꾼이 전부 Claude이고 요금제가 Pro라, 이 표가 한도를 보는 유일한 눈이다.
- **보는 법:** `node scripts/token-usage.mjs --collect` (gh 필요) — 머지된 PR들을 모아 역할별 몫·캐시 적중·출력 몫을 보여준다. 주간 규칙 정비가 이 표로 아낄 구간을 고르고(`RULES-KEEPER.md` 5절), 모델 바꾸기는 사람에게 제안만 한다.
- **지금 Run만 보기:** `node scripts/token-usage.mjs --since 2026-11-10T13:00:00+09:00`
