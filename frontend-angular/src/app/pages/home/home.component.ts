import { Component, OnInit, inject, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { HeaderComponent } from '../../components/header/header.component';
import { TimerComponent } from '../../components/timer/timer.component';
import { StatisticsComponent } from '../../components/statistics/statistics.component';
import { HistoryComponent } from '../../components/history/history.component';
import { MacModalComponent } from '../../components/mac-modal/mac-modal.component';
import { SolvedStateModalComponent } from '../../components/solved-state-modal/solved-state-modal.component';
import { VirtualCubeComponent } from '../../components/virtual-cube/virtual-cube.component';
import { BluetoothManagerComponent } from '../../components/bluetooth-manager/bluetooth-manager.component';

import { StateService } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import { BluetoothService } from '../../services/bluetooth.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';

import { AppCardComponent } from '../../components/shared/app-card.component';
import { AppEmptyStateComponent } from '../../components/shared/app-empty-state.component';

import { SettingsModalComponent } from '../../components/settings-modal/settings-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    TimerComponent,
    StatisticsComponent,
    HistoryComponent,
    MacModalComponent,
    SolvedStateModalComponent,
    VirtualCubeComponent,
    BluetoothManagerComponent,
    AppCardComponent,
    AppEmptyStateComponent,
    SettingsModalComponent
  ],
  template: `
    <!-- Bluetooth Connection Modal (always on top until connected) -->
    <div class="bt-modal-overlay" [class.hidden]="cubeConnected()">
      <div class="bt-modal">
        <app-bluetooth-manager></app-bluetooth-manager>
      </div>
    </div>

    <!-- Main App Content (only when connected) -->
    @if (cubeConnected()) {
      <app-header></app-header>
    }

    <main class="app-container" [class.blurred]="!cubeConnected()">
      @if (cubeConnected()) {
      <!-- Timer Section -->
      <div class="timer-section">
        <div class="card">
          <app-timer></app-timer>
        </div>

        <app-statistics></app-statistics>
      </div>

      <!-- Analysis Section -->
      <div class="analysis-section">
        <!-- Virtual Cube -->
        <app-card [title]="t('virtualCube')">
          <app-virtual-cube></app-virtual-cube>
        </app-card>

        <div class="card">
          <div class="card-header">
            <span class="card-title">{{ t('cfopAnalysis') }}</span>
          </div>
          <div id="analysisContent">
            <div class="no-data">
              <div class="no-data-icon">📊</div>
              <p>{{ t('noData') }}</p>
            </div>
          </div>
        </div>

        <!-- Last Solve Details Placeholder -->
        <app-card [title]="t('lastSolveDetails')">
          <div id="lastSolveDetails">
            <app-empty-state icon="🎯" message="No solve data yet"></app-empty-state>
          </div>
        </app-card>
      </div>

      <!-- History Section -->
      <div class="history-section">
        <app-history></app-history>
      </div>
      }
    </main>

    <!-- Settings Modal (only when connected) -->
    @if (cubeConnected()) {
      <app-settings-modal [(isVisible)]="showSettingsVisible"></app-settings-modal>
    }

    <!-- Toast -->
    <div class="toast" [class.visible]="toastMessage()">
      <span>{{ toastMessage() }}</span>
    </div>

    <!-- MAC Address Modal -->
    <app-mac-modal></app-mac-modal>
    <app-solved-state-modal></app-solved-state-modal>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f5f7fa;
    }

    .app-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .timer-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .analysis-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .history-section {
      grid-column: 1 / -1;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      display: inline-flex;
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

    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #333;
      color: white;
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

    .bluetooth-controls {
      width: 100%;
    }

    /* Bluetooth Modal Overlay */
    .bt-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
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
      background: #fff;
      border-radius: 20px;
      padding: 32px;
      width: 90%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    /* Blur background when not connected */
    .app-container.blurred {
      filter: blur(10px);
      pointer-events: none;
      opacity: 0.3;
    }
  `]
})
export class HomeComponent implements OnInit {
  private state = inject(StateService);
  private cube = inject(CubeService);
  private bluetooth = inject(BluetoothService);
  private localStore = inject(LocalSolveStoreService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  showSettingsVisible = false;

  toastMessage: WritableSignal<string> = signal<string>('');

  inspectionTime: Signal<number> = computed(() => this.state.settings().inspectionTime);
  soundEnabled: Signal<boolean> = computed(() => this.state.settings().sound);
  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());

  private translations: Record<string, string> = {
    bluetoothCube: 'Bluetooth Cube',
    scanForCubes: 'Scan for Cubes',
    cfopAnalysis: 'CFOP Analysis',
    lastSolveDetails: 'Last Solve Details',
    virtualCube: 'Virtual Cube',
    settings: 'Settings',
    inspectionSec: 'Inspection Time (seconds)',
    timerSound: 'Timer Sound',
    save: 'Save',
    clearAllData: 'Clear All Data',
    noData: 'No data yet'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  ngOnInit(): void {
    const sessions = this.localStore.getSessions();
    if (sessions.length > 0) {
      this.state.currentSession.set(sessions[0]!);
    }
    this.state.solves.set(this.localStore.getSolves());

    const q = this.route.snapshot.queryParamMap;
    const launchScramble = q.get('launchScramble');
    const launchSession = q.get('launchSession');
    const launchType = q.get('launchType');
    if (
      launchType &&
      (launchType === 'wca' ||
        launchType === 'cross' ||
        launchType === 'f2l' ||
        launchType === 'oll' ||
        launchType === 'pll')
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
        queryParams: {
          launchScramble: null,
          launchSession: null,
          launchType: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    window.addEventListener('openSettings', () => {
      this.showSettingsVisible = true;
    });
  }

  async scanForCubes(): Promise<void> {
    const device = await this.bluetooth.scan();
    if (device) {
      await this.bluetooth.connect(device);
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 3000);
  }
}
