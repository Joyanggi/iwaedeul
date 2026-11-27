#!/usr/bin/env node
// 실기기 검증용 DeviceKit 에이전트(mobile MCP가 기기 화면을 읽는 XCUITest 러너)의 서명 만료를 보고,
// 임박했을 때만 재서명한다. 절차의 사람용 설명은 .claude/skills/verify-device/SKILL.md 0절.
//
// 무료 Apple 계정이라 프로필이 7일이면 만료된다. 매 검증마다 재서명하면 맥북에서 빌드가 몇 분씩 돌고
// 실패할 기회만 늘어나므로, 남은 날을 보고 MIN_DAYS 이하일 때만 한다(대략 주 1회).
//
// 사용:
//   node scripts/device-agent.mjs           남은 날이 넉넉하면 한 줄 보고. 임박·미설치면 재서명·설치까지 한다.
//   node scripts/device-agent.mjs --check   보고만 한다. 임박·미설치면 종료 코드 1.
//   node scripts/device-agent.mjs --force   남은 날과 상관없이 재서명한다.
//
// 환경 변수(모두 선택):
//   DEVICEKIT_DIR   devicekit-ios 클론과 빌드 폴더가 있는 곳 (기본 ~/orca/tools)
//   APPLE_TEAM_ID   서명 팀 (기본: 지금 있는 devicekit 프로필의 팀)
//   DEVICE_UDID     대상 아이폰 (기본: USB로 연결된 첫 실기기)
//   MOBILECLI       mobilecli 바이너리 (기본: mobile MCP가 npx로 받은 것)
//   DEVICE_AGENT_MIN_DAYS  이 날 수 이하로 남으면 재서명 (기본 2)

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RUNNER_SUFFIX = 'devicekit-iosUITests.xctrunner';
const DAY_MS = 24 * 60 * 60 * 1000;

/** 프로필 목록 중 러너 것 하나 — 만료가 가장 늦은 것. 없으면 null. */
export function pickRunner(profiles) {
  const runners = profiles.filter((p) => p.name.endsWith(RUNNER_SUFFIX));
  if (runners.length === 0) return null;
  return runners.reduce((a, b) => (b.expires > a.expires ? b : a));
}

/** 재서명할지 정한다. installed=false면 프로필이 살아 있어도 설치는 해야 한다. */
export function decide({ runner, installed, now, minDays, force }) {
  if (force) return { action: 'renew', reason: '--force' };
  if (!runner) return { action: 'renew', reason: '러너 프로필 없음' };
  const daysLeft = (runner.expires.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft <= minDays) return { action: 'renew', reason: `만료 ${daysLeft.toFixed(1)}일 남음`, daysLeft };
  if (!installed) return { action: 'install', reason: '기기에 에이전트 없음', daysLeft };
  return { action: 'ok', daysLeft };
}

/** `xcrun devicectl list devices --json-output` 결과에서 USB로 붙은 실기기의 UDID. */
export function pickDevice(devicectlJson) {
  const devices = devicectlJson?.result?.devices ?? [];
  const wired = devices.find(
    (d) => d.hardwareProperties?.reality === 'physical' && d.connectionProperties?.transportType === 'wired',
  );
  return wired?.hardwareProperties?.udid ?? null;
}

/** 한국 시간으로 "12-04 11:03" */
export function kst(date) {
  const k = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}

// ---- 여기부터 맥에서 명령을 부르는 부분 ----

const PROFILE_DIR = join(homedir(), 'Library/Developer/Xcode/UserData/Provisioning Profiles');

function plistField(file, key) {
  const xml = execFileSync('security', ['cms', '-D', '-i', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return execFileSync('plutil', ['-extract', key, 'raw', '-', '-o', '-'], { input: xml, encoding: 'utf8' }).trim();
}

function readDevicekitProfiles() {
  if (!existsSync(PROFILE_DIR)) return [];
  return readdirSync(PROFILE_DIR)
    .filter((f) => f.endsWith('.mobileprovision'))
    .map((f) => join(PROFILE_DIR, f))
    .map((file) => ({ file, name: plistField(file, 'Name') }))
    .filter((p) => p.name.includes('devicekit'))
    .map((p) => ({ ...p, expires: new Date(plistField(p.file, 'ExpirationDate')), team: plistField(p.file, 'TeamIdentifier.0') }));
}

function findMobilecli() {
  if (process.env.MOBILECLI) return process.env.MOBILECLI;
  const out = spawnSync('find', [join(homedir(), '.npm/_npx'), '-path', '*mobilecli-darwin-arm64/mobilecli-darwin-arm64', '-type', 'f'], { encoding: 'utf8' });
  const found = out.stdout.split('\n').filter(Boolean)[0];
  if (!found) fail('mobilecli를 못 찾았다. mobile MCP를 한 번 띄우면 npx가 받아 온다(또는 MOBILECLI로 지정).');
  return found;
}

function findDevice() {
  if (process.env.DEVICE_UDID) return process.env.DEVICE_UDID;
  const jsonPath = join(tmpdir(), `devicectl-${process.pid}.json`);
  spawnSync('xcrun', ['devicectl', 'list', 'devices', '--json-output', jsonPath], { stdio: 'ignore' });
  const udid = existsSync(jsonPath) ? pickDevice(JSON.parse(readFileSync(jsonPath, 'utf8'))) : null;
  rmSync(jsonPath, { force: true });
  if (!udid) fail('USB로 연결된 아이폰이 없다. 꽂고 잠금을 푼 뒤 다시 돌린다.');
  return udid;
}

function agentInstalled(mcli, udid) {
  const out = spawnSync(mcli, ['agent', 'status', '--device', udid], { encoding: 'utf8' });
  return out.status === 0 && /is installed/.test(out.stdout);
}

function install(mcli, udid, runner) {
  const out = spawnSync(mcli, ['agent', 'install', '--device', udid, '--force', '--provisioning-profile', runner.file], { encoding: 'utf8' });
  if (out.status !== 0 || !/installed successfully/.test(out.stdout)) {
    fail(`에이전트 설치 실패:\n${(out.stdout + out.stderr).trim().split('\n').slice(-10).join('\n')}`);
  }
}

function renew(udid, team) {
  const base = process.env.DEVICEKIT_DIR ?? join(homedir(), 'orca/tools');
  const project = join(base, 'devicekit-ios/devicekit-ios.xcodeproj');
  if (!existsSync(project)) fail(`${project}가 없다. 0절 3번대로 devicekit-ios를 ${base}에 클론한다.`);

  // Xcode는 아직 유효한 프로필을 다시 쓴다 — 치워야 새로 받는다. 지우지 않고 옮긴다.
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
  const backup = join(homedir(), `Library/Developer/Xcode/UserData/ProvisioningProfiles-backup-${stamp}`);
  const old = readDevicekitProfiles();
  mkdirSync(backup, { recursive: true });
  for (const p of old) renameSync(p.file, join(backup, p.file.split('/').pop()));
  const restore = () => {
    for (const p of old) renameSync(join(backup, p.file.split('/').pop()), p.file);
  };

  const log = join(base, 'devicekit-build.log');
  const build = spawnSync(
    'sh',
    ['-c', `xcodebuild -project "$1" -scheme devicekit-ios -configuration Debug -destination id="$2" -derivedDataPath "$3" -jobs 2 -allowProvisioningUpdates -allowProvisioningDeviceRegistration DEVELOPMENT_TEAM="$4" build-for-testing > "$5" 2>&1`, 'sh', project, udid, join(base, 'devicekit-derived'), team, log],
    { stdio: 'ignore' },
  );
  const fresh = pickRunner(readDevicekitProfiles());
  if (build.status !== 0 || !fresh) {
    if (!fresh) restore();
    const tail = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter((l) => /error:|BUILD/.test(l)).slice(-8).join('\n') : '';
    fail(`DeviceKit 빌드 실패(옛 프로필은 ${fresh ? backup : '제자리로 되돌림'}). 전체 로그: ${log}\n${tail}\nXcode의 Apple 계정 로그인이 풀렸으면 Xcode → Settings → Accounts에서 사람이 다시 로그인한다.`);
  }
  return fresh;
}

function fail(message) {
  console.error(`device-agent: ${message}`);
  process.exit(1);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const minDays = Number(process.env.DEVICE_AGENT_MIN_DAYS ?? 2);
  const udid = findDevice();
  const mcli = findMobilecli();
  const profiles = readDevicekitProfiles();
  let runner = pickRunner(profiles);
  const installed = agentInstalled(mcli, udid);
  const decision = decide({ runner, installed, now: new Date(), minDays, force: args.has('--force') });

  if (decision.action === 'ok') {
    console.log(`에이전트 OK — 서명 만료 ${kst(runner.expires)} (한국 시간, ${decision.daysLeft.toFixed(1)}일 남음)`);
    return;
  }
  if (args.has('--check')) fail(`${decision.reason} — 재서명이 필요하다: node scripts/device-agent.mjs`);

  if (decision.action === 'renew') {
    const team = process.env.APPLE_TEAM_ID ?? runner?.team ?? profiles[0]?.team;
    if (!team) fail('서명 팀을 모른다. APPLE_TEAM_ID=<팀 ID>로 지정한다.');
    console.log(`재서명: ${decision.reason}. DeviceKit을 다시 빌드한다(몇 분 걸린다)…`);
    runner = renew(udid, team);
  }
  install(mcli, udid, runner);
  console.log(`에이전트 ${decision.action === 'renew' ? '재서명·설치' : '설치'} 완료 — 서명 만료 ${kst(runner.expires)} (한국 시간)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
