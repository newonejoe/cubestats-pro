import { describe, expect, it } from 'vitest';
import {
  buildMoveAtMsTrace,
  metaTupleFromSolve,
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
