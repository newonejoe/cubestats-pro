import { Component, inject, OnInit, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, Solve, Session } from '../../services/state.service';
import { ApiService } from '../../services/api.service';

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
  private api = inject(ApiService);

  solves: Signal<Solve[]> = computed(() => this.state.solves());
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
    this.loadSolves();
    this.loadSessions();
  }

  async loadSolves(): Promise<void> {
    const solves = await this.api.getSolves();
    this.state.solves.set(solves);
  }

  async loadSessions(): Promise<void> {
    const sessions = await this.api.getSessions();
    this.sessions.set(sessions);
  }

  onSessionChange(event: Event): void {
    const sessionId = parseInt((event.target as HTMLSelectElement).value);
  }

  async createNewSession(): Promise<void> {
    const session = await this.api.createSession();
    this.sessions.update(s => [...s, session]);
  }

  async exportData(): Promise<void> {
    const data = await this.api.exportData();
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
    await this.api.deleteSolve(solveId);
    this.loadSolves();
  }
}
