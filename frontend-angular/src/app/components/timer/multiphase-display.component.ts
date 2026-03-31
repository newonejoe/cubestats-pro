import { Component, inject, computed, input, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, type Solve } from '../../services/state.service';
import { TimerService } from '../../services/timer.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { computeSessionStats, type SessionStats } from '../../lib/analysis-selectors';
import { parseMoveTrace } from '../../lib/cstimer-storage';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-multiphase-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="multiphase">
      <!-- Last solve summary -->
      <div class="section active-timer" [class.solving]="isSolving()" [class.inspecting]="isInspecting()">
        @if (isSolving() || isInspecting()) {
          <div class="last-time">
            {{ formattedTime() }}
          </div>
        }
        @else if (lastSolve(); as sol) {
          <div class="last-time" [class.dnf]="sol.dnf">
            {{ sol.dnf ? t('dnf') : formatMs(sol.finalTime ?? sol.time) }}
          </div>
          @if (lastSolveMoveCnt() > 0) {
            <div class="recons-line">
              <span class="metric">{{ lastSolveMoveCnt() }} {{ t('turns') }}</span>
              <span class="metric">{{ lastSolveTps() }} {{ t('tps') }}</span>
            </div>
          }
        } @else {
          <div class="last-time muted">--:--</div>
        }
      </div>

      <!-- Session averages -->
      <div class="section avg-section">
        <div class="avg-row">
          <span class="avg-label">{{ t('cur') }}</span>
          <span class="avg-value">{{ formatStat(stats().current) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('bestStat') }}</span>
          <span class="avg-value best">{{ formatStat(stats().best) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao5') }}</span>
          <span class="avg-value">{{ formatStat(stats().ao5) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao12') }}</span>
          <span class="avg-value">{{ formatStat(stats().ao12) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao100') }}</span>
          <span class="avg-value">{{ formatStat(stats().ao100) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('mean') }}</span>
          <span class="avg-value">{{ formatStat(stats().mean) }}</span>
        </div>
      </div>

      <!-- Solve count -->
      <div class="section count-section">
        <span class="count-label">{{ stats().solveCount }}/{{ stats().dnfCount }} {{ t('dnf') }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .multiphase {
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #333;
    }

    .section {
      padding: 10px 12px;
      background: rgba(255,255,255,0.85);
      border-radius: 8px;
      backdrop-filter: blur(4px);
    }

    .active-timer { text-align: center; }
    .active-timer.solving .last-time { color: #4caf50; }
    .active-timer.inspecting .last-time { color: #ff9800; }

    .last-time {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    .last-time.dnf { color: #dc3545; }
    .last-time.muted { color: #adb5bd; }

    .recons-line {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 4px;
      font-size: 12px;
      color: #495057;
    }

    .avg-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .avg-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1.6;
    }

    .avg-label {
      color: #6c757d;
      font-size: 12px;
      text-transform: lowercase;
    }

    .avg-value {
      font-weight: 600;
      font-size: 14px;
    }
    .avg-value.best { color: #28a745; }

    .count-section {
      text-align: center;
    }
    .count-label {
      font-size: 11px;
      color: #6c757d;
    }
    .timer-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 72px;
      font-weight: 700;
      color: #222;
      text-shadow: 0 2px 12px rgba(255,255,255,0.8);
      transition: color 0.2s;
      user-select: none;
    }
    .timer-value.running { color: #4caf50; }
    .timer-value.inspection { color: #ff9800; }
  `]
})
export class MultiphaseDisplayComponent {
  private state = inject(StateService);
  private timerService = inject(TimerService);
  private localStore = inject(LocalSolveStoreService);
  private i18n = inject(I18nService);

  readonly sessionId = input<number | 'all'>('all');

  t(key: string): string {
    return this.i18n.t(key);
  }

  private readonly sessionSolves: Signal<Solve[]> = computed(() => {
    this.localStore.storeRevision();
    const sid = this.sessionId();
    return this.localStore.getSolves().filter(s => sid === 'all' || s.sessionId === sid);
  });

  readonly stats: Signal<SessionStats> = computed(() => computeSessionStats(this.sessionSolves()));

  isSolving: Signal<boolean> = computed(() => this.state.isSolving());
  isInspecting: Signal<boolean> = computed(() => this.state.isInspecting());

  formattedTime: Signal<string> = computed(() => {
    const time = this.state.timer();
    return this.timerService.formatTime(time);
  });

  readonly lastSolve = computed<Solve | null>(() => {
    const solves = this.sessionSolves();
    if (solves.length === 0) return null;
    return solves.reduce((latest, s) => {
      const la = latest.endTime ?? '';
      const sa = s.endTime ?? '';
      return sa > la ? s : latest;
    });
  });

  readonly lastSolveMoveCnt = computed(() => {
    const sol = this.lastSolve();
    if (!sol) return 0;
    const parsed = parseMoveTrace(sol.moveTrace);
    if (parsed.length > 0) return parsed.length;
    return sol.moveCount ?? 0;
  });

  readonly lastSolveTps = computed(() => {
    const sol = this.lastSolve();
    if (!sol) return '—';
    const cnt = this.lastSolveMoveCnt();
    if (cnt <= 0) return '—';
    const ms = sol.finalTime ?? sol.time;
    if (!ms || ms <= 0) return '—';
    return (cnt / (ms / 1000)).toFixed(2);
  });

  formatMs(ms: number | null | undefined): string {
    if (ms == null || ms <= 0) return '--:--';
    return this.timerService.formatTime(ms);
  }

  formatStat(val: number | null | undefined): string {
    if (val == null) return '—';
    return this.timerService.formatTime(val);
  }
}
