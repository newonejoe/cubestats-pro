import {
  computeAverageOfN,
  computeBest,
  computeSessionStats,
  computeTrainingSummary,
  filterBySession,
  filterByTimeWindow
} from './analysis-selectors';
import { Solve } from '../services/state.service';

describe('analysis-selectors', () => {
  it('computes best and ao5 ignoring DNF by returning null for invalid window', () => {
    const solves: Solve[] = [
      { time: 10000, scramble: 'R U', finalTime: 10000 },
      { time: 11000, scramble: 'R U', finalTime: 11000 },
      { time: 12000, scramble: 'R U', finalTime: 12000 },
      { time: 13000, scramble: 'R U', finalTime: 13000 },
      { time: 14000, scramble: 'R U', finalTime: null, dnf: true },
    ];
    expect(computeBest(solves)).toBe(10000);
    expect(computeAverageOfN(solves, 5)).toBeNull();
  });

  it('groups training stats by scramble type and case', () => {
    const solves: Solve[] = [
      { time: 10000, scramble: 'x', scrambleType: 'oll', ollCaseIndex: 12 },
      { time: 12000, scramble: 'x', scrambleType: 'oll', ollCaseIndex: 12 },
      { time: 15000, scramble: 'x', scrambleType: 'pll', pllCaseIndex: 3 },
    ];
    const summary = computeTrainingSummary(solves);
    expect(summary.byType.find((x) => x.key === 'oll')?.count).toBe(2);
    expect(summary.ollCases.find((x) => x.key === '12')?.count).toBe(2);
    expect(summary.pllCases.find((x) => x.key === '3')?.count).toBe(1);
  });

  it('filters solves by session', () => {
    const solves: Solve[] = [
      { time: 10000, scramble: 'x', sessionId: 1, endTime: '2026-03-20T10:00:00.000Z' },
      { time: 12000, scramble: 'x', sessionId: 2, endTime: '2026-03-20T11:00:00.000Z' },
    ];
    expect(filterBySession(solves, 1)).toHaveLength(1);
    expect(filterBySession(solves, 'all')).toHaveLength(2);
  });

  it('filters solves by custom window safely', () => {
    const solves: Solve[] = [
      { time: 10000, scramble: 'x', endTime: '2026-03-10T10:00:00.000Z' },
      { time: 12000, scramble: 'x', endTime: '2026-03-20T11:00:00.000Z' },
    ];
    const filtered = filterByTimeWindow(solves, 'custom', '2026-03-15', '2026-03-22');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.time).toBe(12000);
  });

  it('computes session stats with DNF affecting ao window', () => {
    const solves: Solve[] = [
      { time: 10000, scramble: 'x', finalTime: 10000, endTime: '2026-03-20T10:00:00.000Z' },
      { time: 11000, scramble: 'x', finalTime: 11000, endTime: '2026-03-20T10:01:00.000Z' },
      { time: 12000, scramble: 'x', finalTime: 12000, endTime: '2026-03-20T10:02:00.000Z' },
      { time: 13000, scramble: 'x', finalTime: 13000, endTime: '2026-03-20T10:03:00.000Z' },
      { time: 14000, scramble: 'x', finalTime: null, dnf: true, endTime: '2026-03-20T10:04:00.000Z' },
    ];
    const stats = computeSessionStats(solves);
    expect(stats.solveCount).toBe(5);
    expect(stats.best).toBe(10000);
    expect(stats.ao5).toBeNull();
    expect(stats.dnfCount).toBe(1);
  });
});

