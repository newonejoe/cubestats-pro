import { Component, OnInit, inject, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HeaderComponent } from './components/header/header.component';
import { TimerComponent } from './components/timer/timer.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { HistoryComponent } from './components/history/history.component';
import { MacModalComponent } from './components/mac-modal/mac-modal.component';
import { SolvedStateModalComponent } from './components/solved-state-modal/solved-state-modal.component';
import { VirtualCubeComponent } from './components/virtual-cube/virtual-cube.component';

import { StateService } from './services/state.service';
import { CubeService } from './services/cube.service';
import { BluetoothService } from './services/bluetooth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    TimerComponent,
    StatisticsComponent,
    HistoryComponent,
    MacModalComponent,
    SolvedStateModalComponent,
    VirtualCubeComponent
  ],
  template: `
    <app-header></app-header>

    <main class="app-container">
      <!-- Timer Section -->
      <div class="timer-section">
        <div class="card">
          <app-timer></app-timer>
        </div>

        <app-statistics></app-statistics>

        <div class="card">
          <div class="card-header">
            <span class="card-title">{{ t('bluetoothCube') }}</span>
          </div>
          <div class="bluetooth-controls">
            <button class="btn btn-secondary" (click)="scanForCubes()" style="width: 100%;">
              <span>📡</span> {{ t('scanForCubes') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Analysis Section -->
      <div class="analysis-section">
        <!-- Virtual Cube -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">{{ t('virtualCube') }}</span>
          </div>
          <app-virtual-cube></app-virtual-cube>
        </div>

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

        <div class="card">
          <div class="card-header">
            <span class="card-title">{{ t('lastSolveDetails') }}</span>
          </div>
          <div id="lastSolveDetails">
            <div class="no-data">
              <div class="no-data-icon">🎯</div>
              <p>No solve data yet</p>
            </div>
          </div>
        </div>
      </div>

      <!-- History Section -->
      <div class="history-section">
        <app-history></app-history>
      </div>
    </main>

    <!-- Settings Modal -->
    <div class="modal-overlay" [class.visible]="showSettings()" (click)="closeSettingsModal($event)">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-title">{{ t('settings') }}</span>
          <button class="modal-close" (click)="closeSettings()">&times;</button>
        </div>
        <div class="setting-group">
          <label class="setting-label">{{ t('inspectionSec') }}</label>
          <input type="number" class="setting-input" [value]="inspectionTime()" min="0" max="30"
                 (change)="onInspectionTimeChange($event)">
        </div>
        <div class="setting-group">
          <label class="setting-label">{{ t('timerSound') }}</label>
          <select class="setting-input" (change)="onSoundChange($event)">
            <option value="on" [selected]="soundEnabled()">On</option>
            <option value="off" [selected]="!soundEnabled()">Off</option>
          </select>
        </div>
        <button class="btn btn-primary" (click)="saveSettings()" style="width: 100%;">{{ t('save') }}</button>
        <button class="btn btn-danger" (click)="clearAllData()" style="width: 100%; margin-top: 12px;">{{ t('clearAllData') }}</button>
      </div>
    </div>

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

    .card {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
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

    .no-data {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .no-data-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-overlay.visible {
      display: flex;
    }

    .modal {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 600;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    }

    .setting-group {
      margin-bottom: 16px;
    }

    .setting-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #666;
    }

    .setting-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
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
  `]
})
export class App implements OnInit {
  private state = inject(StateService);
  private cube = inject(CubeService);
  private bluetooth = inject(BluetoothService);

  showSettings: WritableSignal<boolean> = signal<boolean>(false);
  toastMessage: WritableSignal<string> = signal<string>('');

  inspectionTime: Signal<number> = computed(() => this.state.settings().inspectionTime);
  soundEnabled: Signal<boolean> = computed(() => this.state.settings().sound);

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
    window.addEventListener('openSettings', () => {
      this.showSettings.set(true);
    });
  }

  async scanForCubes(): Promise<void> {
    const device = await this.bluetooth.scan();
    if (device) {
      await this.bluetooth.connect(device);
    }
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  closeSettingsModal(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showSettings.set(false);
    }
  }

  onInspectionTimeChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.state.settings.update(s => ({ ...s, inspectionTime: value }));
    this.state.inspectionTime.set(value);
  }

  onSoundChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value === 'on';
    this.state.settings.update(s => ({ ...s, sound: value }));
  }

  saveSettings(): void {
    localStorage.setItem('settings', JSON.stringify(this.state.settings()));
    this.showToast('Settings saved!');
    this.showSettings.set(false);
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to clear all data?')) {
      localStorage.clear();
      this.showToast('All data cleared!');
      this.showSettings.set(false);
      window.location.reload();
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set('');
    }, 3000);
  }
}
