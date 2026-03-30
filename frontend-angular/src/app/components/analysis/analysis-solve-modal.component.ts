import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { SolveReplayService } from '../../services/solve-replay.service';
import { CubeService } from '../../services/cube.service';
import { StateService, type Solve } from '../../services/state.service';
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
import {
  finalSolveMs,
  formatCfopPhaseMs,
  joinTraceNotation,
  penaltyLabel,
} from './analysis-solve-display';

import { AppModalComponent } from '../shared/app-modal.component';

@Component({
  selector: 'app-analysis-solve-modal',
  standalone: true,
  imports: [CommonModule, RouterLink, AppModalComponent],
  template: `
    <app-modal
      [isVisible]="true"
      title="Solve details"
      maxWidth="720px"
      theme="light"
      [noPadding]="true"
      (closed)="onClose()">
      <div class="solve-modal-body">
          <div class="row-actions">
            <button type="button" class="btn" (click)="retrySolve(solve())">Retry</button>
            <button type="button" class="btn" [disabled]="!solve().moveTrace || replayBusy()" (click)="replaySolve(solve())">
              {{ replayBusy() ? 'Replaying…' : 'Replay' }}
            </button>
            <button type="button" class="btn btn-danger" (click)="deleteSolve(solve())">Delete</button>
          </div>
          <section class="detail-block">
            <h3>Scramble</h3>
            <pre class="mono-block">{{ solve().scramble }}</pre>
            <button type="button" class="btn-small" (click)="copyText(solve().scramble)">Copy scramble</button>
          </section>
          <section class="detail-block">
            <h3>Summary</h3>
            <ul class="kv">
              <li><span>Final</span><span class="mono">{{ fm(finalSolveMs(solve())) }}</span></li>
              <li><span>DNF / +2</span><span>{{ penaltyLabel(solve()) || '—' }}</span></li>
              <li><span>Moves</span><span class="mono">{{ solve().moveCount ?? '—' }}</span></li>
              <li>
                <span>Inspection (WCA setting)</span>
                <span class="mono">{{ solve().inspectionTime != null ? solve().inspectionTime + ' s' : '—' }}</span>
              </li>
              <li><span>Type</span><span>{{ solve().scrambleType ?? '—' }}</span></li>
            </ul>
          </section>
          <section class="detail-block reconstruct">
            <h3>Reconstruct</h3>
            <p class="muted">
              Inverse scramble undoes the scramble to solved. Solution line is the stored move trace (same string as csTimer <code>times[4][0]</code>).
            </p>
            <p class="mono-line"><strong>Inverse</strong> {{ inverseScramble(solve().scramble) }}</p>
            @if (joinTraceNotation(solve().moveTrace)) {
              <p class="mono-line"><strong>Solution (trace)</strong> {{ joinTraceNotation(solve().moveTrace) }}</p>
              <button type="button" class="btn-small" (click)="copyText(joinTraceNotation(solve().moveTrace))">Copy solution</button>
            }
            <div class="row-actions">
              <button type="button" class="btn-small" (click)="copyText(inverseScramble(solve().scramble))">Copy inverse</button>
              <a
                class="btn-small link"
                [routerLink]="['/scramble-test']"
                [queryParams]="{ scramble: solve().scramble, type: solve().scrambleType || 'wca' }"
              >Open in scramble test</a>
            </div>
          </section>
          <section class="detail-block">
            <h3>CFOP reconstruction</h3>
            <p class="muted">
              @if (reconsCf4op()) {
                Same as csTimer CFOP breakdown: <code>calcRecons(times,'cf4op')</code> + <code>getProgress(...,'cf4op')</code>
                (cross, f2l-1…f2l-4, OLL, PLL). Burst <code>@ms</code> values are spread to the next stamp or solve length when needed.
              } @else if (traceEst()) {
                Fallback: pause-gap heuristic ({{ traceEst()!.gapMsUsed }} ms) — ensure
                <code>vendor/cstimer/mathlib.js</code> is loaded for facelet recons.
              } @else {
                No trace — stored CFOP times only when saved from analysis.
              }
            </p>
            <table class="tbl cfop-tbl">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Inspection</th>
                  <th>Execution</th>
                  <th>Turns</th>
                  <th>Turns/s</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cross</td>
                  <td>{{ cfopInspectionCell(solve(), 'cross') }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'cross')) }}</td>
                  <td class="mono">{{ turnsPhaseStr(solve(), 'cross') }}</td>
                  <td class="mono">{{ tpsPhaseStr(solve(), 'cross') }}</td>
                </tr>
                <tr class="f2l-row" (click)="toggleF2lExpand()">
                  <td>F2L <span class="chev">{{ f2lExpanded() ? '▼' : '▶' }}</span></td>
                  <td>{{ cfopInspectionCell(solve(), 'f2l') }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'f2l')) }}</td>
                  <td class="mono">{{ turnsPhaseStr(solve(), 'f2l') }}</td>
                  <td class="mono">{{ tpsPhaseStr(solve(), 'f2l') }}</td>
                </tr>
                @if (f2lExpanded()) {
                  @if (f2lDetailRows().length > 0) {
                    @for (row of f2lDetailRows(); track row.label) {
                      <tr class="f2l-sub">
                        <td>{{ row.label }}</td>
                        <td class="mono">{{ formatCfopPhaseMs(row.recognitionMs) }}</td>
                        <td class="mono">{{ formatCfopPhaseMs(row.executionMs) }}</td>
                        <td class="mono">{{ row.htmTurns }}</td>
                        <td class="mono">{{ row.tpsStr }}</td>
                      </tr>
                      @if (row.moves.length > 0) {
                        <tr class="f2l-sub f2l-moves-row">
                          <td colspan="5">
                            <div class="f2l-step">
                              <span class="mono muted">{{ row.moves.length }} moves</span>
                              <pre class="mono-tiny">{{ stepText(row.moves) }}</pre>
                            </div>
                          </td>
                        </tr>
                      }
                    }
                  } @else {
                    @for (step of f2lSteps(solve()); track $index) {
                      <tr class="f2l-sub">
                        <td colspan="5">
                          <div class="f2l-step">
                            <strong>Pair {{ $index + 1 }}</strong>
                            <span class="mono muted">{{ step.moves.length }} moves</span>
                            <pre class="mono-tiny">{{ stepText(step.moves) }}</pre>
                          </div>
                        </td>
                      </tr>
                    }
                  }
                }
                <tr class="click-stat" (click)="toggleOllStat()">
                  <td>OLL <span class="chev">{{ ollStatExpanded() ? '▼' : '▶' }}</span></td>
                  <td>{{ cfopInspectionCell(solve(), 'oll') }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'oll')) }}</td>
                  <td class="mono">{{ turnsPhaseStr(solve(), 'oll') }}</td>
                  <td class="mono">{{ tpsPhaseStr(solve(), 'oll') }}</td>
                </tr>
                @if (ollStatExpanded()) {
                  @if (ollReconMoves().length > 0) {
                    <tr class="f2l-sub">
                      <td colspan="5">
                        <div class="f2l-step">
                          <strong>OLL (recons moves)</strong>
                          <span class="mono muted">{{ ollReconMoves().length }} moves</span>
                          <pre class="mono-tiny">{{ stepText(ollReconMoves()) }}</pre>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (solve().ollCaseIndex != null) {
                    <tr class="stat-sub">
                      <td colspan="5">
                        <div class="case-stat">
                          <strong>Case #{{ solve().ollCaseIndex }} (OLL, this session)</strong>
                          <span>N={{ ollCaseStat().count }}, best={{ fm(ollCaseStat().best) }}, mean={{ fm(ollCaseStat().mean) }}</span>
                        </div>
                      </td>
                    </tr>
                  }
                }
                <tr class="click-stat" (click)="togglePllStat()">
                  <td>PLL <span class="chev">{{ pllStatExpanded() ? '▼' : '▶' }}</span></td>
                  <td>{{ cfopInspectionCell(solve(), 'pll') }}</td>
                  <td class="mono">{{ formatCfopPhaseMs(execPhaseMs(solve(), 'pll')) }}</td>
                  <td class="mono">{{ turnsPhaseStr(solve(), 'pll') }}</td>
                  <td class="mono">{{ tpsPhaseStr(solve(), 'pll') }}</td>
                </tr>
                @if (pllStatExpanded()) {
                  @if (pllReconMoves().length > 0) {
                    <tr class="f2l-sub">
                      <td colspan="5">
                        <div class="f2l-step">
                          <strong>PLL (recons moves)</strong>
                          <span class="mono muted">{{ pllReconMoves().length }} moves</span>
                          <pre class="mono-tiny">{{ stepText(pllReconMoves()) }}</pre>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (solve().pllCaseIndex != null) {
                    <tr class="stat-sub">
                      <td colspan="5">
                        <div class="case-stat">
                          <strong>Case #{{ solve().pllCaseIndex }} (PLL, this session)</strong>
                          <span>N={{ pllCaseStat().count }}, best={{ fm(pllCaseStat().best) }}, mean={{ fm(pllCaseStat().mean) }}</span>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </section>
          <section class="detail-block">
            <h3>Move trace</h3>
            @if (solve().moveTrace) {
              <pre class="mono-block trace">{{ solve().moveTrace }}</pre>
              <button type="button" class="btn-small" (click)="copyText(solve().moveTrace!)">Copy trace</button>
            } @else {
              <p class="muted">No move trace stored for this solve.</p>
            }
          </section>
      </div>
    </app-modal>
  `,
  styles: [`
    .solve-modal-body { padding: 14px 18px 20px; overflow-y: auto; }
    .row-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .btn { padding: 8px 14px; border-radius: 8px; border: 1px solid #d0d7de; background: #f8f9fa; cursor: pointer; font-size: 13px; }
    .btn:hover { background: #e9ecef; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: #f8d7da; border-color: #f5c2c7; color: #842029; }
    .btn-small { padding: 6px 10px; font-size: 12px; border-radius: 6px; border: 1px solid #d0d7de; background: #fff; cursor: pointer; margin-top: 8px; margin-right: 8px; }
    .btn-small.link { display: inline-block; text-decoration: none; color: #0d6efd; text-align: center; }
    .detail-block { margin-bottom: 18px; }
    .detail-block h3 { margin: 0 0 8px; font-size: 14px; color: #495057; }
    .mono-block { margin: 0 0 8px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
    .mono-line { font-family: 'JetBrains Mono', monospace; font-size: 12px; word-break: break-all; }
    .mono-tiny { font-size: 11px; margin: 4px 0 0; white-space: pre-wrap; word-break: break-all; }
    .trace { max-height: 160px; overflow-y: auto; }
    .kv { list-style: none; margin: 0; padding: 0; }
    .kv li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f1f3f5; font-size: 13px; }
    .muted { color: #868e96; font-size: 12px; margin-top: 0; }
    .cfop-tbl .f2l-row, .cfop-tbl .click-stat { cursor: pointer; }
    .cfop-tbl .f2l-row:hover, .cfop-tbl .click-stat:hover { background: #f8f9fa; }
    .f2l-sub td, .stat-sub td { background: #fcfcfd; padding-left: 24px; }
    .f2l-step { margin: 6px 0; }
    .case-stat { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .chev { font-size: 10px; color: #868e96; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class AnalysisSolveModalComponent {
  readonly penaltyLabel = penaltyLabel;
  readonly finalSolveMs = finalSolveMs;
  readonly joinTraceNotation = joinTraceNotation;
  readonly formatCfopPhaseMs = formatCfopPhaseMs;

  private readonly store = inject(LocalSolveStoreService);
  private readonly state = inject(StateService);
  private readonly router = inject(Router);
  private readonly replay = inject(SolveReplayService);
  private readonly cube = inject(CubeService);

  readonly solve = input.required<Solve>();
  readonly caseStatScope = input<Solve[]>([]);
  /** Used for Retry when the solve record has no sessionId. */
  readonly contextSessionId = input<number | undefined>(undefined);

  readonly closed = output<void>();
  readonly deleted = output<void>();

  readonly replayBusy = signal(false);
  readonly f2lExpanded = signal(false);
  readonly ollStatExpanded = signal(false);
  readonly pllStatExpanded = signal(false);

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

  readonly traceEst = computed(() => estimateCfopFromMoveTrace(this.solve().moveTrace));

  /** csTimer calcRecons(times, 'cf4op') when vendor scripts are loaded and trace is valid. */
  readonly reconsCf4op = computed(() => runCstimerCf4opRecons(this.solve()));

  /** csTimer-style f2l-1…f2l-4 rows (inspection / execution / HTM / TPS + moves). */
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

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  onClose(): void {
    this.replay.cancel();
    this.replayBusy.set(false);
    this.closed.emit();
  }

  copyText(text: string): void {
    void navigator.clipboard?.writeText(text);
  }

  inverseScramble(scramble: string): string {
    return this.cube.inverseScrambleNotation(scramble);
  }

  retrySolve(solve: Solve): void {
    const sessionId = solve.sessionId ?? this.contextSessionId();
    const q: Record<string, string> = {
      launchScramble: solve.scramble,
    };
    if (typeof sessionId === 'number') {
      q['launchSession'] = String(sessionId);
    }
    if (solve.scrambleType) {
      q['launchType'] = solve.scrambleType;
    }
    void this.router.navigate(['/'], { queryParams: q });
  }

  replaySolve(solve: Solve): void {
    if (!solve.moveTrace) {
      return;
    }
    this.replayBusy.set(true);
    const ok = this.replay.startReplay(solve.scramble, solve.moveTrace, () => {
      this.replayBusy.set(false);
    });
    if (!ok) {
      this.replayBusy.set(false);
    }
  }

  async deleteSolve(solve: Solve): Promise<void> {
    if (!solve.id || !confirm('Delete this solve from history?')) {
      return;
    }
    await this.store.deleteSolve(solve.id);
    this.state.solves.set(this.store.getSolves());
    this.replay.cancel();
    this.replayBusy.set(false);
    this.deleted.emit();
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
      return formatCfopPhaseMs(m!.recognitionMs);
    }
    if (phase === 'cross' && solve.inspectionTime != null) {
      return `${solve.inspectionTime} s`;
    }
    return '—';
  }

  execPhaseMs(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): number | null {
    const r = this.reconsCf4op();
    const m = this.macroPhase(r, phase);
    if (m) {
      return m.executionMs;
    }
    const te = this.traceEst();
    const stored =
      phase === 'cross'
        ? solve.crossTime
        : phase === 'f2l'
          ? solve.f2lTime
          : phase === 'oll'
            ? solve.ollTime
            : solve.PLLTime;
    if (stored != null) {
      return stored;
    }
    if (!te) {
      return null;
    }
    const seg =
      phase === 'cross'
        ? te.cross
        : phase === 'f2l'
          ? te.f2l
          : phase === 'oll'
            ? te.oll
            : te.pll;
    return seg && seg.moves.length > 0 ? seg.executionMs : null;
  }

  turnsPhaseStr(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): string {
    const r = this.reconsCf4op();
    const rm = this.macroPhase(r, phase);
    if (rm) {
      return String(rm.htmTurns);
    }
    const hasStoredCfop = [solve.crossTime, solve.f2lTime, solve.ollTime, solve.PLLTime].some(
      (x) => x != null,
    );
    const n = this.moveAllocCount(solve);
    const counts = allocatePhaseTurnCounts(solve, n);
    const fromCounts =
      phase === 'cross'
        ? counts.cross
        : phase === 'f2l'
          ? counts.f2l
          : phase === 'oll'
            ? counts.oll
            : counts.pll;
    if (hasStoredCfop) {
      return String(fromCounts);
    }
    const te = this.traceEst();
    const fromTrace =
      phase === 'cross'
        ? te?.cross?.moves.length
        : phase === 'f2l'
          ? te?.f2l?.moves.length
          : phase === 'oll'
            ? te?.oll?.moves.length
            : te?.pll?.moves.length;
    if (fromTrace != null && fromTrace > 0) {
      return String(fromTrace);
    }
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
    if (!Number.isFinite(turns) || turns <= 0) {
      return '—';
    }
    const tTrace = tpsFromMoves(turns, exec ?? 0);
    if (tTrace != null && exec != null && exec > 0) {
      return tTrace.toFixed(2);
    }
    const n = this.moveAllocCount(solve);
    const counts = allocatePhaseTurnCounts(solve, n);
    const storedExec =
      phase === 'cross'
        ? solve.crossTime
        : phase === 'f2l'
          ? solve.f2lTime
          : phase === 'oll'
            ? solve.ollTime
            : solve.PLLTime;
    const turnN =
      phase === 'cross'
        ? counts.cross
        : phase === 'f2l'
          ? counts.f2l
          : phase === 'oll'
            ? counts.oll
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
      if (moves.length > 0) {
        out.push({ moves });
      }
    }
    return out;
  }

  stepText(moves: ReturnType<typeof parseMoveTrace>): string {
    return moves.map((m) => m.notation).join(' ');
  }

  private moveAllocCount(solve: Solve): number {
    const parsed = parseMoveTrace(solve.moveTrace);
    if (parsed.length > 0) {
      return parsed.length;
    }
    return solve.moveCount ?? 0;
  }

  private macroPhase(
    r: CstimerCf4opRecons | null,
    phase: 'cross' | 'f2l' | 'oll' | 'pll',
  ): Cf4opMacroPhase | null {
    if (!r) {
      return null;
    }
    switch (phase) {
      case 'cross':
        return r.cross;
      case 'f2l':
        return r.f2l;
      case 'oll':
        return r.oll;
      case 'pll':
        return r.pll;
    }
  }
}
