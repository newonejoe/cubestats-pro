import type { Solve } from '../services/state.service';
import {
  metaTupleFromSolve,
  spreadEqualTimestampRunsForRecons,
  type ParsedTraceMove,
} from './cstimer-storage';
import { calcRecons, type CstimerCalcReconsTimes } from './cstimer/recons-calc';
import { isMathlibLoaded } from './cstimer/cstimer-mathlib';

export type { CstimerCalcReconsTimes };

/** One CFOP / sub-step row (csTimer insp / exec / HTM). */
export interface Cf4opMacroPhase {
  recognitionMs: number;
  executionMs: number;
  htmTurns: number;
}

export type F2lSubphaseTuple = [
  Cf4opMacroPhase,
  Cf4opMacroPhase,
  Cf4opMacroPhase,
  Cf4opMacroPhase,
];

/**
 * `calcRecons(times, 'cf4op')`: 7 steps pll, oll, f2l-4…f2l-1, cross.
 * `rawMovesChrono` after reverse: [0]=cross, [1]=f2l-1 … [4]=f2l-4, [5]=oll, [6]=pll.
 * Macro `f2l` is the sum of f2l-1…f2l-4 (matches csTimer aggregate F2L row).
 */
export interface CstimerCfopMacroRecons {
  method: 'cf4op';
  times: CstimerCalcReconsTimes;
  pll: Cf4opMacroPhase;
  oll: Cf4opMacroPhase;
  /** Sum of f2l-1…f2l-4 (csTimer “F2L” summary row). */
  f2l: Cf4opMacroPhase;
  cross: Cf4opMacroPhase;
  /** Drill-down: f2l-1 … f2l-4 in solve order (data slots 5…2 in csTimer indexing before reverse). */
  f2lSubphases: F2lSubphaseTuple;
  rawMovesChrono: [string, number][][];
}

export type CstimerCf4opRecons = CstimerCfopMacroRecons;

type ReconsDataRow = [number, number, number, number, ...unknown[]];

function solveDurationMsForRecons(solve: Solve): number | null {
  if (solve.dnf) {
    return null;
  }
  if (typeof solve.finalTime === 'number') {
    return solve.finalTime;
  }
  const t = solve.time ?? 0;
  return solve.plus2 ? t + 2000 : t;
}

function rowFromDataSlot(d: ReconsDataRow | undefined): Cf4opMacroPhase {
  if (!d || d.length < 4) {
    return { recognitionMs: 0, executionMs: 0, htmTurns: 0 };
  }
  const [tsStart, tsFirst, tsEnd, htm] = d;
  return {
    recognitionMs: Math.max(0, tsFirst - tsStart),
    executionMs: Math.max(0, tsEnd - tsFirst),
    htmTurns: Math.max(0, Math.round(htm)),
  };
}

function sumPhaseRows(rows: Cf4opMacroPhase[]): Cf4opMacroPhase {
  return rows.reduce(
    (a, b) => ({
      recognitionMs: a.recognitionMs + b.recognitionMs,
      executionMs: a.executionMs + b.executionMs,
      htmTurns: a.htmTurns + b.htmTurns,
    }),
    { recognitionMs: 0, executionMs: 0, htmTurns: 0 },
  );
}

export function buildCstimerTimesForCalcRecons(solve: Solve): CstimerCalcReconsTimes | null {
  const trace = solve.moveTrace?.trim();
  if (!trace) {
    return null;
  }
  const meta = metaTupleFromSolve(solve);
  if (meta[0] < 0) {
    return null;
  }
  return [meta, solve.scramble ?? '', '', 0, [trace, '333']];
}

export function cstimerReconsEngineReady(): boolean {
  return typeof globalThis !== 'undefined' && isMathlibLoaded();
}

/**
 * csTimer CFOP reconstruction with F2L drill-down: `calcRecons(times, 'cf4op')`.
 * Macro cross / F2L / OLL / PLL align with csTimer; F2L sub-rows are f2l-1…f2l-4.
 */
export function runCstimerCf4opRecons(solve: Solve): CstimerCfopMacroRecons | null {
  const base = buildCstimerTimesForCalcRecons(solve);
  if (!base || !cstimerReconsEngineReady()) {
    return null;
  }
  const traceRaw = base[4]![0]!;
  const solveMs = solveDurationMsForRecons(solve);
  const traceForCalc = spreadEqualTimestampRunsForRecons(traceRaw, solveMs) || traceRaw;
  const timesForCalc: CstimerCalcReconsTimes = [base[0]!, base[1]!, base[2]!, base[3]!, [traceForCalc, '333']];
  let rec: ReturnType<typeof calcRecons>;
  try {
    rec = calcRecons(timesForCalc, 'cf4op');
  } catch {
    return null;
  }
  if (!rec?.data) {
    return null;
  }
  const { data } = rec;
  // getStepNames('cf4op'): pll=0, oll=1, f2l-4=2, f2l-3=3, f2l-2=4, f2l-1=5, cross=6
  const pll = rowFromDataSlot(data[0] as ReconsDataRow);
  const oll = rowFromDataSlot(data[1] as ReconsDataRow);
  const f2l4 = rowFromDataSlot(data[2] as ReconsDataRow);
  const f2l3 = rowFromDataSlot(data[3] as ReconsDataRow);
  const f2l2 = rowFromDataSlot(data[4] as ReconsDataRow);
  const f2l1 = rowFromDataSlot(data[5] as ReconsDataRow);
  const cross = rowFromDataSlot(data[6] as ReconsDataRow);
  const f2lSubphases: F2lSubphaseTuple = [f2l1, f2l2, f2l3, f2l4];
  const f2l = sumPhaseRows([f2l1, f2l2, f2l3, f2l4]);
  const rawMovesChrono = rec.rawMoves ?? [];
  return {
    method: 'cf4op',
    times: base,
    pll,
    oll,
    f2l,
    cross,
    f2lSubphases,
    rawMovesChrono,
  };
}

function phaseRowParsedMovesFromRawRow(row: [string, number][]): ParsedTraceMove[] {
  if (row.length === 0) {
    return [];
  }
  const t0 = row[0]![1];
  return row.map(([moveStr, ts]) => ({
    notation: moveStr.trim(),
    offsetMs: Math.max(0, Math.round(ts - t0)),
  }));
}

/** After reverse: cf4op has 7 rows → oll=5, pll=6; legacy 4-row chrono → 2, 3. */
export function reconsChronoOllIndex(recons: { rawMovesChrono: [string, number][][] }): number {
  return recons.rawMovesChrono.length >= 7 ? 5 : 2;
}

export function reconsChronoPllIndex(recons: { rawMovesChrono: [string, number][][] }): number {
  return recons.rawMovesChrono.length >= 7 ? 6 : 3;
}

export function cf4opPhaseRowParsedMoves(
  recons: CstimerCf4opRecons,
  chronoIndex: number,
): ParsedTraceMove[] {
  return phaseRowParsedMovesFromRawRow(recons.rawMovesChrono[chronoIndex] ?? []);
}

export function rawMovesRowToParsed(row: [string, number][], traceBaseMs: number): ParsedTraceMove[] {
  return row.map(([moveStr, ts]) => ({
    notation: moveStr.trim(),
    offsetMs: Math.max(0, Math.round(ts - traceBaseMs)),
  }));
}

/** Moves per f2l-1…f2l-4 from `rawMovesChrono[1]…[4]` (csTimer order); always 4 entries. */
export function cf4opF2lPairParsedMoves(
  recons: CstimerCf4opRecons,
  _solve: Solve,
): { moves: ParsedTraceMove[] }[] {
  return [1, 2, 3, 4].map((i) => ({
    moves: phaseRowParsedMovesFromRawRow(recons.rawMovesChrono[i] ?? []),
  }));
}
