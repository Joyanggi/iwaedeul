/**
 * 비밀값 저장소 (DESIGN.md §3 · §11).
 *
 * "gistToken?: string;  // PAT (gist scope), localStorage"
 *
 * **Dexie settings 테이블에 절대 넣지 않는다.** JSON 백업 내보내기(§5.5)가 Dexie를
 * 통째로 덤프하므로, settings에 토큰이 있으면 백업 파일에 GitHub PAT가 그대로 들어간다.
 * 그 파일은 공유 시트로 나가고 Gist에 올라간다. 레포도 public이다.
 *
 * 타입 차원에서 막을 수 없으니(Settings 인터페이스에 필드가 있었다) 두 겹으로 막았다:
 *   1. 저장 경로를 localStorage로 분리 (이 파일)
 *   2. db.setSetting이 비밀 키를 거부 (db/index.ts의 assertNotSecret)
 */

/** Dexie settings에 저장이 금지된 키 */
export const SECRET_SETTING_KEYS: readonly string[] = ['gistToken']

export function isSecretSettingKey(key: string): boolean {
  return SECRET_SETTING_KEYS.includes(key)
}
