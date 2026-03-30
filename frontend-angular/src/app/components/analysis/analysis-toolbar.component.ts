import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
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
        Feature
        <select [value]="selectedFeature()" (change)="onFeatureChange($event)">
          <option value="session">Session Statistics</option>
          <option value="trend">Time Trend</option>
          <option value="cross">Cross-section Statistics</option>
          <option value="training">Training Statistics</option>
        </select>
      </label>
      @if (selectedFeature() !== 'cross') {
        <label>
          Session
          <select [value]="sessionSelectValue()" (change)="onSessionChange($event)">
            @if (sessionAllowsAll()) {
              <option value="all">All sessions</option>
            }
            @for (s of sessions(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        </label>
      } @else {
        <label>
          Time Window
          <select [value]="selectedTimeWindow()" (change)="onTimeWindowChange($event)">
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label class="inline-check">
          <input type="checkbox" [checked]="useSessionFilterInCross()" (change)="onCrossSessionFilterToggle($event)" />
          <span>Apply session filter</span>
        </label>
        @if (useSessionFilterInCross()) {
          <label>
            Session
            <select [value]="crossSessionSelectValue()" (change)="onSessionChange($event)">
              <option value="all">All sessions</option>
              @for (s of sessions(); track s.id) {
                <option [value]="s.id">{{ s.name }}</option>
              }
            </select>
          </label>
        }
        @if (selectedTimeWindow() === 'custom') {
          <label>
            From
            <input type="date" [value]="customFrom()" (change)="onCustomFromChange($event)" />
          </label>
          <label>
            To
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
  readonly selectedFeature = input<AnalysisFeature>('session');
  readonly selectedSessionId = input<number | 'all'>('all');
  readonly sessions = input<Session[]>([]);
  readonly selectedTimeWindow = input<TimeWindow>('7d');
  readonly useSessionFilterInCross = input<boolean>(false);
  readonly customFrom = input<string>('');
  readonly customTo = input<string>('');

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
