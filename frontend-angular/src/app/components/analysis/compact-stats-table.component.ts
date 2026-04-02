import { Component, computed, inject, input, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import {
  finalMillis,
  solveTimestamp,
} from '../../lib/analysis-selectors';
import { estimateCfopFromMoveTrace } from '../../lib/move-trace-cfop';
import { runCstimerCf4opRecons, cstimerReconsEngineReady } from '../../lib/cstimer-recons';
import type { Solve } from '../../services/state.service';

export type CompactMetric = 'time' | 'cross' | 'f2l' | 'oll' | 'pll' | 'cfopInsp' | 'cfopExec' | 'htm' | 'fps' | 'fmc';

export interface CompactMetricOption {
  value: CompactMetric;
  labelKey: string;
}

export const COMPACT_METRIC_OPTIONS: CompactMetricOption[] = [
  { value: 'time', labelKey: 'metricTime' },
  { value: 'cross', labelKey: 'crossTime' },
  { value: 'f2l', labelKey: 'f2lTime' },
  { value: 'oll', labelKey: 'ollTime' },
  { value: 'pll', labelKey: 'pllTime' },
  { value: 'cfopInsp', labelKey: 'cfopInsp' },
  { value: 'cfopExec', labelKey: 'cfopExec' },
  { value: 'htm', labelKey: 'htm' },
  { value: 'fps', labelKey: 'fps' },
  { value: 'fmc', labelKey: 'fmc' },
];

export interface MetricStatRow {
  key: 'time' | 'mo3' | 'ao5' | 'ao12' | 'ao100';
  labelKey: string;
  current: number | null;
  best: number | null;
  exists: boolean;
}

export interface SolveRowData {
  solve: Solve;
  index: number;
  value: number | null;
  ao5: number | null;
  ao12: number | null;
  valueCurrentBest: boolean;
  ao5CurrentBest: boolean;
  ao12CurrentBest: boolean;
}

@Component({
  selector: 'app-compact-stats-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="compact-stats">
      <table class="metric-table">
        <thead>
          <tr>
            <th>{{ t('selected') }}</th>
            <th>{{ t('current') }}</th>
            <th>{{ t('bestStat') }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of statRows(); track row.key) {
            @if (row.exists) {
              <tr>
                @if (row.key === 'time') {
                  <td class="row-label">
                    <select id="metric-select" [value]="selectedMetric()" (change)="onMetricChange($event)">
                      @for (opt of metricOptions; track opt.value) {
                        <option [value]="opt.value">{{ t(opt.labelKey) }}</option>
                      }
                    </select>
                  </td>
                }
                @else {
                  <td class="row-label">{{ t(row.labelKey) }}</td>
                }
                <td class="mono">{{ formatValue(row.current) }}</td>
                <td class="mono">{{ formatValue(row.best) }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
      @if (solveRows().length > 0) {
        <div class="compact-list-wrap">
          <table class="compact-tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ metricLabel() }}</th>
                <th>Ao5</th>
                <th>Ao12</th>
              </tr>
            </thead>
            <tbody>
              @for (row of solveRows(); track row.solve.id) {
                <tr class="solve-row" (click)="solveOpen.emit(row.solve)">
                  <td class="lbl">{{ row.solve.id }}</td>
                  <td class="mono" [class.current-best]="row.valueCurrentBest">{{ formatValue(row.value) }}</td>
                  <td class="mono ao-cell" [class.current-best]="row.ao5CurrentBest">{{ formatValue(row.ao5) }}</td>
                  <td class="mono ao-cell" [class.current-best]="row.ao12CurrentBest">{{ formatValue(row.ao12) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="empty">No solves yet.</p>
      }
    </div>
  `,
  styles: [`
    .compact-stats { display: flex; flex-direction: column; height: 100%; }
    .metric-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .metric-table th {
      text-align: left;
      font-size: 10px;
      color: var(--text-secondary);
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      font-weight: 500;
    }
    .metric-table td {
      padding: 4px 6px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .metric-table .row-label { font-weight: 500; }
    .metric-table select {
      width: 100%;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid var(--input-border);
      font-size: 12px;
      background: var(--input-bg);
      color: var(--text-primary);
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
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
    .compact-tbl td.current-best {
      color: #e53935;
      font-weight: 600;
    }
    .empty { color: var(--text-muted); margin: 0; font-size: 13px; }
  `],
})
export class CompactStatsTableComponent {
  readonly metricOptions = COMPACT_METRIC_OPTIONS;

  private readonly i18n = inject(I18nService);

  readonly solves = input.required<Solve[]>();
  readonly solveOpen = output<Solve>();

  readonly selectedMetric = signal<CompactMetric>('time');

  t(key: string): string {
    return this.i18n.t(key);
  }

  metricLabel(): string {
    const opt = this.metricOptions.find(o => o.value === this.selectedMetric());
    return opt ? this.t(opt.labelKey) : '';
  }

  onMetricChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as CompactMetric;
    this.selectedMetric.set(v);
  }

  private getMetricValue(solve: Solve, metric: CompactMetric): number | null {
    switch (metric) {
      case 'time':
        return finalMillis(solve);
      case 'cross':
      case 'f2l':
      case 'oll':
      case 'pll':
        if (metric === 'cross') {
          if (solve.crossTime != null) return solve.crossTime;
          return this.derivePhaseFromTrace(solve, 'cross');
        }
        if (metric === 'f2l') {
          if (solve.f2lTime != null) return solve.f2lTime;
          return this.derivePhaseFromTrace(solve, 'f2l');
        }
        if (metric === 'oll') {
          if (solve.ollTime != null) return solve.ollTime;
          return this.derivePhaseFromTrace(solve, 'oll');
        }
        if (metric === 'pll') {
          if (solve.PLLTime != null) return solve.PLLTime;
          return this.derivePhaseFromTrace(solve, 'pll');
        }
        return null;
      case 'cfopInsp': {
        // Get inspection times from cstimer recons (recognition time = pause before each phase)
        if (cstimerReconsEngineReady()) {
          const r = runCstimerCf4opRecons(solve);
          if (r) {
            const crossInsp = r.cross?.recognitionMs ?? 0;
            const f2lInsp = r.f2l?.recognitionMs ?? 0;
            const ollInsp = r.oll?.recognitionMs ?? 0;
            const pllInsp = r.pll?.recognitionMs ?? 0;
            const total = crossInsp + f2lInsp + ollInsp + pllInsp;
            return total > 0 ? total : null;
          }
        }
        // Fallback: use inspectionTime setting (WCA default 15s)
        return solve.inspectionTime != null ? solve.inspectionTime * 1000 : null;
      }
      case 'cfopExec': {
        const cross = solve.crossTime ?? this.derivePhaseFromTrace(solve, 'cross') ?? 0;
        const f2l = solve.f2lTime ?? this.derivePhaseFromTrace(solve, 'f2l') ?? 0;
        const oll = solve.ollTime ?? this.derivePhaseFromTrace(solve, 'oll') ?? 0;
        const pll = solve.PLLTime ?? this.derivePhaseFromTrace(solve, 'pll') ?? 0;
        const exec = cross + f2l + oll + pll;
        return exec > 0 ? exec : null;
      }
      case 'htm':
        return solve.moveCount ?? null;
      case 'fps': {
        const moves = solve.moveCount ?? 0;
        const cross = solve.crossTime ?? this.derivePhaseFromTrace(solve, 'cross') ?? 0;
        const f2l = solve.f2lTime ?? this.derivePhaseFromTrace(solve, 'f2l') ?? 0;
        const oll = solve.ollTime ?? this.derivePhaseFromTrace(solve, 'oll') ?? 0;
        const pll = solve.PLLTime ?? this.derivePhaseFromTrace(solve, 'pll') ?? 0;
        const exec = cross + f2l + oll + pll;
        if (moves > 0 && exec > 0) {
          return moves / (exec / 1000);
        }
        return null;
      }
      case 'fmc': {
        const moves = solve.moveCount ?? 0;
        const total = finalMillis(solve);
        if (moves > 0 && total != null && total > 0) {
          return moves / (total / 60000);
        }
        return null;
      }
      default:
        return null;
    }
  }

  private derivePhaseFromTrace(solve: Solve, phase: 'cross' | 'f2l' | 'oll' | 'pll'): number | null {
    if (cstimerReconsEngineReady()) {
      const r = runCstimerCf4opRecons(solve);
      if (r) {
        switch (phase) {
          case 'cross': return r.cross?.executionMs ?? null;
          case 'f2l': return r.f2l?.executionMs ?? null;
          case 'oll': return r.oll?.executionMs ?? null;
          case 'pll': return r.pll?.executionMs ?? null;
        }
      }
    }
    const est = estimateCfopFromMoveTrace(solve.moveTrace);
    if (!est) return null;
    switch (phase) {
      case 'cross': return est.cross?.executionMs ?? null;
      case 'f2l': return est.f2l?.executionMs ?? null;
      case 'oll': return est.oll?.executionMs ?? null;
      case 'pll': return est.pll?.executionMs ?? null;
      default: return null;
    }
  }

  private computeTrimmedAvg(values: number[], n: number): number | null {
    if (values.length < n) return null;
    const window = values.slice(0, n);
    if (window.length <= 2) {
      return this.computeMean(window);
    }
    const sorted = [...window].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
  }

  private computeMean(nums: number[]): number | null {
    if (nums.length === 0) return null;
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  }

  private computeBestTrimmedAvg(values: number[], n: number): number | null {
    if (values.length < n) return null;
    let best: number | null = null;
    for (let i = 0; i <= values.length - n; i++) {
      const window = values.slice(i, i + n);
      const avg = this.computeTrimmedAvg(window, n);
      if (avg !== null && (best === null || avg < best)) {
        best = avg;
      }
    }
    return best;
  }

  readonly statRows = computed((): MetricStatRow[] => {
    const solves = this.solves();
    const metric = this.selectedMetric();

    const sorted = [...solves].sort((a, b) => solveTimestamp(b) - solveTimestamp(a));
    const values = sorted.map(s => this.getMetricValue(s, metric));

    if (values.length === 0 || values.every(v => v === null)) {
      return [{ key: 'time', labelKey: 'time', current: null, best: null, exists: true }];
    }

    const validValues = values.filter((v): v is number => v !== null);
    const current = validValues[0] ?? null;
    const best = validValues.length > 0 ? Math.min(...validValues) : null;

    const mo3 = this.computeTrimmedAvg(validValues, 3);
    const ao5 = this.computeTrimmedAvg(validValues, 5);
    const ao12 = this.computeTrimmedAvg(validValues, 12);
    const ao100 = this.computeTrimmedAvg(validValues, 100);

    const bestMo3 = this.computeBestTrimmedAvg(validValues, 3);
    const bestAo5 = this.computeBestTrimmedAvg(validValues, 5);
    const bestAo12 = this.computeBestTrimmedAvg(validValues, 12);
    const bestAo100 = this.computeBestTrimmedAvg(validValues, 100);

    return [
      { key: 'time', labelKey: 'time', current, best, exists: true },
      { key: 'mo3', labelKey: 'mo3', current: mo3, best: bestMo3, exists: sorted.length >= 3 },
      { key: 'ao5', labelKey: 'ao5', current: ao5, best: bestAo5, exists: sorted.length >= 5 },
      { key: 'ao12', labelKey: 'ao12', current: ao12, best: bestAo12, exists: sorted.length >= 12 },
      { key: 'ao100', labelKey: 'ao100', current: ao100, best: bestAo100, exists: sorted.length >= 100 },
    ];
  });

  readonly solveRows = computed((): SolveRowData[] => {
    const solves = this.solves();
    const metric = this.selectedMetric();

    // Sort by ID ascending (chronological order)
    const sorted = [...solves].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const values = sorted.map(s => this.getMetricValue(s, metric));

    // For most metrics, lower is better; for fps, higher is better
    const lowerIsBetter = metric !== 'fps';

    // Compute rolling ao5 and ao12 with prefix best flags
    const result: SolveRowData[] = [];
    let bestValue: number | null = null;
    let bestAo5: number | null = null;
    let bestAo12: number | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const window5 = values.slice(i, i + 5);
      const window12 = values.slice(i, i + 12);
      const valid5 = window5.filter((v): v is number => v !== null);
      const valid12 = window12.filter((v): v is number => v !== null);

      const ao5 = valid5.length === 5 ? this.computeTrimmedAvg(valid5, 5) : null;
      const ao12 = valid12.length === 12 ? this.computeTrimmedAvg(valid12, 12) : null;

      // Update prefix bests (from smallest ID to largest)
      const val = values[i];
      if (val != null) {
        if (bestValue === null || (lowerIsBetter ? val < bestValue : val > bestValue)) {
          bestValue = val;
        }
        if (ao5 != null && (bestAo5 === null || ao5 < bestAo5)) {
          bestAo5 = ao5;
        }
        if (ao12 != null && (bestAo12 === null || ao12 < bestAo12)) {
          bestAo12 = ao12;
        }
      }

      result.push({
        solve: sorted[i]!,
        index: i + 1,
        value: values[i],
        ao5,
        ao12,
        valueCurrentBest: val !== null && (bestValue === null || (lowerIsBetter ? val === bestValue : val === bestValue)),
        ao5CurrentBest: ao5 !== null && bestAo5 !== null && ao5 === bestAo5,
        ao12CurrentBest: ao12 !== null && bestAo12 !== null && ao12 === bestAo12,
      });
    }
    return result.reverse(); // Show most recent solves at the top
  });

  formatValue(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }

    const metric = this.selectedMetric();

    if (metric === 'htm') {
      return Math.round(value).toString();
    }

    if (metric === 'fps' || metric === 'fmc') {
      return value.toFixed(1);
    }

    return this.formatTime(value);
  }

  private formatTime(ms: number): string {
    if (ms === null || ms === undefined) return '—';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${centis.toString().padStart(2, '0')}`;
  }
}