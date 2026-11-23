import { useState } from 'react'
import {
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
  type BackupSummary,
} from '../lib/backup'
import { pickTextFile } from '../lib/pickFile'
import { formatDateTimeLocal } from '../lib/dates'
import { Banner, Button, Card, HStack, Row, Rows, Text, VStack } from '../ax'

/**
 * JSON 복원 (DESIGN.md §5.5).
 * "가져오기: JSON 복원 (병합 아닌 전체 교체, 확인 2단계)"
 *
 * 1단계 = 파일을 읽고 내용 요약을 보여준다 (무엇으로 교체되는지 알려주는 단계)
 * 2단계 = 명시적 확인
 */
export default function ImportPanel() {
  const [staged, setStaged] = useState<{ name: string; file: BackupFile; summary: BackupSummary } | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const onPick = async () => {
    setProblems([])
    setStaged(null)
    setConfirming(false)
    const picked = await pickTextFile('application/json,.json')
    if (!picked) return
    const result = parseBackup(picked.text)
    if ('problems' in result) {
      setProblems(result.problems)
      return
    }
    setStaged({ name: picked.name, file: result.file, summary: summarizeBackup(result.file) })
  }

  const onRestore = async () => {
    if (!staged) return
    setBusy(true)
    await restoreBackup(staged.file)
    // 복원 후에는 화면 상태가 전부 낡았다. 부분 갱신을 시도하기보다 새로 띄운다
    window.location.reload()
  }

  return (
    <Card>
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          가져오기 (JSON 복원)
        </Text>

        {problems.length > 0 && (
          <Banner
            status="error"
            title="불러올 수 없는 파일입니다"
            collapsible={false}
            description={problems.map((p) => (
              <span key={p}>
                · {p}
                <br />
              </span>
            ))}
          />
        )}

        {!staged ? (
          <>
            <HStack>
              <Button variant="secondary" size="sm" label="백업 파일 선택" onClick={() => void onPick()} />
            </HStack>
            <Text type="supporting" color="secondary">
              현재 데이터를 <b>전부 교체</b>합니다. 병합하지 않습니다.
            </Text>
          </>
        ) : (
          <>
            <Rows>
              <Row
                label={<Text type="code">{staged.name}</Text>}
                description={
                  <Text type="supporting" color="secondary">
                    내보낸 시각 {formatDateTimeLocal(staged.summary.exportedAt)}
                  </Text>
                }
              />
              <Row
                label={<Text>세션</Text>}
                description={
                  <Text type="supporting" color="secondary">
                    {staged.summary.oldestSession ?? '—'} ~ {staged.summary.newestSession ?? '—'}
                  </Text>
                }
                end={<Text color="secondary" hasTabularNumbers>{staged.summary.sessions}개</Text>}
              />
              <Row
                label={<Text>루틴 / 종목</Text>}
                end={
                  <Text color="secondary" hasTabularNumbers>
                    {staged.summary.routines} / {staged.summary.exercises}
                  </Text>
                }
              />
            </Rows>

            {!confirming ? (
              <HStack gap={2}>
                <Button variant="secondary" size="sm" label="취소" onClick={() => setStaged(null)} />
                <Button variant="destructive" size="sm" label="이 파일로 교체" onClick={() => setConfirming(true)} />
              </HStack>
            ) : (
              <>
                <Text className="ax-text-error">
                  현재 기록이 모두 삭제되고 이 파일의 내용으로 대체됩니다. 되돌릴 수 없습니다.
                </Text>
                <HStack gap={2}>
                  <Button variant="secondary" size="sm" label="취소" isDisabled={busy} onClick={() => setConfirming(false)} />
                  <Button
                    variant="destructive"
                    size="sm"
                    label={busy ? '복원 중…' : '정말 교체'}
                    isDisabled={busy}
                    onClick={() => void onRestore()}
                  />
                </HStack>
              </>
            )}
          </>
        )}
      </VStack>
    </Card>
  )
}
