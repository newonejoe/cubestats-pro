import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';
import {
  computeSessionSummaries,
  filterBySession,
  filterByTimeWindow,
  formatMs,
  type TimeWindow,
} from '../../lib/analysis-selectors';

@Component({
  selector: 'app-analysis-cross-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <h2>{{ t('crossSectionStats') }}</h2>
    <table class="tbl">
      <thead>
        <tr><th>{{ t('session') }}</th><th>{{ t('solves') }}</th><th>{{ t('bestStat') }}</th><th>{{ t('mean') }}</th><th>{{ t('ao5') }}</th><th>{{ t('ao12') }}</th></tr>
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
  private readonly i18n = inject(I18nService);

  readonly timeWindow = input<TimeWindow>('7d');
  readonly customFrom = input<string>('');
  readonly customTo = input<string>('');
  readonly useSessionFilter = input<boolean>(false);
  readonly sessionFilterId = input<number | 'all'>('all');

  t(key: string): string {
    return this.i18n.t(key);
  }

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
