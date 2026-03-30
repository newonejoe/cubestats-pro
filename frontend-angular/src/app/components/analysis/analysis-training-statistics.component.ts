import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { computeTrainingSummary, filterBySession, formatMs } from '../../lib/analysis-selectors';

@Component({
  selector: 'app-analysis-training-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
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
  `,
  styles: [`
    h2 { margin: 0 0 12px; font-size: 18px; }
    h3 { margin: 12px 0 8px; font-size: 15px; }
    .training-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 10px; }
    .training-head label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #6c757d; }
    .training-head select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d0d7de; font-size: 13px; }
    .hint { margin: 0; color: #6c757d; font-size: 12px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th, .tbl td { border-bottom: 1px solid #eef2f4; padding: 8px; text-align: left; }
    .training-type-summary { margin-top: 12px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f3f5; }
    .empty { color: #868e96; margin: 0; }
  `],
})
export class AnalysisTrainingStatisticsComponent {
  private readonly store = inject(LocalSolveStoreService);

  readonly sessionId = input<number | 'all'>('all');

  readonly trainingCaseType = signal<'oll' | 'pll'>('oll');

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });

  readonly sessionSolves = computed(() => filterBySession(this.solves(), this.sessionId()));

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

  onTrainingCaseTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.trainingCaseType.set(v === 'pll' ? 'pll' : 'oll');
  }
}
