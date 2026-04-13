import { Component, inject, computed, input, type Signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, type Solve } from '../../services/state.service';
import { TimerService } from '../../services/timer.service';
import { StatisticsService } from '../../services/statistics.service';
import { parseMoveTrace } from '../../lib/cstimer-storage';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-multiphase-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="multiphase">
      <!-- Last solve summary -->
      <div class="section active-timer" [class.solving]="isSolving()" [class.inspecting]="isInspecting()">
        @if (isInspecting() && inspectionTimeLeft() > 0) {
          <!-- Inspection countdown display -->
          <div class="inspection-countdown" [style.color]="inspectionColor()">
            {{ inspectionTimeLeft() }}
          </div>
        } @else if (isReady()) {
          <!-- GO! indicator -->
          <div class="go-indicator" [style.color]="inspectionColor()">GO!</div>
        } @else if (isSolving()) {
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
          <span class="avg-label">{{ t('bestStat') }}</span>
          <span class="avg-value best">{{ formatStat(sessionStats().best) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao5') }}</span>
          <span class="avg-value">{{ formatStat(sessionStats().ao5) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao12') }}</span>
          <span class="avg-value">{{ formatStat(sessionStats().ao12) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('ao100') }}</span>
          <span class="avg-value">{{ formatStat(sessionStats().ao100) }}</span>
        </div>
        <div class="avg-row">
          <span class="avg-label">{{ t('mean') }}</span>
          <span class="avg-value">{{ formatStat(sessionStats().mean) }}</span>
        </div>
      </div>

      <!-- Solve count -->
      <div class="section count-section">
        <span class="count-label">{{ sessionStats().solveCount }}/{{ sessionStats().dnfCount }} {{ t('dnf') }}</span>
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
      color: var(--text-primary);
    }

    .section {
      padding: 10px 12px;
      background: var(--card-bg);
      border-radius: 8px;
      backdrop-filter: blur(4px);
    }

    .active-timer { text-align: center; }
    .active-timer.solving .last-time { color: var(--success-color); }
    .active-timer.inspecting .last-time { color: var(--warning-color); }

    .last-time {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }
    .last-time.dnf { color: var(--danger-color); }
    .last-time.muted { color: var(--text-muted); }

    .inspection-countdown {
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
    }

    .go-indicator {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.2;
    }

    .recons-line {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-secondary);
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
      color: var(--text-secondary);
      font-size: 12px;
      text-transform: lowercase;
    }

    .avg-value {
      font-weight: 600;
      font-size: 14px;
    }
    .avg-value.best { color: var(--success-color); }

    .count-section {
      text-align: center;
    }
    .count-label {
      font-size: 11px;
      color: var(--text-secondary);
    }
    .timer-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 72px;
      font-weight: 700;
      color: var(--text-primary);
      text-shadow: 0 2px 12px rgba(255,255,255,0.8);
      transition: color 0.2s;
      user-select: none;
    }
    .timer-value.running { color: var(--success-color); }
    .timer-value.inspection { color: var(--warning-color); }

    /* Mobile responsive */
    @media (max-width: 600px) {
      .timer-value {
        font-size: 48px;
      }
    }
    @media (max-width: 400px) {
      .timer-value {
        font-size: 36px;
      }
    }
  `]
})
export class MultiphaseDisplayComponent {
  private state = inject(StateService);
  private timerService = inject(TimerService);
  private stats = inject(StatisticsService);
  private i18n = inject(I18nService);

  // Inspection time left - reads from state.service signal
  // Updated by timer.service's inspection interval (100ms)
  inspectionTimeLeft = (): number => this.state.inspectionTimeLeft();

  // Computed inspection color based on remaining time
  readonly inspectionColor: Signal<string> = computed(() => {
    const left = this.state.inspectionTimeLeft();
    const status = this.state.status();

    if (status === 'ready') {
      return 'var(--success-color)';
    }
    if (status !== 'inspecting' || left === 0) {
      return '';
    }

    // Color logic: >8s yellow, >3s orange, ≤3s red
    if (left > 8) return 'var(--inspection-yellow)';
    if (left > 3) return 'var(--inspection-orange)';
    return 'var(--inspection-red)';
  });

  readonly sessionId = input<number | 'all'>('all');

  t(key: string): string {
    return this.i18n.t(key);
  }

  private readonly sessionSolves = computed(() => {
    return this.stats.solvesBySession(this.sessionId());
  });

  readonly sessionStats = computed(() => this.stats.sessionStats(this.sessionId()));

  isSolving: Signal<boolean> = computed(() => this.state.isSolving());
  isInspecting: Signal<boolean> = computed(() => this.state.isInspecting());
  isReady: Signal<boolean> = computed(() => this.state.isReady());

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
