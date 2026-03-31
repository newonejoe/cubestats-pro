import type { Solve } from '../services/state.service';
import {
  metaTupleFromSolve,
  spreadEqualTimestampRunsForRecons,
  type ParsedTraceMove,
} from './cstimer-storage';
import { calcRecons, type CstimerCalcReconsTimes } from './cstimer/recons-calc';
import { getMathlib, isMathlibLoaded, type CubieCube } from './cstimer/cstimer-mathlib';
import { getCubeUtil } from './cstimer/cubeutil';

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

/**
 * Recons method and data-slot index for each case type.
 * Mirrors csTimer recons.js caseStat registration:
 *   cf4op: PLL = data[0], OLL = data[1]
 *   cf3zb: ZBLL = data[0]
 */
const CASE_STEP_CONFIG: Record<string, { reconsMethod: string; stepIdx: number }> = {
  PLL: { reconsMethod: 'cf4op', stepIdx: 0 },
  OLL: { reconsMethod: 'cf4op', stepIdx: 1 },
  ZBLL: { reconsMethod: 'cf3zb', stepIdx: 0 },
};

/**
 * Per-stage data returned by `deriveCaseFromSolveRecons`, mirroring
 * csTimer's `calcCaseExtra` return: `[cur, insp, exec, turns]`.
 */
export interface ReconsCaseResult {
  caseIndex: number;
  inspMs: number;
  execMs: number;
  turns: number;
}

/**
 * Derive case index + per-stage timing from a solve's move trace.
 * Mirrors csTimer's `caseStat.calcCaseExtra(method, step, time, idx)` in recons.js:
 *   1. Run calcRecons to replay the solution and find stage boundaries
 *   2. Get the transCubie at the relevant stage slot
 *   3. Invert it and identify the case via identStep
 *   4. Extract inspection / execution / turn count from the data row
 */
export function deriveCaseFromSolveRecons(solve: Solve, method: 'OLL' | 'PLL' | 'ZBLL'): ReconsCaseResult | null {
  if (!cstimerReconsEngineReady()) return null;

  const config = CASE_STEP_CONFIG[method];
  if (!config) return null;

  const base = buildCstimerTimesForCalcRecons(solve);
  if (!base) return null;

  const traceRaw = base[4]![0]!;
  const solveMs = solveDurationMsForRecons(solve);
  const traceForCalc = spreadEqualTimestampRunsForRecons(traceRaw, solveMs) || traceRaw;
  const timesForCalc: CstimerCalcReconsTimes = [base[0]!, base[1]!, base[2]!, base[3]!, [traceForCalc, '333']];

  let rec: ReturnType<typeof calcRecons>;
  try {
    rec = calcRecons(timesForCalc, config.reconsMethod);
  } catch {
    return null;
  }
  if (!rec?.data) return null;

  const sdata = rec.data[config.stepIdx];
  if (!sdata || !sdata[4]) return null;

  const ml = getMathlib();
  const c = new ml.CubieCube();
  c.invFrom(sdata[4] as CubieCube);

  const cu = getCubeUtil();
  const caseIndex = cu.identStep(method, c.toFaceCube());
  if (caseIndex === undefined || caseIndex < 0) return null;

  const inspMs = Math.max(0, (sdata[1] as number) - (sdata[0] as number));
  const execMs = Math.max(0, (sdata[2] as number) - (sdata[1] as number));
  const turns = Math.max(0, sdata[3] as number);

  return { caseIndex, inspMs, execMs, turns };
}
