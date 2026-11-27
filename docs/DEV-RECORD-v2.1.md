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
