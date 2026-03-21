import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CubeCallbackService } from '../../services/cube-callback.service';

@Component({
  selector: 'app-mac-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isVisible()) {
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Enter MAC Address</h3>
          <p>Please enter the MAC address of your cube (e.g., AA:BB:CC:DD:EE:FF)</p>
          <input
            type="text"
            [(ngModel)]="macAddress"
            placeholder="AA:BB:CC:DD:EE:FF"
            class="mac-input"
            (keyup.enter)="onSubmit()"
          />
          <div class="modal-buttons">
            <button class="btn-cancel" (click)="onCancel()">Cancel</button>
            <button class="btn-submit" (click)="onSubmit()" [disabled]="!macAddress()">Submit</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1a1a2e;
      padding: 24px;
      border-radius: 12px;
      min-width: 320px;
      max-width: 400px;
    }

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

  isVisible = signal(false);
  macAddress = signal('');
  private resolveCallback: ((mac: string | null) => void) | null = null;

  constructor() {
    // Register this modal with the callback service
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
