import { Component, inject, signal, computed, type WritableSignal, type Signal, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { StateService } from '../../services/state.service';
import { I18nService, Language } from '../../services/i18n.service';
import { BluetoothService } from '../../services/bluetooth.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)'
  },
  imports: [CommonModule, RouterLink],
  template: `
    <header class="header">
      <div class="header-left">
        <div class="dropdown" (click)="menuOpen.update(v => !v)">
          <button type="button" class="menu-btn">
            <span class="menu-icon">☰</span>
          </button>
          @if (menuOpen()) {
            <div class="dropdown-menu" (click)="$event.stopPropagation()">
              <a routerLink="/" class="menu-item-icon-only" (click)="menuOpen.set(false)" title="Home">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m216-160-56-56 384-384H440v80h-80v-160h233q16 0 31 6t26 17l120 119q27 27 66 42t84 16v80q-62 0-112.5-19T718-476l-40-42-88 88 90 90-262 151-40-69 172-99-68-68-266 265Zm-96-280v-80h200v80H120ZM40-560v-80h200v80H40Zm739-80q-33 0-57-23.5T698-720q0-33 24-56.5t57-23.5q33 0 57 23.5t24 56.5q0 33-24 56.5T779-640Zm-659-40v-80h200v80H120Z"/></svg>
              </a>
              <a routerLink="/analysis" class="menu-item-icon-only" (click)="menuOpen.set(false)" title="Statistics">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m136-240-56-56 296-298 160 160 208-206H640v-80h240v240h-80v-104L536-320 376-480 136-240Z"/></svg>
              </a>
              <a routerLink="/scramble-test" class="menu-item-icon-only" (click)="menuOpen.set(false)" title="Scramble Test">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m272-440 208 120 208-120-168-97v137h-80v-137l-168 97Zm168-189v-17q-44-13-72-49.5T340-780q0-58 41-99t99-41q58 0 99 41t41 99q0 48-28 84.5T520-646v17l280 161q19 11 29.5 29.5T840-398v76q0 22-10.5 40.5T800-252L520-91q-19 11-40 11t-40-11L160-252q-19-11-29.5-29.5T120-322v-76q0-22 10.5-40.5T160-468l280-161Zm0 378L200-389v67l280 162 280-162v-67L520-251q-19 11-40 11t-40-11Zm82.5-486.5Q540-755 540-780t-17.5-42.5Q505-840 480-840t-42.5 17.5Q420-805 420-780t17.5 42.5Q455-720 480-720t42.5-17.5ZM480-160Z"/></svg>
              </a>
              <button type="button" class="menu-item-icon-only" (click)="openKeyboardMappingClicked(); menuOpen.set(false)" title="Keyboard Mapping">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-200q-33 0-56.5-23.5T80-280v-400q0-33 23.5-56.5T160-760h640q33 0 56.5 23.5T880-680v400q0 33-23.5 56.5T800-200H160Zm0-80h640v-400H160v400Zm160-40h320v-80H320v80ZM200-440h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-560h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM160-280v-400 400Z"/></svg>
              </button>
              <div class="menu-divider"></div>
              <button type="button" class="menu-item-icon-only" (click)="openSettingsClicked(); menuOpen.set(false)" title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
              </button>
            </div>
          }
        </div>
      </div>
      <div class="header-right">
        <div class="connection-status">
          @if (isKeyboardSimulator()) {
            <button class="btn-keyboard" (click)="openKeyboardMappingClicked()">⌨️</button>
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
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--card-bg);
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
      background: var(--hover-bg);
    }

    .menu-icon {
      font-size: 20px;
      color: var(--text-primary);
    }

    .dropdown {
      position: relative;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 120px;
      z-index: 100;
      padding: 6px 0;
    }

    .menu-item-icon-only {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      font-size: 14px;
      color: var(--text-primary);
      text-decoration: none;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
    }

    .menu-item-icon-only:hover {
      background: var(--hover-bg);
    }

    .menu-item-icon-only svg {
      fill: currentColor;
    }

    .menu-divider {
      height: 1px;
      background: var(--border-color);
      margin: 6px 0;
    }

    .lang-select-wrap, .user-select-wrap {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .lang-select-wrap span, .user-select-wrap span {
      font-size: 11px;
      color: var(--text-muted);
    }

    .lang-select, .user-select {
      width: 100%;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid var(--input-border);
      background: var(--input-bg);
      font-size: 13px;
      cursor: pointer;
      color: var(--text-primary);
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
      background: var(--text-muted);
    }

    .status-dot.connected {
      background: var(--success-color);
    }

    .status-dot.scanning {
      background: var(--primary-color);
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
      color: var(--text-secondary);
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
      background: var(--hover-bg);
    }
  `]
})
export class HeaderComponent {
  private state = inject(StateService);
  private i18n = inject(I18nService);
  private bluetooth = inject(BluetoothService);
  readonly router = inject(Router);

  readonly openSettings = output<void>();
  readonly openKeyboardMapping = output<void>();

  currentLanguage: Signal<Language> = computed(() => this.i18n.currentLanguage());
  currentUserId: Signal<number> = computed(() => this.state.currentUserId());
  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());
  isScanning: Signal<boolean> = computed(() => this.bluetooth.isScanning());
  isKeyboardSimulator: Signal<boolean> = computed(() => this.bluetooth.currentDeviceName() === 'Keyboard Simulator');

  menuOpen: WritableSignal<boolean> = signal(false);

  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Don't close if clicking inside the dropdown
    if (target.closest('.dropdown')) {
      return;
    }
    this.menuOpen.set(false);
  }

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

  openKeyboardMappingClicked(): void {
    this.menuOpen.set(false);
    this.openKeyboardMapping.emit();
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
