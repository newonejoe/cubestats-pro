import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Solve } from '../../services/state.service';
import { I18nService } from '../../services/i18n.service';
import { parseMoveTrace } from '../../lib/cstimer-storage';
import {
  allocatePhaseTurnCounts,
  caseStatForIndex,
  formatMs,
  sliceParsedTraceByPhases,
  tpsFromTurnsAndMs,
} from '../../lib/analysis-selectors';
import { estimateCfopFromMoveTrace, tpsFromMoves } from '../../lib/move-trace-cfop';
import {
  cf4opF2lPairParsedMoves,
  cf4opPhaseRowParsedMoves,
  reconsChronoOllIndex,
  reconsChronoPllIndex,
  runCstimerCf4opRecons,
  type Cf4opMacroPhase,
  type CstimerCf4opRecons,
} from '../../lib/cstimer-recons';

import { formatMinuteSecondCentis } from '../analysis/analysis-solve-display';

@Component({
  selector: 'app-cfop-reconstruction',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="cfop-block">
      <h3>{{ t('cfopReconstruction') }}</h3>
      <p class="muted">
        @if (reconsCf4op()) {
          {{ t('cstimerBreakdown') }}
        } @else if (traceEst()) {
          {{ t('pauseGapHeuristic') }} ({{ traceEst()!.gapMsUsed }} ms).
        } @else {
          {{ t('storedCfopTimes') }}
        }
      </p>
      <table class="tbl cfop-tbl">
        <thead>
          <tr>
            <th>{{ t('phase') }}</th>
            <th>{{ t('insp') }}</th>
            <th>{{ t('exec') }}</th>
            <th>{{ t('turns') }}</th>
            <th>{{ t('tps') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('cross') }}</td>
            <td>{{ cfopInspectionCell(solve(), 'cross') }}</td>
            <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'cross')) }}</td>
            <td class="mono">{{ turnsPhaseStr(solve(), 'cross') }}</td>
            <td class="mono">{{ tpsPhaseStr(solve(), 'cross') }}</td>
          </tr>
          <tr class="clickable" (click)="toggleF2lExpand()">
            <td>{{ t('f2l') }} <span class="chev">{{ f2lExpanded() ? '▼' : '▶' }}</span></td>
            <td>{{ cfopInspectionCell(solve(), 'f2l') }}</td>
            <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'f2l')) }}</td>
            <td class="mono">{{ turnsPhaseStr(solve(), 'f2l') }}</td>
            <td class="mono">{{ tpsPhaseStr(solve(), 'f2l') }}</td>
          </tr>
          @if (f2lExpanded()) {
            @if (f2lDetailRows().length > 0) {
              @for (row of f2lDetailRows(); track row.label) {
                <tr class="sub-row">
                  <td>{{ row.label }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(row.recognitionMs) }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(row.executionMs) }}</td>
                  <td class="mono">{{ row.htmTurns }}</td>
                  <td class="mono">{{ row.tpsStr }}</td>
                </tr>
                @if (row.moves.length > 0) {
                  <tr class="sub-row moves-row">
                    <td colspan="5">
                      <span class="mono muted">{{ row.moves.length }} {{ t('moves') }}</span>
                      <pre class="mono-tiny">{{ stepText(row.moves) }}</pre>
                    </td>
                  </tr>
                }
              }
            } @else {
              @for (step of f2lSteps(solve()); track $index) {
                <tr class="sub-row">
                  <td colspan="5">
                    <strong>{{ t('pair') }} {{ $index + 1 }}</strong>
                    <span class="mono muted">{{ step.moves.length }} {{ t('moves') }}</span>
                    <pre class="mono-tiny">{{ stepText(step.moves) }}</pre>
                  </td>
                </tr>
              }
            }
          }
          <tr class="clickable" (click)="toggleOllStat()">
            <td>{{ t('oll') }} <span class="chev">{{ ollStatExpanded() ? '▼' : '▶' }}</span></td>
            <td>{{ cfopInspectionCell(solve(), 'oll') }}</td>
            <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'oll')) }}</td>
            <td class="mono">{{ turnsPhaseStr(solve(), 'oll') }}</td>
            <td class="mono">{{ tpsPhaseStr(solve(), 'oll') }}</td>
          </tr>
          @if (ollStatExpanded()) {
            @if (ollReconMoves().length > 0) {
              <tr class="sub-row">
                <td colspan="5">
                  <strong>{{ t('ollMoves') }}</strong>
                  <span class="mono muted">{{ ollReconMoves().length }} {{ t('moves') }}</span>
                  <pre class="mono-tiny">{{ stepText(ollReconMoves()) }}</pre>
                </td>
              </tr>
            }
            @if (solve().ollCaseIndex != null) {
              <tr class="sub-row">
                <td colspan="5">
                  <div class="case-stat">
                    <strong>{{ t('case') }} #{{ solve().ollCaseIndex }} ({{ t('oll') }})</strong>
                    <span>N={{ ollCaseStat().count }}, {{ t('bestStat') }}={{ fm(ollCaseStat().best) }}, {{ t('mean') }}={{ fm(ollCaseStat().mean) }}</span>
                  </div>
                </td>
              </tr>
            }
          }
          <tr class="clickable" (click)="togglePllStat()">
            <td>{{ t('pll') }} <span class="chev">{{ pllStatExpanded() ? '▼' : '▶' }}</span></td>
            <td>{{ cfopInspectionCell(solve(), 'pll') }}</td>
            <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'pll')) }}</td>
            <td class="mono">{{ turnsPhaseStr(solve(), 'pll') }}</td>
            <td class="mono">{{ tpsPhaseStr(solve(), 'pll') }}</td>
          </tr>
          @if (pllStatExpanded()) {
            @if (pllReconMoves().length > 0) {
              <tr class="sub-row">
                <td colspan="5">
                  <strong>{{ t('pllMoves') }}</strong>
                  <span class="mono muted">{{ pllReconMoves().length }} {{ t('moves') }}</span>
                  <pre class="mono-tiny">{{ stepText(pllReconMoves()) }}</pre>
                </td>
              </tr>
            }
            @if (solve().pllCaseIndex != null) {
              <tr class="sub-row">
                <td colspan="5">
                  <div class="case-stat">
                    <strong>{{ t('case') }} #{{ solve().pllCaseIndex }} ({{ t('pll') }})</strong>
                    <span>N={{ pllCaseStat().count }}, {{ t('bestStat') }}={{ fm(pllCaseStat().best) }}, {{ t('mean') }}={{ fm(pllCaseStat().mean) }}</span>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    .cfop-block h3 { margin: 0 0 8px; font-size: 14px; color: #495057; }
    .muted { color: #868e96; font-size: 12px; margin-top: 0; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .mono-tiny { font-size: 11px; margin: 4px 0 0; white-space: pre-wrap; word-break: break-all; }
    .cfop-tbl .clickable { cursor: pointer; }
    .cfop-tbl .clickable:hover { background: #f8f9fa; }
    .sub-row td { background: #fcfcfd; padding-left: 24px; }
    .case-stat { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .chev { font-size: 10px; color: #868e96; }
  `],
})
export class CfopReconstructionComponent {
  readonly formatCfopPhaseMs = formatMinuteSecondCentis;

  private readonly i18n = inject(I18nService);

  readonly solve = input.required<Solve>();
  readonly caseStatScope = input<Solve[]>([]);

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly f2lExpanded = signal(false);
  readonly ollStatExpanded = signal(false);
  readonly pllStatExpanded = signal(false);

  readonly reconsCf4op = computed(() => runCstimerCf4opRecons(this.solve()));
  readonly traceEst = computed(() => estimateCfopFromMoveTrace(this.solve().moveTrace));

  readonly f2lDetailRows = computed(() => {
    const solve = this.solve();
    const r = this.reconsCf4op();
    if (!r) {
      return [] as {
        label: string;
        recognitionMs: number;
        executionMs: number;
        htmTurns: number;
        tpsStr: string;
        moves: ReturnType<typeof parseMoveTrace>;
      }[];
    }
    const pairs = cf4opF2lPairParsedMoves(r, solve);
    return [0, 1, 2, 3].map((i) => {
      const ph = r.f2lSubphases[i]!;
      const moves = pairs[i]!.moves;
      const t = tpsFromTurnsAndMs(ph.htmTurns, ph.executionMs);
      return {
        label: `f2l-${i + 1}`,
        recognitionMs: ph.recognitionMs,
        executionMs: ph.executionMs,
        htmTurns: ph.htmTurns,
        tpsStr: t === null ? '—' : t.toFixed(2),
        moves,
      };
    });
  });

  readonly ollReconMoves = computed(() => {
    const r = this.reconsCf4op();
    return r ? cf4opPhaseRowParsedMoves(r, reconsChronoOllIndex(r)) : [];
  });

  readonly pllReconMoves = computed(() => {
    const r = this.reconsCf4op();
    return r ? cf4opPhaseRowParsedMoves(r, reconsChronoPllIndex(r)) : [];
  });

  readonly ollCaseStat = computed(() => {
    const sol = this.solve();
    const scope = this.caseStatScope();
    if (sol.ollCaseIndex == null) {
      return { count: 0, best: null as number | null, mean: null as number | null };
    }
    return caseStatForIndex(scope, 'oll', sol.ollCaseIndex);
  });

  readonly pllCaseStat = computed(() => {
    const sol = this.solve();
    const scope = this.caseStatScope();
    if (sol.pllCaseIndex == null) {
      return { count: 0, best: null as number | null, mean: null as number | null };
    }
    return caseStatForIndex(scope, 'pll', sol.pllCaseIndex);
  });

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  toggleF2lExpand(): void {
    this.f2lExpanded.update((v) => !v);
  }

  toggleOllStat(): void {
    this.ollStatExpanded.update((v) => !v);
  }

  togglePllStat(): void {
    this.pllStatExpanded.update((v) => !v);
  }

  cfopInspectionCell(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): string {
    const r = this.reconsCf4op();
    if (r) {
      const m = this.macroPhase(r, phase);
      return formatMinuteSecondCentis(m!.recognitionMs);
    }
    if (phase === 'cross' && solve.inspectionTime != null) {
      return `${solve.inspectionTime} s`;
    }
    return '—';
  }

  execPhaseMs(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): number | null {
    const r = this.reconsCf4op();
    const m = this.macroPhase(r, phase);
    if (m) return m.executionMs;
    const te = this.traceEst();
    const stored =
      phase === 'cross' ? solve.crossTime
        : phase === 'f2l' ? solve.f2lTime
          : phase === 'oll' ? solve.ollTime
            : solve.PLLTime;
    if (stored != null) return stored;
    if (!te) return null;
    const seg =
      phase === 'cross' ? te.cross
        : phase === 'f2l' ? te.f2l
          : phase === 'oll' ? te.oll
            : te.pll;
    return seg && seg.moves.length > 0 ? seg.executionMs : null;
  }

  turnsPhaseStr(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): string {
    const r = this.reconsCf4op();
    const rm = this.macroPhase(r, phase);
    if (rm) return String(rm.htmTurns);
    const n = this.moveAllocCount(solve);
    const counts = allocatePhaseTurnCounts(solve, n);
    const fromCounts =
      phase === 'cross' ? counts.cross
        : phase === 'f2l' ? counts.f2l
          : phase === 'oll' ? counts.oll
            : counts.pll;
    const hasStoredCfop = [solve.crossTime, solve.f2lTime, solve.ollTime, solve.PLLTime].some(
      (x) => x != null,
    );
    if (hasStoredCfop) return String(fromCounts);
    const te = this.traceEst();
    const fromTrace =
      phase === 'cross' ? te?.cross?.moves.length
        : phase === 'f2l' ? te?.f2l?.moves.length
          : phase === 'oll' ? te?.oll?.moves.length
            : te?.pll?.moves.length;
    if (fromTrace != null && fromTrace > 0) return String(fromTrace);
    return String(fromCounts);
  }

  tpsPhaseStr(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): string {
    const r = this.reconsCf4op();
    const rm = this.macroPhase(r, phase);
    if (rm && rm.htmTurns > 0) {
      const t = tpsFromTurnsAndMs(rm.htmTurns, rm.executionMs);
      return t === null ? '—' : t.toFixed(2);
    }
    const exec = this.execPhaseMs(solve, phase);
    const turns = Number.parseInt(this.turnsPhaseStr(solve, phase), 10);
    if (!Number.isFinite(turns) || turns <= 0) return '—';
    const tTrace = tpsFromMoves(turns, exec ?? 0);
    if (tTrace != null && exec != null && exec > 0) return tTrace.toFixed(2);
    const n = this.moveAllocCount(solve);
    const counts = allocatePhaseTurnCounts(solve, n);
    const storedExec =
      phase === 'cross' ? solve.crossTime
        : phase === 'f2l' ? solve.f2lTime
          : phase === 'oll' ? solve.ollTime
            : solve.PLLTime;
    const turnN =
      phase === 'cross' ? counts.cross
        : phase === 'f2l' ? counts.f2l
          : phase === 'oll' ? counts.oll
            : counts.pll;
    const tps = tpsFromTurnsAndMs(turnN, storedExec ?? null);
    return tps === null ? '—' : tps.toFixed(2);
  }

  f2lSteps(solve: Solve): { moves: ReturnType<typeof parseMoveTrace> }[] {
    const r = this.reconsCf4op();
    if (r && r.rawMovesChrono.length >= 7) {
      return cf4opF2lPairParsedMoves(r, solve);
    }
    const te = this.traceEst();
    if (te?.f2lPairHints?.length) {
      return te.f2lPairHints.map((moves) => ({ moves }));
    }
    const parsed = parseMoveTrace(solve.moveTrace);
    const n = this.moveAllocCount(solve);
    const counts = allocatePhaseTurnCounts(solve, n);
    const slices = sliceParsedTraceByPhases(parsed, counts);
    const f2l = slices.f2l;
    const chunk = Math.max(1, Math.ceil(f2l.length / 4));
    const out: { moves: ReturnType<typeof parseMoveTrace> }[] = [];
    for (let i = 0; i < 4; i++) {
      const start = i * chunk;
      const moves = f2l.slice(start, start + chunk);
      if (moves.length > 0) out.push({ moves });
    }
    return out;
  }

  stepText(moves: ReturnType<typeof parseMoveTrace>): string {
    return moves.map((m) => m.notation).join(' ');
  }

  private moveAllocCount(solve: Solve): number {
    const parsed = parseMoveTrace(solve.moveTrace);
    if (parsed.length > 0) return parsed.length;
    return solve.moveCount ?? 0;
  }

  private macroPhase(
    r: CstimerCf4opRecons | null,
    phase: 'cross' | 'f2l' | 'oll' | 'pll',
  ): Cf4opMacroPhase | null {
    if (!r) return null;
    switch (phase) {
      case 'cross': return r.cross;
      case 'f2l': return r.f2l;
      case 'oll': return r.oll;
      case 'pll': return r.pll;
    }
  }
}
