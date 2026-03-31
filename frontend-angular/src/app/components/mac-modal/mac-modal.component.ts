import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CubeCallbackService } from '../../services/cube-callback.service';
import { I18nService } from '../../services/i18n.service';
import { AppModalComponent } from '../shared/app-modal.component';

@Component({
  selector: 'app-mac-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppModalComponent],
  template: `
    <app-modal
      [isVisible]="isVisible()"
      theme="dark"
      maxWidth="400px"
      [closeOnBackdrop]="false"
      (closed)="onCancel()">
      <h3>{{ t('enterMacAddress') }}</h3>
      <p>{{ t('macAddressHint') }}</p>
      <input
        type="text"
        [(ngModel)]="macAddress"
        [placeholder]="t('macPlaceholder')"
        class="mac-input"
        (keyup.enter)="onSubmit()"
      />
      <div class="modal-buttons">
        <button class="btn-cancel" (click)="onCancel()">{{ t('cancel') }}</button>
        <button class="btn-submit" (click)="onSubmit()" [disabled]="!macAddress()">{{ t('submit') }}</button>
      </div>
    </app-modal>
  `,
  styles: [`
    h3 {
      margin: 0 0 12px;
      color: #eee;
      font-size: 18px;
    }
    p {
      margin: 0 0 16px;
      color: #888;
      font-size: 14px;
    }
    .mac-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #0f0f1a;
      color: #eee;
      font-size: 16px;
      font-family: monospace;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .mac-input:focus {
      outline: none;
      border-color: #6366f1;
    }
    .modal-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    button {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .btn-cancel {
      background: #333;
      color: #aaa;
    }
    .btn-cancel:hover {
      background: #444;
    }
    .btn-submit {
      background: #6366f1;
      color: white;
    }
    .btn-submit:hover {
      background: #5558e3;
    }
    .btn-submit:disabled {
      background: #444;
      color: #666;
      cursor: not-allowed;
    }
  `]
})
export class MacModalComponent {
  private cubeCallback = inject(CubeCallbackService);
  private i18n = inject(I18nService);

  isVisible = signal(false);
  macAddress = signal('');
  private resolveCallback: ((mac: string | null) => void) | null = null;

  t(key: string): string {
    return this.i18n.t(key);
  }

  constructor() {
    this.cubeCallback.registerMacModal((resolve) => {
      this.show(resolve);
    });
  }

  private show(resolve: (mac: string | null) => void): void {
    this.resolveCallback = resolve;
    this.macAddress.set('');
    this.isVisible.set(true);
  }

  onSubmit(): void {
    const mac = this.macAddress().trim().toUpperCase();
    if (mac && this.resolveCallback) {
      this.resolveCallback(mac);
      this.close();
    }
  }

  onCancel(): void {
    if (this.resolveCallback) {
      this.resolveCallback(null);
      this.close();
    }
  }

  private close(): void {
    this.isVisible.set(false);
    this.resolveCallback = null;
  }
}