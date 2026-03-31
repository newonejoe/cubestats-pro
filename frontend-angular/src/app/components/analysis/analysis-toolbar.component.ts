import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import type { Session } from '../../services/state.service';
import type { TimeWindow } from '../../lib/analysis-selectors';

export type AnalysisFeature = 'session' | 'trend' | 'cross' | 'training';

@Component({
  selector: 'app-analysis-toolbar',
  standalone: true,
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
    </div>
  `,
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
    .toolbar label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #6c757d; }
    .toolbar .inline-check { flex-direction: row; align-items: center; gap: 8px; padding-bottom: 8px; }
    .toolbar select, .toolbar input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d0d7de; font-size: 13px; color: #212529; background: #fff; }
  `],
})
export class AnalysisToolbarComponent {
  private readonly i18n = inject(I18nService);

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
}
