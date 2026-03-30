import { describe, expect, it } from 'vitest';
import { buildCstimerTimesForCalcRecons, cstimerReconsEngineReady } from './cstimer-recons';
import type { Solve } from '../services/state.service';

describe('cstimer-recons', () => {
  it('buildCstimerTimesForCalcRecons matches csTimer tuple[4] shape', () => {
    const solve = {
      time: 12000,
      scramble: "R U R'",
      moveTrace: "R@0 U@100 R'@200",
    } as Solve;
    const t = buildCstimerTimesForCalcRecons(solve);
    expect(t).not.toBeNull();
    expect(t![0]).toEqual([0, 12000]);
    expect(t![1]).toBe("R U R'");
    expect(t![4]).toEqual(['R@0 U@100 R\'@200', '333']);
  });

  it('returns null without trace', () => {
    const solve = { time: 1, scramble: 'x' } as Solve;
    expect(buildCstimerTimesForCalcRecons(solve)).toBeNull();
  });

  it('cstimerReconsEngineReady is false in Vitest (no mathlib)', () => {
    expect(cstimerReconsEngineReady()).toBe(false);
  });
});
