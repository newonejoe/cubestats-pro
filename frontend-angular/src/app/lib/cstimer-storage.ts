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
  | 'scrambleType'
  | 'ollCaseIndex'
  | 'pllCaseIndex'
  | 'f2lCaseIndex'
  | 'zbllCaseIndex'
  | 'moveCount'
  | 'inspectionTime'
  | 'crossTime'
  | 'f2lTime'
  | 'ollTime'
  | 'PLLTime'
  | 'ollRecognitionTime'
  | 'pllRecognitionTime'
>;

export interface ParsedTraceMove {
  notation: string;
  offsetMs: number;
}

export interface SessionSolveRecord {
  id: number;
  tuple: CstimerSolveTuple;
  extra?: SessionSolveExtra;
}

const CUBE_TYPE_333 = '333';

/** Parse `U@0 R@120` style trace from Bluetooth history. */
export function parseMoveTrace(trace: string | null | undefined): ParsedTraceMove[] {
  if (!trace?.trim()) {
    return [];
  }
  const out: ParsedTraceMove[] = [];
  for (const token of trace.trim().split(/\s+/)) {
    const at = token.lastIndexOf('@');
    if (at <= 0) {
      continue;
    }
    const notation = token.slice(0, at).trim();
    const ms = Number.parseInt(token.slice(at + 1), 10);
    if (!notation || Number.isNaN(ms)) {
      continue;
    }
    out.push({ notation, offsetMs: ms });
  }
  return out;
}

/**
 * Same-offset runs (Bluetooth bursts) break csTimer phase timing if left as one @ms.
 * Spread each run linearly in (tLo, tHi): tHi is the next move's timestamp, or solve duration for the tail.
 * Preserves move order; keeps durations on a realistic scale so TPS = HTM / (execution_ms/1000) stays meaningful.
 */
export function spreadEqualTimestampRunsForRecons(
  trace: string | null | undefined,
  solveDurationMs: number | null | undefined,
): string {
  const moves = parseMoveTrace(trace);
  if (moves.length === 0) {
    return '';
  }
  const n = moves.length;
  const out: ParsedTraceMove[] = [];

  let a = 0;
  while (a < n) {
    const tVal = moves[a]!.offsetMs;
    let b = a;
    while (b + 1 < n && moves[b + 1]!.offsetMs === tVal) {
      b++;
    }
    const len = b - a + 1;
    const tLo = tVal;
    const nextIdx = b + 1;
    let tHi: number;
    if (nextIdx < n) {
      tHi = moves[nextIdx]!.offsetMs;
    } else if (solveDurationMs != null && solveDurationMs > tLo) {
      tHi = solveDurationMs;
    } else {
      tHi = tLo + Math.max(len, 1);
    }

    if (len === 1) {
      out.push({ notation: moves[a]!.notation, offsetMs: tLo });
    } else if (tHi > tLo) {
      for (let i = 0; i < len; i++) {
        const ts = Math.round(tLo + ((i + 1) * (tHi - tLo)) / (len + 1));
        out.push({ notation: moves[a + i]!.notation, offsetMs: ts });
      }
    } else {
      for (let i = 0; i < len; i++) {
        out.push({ notation: moves[a + i]!.notation, offsetMs: tLo + i });
      }
    }
    a = b + 1;
  }

  let last = -1;
  for (const m of out) {
    if (m.offsetMs <= last) {
      m.offsetMs = last + 1;
    }
    last = m.offsetMs;
  }

  return buildMoveAtMsTrace(out);
}

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
  if (solve.zbllCaseIndex !== undefined) {
    extra.zbllCaseIndex = solve.zbllCaseIndex;
  }
  if (solve.moveCount !== undefined) {
    extra.moveCount = solve.moveCount;
  }
  if (solve.inspectionTime !== undefined) {
    extra.inspectionTime = solve.inspectionTime;
  }
  if (solve.crossTime !== undefined) {
    extra.crossTime = solve.crossTime;
  }
  if (solve.f2lTime !== undefined) {
    extra.f2lTime = solve.f2lTime;
  }
  if (solve.ollTime !== undefined) {
    extra.ollTime = solve.ollTime;
  }
  if (solve.PLLTime !== undefined) {
    extra.PLLTime = solve.PLLTime;
  }
  if (solve.ollRecognitionTime !== undefined) {
    extra.ollRecognitionTime = solve.ollRecognitionTime;
  }
  if (solve.pllRecognitionTime !== undefined) {
    extra.pllRecognitionTime = solve.pllRecognitionTime;
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
    zbllCaseIndex: e?.zbllCaseIndex,
    moveCount: e?.moveCount,
    inspectionTime: e?.inspectionTime,
    crossTime: e?.crossTime,
    f2lTime: e?.f2lTime,
    ollTime: e?.ollTime,
    PLLTime: e?.PLLTime,
    ollRecognitionTime: e?.ollRecognitionTime,
    pllRecognitionTime: e?.pllRecognitionTime,
  };
}
