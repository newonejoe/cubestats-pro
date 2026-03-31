import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';
import { buildTrend, filterBySession } from '../../lib/analysis-selectors';

@Component({
  selector: 'app-analysis-time-trend',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>{{ t('timeTrend') }}</h2>
    @if (sessionId() === 'all') {
      <p class="empty">{{ t('selectSession') }}</p>
    } @else if (trend().length < 2) {
      <p class="empty">{{ t('needMoreSolvesTrend') }}</p>
    } @else {
      <svg class="trend" viewBox="0 0 1000 240" preserveAspectRatio="none">
        <polyline [attr.points]="trendPolyline()" fill="none" stroke="#0d6efd" stroke-width="2" />
      </svg>
    }
  `,
  styles: [`
    h2 { margin: 0 0 12px; font-size: 18px; }
    .trend { width: 100%; height: 220px; border-radius: 8px; background: #f8f9fa; }
    .empty { color: #868e96; margin: 0; }
  `],
})
export class AnalysisTimeTrendComponent {
  private readonly store = inject(LocalSolveStoreService);
  private readonly i18n = inject(I18nService);

  readonly sessionId = input<number | 'all'>('all');

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });

  readonly sessionDetailSolves = computed(() => {
    const sid = this.sessionId();
    if (sid === 'all') {
      return [];
    }
    return filterBySession(this.solves(), sid);
  });

  readonly trend = computed(() => buildTrend(this.sessionDetailSolves()));

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
