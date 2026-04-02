import { Component, inject, OnInit, signal, computed, type WritableSignal, type Signal, input, ChangeDetectionStrategy, HostListener } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  },
  imports: [CommonModule, ScrambleDisplayComponent, VirtualCubeComponent, MultiphaseDisplayComponent, CfopReconstructionComponent, AppEmptyStateComponent],
  template: `
    <div class="timer-stage">
      <!-- Virtual cube fills the entire background -->
      <div class="cube-bg">
        <app-virtual-cube></app-virtual-cube>
      </div>

      <!-- Floating overlay -->
      <div class="overlay">
        <div class="scramble-bar">
          <app-scramble-display></app-scramble-display>
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
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .timer-stage {
      position: relative;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
    }

    .cube-bg {
      position: absolute;
      top: 60px;
      left: 0;
      right: 300px;
      bottom: 0;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cube-bg ::ng-deep .cube-container {
      width: 100%;
      height: 100%;
      max-width: calc(100vh - 180px);
      max-height: calc(100% - 20px);
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
      height: 100%;
      pointer-events: none;
    }

    .scramble-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 16px 16px 8px;
      pointer-events: auto;
      background: linear-gradient(to bottom, var(--card-bg) 0%, transparent 100%);
      z-index: 10;
    }

    .right-panel {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      overflow-y: auto;
    }
    .right-panel > * {
      pointer-events: auto;
    }

    .recon-section {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      flex: 1;
      overflow-y: auto;
      color: var(--text-primary);
    }

    /* Mobile responsive */
    @media (max-width: 600px) {
      .scramble-bar {
        position: relative;
        padding: 8px 8px 0;
      }
      .cube-bg {
        top: 0;
        right: 0;
      }
      .right-panel {
        position: relative;
        top: auto;
        right: auto;
        width: 100%;
        max-height: 200px;
        padding: 8px;
      }
    }

    @media (max-width: 480px) {
      .right-panel {
        display: none;
      }
    }
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

  handleKeyDown(event: KeyboardEvent): void {
    this.timerService.handleKeyDown(event);
  }

  applyPenalty(penalty: string): void {
    this.timerService.applyPenalty(penalty);
  }
}
