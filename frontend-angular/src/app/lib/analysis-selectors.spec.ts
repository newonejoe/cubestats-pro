import {
  computeAverageOfN,
  computeBest,
  computeRollingAoBySolve,
  computeSessionStats,
  computeTrainingSummary,
  filterBySession,
  filterByTimeWindow,
  primaryMetricValue,
  sortSolvesByMetric,
  allocatePhaseTurnCounts,
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

  it('sortSolvesByMetric: total ascending, move count descending', () => {
    const solves: Solve[] = [
      { time: 3000, scramble: 'x', finalTime: 3000, moveCount: 40 },
      { time: 1000, scramble: 'x', finalTime: 1000, moveCount: 60 },
      { time: 2000, scramble: 'x', finalTime: 2000, moveCount: 50 },
    ];
    const byTime = sortSolvesByMetric(solves, 'total');
    expect(byTime.map((s) => s.finalTime)).toEqual([1000, 2000, 3000]);
    const byMoves = sortSolvesByMetric(solves, 'moveCount');
    expect(byMoves.map((s) => s.moveCount)).toEqual([60, 50, 40]);
  });

  it('sortSolvesByMetric: timestamp newest first', () => {
    const solves: Solve[] = [
      { time: 1000, scramble: 'a', endTime: '2026-03-20T10:00:00.000Z' },
      { time: 2000, scramble: 'b', endTime: '2026-03-20T12:00:00.000Z' },
      { time: 3000, scramble: 'c', endTime: '2026-03-20T11:00:00.000Z' },
    ];
    const sorted = sortSolvesByMetric(solves, 'timestamp');
    expect(sorted.map((s) => s.scramble)).toEqual(['b', 'c', 'a']);
  });

  it('primaryMetricValue reads CFOP and inspection', () => {
    const s: Solve = {
      time: 1000,
      scramble: 'x',
      inspectionTime: 15,
      crossTime: 100,
      f2lTime: 400,
      ollTime: 50,
      PLLTime: 80,
      ollRecognitionTime: 12,
      pllRecognitionTime: 20,
      moveCount: 44,
      finalTime: 1000,
    };
    expect(primaryMetricValue(s, 'inspection')).toBe(15000);
    expect(primaryMetricValue(s, 'cross')).toBe(100);
    expect(primaryMetricValue(s, 'ollRecog')).toBe(12);
  });

  it('allocatePhaseTurnCounts splits evenly without phase times', () => {
    const s: Solve = { time: 1000, scramble: 'x' };
    const c = allocatePhaseTurnCounts(s, 10);
    expect(c.cross + c.f2l + c.oll + c.pll).toBe(10);
  });

  it('computeRollingAoBySolve: trailing WCA ao5 after each chronological solve', () => {
    const mk = (ms: number, t: string): Solve => ({
      time: ms,
      scramble: 'x',
      finalTime: ms,
      endTime: t,
    });
    const solves: Solve[] = [
      mk(10000, '2026-03-20T10:00:00.000Z'),
      mk(11000, '2026-03-20T10:01:00.000Z'),
      mk(12000, '2026-03-20T10:02:00.000Z'),
      mk(13000, '2026-03-20T10:03:00.000Z'),
      mk(14000, '2026-03-20T10:04:00.000Z'),
    ];
    const map = computeRollingAoBySolve(solves);
    expect(map.get(solves[0]!)?.ao5).toBeNull();
    expect(map.get(solves[4]!)?.ao5).toBe(12000);
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

