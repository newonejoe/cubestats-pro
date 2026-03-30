import { parseMoveTrace, type ParsedTraceMove } from './cstimer-storage';

/**
 * csTimer-style heuristic: long gaps between consecutive @ms timestamps suggest pauses between steps.
 * This is not facelet-based CFOP recognition (see cstimer recons.js for full approach).
 */
export const DEFAULT_TRACE_PAUSE_GAP_MS = 420;

export function segmentTraceByPauses(
  moves: ParsedTraceMove[],
  gapMs: number = DEFAULT_TRACE_PAUSE_GAP_MS,
): ParsedTraceMove[][] {
  if (moves.length === 0) {
    return [];
  }
  const segments: ParsedTraceMove[][] = [];
  let cur: ParsedTraceMove[] = [moves[0]!];
  for (let i = 1; i < moves.length; i++) {
    const delta = moves[i]!.offsetMs - moves[i - 1]!.offsetMs;
    if (delta > gapMs) {
      segments.push(cur);
      cur = [];
    }
    cur.push(moves[i]!);
  }
  segments.push(cur);
  return segments;
}

function spanExecutionMs(moves: ParsedTraceMove[]): number {
  if (moves.length === 0) {
    return 0;
  }
  return Math.max(0, moves[moves.length - 1]!.offsetMs - moves[0]!.offsetMs);
}

function chunkF2lForDisplay(moves: ParsedTraceMove[]): ParsedTraceMove[][] {
  if (moves.length === 0) {
    return [];
  }
  const chunk = Math.max(1, Math.ceil(moves.length / 4));
  const out: ParsedTraceMove[][] = [];
  for (let i = 0; i < 4; i++) {
    const slice = moves.slice(i * chunk, i * chunk + chunk);
    if (slice.length > 0) {
      out.push(slice);
    }
  }
  return out;
}

export interface TraceCfopPhase {
  moves: ParsedTraceMove[];
  executionMs: number;
}

export interface TraceCfopEstimate {
  cross: TraceCfopPhase | null;
  f2l: TraceCfopPhase | null;
  oll: TraceCfopPhase | null;
  pll: TraceCfopPhase | null;
  /** Sub-rows for F2L expand (from trace, chunked). */
  f2lPairHints: ParsedTraceMove[][];
  gapMsUsed: number;
}

/**
 * Map pause-separated segments to Cross / F2L / OLL / PLL in order (first segment → cross, last → PLL).
 */
export function estimateCfopFromMoveTrace(
  trace: string | null | undefined,
  gapMs: number = DEFAULT_TRACE_PAUSE_GAP_MS,
): TraceCfopEstimate | null {
  const moves = parseMoveTrace(trace);
  if (moves.length === 0) {
    return null;
  }
  const segments = segmentTraceByPauses(moves, gapMs);

  if (segments.length === 1) {
    const m = segments[0]!;
    const ex = spanExecutionMs(m);
    return {
      cross: null,
      f2l: { moves: m, executionMs: ex },
      oll: null,
      pll: null,
      f2lPairHints: chunkF2lForDisplay(m),
      gapMsUsed: gapMs,
    };
  }

  const crossMoves = segments[0]!;
  const pllMoves = segments[segments.length - 1]!;
  /** All pause groups strictly between cross (first) and PLL (last). */
  const middle = segments.slice(1, segments.length - 1);

  let f2lMoves: ParsedTraceMove[] = [];
  let ollMoves: ParsedTraceMove[] = [];
  if (middle.length === 0) {
    f2lMoves = [];
    ollMoves = [];
  } else if (middle.length === 1) {
    // One block between cross and PLL: no OLL boundary from pauses; treat as F2L-only.
    f2lMoves = middle[0]!;
    ollMoves = [];
  } else {
    // Last middle segment = OLL; earlier segments = F2L (may be multiple pause groups).
    ollMoves = middle[middle.length - 1]!;
    f2lMoves = middle.slice(0, middle.length - 1).flat();
  }

  const cross: TraceCfopPhase = {
    moves: crossMoves,
    executionMs: spanExecutionMs(crossMoves),
  };
  const pll: TraceCfopPhase = {
    moves: pllMoves,
    executionMs: spanExecutionMs(pllMoves),
  };
  const oll: TraceCfopPhase | null =
    ollMoves.length > 0 ? { moves: ollMoves, executionMs: spanExecutionMs(ollMoves) } : null;
  const f2l: TraceCfopPhase | null =
    f2lMoves.length > 0 ? { moves: f2lMoves, executionMs: spanExecutionMs(f2lMoves) } : null;

  return {
    cross,
    f2l,
    oll,
    pll,
    f2lPairHints: f2l ? chunkF2lForDisplay(f2l.moves) : [],
    gapMsUsed: gapMs,
  };
}

export function tpsFromMoves(turns: number, executionMs: number): number | null {
  if (turns <= 0 || executionMs <= 0) {
    return null;
  }
  return turns / (executionMs / 1000);
}
