import { Component, inject, computed, Input, Output, EventEmitter, type Signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, Theme } from '../../services/state.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { AppModalComponent } from '../shared/app-modal.component';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, AppModalComponent],
  template: `
    <app-modal
      [isVisible]="isVisible"
      title="Settings"
      maxWidth="400px"
      theme="light"
      (closed)="close()">

      <div class="setting-group">
        <label class="setting-label">Theme</label>
        <select class="setting-input" (change)="onThemeChange($event)">
          <option value="white" [selected]="currentTheme() === 'white'">White (Light)</option>
          <option value="black" [selected]="currentTheme() === 'black'">Black (Dark)</option>
        </select>
      </div>
      <div class="setting-group">
        <label class="setting-label">Inspection Time (seconds)</label>
        <input type="number" class="setting-input" [value]="inspectionTime()" min="0" max="30"
               (change)="onInspectionTimeChange($event)">
      </div>
      <div class="setting-group">
        <label class="setting-label">Timer Sound</label>
        <select class="setting-input" (change)="onSoundChange($event)">
          <option value="on" [selected]="soundEnabled()">On</option>
          <option value="off" [selected]="!soundEnabled()">Off</option>
        </select>
      </div>
      <button class="btn btn-primary" (click)="saveSettings()" style="width: 100%;">Save</button>
      <button class="btn btn-danger" (click)="clearAllData()" style="width: 100%; margin-top: 12px;">Clear All Data</button>
    </app-modal>
  `,
  styles: [`
    .setting-group {
      margin-bottom: 16px;
    }
    .setting-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .setting-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--input-border);
      border-radius: 6px;
      font-size: 14px;
      background: var(--input-bg);
      color: var(--text-primary);
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: var(--primary-color);
      color: white;
    }
    .btn-primary:hover {
      filter: brightness(0.9);
    }
    .btn-danger {
      background: var(--danger-color);
      color: white;
    }
    .btn-danger:hover {
      filter: brightness(0.9);
    }
  `]
})
export class SettingsModalComponent implements OnInit {
  private state = inject(StateService);
  private localStore = inject(LocalSolveStoreService);

  @Input() isVisible = false;
  @Output() isVisibleChange = new EventEmitter<boolean>();

  inspectionTime: Signal<number> = computed(() => this.state.settings().inspectionTime);
  soundEnabled: Signal<boolean> = computed(() => this.state.settings().sound);
  currentTheme: Signal<Theme> = computed(() => this.state.settings().theme);

  ngOnInit(): void {
    // Load saved settings from localStorage
    try {
      const saved = localStorage.getItem('settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          this.state.settings.set({
            inspectionTime: parsed.inspectionTime ?? 15,
            sound: parsed.sound ?? true,
            theme: parsed.theme ?? 'white'
          });
        }
      }
    } catch {
      // Use defaults
    }
  }

  close(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
  }

  onThemeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.state.settings.update(s => ({ ...s, theme: select.value as Theme }));
  }

  onInspectionTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value)) {
      this.state.settings.update(s => ({ ...s, inspectionTime: value }));
    }
  }

  onSoundChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.state.settings.update(s => ({ ...s, sound: select.value === 'on' }));
  }

  saveSettings(): void {
    localStorage.setItem('settings', JSON.stringify(this.state.settings()));
    this.close();
  }

  clearAllData(): void {
    if (confirm('Are you sure you want to delete all solves and sessions? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  }
}