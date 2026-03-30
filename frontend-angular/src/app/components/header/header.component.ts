import { Component, inject, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';
import { I18nService, Language } from '../../services/i18n.service';
import { BluetoothService } from '../../services/bluetooth.service';
import { AppModalComponent } from '../shared/app-modal.component';
import { KeyboardMappingComponent } from '../keyboard-mapping/keyboard-mapping';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, AppModalComponent, KeyboardMappingComponent],
  template: `
    <header class="header">
      <div class="logo">
        <div class="logo-icon">🧊</div>
        <div class="logo-text">Cube<span>Stats</span> Pro</div>
      </div>
      <div class="header-controls">
        <a routerLink="/scramble-test" class="dev-link">Scramble test</a>
        <a routerLink="/analysis" class="dev-link">Analysis</a>
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
          @if (isKeyboardSimulator()) {
            <button class="btn btn-secondary btn-keyboard" (click)="openKeyboardMapping()">⌨️ Mapping</button>
          }
          @if (isScanning()) {
            <div class="scanning-indicator">
              <div class="scanner-pulse-small"></div>
              <span class="status-dot scanning"></span>
            </div>
            <span id="connectionText">{{ t('scanning') }}</span>
          } @else {
            <span class="status-dot" [class.connected]="cubeConnected()"></span>
            <span id="connectionText">{{ cubeConnected() ? t('connected') : t('disconnected') }}</span>
          }
        </div>
      </div>
    </header>

    <app-modal
      [isVisible]="showKeyboardMapping()"
      title="Keyboard Mapping"
      (closed)="closeKeyboardMapping()"
      maxWidth="500px">
      <app-keyboard-mapping></app-keyboard-mapping>
    </app-modal>
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

    .dev-link {
      font-size: 13px;
      color: #6c757d;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #dee2e6;
    }

    .dev-link:hover {
      color: #0d6efd;
      border-color: #0d6efd;
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

    .status-dot.scanning {
      background: #007bff;
      animation: pulse-dot 1s ease-in-out infinite;
    }

    .scanning-indicator {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-pulse-small {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(0, 123, 255, 0.3);
      animation: pulse-small 1s ease-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes pulse-small {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .btn-keyboard {
      background: transparent;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #333;
    }

    .btn-keyboard:hover {
      background: #f8f9fa;
      border-color: #ccc;
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
  isKeyboardSimulator: Signal<boolean> = computed(() => this.bluetooth.currentDeviceName() === 'Keyboard Simulator');
  
  showKeyboardMapping: WritableSignal<boolean> = signal(false);

  availableLanguages = this.i18n.getAvailableLanguages();

  private translations: Record<string, string> = {
    disconnected: 'Disconnected',
    connected: 'Connected',
    scanning: 'Scanning...'
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

  openKeyboardMapping(): void {
    this.showKeyboardMapping.set(true);
  }

  closeKeyboardMapping(): void {
    this.showKeyboardMapping.set(false);
  }

  async scanForCubes(): Promise<void> {
    const device = await this.bluetooth.scan();
    if (device) {
      await this.bluetooth.connect(device);
    }
  }
}
