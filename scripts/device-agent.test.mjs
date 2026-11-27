// scripts/device-agent.mjs — 재서명을 "임박했을 때만" 하는 판단과, 프로필·기기 고르기를 잠근다.
// 맥 명령(xcodebuild·security·mobilecli)을 부르는 부분은 실기기에서만 돈다(verify-device 스킬 0절).
import { describe, expect, it } from 'vitest';
import { decide, kst, pickDevice, pickRunner, RUNNER_SUFFIX } from './device-agent.mjs';

const NOW = new Date('2026-11-27T02:00:00Z');
const days = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const runner = (n, file = 'r.mobileprovision') => ({ file, name: `iOS Team Provisioning Profile: dev.x.mobilenext.${RUNNER_SUFFIX}`, expires: days(n) });
const app = (n) => ({ file: 'a.mobileprovision', name: 'iOS Team Provisioning Profile: dev.x.mobilenext.devicekit-ios', expires: days(n) });

describe('device-agent: 러너 프로필 고르기', () => {
  it('앱 프로필은 고르지 않는다 — 에이전트는 러너 프로필로 설치한다', () => {
    expect(pickRunner([app(6)])).toBeNull();
  });

  it('러너가 여럿이면 만료가 가장 늦은 것', () => {
    expect(pickRunner([runner(1, 'old'), app(9), runner(6, 'new')]).file).toBe('new');
  });
});

describe('device-agent: 재서명할지', () => {
  const base = { now: NOW, minDays: 2, force: false, installed: true };

  it('넉넉하면 아무것도 하지 않는다(빌드 몇 분을 매 검증마다 쓰지 않는다)', () => {
    const d = decide({ ...base, runner: runner(5) });
    expect(d.action).toBe('ok');
    expect(d.daysLeft).toBeCloseTo(5);
  });

  it.each([2, 1.5, 0, -1])('남은 날 %s ≤ 2면 재서명', (n) => {
    expect(decide({ ...base, runner: runner(n) }).action).toBe('renew');
  });

  it('러너 프로필이 없으면 재서명', () => {
    expect(decide({ ...base, runner: null }).action).toBe('renew');
  });

  it('프로필이 살아 있는데 기기에 없으면 다시 빌드하지 않고 설치만', () => {
    expect(decide({ ...base, runner: runner(5), installed: false }).action).toBe('install');
  });

  it('임박이 미설치보다 앞선다 — 곧 만료될 프로필로 설치하지 않는다', () => {
    expect(decide({ ...base, runner: runner(1), installed: false }).action).toBe('renew');
  });

  it('--force면 남은 날과 상관없이 재서명', () => {
    expect(decide({ ...base, runner: runner(6), force: true }).action).toBe('renew');
  });
});

describe('device-agent: 기기 고르기', () => {
  const dev = (reality, transportType, udid) => ({ hardwareProperties: { reality, udid }, connectionProperties: { transportType } });

  it('USB로 붙은 실기기만 — 시뮬레이터와 무선(페어링만 된) 기기는 건너뛴다', () => {
    const json = { result: { devices: [dev('simulated', 'sameMachine', 'SIM'), dev('physical', 'localNetwork', 'WIFI'), dev('physical', 'wired', 'USB')] } };
    expect(pickDevice(json)).toBe('USB');
  });

  it('없으면 null', () => {
    expect(pickDevice({ result: { devices: [dev('physical', 'localNetwork', 'WIFI')] } })).toBeNull();
    expect(pickDevice({})).toBeNull();
  });
});

describe('device-agent: 한국 시간 표기', () => {
  it('UTC에 9시간을 더해 날짜가 넘어가도 맞게 쓴다', () => {
    expect(kst(new Date('2026-12-04T02:03:28Z'))).toBe('12-04 11:03');
    expect(kst(new Date('2026-11-30T20:30:00Z'))).toBe('12-01 05:30');
  });
});
