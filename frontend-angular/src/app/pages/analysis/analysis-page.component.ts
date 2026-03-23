import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import {
  buildTrend,
  computeSessionStats,
  computeSessionSummaries,
  computeTrainingSummary,
  filterBySession,
  filterByTimeWindow,
  formatMs,
  TimeWindow
} from '../../lib/analysis-selectors';

@Component({
  selector: 'app-analysis-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="analysis-page">
      <header class="top">
        <a routerLink="/" class="back">← Home</a>
        <h1>Analysis</h1>
      </header>

      <section class="panel">
        <div class="toolbar">
          <label>
            Feature
            <select [value]="selectedFeature()" (change)="onFeatureChange($event)">
              <option value="session">Session Statistics</option>
              <option value="trend">Time Trend</option>
              <option value="cross">Cross-section Statistics</option>
              <option value="training">Training Statistics</option>
            </select>
          </label>
          @if (selectedFeature() !== 'cross') {
            <label>
              Session
              <select [value]="selectedSessionId()" (change)="onSessionChange($event)">
                <option value="all">All sessions</option>
                @for (s of sessions(); track s.id) {
                  <option [value]="s.id">{{ s.name }}</option>
                }
              </select>
            </label>
          } @else {
            <label>
              Time Window
              <select [value]="selectedTimeWindow()" (change)="onTimeWindowChange($event)">
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label class="inline-check">
              <input type="checkbox" [checked]="useSessionFilterInCross()" (change)="onCrossSessionFilterToggle($event)" />
              <span>Apply session filter</span>
            </label>
            @if (useSessionFilterInCross()) {
              <label>
                Session
                <select [value]="selectedSessionId()" (change)="onSessionChange($event)">
                  <option value="all">All sessions</option>
                  @for (s of sessions(); track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </label>
            }
            @if (selectedTimeWindow() === 'custom') {
              <label>
                From
                <input type="date" [value]="customFrom()" (change)="onCustomFromChange($event)" />
              </label>
              <label>
                To
                <input type="date" [value]="customTo()" (change)="onCustomToChange($event)" />
              </label>
            }
          }
        </div>
      </section>

      <section class="panel">
        @switch (selectedFeature()) {
          @case ('session') {
            <h2>Session Statistics</h2>
            <div class="cards">
              <div class="card"><div class="label">Solves</div><div class="value">{{ sessionStats().solveCount }}</div></div>
              <div class="card"><div class="label">Current</div><div class="value">{{ fm(sessionStats().current) }}</div></div>
              <div class="card"><div class="label">Best</div><div class="value">{{ fm(sessionStats().best) }}</div></div>
              <div class="card"><div class="label">Ao5</div><div class="value">{{ fm(sessionStats().ao5) }}</div></div>
              <div class="card"><div class="label">Ao12</div><div class="value">{{ fm(sessionStats().ao12) }}</div></div>
              <div class="card"><div class="label">Ao100</div><div class="value">{{ fm(sessionStats().ao100) }}</div></div>
            </div>
          }
          @case ('trend') {
            <h2>Time Trend</h2>
            @if (trend().length < 2) {
              <p class="empty">Need at least 2 solves to render trend.</p>
            } @else {
              <svg class="trend" viewBox="0 0 1000 240" preserveAspectRatio="none">
                <polyline [attr.points]="trendPolyline()" fill="none" stroke="#0d6efd" stroke-width="2" />
              </svg>
            }
          }
          @case ('cross') {
            <h2>Cross-section Statistics</h2>
            <table class="tbl">
              <thead>
                <tr><th>Session</th><th>Solves</th><th>Best</th><th>Mean</th><th>Ao5</th><th>Ao12</th></tr>
              </thead>
              <tbody>
                @for (row of sessionRows(); track row.sessionId) {
                  <tr>
                    <td>{{ sessionName(row.sessionId) }}</td>
                    <td>{{ row.solveCount }}</td>
                    <td>{{ fm(row.best) }}</td>
                    <td>{{ fm(row.mean) }}</td>
                    <td>{{ fm(row.ao5) }}</td>
                    <td>{{ fm(row.ao12) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
          @case ('training') {
            <h2>Training Statistics</h2>
            <div class="training-head">
              <label>
                Case Type
                <select [value]="trainingCaseType()" (change)="onTrainingCaseTypeChange($event)">
                  <option value="oll">OLL</option>
                  <option value="pll">PLL</option>
                </select>
              </label>
              <p class="hint">Sorted by mean descending to identify slowest recognition/execution cases.</p>
            </div>
            <table class="tbl">
              <thead>
                <tr><th>Case</th><th>N</th><th>Best</th><th>Mean</th></tr>
              </thead>
              <tbody>
                @for (x of trainingCaseRows(); track x.key) {
                  <tr>
                    <td>#{{ x.key }}</td>
                    <td>{{ x.count }}</td>
                    <td>{{ fm(x.best) }}</td>
                    <td>{{ fm(x.mean) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (trainingCaseRows().length === 0) {
              <p class="empty">No {{ trainingCaseType().toUpperCase() }} records in current scope.</p>
            }
            <div class="training-type-summary">
              <h3>Type Distribution</h3>
              <ul class="list">
                @for (x of training().byType; track x.key) {
                  <li><span>{{ x.key }}</span><span>{{ x.count }} / {{ fm(x.mean) }}</span></li>
                }
              </ul>
            </div>
          }
          @default {
            <p class="empty">No feature selected.</p>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    .analysis-page { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .top { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
    .back { color: #0d6efd; text-decoration: none; }
    .panel { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
    .toolbar label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #6c757d; }
    .toolbar .inline-check { flex-direction: row; align-items: center; gap: 8px; padding-bottom: 8px; }
    .toolbar select, .toolbar input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d0d7de; font-size: 13px; color: #212529; background: #fff; }
    .cards { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 10px; text-align: center; }
    .label { font-size: 12px; color: #6c757d; }
    .value { font-size: 20px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
    .trend { width: 100%; height: 220px; border-radius: 8px; background: #f8f9fa; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th, .tbl td { border-bottom: 1px solid #eef2f4; padding: 8px; text-align: left; }
    .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
    .training-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 10px; }
    .hint { margin: 0; color: #6c757d; font-size: 12px; }
    .training-type-summary { margin-top: 12px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f3f5; }
    .empty { color: #868e96; margin: 0; }
  `]
})
export class AnalysisPageComponent {
  private readonly store = inject(LocalSolveStoreService);
  readonly selectedFeature = signal<'session' | 'trend' | 'cross' | 'training'>('session');
  readonly selectedSessionId = signal<number | 'all'>('all');
  readonly selectedTimeWindow = signal<TimeWindow>('7d');
  readonly useSessionFilterInCross = signal<boolean>(false);
  readonly trainingCaseType = signal<'oll' | 'pll'>('oll');
  readonly customFrom = signal<string>('');
  readonly customTo = signal<string>('');

  readonly solves = computed(() => this.store.getSolves());
  readonly sessions = computed(() => this.store.getSessions());
  readonly sessionSolves = computed(() => filterBySession(this.solves(), this.selectedSessionId()));
  readonly crossSectionSolves = computed(() => {
    const byWindow = filterByTimeWindow(this.solves(), this.selectedTimeWindow(), this.customFrom(), this.customTo());
    if (!this.useSessionFilterInCross()) {
      return byWindow;
    }
    return filterBySession(byWindow, this.selectedSessionId());
  });
  readonly sessionStats = computed(() => computeSessionStats(this.sessionSolves()));
  readonly trend = computed(() => buildTrend(this.sessionSolves()));
  readonly sessionRows = computed(() => computeSessionSummaries(this.crossSectionSolves()));
  readonly training = computed(() => computeTrainingSummary(this.sessionSolves()));
  readonly trainingCaseRows = computed(() => {
    const source = this.trainingCaseType() === 'oll' ? this.training().ollCases : this.training().pllCases;
    return [...source].sort((a, b) => {
      const am = a.mean ?? -1;
      const bm = b.mean ?? -1;
      if (bm !== am) {
        return bm - am;
      }
      return b.count - a.count;
    });
  });

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  onFeatureChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as 'session' | 'trend' | 'cross' | 'training';
    this.selectedFeature.set(v);
  }

  onSessionChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === 'all') {
      this.selectedSessionId.set('all');
      return;
    }
    const id = Number.parseInt(raw, 10);
    this.selectedSessionId.set(Number.isNaN(id) ? 'all' : id);
  }

  onTimeWindowChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as TimeWindow;
    this.selectedTimeWindow.set(v);
  }

  onCustomFromChange(event: Event): void {
    this.customFrom.set((event.target as HTMLInputElement).value);
  }

  onCustomToChange(event: Event): void {
    this.customTo.set((event.target as HTMLInputElement).value);
  }

  onCrossSessionFilterToggle(event: Event): void {
    this.useSessionFilterInCross.set((event.target as HTMLInputElement).checked);
  }

  onTrainingCaseTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.trainingCaseType.set(v === 'pll' ? 'pll' : 'oll');
  }

  sessionName(sessionId: number): string {
    return this.sessions().find((s) => s.id === sessionId)?.name ?? `Session ${sessionId}`;
  }

  trendPolyline(): string {
    const points = this.trend();
    if (points.length < 2) {
      return '';
    }
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(max - min, 1);
    return points.map((p, i) => {
      const x = (i / (points.length - 1)) * 1000;
      const y = 220 - ((p.value - min) / span) * 200 - 10;
      return `${x},${y}`;
    }).join(' ');
  }
}

