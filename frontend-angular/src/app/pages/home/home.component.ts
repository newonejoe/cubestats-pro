import { Component, OnInit, inject, signal, computed, type WritableSignal, type Signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { HeaderComponent } from '../../components/header/header.component';
import { SessionSelectorComponent } from '../../components/session-selector/session-selector.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { MacModalComponent } from '../../components/mac-modal/mac-modal.component';
import { SolvedStateModalComponent } from '../../components/solved-state-modal/solved-state-modal.component';
import { BluetoothManagerComponent } from '../../components/bluetooth-manager/bluetooth-manager.component';
import { AnalysisSessionStatisticsComponent } from '../../components/analysis/analysis-session-statistics.component';
import { AnalysisSolveModalComponent } from '../../components/analysis/analysis-solve-modal.component';
import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';
import { KeyboardMappingComponent } from '../../components/keyboard-mapping/keyboard-mapping';
import { AppModalComponent } from '../../components/shared/app-modal.component';

import { StateService, type Solve } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import { BluetoothService } from '../../services/bluetooth.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { StatisticsService } from '../../services/statistics.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HeaderComponent,
    SessionSelectorComponent,
    TimerComponent,
    MacModalComponent,
    SolvedStateModalComponent,
    BluetoothManagerComponent,
    AnalysisSessionStatisticsComponent,
    AnalysisSolveModalComponent,
    SettingsModalComponent,
    KeyboardMappingComponent,
    AppModalComponent,
  ],
  template: `
    <!-- Bluetooth Connection Modal -->
    <div class="bt-modal-overlay" [class.hidden]="cubeConnected()">
      <div class="bt-modal">
        <app-bluetooth-manager></app-bluetooth-manager>
      </div>
    </div>

    <div class="layout" [class.blurred]="!cubeConnected()">
      @if (cubeConnected()) {
        <!-- Left sidebar: session stats + solve list -->
        <aside class="sidebar">
          <app-header (openSettings)="openSettings()" (openKeyboardMapping)="showKeyboardMappingVisible = true"></app-header>
          <app-session-selector></app-session-selector>
          <app-analysis-session-statistics
            mode="compact"
            [sessionId]="currentSessionId()"
            (solveOpen)="openSolveModal($event)"
          />
        </aside>

        <!-- Center: timer stage (cube bg + scramble/timer overlay) -->
        <main class="center">
          <app-timer [sessionId]="currentSessionId()"></app-timer>
        </main>
      }
    </div>

    @if (cubeConnected()) {
      <app-settings-modal [(isVisible)]="showSettingsVisible"></app-settings-modal>
      <app-modal
        [isVisible]="showKeyboardMappingVisible"
        title="Keyboard Mapping"
        maxWidth="500px"
        (closed)="showKeyboardMappingVisible = false">
        <app-keyboard-mapping></app-keyboard-mapping>
      </app-modal>
    }

    <div class="toast" [class.visible]="toastMessage()">
      <span>{{ toastMessage() }}</span>
    </div>

    <app-mac-modal></app-mac-modal>
    <app-solved-state-modal></app-solved-state-modal>

    @if (modalSolve(); as sol) {
      <app-analysis-solve-modal
        [solve]="sol"
        [caseStatScope]="sessionSolves()"
        [contextSessionId]="currentSessionIdNum()"
        (closed)="closeSolveModal()"
        (deleted)="closeSolveModal()"
      />
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--background);
    }

    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      grid-template-rows: 1fr;
      width: 100%;
      height: calc(100vh - 56px);
      transition: background-color 0.3s;
    }

    /* Left sidebar */
    .sidebar {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh);
      position: sticky;
      top: 68px;
      overflow-y: auto;
    }

    .sidebar app-header {
      flex-shrink: 0;
    }

    /* Center stage */
    .center {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--text-primary);
      color: var(--card-bg);
      padding: 12px 24px;
      border-radius: 8px;
      opacity: 0;
      transition: all 0.3s;
      z-index: 1001;
    }
    .toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Bluetooth connection overlay */
    .bt-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      transition: opacity 0.3s ease;
    }
    .bt-modal-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .bt-modal {
      background: var(--card-bg);
      border-radius: 20px;
      padding: 32px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .layout.blurred {
      filter: blur(10px);
      pointer-events: none;
      opacity: 0.3;
    }

    /* Responsive: collapse to 2-col on smaller screens */
    @media (max-width: 1200px) {
      .layout {
        grid-template-columns: 240px 1fr;
      }
      .right-panel {
        display: none;
      }
    }
    @media (max-width: 800px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .sidebar {
        display: none;
      }
    }

    /* Landscape mobile: reduce sidebar further */
    @media (orientation: landscape) and (max-height: 450px) {
      .layout {
        grid-template-columns: 180px 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private state = inject(StateService);
  private cube = inject(CubeService);
  private localStore = inject(LocalSolveStoreService);
  private stats = inject(StatisticsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  showSettingsVisible = false;
  showKeyboardMappingVisible = false;
  toastMessage: WritableSignal<string> = signal<string>('');

  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());

  readonly currentSessionId = computed((): number | 'all' => {
    const session = this.state.currentSession();
    return session?.id ?? 'all';
  });

  readonly currentSessionIdNum = computed((): number | undefined => {
    const session = this.state.currentSession();
    return session?.id;
  });

  readonly sessionSolves = computed(() => {
    this.localStore.storeRevision();
    return this.localStore.getSolves().filter(s => {
      const sid = this.currentSessionId();
      if (sid === 'all') return true;
      return s.sessionId === sid;
    });
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

  readonly modalSolve = signal<Solve | null>(null);

  ngOnInit(): void {
    this.state.solves.set(this.localStore.getSolves());

    const q = this.route.snapshot.queryParamMap;
    const launchScramble = q.get('launchScramble');
    const launchSession = q.get('launchSession');
    const launchType = q.get('launchType');
    if (
      launchType &&
      (launchType === 'wca' || launchType === 'cross' || launchType === 'f2l' || launchType === 'oll' || launchType === 'pll')
    ) {
      this.state.scrambleType.set(launchType);
    }
    if (launchSession) {
      const sid = Number.parseInt(launchSession, 10);
      const sess = this.localStore.getSessions().find((s) => s.id === sid);
      if (sess) {
        this.state.currentSession.set(sess);
      }
    }
    if (launchScramble) {
      this.cube.applySavedScramble(launchScramble);
    }
    if (launchScramble || launchSession || launchType) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { launchScramble: null, launchSession: null, launchType: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  openSolveModal(solve: Solve): void {
    this.modalSolve.set(solve);
  }

  closeSolveModal(): void {
    this.modalSolve.set(null);
  }

  openSettings(): void {
    this.showSettingsVisible = true;
  }
}
