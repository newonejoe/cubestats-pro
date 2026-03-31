import { Component, inject, OnInit, HostListener, signal, computed, type WritableSignal, type Signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, type Solve } from '../../services/state.service';
import { TimerService } from '../../services/timer.service';
import { CubeService } from '../../services/cube.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { ScrambleDisplayComponent } from './scramble-display.component';
import { VirtualCubeComponent } from '../virtual-cube/virtual-cube.component';
import { MultiphaseDisplayComponent } from './multiphase-display.component';
import { CfopReconstructionComponent } from '../shared/cfop-reconstruction.component';
import { AppEmptyStateComponent } from '../shared/app-empty-state.component';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, ScrambleDisplayComponent, VirtualCubeComponent, MultiphaseDisplayComponent, CfopReconstructionComponent, AppEmptyStateComponent],
  template: `
    <div class="timer-stage">
      <!-- Virtual cube fills the entire background -->
      <div class="cube-bg">
        <app-virtual-cube></app-virtual-cube>
      </div>

      <!-- Floating overlay: scramble at top -->
      <div class="overlay">
        <div class="scramble-bar">
          <app-scramble-display></app-scramble-display>
        </div>
      </div>

      <!-- Right panel: multiphase stats + CFOP recon -->
      <div class="right-panel">
        <app-multiphase-display [sessionId]="sessionId()" />

        <div class="recon-section">
          @if (lastSolve(); as sol) {
            <app-cfop-reconstruction [solve]="sol" [caseStatScope]="sessionSolves()" />
          } @else {
            <app-empty-state icon="🎯" message="No solve data yet"></app-empty-state>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .timer-stage {
      position: relative;
      min-height: 480px;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
    }

    .cube-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cube-bg ::ng-deep .cube-container {
      width: 100%;
      height: 100%;
      padding: 0;
    }
    .cube-bg ::ng-deep canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .overlay {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      min-height: 480px;
      pointer-events: none;
      flex: 1;
    }

    .scramble-bar {
      padding: 16px 16px 0;
      pointer-events: auto;
      background: linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.7) 70%, transparent 100%);
    }

    .right-panel {
      position: relative;
      z-index: 1;
      width: 320px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      max-height: 100%;
      overflow-y: auto;
    }
    .right-panel > * {
      pointer-events: auto;
    }

    .recon-section {
      background: #fff;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      flex: 1;
      overflow-y: auto;
    }

    .timer-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }

    .inspection-timer {
      font-size: 22px;
      color: #ff9800;
      height: 28px;
      opacity: 0;
      transition: opacity 0.2s;
      text-shadow: 0 1px 6px rgba(0,0,0,0.15);
    }
    .inspection-timer.visible { opacity: 1; }

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
export class TimerComponent implements OnInit {
  private state = inject(StateService);
  private timerService = inject(TimerService);
  private cubeService = inject(CubeService);
  private localStore = inject(LocalSolveStoreService);

  readonly sessionId = input<number | 'all'>('all');

  readonly sessionSolves = computed(() => {
    this.localStore.storeRevision();
    const sid = this.sessionId();
    return this.localStore.getSolves().filter(s => sid === 'all' || s.sessionId === sid);
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

  scramble: Signal<string> = computed(() => this.state.scramble());
  isSolving: Signal<boolean> = computed(() => this.state.isSolving());
  isInspecting: Signal<boolean> = computed(() => this.state.isInspecting());
  status: Signal<string> = computed(() => this.state.status());

  inspectionTimeLeft: WritableSignal<string> = signal<string>('');
  showPenaltyBtns: WritableSignal<boolean> = signal<boolean>(false);

  formattedTime: Signal<string> = computed(() => {
    const time = this.state.timer();
    return this.timerService.formatTime(time);
  });

  ngOnInit(): void {
    this.cubeService.generateScramble();

    setInterval(() => {
      const status = this.state.status();
      switch (status) {
        case 'twisting':
          this.inspectionTimeLeft.set('Twist to match scramble');
          this.showPenaltyBtns.set(false);
          break;
        case 'twisted':
          this.inspectionTimeLeft.set('Matched! Get ready...');
          this.showPenaltyBtns.set(false);
          break;
        case 'inspecting':
          if (this.state.inspectionInterval) {
            const elapsed = Math.floor((Date.now() - this.timerService.inspectionStartTime) / 1000);
            const left = Math.max(0, this.state.inspectionTime() - elapsed);
            this.inspectionTimeLeft.set('Inspection: ' + left);
          }
          break;
        case 'ready':
          this.inspectionTimeLeft.set('GO!');
          this.showPenaltyBtns.set(false);
          break;
        case 'solving':
          this.inspectionTimeLeft.set('');
          this.showPenaltyBtns.set(true);
          break;
        case 'idle':
        default:
          this.showPenaltyBtns.set(false);
          this.inspectionTimeLeft.set('');
          break;
      }
    }, 100);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    this.timerService.handleKeyDown(event);
  }

  applyPenalty(penalty: string): void {
    this.timerService.applyPenalty(penalty);
  }
}
