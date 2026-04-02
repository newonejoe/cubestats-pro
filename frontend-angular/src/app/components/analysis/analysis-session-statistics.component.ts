import { Component, computed, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';
import {
  computeRollingAoBySolve,
  computeSessionStats,
  filterBySession,
  primaryMetricValue,
  sortSolvesByMetric,
  type PrimaryMetric,
} from '../../lib/analysis-selectors';
import { METRIC_OPTIONS } from './analysis-metric-options';
import {
  finalSolveMs,
  formatMinuteSecondCentis,
  formatSolveDate,
  penaltyLabel,
  truncateScramble,
} from './analysis-solve-display';
import type { Solve } from '../../services/state.service';

@Component({
  selector: 'app-analysis-session-statistics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (mode() === 'compact') {
      <!-- Compact sidebar mode -->
      <div class="compact-stats">
        <div class="cards-compact">
          <div class="card-c"><span class="val">{{ fm(sessionStats().current) }}</span><span class="lbl">{{ translateMetricLabel('current') }}</span></div>
          <div class="card-c"><span class="val">{{ fm(sessionStats().best) }}</span><span class="lbl">{{ translateMetricLabel('best') }}</span></div>
          <div class="card-c"><span class="val">{{ sessionStats().solveCount }}</span><span class="lbl">{{ translateMetricLabel('solveCount') }}</span></div>
          <div class="card-c"><span class="val">{{ fm(sessionStats().ao5) }}</span><span class="lbl">{{ translateMetricLabel('ao5') }}</span></div>
          <div class="card-c"><span class="val">{{ fm(sessionStats().ao12) }}</span><span class="lbl">{{ translateMetricLabel('ao12') }}</span></div>
          <div class="card-c"><span class="val">{{ fm(sessionStats().ao100) }}</span><span class="lbl">{{ translateMetricLabel('ao100') }}</span></div>
        </div>
        @if (sortedSessionSolves().length > 0) {
          <div class="compact-list-wrap">
            <table class="compact-tbl">
              <thead><tr><th>#</th><th>Time</th><th>Ao5</th><th>Ao12</th></tr></thead>
              <tbody>
                @for (solve of sortedSessionSolves(); track solve.id ?? $index; let idx = $index) {
                  <tr class="solve-row" (click)="solveOpen.emit(solve)">
                    <td class="lbl">{{ idx + 1 }}</td>
                    <td class="mono">{{ fm(finalSolveMs(solve)) }}</td>
                    <td class="mono ao-cell">{{ rollingAo5Cell(solve) }}</td>
                    <td class="mono ao-cell">{{ rollingAo12Cell(solve) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="empty">No solves yet.</p>
        }
      </div>
    } @else {
      <!-- Full analysis mode -->
      <h2>Session Statistics</h2>
      @if (sessionId() === 'all') {
        <p class="empty">Select a session to view solves.</p>
      } @else {
        <div class="cards">
          <div class="card"><div class="label">Solves</div><div class="value">{{ sessionStats().solveCount }}</div></div>
          <div class="card"><div class="label">Current</div><div class="value">{{ fm(sessionStats().current) }}</div></div>
          <div class="card"><div class="label">Best</div><div class="value">{{ fm(sessionStats().best) }}</div></div>
          <div class="card"><div class="label">Ao5</div><div class="value">{{ fm(sessionStats().ao5) }}</div></div>
          <div class="card"><div class="label">Ao12</div><div class="value">{{ fm(sessionStats().ao12) }}</div></div>
          <div class="card"><div class="label">Ao100</div><div class="value">{{ fm(sessionStats().ao100) }}</div></div>
        </div>
        <div class="session-tools">
          <label>
            Primary metric
            <select [value]="primaryMetric()" (change)="onPrimaryMetricChange($event)">
              @for (opt of metricOptions; track opt.value) {
                <option [value]="opt.value">{{ translateMetricLabel(opt.labelKey) }}</option>
              }
            </select>
          </label>
          <span class="sort-hint">Default: newest solve first. Total time: fastest first; other metrics: largest first.</span>
        </div>
        @if (sortedSessionSolves().length === 0) {
          <p class="empty">No solves in this session.</p>
        } @else {
          <div class="table-wrap">
            <table class="tbl solves-tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Ao5</th>
                  <th>Ao12</th>
                  <th>{{ primaryMetricLabel() }}</th>
                  <th>Pen.</th>
                  <th>Scramble</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (solve of sortedSessionSolves(); track solve.id ?? $index; let idx = $index) {
                  <tr class="solve-row" (click)="solveOpen.emit(solve)">
                    <td>{{ idx + 1 }}</td>
                    <td>{{ formatSolveDate(solve) }}</td>
                    <td class="mono">{{ fm(finalSolveMs(solve)) }}</td>
                    <td class="mono ao-cell">{{ rollingAo5Cell(solve) }}</td>
                    <td class="mono ao-cell">{{ rollingAo12Cell(solve) }}</td>
                    <td class="mono">{{ formatMetricCell(solve) }}</td>
                    <td>{{ penaltyLabel(solve) }}</td>
                    <td class="scramble-cell" [title]="solve.scramble">{{ truncateScramble(solve.scramble) }}</td>
                    <td>
                      <button type="button" class="linkish" (click)="solveOpen.emit(solve); $event.stopPropagation()">Details</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
  styles: [`
    /* Full mode styles */
    h2 { margin: 0 0 12px; font-size: 18px; }
    .cards { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; margin-bottom: 14px; }
    .card { background: var(--hover-bg); border-radius: 8px; padding: 10px; text-align: center; }
    .label { font-size: 12px; color: var(--text-secondary); }
    .value { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
    .session-tools { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; margin-bottom: 12px; }
    .ao-cell { white-space: nowrap; color: var(--text-primary); }
    .session-tools label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    .session-tools select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--input-border); font-size: 13px; background: var(--input-bg); color: var(--text-primary); }
    .sort-hint { font-size: 12px; color: var(--text-muted); }
    .solves-tbl .solve-row { cursor: pointer; }
    .solves-tbl .solve-row:hover { background: var(--hover-bg); }
    .scramble-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .mono { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
    .linkish { background: none; border: none; color: var(--link-color); cursor: pointer; font-size: 13px; padding: 0; text-decoration: underline; }
    .table-wrap { overflow-x: auto; }
    .empty { color: var(--text-muted); margin: 0; font-size: 13px; }

    /* Compact sidebar mode styles */
    .compact-stats { display: flex; flex-direction: column; height: 100%; }
    .cards-compact {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .card-c {
      background: var(--hover-bg);
      border-radius: 6px;
      padding: 6px 4px;
      text-align: center;
    }
    .card-c .val {
      display: block;
      font-size: 15px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-primary);
    }
    .card-c .lbl {
      display: block;
      font-size: 10px;
      color: var(--text-secondary);
      margin-top: 2px;
    }
    .compact-list-wrap {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
    }
    .compact-tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .compact-tbl th {
      text-align: left;
      font-size: 11px;
      color: var(--text-secondary);
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      background: var(--card-bg);
    }
    .compact-tbl .solve-row { cursor: pointer; }
    .compact-tbl .solve-row:hover { background: var(--hover-bg); }
    .compact-tbl td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }
  `],
})
export class AnalysisSessionStatisticsComponent {
  readonly metricOptions = METRIC_OPTIONS;
  readonly formatSolveDate = formatSolveDate;
  readonly penaltyLabel = penaltyLabel;
  readonly truncateScramble = truncateScramble;
  readonly finalSolveMs = finalSolveMs;

  private readonly store = inject(LocalSolveStoreService);
  private readonly i18n = inject(I18nService);

  readonly sessionId = input<number | 'all'>('all');
  readonly mode = input<'compact' | 'full'>('full');
  readonly solveOpen = output<Solve>();

  readonly primaryMetric = signal<PrimaryMetric>('timestamp');

  t(key: string): string {
    return this.i18n.t(key);
  }

  translateMetricLabel(labelKey: string): string {
    return this.i18n.t(labelKey);
  }

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });

  readonly sessionDetailSolves = computed(() => {
    const sid = this.sessionId();
    if (sid === 'all') return [];
    return filterBySession(this.solves(), sid);
  });

  readonly sessionStats = computed(() => computeSessionStats(this.sessionDetailSolves()));

  readonly rollingAoBySolve = computed(() => computeRollingAoBySolve(this.sessionDetailSolves()));

  readonly sortedSessionSolves = computed(() =>
    sortSolvesByMetric(this.sessionDetailSolves(), this.primaryMetric()),
  );

  readonly primaryMetricLabel = computed(() => {
    const m = this.primaryMetric();
    const opt = METRIC_OPTIONS.find((o) => o.value === m);
    return opt ? this.translateMetricLabel(opt.labelKey) : m;
  });

  fm(ms: number | null | undefined): string {
    // return formatMinuteSecondMillis(ms);
    return formatMinuteSecondCentis(ms);
  }

  onPrimaryMetricChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as PrimaryMetric;
    this.primaryMetric.set(v);
  }

  rollingAo5Cell(solve: Solve): string {
    const v = this.rollingAoBySolve().get(solve)?.ao5;
    return v != null ? this.fm(v) : '—';
  }

  rollingAo12Cell(solve: Solve): string {
    const v = this.rollingAoBySolve().get(solve)?.ao12;
    return v != null ? this.fm(v) : '—';
  }

  formatMetricCell(solve: Solve): string {
    const m = this.primaryMetric();
    if (m === 'timestamp') {
      return this.formatSolveDate(solve);
    }
    const v = primaryMetricValue(solve, m);
    if (v === null) return '—';
    if (m === 'inspection') {
      return solve.inspectionTime != null
        ? formatMinuteSecondCentis(Math.round(solve.inspectionTime * 1000))
        : '—';
    }
    if (m === 'moveCount') return String(solve.moveCount ?? '—');
    return formatMinuteSecondCentis(v);
  }
}
