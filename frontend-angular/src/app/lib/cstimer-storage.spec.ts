import { describe, expect, it } from 'vitest';
import {
  buildMoveAtMsTrace,
  metaTupleFromSolve,
  parseMoveTrace,
  spreadEqualTimestampRunsForRecons,
  tupleFromSolve,
  solveFromRecord,
  type SessionSolveRecord
} from './cstimer-storage';

describe('cstimer-storage', () => {
  it('builds move@ms trace', () => {
    expect(
      buildMoveAtMsTrace([
        { notation: "D", offsetMs: 0 },
        { notation: "F", offsetMs: 733 },
      ])
    ).toBe('D@0 F@733');
  });

  it('maps meta tuple for DNF', () => {
    expect(metaTupleFromSolve({ time: 1000, scramble: 'x', dnf: true } as any)).toEqual([2, 1000]);
  });

  it('parseMoveTrace splits notation and ms', () => {
    expect(parseMoveTrace('U@0 R@120')).toEqual([
      { notation: 'U', offsetMs: 0 },
      { notation: 'R', offsetMs: 120 },
    ]);
    expect(parseMoveTrace('')).toEqual([]);
    expect(parseMoveTrace(undefined)).toEqual([]);
  });

  it('spreadEqualTimestampRunsForRecons spreads bursts between next stamp and solve end', () => {
    const s1 = spreadEqualTimestampRunsForRecons('U@0 R@0 F@0 D@900', null);
    const p1 = parseMoveTrace(s1);
    expect(p1.length).toBe(4);
    expect(p1[0]!.offsetMs).toBeLessThan(p1[1]!.offsetMs);
    expect(p1[1]!.offsetMs).toBeLessThan(p1[2]!.offsetMs);
    expect(p1[2]!.offsetMs).toBeLessThan(900);
    expect(p1[3]!.offsetMs).toBe(900);
    const s2 = spreadEqualTimestampRunsForRecons('A@0 B@0 C@0', 3000);
    const p2 = parseMoveTrace(s2);
    expect(p2.length).toBe(3);
    expect(p2[0]!.offsetMs).toBeLessThan(p2[1]!.offsetMs);
    expect(p2[1]!.offsetMs).toBeLessThan(p2[2]!.offsetMs);
    expect(p2[2]!.offsetMs).toBeLessThan(3000);
  });

  it('round-trips tuple through solveFromRecord', () => {
    const solve = {
      id: 5,
      time: 12000,
      finalTime: 12000,
      scramble: "R U",
      sessionId: 2,
      date: '2026-01-01T00:00:00.000Z',
      scrambleType: 'wca',
    };
    const tuple = tupleFromSolve(solve as any, { moveTrace: 'U@0 R@100', endWallMs: Date.parse(solve.date!) });
    const rec: SessionSolveRecord = { id: 5, tuple, extra: { scrambleType: 'wca' } };
    const back = solveFromRecord(rec, 2);
    expect(back.id).toBe(5);
    expect(back.sessionId).toBe(2);
    expect(back.moveTrace).toBe('U@0 R@100');
    expect(back.scramble).toBe('R U');
  });
});
