---
name: verify-device
description: 유선 연결한 실제 아이폰에서 앱을 띄우고 시나리오를 돌려 증거(스크린샷·UI 트리)를 남긴다. 시뮬레이터가 없는 맥북 기준. v2.1부터 쓴다.
---

# verify-device — 진짜 아이폰이 시뮬레이터 자리를 대신한다

작업용 맥북이 iOS 시뮬레이터를 제대로 못 돌린다. 그래서 **USB로 연결한 실기기**가 유일한 실행 환경이다.
Claude는 **mobile MCP**로 그 기기를 본다(화면 읽기·탭·입력·스크린샷).

> 검증은 "돌려 보는 것"이다. 테스트가 아니라 **앱이 실제로 그 기기에서 하는 일**이 증거다.

## 0. 전제 (맥북에서 한 번 + 7일마다)

> **로컬 세션에서만 된다.** 폰은 맥북 USB에 꽂혀 있다. 클라우드 세션(컨테이너)은 기기에 닿지 못한다.

### 구조 — 무엇이 무엇을 하나

mobile MCP(`.mcp.json`의 `mobile`)는 안에 든 **`mobilecli`** 로 기기를 다룬다. mobilecli가 스스로
① 기기와 터널을 열고 ② `localhost:8100`을 포워딩하고 ③ 기기의 **DeviceKit 에이전트**(XCUITest 러너)를 띄운다.
그래서 **go-ios 터널·`ios forward`·WebDriverAgent는 쓰지 않는다.**
`ios tunnel start`를 따로 띄우면 mobilecli와 같은 포트를 잡으려다 충돌한다(`bind: address already in use`).

### 한 번 해 두는 것

1. Xcode + Command Line Tools, Node 20+.
2. 아이폰을 USB로 연결 → 맥 **신뢰(Trust)**, 아이폰 설정 → 개인정보 보호 및 보안 → **개발자 모드 켜기**.
   확인: `xcrun devicectl list devices`에 `connected`로 보여야 한다. **여기서 안 보이면 MCP 문제가 아니라 페어링·개발자 모드 문제다.**
3. DeviceKit 에이전트를 본인 Personal Team으로 서명해 올린다(무료 계정 가능).
   ```bash
   git clone https://github.com/mobile-next/devicekit-ios.git
   # devicekit-ios.xcodeproj의 PRODUCT_BUNDLE_IDENTIFIER 두 개를 고유값으로 바꾼다
   #   <접두사>.mobilenext.devicekit-ios, <접두사>.mobilenext.devicekit-iosUITests
   xcodebuild -project devicekit-ios/devicekit-ios.xcodeproj -scheme devicekit-ios \
     -configuration Debug -destination id=<UDID> -derivedDataPath devicekit-derived \
     -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
     DEVELOPMENT_TEAM=<TEAM_ID> build-for-testing
   ```
   이 빌드가 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/`에 러너용 프로필
   (`…devicekit-iosUITests.xctrunner`)을 만든다. 그 프로필로 설치:
   ```bash
   MCLI=$(find ~/.npm/_npx -path '*mobilecli-darwin-arm64/mobilecli-darwin-arm64' -type f | head -1)
   "$MCLI" agent install --device <UDID> --provisioning-profile <러너 프로필.mobileprovision>
   ```
   폰: 설정 → 일반 → VPN 및 기기 관리 → 개발자 앱 **신뢰**.
   (`npx @mobilenext/mobilecli`로 받는 단독 패키지는 버전이 낡았다. MCP가 쓰는 바이너리를 그대로 쓴다.)
4. MCP 등록: 레포의 `.mcp.json`에 이미 있다(`mobile`). 세션 시작 때 Claude가 집는다.

### 7일마다 (무료 계정 서명 만료)

에이전트도 앱 하나라서 무료 프로필이 **7일이면 만료**된다. 만료일 확인:
```bash
for f in ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/*.mobileprovision; do
  security cms -D -i "$f" | plutil -extract ExpirationDate raw - -o -; echo "  $f"; done
```
갱신은 3번의 `xcodebuild … build-for-testing`을 다시 돌리고 `agent install --force …`. 우리 앱 재설치와 같은 날 묶는다.

### 세션 시작 점검 (Claude가 매번)

1. `mobile_list_available_devices` → 기기 `online`.
2. `mobile_list_elements_on_screen` → 요소 목록이 나오면 끝.
3. **스크린샷은 되는데 2번이 `localhost:8100/rpc … context deadline exceeded`로 실패하면** 에이전트가
   기기에서 멈춘 채 살아 있는 것이다. 러너 프로세스를 끄면 mobilecli가 다음 호출에 새로 띄운다:
   ```bash
   D=<UDID>; for p in $(xcrun devicectl device info processes --device $D | grep -i devicekit | awk '{print $1}'); do
     xcrun devicectl device process terminate --device $D --pid $p; done
   ```
   에이전트를 `devicectl device process launch`로 직접 띄우지 않는다. 일반 앱으로 뜨면 화면만 까맣고 서버는 안 열린다.
4. 그래도 안 되면 `"$MCLI" agent status --device <UDID>`. 설치돼 있지 않거나 서명이 만료됐으면 위 3번·7일 절차.

실패하면 **우회하지 말고 멈춘다.** 기기 검증을 건너뛴 채 "통과"라고 적는 것이 가장 나쁜 실패다.

## 1. 앱을 기기에 올리기

**빌드는 맥북의 Xcode에서 한다.** 무료 Apple 계정(Personal Team)이라 EAS 클라우드 빌드는 기기용으로 못 쓴다 —
Apple이 개발용 프로비저닝을 API로 내주지 않는다(`docs/PLAN-v2.0.md` 11.2-A).

```bash
npx expo run:ios --device <UDID>     # 개발 클라이언트를 로컬 빌드 → 연결된 아이폰에 설치
npx expo start --dev-client          # 이후 JS 변경은 다시 굽지 않고 Metro가 넘긴다
```

서명 팀은 Personal Team이다. 번들 ID는 `com.joyanggi.iwaedeul`(PLAN 17절) — **바꾸지 않는다**
(바꾸면 다른 앱이 되어 기기 데이터와 끊기고, 무료 계정 App ID 한도를 먹는다).

**네이티브 빌드는 셋일 때만** 다시 한다(약한 맥북이라 자주 굽지 않는다):
① expo 모듈 추가·제거 ② 권한·아이콘·스플래시 같은 네이티브 설정 변경 ③ 7일 만료로 재서명.
그 외에는 이미 설치된 개발 클라이언트 위에서 Metro로 돌린다.

무료 계정 제약 (앱과 에이전트가 같이 받는다):

| 제약 | 값 | 여기서 |
|---|---|---|
| 프로필 만료 | 7일 | 우리 앱과 DeviceKit 에이전트(0절)를 **같은 날** 다시 서명한다 |
| 기기당 설치 앱 | 3개 | 개발 클라이언트 + DeviceKit 러너 = 2개. **프리뷰 빌드를 따로 깔지 않는다** |
| App ID | 7일에 10개 | 번들 ID를 이것저것 바꿔 보지 않는다 |

빌드가 만료되면 앱이 실행 즉시 닫힌다. 그때 "앱이 깨졌다"고 보고하지 말고 먼저 만료일(0절의 확인 명령)을 본다.

## 2. 돌릴 시나리오 (feature map이 채점표다)

`docs/FEATURE-MAP.md`의 흐름을 위에서부터 돌린다. 최소 스모크는 넷이다.

1. **헬스장 경로** — 홈에서 오늘 Day 시작 → 첫 종목 무게·반복수 입력 → 세트 체크 → 휴식 타이머 시작 →
   **화면을 끄고** 종료 알림이 오는지 → 세션 마감.
2. **기록이 남는가** — 앱을 완전히 종료하고 다시 열어 그 세션이 그대로 있는지.
3. **테마** — 설정에서 라이트/다크/시스템을 바꿔 가며 홈·세션·설정 **각각 스크린샷**.
4. **입력** — 메모 칸에서 키보드가 가리지 않는지, 숫자 패드가 뜨는지.

MCP로 하는 일: `앱 실행 → 화면 요소 목록 → 탭/입력 → 스크린샷`. **좌표로 찍지 말고 요소로 찾는다**
(기기 해상도가 바뀌면 좌표는 거짓말한다).

## 3. 증거

- 스크린샷은 `docs/screenshots/<버전>/device/<장면>-<light|dark>.png`.
- 알림·소리·햅틱처럼 **스크린샷에 안 남는 것**은 "사람이 확인할 것"으로 PR에 넘긴다.
  Claude는 그것을 "확인했다"고 적지 않는다.
- 보고는 `verify` 스킬 6절 형식에 아래 두 줄을 더한다.

```
기기: iPhone <모델> / iOS <버전> / 개발 클라이언트(로컬 Xcode, 서명 만료 <YYYY-MM-DD>) / JS <커밋 8자리>
사람이 볼 것: <알림 소리, 햅틱 세기, 역광 가독성처럼 기계가 못 보는 것>
```

## 4. 안 되는 것 (알고 쓰자)

- 기기가 잠기면 MCP가 화면을 못 읽는다. 자동 잠금을 길게 둔다.
- 푸시 알림 **수신 소리**와 햅틱은 기기 안에서만 확인된다. 스크린샷에 안 남는다.
- CI에서는 이 스킬을 못 돌린다. 기기 검증은 **맥북이 켜져 있고 폰이 꽂혀 있을 때만** 하는 수동 관문이다.
