import type { Solve } from '../../services/state.service';
import { parseMoveTrace } from '../../lib/cstimer-storage';

/**
 * csTimer-style duration: always `minute:second.millisecond` (e.g. `0:12.345`, `1:03.100`).
 * Use for session tables where every time column should share the same pattern.
 */
export function formatMinuteSecondMillis(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return '--';
  }
  const x = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(x / 60000);
  const seconds = Math.floor((x % 60000) / 1000);
  const millis = x % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

export function formatMinuteSecondCentis(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) {
    return '--';
  }
  const x = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(x / 60000);
  const seconds = Math.floor((x % 60000) / 1000);
  const millis = x % 1000;
  const centis = Math.floor(millis / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  }
  else if(seconds > 0 ){
    return `${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  }else{
    return `0.${centis.toString().padStart(2, '0')}`;
  }
}

export function finalSolveMs(solve: Solve): number | null {
  if (solve.dnf || solve.finalTime === null) {
    return null;
  }
  if (typeof solve.finalTime === 'number') {
    return solve.finalTime;
  }
  const base = solve.time ?? 0;
  return solve.plus2 ? base + 2000 : base;
}

export function formatSolveDate(solve: Solve): string {
  const raw = solve.endTime ?? solve.date ?? '';
  if (!raw) {
    return '—';
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return raw.slice(0, 16);
  }
  return d.toLocaleString();
}

export function penaltyLabel(solve: Solve): string {
  if (solve.dnf) {
    return 'DNF';
  }
  if (solve.plus2) {
    return '+2';
  }
  return '';
}

/** CFOP phase timing from csTimer recons: always label milliseconds (avoids `6.551` vs 6551 ms confusion). */
export function formatCfopPhaseMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  return `${Math.round(ms)} ms`;
}

export function truncateScramble(s: string): string {
  const t = s.trim();
  if (t.length <= 36) {
    return t;
  }
  return t.slice(0, 33) + '…';
}

/** Space-separated solution moves from a `U@0 R@120`-style trace. */
export function joinTraceNotation(trace: string | null | undefined): string {
  return parseMoveTrace(trace)
    .map((m) => m.notation)
    .join(' ')
    .trim();
}
