import { Component, inject, OnInit, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { formatMs } from '../../lib/analysis-selectors';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ t('sessionStats') }}</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ currentTime() }}</div>
          <div class="stat-label">{{ t('current') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ ao5() }}</div>
          <div class="stat-label">{{ t('ao5') }}</div>
        </div>
        <div class="stat-item best">
          <div class="stat-value">{{ bestTime() }}</div>
          <div class="stat-label">{{ t('best') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ ao12() }}</div>
          <div class="stat-label">{{ t('ao12') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ ao100() }}</div>
          <div class="stat-label">{{ t('ao100') }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ solveCount() }}</div>
          <div class="stat-label">{{ t('solves') }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 20px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-item {
      text-align: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-item.best {
      background: #e8f5e9;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  `]
})
export class StatisticsComponent implements OnInit {
  private store = inject(LocalSolveStoreService);

  currentTime: WritableSignal<string> = signal<string>('--');
  ao5: WritableSignal<string> = signal<string>('--');
  ao12: WritableSignal<string> = signal<string>('--');
  ao100: WritableSignal<string> = signal<string>('--');
  bestTime: WritableSignal<string> = signal<string>('--');
  solveCount: WritableSignal<string> = signal<string>('0');

  private translations: Record<string, string> = {
    sessionStats: 'Session Statistics',
    current: 'Current',
    ao5: 'Ao5',
    ao12: 'Ao12',
    ao100: 'Ao100',
    best: 'Best',
    solves: 'Solves'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  ngOnInit(): void {
    this.loadStatistics();

    window.addEventListener('statisticsLoaded', ((event: CustomEvent) => {
      this.updateStatistics(event.detail);
    }) as EventListener);
  }

  async loadStatistics(): Promise<void> {
    this.updateStatistics(this.store.getStatistics());
  }

  private updateStatistics(stats: { currentTime?: number | null; ao5?: number | null; ao12?: number | null; ao100?: number | null; bestTime?: number | null; solveCount?: number }): void {
    this.currentTime.set(formatMs(stats.currentTime ?? null));
    this.ao5.set(formatMs(stats.ao5 ?? null));
    this.ao12.set(formatMs(stats.ao12 ?? null));
    this.ao100.set(formatMs(stats.ao100 ?? null));
    this.bestTime.set(formatMs(stats.bestTime ?? null));
    this.solveCount.set(String(stats.solveCount || 0));
  }
}
