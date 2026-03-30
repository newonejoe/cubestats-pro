import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import {
  computeSessionSummaries,
  filterBySession,
  filterByTimeWindow,
  formatMs,
  type TimeWindow,
} from '../../lib/analysis-selectors';

@Component({
  selector: 'app-analysis-cross-section',
  standalone: true,
  imports: [CommonModule],
  template: `
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
  `,
  styles: [`
    h2 { margin: 0 0 12px; font-size: 18px; }
  `],
})
export class AnalysisCrossSectionComponent {
  private readonly store = inject(LocalSolveStoreService);

  readonly timeWindow = input<TimeWindow>('7d');
  readonly customFrom = input<string>('');
  readonly customTo = input<string>('');
  readonly useSessionFilter = input<boolean>(false);
  readonly sessionFilterId = input<number | 'all'>('all');

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });
  readonly sessions = computed(() => {
    this.store.storeRevision();
    return this.store.getSessions();
  });

  readonly crossSectionSolves = computed(() => {
    const byWindow = filterByTimeWindow(
      this.solves(),
      this.timeWindow(),
      this.customFrom(),
      this.customTo(),
    );
    if (!this.useSessionFilter()) {
      return byWindow;
    }
    return filterBySession(byWindow, this.sessionFilterId());
  });

  readonly sessionRows = computed(() => computeSessionSummaries(this.crossSectionSolves()));

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  sessionName(sessionId: number): string {
    return this.sessions().find((s) => s.id === sessionId)?.name ?? `Session ${sessionId}`;
  }
}
