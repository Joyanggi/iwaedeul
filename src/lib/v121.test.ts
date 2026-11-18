import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

// PLAN v1.21 SS1 — 첫 화면 코드 분할. 소스 스캔(RTL이 없다). 화면이 실제로 나뉘어 읽히는지는 ui-check의 새 흐름 셋과 first-load --check가 본다.
// 소스는 ?raw로 읽는다(`node:fs`는 src의 타입 검사에 없다 — DEV-RECORD 제약 13). 이 둘은 .tsx라 ?raw가 빈 문자열이 되지 않는다(제약 3은 .css)
import app from '../App.tsx?raw'
import ax from '../ax/index.tsx?raw'
import axDiet from '../ax/diet.tsx?raw'
import dietScreen from '../screens/DietScreen.tsx?raw'
import dietEditor from '../components/DietDayEditor.tsx?raw'
import mealPanel from '../components/MealReminderPanel.tsx?raw'
import planSheet from '../components/DietPlanSheet.tsx?raw'
import slotSheet from '../components/DietSlotSheet.tsx?raw'
import variantSheet from '../components/DietVariantSheet.tsx?raw'
import foodSheet from '../components/FoodLogSheet.tsx?raw'
import historyScreen from '../screens/HistoryScreen.tsx?raw'
import detailScreen from '../screens/SessionDetailScreen.tsx?raw'
import exerciseHistoryScreen from '../screens/ExerciseHistoryScreen.tsx?raw'
import monthCalendar from '../components/MonthCalendar.tsx?raw'
import summaryScreen from '../screens/SummaryScreen.tsx?raw'
import { cellLabel } from '../components/MonthCalendar'

describe('v121 SS1 — App은 홈만 정적으로 읽는다', () => {
  it('v121 SS1: 홈 밖 화면 여섯은 정적 import가 0건이고 홈은 정적이다', () => {
    expect(app).not.toMatch(/import (SessionScreen|SummaryScreen|DietScreen|HistoryScreen|SettingsScreen|Onboarding) from/)
    expect(app).toContain("import HomeScreen from './screens/HomeScreen'")
  })

  it('v121 SS1: LOADERS의 열쇠가 여섯이고 PRELOAD에 onboarding이 없다', () => {
    const loaders = app.match(/const LOADERS = \{([\s\S]*?)\} as const/)
    expect(loaders).not.toBeNull()
    const keys = [...loaders![1].matchAll(/^\s+(\w+): \(\) => import\(/gm)].map((m) => m[1])
    expect(keys).toEqual(['session', 'summary', 'diet', 'history', 'settings', 'onboarding'])
    const preload = app.match(/const PRELOAD = \[([^\]]*)\] as const/)
    expect(preload).not.toBeNull()
    expect(preload![1]).not.toContain('onboarding')
    expect(preload![1].match(/'\w+'/g)).toHaveLength(5)
  })

  it('v121 SS1: 분석·루틴 편집 import는 각각 한 번, lazy(() => 바로 뒤에만 있다(미리 읽기 쪽에서 부르지 않는다)', () => {
    for (const name of ['AnalyzeScreen', 'RoutineEditorScreen']) {
      const all = app.split(`import('./screens/${name}')`).length - 1
      expect(all, name).toBe(1)
      expect(app, name).toContain(`lazy(() => import('./screens/${name}'))`)
    }
  })

  it('v121 SS1: 미리 읽기는 PRELOAD와 preloadSheet를 setTimeout 뒤에 부르고 정리 함수에서 clearTimeout 한다', () => {
    expect(app).toContain('const PRELOAD_DELAY_MS = 1000')
    const at = app.indexOf('setTimeout(')
    expect(at).toBeGreaterThan(-1)
    const body = app.slice(at, app.indexOf('[ready])', at))
    expect(body).toContain('LOADERS[key]()')
    expect(body).toContain('preloadSheet()')
    expect(body).toContain('.catch(() => undefined)')
    expect(body).toContain('clearTimeout(id)')
  })

  it('v121 SS1: 탭바(<Bar position="bottom">)는 탭 내용 Suspense 뒤에 있고 그 Suspense 밖에 있다', () => {
    const open = app.indexOf('<Suspense fallback={<Loading text="불러오는 중…" />}>\n        {tab ===')
    const bar = app.indexOf('<Bar position="bottom">')
    expect(open).toBeGreaterThan(-1)
    const close = app.indexOf('</Suspense>\n      <Bar position="bottom">')
    expect(close).toBeGreaterThan(open)
    expect(bar).toBeGreaterThan(close)
  })
})

// v117의 'astryxdesign은 src/ax 밖에서 import하지 않는다' 스캔이 글자 그대로의 패키지 이름을 잡으므로 이름을 조립한다
const SHEET_PKG = ['@astryx', 'design/core/BottomSheet'].join('')

describe('v121 SS1 — 시트 부품은 처음 열 때 읽는다', () => {
  it('v121 SS1: BottomSheet는 import type 한 줄뿐이고 lazy(import())로 읽고 preloadSheet를 내보낸다', () => {
    const lines = ax.split('\n').filter((l: string) => l.includes(`from '${SHEET_PKG}'`))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^import type \{/)
    expect(ax).toContain("lazy(loadBottomSheet)")
    expect(ax).toContain(`import('${SHEET_PKG}')`)
    expect(ax).toMatch(/export function preloadSheet\(\) \{\s*return loadBottomSheet\(\)/)
    expect(ax).toContain('<Suspense fallback={null}>')
  })

  it('v121 SS1: Sheet의 닫기(closing·SHEET_CLOSE_MS·once·clearTimeout)는 그대로다', () => {
    expect(ax).toContain('const SHEET_CLOSE_MS = 350')
    expect(ax).toContain('const finish = once(() => onCloseRef.current())')
    expect(ax).toContain('return () => clearTimeout(timer)')
  })
})

// ── SS2 — 식단 탭 ──────────────────────────────────────────────────────────────────────────────
// 소스 스캔. onClick의 `=>`·`>`에서 끊기지 않게 태그 단위가 아니라 "여는 글자부터 다음 부품 시작까지"로 자른다.
// CSS는 `scripts/ss2.test.mjs`가 fs로 읽는다(vitest에서 .css ?raw는 빈 문자열 — 제약 3).
const DIET_FILES = { 'DietScreen.tsx': dietScreen, 'DietDayEditor.tsx': dietEditor, 'MealReminderPanel.tsx': mealPanel }

/** `<ToggleButton`부터 닫는 `</HStack>`·`</StackItem>` 앞까지(onClick의 `=>`에서 끊기지 않는다) */
const toggleSegments = (src: string) =>
  src
    .split('<ToggleButton')
    .slice(1)
    .map((rest) => {
      const end = rest.search(/<\/HStack>|<\/StackItem>/)
      return end < 0 ? rest : rest.slice(0, end)
    })

describe('v121 SS2 — 식단 세 파일은 Astryx 부품뿐이다', () => {
  it('v121 SS2: className=은 ax- 이름뿐이고 style=·<button·<input·var(--·padding=이 0건이다', () => {
    for (const [name, src] of Object.entries(DIET_FILES)) {
      const classes = [...src.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])
      for (const c of classes) expect(c, name).toMatch(/^"ax-(scope ax-diet|scope|slot-mark|diet|text-error|toggle)"$/)
      for (const bad of ['style=', '<button', '<input', 'var(--', 'padding=']) expect(src, `${name} ${bad}`).not.toContain(bad)
    }
  })

  it("v121 SS2: 끼니 원형 버튼은 isPressed={grade === 'full'}, 품목 버튼은 isPressed={on}이다(aria-pressed의 뜻이 그대로)", () => {
    const segs = toggleSegments(dietEditor)
    const slot = segs.find((t) => t.includes('전부 먹음'))
    const item = segs.find((t) => t.includes('variant.qty'))
    expect(slot, '끼니 원형 버튼').toBeDefined()
    expect(item, '품목 버튼').toBeDefined()
    expect(slot).toContain("isPressed={grade === 'full'}")
    expect(slot).not.toContain("grade !==")
    expect(item).toContain('isPressed={on}')
  })

  it('v121 SS2: 문구가 세 파일에 그대로 있다', () => {
    const all = Object.values(DIET_FILES).join('\n')
    for (const text of ['대체·안 먹음', '단백질 (추정)', '먹은 것 (시간별)', '＋ 먹은 것 추가', '메모 (선택)', '위험 구역', '이 날 식단 기록 지우기', '정말 삭제', '식사 알림', '캘린더로 내보내기', '기본 플랜으로 돌아오세요', '일 연속']) {
      expect(all, text).toContain(text)
    }
  })

  it('v121 SS2: 위험 구역·삭제는 variant="destructive"이고 확인 문구는 ax-text-error다', () => {
    expect(dietEditor).toMatch(/variant="destructive"\s+label="이 날 식단 기록 지우기"/)
    expect(dietEditor).toMatch(/variant="destructive"\s+label="정말 삭제"/)
    expect(dietEditor).toContain('<Text className="ax-text-error">')
  })

  it('v121 SS2: 식사 알림은 Collapsible이고 처음 닫혀 있다(Collapsible의 기본값은 열림이라 defaultIsOpen={false}를 준다), 끼니는 CheckboxList다', () => {
    expect(mealPanel).toContain('<Collapsible defaultIsOpen={false} trigger={<Text weight="semibold">식사 알림</Text>}>')
    expect(mealPanel).not.toMatch(/isOpen=|defaultIsOpen=\{true/)
    expect(mealPanel).toContain('<CheckboxList label="알림 받을 끼니" isLabelHidden')
    expect(mealPanel).toContain('휴식일에도 울립니다 (훈련일 전용 끼니인데 매일 반복입니다)')
  })

  it('v121 SS2: 편집기는 맨 바깥이 ax-scope div(기록 화면이 legacy인 동안 맨 요소 규칙을 막는다)이고 화면은 Groups className="ax-diet"다', () => {
    expect(dietEditor).toMatch(/return \(\s+<div className="ax-scope ax-diet">\s+<Group>/)
    expect(dietScreen).toContain('<Groups className="ax-diet">')
  })

  it('v121 SS2: 로직 줄은 그대로다 — mutateDietDay·seedVariantChoices 한 경로, variantChoicesFor(…todayVariantChoices(day)), decimals={2}', () => {
    expect(dietEditor).toContain('seedVariantChoices(fn(d), slots, variantDefaults)')
    expect(dietEditor.match(/variantChoicesFor\(/g)).toHaveLength(2) // 품목 표기 한 곳 + 단백질원 시트 한 곳
    expect(dietEditor.match(/todayVariantChoices\(day\)/g)).toHaveLength(2)
    expect(dietEditor).toContain('decimals={2}')
  })

  it('v121 SS2: Loading은 src/ax/index.tsx, TimeField·CheckboxList는 src/ax/diet.tsx(메인 청크에 안 딸려 오게)에 있다. TimeField는 native 시각 고르기·자동완성 억제를 건다. App에는 function Loading이 없다', () => {
    expect(ax).toMatch(/export function Loading\(/)
    expect(axDiet).toMatch(/export function TimeField\(/)
    expect(axDiet).toContain('presentation="native"')
    expect(axDiet).toContain('{...AX_NO_AUTOFILL}')
    expect(axDiet).toContain('controlStyle={CONTROL_STYLE}')
    expect(axDiet).toMatch(/export \{ CheckboxList, CheckboxListItem \} from/)
    // 식단 전용 부품을 index.tsx가 읽거나 다시 내보내면 홈이 읽는 첫 화면 코드가 87KB(gzip) 늘어난다 — first-load --check가 잡지만 이유를 여기 남긴다
    expect(ax).not.toMatch(/TimeInput|CheckboxList|from '\.\/diet'/)
    expect(app).not.toContain('function Loading')
    expect(app).toContain('Loading,')
  })
})

// PLAN v1.21 SS3 — 식단 시트 넷 + SheetFrame 삭제. 소스 스캔이다. 태그 끝을 `>`로 찾지 않는다(onClick의 `=>`에서 끊긴다) —
// 글자 포함·`[\s\S]` 구간 자르기만 쓴다.

const SS3_SHEETS = { DietPlanSheet: planSheet, DietSlotSheet: slotSheet, DietVariantSheet: variantSheet, FoodLogSheet: foodSheet }
const ss3Code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ALL_COMPONENTS = import.meta.glob('/src/components/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

describe('v121 SS3 — 식단 시트 넷은 Astryx 부품뿐이고 SheetFrame은 없다', () => {
  it('v121 SS3: 네 파일이 ../ax의 Sheet를 쓰고 SheetFrame·style=·<button·<input·패키지 이름이 0건, className=은 ax- 이름뿐이다', () => {
    for (const [name, text] of Object.entries(SS3_SHEETS)) {
      const s = ss3Code(text)
      expect(s, name).toMatch(/import \{[^}]*\bSheet\b[^}]*\} from '\.\.\/ax'/)
      expect(s, name).not.toMatch(/SheetFrame|style=|<button|<input|<textarea/)
      expect(s, name).not.toContain(['@astryx', 'design'].join(''))
      const classes = [...s.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])
      for (const c of classes) expect(c, name).toMatch(/^"ax-[\w -]+"$/)
    }
  })

  it('v121 SS3: SheetFrame.tsx가 없고 components/*Sheet.tsx 전부가 ../ax를 읽는다(시트 껍데기가 하나다)', () => {
    expect(Object.keys(ALL_COMPONENTS).filter((p) => /SheetFrame/.test(p))).toEqual([])
    const sheets = Object.entries(ALL_COMPONENTS).filter(([p]) => /Sheet\.tsx$/.test(p))
    expect(sheets.length).toBeGreaterThanOrEqual(12)
    expect(sheets.filter(([, t]) => !/from '\.\.\/ax/.test(t)).map(([p]) => p)).toEqual([])
  })

  it('v121 SS3: 고른 뒤 닫힘은 onClose()가 아니라 dismiss()다 — onPickToday·onPick·onPickAhead·act 뒤', () => {
    for (const [name, text] of Object.entries(SS3_SHEETS)) expect(ss3Code(text), name).not.toMatch(/\bonClose\(\)/)
    expect(ss3Code(planSheet)).toMatch(/onPickToday\(plan\.id\)\s*dismiss\(\)/)
    expect(ss3Code(planSheet)).toMatch(/onPickAhead\(ahead, n\)\s*dismiss\(\)/)
    expect(ss3Code(variantSheet)).toMatch(/onPick\(index\)\s*dismiss\(\)/)
    expect(ss3Code(slotSheet)).toMatch(/const act = \(fn: \(\) => void\) => \{\s*fn\(\)\s*dismiss\(\)\s*\}/)
  })

  it('v121 SS3: 끼니·먹은 것 추가는 purpose="form", 플랜·단백질원은 purpose="info"다', () => {
    expect(slotSheet).toMatch(/<Sheet label=\{`\$\{slot\.name\} 기록`\} purpose="form"/)
    expect(foodSheet).toMatch(/<Sheet label="먹은 것 추가" purpose="form"/)
    expect(planSheet).toMatch(/<Sheet label="식단 플랜 전환" purpose="info"/)
    expect(variantSheet).toMatch(/<Sheet label=\{`\$\{slot\.name\} 단백질원 고르기`\} purpose="info"/)
  })

  it('v121 SS3: 끼니 시트의 RadioList는 value={quality}이고 초기 mode는 null이다(AA3), 대체 지우기는 onClearSubstitution이다', () => {
    const s = ss3Code(slotSheet)
    expect(s).toMatch(/<RadioList[\s\S]*?value=\{quality\}/)
    expect(s).toMatch(/useState<EditMode \| null>\(null\)/)
    // 같은 <Button …/> 안에 label과 onClick이 있으면 된다 (속성 순서는 무관)
    expect(s).toMatch(/<Button(?=(?:(?!\/>)[\s\S])*label="대체 지우기")(?=(?:(?!\/>)[\s\S])*act\(onClearSubstitution\))/)
    expect(s).toMatch(/<Button(?=(?:(?!\/>)[\s\S])*label="추가 지우기")(?=(?:(?!\/>)[\s\S])*act\(onClearAddition\))/)
  })

  it('v121 SS3: 먹은 것 추가는 음식 목록이 ScrollableArea(40vh) 안 List이고 새 부품은 src/ax/diet.tsx에서 읽는다(index.tsx에 두면 첫 화면이 커진다)', () => {
    const s = ss3Code(foodSheet)
    expect(s).toMatch(/<ScrollableArea axis="block" height="40vh" label="음식 목록">/)
    expect(s).toContain("from '../ax/diet'")
    expect(ss3Code(slotSheet)).toContain("from '../ax/diet'")
    expect(axDiet).toContain("export { RadioList, RadioListItem } from '" + ['@astryx', 'design'].join('') + "/core/RadioList'")
    expect(axDiet).toContain("export { ScrollableArea } from '" + ['@astryx', 'design'].join('') + "/core/ScrollableArea'")
    expect(ax).not.toMatch(/core\/RadioList|core\/ScrollableArea/)
  })

  it('v121 SS3: 문구가 그대로다 — 플랜 전환·끼니 메뉴·입력·단백질원·먹은 것 추가', () => {
    const all = Object.values(SS3_SHEETS).join('\n')
    for (const t of ['식단 플랜', '고르면 ', '내일부터 며칠', '전부 먹음 (', '대체했어요', '추가로 먹었어요', '안 먹음', '기록 지우기', '어느 쪽이었나요', '무엇으로 대체했나요', '무엇을 더 먹었나요', '다음 날의 기본', '새 음식 등록', '등록하고 추가', '정말 삭제', '방금 추가: ', '음식 검색', '먹은 시각을 먼저 골라 주세요']) {
      expect(all, t).toContain(t)
    }
  })
})

// PLAN v1.21 SS4 — 기록 탭. 소스 스캔이다. 태그 끝을 `>`로 찾지 않는다(onClick의 `=>`에서 끊긴다) — 글자 포함·`[\s\S]` 구간 자르기만 쓴다.
const SS4_FILES = { HistoryScreen: historyScreen, SessionDetailScreen: detailScreen, ExerciseHistoryScreen: exerciseHistoryScreen, MonthCalendar: monthCalendar }

describe('v121 SS4 — 기록 네 파일은 Astryx 부품뿐이다', () => {
  it('v121 SS4: 네 파일에 className=은 ax- 이름뿐이고 style=·<button·<input·<textarea·var(--·padding=이 0건이다', () => {
    for (const [name, text] of Object.entries(SS4_FILES)) {
      const c = ss3Code(text)
      expect(c, name).not.toMatch(/style=|<button|<input|<textarea|var\(--|padding=/)
      expect(c, name).not.toContain(['@astryx', 'design'].join(''))
      const classes = [...c.matchAll(/className=("[^"]*"|\{[^}]*\})/g)].map((m) => m[1])
      for (const cl of classes) expect(cl, name).toMatch(/^"ax-[\w -]+"$/)
    }
    expect(ss3Code(monthCalendar)).toContain('data-diet={dietDot')
  })

  it('v121 SS4 — 순서: 주석을 뗀 SessionDetailScreen에서 <ExerciseCard < 유산소 < 메모 < <DietDayEditor < Day 변경 < 위험 구역 < 기록으로 순이다', () => {
    const c = ss3Code(detailScreen)
    const from = c.indexOf('<ExerciseCard')
    const at = ['<ExerciseCard', '유산소', '메모', '<DietDayEditor', 'Day 변경', '위험 구역', '기록으로'].map((t) => c.indexOf(t, from))
    for (const i of at) expect(i).toBeGreaterThan(-1)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('v121 SS4: src/ax/index.tsx가 Row·Rows를 내보내고 SummaryScreen.tsx에 function Row·function Rows가 없다(둘 다 ../ax에서 읽는다)', () => {
    expect(ax).toMatch(/export function Row\(/)
    expect(ax).toMatch(/export function Rows\(/)
    const sum = ss3Code(summaryScreen)
    expect(sum).not.toMatch(/function Rows?\(/)
    expect(sum).toMatch(/\bRow, Rows\b[^']*from '\.\.\/ax'/)
  })

  it('v121 SS4: 칸 이름을 만드는 함수가 MonthCalendar.tsx 안 한 곳(cellLabel)이고, 칸은 그 이름을 label로 받는다', () => {
    expect(ss3Code(monthCalendar).match(/function cellLabel\(/g)).toHaveLength(1)
    expect(ss3Code(monthCalendar)).toMatch(/label=\{cellLabel\(/)
    for (const t of [historyScreen, detailScreen, exerciseHistoryScreen]) expect(ss3Code(t)).not.toMatch(/function cellLabel/)
  })

  it('v121 SS4 속성: 어떤 칸(세션 수 0~5, 식단 점 다섯 가지, 날짜 1~31)에서도 이름이 ${날짜}일로 시작하고, 세션 0이면 운동이 없고 1 이상이면 운동 ${k}회가 있다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 0, max: 5 }),
        fc.constantFrom('good' as const, 'mid' as const, 'poor' as const, 'unlogged' as const, 'partial' as const, null),
        (day, k, dot) => {
          const name = cellLabel(day, k, dot)
          expect(name.startsWith(`${day}일`)).toBe(true)
          if (k === 0) expect(name).not.toContain('운동')
          else expect(name).toContain(`운동 ${k}회`)
          expect(name.includes('식단')).toBe(dot !== null)
        },
      ),
    )
  })

  it('v121 SS4: 칸 이름 예 — 오늘(운동 없음·점 없음)·두 번 운동한 날·식단 점 넷', () => {
    expect(cellLabel(17, 0, null)).toBe('17일')
    expect(cellLabel(17, 2, null)).toBe('17일 운동 2회')
    expect(cellLabel(3, 1, 'good')).toBe('3일 운동 1회 식단 준수')
    expect(cellLabel(3, 0, 'mid')).toBe('3일 식단 일부')
    expect(cellLabel(3, 0, 'poor')).toBe('3일 식단 미달')
    expect(cellLabel(3, 0, 'partial')).toBe('3일 식단 판정 전')
  })

  it('v121 SS4: 달력 칸은 Button ghost이고 비활성 조건·상태 속성(data-out·data-today·data-selected)·점 판정은 지금 그대로다', () => {
    const c = ss3Code(monthCalendar)
    expect(c).toContain('isDisabled={!hasSession && !hasDiet && !cell.inMonth}')
    for (const a of ['data-out=', 'data-today=', 'data-selected=']) expect(c).toContain(a)
    expect(c).toContain("const dietDot = hasDiet ? diet : dietPartial ? 'partial' : null")
    expect(c).toContain('aria-hidden="true"')
  })

  it('v121 SS4: 세션·종목 줄은 줄마다 ClickableCard 한 장이다(button.row·List 없음) — 기록 목록·종목별·한 종목의 세션', () => {
    expect((ss3Code(historyScreen).match(/<ClickableCard/g) ?? []).length).toBe(1)
    expect((ss3Code(exerciseHistoryScreen).match(/<ClickableCard/g) ?? []).length).toBe(2)
    for (const t of [historyScreen, exerciseHistoryScreen]) expect(ss3Code(t)).not.toMatch(/<ListItem|<List\b/)
  })

  it('v121 SS4: 유산소는 ToggleButton isPressed(다시 누르면 끔)이고 시간·강도는 TextField, 메모는 TextAreaField다', () => {
    const c = ss3Code(detailScreen)
    expect(c).toMatch(/<ToggleButton[\s\S]*?isPressed=\{session\.cardio\?\.type === t\}/)
    expect(c).toContain('label="유산소 시간(분)"')
    expect(c).toContain('label="유산소 강도"')
    expect(c).toContain('<TextAreaField')
    expect(c).toMatch(/session\.cardio\?\.type === t\s*\? undefined/)
  })

  it('v121 SS4: 위험 구역·삭제는 variant="destructive"이고 확인 문구는 ax-text-error다, Day 변경 경고는 Banner warning이다', () => {
    const c = ss3Code(detailScreen)
    expect(c).toMatch(/variant="destructive" label="이 세션 삭제"/)
    expect(c).toMatch(/variant="destructive" label="정말 삭제"/)
    expect(c).toContain('className="ax-text-error"')
    expect(c).toMatch(/<Banner\s+status="warning"/)
  })

  it('v121 SS4: 보조 무게 종목 안내는 ax-text-warning이고 e1RM·최고 뱃지·볼륨은 inverse가 아닐 때만이다', () => {
    const c = ss3Code(exerciseHistoryScreen)
    expect(c).toContain('className="ax-text-warning"')
    expect(c).toContain('end={!inverse &&')
    expect(c).toContain('!inverse && point.bestE1rm >= best && history.length > 1')
  })

  it('v121 SS4: 문구가 그대로다 — 범례·목록 머리·상세·Day 변경·위험 구역', () => {
    const all = Object.values(SS4_FILES).join('\n')
    for (const t of ['이 달의 세션', '전체 보기', '기록이 없습니다.', '날짜 아래 점이 그날 준수입니다 (초록·노랑·빨강)', '회색 점 = 기록 있음 / 판정 전', '같은 기계라도 Day가 다르면 다른 기록입니다', '보조 무게 종목 — 숫자가', '메모 이력 (', '세션 히스토리 (최신순)', '아직 기록이 없습니다.', '이 Day 구성에 없는 종목', '잘못된 Day로 기록했나요?', '기록 키 재매핑', '기록은 지우지 않고 원래 키를 유지합니다', '변경 적용', '이 세션 기록이 삭제됩니다. 되돌릴 수 없습니다.', '세션을 찾을 수 없습니다.']) {
      expect(all, t).toContain(t)
    }
  })

  it('v121 SS4: 달력 칸의 접근성 이름·이전 달·다음 달은 PLAN 원문 그대로다', () => {
    expect(monthCalendar).toContain('label="이전 달"')
    expect(monthCalendar).toContain('label="다음 달"')
    for (const t of ['운동 ${sessionCount}회', '식단 ${DIET_NAME[dietDot]}', "'준수'", "'일부'", "'미달'", "'판정 전'"]) expect(monthCalendar, t).toContain(t)
  })
})
