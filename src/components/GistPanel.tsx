import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSettings } from '../db'
import { parseBackup, restoreBackup, summarizeBackup, type BackupSummary } from '../lib/backup'
import { GistError, readGist, verifyToken } from '../lib/gist'
import {
  getSyncState,
  isGistConfigured,
  subscribeSync,
  syncNow,
  type SyncState,
} from '../lib/gistSync'
import { getGistToken, maskToken, setGistToken } from '../lib/secrets'
import { Banner, Button, Card, HStack, Row, Rows, Text, TextField, VStack } from '../ax'
import { Link } from '../ax/settings'
import { formatDateTimeLocal } from '../lib/dates'

const TOKEN_HELP = 'https://github.com/settings/tokens/new?scopes=gist&description=workout-tracker'

function stateLabel(s: SyncState): string {
  switch (s.status) {
    case 'idle':
      return ''
    case 'pending':
      return '잠시 후 자동 백업합니다…'
    case 'syncing':
      return '백업 중…'
    case 'done':
      /*
        스킵과 업로드를 **문구로** 구분한다 (Z7). 스킵은 lastBackupAt을 갱신하지 않으므로
        "백업 완료 <옛 시각>"이 뜨면 방금 올린 것과 구분되지 않는다.
      */
      return s.skipped
        ? `변경 없음 — 마지막 백업 ${formatDateTimeLocal(s.at)}`
        : `백업 완료 ${formatDateTimeLocal(s.at)}`
    case 'error':
      return `실패: ${s.message}`
  }
}

/**
 * Gist 백업 (DESIGN.md §5.5).
 *
 * §11: "토큰은 코드에 없음, 사용자 입력 후 localStorage만."
 * 입력 필드는 저장 후 즉시 비운다. 저장된 토큰은 마스킹해서만 보여주고
 * 다시 읽어 표시하지 않는다 — 화면 캡처나 공유 시트로 새는 경로를 줄인다.
 */
export default function GistPanel() {
  const [tokenInput, setTokenInput] = useState('')
  const [configured, setConfigured] = useState(isGistConfigured)
  const [masked, setMasked] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncState>(getSyncState)
  const [restoreStaged, setRestoreStaged] = useState<{ text: string; summary: BackupSummary } | null>(null)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const gistId = useLiveQuery(async () => (await db.settings.get('gistId'))?.value as string | undefined, [])
  const lastBackupAt = useLiveQuery(
    async () => (await db.settings.get('lastBackupAt'))?.value as string | undefined,
    [],
  )

  useEffect(() => subscribeSync(setSync), [])
  useEffect(() => {
    const token = getGistToken()
    setMasked(token ? maskToken(token) : null)
  }, [configured])

  const onSaveToken = async () => {
    const value = tokenInput.trim()
    if (!value) return
    setBusy(true)
    setMessage(null)
    try {
      const { login, hasGistScope } = await verifyToken(value)
      if (hasGistScope === false) {
        setMessage('이 토큰에 gist 권한이 없습니다. gist 스코프를 포함해 다시 발급하세요.')
        return
      }
      setGistToken(value)
      setTokenInput('') // 입력값을 화면에 남기지 않는다
      setConfigured(true)
      setAccount(login)
      setMessage(
        hasGistScope === null
          ? `${login} 계정으로 저장했습니다. (fine-grained 토큰은 권한 확인이 불가하니 백업을 한 번 눌러보세요)`
          : `${login} 계정으로 저장했습니다.`,
      )
    } catch (err) {
      setMessage(err instanceof GistError ? err.message : '토큰 확인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const onRemoveToken = async () => {
    setGistToken(null)
    setConfigured(false)
    setAccount(null)
    setConfirmRemove(false)
    setMessage('토큰을 삭제했습니다. Gist 자체는 GitHub에 남아 있습니다.')
  }

  const onBackupNow = async () => {
    setBusy(true)
    // 결과는 sync 상태 줄이 보여준다. 여기서 message에도 담으면 같은 에러가 두 번 뜬다
    setMessage(null)
    await syncNow()
    setBusy(false)
  }

  const onFetchGist = async () => {
    const token = getGistToken()
    if (!token || !gistId) return
    setBusy(true)
    setMessage(null)
    setRestoreStaged(null)
    setConfirmRestore(false)
    try {
      const { content } = await readGist(token, gistId)
      const parsed = parseBackup(content)
      if ('problems' in parsed) {
        setMessage(`Gist 내용을 쓸 수 없습니다: ${parsed.problems[0]}`)
        return
      }
      setRestoreStaged({ text: content, summary: summarizeBackup(parsed.file) })
    } catch (err) {
      setMessage(err instanceof GistError ? err.message : 'Gist를 읽지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const onRestore = async () => {
    if (!restoreStaged) return
    const parsed = parseBackup(restoreStaged.text)
    if ('problems' in parsed) return
    setBusy(true)
    await restoreBackup(parsed.file)
    window.location.reload()
  }

  const onForgetGist = async () => {
    await deleteSettings(['gistId', 'lastBackupAt'])
    setMessage('연결된 Gist를 잊었습니다. 다음 백업에서 새로 만듭니다.')
  }

  return (
    <Card>
      <VStack gap={3}>
        <Text type="supporting" color="secondary">
          Gist 백업
        </Text>

        {!configured ? (
          <>
            <Text type="supporting" color="secondary">
              <b>gist</b> 권한만 있는 개인 액세스 토큰을 붙여넣으세요. 토큰은 이 기기의
              localStorage에만 저장되고 백업 파일이나 코드에는 들어가지 않습니다.
            </Text>
            <Link href={TOKEN_HELP} isExternalLink>
              GitHub에서 토큰 발급하기
            </Link>
            <TextField
              type="password"
              label="GitHub 개인 액세스 토큰"
              isLabelHidden
              value={tokenInput}
              onChange={setTokenInput}
              placeholder="ghp_… 또는 github_pat_…"
            />
            <HStack>
              <Button
                variant="primary"
                size="sm"
                label={busy ? '확인 중…' : '토큰 저장'}
                isDisabled={busy || tokenInput.trim().length === 0}
                onClick={() => void onSaveToken()}
              />
            </HStack>
          </>
        ) : (
          <>
            <Rows>
              <Row
                label={<Text>토큰 저장됨</Text>}
                description={<Text type="code">{masked ?? '••••'}</Text>}
                end={account ? <Text color="secondary">{account}</Text> : null}
              />
              <Row
                label={<Text>연결된 Gist</Text>}
                description={<Text type="code">{gistId ?? '아직 없음 (첫 백업에서 생성)'}</Text>}
              />
              <Row
                label={<Text>마지막 백업</Text>}
                description={
                  <Text type="supporting" color="secondary">
                    {lastBackupAt ? formatDateTimeLocal(lastBackupAt) : '없음'}
                  </Text>
                }
              />
            </Rows>

            <HStack gap={2} wrap="wrap">
              <Button variant="primary" size="sm" label="지금 백업" isDisabled={busy} onClick={() => void onBackupNow()} />
              <Button variant="secondary" size="sm" label="Gist에서 복원" isDisabled={busy || !gistId} onClick={() => void onFetchGist()} />
            </HStack>

            {restoreStaged && (
              <>
                <Banner
                  status="warning"
                  title="Gist 백업 내용"
                  collapsible={false}
                  description={
                    <>
                      세션 {restoreStaged.summary.sessions}개 ({restoreStaged.summary.oldestSession ?? '—'} ~{' '}
                      {restoreStaged.summary.newestSession ?? '—'})
                      <br />
                      내보낸 시각 {formatDateTimeLocal(restoreStaged.summary.exportedAt)}
                      <br />
                      복원하면 현재 데이터를 <b>전부 교체</b>합니다.
                    </>
                  }
                />
                {!confirmRestore ? (
                  <HStack gap={2}>
                    <Button variant="secondary" size="sm" label="취소" onClick={() => setRestoreStaged(null)} />
                    <Button variant="destructive" size="sm" label="이 내용으로 교체" onClick={() => setConfirmRestore(true)} />
                  </HStack>
                ) : (
                  <HStack gap={2}>
                    <Button variant="secondary" size="sm" label="취소" isDisabled={busy} onClick={() => setConfirmRestore(false)} />
                    <Button
                      variant="destructive"
                      size="sm"
                      label={busy ? '복원 중…' : '정말 교체'}
                      isDisabled={busy}
                      onClick={() => void onRestore()}
                    />
                  </HStack>
                )}
              </>
            )}

            <HStack gap={2} wrap="wrap">
              {confirmRemove ? (
                <>
                  <Button variant="secondary" size="sm" label="취소" onClick={() => setConfirmRemove(false)} />
                  <Button variant="destructive" size="sm" label="토큰 삭제 확인" onClick={() => void onRemoveToken()} />
                </>
              ) : (
                <>
                  <Button variant="secondary" size="sm" label="토큰 삭제" onClick={() => setConfirmRemove(true)} />
                  {gistId && <Button variant="secondary" size="sm" label="Gist 연결 해제" onClick={() => void onForgetGist()} />}
                </>
              )}
            </HStack>
          </>
        )}

        {sync.status !== 'idle' && (
          <Text className={sync.status === 'error' ? 'ax-text-error' : undefined} color={sync.status === 'error' ? undefined : 'accent'}>
            {stateLabel(sync)}
          </Text>
        )}
        {message && <Text color="accent">{message}</Text>}

        <Text type="supporting" color="secondary">
          secret gist로 만들어집니다 (URL을 아는 사람만 볼 수 있음). 세션을 종료하면 자동으로
          올라갑니다.
        </Text>
      </VStack>
    </Card>
  )
}
