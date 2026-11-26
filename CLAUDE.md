# CLAUDE.md

이 레포에서 여는 모든 Claude 세션이 자동으로 읽는 공통 규칙이다. 매 세션 비용이 드니 짧게 유지한다.
역할별 규칙은 `agents/`에 있다.

## 역할

지정받은 역할 파일을 먼저 읽고 따른다.
설계자 `agents/DESIGNER.md` · 설계 검토자 `agents/PLAN-REVIEWER.md` · 구현자 `agents/IMPLEMENTER.md` ·
화면 검증자 `agents/SCREEN-CHECKER.md` · 리뷰어 `agents/REVIEWER.md` · 지휘자 `agents/COORDINATOR.md` · 규칙 정비자 `agents/RULES-KEEPER.md` · 품질 관리자 `agents/QUALITY-KEEPER.md` (사람용 지도: `agents/README.md`)

역할이 없으면 일반 대화다. 코드를 고치기 전에 무엇을 바꿀지 먼저 말한다.

## 이 앱

1인용 운동·식단 기록 PWA. 서버·로그인이 없고, 데이터는 IndexedDB(Dexie)에 있으며 Gist로 백업한다.
`README.md`의 "핵심 설계 결정"을 뒤집는 변경은 하지 않는다.

**v2.0부터 Expo 네이티브 앱(iOS 먼저, 안드로이드 같은 코드베이스)으로 옮긴다** — `docs/PLAN-v2.0.md`.
전환이 끝날 때까지 위 설명이 현행이고, 뒤집는 것은 PLAN v2.0이 "뒤집는 README 결정"에 적은 항목뿐이다.

## 검증 — "됐다" 대신 돌린 결과

- **push 전에 `/code-review`를 돌린다.** 여기서 잡은 버그는 리뷰 댓글이나 CI 실패로 돌아오지 않는다.
  (주의: 로컬 `/code-review`는 `CLAUDE.md`는 읽지만 **`REVIEW.md`는 읽지 않는다.** 그래서 이 레포의
  리뷰어·검토자 spec은 `REVIEW.md`를 명시적으로 읽힌다.)
- 커밋·PR 전에 **`verify` 스킬**(`.claude/skills/verify/`)을 쓴다. 바꾼 것에 맞는 검사를 돌리고
  **출력(숫자·스크린샷)을 보고에 넣는다.** 검사 루프는 **세 번까지** — 세 번째도 같은 실패면 멈추고 사람에게 간다.
- 네이티브 작업(v2.1~)의 실기기 검증은 `.claude/skills/verify-device/`를 따른다
  (시뮬레이터를 못 쓰는 맥북이라 **USB로 연결한 아이폰 + mobile MCP**가 기준이다).
- 바꾼 파일에 **`docs/RELIABILITY.md`의 방아쇠**가 걸리면 그 항목만 확인한다(보통 3~10개). 전부 읽지 않는다.
- 리뷰 기준은 `REVIEW.md`다. **`REVIEW.md`·`docs/RELIABILITY.md`는 `main` 판본을 읽는다** —
  심사받는 변경이 심사 규칙을 같이 고칠 수 있으면 그 규칙은 이미 깨진 것이다.
- 깨진 테스트를 지우거나 `.skip`·`sleep`으로 통과시키지 않는다. 흔들리면 원인을 찾고,
  끝내 못 찾으면 **지우고 왜 지웠는지 적는다.**

## 명령

- **검사 전부 한 번에: `npm run check`** (CI와 같은 목록 — 흔적 검사, Astryx 뒷걸음, 린트, 안 쓰는 파일·의존성, 테스트, 빌드). 작업 중간에는 `npm run check -- --fast`(빌드 제외)
- 하나씩: 테스트 `npm test`, 타입 확인과 빌드 `npm run build`, 린트 `npm run lint`, 변이 테스트 `npm run mutation`(바뀐 `src/lib`만, CI에서는 안 돈다)
- `tsc`를 직접 호출하지 않는다. `npx tsc --noEmit`은 `src`를 검사하지 않는다.

## 토큰 절약 (모든 역할 공통)

- **긴 출력은 끝부분만 본다.** `npm test 2>&1 | tail -15`, `npm run build 2>&1 | tail -8`
  (PowerShell에서는 `| Select-Object -Last 15`)
- **작업 중에는 관련 테스트 파일만 돌린다** (`npx vitest run <파일>`). 전체 테스트는 마무리에 한 번.
- **큰 문서는 통째로 읽지 않는다.** README, PLAN, DEV-RECORD는 `grep -n`으로 필요한 절을 찾아 그 부분만 읽는다.
- **한 번 읽은 파일은** 바뀌지 않았으면 다시 읽지 않는다.
- **세션 중에 모델을 바꾸지 않는다.** 바꾸면 대화 캐시를 처음부터 다시 만든다.
- **긴 출력·넓은 검색은 작은 서브에이전트에 맡긴다** (`.claude/agents/log-reader.md`·`Explore.md`, haiku).
  주 세션의 맥락은 판단에 쓴다.
- **모자라면 모델보다 effort를 먼저 한 칸 올린다.** 그 전에 "스스로 검증할 수단이 있는가"를 본다.

## 브랜치와 배포

- `main`에 push하면 GitHub Pages로 바로 배포되고 실제로 쓰는 폰 앱이 바뀐다.
  그래서 `main`에는 PR로만 반영하고, 머지는 사람이 한다. 에이전트는 `main`에 직접 push하거나 로컬에서 머지하지 않고, PR도 머지하지 않는다.
- 새 작업을 시작하기 전에 `main`에서 `git pull --ff-only`를 먼저 한다. 작업은 그렇게 최신으로 맞춘 `main`에서 시작한 별도 브랜치에서 한다.
  브랜치 이름은 Orca가 정한다(예: `Joyanggi/v1.13`). 추측하지 말고 `git branch --show-current`로 확인한다.
- PR 머지·main push·강제 push·`reset --hard` 같은 명령은 훅(`scripts/agent-guard.mjs`)이 막는다. `[agent-guard] 막음`이 나오면 우회하지 말고 다른 방법을 쓰거나 멈춘다.
- `main` 작업 트리에서 브랜치를 만들어 PR을 올렸으면, 끝날 때 `git checkout main`으로 돌려놓는다.
- `package.json` 버전은 PLAN이 정한 시점에만 올린다.

## 문서

- `README.md` "핵심 설계 결정": 지금 동작의 명세. `docs/DESIGN.md`는 v1.0 당시 설계라 지금과 다를 수 있다 (4·7절 판정 근거와 9절 UI 방향은 지금 기준).
- 화면은 **Astryx 우선**이다(`docs/DESIGN.md` 9절). 새 화면·부품은 `src/ax/`의 Astryx 부품으로 짓고, 손으로 짠 클래스·인라인 스타일을 늘리지 않는다(CI가 막는다).
- `docs/INCIDENTS.md`: 문제 대장. 규칙 메모의 키와 막은 방법. 규칙 정비자만 고친다.
- 요청: GitHub 이슈(개선·새 기능·구조 변경 양식)나 `docs/FIELD-REPORT-*.md`. 지휘자가 기획을 받으면 이슈로 만든다(`agents/coordinator/INTAKE.md`).
- `docs/PLAN-*.md`: 설계서. 설계자만 쓴다.
- `docs/DEV-RECORD-*.md`: 구현 기록. 맨 위에 "이 환경에서 확인된 제약" 목록이 있다. 구현자가 쓴다.
- `REVIEW.md`: 이 레포에서 무엇이 "실패"인가 — 리뷰어·설계 검토자가 읽는다. 지적은 Important / Nit / Pre-existing 셋으로만 나눈다.
- `docs/RELIABILITY.md`: 과거 사고를 diff 방아쇠와 함께 적어 둔 표.

## 환경

- Windows, Orca 작업 트리(작업마다 별도 폴더). 일꾼은 전부 Claude이고 셸은 Git Bash다.
  PowerShell로 파일을 쓰지 않는다(CP949로 한글이 깨지거나 BOM이 붙는다). 파일은 편집 도구로 쓴다.
- 커밋 메시지는 `git commit -F - <<'MSG'`로 쓴다.
- 줄바꿈은 LF로 고정돼 있다(`.gitattributes`).
- 되돌리기는 `git checkout <파일>`이 아니라 `cp` 백업으로 한다. 커밋 안 된 작업을 날리지 않기 위해서다.
