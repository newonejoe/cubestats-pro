import { Component, inject, signal, computed, type WritableSignal, type Signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
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
      <div class="header-left">
        <div class="dropdown" (click)="menuOpen.update(v => !v)">
          <button type="button" class="menu-btn">
            <span class="menu-icon">☰</span>
          </button>
          @if (menuOpen()) {
            <div class="dropdown-menu" (click)="$event.stopPropagation()">
              <a routerLink="/" class="menu-item" (click)="menuOpen.set(false)">{{ t('home') }}</a>
              <a routerLink="/analysis" class="menu-item" (click)="menuOpen.set(false)">{{ t('statistics') }}</a>
              <a routerLink="/scramble-test" class="menu-item" (click)="menuOpen.set(false)">{{ t('scrambleTest') }}</a>
              <button type="button" class="menu-item" (click)="openKeyboardMapping(); menuOpen.set(false)">{{ t('keyboardMapping') }}</button>
              <div class="menu-divider"></div>
              <button type="button" class="menu-item" (click)="openSettingsClicked(); menuOpen.set(false)">{{ t('settings') }}</button>
              <div class="menu-divider"></div>
              <div class="menu-item lang-select-wrap">
                <span>{{ t('language') }}</span>
                <select class="lang-select" [value]="currentLanguage()" (change)="onLanguageChange($event); menuOpen.set(false)">
                  @for (lang of availableLanguages; track lang.code) {
                    <option [value]="lang.code">{{ lang.name }}</option>
                  }
                </select>
              </div>
              <div class="menu-item user-select-wrap">
                <span>{{ t('role') }}</span>
                <select class="user-select" [value]="currentUserId()" (change)="onUserChange($event); menuOpen.set(false)">
                  <option value="1">{{ t('coach') }}</option>
                  <option value="2">{{ t('user') }}</option>
                </select>
              </div>
            </div>
          }
        </div>
      </div>
      <div class="header-right">
        <div class="connection-status">
          @if (isKeyboardSimulator()) {
            <button class="btn-keyboard" (click)="openKeyboardMapping()">⌨️</button>
          }
          @if (isScanning()) {
            <div class="scanning-indicator">
              <div class="scanner-pulse-small"></div>
              <span class="status-dot scanning"></span>
            </div>
            <span class="status-text">{{ t('scanning') }}</span>
          } @else {
            <span class="status-dot" [class.connected]="cubeConnected()"></span>
            <span class="status-text">{{ cubeConnected() ? t('connected') : t('disconnected') }}</span>
          }
        </div>
      </div>
    </header>

    <app-modal
      [isVisible]="showKeyboardMapping()"
      [title]="t('keyboardMapping')"
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
      padding: 8px 12px;
      background: #fff;
    }

    .header-left {
      display: flex;
      align-items: center;
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    .menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
    }

    .menu-btn:hover {
      background: #f0f0f0;
    }

    .menu-icon {
      font-size: 20px;
      color: #333;
    }

    .dropdown {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 180px;
      z-index: 100;
      padding: 6px 0;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      font-size: 14px;
      color: #333;
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
    }

    .menu-item:hover {
      background: #f5f5f5;
    }

    .menu-divider {
      height: 1px;
      background: #eee;
      margin: 6px 0;
    }

    .lang-select-wrap, .user-select-wrap {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .lang-select-wrap span, .user-select-wrap span {
      font-size: 11px;
      color: #999;
    }

    .lang-select, .user-select {
      width: 100%;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
      background: #fff;
      font-size: 13px;
      cursor: pointer;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
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

    .status-text {
      font-size: 12px;
      color: #666;
    }

    .btn-keyboard {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 6px;
      font-size: 16px;
    }

    .btn-keyboard:hover {
      background: #f0f0f0;
    }
  `]
})
export class HeaderComponent {
  private state = inject(StateService);
  private i18n = inject(I18nService);
  private bluetooth = inject(BluetoothService);
  readonly router = inject(Router);

  @Output() openSettings = new EventEmitter<void>();

  currentLanguage: Signal<Language> = computed(() => this.i18n.currentLanguage());
  currentUserId: Signal<number> = computed(() => this.state.currentUserId());
  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());
  isScanning: Signal<boolean> = computed(() => this.bluetooth.isScanning());
  isKeyboardSimulator: Signal<boolean> = computed(() => this.bluetooth.currentDeviceName() === 'Keyboard Simulator');

  showKeyboardMapping: WritableSignal<boolean> = signal(false);
  menuOpen: WritableSignal<boolean> = signal(false);

  availableLanguages = this.i18n.getAvailableLanguages();

  t(key: string): string {
    return this.i18n.t(key);
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
    this.menuOpen.set(false);
    this.showKeyboardMapping.set(true);
  }

  closeKeyboardMapping(): void {
    this.showKeyboardMapping.set(false);
  }

  openSettingsClicked(): void {
    this.openSettings.emit();
  }

  async scanForCubes(): Promise<void> {
    const device = await this.bluetooth.scan();
    if (device) {
      await this.bluetooth.connect(device);
    }
  }
}
