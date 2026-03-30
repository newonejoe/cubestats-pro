import { Component, inject, OnInit, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, Solve, Session } from '../../services/state.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { sortSolvesByMetric } from '../../lib/analysis-selectors';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-header">
        <span class="card-title">{{ t('solveHistory') }}</span>
        <div class="history-controls">
          <select class="session-select" (change)="onSessionChange($event)">
            <option value="all">All sessions</option>
            @for (session of sessions(); track session.id) {
              <option [value]="session.id">{{ session.name }}</option>
            }
          </select>
          <button class="btn btn-secondary btn-sm" (click)="createNewSession()">+ {{ t('newSession') }}</button>
          <button class="filter-btn" (click)="exportData()">{{ t('export') }}</button>
        </div>
      </div>
      <div class="solves-list">
        @if (solves().length === 0) {
          <div class="no-data">
            <p>{{ t('noData') }}</p>
          </div>
        } @else {
          @for (solve of solves(); track $index) {
            <div class="solve-item" [class.dnf]="solve.dnf" [class.plus2]="solve.plus2">
              <div class="solve-time">
                {{ formatTime(solve.time) }}
                @if (solve.dnf) {
                  <span class="penalty-badge dnf">DNF</span>
                }
                @if (solve.plus2) {
                  <span class="penalty-badge plus2">+2</span>
                }
              </div>
              <div class="solve-scramble">{{ solve.scramble || '-' }}</div>
              <div class="solve-date">{{ formatDate(solve.startTime) }}</div>
              <button class="btn-delete" (click)="deleteSolve(solve.id)">×</button>
            </div>
          }
        }
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
      flex-wrap: wrap;
      gap: 12px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .history-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .session-select {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 14px;
    }

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #e9ecef;
      color: #333;
    }

    .btn-secondary:hover {
      background: #dee2e6;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    .filter-btn {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 14px;
    }

    .solves-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .solve-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .solve-item:last-child {
      border-bottom: none;
    }

    .solve-item.dnf {
      background: #ffebee;
    }

    .solve-item.plus2 {
      background: #fff3e0;
    }

    .solve-time {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 600;
      color: #333;
      min-width: 100px;
    }

    .penalty-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 4px;
    }

    .penalty-badge.dnf {
      background: #f44336;
      color: white;
    }

    .penalty-badge.plus2 {
      background: #ff9800;
      color: white;
    }

    .solve-scramble {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .solve-date {
      font-size: 12px;
      color: #999;
    }

    .btn-delete {
      background: none;
      border: none;
      color: #999;
      font-size: 20px;
      cursor: pointer;
      padding: 0 8px;
    }

    .btn-delete:hover {
      color: #f44336;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #999;
    }
  `]
})
export class HistoryComponent implements OnInit {
  private state = inject(StateService);
  private store = inject(LocalSolveStoreService);

  selectedSessionId: WritableSignal<number | 'all'> = signal<number | 'all'>('all');
  solves: Signal<Solve[]> = computed(() => {
    const selected = this.selectedSessionId();
    const all = this.state.solves();
    const filtered =
      selected === 'all' ? all : all.filter((s) => (s.sessionId ?? 1) === selected);
    return sortSolvesByMetric(filtered, 'timestamp');
  });
  sessions: WritableSignal<Session[]> = signal<Session[]>([]);

  private translations: Record<string, string> = {
    solveHistory: 'Solve History',
    newSession: 'New',
    export: 'Export',
    noData: 'No solves recorded yet'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  formatTime(ms: number): string {
    if (!ms) return '--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  ngOnInit(): void {
    void this.bootstrapHistory();
  }

  /** Ensures IDB hydration/migration before reading solves (not only via APP_INITIALIZER). */
  private async bootstrapHistory(): Promise<void> {
    await this.store.init();
    this.state.solves.set(this.store.getSolves());
    this.sessions.set(this.store.getSessions());
  }

  async loadSolves(): Promise<void> {
    await this.store.init();
    this.state.solves.set(this.store.getSolves());
  }

  async loadSessions(): Promise<void> {
    this.sessions.set(this.store.getSessions());
  }

  onSessionChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === 'all') {
      this.selectedSessionId.set('all');
      return;
    }
    const sessionId = parseInt(raw, 10);
    this.selectedSessionId.set(Number.isNaN(sessionId) ? 'all' : sessionId);
  }

  async createNewSession(): Promise<void> {
    const session = this.store.createSession();
    this.sessions.update(s => [...s, session]);
  }

  async exportData(): Promise<void> {
    await this.store.init();
    const data = this.store.exportCsv();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cubestats_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async deleteSolve(solveId?: number): Promise<void> {
    if (!solveId) return;
    await this.store.deleteSolve(solveId);
    await this.loadSolves();
  }
}
