import { Solve } from '../services/state.service';

/** csTimer-style 5-field solve tuple (see cstimerlogs/session-data.md) */
export type CstimerSolveTuple = [
  [number, number],
  string,
  string,
  number,
  [string, string]
];

/** App fields not represented in the raw csTimer tuple */
export type SessionSolveExtra = Pick<
  Solve,
  'scrambleType' | 'ollCaseIndex' | 'pllCaseIndex' | 'f2lCaseIndex' | 'moveCount' | 'inspectionTime'
>;

export interface SessionSolveRecord {
  id: number;
  tuple: CstimerSolveTuple;
  extra?: SessionSolveExtra;
}

const CUBE_TYPE_333 = '333';

export function buildMoveAtMsTrace(parts: { notation: string; offsetMs: number }[]): string {
  return parts
    .map((p) => {
      const n = p.notation.trim();
      if (!n) {
        return '';
      }
      return `${n}@${p.offsetMs}`;
    })
    .filter(Boolean)
    .join(' ');
}

export function metaTupleFromSolve(solve: Solve): [number, number] {
  const penalty = solve.dnf ? 2 : solve.plus2 ? 1 : 0;
  const raw = solve.time ?? 0;
  return [penalty, Math.round(raw)];
}

export function endUnixSecondsFromSolve(solve: Solve, endWallMs: number): number {
  const fromDate = solve.date ?? solve.endTime;
  if (fromDate) {
    const t = Date.parse(fromDate);
    if (!Number.isNaN(t)) {
      return Math.floor(t / 1000);
    }
  }
  return Math.floor(endWallMs / 1000);
}

export function tupleFromSolve(solve: Solve, opts: { moveTrace: string; endWallMs: number }): CstimerSolveTuple {
  const meta = metaTupleFromSolve(solve);
  const scramble = solve.scramble ?? '';
  const comment = '';
  const endUnix = endUnixSecondsFromSolve(solve, opts.endWallMs);
  const trace: [string, string] = [opts.moveTrace, CUBE_TYPE_333];
  return [meta, scramble, comment, endUnix, trace];
}

export function extraFromSolve(solve: Solve): SessionSolveExtra | undefined {
  const extra: SessionSolveExtra = {};
  if (solve.scrambleType !== undefined) {
    extra.scrambleType = solve.scrambleType;
  }
  if (solve.ollCaseIndex !== undefined) {
    extra.ollCaseIndex = solve.ollCaseIndex;
  }
  if (solve.pllCaseIndex !== undefined) {
    extra.pllCaseIndex = solve.pllCaseIndex;
  }
  if (solve.f2lCaseIndex !== undefined) {
    extra.f2lCaseIndex = solve.f2lCaseIndex;
  }
  if (solve.moveCount !== undefined) {
    extra.moveCount = solve.moveCount;
  }
  if (solve.inspectionTime !== undefined) {
    extra.inspectionTime = solve.inspectionTime;
  }
  return Object.keys(extra).length ? extra : undefined;
}

export function solveFromRecord(rec: SessionSolveRecord, sessionId: number): Solve {
  const [meta, scramble, , endUnix, trace] = rec.tuple;
  const [penaltyCode, timeMs] = meta;
  const [moveTrace] = trace;
  const dnf = penaltyCode === 2;
  const plus2 = penaltyCode === 1;
  const date = new Date(endUnix * 1000).toISOString();
  const e = rec.extra;
  return {
    id: rec.id,
    sessionId,
    time: timeMs,
    finalTime: dnf ? null : plus2 ? timeMs + 2000 : timeMs,
    scramble,
    dnf,
    plus2,
    date,
    endTime: date,
    moveTrace: moveTrace || undefined,
    scrambleType: e?.scrambleType,
    ollCaseIndex: e?.ollCaseIndex,
    pllCaseIndex: e?.pllCaseIndex,
    f2lCaseIndex: e?.f2lCaseIndex,
    moveCount: e?.moveCount,
    inspectionTime: e?.inspectionTime,
  };
}
