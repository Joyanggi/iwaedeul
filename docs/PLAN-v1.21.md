# PLAN v1.21 — 남은 화면 전부를 Astryx 테마 한 벌로, legacy CSS 삭제, 첫 화면 코드 분할 (SS)

> 작성: Claude Opus 5.5 (설계자), 2026-11-17. 대상 코드: v1.20.0 (`main` `d059ff7`).
> 근거: 이슈 #52 (구조 변경). v1.20(`docs/PLAN-v1.20.md`, `docs/DEV-RECORD-v1.20.md` "v1.20 전체 정리"의 남은 화면 표)을 이어받는다. 기준 문서는 `docs/DESIGN.md` 9절.
>
> **성격:** 화면과 CSS·번들 구성만 바꾼다. 저장 구조(Dexie 3, 백업 `SCHEMA_VERSION` 3)·판정·내보내기는 바꾸지 않는다. `src/db/`·`src/store/`와 `src/lib/`의 판정 파일은 고치지 않는다(`src/lib`에서 고치는 것은 `chartTheme.ts` 한 파일과 테스트뿐 — SS5).
> **범위:** (1) 첫 화면 코드 분할 (2) 식단·기록·분석·설정·온보딩 화면과 그 시트·패널 21개 파일을 Astryx 부품으로 (3) 그 뒤 `global.css`·`motion.css`·`space.css`·`index.css`·`SheetFrame`·Astryx 섬(`ax-scope`)을 지운다.
> **v1.20에서 이어받는 결정:** 테마 Neutral + 파랑 강조, 불투명 표면, 여백은 관계로 잰다(`안쪽 대칭`·`같은 역할`·`가까움 순서`), 한글은 단어 사이에서만 꺾는다(375 폭), 경고색은 계산값으로 잰다, 안쪽 폭 넘침을 잰다, 새 검사는 예외·0개를 통과로 삼키지 않는다. 이 PLAN은 이것들을 다시 정하지 않고 남은 화면에 건다.
> **사람이 정할 것은 없다**(이슈 #52: "식단·기록·분석의 배치 갈림길은 설계자가 추천안으로 정하고 PR에서 사람이 본다"). 설계자가 정한 배치는 끝의 "알려 둘 것"에 모았다.
> **개정 1:** 2026-11-17, SS0 리뷰(`.reports/review-SS0.md` "SS1 전에 정할 것")를 반영했다(작성: Claude Opus 5.5, 설계자). "작업 커밋마다 `after --check` 종료 코드 0"과 "전부터 있던 실패로 넘기는 칸 없음"이 SS1~SS4에서 같이 지켜질 수 없었다 — 새 장면이 처음 드러낸 legacy 칸 실패 셋을 SS5·SS6이 고치기 때문이다. **이름 붙은 그 세 칸만 상세 글자까지 같을 때 `알려진 실패`로 두고, 목록은 줄기만 한다**(SS0 보강 — `KNOWN_FAILURES`). 바뀐 곳: SS0 설계·검증, SS1·SS5·SS6 검증, SS8 검사 도구, 관례의 `ui-check` 종료 코드, 결함 복원 ㉔㉕, 끝의 "검토 반영 기록 — 개정 1". 다른 내용·범위는 그대로다.
> **개정 2:** 2026-11-18, SS4 리뷰(`.reports/review-SS4.md` 3절)의 사람 결정을 반영했다(작성: Claude Opus 5.5, 설계자). **달력 칸의 보이는 글자는 `17일`(날짜+일), 접근성 이름은 `{d}일 …`** — 보이는 글자가 이름 안에 낱말로 들어 있어야 axe `label-content-name-mismatch`가 통과한다(숫자만 보이면 낱말 `17`이 이름에 없어 칸마다 위반). 바뀐 곳: SS4 설계(`.ax-cal-cell`·달력·칸 이름 줄), 화면 검증 SS4 줄, 결함 복원 ⑫, 사람이 볼 화면 변화 표, "알려 둘 것"의 접근성 이름 줄, 끝의 "검토 반영 기록 — 개정 2". 다른 내용·범위는 그대로다.

---

## 이슈 끝 기준과 작업

| 끝 기준 (이슈 #52) | 이 PLAN에서 |
|---|---|
| 1. 모든 화면이 `src/ax`의 Astryx 부품과 테마 한 벌로, `global.css`와 legacy 레이어(`motion.css`·`space.css` 사본 포함)가 없어진다 | SS2~SS7이 화면을 옮기고, 옮길 때마다 그 화면만 쓰던 `global.css` 규칙을 지운다. SS8이 남은 CSS 파일 넷·`SheetFrame`·`ax-scope` 섬·legacy 레이어를 지운다 |
| 2. 기록·판정·내보내기·가져오기·백업 결과와 세트 하나를 적는 탭 수는 그대로 | "과거 판정 불변" + 작업마다의 탭 수 표. 세션 화면은 안 고친다(SS1이 읽는 시점만 바꾼다) |
| 3. `astryx-inventory --check`의 숫자가 작업마다 줄어 0이 된다 | 아래 표의 "숫자" 칸. SS0이 "화면이 아닌 파일" 둘을 세는 대상에서 뺀다(이유는 SS0). 화면 파일을 안 고치는 SS0·SS1은 "늘지 않는다"만 성립한다 |
| 4. 첫 화면 코드가 PLAN이 정한 기준 이하로 (지금 gzip 약 474KB) | **기준: 360KB 이하**(gzip, 앱을 처음 열 때 `index.html`이 읽는 JS+CSS). SS1이 줄이고 `npm run check`·CI가 지킨다("확인한 것" 2) |

숫자의 시작값(`docs/ASTRYX-INVENTORY.md`, 2026-11-17 `fe9f1bc`): Astryx를 안 읽는 화면 파일 **23**(SS0 뒤 **21** — `main.tsx`·`icons.tsx`를 뺀다), 인라인 스타일 **51**, legacy 클래스 쓰임 **270**, 안 쓰는 legacy 선택자 **0**.

| ID | 내용 | 화면 변화 | 숫자 (안 읽는 파일 / 인라인 / legacy) |
|---|---|---|---|
| SS0 | 도구·기준선: 남은 화면의 장면을 더하고(필수 장면 — 못 만들면 실패), `before` 스크린샷·배치 기록, 첫 화면 크기 스크립트(기록만), 인벤토리의 "화면이 아닌 파일", 알려진 실패 세 칸(개정 1 — SS5·SS6까지) | 없음 | 23→21(정의) / 51 / 270 |
| SS1 | **첫 화면 코드 분할**: 홈 밖의 화면을 지연 읽기, 시트 부품 지연, 부팅 뒤 미리 읽기. 첫 화면 크기 검사를 `npm run check`·CI에 | 없음(화면을 처음 열 때 잠깐 "불러오는 중"이 보일 수 있다 — SS1) | 그대로 |
| SS2 | 식단 탭: `DietScreen`·`DietDayEditor`·`MealReminderPanel` | 식단 탭, 기록 상세·기록 탭의 그날 식단 | 21→18 / 51→45 / 270→235 |
| SS3 | 식단 시트 넷 + `SheetFrame` 삭제 | 플랜 전환·끼니·단백질원·먹은 것 추가 시트 | 18→13 / 45→38 / 235→194 |
| SS4 | 기록: `HistoryScreen`·`SessionDetailScreen`·`ExerciseHistoryScreen`·`MonthCalendar` | 기록 탭 전부 | 13→9 / 38→30 / 194→125 |
| SS5 | 분석: `AnalyzeScreen` + 차트 색을 Astryx 토큰에서 직접 | 분석 탭 | 9→8 / 30→26 / 125→103 |
| SS6 | 설정: `SettingsScreen` + 패널 일곱(`RoutineListPanel`·`ExportPanel`·`GistPanel`·`ImportPanel`·`RoutineIoPanel`·`DietIoPanel` — `MealReminderPanel`은 SS2) — **배치를 묶음으로 다시 짠다** | 설정 탭 | 8→1 / 26→8 / 103→11 |
| SS7 | 온보딩 | 처음 실행 화면 | 1→0 / 8→5 / 11→0 |
| SS8 | legacy CSS 네 파일·legacy 레이어·`@scope` 경계·`ax-scope` 섬 삭제, 한글 줄바꿈 규칙 하나로, 루틴 편집의 인라인 5, 검사 도구 정리, README·DEV-RECORD·버전 | 없음(같은 모양이어야 한다) | 0 / 5→0 / 0 |

숫자는 인벤토리 표의 파일별 값을 더한 **예상**이다. 구현자는 작업 커밋마다 `--check` 출력을 DEV-RECORD에 복사하고 `--write`한 표를 같은 커밋에 넣는다. 예상과 다르면 이유를 적는다. 넷째 숫자(안 쓰는 legacy 선택자)는 **작업마다 0을 지킨다** — 화면을 옮기면 그 화면만 쓰던 `global.css` 규칙을 같은 커밋에서 지운다(`--check`가 늘면 실패).

---

## 확인한 것

**1. Astryx 0.7.13 부품** (`node_modules/@astryxdesign/core/dist/<부품>/*.d.ts`로 확인. v1.20 "확인한 것" 1에 있는 것은 다시 적지 않는다)

| 부품 | 확인한 사실 | 설계에 미친 것 |
|---|---|---|
| `Calendar` | `value`·`onChange`·`min`·`max`·`hasOutsideDays`·`weekStartsOn`. **날짜 칸에 내용을 넣는 속성이 없다**(render·content 계열 없음) | 기록 달력은 쓰지 않는다 — 칸마다 🔥·세션 수·식단 점이 들어가야 한다. 칸 격자만 직접 짓는다(SS4) |
| `TimeInput` | `label`·`value: ISOTimeString`·`onChange(value \| undefined)`·`presentation('native' \| 'adaptive-native' \| …)`. `'native'`이면 어디서나 OS 시각 고르기 | 먹은 시각 칸. `src/ax`의 새 `TimeField`가 `presentation="native"`·16px 하한·자동완성 억제를 건다(SS2) |
| `TextInput` | `type: 'text' \| 'password' \| 'email' \| 'search' \| 'tel' \| 'url'`, `inputMode`·`onEnter` | Gist 토큰은 `TextField type="password"`(SS6) |
| `CheckboxList`·`CheckboxListItem` | `label`(필수)·`isLabelHidden`·`value: string[]`·`onChange(values)`. 항목은 `value`·`label`·`description`·`endContent` | 식사 알림의 끼니 고르기(SS2) |
| `RadioList`·`RadioListItem` | `label`·`value`·`onChange(value)`, 항목 `value`·`label`·`description` | 끼니 시트의 "어느 쪽이었나요"(비슷한 구성·다른 것·치팅 — 늘 하나가 골라져 있다, SS3) |
| `SegmentedControl`·`SegmentedControlItem` | `value: string`·`onChange`·`label`(필수), 항목 `value`·`label` | 늘 하나가 골라져 있는 자리: 기록의 달력/종목별, 분석의 지표, 설정의 Phase·소리 크기·음악·이완 초·준비 시간, 내보내기 기간 |
| `Switch` | `label`·`value: boolean`·`onChange(checked)` | 켜고 끄기 하나인 자리: 템포 가이드 사용(SS6) |
| `ScrollableArea` | `axis: 'inline' \| 'block' \| 'both'`·`label`·`height`·`maxWidth` | 분석의 종목 고르기 줄(가로), 먹은 것 추가 시트의 음식 목록(세로) |
| `CodeBlock` | `code`·`isWrapped`·`maxHeight`·`hasCopyButton` | 내보내기의 Markdown 미리보기(SS6) |
| `Link` | `href`·`isExternalLink`·`children` | Gist의 "GitHub에서 토큰 발급하기 ↗"(SS6) |
| `Button` | `children`을 받는다. `children`이 있으면 `label`이 접근성 이름이 된다(`Button.d.ts:123`). `aria-label`은 그대로 넘긴다(`ExerciseCard.tsx:590`이 이미 쓴다) | 달력 칸은 `Button variant="ghost"` + 자식(날짜·🔥·점)으로(SS4) |
| `ToggleButton` | `label`·`isPressed`·`onPressedChange`·`icon`·`pressedIcon`·`isIconOnly` | 식단 품목 체크, 끼니의 "전부 먹음" 원형 버튼(SS2) |
| `List` | `density('compact' \| 'balanced' \| 'spacious')`·`hasDividers`·`edge('padded' \| 'flush' \| 'outset' \| 'bleed')`·`listStyle` | 온보딩의 단계 목록(`listStyle="decimal"`) |
| `Text`의 색 이름 | `primary`·`secondary`·`disabled`·`placeholder`·`accent`·`inherit`뿐(`Text/index.d.ts` `TextColorMap`). 경고·오류·성공이 없다 | v1.20의 `ax-text-warning`(세 겹 클래스) 방식을 `ax-text-error`·`ax-text-success`로 넓힌다(SS2) |
| `Icon`의 이름 | `chevronLeft`·`chevronRight`·`chevronDown`·`check`·`calendar`·`clock`·`close`·`copy`·`error` 등 UI 아이콘. **불꽃·식기·차트·톱니·저울은 없다** | `icons.tsx`(탭·카드의 그림 일곱)는 그대로 둔다 — SS0의 "화면이 아닌 파일" |
| `@astryxdesign/core/astryx.css` | 부품 전부의 CSS가 한 파일(281KB, gzip 44KB). 부품 단위로 나눌 수 없다 | 첫 화면 CSS는 이것보다 작아질 수 없다. 줄일 수 있는 것은 legacy CSS(gzip 약 9KB)뿐 |

**2. 첫 화면 코드** (`npm run build`, v1.20.0, 2026-11-17. 실험은 스크래치 폴더의 복사본에서 했다 — 앱 코드가 아니다)

`vite build`의 gzip은 node `zlib.gzipSync`의 기본값과 같다(`index-CHnxlm00.js` 423.91 = 423.91, `index-*.css` 49.98 = 49.98 — 직접 돌려 확인). 그래서 SS0의 스크립트가 같은 숫자를 낸다.

| 실험 | 처음 여는 순간 읽는 것 (gzip) | 메인 청크에서 빠진 것 |
|---|---|---|
| 지금 | JS 423.91 + CSS 49.98 = **약 474KB** (`index.html`이 읽는 것은 이 둘뿐 — `modulepreload` 없음) | — |
| E1: 식단·기록·설정·온보딩을 `React.lazy` | JS 397.08 + 49.98 = 약 447KB | 화면 코드 −27KB |
| E2: E1 + 세션·요약도 `lazy` | JS 351.50 + 49.98 = 약 401KB | 세션·운동 카드 −46KB (Astryx 공유 청크 31.5KB가 따로 생긴다) |
| **E3: E2 + `Sheet`가 `BottomSheet`를 `lazy`로** | JS **303.33** + 49.98 = **약 353KB** | 시트 −48KB(`BottomSheet` 청크 35.6 + 끌기 청크 15.6) |

E3 뒤 메인 청크(927KB, 소스맵으로 나눔): `react-dom` 22.7%, `dexie` 10.5%, Astryx `theme` 9.1%·`utils` 5.1%·`motion` 4.4%·`Layer` 4.3%, `theme-neutral` 3.7%. 이것들은 홈이 쓰거나 앱 뿌리가 쓴다 — 더 줄이려면 라이브러리를 바꿔야 하고 이 PLAN 밖이다. `NumberInput`·`TextArea`·`Field`(약 35KB, gzip 약 11KB)는 홈이 안 쓰지만 `src/ax/index.tsx`의 `Stepper`·`TextField`가 정적으로 읽어 메인에 남는다 — 범위 제외(SS1).

**기준 360KB의 근거:** E3의 353KB에 옮기는 작업이 `parts.css`·`src/ax`에 더하는 몫(작업마다 1KB 안팎)의 여유를 둔 값이다. SS8이 legacy CSS를 지우면 약 345KB가 된다(예상). v1.20 PLAN의 위쪽 한계 449KB보다 낮고, v1.19(약 190KB)보다는 높다 — 차이는 React·Dexie 위에 Astryx 테마·움직임 코드가 얹힌 몫이다.

**3. 화면 마크업에 묶인 스캔 테스트** (`src/lib/*.test.ts`·`scripts/*.test.mjs`가 옮길 파일을 글자로 읽는 곳. 로직 줄을 보는 것 — `mutateDietDay(…seedVariantChoices…)`, `variantChoicesFor(…todayVariantChoices(day))`, `pickDate`가 `setDetailId`를 안 부름, `A_ECCENTRIC_OPTIONS.map`, `previewTempoTones(`, `planDiffText(`, `logEntryText(`, `decimals={2}`, `userFoods=` — 은 코드 쪽에서 그대로 두면 통과한다)

| 테스트 | 묶인 글자 | 처리 |
|---|---|---|
| `uiConsistency.test.ts:39-45` (X6) | `이 날 식단 기록 지우기`·`이 세션 삭제` 앞 260자 안에 `btn-danger` | SS2·SS4: **옮긴다** — `/btn-danger\|variant="destructive"/`(v116 NN2·NN3이 이미 쓰는 꼴) |
| `uiConsistency.test.ts:117-128` | `MonthCalendar.tsx`에 `cal-diet-dot-${dietDot}`, `cal-cell-diet-` 없음 | SS4: **옮긴다** — `data-diet={dietDot}`(점 하나가 판정된 날·보류된 날을 다 그린다는 뜻 그대로). "판정·보류가 같은 경로"(`hasDiet ? diet : dietPartial ? 'partial' : null`)는 안 고치고 통과 |
| `uiConsistency.test.ts:130-139` | `typeof css['/src/styles/global.css'] === 'string'` | SS8: **옮긴다** — `/src/ax/parts.css`로(뜻: "vitest에서 CSS는 빈 문자열이라 색은 브라우저로 잰다"는 사실을 남긴다) |
| `polish.test.ts:103-106` (BB5) | `SettingsScreen.tsx`의 `<p className="screen-sub">v{__APP_VERSION__}</p>` | SS6: **옮긴다** — 버전을 그리는 `Text` 태그 안의 글이 `v{__APP_VERSION__}`인가 |
| `v116.test.ts:1046-1048` (NN2) | `편집\s*<\/button>` 앞 400자 안에 `disabled` | SS6: **옮긴다** — `label="편집"`이 있는 `<Button` 태그 안에 `isDisabled` |
| `v116.test.ts:1243-1247` (NN4) | `RoutineListPanel.tsx`의 `kind: 'delete' })` 앞 200자 안에 `btn-danger` | SS6: **옮긴다** — `/btn-danger\|variant="destructive"/` |
| `v120.test.ts:211-217` (RRM 보완) | `FoodLogSheet`의 `className="diet-item"` 버튼에 `aria-label` 없음 | SS3: **옮긴다** — 음식 줄(`ListItem`)에 `aria-label`이 없다(보이는 글자가 이름이다) |
| `v120.test.ts:795` (RR7) | `DietDayEditor.tsx`에 `isProminent`·`ax-scope` 없음 | SS2: **옮긴다** — `isProminent`만 본다(SS2가 편집기 맨 바깥에 `ax-scope`를 단다 — 기록 화면이 아직 legacy라서. SS8이 다시 뗀다) |
| `v120.test.ts:903-904`, `v119.test.ts:45-90` | legacy 시트가 정확히 `DietPlanSheet`·`DietSlotSheet`·`DietVariantSheet`·`FoodLogSheet` 넷이고 `SheetFrame`을 쓴다, `SheetFrame.tsx`가 `../ax`를 안 읽는다 | SS3: **옮긴다** — "`components/*Sheet.tsx` 전부가 `../ax`의 `Sheet`를 쓰고 `SheetFrame.tsx`가 없다"(시트 껍데기가 하나라는 뜻 그대로) |
| `v119.test.ts:111`·`:171` | `space.css`의 `layer(legacy)` import와 유틸 클래스 일곱 | SS8: **옮긴다** — `src/styles`가 없고 `.tsx`에 `mt-`·`mb-`·`ml-`·`mr-` 클래스가 없다 |
| `v117.test.ts:95-104` | `main.tsx`가 `./styles/index.css`를 읽는다 | SS8: **뜻이 바뀐다** — "`main.tsx`는 CSS를 읽지 않는다. 앱 CSS는 `src/ax`가 읽는다". 나머지 줄(Astryx 직접 안 읽음, App은 `./ax`의 `AppRoot`)은 그대로 |
| `v117.test.ts:151-153` | App이 `lazy(() => import('./screens/RoutineEditorScreen'))` | SS1: 안 고치고 통과(그 글자를 그대로 둔다 — 루틴 편집·분석은 `LOADERS`에 넣지 않는다, SS1 설계) |
| `scripts/check.test.mjs:15-17` | `STEPS` 중 `slow`인 명령이 `['npm run build']` 하나 | SS1: **옮긴다** — `['npm run build', 'node scripts/first-load.mjs --check']`(뜻: "`--fast`는 `dist`가 있어야 도는 단계만 뺀다". 이름도 `빌드와 첫 화면 크기만 --fast에서 빠진다`로) |
| `v120.test.ts:389-395` (RR3) | `App.tsx`에 `<Spinner />` | SS2: **옮긴다** — `Loading`이 `src/ax/index.tsx`로 가므로 `<Spinner />`는 `src/ax/index.tsx`의 `export function Loading(` 본문에서 본다. 같은 테스트의 나머지 줄(`<Loading text="…" />` 둘, `Banner status="error"`, IndexedDB 문구)은 `App.tsx`에서 그대로 통과 |
| `scripts/ui-space.test.mjs:44` (RR12) | `home-resume`·`home-safe`·`settings`의 `EXPECTED_PAIRS`가 `['bar', 'tab-indicator', 'tab-content']` | SS6: **옮긴다** — 그 줄의 목록에서 `settings`를 빼고(홈 둘은 그대로), `settings`는 SS6이 정한 쌍(SS6 검증)을 `toEqual`로 따로 단언한다(RR4가 홈에 한 꼴) |
| `scripts/legacy-scope.test.mjs`·`rr3`·`rr7`·`rr8`·`rr10.test.mjs` | `global.css`·`motion.css`·`space.css`를 읽어 "X가 없다"·"Y가 남는다" | SS8: 파일이 없으면 `readFileSync`가 던진다(빈 통과가 아니다). **옮긴다** — "없다" 검사는 "`src/styles`가 없다" 하나로 모으고, "남는다" 검사(옮긴 화면이 쓰는 규칙)는 `parts.css`에 그 규칙이 있는지로. 테스트 이름·전·후를 DEV-RECORD "옮긴 스캔" 표에 |

**4. 검사 도구가 legacy에 묶인 곳** (`scripts/`를 읽어 확인. 그대로 두면 화면을 옮긴 커밋에서 검사가 **아무것도 안 재고 지나가거나** SS8에서 던진다)

| 어디 | 묶인 것 | 그대로 두면 | 처리 |
|---|---|---|---|
| `scripts/ui-check.mjs:544-550` `optional()` | 장면 준비가 던지면 `장면 건너뜀`을 찍고 **지나간다** — `history-detail`·`sheet-food`·`diet-log-open`·`settings-open`·`settings-routines`가 이걸 쓴다 | 화면을 옮겨 선택자가 안 맞으면 그 장면이 조용히 빠지고 종료 코드는 0 | SS0: 남은 화면의 장면은 전부 `requiredScene`(준비가 던지면 그 장면의 모든 칸이 실패)으로. `optional`은 쓰는 곳이 0이 되면 지운다 |
| `ui-check.mjs:1584`·`:1619`·`:1654`·`:1411` | `button.row`·`button.diet-item`·`.btn-row`·`.card` | SS2·SS4에서 0개를 고르고 던진다(→ `requiredScene`이면 실패) | 그 작업에서 역할·이름(`getByRole`)으로 |
| `scripts/lib/ui-check-lib.mjs:262-293` `줄 안 버튼` | `.row > .btn`과 `global.css`의 그 규칙 | SS6에서 0개 → 실패 | SS6: "카드 안 줄(`Row`)의 오른쪽 칸 안 버튼"으로 바꾼다(폭이 줄의 절반 미만, 한 줄). 0개면 실패는 그대로 |
| `ui-check-lib.mjs:213` `눌림 반응`, `:388-416` 움직임 정적 검사 | legacy 버튼만 잰다, `motion.css`를 읽는다 | SS8 뒤 대상이 늘 0개(`건너뜀`), `motion.css 있음` 실패 | SS8: 둘 다 지운다. 옮긴 화면의 눌림은 Astryx 부품의 것이고 `--press-shot`이 사진으로 본다 |
| `ui-check-lib.mjs:499-505` `섬 버튼` | legacy 뿌리 목록 안의 Astryx 버튼 | SS8 뒤 섬이 없다 | SS8: 지운다 |
| `scripts/lib/ui-space.mjs:9-47` 정적 검사, `:71-90` legacy `.card`·`.screen` | `global.css`·`space.css`를 읽는다, 카드 사이에 legacy `.card`를 섞어 잰다 | SS8에서 `global.css 있음` 실패 | SS8: 정적 검사는 지우고, 재는 쪽은 `.ax-screen`·`.ax-group`·`.astryx-card`만. `같은 역할`의 장면 목록에 옮긴 화면 전부 |
| `ui-check-lib.mjs:11`·`:251` | `SHEET_SELECTOR = '.sheet, .astryx-bottom-sheet'`, `.sheet-backdrop` | SS3 뒤 `.sheet`가 없다 | SS3: `.astryx-bottom-sheet`만 |
| `scripts/astryx-inventory.mjs:28` | `global.css`를 읽어 legacy 클래스 집합을 만든다 | SS8에서 던진다 | SS8: 정의를 바꾼다(SS8 절) |
| `ui-check.mjs:126` `SYMMETRY_JUDGED`, `EXPECTED_PAIRS`, `같은 역할`의 장면 목록 | 옮긴 화면만 판정 | 옮긴 화면을 더하지 않으면 "기록만"으로 지나간다 | 작업마다 그 화면의 장면을 더한다(각 작업 "검증") |

**5. v1.20에서 배운 것 — 이 PLAN이 처음부터 거는 것** (DEV-RECORD-v1.20의 RR5·RR7·RR8·RR9 절)

| 배운 것 | 근거 | 이 PLAN의 규칙 |
|---|---|---|
| `ListItem`은 줄마다 위·아래 안쪽 여백(8px)이 있어 카드 안 마지막 줄이면 카드 아래가 위보다 넓어진다 | RR9: `안쪽 대칭` 실측 위 15·아래 24 | 카드 **안**의 줄은 `Row`(SS4가 `SummaryScreen.tsx`에서 `src/ax`로 옮긴다). **눌러서 들어가는 줄**은 줄마다 `ClickableCard` 한 장(카드 자체가 누르는 면 — 위·아래가 카드 안쪽 여백 하나다). 시트 안 목록은 지금처럼 `List`/`ListItem`(시트는 좌·우만 판정) |
| 한글은 음절 단위로 꺾여 375 폭에서 `기/록`·`0/점`이 난다. `Text`의 `wordBreak`가 `keep-all`을 못 받는다 | RR5·RR7·RR9: 시트 이름·`ax-summary`·`ax-tip`으로 좁힌 규칙이 셋 | 옮긴 화면마다 흐름 `<장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`을 둔다. 규칙은 그 화면 틀에 건다(`Groups className`). SS8이 흩어진 규칙을 앱 전체 한 규칙으로 모은다 |
| 줄 오른쪽 값(`0점`·`60 → 20kg`)이 접힌다 | RR9 반려 | `Row`의 오른쪽은 `StackItem size="static"`(그대로 옮긴다) |
| 경고색은 클래스가 붙었는지가 아니라 **계산된 색**이 토큰과 같은지 잰다(`Text`의 색 규칙이 클래스 하나를 이긴다) | RR8 반려 | 오류·성공 글자도 같은 흐름(`inPageToneColor`)으로 다크·라이트 둘 다 |
| 문서 폭만 보면 카드 안에서 삐져나온 것을 못 잡는다 | RR9 유산소 줄 503px | `inPageInnerOverflow`를 옮긴 화면의 장면 전부에 |
| 흐름이 던지면 사라지고, 0개를 재면 통과한다 | RR8·RR9 반려 | 새 흐름은 전부 `guardedFlow`, 장면 준비는 `requiredScene`, 대상 0개는 `ok: false`. 시드는 `finally`에서 지운다 |
| 기록·편집 화면의 Astryx 부품이 legacy 화면 안에 있으면 legacy의 맨 요소 규칙(`button` 44px 등)을 막아야 한다 | RR7: `ExerciseCard`·`NumberStepper`의 `ax-scope` | 옮긴 부품이 아직 legacy 화면 안에 놓이는 동안(SS2의 `DietDayEditor`) 맨 바깥에 `ax-scope`. SS8이 전부 뗀다 |

**6. 남은 화면의 지금 모습** (코드로 확인)

| 화면 | 지금 (위에서 아래로) | 손으로 짠 것 |
|---|---|---|
| 식단 탭 (`DietScreen.tsx:28-48`, `DietDayEditor.tsx:132-468`) | 제목 → 요약 카드(플랜 버튼 `{플랜} ▾`, 단백질 큰 숫자 `n/목표g`, 막대, kcal·상태, 먹은 것 건수) → 연속 저칼로리 경고 → 끼니 카드 ×5(이름·시간·`대체·안 먹음 ▸` / 원형 "전부 먹음" / 품목 체크 ☐☑ + `바꾸기 ▾` / 안 먹음·대체·추가 메모) → 먹은 것(시간별, 줄을 누르면 시각·개수·삭제) → 메모 → 위험 구역 → 식사 알림(끼니 고르기, 캘린더로 내보내기) | 막대 너비 인라인 `style`, 경고 배너 인라인, 시각 입력 `<input type="time">`, 위험 문구 `color: var(--danger)` |
| 식단 시트 넷 | 플랜 전환(플랜 목록 ✓, "내일부터 ○○" → 1~3일), 끼니(전부 먹음·대체·추가·안 먹음·기록 지우기 / 입력 + 세 갈래), 단백질원(변형 목록 ✓), 먹은 것 추가(시각·검색·음식 목록·새 음식 등록 폼·목록에서 삭제) | `SheetFrame`(손으로 짠 막·시트·닫힘 움직임), 인라인 `whiteSpace`·`flex`·`maxHeight` |
| 기록 탭 (`HistoryScreen.tsx:51-188`) | 제목 → 달력/종목별 → 달력 카드(‹ 월 ›, 요일, 칸: 날짜·🔥·세션 수·식단 점) → 식단 범례 → 세션 목록 카드(머리: 날짜 또는 "이 달의 세션" + 전체 보기 / n회) → 고른 날의 식단 편집기 | 세션 줄 `button.row`, 볼륨 단위 `fontSize: 11` 인라인 |
| 기록 상세 (`SessionDetailScreen.tsx:68-355`) | ‹ 기록 → 제목·날짜·시각·복귀/디로드 → 숫자 셋 → 운동 카드(이미 Astryx) / Day에 없는 종목 카드 → 유산소(종류 알약, 분·강도) → 메모 → Day 변경(2단계) → 위험 구역 → 그 날짜 식단 → 기록으로 | `ex-card-orphan`(legacy 운동 카드 모양 흉내), `warn-box` |
| 종목별 (`ExerciseHistoryScreen.tsx`) | 종목 목록 카드(이름·Day·그룹·현재 루틴에 없음·기록 키, n회 ▸) → 한 종목: ‹ 종목 목록, 요약 카드, 메모 이력, 세션 히스토리(최고 뱃지·볼륨) | `color: var(--warn)`·`fontSize: 11` 인라인 |
| 분석 (`AnalyzeScreen.tsx:116-346`) | 제목·부제 → ① 종목별 추이(종목 알약 가로 스크롤, 지표 셋, 선 차트, 최근 값, B그룹 경고, 감량기 안내) → ② 감각 점수 점(종목마다 12주) → ③ 주간 수행 횟수 막대 차트 → ④ 대체 수행 | 점의 색·투명도 인라인, 알약 안 흐린 글자 `opacity` 인라인 |
| 설정 (`SettingsScreen.tsx:88-512`) | 제목·버전 → 시드 문제 → Phase → 활성 루틴(Day 펼침) → 루틴 목록 → 내보내기 → Gist → 가져오기 → 소리 크기(+음악 덕킹) → 템포 가이드(+이완 초·준비 시간) → 루틴 JSON → 식단 플랜 JSON → 진단 → 위험 구역. **카드 14장이 한 줄로 이어져 묶음이 없다** | 인라인 7(`whiteSpace`·`borderBottom`·`fontSize: 14`·색) |
| 온보딩 (`Onboarding.tsx`) | 제목·소개 → (홈 화면 앱) 준비 완료 카드 / (Safari) 1단계 목록·경고·주소 → 시작 버튼·안내 | `.onboarding` 뿌리, 인라인 3 |

---

## 뒤집는 README 결정 (사람이 볼 목록)

전부 `docs/DESIGN.md` 9.2절 표가 승인한 것이다. 문장은 각 작업의 "README 반영"에 있다.

| # | README의 지금 결정 (`README.md` 줄) | 바뀌는 방향 | 작업 |
|---|---|---|---|
| 1 | Astryx 테마는 앱 뿌리에 한 번 걸고, **안 옮긴 화면의 CSS는 범위를 가둔다** (248-255) | 안 옮긴 화면이 없다. 앱 CSS는 `src/ax`의 두 파일(`ax.css`·`parts.css`)뿐이고 legacy 레이어·`@scope` 경계가 없다 | SS8 |
| 2 | 눌림·움직임은 `motion.css`가 정하는 사본 (256-264) | 사본이 없다. 눌림·시트 움직임은 Astryx 부품의 것 | SS8 |
| 3 | 여백은 `space.css`의 역할 토큰 한 벌 (265-271) | `space.css`가 없다. 여백 역할은 `src/ax`의 `Groups`·`Group`·`Card`가 정한다 | SS8 |

뒤집지 **않는** 것: "recharts는 분석 탭만 지연 로딩한다"(239-246)의 뜻 — 헬스장 경로(홈 → 세션)가 차트 코드를 파싱하지 않고, 서비스워커가 청크를 전부 precache해 오프라인에서 열린다 — 은 그대로다. SS1이 지연 읽는 화면을 늘리면서 항목의 제목과 문장을 넓힌다(SS1 "README 반영"). 휴식 타이머의 종료 시각 저장·단일 소유(App), 서비스워커 수동 업데이트, AudioContext 미리 열기, 스테퍼의 "뗄 때 1스텝", 입력 즉시 저장, 자동완성 억제 한 곳(`NO_AUTOFILL`)도 그대로다.

---

## SS0. 도구와 기준선

### 진단

- 남은 화면 가운데 장면이 없는 상태가 많다: 식단 시트 셋(플랜·끼니·단백질원)과 먹은 것 추가의 등록 폼, 종목별 기록, 기록 상세의 아래쪽, 분석의 아래쪽, 설정의 Gist 연결 상태, 온보딩은 `ui-check`가 한 장도 안 찍는다("확인한 것" 4의 장면 목록 — `grep "'(history|analyze|diet|settings|sheet-food|onboarding)"`).
- 있는 장면 다섯은 `optional()`이라 준비가 실패하면 조용히 빠진다("확인한 것" 4 첫 줄).
- 첫 화면 크기를 재는 장치가 없다. `first-screen.mjs`는 시간을 재고(흔들린다 — 판정 못 한다) 크기는 `vite build` 출력을 눈으로 본다.
- 인벤토리가 `main.tsx`(진입점)와 `icons.tsx`(SVG 그림 일곱)를 "Astryx를 안 읽는 화면 파일"로 세서, 끝 기준 3의 "0"에 닿을 수 없다. 둘 다 화면이 아니고, 그림은 Astryx `Icon`에 같은 것이 없다("확인한 것" 1).

### 설계

| 무엇 | 어떻게 |
|---|---|
| `scripts/ui-check.mjs` — 필수 장면 | `requiredScene(name, fn)`: `fn`이 던지면 그 장면을 `장면 실패`로 표에 넣고(칸 전부 실패, 상세에 예외 첫 줄) 종료 코드 1. `history-detail`·`sheet-food`·`diet-log-open`·`settings-open`·`settings-routines`를 `optional`에서 옮긴다. 새 장면은 전부 `requiredScene`. 쓰는 곳이 남지 않으면 `optional`을 지운다 |
| 새 장면 (다크·라이트 두 벌) | 식단: `diet-end`(끝까지), `diet-375`, `diet-streak`(줄인 플랜 4일 연속 — 시드), `sheet-diet-plan`, `sheet-diet-plan-ahead`("내일부터" 누른 상태), `sheet-diet-slot`, `sheet-diet-slot-edit`("대체했어요" 누른 상태), `sheet-diet-variant`, `sheet-food-new`(새 음식 등록 폼). 기록: `history-375`, `history-day`(세션 있는 날을 고른 상태 — 세션 줄 + 그날 식단), `history-exercise`(종목별 목록), `history-exercise-detail`(한 종목, 메모 이력 있음), `history-detail-end`(끝까지), `history-detail-change`(Day 변경의 재매핑 표가 보이는 상태). 분석: `analyze-end`, `analyze-375`, `analyze-empty`(기록 0 — 새 프로필). 설정: `settings-gist`(토큰이 저장된 상태 — `localStorage`에 가짜 토큰을 넣고 네트워크는 부르지 않는다), `settings-export-preview`(미리보기 펼침), `settings-reset-confirm`(초기화 확인 상태). 온보딩: `onboarding`(Safari 탭), `onboarding-375`, `onboarding-standalone`(`matchMedia('(display-mode: standalone)')`를 참으로 — `addInitScript`). 시드는 그 장면의 `finally`에서 지운다 |
| `before` | `node scripts/ui-check.mjs before --ver=v1.21`로 `docs/screenshots/v1.21/before/`에 찍고 `layout.json`(배치 기록)을 남긴다. `node scripts/argos-upload.mjs before` |
| 새 파일 `scripts/first-load.mjs` | 사용: `npm run build && node scripts/first-load.mjs [--check]`. `dist/index.html`에서 `<script type="module" src>`·`<link rel="modulepreload" href>`·`<link rel="stylesheet" href>`를 모아(같은 파일은 한 번) 파일마다 `zlib.gzipSync`(기본값) 크기를 kB(1000)로 찍고 합을 낸다. `--check`이면 합이 `FIRST_LOAD_BUDGET_KB`(이 파일의 상수, **360**)를 넘을 때 종료 코드 1. `dist/index.html`이 없거나, 스크립트 태그가 0개거나, 적힌 파일이 없으면 **종료 코드 1**(빈 통과 없음). 모으는 부분은 `scripts/lib/first-load-lib.mjs`의 순수 함수 `collectFirstLoad(html)` → `string[]`. SS0에서는 `--check`를 안 쓴다(지금 474KB라 실패한다) |
| `scripts/astryx-inventory.mjs` — 화면이 아닌 파일 | `NOT_SCREENS = { 'src/main.tsx': '진입점 — 화면을 그리지 않는다', 'src/components/icons.tsx': '앱의 SVG 그림(불꽃·식기·달력·차트·톱니·조절·저울) — Astryx Icon에 같은 그림이 없다(PLAN v1.21 확인한 것 1)' }`. 이 둘은 표에 그대로 남기되 "Astryx" 칸에 `제외`라 적고 첫째 숫자에서 뺀다. 이 파일들에 인라인·legacy 클래스가 생기면 둘째·셋째 숫자에는 그대로 센다. `--write`로 표를 다시 쓴다 |
| `scripts/lib/ui-check-lib.mjs` — 알려진 실패 (개정 1) | `export const KNOWN_FAILURES = [{ scene, column, detail, until }]` **세 항목뿐**: `analyze-empty`·`여백 격자`·`SS5`, `settings-export-preview`·`접근성`·`SS6`, `settings-export-preview`·`눌림 반응`·`SS6`. `detail`은 SS0 `before --check` 출력 "상세"의 그 줄에서 `- 실패 <장면> · <칸>: ` 뒤 글자 **그대로**(DEV-RECORD SS0 표의 세 칸). 순수 함수 `applyKnownFailures(rows, known)` → `{ rows, known: n, stale: [{ scene, column, until }] }`: `상태 '실패'`이고 `(행 이름, 칸, 상세)`가 항목과 **글자까지 같은** 칸만 `상태 '알려진 실패'`로 바꾼다(상세는 그대로). 같은 칸이라도 상세가 다르면(다른 접근성 규칙이 더해졌다, 여백 값이 바뀌었다, `장면 실패`의 예외 줄) `실패` 그대로다. 행은 있는데 그 칸이 `실패`가 아닌 항목은 `stale`. 행이 없는 항목(`--only`로 거른 장면)은 둘 다 아니다. `ui-check.mjs`의 `printResults`가 `phase === 'after'`에서만 부른다: `알려진 실패`는 세지 않고 `- 알려진 실패 <장면> · <칸>: <상세> (<until>이 고친다)`와 합계 줄 `알려진 실패 N건`을 찍는다. `stale`은 하나마다 `- 실패 <장면> · <칸>: 알려진 실패가 고쳐졌다 — KNOWN_FAILURES에서 지운다`로 **실패에 센다**(고친 작업이 같은 커밋에서 목록을 줄이게). `before`에는 걸지 않는다 |
| 새 파일 `src/lib/v121.test.ts`, `scripts/ss0.test.mjs` | 이 PLAN의 스캔을 모으는 곳 |

> 알려진 실패는 **SS0의 고침 커밋**(리뷰 반려 반영)에 넣는다. SS1이 시작될 때 이미 있어야 한다.

### 검증

- `v121` SS0 (`scripts/ss0.test.mjs`): `ui-check.mjs`에 `requiredScene`이 있고, 위 다섯 장면 이름이 `optional(` 호출 안에 없다. `requiredScene`의 `catch`가 장면 실패를 표에 넣는 갈래를 가진다(글자 스캔).
- `scripts/ss0.test.mjs`: `collectFirstLoad`가 ① 스크립트 하나 + CSS 하나인 HTML에서 둘을 ② 같은 파일을 `script`와 `modulepreload`에 둘 다 적은 HTML에서 한 번만 ③ `nomodule`·`rel="icon"`·`apple-touch-startup-image`는 안 센다. **속성:** 어떤 HTML 조각 배열(fast-check로 태그 섞기)에서도 결과에 중복이 없고, 결과의 모든 항목이 입력에 나온 경로다.
- `scripts/ss0.test.mjs`: `first-load.mjs`가 `dist/index.html` 없음·스크립트 0개·없는 파일에서 종료 코드 1(임시 폴더에 가짜 `dist`를 만들어 `spawnSync`).
- `node scripts/first-load.mjs` 출력(지금 값 — 474KB 안팎)을 DEV-RECORD에. `vite build` 출력의 gzip과 파일마다 같은지 나란히 적는다.
- `astryx-inventory --check`: 첫째 숫자 23 → 21, 나머지 그대로. 표에서 두 파일의 칸이 `제외`.
- `ui-check before --check`: 새 장면이 전부 찍혔다(`장면 실패` 0개). 장면을 준비하는 선택자를 일부러 틀리게 한 결함 복원(⑳)에서 그 장면이 실패하고 종료 코드 1.
- `scripts/ss0.test.mjs` — 알려진 실패(개정 1): `applyKnownFailures`가 ① 세 칸이 항목과 글자까지 같으면 `알려진 실패` 셋, `실패` 0 ② 상세가 한 글자 다르면 `실패` 그대로 ③ 같은 상세가 다른 칸·다른 장면(`-light` 행 포함)에 있으면 `실패` 그대로 ④ 칸이 `통과`인 항목은 `stale` ⑤ 행이 없는 항목은 `stale`도 아니고 바뀐 칸도 없다 ⑥ `장면 실패` 행(칸 전부 `실패`, 상세는 예외 첫 줄)은 하나도 안 바뀐다. **속성:** 어떤 행·항목 배열에서도 (뒤의 `실패` 칸 수 + `알려진 실패` 칸 수) = (앞의 `실패` 칸 수)이고 `실패`가 아니던 칸의 상태는 그대로다(숨기기만 하고 만들지 않는다), 두 번 걸어도 같다. **목록은 늘지 않는다:** `KNOWN_FAILURES`의 `(scene, column)`이 위 세 쌍의 부분집합이고 길이 3 이하.
- `ui-check after --check`(SS0 고침 커밋): 종료 코드 0, 합계 `알려진 실패 3건`. 결함 복원 ㉔.
- 사람 눈: `before` 폴더에 새 장면마다 다크·라이트 두 장.

### 범위 제외

- 첫 화면 **시간**을 판정하지 않는다(v1.20 RR0과 같은 이유 — 흔들린다). `first-screen.mjs`는 그대로 두고 SS1·SS8에서 다시 재 적는다.
- 가져오기·Gist 복원의 "파일을 고른 뒤" 상태: 파일 고르기 창을 흉내 낼 수 없다. 그 상태의 마크업은 SS6의 스캔과 화면 검증의 사진(테스트용 분기 없이 찍을 수 있는 것)으로만 본다. 이유를 DEV-RECORD에.

### README 반영

없음.

---

## SS1. 첫 화면 코드 분할

### 진단

- `App.tsx:11-18`이 식단·기록·온보딩·세션·설정·요약을 **정적으로** 읽는다. 지연 읽는 것은 분석·루틴 편집 둘뿐이다(`:30-31`). 그래서 앱을 처음 여는 순간 모든 화면의 코드를 읽는다 — gzip 약 474KB("확인한 것" 2).
- `src/ax/index.tsx:20`이 `BottomSheet`를 정적으로 읽는다. 시트 코드(끌기·움직임·층 — gzip 약 48KB)가 첫 화면에 들어간다. 홈이 여는 시트 둘(Day 선택·진행 중 세션)도 누르기 전에는 안 쓴다.

### 설계

**지연 읽기 표** (`App.tsx`)

| 화면 | 지금 | 뒤 | 미리 읽기 |
|---|---|---|---|
| 홈 | 정적 | **정적**(첫 화면) | — |
| 세션·요약 | 정적 | `lazy` | 예 |
| 식단·기록·설정·온보딩 | 정적 | `lazy` | 예(온보딩은 아니오 — 처음 한 번뿐) |
| 분석 | `lazy` | 그대로 | **아니오**(헬스장 경로가 차트 코드를 파싱하지 않는다 — README 결정 그대로) |
| 루틴 편집 | `lazy` | 그대로(`lazy(() => import('./screens/RoutineEditorScreen'))` 글자 그대로) | 아니오 |

- 새로 나누는 화면의 읽는 함수는 `App.tsx`의 한 표에 둔다: `const LOADERS = { session: () => import('./screens/SessionScreen'), summary: …, diet: …, history: …, settings: …, onboarding: … } as const`(열쇠 **여섯**), 화면은 `lazy(LOADERS.session)` 꼴. 미리 읽는 목록은 `const PRELOAD = ['session', 'summary', 'diet', 'history', 'settings'] as const` 한 줄.
- **분석·루틴 편집은 `LOADERS`에 넣지 않는다.** 지금의 두 줄(`const AnalyzeScreen = lazy(() => import('./screens/AnalyzeScreen'))`·`const RoutineEditorScreen = lazy(() => import('./screens/RoutineEditorScreen'))`)과 그 위 주석을 한 글자도 안 바꾼다. 미리 읽지 않는 화면이라 표에 있을 까닭이 없고, `v117` OO3이 그 글자를 본다.
- **미리 읽기:** `AppBody`에서 `seed && loaded && onboardingDone`이 처음 참이 된 뒤 `PRELOAD_DELAY_MS`(1000) 뒤에 `PRELOAD`의 함수와 `preloadSheet()`를 한 번씩 부른다(`useEffect` + `setTimeout`, 정리 함수에서 `clearTimeout`). 실패는 삼키지 않고 무시만 한다 — `void p.catch(() => undefined)`: 미리 읽기는 최선일 뿐이고, 실제로 그 화면을 열 때 `lazy`가 다시 읽고 실패를 드러낸다.
- **`Suspense` 자리:** ① 탭 내용 자리 하나(아래 띠 `Bar`는 밖 — 탭을 바꾸는 동안에도 탭바가 보인다) ② 세션·요약·루틴 편집 화면 ③ 온보딩. 대체 화면은 지금의 `Loading`(`Spinner` + "불러오는 중…"). 분석의 "차트를 불러오는 중…"은 그대로.
- **시트 지연** (`src/ax/index.tsx`): `const BottomSheet = lazy(() => import('@astryxdesign/core/BottomSheet').then((m) => ({ default: m.BottomSheet })))`, 타입은 `import type { BottomSheetProps }`. `Sheet`가 `<Suspense fallback={null}>`로 감싼다. `export function preloadSheet()`가 같은 `import()`를 부른다(한 함수 `loadBottomSheet`를 둘이 쓴다). `Sheet`의 닫기(`closing`·`SHEET_CLOSE_MS`·`once`·`clearTimeout`)는 한 줄도 안 바꾼다.
- 세션 화면의 로직, 휴식 타이머의 단일 소유(`useRestTimer()`는 App에), `openSession && bundle && (`, 오디오·동기화 배선은 그대로다.
- `scripts/check.mjs`의 `STEPS`에 `{ name: '첫 화면 크기', cmd: 'node scripts/first-load.mjs --check', slow: true }`를 빌드 **다음**에, `.github/workflows/ci.yml`에도 같은 줄(`scripts/check.test.mjs`가 둘을 견준다). `slow`인 단계가 둘이 되므로 `scripts/check.test.mjs:15-17`의 단언을 같은 커밋에서 옮긴다("확인한 것" 3).

### 검증

- `v121` SS1: `App.tsx`에 `import (SessionScreen|SummaryScreen|DietScreen|HistoryScreen|SettingsScreen|Onboarding) from`이 0건이고 `import HomeScreen from './screens/HomeScreen'`이 있다. `LOADERS`의 열쇠가 여섯(`session`·`summary`·`diet`·`history`·`settings`·`onboarding`)이고 `PRELOAD`에 `onboarding`이 없다. `import('./screens/AnalyzeScreen')`·`import('./screens/RoutineEditorScreen')`이 `App.tsx`에 **각각 한 번**, `lazy(() => ` 바로 뒤에만 나온다(미리 읽기 쪽에서 부르지 않는다).
- 옮긴 스캔: `scripts/check.test.mjs`의 `slow` 단언("확인한 것" 3). `ci.yml`·`STEPS` 같음 단언은 안 고치고 통과.
- `v121` SS1: `src/ax/index.tsx`에 `from '@astryxdesign/core/BottomSheet'`가 `import type` 한 줄뿐이고, `lazy(() => import('@astryxdesign/core/BottomSheet')`가 있고, `preloadSheet`를 내보낸다.
- `v121` SS1: `App.tsx`에서 `<Bar position="bottom">`이 탭 내용의 `<Suspense`보다 뒤에, 그 `Suspense` 밖에 있다(탭바가 대체 화면에 안 가려진다).
- 안 고치고 통과: `timerOwnership.test.ts`, `v117.test.ts`(`lazy(() => import('./screens/RoutineEditorScreen'))`), `v120.test.ts` RR1·RR3(App의 `AppRoot`·`Bar`·`Loading` — `Loading`은 SS1에서는 아직 `App.tsx`에 있다. RR3의 `<Spinner />` 줄은 SS2가 옮긴다), `audioRecovery.test.ts`.
- `npm run build && node scripts/first-load.mjs --check`: **360KB 이하**(E3 실험 약 353KB). 출력을 DEV-RECORD에.
- `node scripts/first-screen.mjs`(캐시 없는 첫 방문·다시 열기 중앙값)를 RR10 값(740ms·300ms)과 나란히 DEV-RECORD에. 판정하지 않는다.
- `ui-check after --check`: 전 장면 통과(`KNOWN_FAILURES` 세 칸은 `알려진 실패` — 개정 1)(화면이 그대로다 — `--same-layout=all`을 직전 커밋의 배치 기록과 견줘 통과). 새 흐름 셋(`guardedFlow`):
  ① `지연 화면 오프라인`: precache가 끝난 뒤 네트워크를 끊고(`context.setOffline(true)`) 새로 고침 → 홈 → 세션 시작 → 요약, 식단·기록·설정·분석 탭을 차례로 연다 — 각 화면의 제목이 보인다. 하나라도 안 뜨면 실패
  ② `미리 읽기`: 부팅 뒤 2초 안에 세션·요약·식단·기록·설정 청크와 시트 청크가 요청되고(`page.on('request')`로 파일 이름의 접두사를 센다 — 0개면 실패), 분석 청크(`AnalyzeScreen-`)는 요청되지 **않는다**
  ③ `시트 첫 열기`: 새로 고침 직후(미리 읽기 전, 100ms 안) 홈의 [변경]을 누르면 Day 선택 시트가 뜬다(청크를 그때 읽는다)
- 서비스워커 precache 개수·KiB를 DEV-RECORD에(청크가 늘어난다 — 오프라인에서 여는 데 새로 필요한 것은 없다).
- 결함 복원: "구현 순서와 검증" ①~③.

### 범위 제외

- `NumberInput`·`TextArea`·`Field`를 메인 청크에서 빼기(약 gzip 11KB): `src/ax/index.tsx`를 여러 파일로 나눠야 한다. "Astryx를 쓰는 한 곳"(README 프로젝트 구조)을 흔드는 비용에 비해 작다. 기준(360KB)은 이것 없이 지켜진다.
- 지연 청크를 못 읽었을 때의 오류 화면(Error Boundary): 서비스워커가 모든 청크를 precache하고 업데이트는 사람이 누를 때만 적용되므로, 실패하는 길은 "서비스워커 없이 연 첫 방문 중 1초 안에 새 배포가 있었다"뿐이다(미리 읽기가 그 1초를 닫는다). 분석·루틴 편집이 v1.4·v1.17부터 같은 길을 써 왔고 보고가 없다. 생기면 이슈로.
- 라이브러리 교체(`react-dom`·`dexie`가 메인의 1/3): 지정된 스택이다.

### README 반영

- "핵심 설계 결정"의 항목 제목 `**recharts는 분석 탭만 지연 로딩한다**`를 `**화면은 나눠 읽는다 — 처음 여는 순간에는 홈만**`으로 바꾸고 본문을 이렇게: "앱을 처음 여는 순간 읽는 코드는 홈과 앱 틀(탭·띠·테마)뿐입니다. 세션·요약·식단·기록·설정은 `React.lazy`로 나눠, 홈이 뜬 1초 뒤 미리 읽어 둡니다(누르기 전에 준비된다). 시트 부품도 처음 열 때 읽습니다. 분석 탭은 미리 읽지 않습니다 — recharts가 gzip 110KB가 넘어 **헬스장에서 쓰는 경로(홈 → 세션)가 차트 코드를 파싱하지 않게** 하려는 것이고(설계 문서 §2가 지정한 스택이라 바꾸지 않는다), 분석 탭을 열 때 읽습니다. 서비스워커가 모든 청크를 precache하므로 오프라인에서도 전부 열립니다. 처음 여는 순간 읽는 크기는 `node scripts/first-load.mjs`가 재고 `npm run check`가 360KB(gzip)를 넘지 않게 지킵니다."
- "Architecture"의 mermaid: `Lazy["분석 탭 (React.lazy)<br/>recharts"]`를 `Lazy["세션·요약·식단·기록·설정·분석<br/>(React.lazy — 분석 말고는 미리 읽기)"]`로, `SW -->|오프라인 셸 + 두 청크| UI`를 `SW -->|오프라인 셸 + 모든 청크| UI`로.
- "Tech Stack"의 차트 줄: "recharts (분석 탭 청크 — 미리 읽지 않는다)".
- `README.md:254-255`의 "처음 여는 순간 읽는 코드는 늘었습니다(`npm run build` 출력과 `node scripts/first-screen.mjs`)."를 "처음 여는 순간 읽는 크기는 `node scripts/first-load.mjs`가 지킵니다(위 '화면은 나눠 읽는다')."로.

---

## SS2. 식단 탭

### 진단

`DietScreen.tsx`(legacy 3), `DietDayEditor.tsx`(인라인 4, legacy 27), `MealReminderPanel.tsx`(인라인 2, legacy 5). 화면은 "확인한 것" 6. `DietDayEditor`는 기록 탭(`HistoryScreen.tsx:165`)과 기록 상세(`SessionDetailScreen.tsx:337`)도 쓴다 — 그 두 화면은 SS4까지 legacy다.

**배치 판단** (운동 앱의 식단 기록: 하루에 여러 번 열어 끼니마다 1탭으로 체크한다. 편집기 주석의 마찰 기준 "정상일이 탭 6~8회로 끝나야 한다")

| 블록 | 판단 |
|---|---|
| 요약 카드가 맨 위, 끼니 카드가 순서대로, 끼니마다 오른쪽 원형 버튼이 "전부 먹음" | **그대로** — 주 경로(끼니당 1탭)가 화면의 대부분이다 |
| 연속 저칼로리 경고가 요약 바로 아래 | 그대로 — 플랜을 말하는 경고라 플랜 옆이 맞다 |
| 먹은 것·메모·위험 구역 | 그대로 |
| **식사 알림이 매일 쓰는 화면의 맨 아래에 늘 펼쳐져 있다**(설명 두 문단 + 끼니 다섯 + 버튼 — 화면 한 장 가까이) | 한 번 설정하고 마는 일이다(`MealReminderPanel` 주석: "한 번 설정하는 내보내기"). **접힘(`Collapsible`)으로, 처음에는 닫혀 있다.** 자리는 그대로(식단 탭 맨 아래) — 설정 탭으로 옮기면 "오늘 플랜의 끼니 시각"을 쓰는 이 기능(`DietScreen.tsx:26`)이 오늘 화면과 떨어진다 |

### 설계

**`src/ax/index.tsx`에 더하는 것**

| 이름 | 무엇 |
|---|---|
| `Loading({ text })` | `App.tsx`의 `Loading`을 옮긴다(`Center` + `VStack` + `Spinner` + `Text color="secondary"`). App도 이것을 쓴다 |
| `TimeField` | `TimeInput`을 감싼다: `presentation="native"`(OS 시각 고르기), `controlStyle`에 16px 하한, `AX_NO_AUTOFILL`. 값은 `'HH:MM'` 그대로 주고받는다(`ISOTimeString`) |
| 내보내기 | `ToggleButton`(이미), `CheckboxList`·`CheckboxListItem`(`@astryxdesign/core/CheckboxList`), `Collapsible`(이미), `Icon`(이미) |

**이 PLAN이 `src/ax/index.tsx`에 더하는 재내보내기 전부** (화면은 `@astryxdesign/core`를 직접 읽지 않는다 — 처음 쓰는 작업의 커밋에서 더한다. 경로는 `node_modules/@astryxdesign/core/package.json`의 `exports`로 확인)

| 작업 | 더하는 것 (`export { … } from '@astryxdesign/core/<경로>'`) |
|---|---|
| SS2 | `CheckboxList`·`CheckboxListItem` (`CheckboxList`). `TimeInput`은 내보내지 않는다 — `TimeField`가 감싼다 |
| SS3 | `RadioList`·`RadioListItem` (`RadioList`), `ScrollableArea` (`ScrollableArea`) |
| SS4 | 없음(`Row`·`Rows`는 `src/ax`의 함수, `SegmentedControl`은 이미) |
| SS5 | 없음(`ScrollableArea`는 SS3이 더했다) |
| SS6 | `CodeBlock` (`CodeBlock`), `Link` (`Link`). `Switch`·`SegmentedControl`은 이미 |
| SS7 | 없음(`List`·`ListItem`은 이미) |

**`parts.css`에 더하는 것** (v1.20 규칙 그대로: `@layer astryx-theme`, 색 리터럴 0, 길이는 토큰·`%`·`fr`·`1px`·`0`)

| 클래스 | 무엇 | 왜 직접 짓나 |
|---|---|---|
| `.ax-text-error`·`.ax-text-success` | `ax-text-warning`과 같은 세 겹 선택자로 `--color-text-error`·`--color-text-success` | `Text`의 색 이름에 없다("확인한 것" 1) |
| `.ax-slot-mark[data-grade]` | 끼니 원형 버튼 안의 표시 글자(○◔◐◕●✗)의 색: `full`·`high` 성공, `mid` 강조, `low` 경고, `zero` 오류, `none` 보조 글자. 원형 버튼의 면은 Astryx `ToggleButton`의 것 | 등급 여섯의 색을 받는 부품이 없다 |
| `.ax-diet` | 식단 화면 틀의 한글 줄바꿈(`word-break: keep-all; overflow-wrap: anywhere` — `p, span, div, h1, h2`) | "확인한 것" 5. SS8이 앱 전체 규칙으로 모은다 |

**자리마다**

| 자리 | 지금 | Astryx |
|---|---|---|
| 화면 틀 (`DietScreen`) | `.screen` | `AxRoot` + `Groups className="ax-diet"`: [머리] `Heading level={1}` "식단" / [오늘] `DietDayEditor` / [알림] `MealReminderPanel` |
| 불러오는 중·플랜 없음 | `.center-note` | `Loading`, `Center` + `Text color="secondary"`(문구 그대로) |
| 편집기 맨 바깥 (`DietDayEditor`) | `<>` | `Group`. **`ax-scope` 클래스를 단 `div`로 감싼다**(SS4·SS8까지 — 기록 화면이 legacy인 동안 맨 요소 규칙을 막는다. v1.20 RR7과 같은 섬) |
| 요약 카드 | `.card` + 플랜 버튼 + `.diet-protein` + `.diet-bar` | `Card` + `VStack gap={2}`: `Button variant="secondary" size="sm" label={plan.name} icon={<Icon icon="chevronDown" />}`(문구 `{플랜} ▾`의 ▾는 아이콘으로 — 보이는 글자는 플랜 이름), `HStack align="baseline"`(`Heading level={2} hasTabularNumbers` 단백질 g, `Text color="secondary"` `/{목표}g`, `Text type="supporting" color="secondary"` "단백질 (추정)"), `ProgressBar label="단백질" isLabelHidden value={min(protein, target)} max={target}`(인라인 폭 0), `Text type="supporting" color="secondary"`(kcal·상태), 먹은 것 건수 줄 |
| 연속 경고 | `.banner-warn` + 인라인 | `Banner status="warning" title={`${plan.name} ${streak}일 연속`} description={문구 그대로} collapsible={false}` |
| 끼니 카드 | `.card.diet-slot` | `Card` + `VStack gap={3}` |
| 끼니 머리 | `button.diet-slot-name-btn` + `button.diet-mark-btn` | `HStack justify="between" align="center"`: 왼쪽 `Item onClick={() => setSlotSheet(slot.id)} label={slot.name} description={slot.timeHint} endContent={<Text type="supporting" color="secondary" aria-hidden="true">대체·안 먹음 ›</Text>}`, 오른쪽 `ToggleButton isIconOnly label={`${slot.name} 전부 먹음`} isPressed={grade === 'full'} icon={<span className="ax-slot-mark" data-grade={grade} aria-hidden="true">{mark}</span>} onPressedChange={…지금의 onClick 본문 그대로}` |
| 품목 | `button.diet-item` ☐☑ + `button.diet-variant-btn` | `HStack wrap gap={2}` 안에 품목마다 `HStack gap={1}`: `ToggleButton label={`${variant.name} ${variant.qty}`} isPressed={on} pressedIcon={<Icon icon="check" />} onPressedChange={() => mutate(…applyToggleItem…)}`, 변형이 있으면 `Button variant="ghost" size="sm" label="바꾸기" icon={<Icon icon="chevronDown" />} aria-label={`바꾸기 — ${slot.name} ${item.name}, 다른 단백질원으로`}` |
| 안 먹음·대체·추가 메모 | `p.row-sub.diet-note` | `Text type="supporting" color="secondary"`(문구 함수 그대로 — `substitutionNote`·`additionNote`) |
| 먹은 것 카드 | `.card` + `.card-label` + 줄 버튼 | `Card` + `VStack gap={3}`: `Text type="supporting" color="secondary"` "먹은 것 (시간별)", 줄마다 `Collapsible trigger={<Text>{logEntryText(entry)}</Text>} isOpen={openLogId === entry.id} onOpenChange={(o) => setOpenLogId(o ? entry.id : null)}` — 펼친 안: `HStack gap={2} align="center"`(`TimeField label="먹은 시각" isLabelHidden`, `NumberStepper`(그대로 — `decimals={2}`), `Button variant="destructive" size="sm" label="삭제"`), 빈 안내 `Text type="supporting" color="secondary"`, `Button variant="secondary" size="sm" label="＋ 먹은 것 추가"` |
| 메모 | `input.field` | `Card` + `TextField label="식단 메모" isLabelHidden placeholder="회식·컨디션 같은 맥락"`(값·`onBlur` 커밋은 그대로). 제목 `Text type="supporting" color="secondary"` "메모 (선택)" |
| 위험 구역 | `.card` + `btn-danger` + 인라인 `var(--danger)` | `Card` + 제목 + `Button variant="destructive" label="이 날 식단 기록 지우기"` → 확인: `Text className="ax-text-error"`(문구 그대로) + `HStack`(`Button variant="secondary" label="취소"`, `Button variant="destructive" label="정말 삭제"`). 2단 확인 그대로(세션 종료 시트의 "이 세션 버리기"와 같은 모양 — v1.20 RR8) |
| 식사 알림 (`MealReminderPanel`) | `.card` 늘 펼침 + `button.diet-item-btn` ☐☑ | `Card` + `Collapsible trigger={<Text weight="semibold">식사 알림</Text>}`(처음 닫힘) 안: `Text`(설명 두 문단 그대로, 굵은 부분은 `<strong>`), `CheckboxList label="알림 받을 끼니" isLabelHidden value={selected} onChange={setSelected}` + 끼니마다 `CheckboxListItem value={slot.id} label={slot.name} description={훈련일 전용 끼니를 골랐으면 `${slot.timeHint} · 휴식일에도 울립니다 (훈련일 전용 끼니인데 매일 반복입니다)`, 아니면 `slot.timeHint`}`, `Button variant="secondary" label={`📅 캘린더로 내보내기 (${n}개)`} isDisabled={n === 0}`, 결과 문구 `Text type="supporting"` |

- 로직(`mutate`·`seedVariantChoices`의 한 경로, `variantChoicesFor(…todayVariantChoices(day))` 두 곳, `slotGrade`·`SLOT_MARK`, 시트를 여는 상태, `planStreak`)은 한 줄도 안 바꾼다. 시트 넷은 이 작업에서 안 고친다(SS3).
- `global.css`에서 이 세 파일만 쓰던 규칙(`.diet-plan-btn`·`.diet-protein*`·`.diet-bar*`·`.diet-slot*`·`.diet-mark*`·`.diet-items`·`.diet-item`(시트가 아직 쓰면 남긴다)·`.diet-note`·`.diet-variant-btn`(시트가 쓰면 남긴다)·`.diet-item-btn`·`.meal-note`)와 `parts.css`의 식단 줄 규칙 둘(`.btn-row:has(> .ax-scope) > input[type='time']`·`> .btn-danger`)·`.btn-row > .ax-scope` 무리를 지운다. 넷째 숫자 0이 기준이다.
- **여백(RR12 그대로):** `Groups`·`Group`·`Card`가 정한다. 화면은 `padding=`을 적지 않는다. 끼니 카드 안 덩어리 사이 3, 줄 사이 2.

**탭 수** (끝 기준 2)

| 하는 일 | 지금 | 뒤 |
|---|---|---|
| 끼니 하나를 전부 먹음으로 / 되돌리기 | 1탭 | 1탭(원형 버튼) |
| 품목 하나 체크 | 1탭 | 1탭 |
| 끼니 시트 열기 | 1탭 | 1탭(끼니 이름 줄) |
| 단백질원 바꾸기 | 1탭 → 고르기 1탭 | 그대로 |
| 먹은 것 줄 펼치기 / 시각·개수·삭제 | 1탭 / 각 1탭 | 그대로 |
| 식사 알림 내보내기 | 끼니 고르기 + 1탭 | **펼치기 1탭** + 끼니 고르기 + 1탭(한 번 하는 일 — 위 배치 판단) |

### 검증

- `v121` SS2: 세 파일에 `className=`은 `ax-` 이름(`ax-scope`·`ax-slot-mark`·`ax-diet`·`ax-text-error`)뿐, `style=`·`<button`·`<input`·`var(--`·`padding=`이 0건이다.
- `v121` SS2: `DietDayEditor.tsx`에서 `전부 먹음` 접근성 이름의 `ToggleButton`이 `isPressed={grade === 'full'}`를 갖고, 품목 `ToggleButton`이 `isPressed={on}`을 갖는다(`aria-pressed`의 뜻이 그대로 남는다).
- `v121` SS2 — 문구: `대체·안 먹음`, `단백질 (추정)`, `먹은 것 (시간별)`, `＋ 먹은 것 추가`, `메모 (선택)`, `위험 구역`, `이 날 식단 기록 지우기`, `정말 삭제`, `식사 알림`, `캘린더로 내보내기`, 연속 경고 본문이 세 파일에 있다.
- `v121` SS2: `src/ax/index.tsx`가 `Loading`·`TimeField`를 내보내고, `TimeField`에 `presentation="native"`·`AX_NO_AUTOFILL`이 있다. `App.tsx`에 `function Loading`이 없다.
- 옮긴 스캔("확인한 것" 3): `uiConsistency` X6(식단 줄), `v120` RR7의 `DietDayEditor` 줄, `v120` RR3의 `<Spinner />` 줄(`App.tsx` → `src/ax/index.tsx`의 `Loading`). 안 고치고 통과: `v19`·`v110`·`v1112`·`v115`·`dietBackup`·`strengthWork`·`uiConsistency`의 나머지.
- `ui-check after --check` — 장면 `diet` `diet-end` `diet-375` `diet-log-open` `diet-streak` `history-day`(편집기가 legacy 화면 안 — 섬) `history-detail-end`(같다):
  - `안쪽 대칭`(카드·뱃지·버튼 — `SYMMETRY_JUDGED`·`EXPECTED_PAIRS`에 `diet*`를 더한다), `같은 역할`(화면 좌우·카드 사이·묶음 사이·카드 안쪽이 `home`·`summary`·`editor`와 같다), `가까움 순서` 통과.
  - `섬 버튼`이 `history-day`·`history-detail-end`에서 통과(legacy 44px가 안 걸린다).
  - `가로 넘침`(문서 폭 + 안쪽 폭) 0.
- 흐름(`guardedFlow`): ① `SS2 끼니 전부 먹음 1탭`: 끼니 원형 버튼 1탭 → `aria-pressed="true"`, 요약 카드의 kcal 숫자가 바뀐다. 한 번 더 → `false`(기록 지움) ② `SS2 품목 체크 1탭` ③ `SS2 먹은 것 줄`: 줄 1탭으로 펼침 → 시각 칸·스테퍼·삭제가 한 줄에(세 요소의 세로 가운데 차이 ≤ 2px, 390·375), `+` 1탭에 0.5 오른다 ④ `SS2 식사 알림 접힘`: 처음 닫힘(끼니 체크 0개 보임) → 1탭에 펼침 → 끼니 체크 다섯 ⑤ `SS2 위험 구역 2단 확인`: 지우기 → 확인 문구의 계산된 색 = `--color-text-error`(다크·라이트, `inPageToneColor`) → 취소로 돌아온다 ⑥ `SS2 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안` — 장면 다섯마다.
- 경계: 플랜 없음(문구), 기록 없는 날(위험 구역 없음), 대체·추가·안 먹음이 함께 있는 끼니, 변형 있는 품목·없는 품목, 먹은 것 0건(안내 문구), 영양 미입력 건, 줄인 플랜 연속 3일(경고 없음)·4일(경고).
- 결함 복원: "구현 순서와 검증" ④~⑦.

### 범위 제외

- 식단 시트 넷: SS3.
- 식사 알림을 설정 탭으로 옮기기: 하지 않는다(위 배치 판단).
- 단백질·kcal 계산, 슬롯 등급, 연속 경고 기준: 안 바꾼다.

### README 반영

"Tech Stack"의 Astryx 줄 괄호를 `(앱 틀·홈·세션·요약·식단·루틴 편집)`으로.

---

## SS3. 식단 시트 넷 + `SheetFrame` 삭제

### 진단

`DietPlanSheet.tsx`(인라인 1, legacy 10), `DietSlotSheet.tsx`(0, 11), `DietVariantSheet.tsx`(3, 7), `FoodLogSheet.tsx`(3, 12)가 `SheetFrame`(0, 1)을 쓰는 마지막 넷이다(`v120.test.ts:904`). 고르는 줄을 `aria-pressed` 버튼 + ✓ 글자로 그린다. 고르면 `onClose()`를 바로 불러 내려가는 움직임 없이 사라진다(`DietPlanSheet.tsx:58`, `DietVariantSheet.tsx:52` 등).

### 설계

| 시트 | `Sheet` | 안 |
|---|---|---|
| 플랜 전환 | `label="식단 플랜 전환" purpose="info"` | `VStack gap={5}`: `Heading level={2}` "식단 플랜", 목록 `List` + 플랜마다 `ListItem onClick={() => { onPickToday(plan.id); dismiss() }} label={plan.name} description={kcal·단백질 줄 + (차이 줄이 있으면 두째 줄 `{기본} 대비 {차이}`)} isSelected={plan.id === currentPlanId} endContent={plan.id === currentPlanId ? <Icon icon="check" /> : null}`(지금의 ✓ 자리 — 새 글자 없음. `ListItem`의 `isSelected`는 `List/ListItem.d.ts`로 확인), 안내 `Text`(굵은 "오늘"), "내일부터 ○○" `Button variant="secondary" size="sm"` 들(`HStack wrap`). 며칠 고르기 상태: 안내 `Text`, `HStack wrap`의 `Button variant="secondary"` `1일`~`3일`(누르면 `onPickAhead` 뒤 `dismiss()`), 경고 안내, `Button variant="secondary" label="뒤로"`. 맨 아래 `Button variant="secondary" width="100%" label="닫기" onClick={dismiss}` |
| 끼니 | `label={`${slot.name} 기록`} purpose="form"`(입력칸이 있다 — v1.20 개정 4의 규칙) | 메뉴: 상태 요약 `Text type="supporting"`(문구 함수 그대로), `Button variant="primary" width="100%" label={`전부 먹음 (${n}개)`}`, 줄 둘 `HStack`(`대체했어요`/`대체 수정` + `대체 지우기`, `추가로 먹었어요`/`추가 기록 수정` + `추가 지우기`), `안 먹음`, `기록 지우기` — 전부 `Button variant="secondary"`. 동작 뒤 `dismiss()`. 입력: `Heading level={3}`(제목), 안내 `Text`, `TextField label={제목} placeholder=… hasAutoFocus`, `RadioList label="어느 쪽이었나요" value={quality} onChange={…}` + `RadioListItem value label={QUALITY_LABEL[q]} description={q.hint}` 셋, `Button variant="primary" label="저장" isDisabled={!canSave}`, `Button variant="secondary" label="뒤로"`. 맨 아래 닫기 |
| 단백질원 | `label={`${slot.name} 단백질원 고르기`} purpose="info"` | `Heading level={2}` `{끼니} · 단백질원`, 안내 `Text`, `List` + 변형마다 `ListItem onClick={() => { onPick(i); dismiss() }} label={`${name} ${qty}`} description={kcal·단백질(+ 기본 대비 차이)} isSelected={i === choice} endContent={i === choice ? <Icon icon="check" /> : null}`, 안내 `Text`, 닫기 |
| 먹은 것 추가 | `label="먹은 것 추가" purpose="form"` | 목록 상태: `TimeField label="먹은 시각"`(지금 시각 기본값 그대로), 안내 `Text`(시각 없음·방금 추가), `TextField label="음식 검색" isLabelHidden placeholder="음식 검색"`, `ScrollableArea axis="block" height="40vh" label="음식 목록"` 안 `List` + 음식마다 `ListItem onClick={() => add(f)} isDisabled={noTime} label={`${f.name} ${f.qty}`} description={`${f.source === 'plan' ? '플랜 · ' : ''}${nutritionText(…)}`} endContent={f.source === 'user' ? <Button variant="ghost" size="sm" label="편집" aria-label={`편집 — ${f.name}`} onClick={…} /> : null}`(음식 줄에 `aria-label`을 주지 않는다 — 보이는 글자가 이름이다, v1.20 RRM 보완), 빈 목록 `Text`, 안내 `Text`, `Button variant="secondary" label="새 음식 등록"`. 등록 폼: `Heading level={3}`, `TextField` 넷(이름·분량·칼로리 `inputMode="decimal"`·단백질 `inputMode="decimal"` — 둘째 줄의 두 칸은 `HStack`), 안내·문제 `Text className="ax-text-error"`, 버튼 줄(`취소`·`등록`·`등록하고 추가`/`저장`), 목록에서 삭제 2단 확인(`variant="destructive"`). 맨 아래 닫기 |

- **고른 뒤 닫힘을 `dismiss()`로**: 플랜·단백질원·끼니 메뉴·며칠 고르기의 `onClose()` 직접 호출을 `dismiss()`로 바꾼다 — 닫기 버튼·막 누름과 같이 내려가며 닫힌다(v1.20 RR5의 한 길). 부모가 상태를 바꿔 시트를 먼저 내리는 길(먹은 것 추가의 `add`는 시트를 닫지 않는다)은 그대로다.
- `parts.css`의 시트 이름으로 좁힌 한글 줄바꿈 목록(`dialog:is([aria-label=…])`)에 넷을 더한다: `식단 플랜 전환`, `먹은 것 추가`, 그리고 이름이 끼니마다 다른 둘은 `[aria-label$=' 기록']`·`[aria-label$=' 단백질원 고르기']`(끝 일치).
- **`SheetFrame.tsx`를 지운다.** `global.css`의 `.sheet`·`.sheet-backdrop`·`.sheet-grip`·`.check-*`·`.diet-item*`·`.diet-variant-btn`, `motion.css`의 시트 움직임 블록(`.sheet`·`.sheet-backdrop`·`is-closing`·키프레임 넷)을 지운다. legacy 뿌리 목록(`global.css`·`ax.css`의 `@scope` 두 줄 — 글자 그대로 같아야 한다)에서 `.sheet-backdrop`을 뺀다.
- 검사: `SHEET_SELECTOR`를 `.astryx-bottom-sheet`만으로, `ui-check-lib.mjs:251`의 `.sheet, .sheet-backdrop` 루프를 지운다("확인한 것" 4).

### 검증

- `v121` SS3: 네 파일이 `../ax`의 `Sheet`를 쓰고 `SheetFrame`·`className=`(한글 규칙의 `ax-` 이름 외)·`style=`·`<button`·`<input`·`@astryxdesign`이 0건, `src/components/SheetFrame.tsx`가 없다, `components/*Sheet.tsx` 전부가 `from '../ax'`를 읽는다(옮긴 `v119`·`v120` 스캔).
- `v121` SS3: 네 파일에서 `onPickToday(`·`onPick(`·`onPickAhead(`·`act(` 뒤에 `onClose()`가 아니라 `dismiss()`가 온다(`act`는 `dismiss`를 부른다). 끼니·먹은 것 추가가 `purpose="form"`, 플랜·단백질원이 `purpose="info"`.
- `v121` SS3: `DietSlotSheet`의 `RadioList`가 `value={quality}`이고 초기 `mode`는 여전히 `null`(AA3 — `uiConsistency`가 안 고치고 통과). `대체 지우기`의 동작이 `onClearSubstitution`.
- `scripts/ss3.test.mjs`(CSS는 fs로): `global.css`에 `.sheet`·`.sheet-backdrop`·`.check-`·`.diet-item`이 없고, `motion.css`에 `sheet-enter`·`is-closing`이 없고, `global.css`·`ax.css`의 legacy 뿌리 목록이 같고 `.sheet-backdrop`이 없다. `parts.css`의 한글 목록에 네 시트 이름 규칙이 있다.
- 안 고치고 통과: `v19` DD1(`planDiffText(`, 품목 이름 없음), `v115` MM2(`requestSync(` 없음), `uiConsistency` AA3.
- `ui-check after --check` — `sheet-food` `sheet-food-new` `sheet-diet-plan` `sheet-diet-plan-ahead` `sheet-diet-slot` `sheet-diet-slot-edit` `sheet-diet-variant`: `안쪽 대칭`(시트의 좌·우, 버튼), `시트 버튼`(다크에서 하단 버튼이 버튼으로 보인다), `가로 넘침` 0, 접근성 serious·critical 0.
- 흐름(`guardedFlow`): ① `SS3 플랜 고르기`: 다른 플랜 줄 1탭 → 시트가 **내려가며** 닫힌다(닫히기 시작부터 사라질 때까지 300ms 안팎 — v1.20 RR5의 재는 방법) → 요약 카드의 플랜 이름이 바뀐다 ② `SS3 내일부터 2일` ③ `SS3 끼니 대체 저장`: 대체했어요 → 글 입력 → "치팅" 고름 → 저장 → 카드에 대체 메모(문구 함수) ④ `SS3 입력 중 막 누름`: 끼니 입력 상태에서 막을 누르고 끌어내려도 시트가 남고 친 글이 그대로(form) ⑤ `SS3 단백질원 바꾸기` ⑥ `SS3 먹은 것 추가 1탭`: 음식 줄 1탭 → "방금 추가: {이름}", 시트는 열린 채, 닫으면 먹은 것 카드에 한 줄 ⑦ `SS3 새 음식 등록하고 추가` ⑧ `SS3 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`.
- 결함 복원: ⑧~⑩.

### 범위 제외

- 끼니·품목·변형·음식 목록의 판정과 문구: 안 바꾼다.

### README 반영

없음.

---

## SS4. 기록 탭

### 진단

`HistoryScreen.tsx`(인라인 3, legacy 14), `SessionDetailScreen.tsx`(2, 31), `ExerciseHistoryScreen.tsx`(3, 13), `MonthCalendar.tsx`(0, 11). 화면은 "확인한 것" 6.

**배치 판단** (운동 앱의 기록 탭: "이번 달에 몇 번 갔나", "그날 뭘 했나", "이 종목이 늘고 있나")

| 블록 | 판단 |
|---|---|
| 달력이 맨 위, 날짜를 고르면 그날의 세션과 식단 | 그대로 |
| 세션 목록이 카드 하나 안의 `button.row` 줄들 | **세션마다 `ClickableCard` 한 장**으로. 줄 전체가 누르는 면이라는 것이 보이고, 카드 안 마지막 줄의 비대칭("확인한 것" 5)이 생기지 않는다. 목록 머리(날짜·"이 달의 세션"·전체 보기·n회)는 카드 밖의 머리 줄 |
| 종목별 목록이 카드 하나 안의 줄 30개 안팎 | **종목마다 `ClickableCard`** — 같은 이유. 기록 키(`push_press@d1` 꼴)는 설명 줄의 마지막에 작게 |
| 기록 상세: 숫자 → 운동 카드 → 유산소 → 메모 → Day 변경 → 위험 구역 → 그날 식단 → 기록으로 | **그날 식단을 위험 구역 위로**: 기록을 고치는 것(카드·유산소·메모·식단)을 먼저 한 묶음, 관리(Day 변경·위험 구역)를 맨 아래 한 묶음으로. "삭제" 버튼 아래에 고치는 칸이 오지 않게 |
| 기록 상세의 "이 Day 구성에 없는 종목" 카드가 legacy 운동 카드의 모양을 흉내 낸다(`ex-card-orphan`) | `Card` + `Row`(이름·"이 Day 구성에 없는 종목 · 반복수 · 무게" / `n세트`). 운동 카드와 같은 폭·여백이고 펼쳐지지 않는다 |

### 설계

**`src/ax/index.tsx`에 더하는 것:** `Row`·`Rows` — `SummaryScreen.tsx:27-47`의 두 함수를 그대로 옮긴다(`HStack role="listitem"` + `VStack gap={1}` + 오른쪽 `StackItem size="static"`, `VStack role="list" gap={3}`). `SummaryScreen`은 `../ax`에서 읽게만 바꾼다(화면은 그대로 — `--same-layout=summary*` 통과). `SegmentedControl`·`SegmentedControlItem`(이미).

**`parts.css`에 더하는 것** (Astryx `Calendar`가 칸에 내용을 못 받는다 — "확인한 것" 1)

| 클래스 | 무엇 |
|---|---|
| `.ax-cal-grid` | 7열 격자(`grid-template-columns: repeat(7, 1fr)`, 간격은 토큰). 요일 머리와 칸이 같은 열 정의를 읽는다(세트 표와 같은 이유) |
| `.ax-cal-cell` | 칸 버튼 안의 배치(날짜 글자 `17일`·🔥·점을 세로로). 상태는 `data-*` 속성: `data-out`(다른 달 — 흐린 글자), `data-today`(테두리 `--color-border-emphasized`가 아니라 `--color-accent`), `data-selected`(면 `--color-accent-muted`). 칸의 버튼 모양·눌림·포커스 링은 Astryx `Button`의 것 |
| `.ax-cal-dot[data-diet]` | 식단 점: `good` 성공, `mid` 경고, `bad` 오류, `partial` 보조 글자(지금 `.cal-diet-dot-*`의 뜻과 같다 — 강조색을 안 쓴다, uiConsistency의 "식단 색에 내비게이션 색을 쓰지 않는다") |
| `.ax-history` | 화면 틀의 한글 줄바꿈(SS2의 `.ax-diet`와 같다) |

**자리마다**

| 자리 | 지금 | Astryx |
|---|---|---|
| 기록 탭 틀 | `.screen` | `AxRoot` + `Groups className="ax-history"`: [머리] `Heading level={1}` "기록", `SegmentedControl label="보기" value={mode} onChange={(v) => setMode(v as Mode)}`(항목 `달력`·`종목별`) / [달력] `MonthCalendar`, 범례 `Text type="supporting" color="secondary"` / [세션] 머리 줄 + 카드들 / [그날 식단] `Heading level={2}` `{날짜} 식단` + `DietDayEditor` |
| 달력 (`MonthCalendar`) | `.card` + `.cal-*` | `Card` + `VStack gap={3}`: 머리 `HStack justify="between" align="center"`(`Button variant="ghost" isIconOnly icon={<Icon icon="chevronLeft" />} label="이전 달"`, `Heading level={2}` `monthLabel(month)`, 다음 달 같은 꼴), 요일 `div.ax-cal-grid` 안 `Text type="supporting" color="secondary"` 일곱, 칸 `div.ax-cal-grid` 안 칸마다 `Button variant="ghost" className="ax-cal-cell" label={칸 이름} isDisabled={…지금 조건 그대로} onClick={() => onPickDate(cell.date)} data-out=… data-today=… data-selected=…` + 자식 `<span>{날짜}일</span>`(보이는 글자 `17일` — 개정 2), 🔥(+세션 수), `<span className="ax-cal-dot" data-diet={dietDot} aria-hidden="true" />` |
| 칸 이름 (새 접근성 이름) | 보이는 글자(`17🔥2`) | `{d}일` + 세션이 있으면 ` 운동 {k}회` + 식단 점이 있으면 ` 식단 {준수\|일부\|미달\|판정 전}`(조각은 공백으로 잇는다). 보이는 글자 `{d}일`이 이름의 첫 낱말이다 — axe `label-content-name-mismatch`는 두 글자를 NFKD로 풀어 **낱말 단위**(`Intl.Segmenter`)로 견주므로, 보이는 글자가 숫자만이면 낱말 `17`이 `17일 …`에 없어 칸마다 위반이다(axe-core 4.14.0, SS4 리뷰 3절 — 개정 2) |
| 세션 목록 머리 | `.week-head` + `chip` | `HStack justify="between" align="center"`: `Text weight="semibold"`(`{날짜} ({요일})` 또는 "이 달의 세션"), 날짜를 골랐으면 `Button variant="ghost" size="sm" label="전체 보기"`, 아니면 `Text weight="bold" hasTabularNumbers` `{n}회` |
| 세션 줄 | `button.row` | `Group` 안 세션마다 `ClickableCard label={`${dayName} ${date}`} onClick={() => setDetailId(id)}` + `Row label={<HStack gap={2}><Text weight="semibold">{dayName}</Text>{복귀/디로드면 <Badge variant="warning" label=… />}</HStack>} description={<Text type="supporting" color="secondary">{날짜 · 세트 · 분 · 유산소}</Text>} end={<VStack gap={0} align="end"><Text weight="semibold" hasTabularNumbers>{볼륨}</Text><Text type="supporting" color="secondary">kg·회</Text></VStack>}`. 빈 목록 `Text color="secondary"` "기록이 없습니다." |
| 종목별 목록 (`ExerciseHistoryScreen`) | `.card` + `button.row` | `Group`: 안내 `Text type="supporting" color="secondary"`, 종목마다 `ClickableCard label={이름 + Day}` + `Row label={이름 + Badge neutral Day + Badge neutral 그룹 + (현재 루틴에 없음이면 Badge warning)} description={기록 키 — Text type="code" size="sm"} end={`${n}회`}`. 기록 0: `Center` + `Text` "아직 기록이 없습니다." |
| 한 종목 | `button.back-link` + `.card`들 | 머리 `Button variant="ghost" icon={<Icon icon="chevronLeft" />} label="종목 목록"`(보이는 글자 `‹ 종목 목록`의 ‹는 아이콘으로), 요약 `Card` + `Row`(기록 키·세션 수 / 최고 e1RM) + 보조 무게 안내 `Text className="ax-text-warning"`, 메모 이력 `Card` + 제목 + `Rows`(날짜 + 감각 `Badge neutral` / 메모 줄 — 여러 줄 그대로), 세션 히스토리 `Group` + 세션마다 `ClickableCard` + `Row`(날짜 + 복귀/디로드 `Badge warning` + 최고 `Badge info` / 무게·반복·감각·보상작용·통증 / 볼륨 `kg·회`) |
| 기록 상세 틀 (`SessionDetailScreen`) | `.screen` | `AxRoot` + `Groups className="ax-history"`: [머리] `Button variant="ghost" icon=chevronLeft label="기록"`(맨 위 ‹ 기록), `Heading level={1}`(Day 이름), `HStack wrap`(`Text color="secondary"` 날짜·시각, 복귀/디로드 `Badge warning`) / [고치기] 숫자 셋 `Card` + `Grid columns={3}`(요약 화면과 같은 꼴 — `Heading level={2}` 값, `Text type="supporting"` 라벨), 운동 카드들(그대로), Day에 없는 종목 `Card` + `Row`, 유산소 `Card`, 메모 `Card`, `Heading level={2}` `{날짜} 식단` + `DietDayEditor` / [관리] Day 변경 `Card`, 위험 구역 `Card` / [끝] `Button variant="secondary" width="100%" label="기록으로"` |
| 유산소 | `.pill-row` 알약 + `input.field` 둘 | `HStack wrap` 안 종류마다 `ToggleButton label={t} isPressed={session.cardio?.type === t}`(다시 누르면 끔 — 지금 동작 그대로), 켜져 있으면 `HStack`(`TextField label="유산소 시간(분)" isLabelHidden inputMode="numeric" isNumeric`, `TextField label="유산소 강도" isLabelHidden placeholder={intensityHintFor(…)}`) — 문자열 상태·`onBlur` 커밋 그대로 |
| 메모 | `textarea.field` | `TextAreaField label="메모" isLabelHidden placeholder="컨디션, 특이사항" rows={2}` |
| Day 변경 | `.pill-row` + `.warn-box` + `.mono` | 진입 `Button variant="secondary" size="sm" label="잘못된 Day로 기록했나요?"`, 고르기 `Text` + `HStack wrap`의 `Button variant="secondary"` Day마다 + 취소, 계획 `Text weight="semibold"` `{from} → {to}`, 재매핑 표 `Rows`(`Text type="code"` `{from} → {to}`), 유지 줄, 없는 종목 `Banner status="warning" title={`${toDayId}에 없는 종목 ${n}개`} description={이름들 + 안내 문구 그대로}`, `HStack`(취소, `Button variant="primary" label="변경 적용"`) |
| 위험 구역 | `btn-danger` + 인라인 색 | SS2의 위험 구역과 같은 꼴: `이 세션 삭제` → `ax-text-error` 문구 + 취소/`정말 삭제`(`variant="destructive"`) |
| 세션 없음·불러오는 중 | `.center-note` + `.btn` | `Loading`, `Center` + `Text` + `Button variant="secondary" label="기록으로"` |

- `DietDayEditor`의 `ax-scope` 감싸기는 이 작업 뒤에도 남는다(쓰는 화면이 모두 Astryx가 됐지만 떼는 것은 SS8에서 한 번에 — 섬을 떼는 커밋을 하나로 모은다).
- 로직(`calendarCells`·`sessionsInMonth`·`summarize`·`dietMonthStats`, `pickDate`가 `setDetailId`를 안 부름, `useSessionEditor`, `planDayChange`, `exerciseHistory`·`noteHistory`·`isInverseKey`로 e1RM을 숨김)은 한 줄도 안 바꾼다.
- `global.css`에서 네 파일만 쓰던 규칙(`.cal-*`·`.week-head`·`.week-count`·`.ex-card-orphan`과 그 안의 `.ex-*` 가운데 다른 곳이 안 쓰는 것·`.pill*`(분석이 쓰면 남긴다)·`.warn-box`(분석·Gist가 쓰면 남긴다)·`.stat-*`·`.back-link`)와 `motion.css`의 `.back-link` 규칙을 지운다. 넷째 숫자 0이 기준. 인벤토리의 `TEMPLATE_PREFIXES`에서 `cal-diet-dot-`을 뺀다.

**탭 수**

| 하는 일 | 지금 | 뒤 |
|---|---|---|
| 날짜 고르기 / 세션 상세로 | 1탭 / 1탭 | 그대로 |
| 달력 ↔ 종목별 | 1탭 | 1탭 |
| 종목 고르기 → 세션 상세 | 1탭 → 1탭 | 그대로 |
| 기록 상세에서 세트 고치기 | 운동 카드 그대로 | 그대로 |
| 유산소 종류 켜기·끄기 | 1탭 | 1탭 |

### 검증

- `v121` SS4: 네 파일에 `className=`은 `ax-` 이름뿐, `style=`·`<button`·`<input`·`<textarea`·`var(--`·`padding=` 0건. `MonthCalendar.tsx`에 `data-diet={dietDot}`가 있다(옮긴 uiConsistency).
- `v121` SS4 — 순서: 주석을 뗀 `SessionDetailScreen.tsx`에서 `<ExerciseCard` < `유산소` < `메모` < `<DietDayEditor` < `Day 변경` < `위험 구역` < `기록으로` 순이다.
- `v121` SS4: `src/ax/index.tsx`가 `Row`·`Rows`를 내보내고 `SummaryScreen.tsx`에 `function Row`·`function Rows`가 없다.
- `v121` SS4: 칸 이름을 만드는 함수가 `MonthCalendar.tsx` 안 한 곳(`cellLabel`)이고, 이름이 `${날짜}일`로 시작한다. **속성**(`cellLabel`을 `src/lib/history.ts`가 아니라 화면 파일에 두므로 `v121`에서 직접 import해 잰다): 어떤 칸(세션 수 0~5, 식단 점 다섯 가지, 날짜 1~31)에서도 이름이 `${날짜}일`로 시작하고, 세션 수가 0이면 `운동`이 없고 1 이상이면 `운동 ${k}회`가 있다.
- 옮긴 스캔: `uiConsistency` X6(세션 줄)·캘린더 점. 안 고치고 통과: `uiConsistency`의 기록 탭 두 줄, `v18`·`v114`(`cardioText(`)·`v115`·`dietBackup`·`strengthWork`의 기록 화면 스캔, `v120` RR9(요약 — `Row`를 옮겨도 마크업은 같다).
- `ui-check after --check` — `history` `history-375` `history-day` `history-exercise` `history-exercise-detail` `history-detail` `history-detail-end` `history-detail-change` `history-detail-edit` `summary*`: `안쪽 대칭`(카드·뱃지·버튼 — `history*`를 판정에 더한다), `같은 역할`(기록 장면이 `home`·`summary`·`diet`와 같다), `가까움 순서`, `가로 넘침` 0, `--same-layout=summary,summary-zero,summary-pr,summary-assist,summary-memo,summary-revert,summary-cardio,summary-deload`(직전 커밋과 같다).
- 흐름: ① `SS4 날짜 고르기`: 세션 있는 날 칸 1탭 → 그날 세션 카드와 그날 식단 → 세션 카드 1탭 → 상세 제목 → `기록` 1탭으로 돌아온다 ② `SS4 달력 칸 이름`: 오늘 칸·세션 두 번인 칸·식단 점이 있는 칸의 접근성 이름이 위 규칙대로(세 칸 — 하나라도 못 찾으면 실패) ③ `SS4 다른 달`: 이전 달 1탭 → 고른 날짜가 풀린다 ④ `SS4 종목별 → 세션` ⑤ `SS4 보조 무게 종목`: e1RM·최고 뱃지·볼륨이 없고 안내 글자의 계산된 색 = 경고 토큰 ⑥ `SS4 Day 변경 2단계`(취소로 끝낸다 — 기록을 안 바꾼다) ⑦ `SS4 위험 구역 2단 확인`(취소로 끝낸다) ⑧ `SS4 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`.
- 경계: 기록 0건 달, 한 날 두 세션, 다른 달의 칸(눌리지 않음 — 세션·식단 없으면), 유산소만 한 세션, 복귀·디로드 세션, 현재 루틴에 없는 종목, 메모 이력 0건, 세션 하나뿐인 종목(최고 뱃지 없음), Day 구성에 없는 종목이 있는 세션.
- 결함 복원: ⑪~⑬.

### 범위 제외

- 달력을 Astryx `Calendar`로: 칸에 내용을 못 넣는다("확인한 것" 1).
- 세션 상세에서 운동 카드: v1.20 RR7에서 옮겼다 — 안 고친다.

### README 반영

"Tech Stack"의 Astryx 줄 괄호에 `기록`을 더한다.

---

## SS5. 분석 탭

### 진단

- `AnalyzeScreen.tsx`(인라인 4, legacy 22). 감각 점의 색·투명도(`:283-292`)와 알약 안 흐린 글자(`:144-147`)가 인라인 `style`이다.
- `src/lib/chartTheme.ts`의 `TOKEN`이 legacy 이름(`--accent`·`--ok`·`--warn`·`--text`·`--text-dim`·`--text-faint`·`--line`·`--surface`·`--surface-2`)을 읽는다. 이 이름들은 `global.css:3-22`의 `:root`가 Astryx 토큰으로 이어 준 다리다(v1.20 RR2) — SS8이 `global.css`를 지우면 전부 빈 값이 되어 `FALLBACK`(옛 다크 고정 hex)으로 떨어진다.

**배치 판단:** 지금 순서(종목별 추이 → 감각 점수 → 주간 수행 횟수 → 대체 수행)를 **그대로 둔다.** 이 탭을 여는 이유가 "이 종목이 늘고 있나"이고 그것이 맨 위다. 차트 셋의 내용·조건(B그룹 차트는 Phase 2부터)은 안 바꾼다.

### 설계

| 자리 | 지금 | Astryx |
|---|---|---|
| 틀 | `.screen` | `AxRoot` + `Groups className="ax-analyze"`(한글 줄바꿈 — SS2와 같은 규칙) + 카드마다 `Group` 하나씩 또는 한 `Group`(카드 넷이 한 묶음 — 카드 사이 3) |
| 제목·부제 | `h1`·`p.screen-sub` | `Heading level={1}` "분석", `Text color="secondary"`(문구 그대로) |
| 기록 없음 | `.center-note` | `Center` + `Text`(두 줄 문구 그대로) |
| 카드 제목 | `.card-label` | `Text type="supporting" color="secondary"` |
| 종목 고르기 | `.chip-scroll` + `button.pill` | `ScrollableArea axis="inline" label="종목"` 안 `HStack gap={2}`(줄바꿈 없음): 종목마다 `ToggleButton label={`${이름} ${DAY}${B면 ' · B'}`} isPressed={activeKey === k.recordKey} onPressedChange={() => setSelected(k.recordKey)}`. 흐린 글자 두 조각은 한 글귀로 합친다(인라인 `opacity`를 없앤다 — 고른 것과 안 고른 것은 눌림 상태가 구분한다) |
| 지표 | `.segment` | `SegmentedControl label="지표" value={metric} onChange={(v) => setMetric(v as Metric)}` + 항목 셋(문구 그대로) |
| 선·막대 차트 | `div.chart` + recharts | `div.ax-chart`(`parts.css` — 차트 높이를 감싸는 틀, 지금 `.chart`의 역할)는 직접 짓는다(차트는 recharts — DESIGN 9.5). 색은 아래 `chartTheme` |
| 안내 줄 | `p.row-sub`, B그룹 경고 `color: var(--warn)` | `Text type="supporting" color="secondary"`, 경고 `Text type="supporting" className="ax-text-warning"` |
| 감각 점수 줄 | `.srow` + `.mbar-name` + `.chip` + `.sdot` 인라인 색·투명도 | 종목마다 `VStack gap={1}`: 머리 `HStack justify="between"`(`Text`, `Badge variant={latest <= 1 ? 'warning' : 'neutral'} label={latest.toFixed(1)}`), 점 줄 `div.ax-sdots` 안 점마다 `<span className="ax-sdot" role="img" aria-label={…그대로} data-tone={tone} data-level={level} />` — `tone`: 기록 없음 `none` / ≤1 `warn` / <2.5 `accent` / 그 위 `ok`(지금 경계 그대로), `level`: `Math.round(score)`(0~3, 기록 없음은 0). `parts.css`가 `data-tone`으로 색(토큰), `data-level`로 불투명도 네 단계(0.4·0.6·0.8·1)를 준다. 지금의 이어진 불투명도(`0.35 + score/3 × 0.65`)를 네 단계로 나눈 것이다 |
| 계속 약한 종목 | `.warn-box` | `Banner status="warning" title="계속 감각이 약한 종목" description={목록 + 안내 문구 그대로}` |
| 대체 수행 | `.card` + `.row` | `Card` + 제목 + `Rows` + `Row`(이름 / `{원래} 대신` / `{n}회`) + 안내 `Text` |

**`chartTheme.ts`** (`src/lib` — 판정 파일이 아니다): `TOKEN`을 Astryx 토큰으로 바꾼다 — `accent: '--color-accent'`, `ok: '--color-text-success'`, `warn: '--color-text-warning'`, `text: '--color-text-primary'`, `dim: '--color-text-secondary'`, `faint: '--color-text-secondary'`, `line: '--color-border'`, `surface: '--color-background-card'`, `surface2: '--color-background-muted'`(지금 `global.css` `:root`의 다리와 **같은 짝** — 화면의 색이 바뀌지 않는다). `FALLBACK`·`chartColor`·`chartTheme`의 모양은 그대로다.

- `global.css`에서 분석만 쓰던 규칙(`.chip-scroll`·`.srow*`·`.sdots`·`.sdot`·`.chart`·`.recharts-surface` 맞춤·`.pill*`·`.warn-box`·`.segment`·`.mbar-name` 가운데 남은 legacy 화면(설정)이 안 쓰는 것)을 지운다. `recharts-surface`가 `global.css`에서 빠지면 인벤토리의 `EXTERNAL_CLASSES` 줄도 뺀다(맞춤이 `parts.css`로 오면 그대로 둔다 — 구현자가 `.recharts-surface` 규칙의 행선지에 따라).

### 검증

- `v121` SS5: `AnalyzeScreen.tsx`에 `className=`은 `ax-` 이름뿐, `style=`·`<button`·`var(--` 0건. 감각 점의 `data-tone`을 정하는 식이 `<= 1`·`< 2.5`의 두 경계를 그대로 쓴다.
- `v121` SS5: `chartTheme.ts`의 `TOKEN` 값이 전부 `--color-`로 시작하고, 아홉 짝이 위 표와 같다.
- `src/lib/properties.test.ts`(구현자가 옮긴다) — **속성:** `chartColor`는 어떤 열쇠에서도 빈 글자를 돌려주지 않는다(문서가 없을 때 `FALLBACK`, 토큰이 비었을 때 `FALLBACK`). 감각 점의 `tone`·`level`을 정하는 순수 함수 `sensoryDot(score: number | null)`(화면 파일 안 — `v121`이 import)에서: 어떤 점수(0~3, null)에서도 `level`은 0~3의 정수이고, 점수가 커지면 `level`이 줄지 않는다(단조).
- 안 고치고 통과: `polish.test.ts`의 AnalyzeScreen 줄(hex 사본 없음), `v120`의 `chartTheme` 스캔.
- `ui-check after --check` — `analyze` `analyze-end` `analyze-375` `analyze-empty`: `안쪽 대칭`·`같은 역할`·`가까움 순서`, `가로 넘침` 0(종목 줄은 가로 스크롤 칸 안이라 뺀다 — v1.20 RR9의 규칙), 차트 색(`inPageChartColors`)이 다크·라이트에서 RR2 때와 같은 토큰으로 풀린다. `analyze-empty`의 `여백 격자` 통과 — 같은 커밋에서 `KNOWN_FAILURES`의 그 항목을 지운다(남기면 `stale`로 실패 — 결함 복원 ㉕). 합계 `알려진 실패 2건`.
- 흐름: ① `SS5 종목 바꾸기`: 둘째 종목 1탭 → 최근 값 줄이 그 종목 이름으로 ② `SS5 지표 바꾸기` ③ `SS5 감각 점 이름`: 점마다 `aria-label`이 있고(0개면 실패) 기록 없는 주는 `기록 없음` ④ `SS5 실행 중 색 체계 전환`: 다크에서 연 채 라이트로 바꾸면 선 차트의 선 색이 라이트 토큰 값으로 바뀐다(새로 고침 없이) ⑤ `SS5 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`.
- 변이 테스트: `npm run mutation`(바뀐 `src/lib` = `chartTheme.ts`) 표를 DEV-RECORD에.
- 결함 복원: ⑭~⑮, ㉕.

### 범위 제외

- 차트를 Astryx로: Astryx 차트 패키지가 준비 단계다(DESIGN 9.5). recharts 그대로.
- 감각 점을 눌러 값을 펼치는 조작: 지금도 없다(코드 주석 "이 라운드 범위 밖").

### README 반영

"Tech Stack"의 Astryx 줄 괄호에 `분석`을 더한다.

---

## SS6. 설정 탭 — 묶음으로 다시 짠다

### 진단

`SettingsScreen.tsx`(인라인 7, legacy 20)와 그 안의 패널 여섯: `RoutineListPanel`(2, 8), `ExportPanel`(1, 10), `GistPanel`(2, 16), `ImportPanel`(2, 14), `RoutineIoPanel`(2, 14), `DietIoPanel`(2, 10). 패널은 설정만 쓴다(`grep "import .*Panel"` — `MealReminderPanel` 말고는 `SettingsScreen.tsx:3-18`뿐).

**배치 판단:** 카드 14장이 묶음 없이 이어진다. 쓰는 때가 다른 것이 섞여 있다 — 헬스장에서 바꾸는 것(소리·템포)이 백업·JSON 사이(일곱째·여덟째)에 묻혀 있다.

| 묶음 (새, 위에서 아래로) | 카드 | 언제 쓰나 |
|---|---|---|
| (머리) | 제목·버전, 시드 문제 배너 | |
| **훈련** | Phase, 활성 루틴(Day 펼침), 루틴 목록 | 몇 주에 한 번 |
| **소리·템포** | 소리 크기(+음악 덕킹·미리 듣기), 템포 가이드(+이완 초·준비 시간) | **헬스장에서** — 위로 올린다 |
| **기록 내보내기·백업** | 내보내기(Markdown·JSON), Gist 백업, 가져오기(JSON 복원) | LLM 분석 때·기기를 옮길 때 |
| **루틴·식단 파일** | 루틴 JSON, 식단 플랜 JSON | 드물게 |
| **진단** | 진단 | 문제가 있을 때 |
| **위험 구역** | 온보딩 다시 보기, 모든 데이터 초기화 | |

묶음 사이는 `Groups`가, 묶음 제목은 `Heading level={2}`가 맡는다. 카드의 내용과 순서(묶음 안)는 지금 그대로다. 새로 보이는 글자는 묶음 제목 다섯뿐이다(`훈련`·`소리·템포`·`기록 내보내기·백업`·`루틴·식단 파일`·`진단`은 지금 카드 제목과 같은 낱말이라 제목이 겹치면 카드 제목을 그대로 두고 묶음 제목을 생략한다 — **진단·위험 구역은 카드 하나뿐이라 묶음 제목 없이 카드 제목만**).

### 설계

| 자리 | 지금 | Astryx |
|---|---|---|
| 틀 | `.screen` | `AxRoot` + `Groups className="ax-settings"`(한글 줄바꿈) |
| 버전 | `p.screen-sub` | `Text color="secondary">v{__APP_VERSION__}</Text>` |
| 시드 문제 | `.banner-danger` | `Banner status="error" title={문구 그대로} collapsible={false}` |
| 선택 하나 (Phase 0~3, 소리 크기 셋, 음악 둘, 이완 초, 준비 시간, 내보내기 기간 다섯) | `.segment`·`.pill-row` + `aria-pressed` | `SegmentedControl label=… value={String(값)} onChange={(v) => …(변환)}` + 항목(문구 그대로). Phase 설명 줄 그대로 |
| 템포 가이드 사용 | `.segment` 둘(`사용`·`사용 안 함`) | `Switch label="템포 가이드 사용" value={tempoGuide} onChange={(on) => void setTempoGuide(on)}` — 켜고 끄기 하나라서(1탭 그대로) |
| 전환 조건 줄 | `.row` + ✓/○ 인라인 색 | `Rows` + `Row label={<HStack gap={2}><Text className={met ? 'ax-text-success' : undefined} aria-hidden="true">{met ? '✓' : '○'}</Text><Text>{label}</Text></HStack>} description={detail} end={insufficient ? <Badge variant="neutral" label="기록 부족" /> : null}` |
| 활성 루틴 | `.row` + `btn` + Day마다 `button.row` 펼침 + 인라인 테두리·`fontSize: 14` | `Card`: `Row label={이름} description={id} end={<HStack gap={2}><Text color="secondary">v{버전}</Text><Button variant="secondary" size="sm" label="편집" isDisabled={openSession !== null} onClick={…} /></HStack>}`, 진행 중 안내 `Text type="supporting"`, Day마다 `Collapsible trigger={<Row label={Day 이름} description={부위 세트} end={`${n}세트`} />}` 안 `Rows`(종목 줄: `{순서}. {이름}` + 그룹 `Badge neutral` + 선택 `Badge warning` / 부위·메모 / `세트×반복`·`휴식초`) — 펼침 표시 ▾▸는 `Collapsible`의 것 |
| 루틴 목록 (`RoutineListPanel`) | `.row` + `btn`·`btn-danger` + 인라인 테두리 | `Card` + 제목 + `Rows`: 루틴마다 `Row label description end={<HStack>[이 루틴 쓰기] [삭제 variant="destructive"]</HStack>}`, 확인 상태는 그 줄 아래 `VStack`(문구 `Text` + `HStack`[바꾸기/삭제, 취소]), `Button variant="secondary" label="＋ 새 루틴 만들기"` |
| 내보내기 (`ExportPanel`) | `.pill-row` + `btn` + `pre.preview` | 기간 `SegmentedControl`, 범위 줄 `Text`, 소제목 `Text weight="semibold"` 둘, 버튼 `HStack`(`공유` primary, `복사`, `미리보기`/`닫기`), 미리보기 `CodeBlock code={preview} isWrapped maxHeight="40vh" hasCopyButton={false}`, `백업 파일 공유`, 안내·상태 `Text`(상태는 `color="accent"` — 지금 `var(--accent)`) |
| Gist (`GistPanel`) | `.ext-link`·`input.field`·`.row`·`.warn-box`·인라인 색 | 토큰 없음: 안내 `Text`, `Link href={TOKEN_HELP} isExternalLink>GitHub에서 토큰 발급하기</Link>`, `TextField type="password" label="GitHub 개인 액세스 토큰" isLabelHidden placeholder=…`, `Button variant="primary" label={busy ? '확인 중…' : '토큰 저장'}`. 토큰 있음: `Rows`(토큰 저장됨 / 마스킹 `Text type="code"` / 계정, 연결된 Gist, 마지막 백업), 버튼 줄, 복원 미리보기 `Banner status="warning" title="Gist 백업 내용" description=…` + 2단 확인(`variant="destructive"`), 토큰 삭제·연결 해제, 동기화 상태 `Text`(오류면 `ax-text-error`, 아니면 `color="accent"`), 안내 |
| 가져오기 (`ImportPanel`) | `.banner-danger`·`.row`·인라인 색 | 문제 `Banner status="error" title="불러올 수 없는 파일입니다" description={목록}`, 고르기 `Button variant="secondary" label="백업 파일 선택"` + 안내(굵은 "전부 교체"), 고른 뒤 `Rows`(파일 이름·내보낸 시각, 세션 범위·수, 루틴/종목) + 2단 확인(`이 파일로 교체`·`정말 교체` — `variant="destructive"`, 문구 `ax-text-error`) |
| 루틴 JSON·식단 플랜 JSON | `.banner-*`·`.row`·`btn` | 문제 `Banner status="error" title="정합성 검사 실패 — 가져오지 않았습니다" description={목록}`, 고른 뒤 `Row`/`Banner status="info"`(이름·요약), 버튼 `HStack`, 상태 `Text color="accent"` |
| 진단 | `.row` ×9 + 인라인 색 | `Card` + 제목 + `Rows` + `Row`(제목 / 보조 줄 / 값 — 값은 `Text hasTabularNumbers`), 시드 문제 줄 `Text className="ax-text-error"` |
| 위험 구역 | `btn`·`btn-danger` + 인라인 색 | `Button variant="secondary" label="온보딩 안내 다시 보기"`, `Button variant="destructive" label="모든 데이터 초기화"` → 문구 `ax-text-error` + 취소/`정말 삭제` |

- 로직(설정 저장, `phaseReadiness`, `navigator.storage.estimate`, 오디오 미리 듣기·`unlockAudio`, 패널 안의 내보내기·검증·적용·복원·토큰 처리)은 한 줄도 안 바꾼다. 패널의 파일 이름과 내보내는 함수 모양(`export default function XxxPanel(props)`)도 그대로.
- `global.css`에서 설정과 패널만 쓰던 규칙(`.segment`·`.pill*`·`.row*`·`.btn*`·`.banner*`·`.card*`·`.field`·`.mono`·`.ext-link`·`.preview`·`.warn-box`·`.day-exercises`·`.row-confirm` 등 — 이 작업 뒤 온보딩만 남으므로 온보딩이 쓰는 것만 남는다)와 `space.css`의 `.meal-note`·`.row-confirm`·`.day-exercises`·`.row.row-plain` 유틸을 지운다. 넷째 숫자 0.
- 검사: `줄 안 버튼`을 "`Row`의 오른쪽 칸 안 Astryx 버튼(폭 < 줄 폭의 절반, 한 줄)"으로 바꾸고 `rowButtonStaticChecks`(`global.css`의 `.row > .btn` 규칙)를 지운다("확인한 것" 4). 0개면 실패는 그대로 — `settings`·`settings-routines`에서 잰다.

**탭 수:** 모든 설정 하나 바꾸기 1탭 그대로(SegmentedControl·Switch). 미리 듣기·내보내기·백업·복원·삭제의 단계 수 그대로. Day 펼치기 1탭 그대로.

### 검증

- `v121` SS6: 일곱 파일에 `className=`은 `ax-` 이름뿐, `style=`·`<button`·`<input`·`<a `·`<pre`·`var(--`·`padding=` 0건.
- `v121` SS6 — 순서: 주석을 뗀 `SettingsScreen.tsx`에서 `Phase` < `<RoutineListPanel` < `소리 크기` < `템포 가이드` < `<ExportPanel` < `<GistPanel` < `<ImportPanel` < `<RoutineIoPanel` < `<DietIoPanel` < `진단` < `위험 구역`.
- `v121` SS6: `SettingsScreen.tsx`에 `<Switch`가 하나(`템포 가이드 사용`), `<SegmentedControl`이 다섯(Phase·소리 크기·음악·이완 초·준비 시간)이고 `A_ECCENTRIC_OPTIONS.map`·`COUNT_IN_OPTIONS.map`이 그 안에 있다.
- `EXPECTED_PAIRS`(`scripts/lib/ui-space.mjs`): `settings`를 `['bar', 'tab-indicator', 'tab-content', 'button', 'card']`로(지금 값에 둘을 더한다), 나머지 설정 장면 아홉(`settings-375`·`settings-open`·`settings-end`·`settings-routines`·`settings-routines-375`·`settings-routines-confirm-375`·`settings-gist`·`settings-export-preview`·`settings-reset-confirm`)을 `['button', 'card']`로(이 표는 "종류마다 1쌍 이상"을 요구하는 최소 목록이다 — 띠 쌍은 v1.20이 `settings`에서만 기대했으니 그대로 둔다. 뱃지는 Day를 펼친 장면에만 있어 기대에 넣지 않는다 — 넣으면 펼치지 않은 장면이 0개로 실패한다). 그 장면들을 `SYMMETRY_JUDGED`에 더한다.
- 옮긴 스캔: `polish` BB5(버전 줄), `v116` NN2(편집 `isDisabled`)·NN4(루틴 삭제 `destructive`), `scripts/ui-space.test.mjs:44`(목록에서 `settings`를 빼고 `expect(EXPECTED_PAIRS.settings).toEqual(['bar', 'tab-indicator', 'tab-content', 'button', 'card'])`를 따로). 안 고치고 통과: `soundCancel`(`템포 경계음 미리 듣기`·`previewTempoTones(`), `v18` CC16, `v116`의 나머지, `backupTime`·`dietExport`, `scripts/legacy-scope.test.mjs`의 RRM 줄(유리 글자 없음).
- `ui-check after --check` — `settings` `settings-375` `settings-open` `settings-end` `settings-routines` `settings-routines-375` `settings-routines-confirm-375` `settings-gist` `settings-export-preview` `settings-reset-confirm`: `안쪽 대칭`·`같은 역할`·`가까움 순서`(묶음 사이 > 카드 사이), `줄 안 버튼`(새 정의), `가로 넘침` 0(미리보기 칸 안은 뺀다), 접근성 0. `settings-export-preview`의 `접근성`(`scrollable-region-focusable`)·`눌림 반응`(`.ext-link`) 통과 — 같은 커밋에서 `KNOWN_FAILURES`의 남은 두 항목을 지워 **빈 배열**로 하고, `scripts/ss0.test.mjs`의 "목록은 늘지 않는다"를 "빈 배열이다"로 좁힌다. 합계 `알려진 실패 0건`.
- 흐름: ① `SS6 Phase 바꾸기`: Phase 1 1탭 → 설명 줄이 바뀌고, 다시 0으로(끝에 되돌린다) ② `SS6 템포 가이드 켜기`: 스위치 1탭 → 세션 화면의 세트 행에 ♩ 버튼이 생긴다(끝에 끈다) ③ `SS6 미리 듣기`: 버튼 1탭에 예외 없음(소리는 못 듣는다 — 제약 2) ④ `SS6 Day 펼치기` ⑤ `SS6 내보내기 미리보기`: 미리보기 1탭 → Markdown 칸에 `## ` 줄이 있다 → 닫기 ⑥ `SS6 초기화 2단 확인`(취소로 끝낸다) ⑦ `SS6 Gist 저장됨`: 마스킹된 토큰 줄이 보이고 토큰 원문이 화면 글자에 없다 ⑧ `SS6 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안` ⑨ `SS6 오류·성공 글자색`: 전환 조건 ✓의 계산된 색 = 성공 토큰, 초기화 확인 문구 = 오류 토큰(다크·라이트).
- 경계: 루틴이 하나뿐(삭제 버튼 없음), 진행 중 세션(편집·이 루틴 쓰기·새 루틴 비활성 + 안내), Phase 3(전환 조건 없음), 전환 조건 전부 충족(전환 버튼), 시드 문제 있음, 저장 공간 모름(`—`).
- 결함 복원: ⑯~⑱.

### 범위 제외

- 설정을 여러 화면(하위 화면)으로 나누기: 묶음과 제목으로 충분하고, 나누면 화면 사이 이동이 생긴다(DESIGN 9.1의 5가 허용하지만 이득이 탭 수 증가보다 작다).
- 진단·JSON 묶음을 접기: 화면 검증·실기기에서 진단 값을 읽어 알려 주는 일이 있다(README Limitations "소리가 하나도 안 들릴 때 ① 설정 → 진단"). 펼쳐 둔다.
- 패널의 동작·문구: 안 바꾼다.

### README 반영

- "Tech Stack"의 Astryx 줄 괄호에 `설정`을 더한다.
- `README.md` Limitations "소리가 하나도 안 들릴 때 … ① 설정 → 진단의 **오디오** 행"은 그대로 맞다(진단 카드가 남는다) — 고치지 않는다.

---

## SS7. 온보딩

### 진단

`Onboarding.tsx`(인라인 3, legacy 11). 뿌리 클래스 `.onboarding`이 legacy 뿌리 목록에 있다.

### 설계

| 자리 | 지금 | Astryx |
|---|---|---|
| 틀 | `div.onboarding` | `AxRoot` + `Groups className="ax-onboarding"`(한글 줄바꿈) |
| 제목·소개 | `h1`·`p.lede` | `Heading level={1}` "운동 기록", `Text type="large" color="secondary"`(문구 그대로) |
| 홈 화면 앱 | `.card` + 인라인 초록 테두리·색 | `Banner status="success" title="준비 완료" description="홈 화면 앱으로 실행 중입니다. 기록이 안전하게 보관됩니다." collapsible={false}` |
| 1단계 | `.card-label` + `ol.steps` | `Heading level={2}` "1단계 — 홈 화면에 추가", `List listStyle="decimal"` + `ListItem label={…굵은 글자 그대로}` 셋 |
| 7일 삭제 경고 | `.warn-box` | `Banner status="warning" title="Safari 탭으로 쓰면 기록이 사라질 수 있습니다." description={문구 그대로} collapsible={false}` |
| iOS 아님 | `p.row-sub` | `Text type="supporting" color="secondary"` |
| 주소 | `.card` + `.mono` | `Card` + 제목 + `Text type="code"`(긴 주소가 카드 안에서 줄바꿈 — `안쪽 폭`이 본다) |
| 시작 | `.spacer` + `btn-primary` + 인라인 가운데 | 마지막 묶음: `Button variant="primary" size="lg" width="100%" label={…그대로}`, 안내 `Text type="supporting" color="secondary" justify="center"` |

- legacy 뿌리 목록(`global.css`·`ax.css` 두 줄)에서 `.onboarding`을 뺀다. `global.css`의 `.onboarding*`·`.lede`·`.steps`·`.spacer` 등 온보딩만 쓰던 규칙을 지운다.

### 검증

- `v121` SS7: `Onboarding.tsx`에 `className=`은 `ax-onboarding`뿐, `style=`·`<button`·`var(--` 0건. 문구 목록(제목·소개·단계 셋·경고·주소·버튼 둘·안내)이 있다.
- `scripts/ss7.test.mjs`: `global.css`·`ax.css`의 legacy 뿌리 목록이 같고 `.onboarding`이 없다.
- `ui-check after --check` — `onboarding` `onboarding-375` `onboarding-standalone`: `안쪽 대칭`·`같은 역할`(화면 좌우·카드 안쪽이 다른 화면과 같다), `가로 넘침` 0(주소 줄 포함), 접근성 0.
- 흐름: ① `SS7 시작하기`: 버튼 1탭 → 홈 ② `SS7 <장면> 390·375 폭 글자 중간 꺾임 없음·안쪽 폭 안`.
- 결함 복원: ⑲.

### 범위 제외

- 온보딩 내용(단계·경고 문구): 안 바꾼다.

### README 반영

"Tech Stack"의 Astryx 줄을 `UI 부품: Astryx 0.7.13 (@astryxdesign/core, 베타 — 버전 고정. 모든 화면)`으로.

---

## SS8. legacy CSS 삭제와 마무리

### 진단

SS7 뒤 legacy 화면이 없다. 남는 것: `src/styles/`의 네 파일(`global.css`의 다리 토큰·문서 바탕·`@scope` 블록, `motion.css`의 눌림 덮개, `space.css`의 토큰), `index.css`의 `legacy` 레이어, `ax.css` 리셋의 `@scope … to (legacy 뿌리)`, Astryx 섬 `ax-scope`(`ExerciseCard`·`NumberStepper`·`DietDayEditor` — 세트 행의 열 배치 규칙 `parts.css:278-293`이 이 이름에 걸려 있다), `.ax-screen`의 좌우 여백이 `space.css`의 `--inset-screen`을 읽는다(`ax.css:178`), 시트 이름·화면 틀로 흩어진 한글 줄바꿈 규칙, 루틴 편집의 인라인 5(`RoutineEditorScreen.tsx:218-289` — `GROW`·`{ flex: 1, minWidth: 0 }`), 그리고 legacy를 재는 검사 도구("확인한 것" 4).

### 설계

| 무엇 | 어떻게 |
|---|---|
| `src/styles/` | **폴더째 지운다.** `main.tsx`의 `import './styles/index.css'`를 지운다 |
| 레이어 순서 | 새 파일 `src/ax/layers.css` 한 줄: `@layer reset, astryx-base, astryx-theme;`. `src/ax/index.tsx`의 **첫** import(`astryx.css`보다 앞) — 지금 `index.css`가 맡던 "처음 선언된 순서가 이긴다"를 그대로 잇는다(`legacy`만 빠진다) |
| 문서 바탕 | `global.css`의 `html, body`·`*`·`#root` 규칙 가운데 Astryx가 안 정하는 것을 `ax.css`의 "문서 바탕" 블록으로: `-webkit-tap-highlight-color: transparent`, `body { overscroll-behavior-y: none }`(홈 화면 앱의 바운스), `#root { min-height: 100dvh }`. 글꼴·글자 크기·줄 높이·색·`box-sizing`은 테마·리셋이 이미 정한다(옮긴 화면이 `--same-layout`으로 증명한다) |
| `ax.css` 리셋 | `@scope (html, .ax-scope) to (…)` 감싸기를 걷어 `@layer reset { … }` 안의 맨 규칙으로(명시도 0은 `:where()`가 그대로 지킨다). 머리 주석의 "legacy 뿌리 목록" 문장을 지운다 |
| `.ax-screen` 좌우 | `var(--inset-screen)` → `var(--spacing-4)`(16px — 지금과 같은 길이). 위·아래의 `12px`·`24px` 리터럴도 `var(--spacing-3)`·`var(--spacing-6)`로 |
| Astryx 섬 | `ax-scope` 이름을 없앤다. `NumberStepper`·`ExerciseCard`의 `ax-scope`는 세트 행 열 배치의 걸이이므로 이름을 `ax-stepper`로 바꾸고 `parts.css:278-293`의 선택자를 같이 바꾼다(`.set-row > .ax-stepper` …). `DietDayEditor`의 감싸기 `div`는 지운다. 인벤토리의 `BOUNDARY`(`ax-scope`)를 지운다 |
| 한글 줄바꿈 | 흩어진 규칙(`dialog[aria-label='Day 선택']`, 시트 여덟·식단 시트 넷 목록, `.ax-summary`·`.ax-tip`·`.ax-diet`·`.ax-history`·`.ax-analyze`·`.ax-settings`·`.ax-onboarding`)을 `parts.css`의 한 규칙으로: `:is(.ax-screen, dialog) :is(p, span, div, h1, h2, h3, li) { word-break: keep-all; overflow-wrap: anywhere; }`. 화면 틀의 `className`(`Groups className=…`)을 지우고 `Groups`의 `className` 속성도 지운다(쓰는 곳 0) |
| 루틴 편집 인라인 5 | `style={GROW}` 둘 → 두 버튼을 `HStack` 안 `StackItem size="fill"`로, `Heading … style={{ flex: 1, minWidth: 0 }}` → `StackItem size="fill"`로 감싼 `Heading`, `div style={{ flex: 1, minWidth: 0 }}` 둘 → `StackItem size="fill"`. 화면은 같다(`--same-layout=editor,line-sheet`) |
| `scripts/astryx-inventory.mjs` | legacy 정의를 바꾼다: ① `src/styles/`가 있으면 **실패**("legacy CSS가 되살아났다") ② 셋째 칸 "legacy 클래스" → **"정의 없는 클래스"**: `.tsx`의 `className` 글귀에 나오는 이름 가운데 `src/ax/parts.css`·`ax.css`의 클래스 선택자에 없는 것(템플릿 접두사 허용 목록은 이유와 함께 — 지금은 0개가 목표) ③ 넷째 숫자 → **"안 쓰는 parts.css 선택자"**: `parts.css`의 클래스 가운데 `src/**/*.{ts,tsx}`(테스트 제외)에 낱말로 안 나오는 것. `--check`는 넷 다 늘면 실패. 머리 주석과 `docs/ASTRYX-INVENTORY.md` 표 머리를 새 정의로 |
| 검사 도구 | "확인한 것" 4의 SS8 줄: `눌림 반응`·움직임 정적 검사·`섬 버튼`·`ui-space.mjs`의 정적 검사와 legacy `.card`·`.screen` 갈래를 지운다. 지운 칸 이름을 DEV-RECORD에. `inPageLastVisible`·`inPageInnerOverflow`의 `.screen` 대안을 지운다. 빈 `KNOWN_FAILURES`·`applyKnownFailures`와 그 테스트도 지운다(개정 1 — 지운 테스트 이름을 DEV-RECORD에) |
| 스캔 테스트 | "확인한 것" 3의 SS8 줄을 옮긴다. 한글 줄바꿈 규칙을 모으면서 깨지는 것도 같은 뜻으로 옮긴다: `scripts/rr5-wrap.test.mjs`(Day 선택 시트의 규칙)·`rr8.test.mjs`(시트 여덟의 이름 목록)·`rr9.test.mjs`(`.ax-summary` 선택자)·`v120.test.ts` RR9(요약의 `className` 이름 둘 — `ax-summary`가 빠지고 `ax-text-warning`만) → "`parts.css`의 한 규칙이 `.ax-screen`과 `dialog`를 덮는다". `scripts/legacy-scope.test.mjs`는 RRM·RR11 줄(유리 글자 없음, `color-scheme`) 가운데 아직 뜻이 있는 것을 `scripts/ss8.test.mjs`로 옮기고 파일을 지운다 |
| `docs/ASTRYX-INVENTORY.md` | `--write` |
| 기록 | `docs/DEV-RECORD-v1.21.md`, `package.json` **1.21.0** |

### 검증

- `scripts/ss8.test.mjs`: `src/styles`가 없다. `main.tsx`가 `.css`를 import하지 않는다. `src/ax/index.tsx`의 첫 import가 `./layers.css`이고 그 파일이 `@layer reset, astryx-base, astryx-theme;` 한 줄이다. `ax.css`에 `@scope`가 없고 `--inset-`·`--space-`·`px` 리터럴(`1px`·`0`·`env()` 외)이 없다. `parts.css`에 `ax-scope`·`aria-label=`(시트 이름 규칙)이 없고 한글 줄바꿈 규칙이 정확히 하나다. `src`에 `ax-scope` 글자가 0건이다.
- `v121` SS8: `.tsx` 전부에 `style=`이 0건(`RoutineEditorScreen.tsx` 포함). `Groups`가 `className`을 안 받는다.
- `astryx-inventory --check`: **0 · 0 · 0 · 0**(합계 줄). 결함 복원 ㉑로 "정의 없는 클래스"가 1이 되면 실패하는 것을 본다.
- 옮긴 스캔: `v117`(main은 CSS를 안 읽는다), `v119`(유틸 클래스 없음), `uiConsistency`(CSS `?raw`는 `parts.css`로), `scripts/rr3`·`rr7`·`rr8`·`rr10`의 CSS 줄.
- `ui-check after --check --same-layout=all` — **전 장면이 직전 커밋(SS7)의 배치 기록과 같다**(CSS를 지운 것이 화면을 안 바꿨다). 다른 요소가 있으면 멈추고 자리를 보고한다. 단 한글 줄바꿈 규칙을 넓힌 곳에서 꺾이는 자리가 단어 사이로 옮겨 간 줄은 허용하고 DEV-RECORD에 장면·요소를 적는다(모양이 좋아지는 쪽만 — 글자 중간 꺾임이 0이어야 한다).
- `ui-check after --check`: 전 장면 다크·라이트 통과, 접근성 serious·critical 0, 흐름 실패 0, 종료 코드 0. `같은 역할`이 모든 화면(`home`·`session`·`summary`·`diet`·`history`·`analyze`·`settings`·`onboarding`·`editor`)에서 한 값.
- `npm run build && node scripts/first-load.mjs --check`: 360KB 이하(예상 약 345KB). `first-screen.mjs` 값과 함께 DEV-RECORD에.
- `npm run check` 통과(첫 화면 크기 포함).

### 범위 제외

- `src/ax/index.tsx`를 여러 파일로 나누기: SS1 범위 제외와 같다.
- 스플래시 그림·매니페스트의 어두운 색: v1.20 RR11의 범위 제외 그대로.

### README 반영

- "핵심 설계 결정"의 `**Astryx 테마는 앱 뿌리에 한 번 걸고, 안 옮긴 화면의 CSS는 범위를 가둔다**` 항목을 `**Astryx 테마는 앱 뿌리에 한 번 걸고, 앱 CSS는 `src/ax`의 두 파일뿐이다**`로 바꾸고 본문을: "테마(`src/ax/theme.ts`)와 기본 크기는 `AppRoot`가 앱 전체에 한 번 겁니다. 화면은 `src/ax/`의 부품만 가져다 쓰고, Astryx 버전은 정확한 값으로 고정합니다(베타). 앱이 쓰는 CSS는 Astryx의 것과 `src/ax`의 `ax.css`(범위 한정 리셋 사본·문서 바탕)·`parts.css`(Astryx에 없는 이 앱만의 부품 — 세트 표, 요일 점, 달력 칸, 띠, 템포 무대)뿐이고, 레이어 순서는 `src/ax/layers.css` 한 줄이 정합니다. 손으로 짠 CSS(`src/styles/`)는 v1.21에서 없앴고, `node scripts/astryx-inventory.mjs --check`가 되살아나지 않게 지킵니다."
- `**눌림과 움직임은 Astryx 테마의 값을 따르고, "동작 줄이기"를 존중한다**` 항목의 둘째~넷째 문장(legacy 버튼의 덮개, `motion.css`가 정한다, 사본)을 지우고 "버튼의 눌림, 시트가 올라오고 내려가는 움직임은 Astryx 부품의 것입니다."로. `touchstart` 처리기·"동작 줄이기"·움직이는 속성 문장은 그대로. 마지막 괄호 "(`opacity`가 1보다 작은 조상은 시트의 흐림을 끊습니다)"는 유리가 없어 뜻이 없으므로 지운다.
- `**여백은 역할 토큰 한 벌이다**` 항목을: "간격 단위는 Astryx의 간격 단계(`--spacing-*`)이고, 묶음 사이·카드 사이·카드 안쪽은 `src/ax`의 `Groups`·`Group`·`Card`가 정합니다(화면은 숫자를 적지 않습니다). 화면 좌우는 `.ax-screen` 한 곳입니다. `.tsx`에 인라인 스타일을 적지 않습니다(`astryx-inventory`가 지킵니다). 검사는 값이 아니라 관계를 잽니다 — 안에 든 요소가 바깥 요소 안에서 대칭인가, 같은 역할의 간격이 화면 사이에서 같은가(`node scripts/ui-check.mjs`의 `안쪽 대칭`·`같은 역할`)."
- 같은 절에 한 항목을 더한다: `**한글은 단어 사이에서만 줄을 바꾼다**` — "한글은 기본이 음절 단위 줄바꿈이라 375 폭에서 `기/록`처럼 글자 중간에서 꺾입니다. 화면과 시트의 글은 `parts.css`의 한 규칙(`word-break: keep-all`, 한 단어가 줄보다 길 때만 `overflow-wrap: anywhere`)으로 단어 사이에서만 꺾고, `ui-check`의 흐름이 390·375 폭에서 글자 중간 꺾임을 셉니다."
- Limitations 530줄을: "앱 전체가 폰의 라이트/다크 설정을 따릅니다. 앱을 여는 순간의 스플래시는 늘 어둡습니다. iOS 17.5 이상이 필요합니다."
- "프로젝트 구조"의 `ax/` 줄 끝에 `, 레이어 순서(\`layers.css\`)`.

---

## 화면 검증 (화면 검증자 — `agents/SCREEN-CHECKER.md`)

작업마다 `node scripts/ui-check.mjs after --check --ver=v1.21 --only=<장면>`의 표와 스크린샷(다크·라이트)을 본다. 구현자는 작업 커밋마다 `after`를 찍고 `node scripts/argos-upload.mjs after`의 출력을 DEV-RECORD와 화면 검증 보고에 적는다. v1.20의 원칙 그대로: **스크린샷이나 검사로 볼 수 있는 것은 여기서 본다**. 사람에게 넘기는 것은 끝의 목록뿐이다.

| 작업 | 장면 (각각 다크·라이트) | 볼 것 |
|---|---|---|
| SS0 | 새 장면 전부(`before`) | 장면이 의도한 상태인가(시트가 열려 있다, 폼이 펼쳐져 있다, 끝까지 스크롤됐다) — 장면이 틀리면 뒤 작업의 비교가 뜻이 없다 |
| SS1 | `home` `session` `sheet-home` `diet` `settings` | `before`와 같은가(화면이 안 바뀌어야 한다). 새로 고침 직후 [변경]을 눌렀을 때 시트가 뜨는 한 장 |
| SS2 | `diet` `diet-end` `diet-375` `diet-log-open` `diet-streak` `history-day` `history-detail-end` | 끼니 원형 버튼의 등급 표시가 다섯 색으로 구분되는가(다크·라이트), 품목 체크의 눌린 상태가 한눈에 보이는가, 먹은 것 줄의 시각·스테퍼·삭제가 한 줄에서 어긋나지 않는가(375), 식사 알림이 닫혀 있는가, 기록 화면 안의 편집기가 legacy 화면과 어색하게 섞이지 않는가 |
| SS3 | `sheet-food` `sheet-food-new` `sheet-diet-plan` `sheet-diet-plan-ahead` `sheet-diet-slot` `sheet-diet-slot-edit` `sheet-diet-variant`(끝까지 스크롤) | 고른 줄(✓ 아이콘·선택 면)·라디오의 고른 상태, 하단 닫기 버튼이 다크에서 버튼으로 보이는가, 음식 목록의 스크롤 칸 끝, 긴 음식 이름, 375 |
| SS4 | `history` `history-375` `history-day` `history-exercise` `history-exercise-detail` `history-detail` `history-detail-end` `history-detail-change` `history-detail-edit` | **달력 칸: 오늘·고른 날·🔥·식단 점이 서로 구분되는가**(v1.9의 "테두리 = 오늘·선택, 점 = 식단"), 날짜 글자 `N일`이 375 폭에서 칸 안에 들고 🔥과 겹치지 않는가(개정 2), 다른 달의 칸이 흐린가, 세션 카드의 볼륨이 오른쪽에서 접히지 않는가, 기록 키가 카드 안에서 넘치지 않는가, Day 변경의 재매핑 표 |
| SS5 | `analyze` `analyze-end` `analyze-375` `analyze-empty` | 종목 줄의 가로 스크롤과 고른 종목, 차트 축·선 색(다크·라이트), 감각 점 네 단계가 구분되는가, 경고 배너 |
| SS6 | `settings` `settings-375` `settings-open` `settings-end` `settings-routines*` `settings-gist` `settings-export-preview` `settings-reset-confirm` | **묶음 사이가 카드 사이보다 넓어 묶음이 읽히는가**, 소리·템포가 화면 둘째 장 안에 오는가, Phase·소리 크기의 선택 상태, 템포 스위치, 루틴 줄의 버튼이 한 줄, 미리보기 칸, 토큰 마스킹 |
| SS7 | `onboarding` `onboarding-375` `onboarding-standalone` | 경고·준비 완료 배너, 단계 번호, 긴 주소가 카드 안에서 줄바꿈 |
| SS8 | 전 장면 | SS7과 같은 모양인가(다크·라이트 짝 전부). 다르면 자리를 적는다 |

**팔 뻗은 거리:** 식단 탭(`diet`)을 50%로 줄여 본다 — 끼니마다 등급 표시와 "전부 먹음"을 눌렀는지가 읽히는가.

**정말 폰에서만 볼 수 있는 것** (v1.20 목록에 더하는 것만)

| 무엇 | 왜 흉내로 못 보나 |
|---|---|
| 먹은 시각 칸을 누르면 iOS의 시각 휠이 뜨고, 고른 시각이 칸에 들어가는가 | OS의 시각 고르기는 흉내에 없다 |
| 앱을 완전히 닫았다 열 때 첫 화면이 v1.20보다 빠른가(느려지지 않았는가), 탭을 처음 눌렀을 때 "불러오는 중"이 눈에 띄게 보이는가 | 폰의 속도 |
| Gist의 "GitHub에서 토큰 발급하기 ↗"가 Safari로 열리는가(홈 화면 앱에서) | 외부 링크의 앱 전환 |

---

## 데이터 이전

없다. IndexedDB(Dexie 3)·Gist 백업(`SCHEMA_VERSION` 3)·설정·localStorage(휴식 타이머의 종료 시각, 밀린 백업 표시, Gist 토큰)에 새 키도, 바뀌는 값도 없다. 식사 알림의 끼니 고르기·접힘 상태는 지금처럼 저장하지 않는다(화면을 열 때마다 기본값).
옛 백업을 복원하거나, 이 버전에서 만든 백업을 v1.20으로 가져가도 그대로 읽힌다.

## 되돌리기

| 폰에서 본 것 | 방법 |
|---|---|
| 앱이 안 열린다·흰 화면 | PR 전체를 되돌린다(`git revert -m 1 <머지 커밋>`을 PR로). 서비스워커가 다음 실행에서 "새 버전이 준비됐어요"로 예전 화면을 받는다. 데이터는 그대로 |
| 탭을 처음 누를 때 "불러오는 중"이 거슬린다 | `App.tsx`의 `PRELOAD_DELAY_MS`를 줄이거나(0이면 첫 화면이 뜬 직후), 그 화면을 `LOADERS`에서 정적 import로 되돌린다(한 줄). 첫 화면 크기 기준(360KB)을 넘으면 `first-load.mjs`의 상수를 사람이 정한다 |
| 오프라인에서 어떤 탭이 안 열린다 | precache 목록을 본다(`dist/sw.js`). 급하면 SS1 커밋을 `git revert`(모든 화면이 다시 정적 — 첫 화면이 474KB로 돌아가고 `first-load --check`가 실패하므로 그 상수도 같이 되돌린다) |
| 식단 탭의 새 모습이 불편하다 / 식사 알림이 닫혀 있는 게 불편하다 | SS2 커밋을 `git revert`(식단 탭이 legacy로 — `global.css`의 지운 규칙이 같이 돌아온다). SS8 뒤에는 SS8도 같이 되돌려야 한다(아래). 알림만이면 `Collapsible`에 `defaultIsOpen`(한 줄) |
| 설정의 묶음 순서가 불편하다 | `SettingsScreen.tsx`의 JSX 순서만 고친다(로직과 무관) |
| 어떤 화면의 모양이 깨졌다(라이트·다크 한쪽) | 그 화면과 자리를 이슈로. 고칠 자리는 그 화면의 부품 속성이거나 `parts.css`의 그 규칙 하나 |
| 기록 달력의 칸 구분이 헷갈린다 | `parts.css`의 `.ax-cal-*` 규칙(오늘·고른 날·점의 색) |

작업별로는 구현 순서의 거꾸로(SS8 → SS7 → … → SS1 → SS0) `git revert`할 수 있다(각 작업이 커밋 하나). **SS8을 남긴 채 SS2~SS7 하나만 되돌리면 안 된다** — SS8이 legacy CSS를 지웠으므로 되돌린 화면의 클래스가 아무 데도 안 걸린다. 그때는 SS8을 먼저 되돌린다. SS1은 어느 시점에서나 따로 되돌릴 수 있다(화면 코드와 겹치는 곳이 `App.tsx`의 import 줄과 `Sheet`의 지연뿐이다).

**단계마다 배포할 수 있는 상태로 끝난다:** SS0(도구만) → SS1(분할 — 화면 같음) → SS2~SS7(화면 하나씩. 안 옮긴 화면은 legacy CSS가 그대로 그리고, 옮긴 부품이 legacy 화면 안에 놓이면 `ax-scope` 섬이 막는다 — v1.20과 같은 방식) → SS8(정리). 실제 배포는 PR 하나다.

---

## 과거 판정 불변

바뀌지 않는 것: 기록·판정·내보내기·가져오기·백업 전부. `git diff --stat main..HEAD -- src/db src/store`가 비어 있다. `src/lib`에서 바뀌는 것은 `chartTheme.ts`의 `TOKEN` 아홉 값(같은 색을 다리 없이 직접 읽는다 — SS5), 새 테스트 `v121.test.ts`, "확인한 것" 3의 스캔 옮김, `properties.test.ts`에 더하는 속성뿐이다. 골든 테스트(`v113`~`v117`의 내보내기 글자)는 **한 글자도 안 고치고** 통과한다. `diet.ts`·`dietOps.ts`·`history.ts`·`analysis.ts`·`phaseReadiness.ts`·`backup.ts`·`gist.ts`는 고치지 않는다.

달라지는 것(판정이 아니라 화면·읽는 시점):

| 무엇 | 전 | 후 |
|---|---|---|
| 식단·기록·분석·설정·온보딩의 모양 | 손으로 짠 CSS(모서리·여백이 옮긴 화면과 다르다) | Astryx 부품과 테마 한 벌(홈·세션과 같다) |
| 처음 여는 순간 읽는 코드 | 약 474KB(gzip) | 360KB 이하(예상 약 345KB) |
| 탭을 처음 누를 때 | 바로 그려진다 | 홈이 뜬 1초 안이면 잠깐 "불러오는 중"(그 뒤는 미리 읽혀 바로) |
| 시트를 처음 열 때 | 바로 | 홈이 뜬 1초 안이면 시트 부품을 읽고 뜬다 |
| 식단 시트에서 플랜·단백질원·끼니 동작을 고르면 | 바로 사라진다 | 내려가며 닫힌다(닫기 버튼과 같은 길) |
| 끼니 시트·먹은 것 추가 시트 | 막을 누르면 닫힌다 | 막 누름·끌어내림으로 안 닫히고 닫기 버튼·Esc로만(입력칸이 있는 시트 — v1.20 개정 4의 규칙) |
| 식사 알림 | 늘 펼쳐져 있다 | 처음에는 접혀 있다(1탭에 펼침) |
| 끼니 원형 버튼·품목 | 손으로 그린 원·☐☑ | Astryx 토글 버튼(눌린 상태 + 체크 아이콘). 등급 글자(○◐● 등)와 색은 그대로 |
| 먹은 시각 칸 | 브라우저 시각 칸 | OS 시각 고르기(`TimeInput` native) |
| 끼니 시트의 "어느 쪽이었나요" | ✓ 버튼 셋 | 라디오 셋 |
| 기록 탭의 세션 줄·종목 줄 | 카드 하나 안의 줄 | 줄마다 누르는 카드 한 장 |
| 기록 상세의 순서 | … 메모 → Day 변경 → 위험 구역 → 그날 식단 → 기록으로 | … 메모 → **그날 식단** → Day 변경 → 위험 구역 → 기록으로 |
| 달력 칸의 보이는 날짜 | `17` | `17일`(개정 2 — 아래 접근성 이름과 낱말을 맞춘다) |
| 달력 칸의 접근성 이름 | 보이는 글자(`17🔥2`) | `17일 운동 2회 식단 준수` 꼴 |
| 식단 품목 "바꾸기"의 접근성 이름 | `{끼니} {품목} 다른 단백질원으로 바꾸기` | `바꾸기 — {끼니} {품목}, 다른 단백질원으로`(보이는 글자가 앞) |
| 분석의 감각 점 | 이어진 불투명도 | 네 단계 불투명도(색·경계는 그대로) |
| 분석의 종목 고르기 | 흐린 글자가 섞인 알약 | 한 글귀의 토글 버튼(`벤치 D1 · B`) |
| 설정의 순서 | Phase → 루틴 → 내보내기 → Gist → 가져오기 → 소리 → 템포 → 루틴 JSON → 식단 JSON → 진단 → 위험 | 훈련(Phase·루틴) → **소리·템포** → 내보내기·Gist·가져오기 → 파일(JSON 둘) → 진단 → 위험, 묶음 제목 넷 |
| 설정의 템포 가이드 사용 | 버튼 둘(`사용`·`사용 안 함`) | 스위치 하나(`템포 가이드 사용`) |
| 내보내기 미리보기 | 고정 폭 글자 상자 | Astryx 코드 블록(줄바꿈, 높이 한계) |
| 온보딩의 상태 카드 | 손으로 그린 초록 테두리·경고 상자 | Astryx 배너(성공·경고) |
| 아이콘 버튼(`‹` `›` `▾`) | 글자 | 아이콘(접근성 이름은 그대로) |

---

## 구현 순서와 검증

**SS0 → SS1 → SS2 → SS3 → SS4 → SS5 → SS6 → SS7 → SS8.**
SS0의 `before`는 다른 작업 뒤에 못 찍는다. **SS1(분할)을 화면을 옮기는 작업보다 먼저 한다** — 이슈의 단계 제안은 분할을 맨 끝에 뒀지만, 먼저 해야 `first-load --check`가 SS2~SS8 동안 첫 화면 크기를 지킨다(옮기는 작업이 홈에 Astryx 부품을 끌어들이면 그 커밋에서 잡힌다). SS2가 `DietDayEditor`를 옮겨야 SS3의 시트가 Astryx 편집기에서 열리고, SS4가 기록 화면을 옮길 때 편집기는 이미 Astryx다. SS6이 legacy의 마지막 큰 덩어리(`.row`·`.btn`·`.card`)를 지우고, SS7 뒤에 legacy 화면이 0이 되어야 SS8이 `src/styles/`를 지울 수 있다.
커밋은 **작업마다 하나, 9개.** 작업끼리 한 커밋에 섞지 않는다. 화면 검증·기록 커밋은 따로 둔다.

관례:
- `npm run check`(마무리 — SS1부터 `첫 화면 크기` 단계가 들어 있다), 작업 중에는 `npm run check -- --fast`와 관련 테스트만: `npx vitest run src/lib/v121.test.ts <그 작업이 옮긴 스캔 테스트>`, `npx vitest run scripts/ss<n>.test.mjs`(`npm test`가 `scripts/*.test.mjs`도 돌린다 — v1.20 제약 36). `tsc`를 직접 부르지 않는다.
- 커밋 개수는 실행 출력을 복사한다(`git log --oneline main..HEAD`). 커밋 메시지는 `git commit -F - <<'MSG'`.
- **숫자:** 작업 커밋마다 `node scripts/astryx-inventory.mjs --check` 출력과 `node scripts/first-load.mjs` 출력(SS1부터)을 DEV-RECORD에 복사하고, `--write`한 표를 같은 커밋에 넣는다. 머리의 작업 표와 다르면 이유를 적는다.
- **스캔 테스트** (v1.20 규칙 그대로): ① 판정·계산·내보내기를 재는 테스트(골든 포함)는 고치지 않는다 — 깨지면 멈추고 보고한다 ② `.tsx`를 글자로 읽는 스캔이 깨지면 먼저 코드 쪽에서 통과시킨다 ③ 마크업 글자에 묶여 통과시킬 수 없는 것만 같은 뜻으로 옮긴다(지우지 않는다). "확인한 것" 3에 없는 것을 옮기면 DEV-RECORD "옮긴 스캔" 표에 이름·전·후·같은 뜻인 이유 ④ `npm test`의 테스트 개수가 작업마다 줄지 않는다(SS8에서 지우는 검사 칸의 테스트만 예외 — 이름을 DEV-RECORD에).
- **`ui-check` 종료 코드:** 작업 커밋마다 `node scripts/ui-check.mjs after --check --ver=v1.21; echo "종료 코드 $?"`의 마지막 줄이 `종료 코드 0`. `장면 실패`가 하나라도 있으면 0이 아니다(SS0). "전부터 있던 실패"로 넘기는 칸은 SS0 `KNOWN_FAILURES`의 이름 붙은 세 칸(상세 글자까지 같을 때만, SS5·SS6까지 — 개정 1) 말고는 없다 — 그 밖의 실패는 멈추고 보고한다. 목록에 칸을 더하지 않는다. 출력의 `알려진 실패 N건`을 종료 코드와 함께 DEV-RECORD에 적는다(SS0 고침~SS4: 3, SS5: 2, SS6 뒤: 0). 장면이 늘어 한 번에 10분을 넘으면 `--only`로 나눠 백그라운드로 돌리고(DEV-RECORD 제약 17·32) 나눈 실행의 종료 코드를 전부 적는다.
- 파일 편집은 Edit 도구로, 커밋 전 `grep -c $'\r' <파일>`로 CRLF가 없는지 본다(제약 17·30).
- **새 스캔 결함 복원 확인:** `cp` 백업 뒤 결함을 되살려 실패를 보고 되돌린다(`cmp`로 같음 확인). 최소:
  ① (SS1) `App.tsx`에서 `DietScreen`을 다시 정적 import로 → `v121` SS1 실패
  ② (SS1) 미리 읽기 `useEffect`에 `void import('./screens/AnalyzeScreen')`을 더한다 → `v121` SS1 실패(그 `import(`가 두 번) + 흐름 `미리 읽기` 실패(분석 청크가 요청된다)
  ③ (SS1) `first-load.mjs`의 상수를 300으로 → `--check` 종료 코드 1. `dist/index.html`을 지운 상태에서 → 종료 코드 1(빈 통과가 아니다)
  ④ (SS2) 끼니 원형 버튼의 `isPressed`를 `grade !== 'none'`으로 → `v121` SS2 실패 + 흐름 `끼니 전부 먹음 1탭`(부분 등급에서 눌린 상태)
  ⑤ (SS2) `DietDayEditor`의 `ax-scope` 감싸기를 뺀다 → `history-day`의 `섬 버튼` 실패
  ⑥ (SS2) 식사 알림 `Collapsible`을 처음부터 연다 → 흐름 `식사 알림 접힘` 실패
  ⑦ (SS2) `ax-text-error`의 세 겹을 한 겹으로 → 흐름 `위험 구역 2단 확인`의 색 판정 실패(계산값이 토큰과 다르다)
  ⑧ (SS3) 플랜 줄의 `dismiss()`를 `onClose()`로 → `v121` SS3 실패
  ⑨ (SS3) 끼니 시트를 `purpose="info"`로 → `v121` SS3 실패 + 흐름 `입력 중 막 누름` 실패
  ⑩ (SS3) `SheetFrame.tsx`를 되살린다 → `v121` SS3 실패
  ⑪ (SS4) 기록 상세에서 `<DietDayEditor`를 위험 구역 아래로 → `v121` SS4 순서 실패
  ⑫ (SS4) `cellLabel`이 날짜를 뒤에 붙이게 → 속성 테스트 실패 + 흐름 `달력 칸 이름` 실패. 접근성(`label-content-name-mismatch`)은 이 결함을 **못 잡는다** — 보이는 글자 `17일`이 이름 뒤로 가도 낱말로 들어 있다(axe는 낱말이 들어 있는지만 본다, 개정 2)
  ⑬ (SS4) 세션 카드 하나를 `Card` + 안쪽 `ListItem`으로 → `안쪽 대칭` 실패(카드 위·아래)
  ⑭ (SS5) `chartTheme.ts`의 `accent`를 `--accent`로 되돌린다 → `v121` SS5 실패
  ⑮ (SS5) `sensoryDot`의 경계를 `< 1`로 → `v121` SS5 실패
  ⑯ (SS6) 설정에서 `<GistPanel`을 소리 크기 위로 → `v121` SS6 순서 실패
  ⑰ (SS6) 루틴 줄의 버튼을 `width="100%"`로 → `줄 안 버튼` 실패
  ⑱ (SS6) 한 묶음을 `Group` 대신 `VStack gap={5}`로 → `같은 역할` 실패
  ⑲ (SS7) `.onboarding`을 legacy 뿌리 목록 한쪽에만 남긴다 → `scripts/ss7.test.mjs` 실패
  ⑳ (SS0) 새 장면 하나의 준비 선택자를 틀리게 → 그 장면 `장면 실패`, 종료 코드 1
  ㉑ (SS8) `.tsx` 하나에 `className="zz-none"`(어느 CSS에도 없는 이름) → `astryx-inventory --check` 실패(정의 없는 클래스 0 → 1). `src/styles/global.css`를 빈 파일로 되살린다 → 실패("legacy CSS가 되살아났다")
  ㉒ (SS8) `parts.css`의 한글 줄바꿈 규칙을 지운다 → 390·375 꺾임 흐름이 여러 장면에서 실패
  ㉓ (SS8) `layers.css` import를 `astryx.css` 뒤로 → `scripts/ss8.test.mjs` 실패 + `--same-layout` 실패(층 순서가 바뀌면 리셋이 Astryx를 이긴다 — 안 깨지면 DEV-RECORD에 "이 검사가 못 잡는다"를 적고 정적 스캔만 남긴다)
  ㉔ (SS0 고침, 개정 1) `KNOWN_FAILURES`의 `analyze-empty` 항목 `detail`에서 한 글자를 바꾼다 → 그 칸 `실패`, 종료 코드 1. 넷째 항목(`settings-gist`·`접근성`)을 더한다 → `scripts/ss0.test.mjs` "목록은 늘지 않는다" 실패
  ㉕ (SS5, 개정 1) 분석을 고친 뒤 `analyze-empty` 항목을 남긴다 → `알려진 실패가 고쳐졌다` 실패, 종료 코드 1
- **과거 판정 불변 확인 절**(DEV-RECORD): ① `git diff --stat main..HEAD -- src/db src/store` 출력이 비어 있다(복사) ② `git diff --stat main..HEAD -- src/lib` 출력(복사)에 판정 파일이 없다 — `chartTheme.ts`·테스트뿐 ③ 골든 테스트 수정 없이 통과 ④ 달라지는 것: "과거 판정 불변" 표.
- **변이 테스트:** SS5 커밋에서 `npm run mutation`(대상 `chartTheme.ts`) 표를 DEV-RECORD에. 다른 작업은 `src/lib`의 코드를 안 고쳐 대상이 없다 — "대상 없음"과 `git diff --stat` 근거.
- 완료 후 `docs/DEV-RECORD-v1.21.md`(맨 위 "이 환경에서 확인된 제약"은 v1.20 목록을 이어받고 새로 확인한 것을 더한다: `TimeInput presentation="native"`가 이 Chromium에서 어떻게 그려지는지, `lazy` 시트의 첫 열기 시간, 미리 읽기가 요청하는 청크 이름, `first-load`·`first-screen`의 전·후 값, precache 개수·KiB, 옮긴 스캔 표, 지운 검사 칸). "배포 영향" 절에 아래를 남기고 PR 본문 맨 위에도 넣는다:
  - 식단·기록·분석·설정·온보딩이 Astryx 부품과 테마 한 벌로 바뀌었다 — 이제 모든 화면이 홈·세션과 같은 모양이다. 손으로 짠 CSS(`src/styles/`)는 없어졌다. 기록·판정·내보내기·백업은 그대로다.
  - 처음 여는 순간 읽는 코드가 줄었다: <474 → 후 KB>(gzip), 첫 화면 <전 → 후 ms>(Chromium, CPU 4배 느리게). 홈 밖의 화면은 홈이 뜬 1초 뒤 미리 읽는다 — 그 전에 탭을 누르면 잠깐 "불러오는 중"이 보일 수 있다. 오프라인은 그대로다(precache <개수·KiB>).
  - 바뀐 배치: 식단 탭의 식사 알림이 처음에는 접혀 있다. 기록 탭의 세션·종목이 줄마다 카드 한 장이다. 기록 상세에서 그날 식단이 Day 변경·위험 구역 위로 올라왔다. 설정은 훈련 → 소리·템포 → 내보내기·백업 → 파일 → 진단 → 위험 구역 순서로 묶였다. 템포 가이드는 스위치 하나다.
  - 세트 하나를 적는 탭 수는 그대로다. 식단 끼니 하나를 "전부 먹음"으로 적는 탭 수(1탭)도 그대로다.
  - 화면 비교: Argos 빌드 주소(작업마다), `docs/screenshots/v1.21/before`·`after`.
  - Astryx 적용 현황: `docs/ASTRYX-INVENTORY.md`(안 읽는 화면 파일 23 → 0, 인라인 51 → 0, legacy 클래스 270 → 0).
- README: 각 작업의 "README 반영"을 그 작업의 커밋에서 고친다.
- `package.json` **1.21.0**은 SS8 커밋에서 올린다. Astryx 버전(0.7.13)은 올리지 않는다.
- PR 본문에 `Closes #52`.
- 실기기 확인(구현자가 못 하면 DEV-RECORD에 "사람 확인 필요") — 홈 화면에 추가한 앱에서. 브라우저 흉내로 못 보는 것만:
  ① 앱을 완전히 닫았다 연다: 첫 화면이 v1.20보다 느리지 않다. 곧바로 식단 탭을 누르면 잠깐 "불러오는 중"이 보이는가(보이면 거슬리는지 적는다)
  ② 비행기 모드에서 앱을 완전히 닫았다 연 뒤, 세션 시작 → 요약, 식단·기록·분석·설정 탭이 모두 열린다(검사가 보지만 한 번 더)
  ③ 식단 탭에서 먹은 것 줄을 펼쳐 먹은 시각 칸을 누르면 iOS 시각 휠이 뜨고, 고른 시각이 들어간다. 화면이 확대되지 않는다
  ④ 끼니 원형 버튼·품목 체크가 엄지로 한 번에 눌린다
  ⑤ 먹은 것 추가 시트에서 검색 칸을 누르고 키보드가 올라와도 음식 목록과 닫기 버튼이 가리지 않는다
  ⑥ 설정의 Gist "GitHub에서 토큰 발급하기 ↗"가 Safari로 열린다
  ⑦ 폰의 다크 ↔ 라이트를 바꾼 뒤 식단·기록·분석·설정이 따라 바뀐다(분석 차트 포함)

리뷰 단위: 작업별 — 분할(SS1)은 앱이 코드를 읽는 시점을, SS2~SS7은 서로 다른 화면 묶음을 통째로 다시 그리고, SS8은 모든 화면 밑의 CSS를 지운다. SS1(오프라인·미리 읽기)과 SS8(같은 모양이어야 한다)을 따로 꼼꼼히 본다.

---

## 사람이 정할 것

**없다.** 이슈 #52가 "테마·재질·여백 기준은 v1.20에서 확정됨, 식단·기록·분석의 배치 갈림길은 설계자가 추천안으로 정하고 PR에서 사람이 본다"고 맡겼다. 정한 것은 아래에 모았다.

**알려 둘 것** (설계자가 정한 것 — 뒤집으려면 말하면 된다. 화면에 보이는 새 문구는 원문 그대로 적었다)

- **첫 화면 기준은 360KB(gzip)다.** 지금 474KB. 홈 밖의 화면(세션·요약·식단·기록·설정·온보딩)과 시트 부품을 나눠 읽고, 홈이 뜬 1초 뒤 미리 읽는다(분석은 미리 읽지 않는다 — 헬스장에서 차트 코드를 안 읽게). 대가: 앱을 연 직후 1초 안에 탭을 누르면 잠깐 "불러오는 중"이 보일 수 있다. `npm run check`·CI가 360KB를 넘으면 실패한다.
- **이슈의 단계 순서와 다르게 분할(SS1)을 먼저 한다.** 그래야 화면을 옮기는 동안 첫 화면 크기가 검사로 지켜진다.
- **식단 탭:** 배치는 그대로(요약 → 끼니 → 먹은 것 → 메모 → 위험 구역). **식사 알림만 처음에 접혀 있다**(한 번 설정하는 일이라 매일 쓰는 화면의 길이를 줄인다). 자리는 식단 탭 그대로 — 설정으로 옮기면 오늘 플랜의 끼니 시각과 떨어진다. 펼쳐진 채가 좋으면 말하면 된다(한 줄).
- **기록 탭:** 세션 목록과 종목 목록이 줄마다 누르는 카드 한 장이 된다. **기록 상세에서 "그날 식단"이 Day 변경·위험 구역 위로 올라온다**(고치는 것을 위에, 관리를 맨 아래에 — 삭제 버튼 아래에 입력칸이 오지 않게).
- **분석 탭:** 순서·차트 그대로. 감각 점의 진하기가 이어진 값에서 네 단계로 바뀐다(인라인 스타일을 없애려고 — 색과 경계는 그대로).
- **설정 탭:** 카드 14장을 묶음으로 나눈다 — 훈련 → **소리·템포**(헬스장에서 바꾸는 것을 위로) → 기록 내보내기·백업 → 루틴·식단 파일 → 진단 → 위험 구역. 새로 보이는 묶음 제목: `훈련`, `소리·템포`, `기록 내보내기·백업`, `루틴·식단 파일`. 템포 가이드 "사용 / 사용 안 함" 버튼 둘이 스위치 하나 `템포 가이드 사용`이 된다.
- **접근성 이름이 둘 바뀐다:** ① 기록 달력의 칸: 보이는 글자(`17🔥2`) → `17일 운동 2회 식단 준수` 꼴(식단 점은 `준수`·`일부`·`미달`·`판정 전`) ② 식단 품목의 바꾸기 버튼: `점심 닭가슴살 다른 단백질원으로 바꾸기` → `바꾸기 — 점심 닭가슴살, 다른 단백질원으로`(보이는 글자 `바꾸기`가 앞에 와야 한다는 접근성 규칙 때문). 같은 규칙 때문에 기록 달력 칸의 보이는 날짜가 `17` → `17일`이 된다(개정 2 — 사람이 정했다). 그 밖의 화면 글자는 그대로다(▾·‹ 같은 기호가 아이콘으로 바뀌는 것 말고).
- 식단 시트(플랜·단백질원·끼니)에서 고르면 시트가 바로 사라지지 않고 **내려가며 닫힌다.** 끼니 시트와 먹은 것 추가 시트는 입력 도중 막을 눌러도 닫히지 않는다(세션 시트와 같은 규칙).
- 인벤토리의 "Astryx를 안 읽는 화면 파일"에서 `main.tsx`(진입점)와 `icons.tsx`(앱의 SVG 그림 — Astryx에 불꽃·식기·저울 같은 그림이 없다)를 뺀다. 그래서 그 숫자가 23에서 21로 시작한다. 숨기지 않고 표에 `제외`로 남긴다.
- 끝나면 `src/styles/` 폴더가 없어진다. 앱의 CSS는 Astryx와 `src/ax`의 두 파일(`ax.css`·`parts.css`)뿐이고, 인벤토리가 되살아나지 않게 지킨다.

---

## 검토 반영 기록

검토: `.reports/v1.21-codex.md`(그대로 진행 가능), `.reports/v1.21-antigravity.md`(수정 필요). 둘 다 커밋 `9c52c90`을 봤다. 지적마다 코드를 열어 확인했다.

| # | 지적 (검토자) | 코드로 확인한 것 | 판단 | 고친 곳 |
|---|---|---|---|---|
| 1 | `check.mjs`에 `slow` 단계를 더하면 `check.test.mjs`의 `빌드만 --fast에서 빠진다`가 깨진다 (Antigravity) | `scripts/check.test.mjs:15-17`이 `toEqual(['npm run build'])`, `check.mjs:24`의 빌드만 `slow: true` | **반영** | "확인한 것" 3 표, SS1 설계·검증 |
| 2 | `Loading`을 `src/ax`로 옮기면 `v120` RR3의 `App.tsx`에 `<Spinner />` 단언이 깨진다 (Antigravity) | `v120.test.ts:390`, `App.tsx:206-210`의 `Loading`이 유일한 `<Spinner />`. 다만 SS1 시점에는 아직 통과한다 — 깨지는 것은 SS2 | **반영**(시점을 바로잡아) — SS1 "안 고치고 통과"는 맞고, SS2에서 옮긴다. 같은 테스트의 `<Loading text=…>` 줄들은 `App.tsx`가 계속 쓰므로 그대로 통과 | "확인한 것" 3 표, SS1 검증 주석, SS2 검증 |
| 3 | 설정이 Astryx가 되면 `ui-space.test.mjs:44`의 `settings` 고정 배열 단언이 깨진다 (Antigravity) | `ui-space.test.mjs:44`, `ui-space.mjs:246` `settings: ['bar', 'tab-indicator', 'tab-content']`. SS6 검증이 `안쪽 대칭`을 걸면서 `EXPECTED_PAIRS` 값을 적지 않았다 | **반영** — 설정 장면의 `EXPECTED_PAIRS` 값도 함께 정했다 | "확인한 것" 3 표, SS6 검증 |
| 4 | SS3·SS6이 쓰는 `RadioList`·`ScrollableArea`·`CodeBlock`·`Link`의 `src/ax` 재내보내기가 표에 없다 (Antigravity, 경미) | `src/ax/index.tsx:259-277`에 다섯 다 없다. SS2의 `CheckboxList`도 없다. 서브 경로는 `package.json` `exports`에 있다 | **반영** | SS2 설계에 작업별 재내보내기 표 |
| 5 | `LOADERS`로 묶다가 `v117`이 보는 `lazy(() => import('./screens/RoutineEditorScreen'))` 글자가 빠지기 쉽다 (Antigravity, 경미) | 주의 수준이 아니라 **PLAN이 모순**이었다: `LOADERS`에 `routineEdit`·`analyze`를 넣고 "화면은 `lazy(LOADERS.x)` 꼴"이라 하면서 그 글자를 그대로 둔다고 했다(`v117.test.ts:152`) | **반영** — 분석·루틴 편집은 `LOADERS`에서 빼고 지금 줄을 그대로 둔다. `LOADERS` 열쇠 8 → 6, 결함 복원 ②를 그에 맞게 | SS1 설계·검증, 결함 복원 ② |
| 6 | 진단·놓치는 경우·검증·범위·원칙 모두 통과 (Codex) | — | 이견 없음 | — |

**두 검토가 갈린 곳:** Codex는 검증 항목을 통과로, Antigravity는 스캔 갱신 셋이 빠졌다고 봤다. 코드로는 Antigravity가 맞다 — 세 단언(`check.test.mjs:16`, `v120.test.ts:390`, `ui-space.test.mjs:44`)은 PLAN대로 구현하면 그 작업 커밋에서 실패한다. Codex는 "확인한 것" 3이 `.tsx` 마크업 스캔만 모은 것을 넘어서 도구 테스트까지는 보지 않았다.

**기각:** 없음.

**"사람이 정할 것":** 0건 그대로. "알려 둘 것"에 두 검토자 모두 반대가 없다(Antigravity는 식사 알림 접힘·기록 상세 식단 위치·설정 묶음·템포 스위치에 명시적으로 동의). 그대로 확정한다.

### 검토 반영 기록 — 개정 1

근거: `.reports/review-SS0.md` "SS1 전에 정할 것"(지휘자 → 설계자). DEV-RECORD SS0 표의 실패 셋과 `scripts/ui-check.mjs`(`softVerdict`·`printResults`·`SYMMETRY_JUDGED`)를 열어 확인했다.

| 선택지 | 판단 | 이유 |
|---|---|---|
| (a) 세 칸을 SS1에서 고친다 | 기각 | 고칠 자리(`p.center-note`의 여백, 미리보기 `pre`, `.ext-link`의 눌림)가 전부 legacy 마크업·CSS라 SS5·SS6이 통째로 다시 짜며 버린다. 눌림 반응을 legacy로 고치려면 `global.css`에 규칙을 더해야 해 CI의 Astryx 뒷걸음 검사와 부딪친다. SS1(분할)에 분석·설정 화면 수정이 섞여 "작업끼리 한 커밋에 섞지 않는다"도 깨진다. v1.20 개정 3이 허용 목록 없이 바로 고친 것은 고친 결과(접근성 이름)가 남는 경우였다 — 여기는 버릴 일이다 |
| **(b) 이름 붙은 세 칸만 알려진 실패** | **채택** | 칸을 `(행 이름, 칸, 상세 글자)`로 못박아 같은 칸의 새 실패(다른 규칙·다른 값·장면 실패)도 바로 `실패`다. 목록은 테스트가 세 쌍의 부분집합으로 묶어 늘지 않고, 고친 뒤 남긴 항목은 `stale`로 실패해 SS5·SS6이 같은 커밋에서 줄인다. SS8이 빈 목록과 함수를 지운다 |
| (c) 옮기기 전 화면의 그 칸을 `기록만` | 기각 | `SYMMETRY_JUDGED`처럼 장면 단위로 끄면 분석·설정 장면의 `접근성`·`눌림 반응`·`여백 격자`가 SS5·SS6까지 통째로 안 잰다. SS1~SS4가 그 장면에 새 실패를 만들어도(예: SS1의 지연 읽기가 분석 화면에 남긴 접근성 위반) 못 잡는다 |

**SS0 커밋(`858816d`)은 고치지 않는다.** 알려진 실패는 SS0 리뷰 반려를 반영하는 고침 커밋에 함께 넣는다.

### 검토 반영 기록 — 개정 2

근거: `.reports/review-SS4.md` 3절(사람에게 묻는 것)과 5절(경미한 점). 사람의 답: **선택지 1** — 보이는 글자 `17일`, 이름 `{d}일 …`. `src/components/MonthCalendar.tsx:22`(`cellLabel`)·`:111`(`<span className="ax-cal-num">{dayNum}일</span>`)과 `src/lib/v121.test.ts:276-300`가 이미 이 꼴이라 코드·테스트는 그대로 맞는다.

| 지적 | 판단 | 고친 곳 |
|---|---|---|
| 3절: PLAN의 "보이는 글자는 숫자만"과 axe 낱말 비교가 함께 성립하지 않는다 | **반영**(사람 결정) — 설계를 보이는 글자 `17일`로. 칸 이름 규칙·속성(`${날짜}일`로 시작)·흐름 ②는 결정과 맞아 그대로 | SS4 설계 세 줄, 화면 검증 SS4, 화면 변화 표, "알려 둘 것" |
| 5절-3: ⑫의 예상에 "접근성 실패"가 있지만 보이는 글자가 `17일`이면 axe가 못 잡는다 | **반영** | 결함 복원 ⑫ |
| 5절-1(DEV-RECORD의 `--same-layout` 실행 줄), 5절-7(들여쓰기·주석 열) | PLAN 밖 — 구현자가 다음 커밋에서 맞춘다. PLAN은 이미 그 검증을 요구한다 | — |
| 5절-2(`SS4 검증 <장면>` 흐름이 늘 `ok`), 5절-5(`SS4 다른 달`이 판정 안 함), 5절-6(history의 `가까움 순서` 사실상 안 잼) | PLAN 밖 — 검사 도구의 판정 방식이다. SS8 검사 정리 때 다룬다(범위 그대로) | — |
| 5절-4(`parts.css`가 `Button` 안쪽 `span` 구조에 기댐, 글자 크기 rem 숫자) | PLAN 밖 — 코드의 모양 문제다. 설계 원칙(값은 테마가 정한다)은 이미 이 PLAN에 있어 바꿀 문장이 없다 | — |
