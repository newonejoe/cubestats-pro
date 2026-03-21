import { Component, inject, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { I18nService, Language } from '../../services/i18n.service';
import { BluetoothService } from '../../services/bluetooth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="logo">
        <div class="logo-icon">🎲</div>
        <div class="logo-text">Cube<span>Stats</span> Pro</div>
      </div>
      <div class="header-controls">
        <select class="lang-select" [value]="currentLanguage()" (change)="onLanguageChange($event)">
          @for (lang of availableLanguages; track lang.code) {
            <option [value]="lang.code">{{ lang.name }}</option>
          }
        </select>
        <select class="user-select" [value]="currentUserId()" (change)="onUserChange($event)">
          <option value="1">Coach</option>
          <option value="2">User</option>
        </select>
        <div class="connection-status">
          <span class="status-dot" [class.connected]="cubeConnected()"></span>
          <span id="connectionText">{{ cubeConnected() ? t('connected') : t('disconnected') }}</span>
          <button class="btn-bt-scan" (click)="scanForCubes()" [disabled]="isScanning()">
            <span>📡</span>
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: #fff;
      border-bottom: 1px solid #eee;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 32px;
    }

    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #333;
    }

    .logo-text span {
      color: #007bff;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .lang-select,
    .user-select {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
    }

    .status-dot.connected {
      background: #4caf50;
    }

    .btn-bt-scan {
      background: #e9ecef;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-bt-scan:hover:not(:disabled) {
      background: #dee2e6;
    }

    .btn-bt-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class HeaderComponent {
  private state = inject(StateService);
  private i18n = inject(I18nService);
  private bluetooth = inject(BluetoothService);

  currentLanguage: Signal<Language> = computed(() => this.i18n.currentLanguage());
  currentUserId: Signal<number> = computed(() => this.state.currentUserId());
  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());
  isScanning: Signal<boolean> = computed(() => this.bluetooth.isScanning());

  availableLanguages = this.i18n.getAvailableLanguages();

  private translations: Record<string, string> = {
    disconnected: 'Disconnected',
    connected: 'Connected'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  onLanguageChange(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value as Language;
    this.i18n.setLanguage(lang);
  }

  onUserChange(event: Event): void {
    const userId = parseInt((event.target as HTMLSelectElement).value);
    this.state.currentUserId.set(userId);
  }

  async scanForCubes(): Promise<void> {
    const device = await this.bluetooth.scan();
    if (device) {
      await this.bluetooth.connect(device);
    }
  }
}
