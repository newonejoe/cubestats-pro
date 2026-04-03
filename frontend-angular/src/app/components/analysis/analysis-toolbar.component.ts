import { Component, input, output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import type { Session } from '../../services/state.service';
import type { TimeWindow } from '../../lib/analysis-selectors';

export type AnalysisFeature = 'session' | 'trend' | 'cross' | 'training';

@Component({
  selector: 'app-analysis-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="toolbar">
      <label>
        {{ t('feature') }}
        <select [value]="selectedFeature()" (change)="onFeatureChange($event)">
          <option value="session">{{ t('sessionStatistics') }}</option>
          <option value="trend">{{ t('timeTrend') }}</option>
          <option value="cross">{{ t('crossSectionStats') }}</option>
          <option value="training">{{ t('trainingStats') }}</option>
        </select>
      </label>
      @if (selectedFeature() !== 'cross') {
        <label>
          {{ t('session') }}
          <select [value]="sessionSelectValue()" (change)="onSessionChange($event)">
            @if (sessionAllowsAll()) {
              <option value="all">{{ t('allSessions') }}</option>
            }
            @for (s of sessions(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </label>
      } @else {
        <label>
          {{ t('timeWindow') }}
          <select [value]="selectedTimeWindow()" (change)="onTimeWindowChange($event)">
            <option value="today">{{ t('today') }}</option>
            <option value="7d">{{ t('past7Days') }}</option>
            <option value="30d">{{ t('past30Days') }}</option>
            <option value="custom">{{ t('custom') }}</option>
          </select>
        </label>
        <label class="inline-check">
          <input type="checkbox" [checked]="useSessionFilterInCross()" (change)="onCrossSessionFilterToggle($event)" />
          <span>{{ t('applySessionFilter') }}</span>
        </label>
        @if (useSessionFilterInCross()) {
          <label>
            {{ t('session') }}
            <select [value]="crossSessionSelectValue()" (change)="onSessionChange($event)">
              <option value="all">{{ t('allSessions') }}</option>
              @for (s of sessions(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </label>
        }
        @if (selectedTimeWindow() === 'custom') {
          <label>
            {{ t('from') }}
            <input type="date" [value]="customFrom()" (change)="onCustomFromChange($event)" />
          </label>
          <label>
            {{ t('to') }}
            <input type="date" [value]="customTo()" (change)="onCustomToChange($event)" />
          </label>
        }
      }
      <div class="toolbar-actions">
        <button type="button" class="btn-action" (click)="onBestSolveClick()" title="{{ t('bestSolve') }}">
          {{ t('best') }}
        </button>
        <button type="button" class="btn-action" (click)="onExport()" title="{{ t('export') }}">
          {{ t('export') }}
        </button>
        <div class="dropdown-wrapper">
          <button type="button" class="btn-action" (click)="importMenuOpen.update(v => !v)">
            {{ t('importData') }} ▼
          </button>
          @if (importMenuOpen()) {
            <div class="dropdown-menu">
              <button type="button" class="dropdown-item" (click)="onImportCstimer(); importMenuOpen.set(false)">
                {{ t('importCstimer') }}
              </button>
              <button type="button" class="dropdown-item" (click)="onImportCubeStats(); importMenuOpen.set(false)">
                {{ t('importCubeStats') }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
    .toolbar label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    .toolbar .inline-check { flex-direction: row; align-items: center; gap: 8px; padding-bottom: 8px; }
    .toolbar select, .toolbar input { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--input-border); font-size: 13px; color: var(--text-primary); background: var(--card-bg); }
    .toolbar-actions { display: flex; gap: 8px; margin-left: auto; align-items: end; }
    .btn-action { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--input-border); background: var(--card-bg); font-size: 13px; cursor: pointer; color: var(--text-primary); }
    .btn-action:hover { background: var(--hover-bg); }
    .dropdown-wrapper { position: relative; }
    .dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 180px; z-index: 100; }
    .dropdown-item { display: block; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; cursor: pointer; font-size: 13px; color: var(--text-primary); }
    .dropdown-item:hover { background: var(--hover-bg); }
  `],
})
export class AnalysisToolbarComponent {
  private readonly i18n = inject(I18nService);
  private readonly localStore = inject(LocalSolveStoreService);

  importMenuOpen = signal(false);

  readonly selectedFeature = input<AnalysisFeature>('session');
  readonly selectedSessionId = input<number | 'all'>('all');
  readonly sessions = input<Session[]>([]);
  readonly selectedTimeWindow = input<TimeWindow>('7d');
  readonly useSessionFilterInCross = input<boolean>(false);
  readonly customFrom = input<string>('');
  readonly customTo = input<string>('');

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly featureChange = output<AnalysisFeature>();
  readonly sessionChange = output<number | 'all'>();
  readonly timeWindowChange = output<TimeWindow>();
  readonly crossSessionFilterToggle = output<boolean>();
  readonly customFromChange = output<string>();
  readonly customToChange = output<string>();
  readonly bestSolveClick = output<void>();

  sessionAllowsAll(): boolean {
    return this.selectedFeature() === 'training';
  }

  sessionSelectValue(): string {
    return this.selectedSessionId() === 'all' ? 'all' : String(this.selectedSessionId());
  }

  crossSessionSelectValue(): string {
    return this.sessionSelectValue();
  }

  onFeatureChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as AnalysisFeature;
    this.featureChange.emit(v);
  }

  onSessionChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === 'all') {
      this.sessionChange.emit('all');
      return;
    }
    const id = Number.parseInt(raw, 10);
    this.sessionChange.emit(Number.isNaN(id) ? 'all' : id);
  }

  onTimeWindowChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as TimeWindow;
    this.timeWindowChange.emit(v);
  }

  onCrossSessionFilterToggle(event: Event): void {
    this.crossSessionFilterToggle.emit((event.target as HTMLInputElement).checked);
  }

  onCustomFromChange(event: Event): void {
    this.customFromChange.emit((event.target as HTMLInputElement).value);
  }

  onCustomToChange(event: Event): void {
    this.customToChange.emit((event.target as HTMLInputElement).value);
  }

  onExport(): void {
    const json = this.localStore.exportSessionsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubestats-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onBestSolveClick(): void {
    console.debug('button clicked');
    this.bestSolveClick.emit();
  }

  onImportCubeStats(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = this.localStore.importSessionsJson(reader.result as string);
          alert(`Imported ${result.sessions} sessions and ${result.solves} solves`);
          window.location.reload();
        } catch (err) {
          alert(this.t('error') + ': ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  onImportCstimer(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = await this.localStore.importCstimerJson(reader.result as string);
          alert(`Imported ${result.sessions} sessions and ${result.solves} solves`);
          window.location.reload();
        } catch (err) {
          alert(this.t('error') + ': ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
