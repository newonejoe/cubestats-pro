import { Solve } from '../services/state.service';
import type { ParsedTraceMove } from './cstimer-storage';

export interface SessionSummary {
  sessionId: number;
  solveCount: number;
  best: number | null;
  mean: number | null;
  ao5: number | null;
  ao12: number | null;
}

export interface TrainingSummaryItem {
  key: string;
  count: number;
  best: number | null;
  mean: number | null;
}

export interface TrainingSummary {
  byType: TrainingSummaryItem[];
  ollCases: TrainingSummaryItem[];
  pllCases: TrainingSummaryItem[];
  f2lCases: TrainingSummaryItem[];
}

export interface TrendPoint {
  index: number;
  value: number;
  timestamp: number;
}

export type TimeWindow = 'today' | '7d' | '30d' | 'custom';

export interface SessionStats {
  solveCount: number;
  current: number | null;
  best: number | null;
  mean: number | null;
  ao5: number | null;
  ao12: number | null;
  ao100: number | null;
  dnfCount: number;
  plus2Count: number;
}

function finalMillis(solve: Solve): number | null {
  if (solve.dnf || solve.finalTime === null) {
    return null;
  }
  if (typeof solve.finalTime === 'number') {
    return solve.finalTime;
  }
  const base = solve.time ?? 0;
  return solve.plus2 ? base + 2000 : base;
}

/** End-of-solve instant for ordering (endTime → date → startTime). */
export function solveTimestamp(solve: Solve): number {
  const raw = solve.endTime ?? solve.date ?? solve.startTime ?? '';
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? 0 : ts;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return '--';
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }
  return `${seconds}.${millis.toString().padStart(3, '0')}`;
}

export function computeMean(solves: Solve[]): number | null {
  const vals = solves.map(finalMillis).filter((v): v is number => v !== null);
  if (vals.length === 0) {
    return null;
  }
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function computeBest(solves: Solve[]): number | null {
  const vals = solves.map(finalMillis).filter((v): v is number => v !== null);
  if (vals.length === 0) {
    return null;
  }
  return Math.min(...vals);
}

export function computeAverageOfN(solves: Solve[], n: number): number | null {
  if (solves.length < n) {
    return null;
  }
  const window = solves.slice(0, n).map(finalMillis);
  if (window.some((v) => v === null)) {
    return null;
  }
  const nums = window as number[];
  if (nums.length <= 2) {
    return computeMean(solves.slice(0, n));
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
}

export function buildTrend(solves: Solve[]): TrendPoint[] {
  return solves
    .map((s, idx) => {
      const v = finalMillis(s);
      if (v === null) {
        return null;
      }
      const ts = s.endTime ? Date.parse(s.endTime) : (s.date ? Date.parse(s.date) : Date.now());
      return { index: idx + 1, value: v, timestamp: Number.isNaN(ts) ? Date.now() : ts };
    })
    .filter((v): v is TrendPoint => v !== null)
    .reverse()
    .map((p, i) => ({ ...p, index: i + 1 }));
}

export function filterBySession(solves: Solve[], sessionId: number | 'all'): Solve[] {
  if (sessionId === 'all') {
    return solves;
  }
  return solves.filter((s) => (s.sessionId ?? 1) === sessionId);
}

export function filterByTimeWindow(
  solves: Solve[],
  window: TimeWindow,
  customFrom?: string | null,
  customTo?: string | null
): Solve[] {
  const now = Date.now();
  let from = 0;
  let to = now;
  if (window === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    from = d.getTime();
  } else if (window === '7d') {
    from = now - 7 * 24 * 60 * 60 * 1000;
  } else if (window === '30d') {
    from = now - 30 * 24 * 60 * 60 * 1000;
  } else if (window === 'custom') {
    from = customFrom ? Date.parse(customFrom) : 0;
    to = customTo ? (Date.parse(customTo) + 24 * 60 * 60 * 1000 - 1) : now;
    if (Number.isNaN(from)) {
      from = 0;
    }
    if (Number.isNaN(to)) {
      to = now;
    }
  }
  return solves.filter((s) => {
    const ts = solveTimestamp(s);
    return ts >= from && ts <= to;
  });
}

export interface RollingAoAtSolve {
  ao5: number | null;
  ao12: number | null;
}

/**
 * WCA-style trimmed Ao5 / Ao12 after each solve, in chronological session order (oldest → newest).
 * Uses the same rules as `computeAverageOfN` (last N in the prefix, null if any DNF in the window or N not reached).
 * Lookup by the same `Solve` object references passed in (e.g. rows from `sortSolvesByMetric`).
 */
export function computeRollingAoBySolve(solves: Solve[]): Map<Solve, RollingAoAtSolve> {
  const chron = [...solves].sort((a, b) => solveTimestamp(a) - solveTimestamp(b));
  const map = new Map<Solve, RollingAoAtSolve>();
  for (let i = 0; i < chron.length; i++) {
    const prefix = chron.slice(0, i + 1);
    const w5 = prefix.slice(-5);
    const w12 = prefix.slice(-12);
    map.set(chron[i]!, {
      ao5: w5.length >= 5 ? computeAverageOfN(w5, 5) : null,
      ao12: w12.length >= 12 ? computeAverageOfN(w12, 12) : null,
    });
  }
  return map;
}

export function computeSessionStats(solves: Solve[]): SessionStats {
  const ordered = [...solves].sort((a, b) => solveTimestamp(b) - solveTimestamp(a));
  const current = ordered.length ? finalMillis(ordered[0]!) : null;
  return {
    solveCount: ordered.length,
    current,
    best: computeBest(ordered),
    mean: computeMean(ordered),
    ao5: computeAverageOfN(ordered, 5),
    ao12: computeAverageOfN(ordered, 12),
    ao100: computeAverageOfN(ordered, 100),
    dnfCount: ordered.filter((s) => !!s.dnf).length,
    plus2Count: ordered.filter((s) => !!s.plus2).length,
  };
}

export function computeSessionSummaries(solves: Solve[]): SessionSummary[] {
  const map = new Map<number, Solve[]>();
  for (const s of solves) {
    const sid = s.sessionId ?? 0;
    const list = map.get(sid) ?? [];
    list.push(s);
    map.set(sid, list);
  }
  return [...map.entries()].map(([sessionId, list]) => ({
    sessionId,
    solveCount: list.length,
    best: computeBest(list),
    mean: computeMean(list),
    ao5: computeAverageOfN(list, 5),
    ao12: computeAverageOfN(list, 12),
  })).sort((a, b) => b.solveCount - a.solveCount);
}

function summarizeBy<T extends string | number>(items: Solve[], keyFn: (s: Solve) => T | null): TrainingSummaryItem[] {
  const buckets = new Map<string, Solve[]>();
  for (const s of items) {
    const k = keyFn(s);
    if (k === null || k === undefined || k === '') {
      continue;
    }
    const key = String(k);
    const arr = buckets.get(key) ?? [];
    arr.push(s);
    buckets.set(key, arr);
  }
  return [...buckets.entries()].map(([key, arr]) => ({
    key,
    count: arr.length,
    best: computeBest(arr),
    mean: computeMean(arr),
  })).sort((a, b) => b.count - a.count);
}

export function computeTrainingSummary(solves: Solve[]): TrainingSummary {
  return {
    byType: summarizeBy(solves, (s) => s.scrambleType ?? null),
    ollCases: summarizeBy(solves.filter((s) => s.scrambleType === 'oll'), (s) => s.ollCaseIndex ?? null),
    pllCases: summarizeBy(solves.filter((s) => s.scrambleType === 'pll'), (s) => s.pllCaseIndex ?? null),
    f2lCases: summarizeBy(solves.filter((s) => s.scrambleType === 'f2l'), (s) => s.f2lCaseIndex ?? null),
  };
}

export type PrimaryMetric =
  | 'timestamp'
  | 'total'
  | 'inspection'
  | 'moveCount'
  | 'cross'
  | 'f2l'
  | 'oll'
  | 'pll'
  | 'ollRecog'
  | 'pllRecog';

/** Value for sorting / display; null sorts last for asc, first for desc depending on caller */
export function primaryMetricValue(solve: Solve, metric: PrimaryMetric): number | null {
  switch (metric) {
    case 'timestamp':
      return solveTimestamp(solve);
    case 'total':
      return finalMillis(solve);
    case 'inspection':
      return solve.inspectionTime != null ? solve.inspectionTime * 1000 : null;
    case 'moveCount':
      return solve.moveCount ?? null;
    case 'cross':
      return solve.crossTime ?? null;
    case 'f2l':
      return solve.f2lTime ?? null;
    case 'oll':
      return solve.ollTime ?? null;
    case 'pll':
      return solve.PLLTime ?? null;
    case 'ollRecog':
      return solve.ollRecognitionTime ?? null;
    case 'pllRecog':
      return solve.pllRecognitionTime ?? null;
    default:
      return null;
  }
}

/**
 * Sort: total time ascending (fastest first); other metrics descending (largest first).
 * DNF / missing sort last.
 */
export function sortSolvesByMetric(solves: Solve[], metric: PrimaryMetric): Solve[] {
  const copy = [...solves];
  copy.sort((a, b) => {
    if (metric === 'timestamp') {
      const diff = solveTimestamp(b) - solveTimestamp(a);
      if (diff !== 0) {
        return diff;
      }
      return (b.id ?? 0) - (a.id ?? 0);
    }
    const va = primaryMetricValue(a, metric);
    const vb = primaryMetricValue(b, metric);
    if (va === null && vb === null) {
      return solveTimestamp(b) - solveTimestamp(a);
    }
    if (va === null) {
      return 1;
    }
    if (vb === null) {
      return -1;
    }
    if (metric === 'total') {
      return va - vb;
    }
    return vb - va;
  });
  return copy;
}

export interface CaseStatMini {
  count: number;
  best: number | null;
  mean: number | null;
}

export function caseStatForIndex(solves: Solve[], kind: 'oll' | 'pll', caseIndex: number): CaseStatMini {
  const filtered =
    kind === 'oll'
      ? solves.filter((s) => s.scrambleType === 'oll' && s.ollCaseIndex === caseIndex)
      : solves.filter((s) => s.scrambleType === 'pll' && s.pllCaseIndex === caseIndex);
  return {
    count: filtered.length,
    best: computeBest(filtered),
    mean: computeMean(filtered),
  };
}

/** When all four CFOP phase times exist, split move count by time share; else split evenly (remainder to earlier phases). */
export interface PhaseTurnCounts {
  cross: number;
  f2l: number;
  oll: number;
  pll: number;
}

export function allocatePhaseTurnCounts(solve: Solve, moveCount: number): PhaseTurnCounts {
  const n = Math.max(0, Math.floor(moveCount));
  const c = solve.crossTime;
  const f = solve.f2lTime;
  const o = solve.ollTime;
  const p = solve.PLLTime;
  const sum = (c ?? 0) + (f ?? 0) + (o ?? 0) + (p ?? 0);
  const hasAll =
    c != null && f != null && o != null && p != null && sum > 0;
  if (hasAll) {
    const tc = Math.floor((n * c!) / sum);
    const tf = Math.floor((n * f!) / sum);
    const to = Math.floor((n * o!) / sum);
    const tpl = n - tc - tf - to;
    return { cross: tc, f2l: tf, oll: to, pll: Math.max(0, tpl) };
  }
  const q = Math.floor(n / 4);
  const r = n % 4;
  return {
    cross: q + (r > 0 ? 1 : 0),
    f2l: q + (r > 1 ? 1 : 0),
    oll: q + (r > 2 ? 1 : 0),
    pll: q,
  };
}

export function sliceParsedTraceByPhases(
  parsed: ParsedTraceMove[],
  counts: PhaseTurnCounts,
): { cross: ParsedTraceMove[]; f2l: ParsedTraceMove[]; oll: ParsedTraceMove[]; pll: ParsedTraceMove[] } {
  let i = 0;
  const take = (len: number): ParsedTraceMove[] => {
    const slice = parsed.slice(i, i + len);
    i += len;
    return slice;
  };
  return {
    cross: take(counts.cross),
    f2l: take(counts.f2l),
    oll: take(counts.oll),
    pll: take(counts.pll),
  };
}

/** HTM (or face-turn) count per second; `executionMs` is wall milliseconds (csTimer-style). */
export function tpsFromTurnsAndMs(turns: number, executionMs: number | null | undefined): number | null {
  if (turns <= 0 || executionMs == null || executionMs <= 0) {
    return null;
  }
  return turns / (executionMs / 1000);
}

