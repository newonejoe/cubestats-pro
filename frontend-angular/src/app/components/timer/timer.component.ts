import { Component, inject, OnInit, HostListener, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { TimerService } from '../../services/timer.service';
import { CubeService } from '../../services/cube.service';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer-display">
      <div class="scramble-controls-row">
        <div class="scramble-display">
          <div class="scramble-label">{{ t('scramble') }}</div>
          <div class="scramble-text">{{ scramble() }}</div>
        </div>
        <div class="scramble-dropdown-container">
          <select class="scramble-type-select" [value]="scrambleType()" (change)="onScrambleTypeChange($event)">
            <option value="wca">WCA</option>
            <option value="cross">Cross</option>
            <option value="f2l">F2L</option>
            <option value="oll">OLL</option>
            <option value="pll">PLL</option>
          </select>
          @if (scrambleType() === 'wca') {
            <div class="scramble-options">
              <button
                class="scramble-option"
                [class.active]="scrambleLength() === 20"
                (click)="setScrambleLength(20)">20</button>
              <button
                class="scramble-option"
                [class.active]="scrambleLength() === 25"
                (click)="setScrambleLength(25)">25</button>
              <button
                class="scramble-option"
                [class.active]="scrambleLength() === 30"
                (click)="setScrambleLength(30)">30</button>
            </div>
          }
        </div>
      </div>

      <div class="inspection-timer" [class.visible]="isInspecting()">
        {{ inspectionTimeLeft() }}
      </div>

      <div class="timer" [class.running]="isSolving()" [class.inspection]="isInspecting()">
        {{ formattedTime() }}
      </div>

      <div class="penalty-btns" [class.visible]="showPenaltyBtns()">
        <button class="btn btn-danger" (click)="applyPenalty('DNF')">DNF</button>
        <button class="btn btn-secondary" (click)="applyPenalty('+2')">+2</button>
      </div>
    </div>

    <div class="controls">
      <button class="btn btn-primary" (click)="onStartClick()">
        <span>▶</span> {{ t('start') }}
      </button>
      <button class="btn btn-secondary" (click)="generateNewScramble()">
        <span>🔄</span> {{ t('newScramble') }}
      </button>
      <button class="btn btn-secondary" (click)="openSettings()">
        <span>⚙</span> {{ t('settings') }}
      </button>
    </div>

    <div class="keyboard-hint">
      {{ t('pressSpace') }} <kbd>Space</kbd> {{ t('pressSpace2') }} · <kbd>Enter</kbd> {{ t('pressEnter') }}
    </div>
  `,
  styles: [`
    .timer-display {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }

    .scramble-controls-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
    }

    .scramble-display {
      text-align: left;
      flex: 1;
    }

    .scramble-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .scramble-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: #333;
      word-break: break-all;
    }

    .scramble-dropdown-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .scramble-type-select {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .scramble-options {
      display: flex;
      gap: 4px;
    }

    .scramble-option {
      padding: 4px 10px;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .scramble-option.active,
    .scramble-option:hover {
      background: #007bff;
      color: #fff;
      border-color: #007bff;
    }

    .inspection-timer {
      font-size: 24px;
      color: #ff9800;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .inspection-timer.visible {
      opacity: 1;
    }

    .timer {
      font-family: 'JetBrains Mono', monospace;
      font-size: 72px;
      font-weight: 700;
      color: #333;
      margin: 16px 0;
      transition: color 0.2s;
    }

    .timer.running {
      color: #4caf50;
    }

    .timer.inspection {
      color: #ff9800;
    }

    .penalty-btns {
      display: none;
      justify-content: center;
      gap: 12px;
      margin-top: 16px;
    }

    .penalty-btns.visible {
      display: flex;
    }

    .controls {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #e9ecef;
      color: #333;
    }

    .btn-secondary:hover {
      background: #dee2e6;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .keyboard-hint {
      margin-top: 16px;
      font-size: 14px;
      color: #666;
      text-align: center;
    }

    kbd {
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
  `]
})
export class TimerComponent implements OnInit {
  private state = inject(StateService);
  private timerService = inject(TimerService);
  private cubeService = inject(CubeService);

  // Computed values
  scramble: Signal<string> = computed(() => this.state.scramble());
  scrambleType: Signal<string> = computed(() => this.state.scrambleType());
  scrambleLength: Signal<number> = computed(() => this.state.scrambleLength());
  isSolving: Signal<boolean> = computed(() => this.state.isSolving());
  isInspecting: Signal<boolean> = computed(() => this.state.isInspecting());
  status: Signal<string> = computed(() => this.state.status());

  inspectionTimeLeft: WritableSignal<string> = signal<string>('');
  showPenaltyBtns: WritableSignal<boolean> = signal<boolean>(false);

  formattedTime: Signal<string> = computed(() => {
    const time = this.state.timer();
    return this.timerService.formatTime(time);
  });

  private translations: Record<string, string> = {
    scramble: 'Scramble',
    start: 'Start',
    newScramble: 'New Scramble',
    settings: 'Settings',
    pressSpace: 'Press',
    pressSpace2: 'to start/stop',
    pressEnter: 'for new scramble'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  ngOnInit(): void {
    this.cubeService.generateScramble();

    const checkStatus = setInterval(() => {
      if (this.state.status() === 'inspection') {
        if (this.state.inspectionInterval) {
          const elapsed = Math.floor((Date.now() - this.timerService.inspectionStartTime) / 1000);
          const left = Math.max(0, this.state.inspectionTime() - elapsed);
          this.inspectionTimeLeft.set('Inspection: ' + left);
        }
      } else if (this.state.status() === 'idle') {
        this.showPenaltyBtns.set(false);
        this.inspectionTimeLeft.set('');
      } else if (this.state.status() === 'ready') {
        this.inspectionTimeLeft.set('GO!');
      } else if (this.state.status() === 'solving') {
        this.inspectionTimeLeft.set('');
        this.showPenaltyBtns.set(true);
      }
    }, 100);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    this.timerService.handleKeyDown(event);
  }

  onStartClick(): void {
    this.timerService.startSolve();
  }

  generateNewScramble(): void {
    this.cubeService.generateScramble();
  }

  onScrambleTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.state.scrambleType.set(value);
    this.cubeService.generateScramble();
  }

  setScrambleLength(length: number): void {
    this.state.scrambleLength.set(length);
    this.cubeService.generateScramble();
  }

  applyPenalty(penalty: string): void {
    this.timerService.applyPenalty(penalty);
  }

  openSettings(): void {
    window.dispatchEvent(new CustomEvent('openSettings'));
  }
}
