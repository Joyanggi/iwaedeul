# Astryx 적용 현황

> 2026-11-18, 커밋 e5f312a. `node scripts/astryx-inventory.mjs --write`가 만든다. `--check`가 맨 아래 합계 줄을 기준으로 뒷걸음을 막는다.

| 파일 | Astryx | 인라인 | 인라인 여백 | legacy 클래스 |
|---|---|---|---|---|
| src/App.tsx | 예 | 0 | 0 | 0 |
| src/ax/diet.tsx | 예 | 0 | 0 | 0 |
| src/ax/index.tsx | 예 | 0 | 0 | 0 |
| src/ax/scroll.tsx | 예 | 0 | 0 | 0 |
| src/ax/settings.tsx | 예 | 0 | 0 | 0 |
| src/components/AddExerciseSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/CompensationSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/CompensationWatchSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/DayPickerSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/DietDayEditor.tsx | 예 | 0 | 0 | 0 |
| src/components/DietIoPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/DietPlanSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/DietSlotSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/DietVariantSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/ExerciseCard.tsx | 예 | 0 | 0 | 0 |
| src/components/ExercisePickerSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/ExportPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/FinishSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/FoodLogSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/GistPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/ImportPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/ManualTimerSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/MealReminderPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/MonthCalendar.tsx | 예 | 0 | 0 | 0 |
| src/components/MuscleVolumeBars.tsx | 예 | 0 | 0 | 0 |
| src/components/NumberStepper.tsx | 예 | 0 | 0 | 0 |
| src/components/OpenSessionSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/RestTimerBar.tsx | 예 | 0 | 0 | 0 |
| src/components/RoutineIoPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/RoutineLineSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/RoutineListPanel.tsx | 예 | 0 | 0 | 0 |
| src/components/SessionResumeStrip.tsx | 예 | 0 | 0 | 0 |
| src/components/SubstituteSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/TabBar.tsx | 예 | 0 | 0 | 0 |
| src/components/TempoGuideSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/UpdatePrompt.tsx | 예 | 0 | 0 | 0 |
| src/components/WeekDots.tsx | 예 | 0 | 0 | 0 |
| src/components/WeightScaleSheet.tsx | 예 | 0 | 0 | 0 |
| src/components/icons.tsx | 제외 | 0 | 0 | 0 |
| src/main.tsx | 제외 | 0 | 0 | 0 |
| src/screens/AnalyzeScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/DietScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/ExerciseHistoryScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/HistoryScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/HomeScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/Onboarding.tsx | — | 3 | 0 | 11 |
| src/screens/RoutineEditorScreen.tsx | 예 | 5 | 0 | 0 |
| src/screens/SessionDetailScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/SessionScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/SettingsScreen.tsx | 예 | 0 | 0 | 0 |
| src/screens/SummaryScreen.tsx | 예 | 0 | 0 | 0 |

합계: `.tsx` 51개 가운데 Astryx를 읽는 것 48개, 화면이 아니라 뺀 것 2개, 인라인 스타일 8곳(여백 0), legacy 클래스 쓰임 11곳, 안 쓰는 legacy 선택자 0개.
