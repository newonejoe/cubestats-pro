import { Component, computed, effect, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { StateService } from '../../services/state.service';
import { StatisticsService } from '../../services/statistics.service';
import { BluetoothService } from '../../services/bluetooth.service';
import { I18nService } from '../../services/i18n.service';
import { filterBySession, type TimeWindow } from '../../lib/analysis-selectors';
import type { Solve } from '../../services/state.service';
import { AnalysisToolbarComponent, type AnalysisFeature } from '../../components/analysis/analysis-toolbar.component';
import { AnalysisSessionStatisticsComponent } from '../../components/analysis/analysis-session-statistics.component';
import { AnalysisTimeTrendComponent } from '../../components/analysis/analysis-time-trend.component';
import { AnalysisCrossSectionComponent } from '../../components/analysis/analysis-cross-section.component';
import { AnalysisTrainingStatisticsComponent } from '../../components/analysis/analysis-training-statistics.component';
import { AnalysisSolveModalComponent } from '../../components/analysis/analysis-solve-modal.component';
import { BestSolveSuggestionsComponent } from '../../components/analysis/best-solve-suggestions.component';
import { CaseType } from '../../data/best-solve-data';

@Component({
  selector: 'app-analysis-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    AnalysisToolbarComponent,
    AnalysisSessionStatisticsComponent,
    AnalysisTimeTrendComponent,
    AnalysisCrossSectionComponent,
    AnalysisTrainingStatisticsComponent,
    AnalysisSolveModalComponent,
    BestSolveSuggestionsComponent,
  ],
  template: `
    <div class="analysis-page">
      <header class="top">
        <a routerLink="/" class="back">← {{ t('home') }}</a>
        <h1>{{ t('analysis') }}</h1>
      </header>

      <section class="panel">
        <app-analysis-toolbar
          [selectedFeature]="selectedFeature()"
          [selectedSessionId]="stats.selectedSessionIdSignal()"
          [sessions]="sessions()"
          [selectedTimeWindow]="selectedTimeWindow()"
          [useSessionFilterInCross]="useSessionFilterInCross()"
          [customFrom]="customFrom()"
          [customTo]="customTo()"
          (featureChange)="onToolbarFeature($event)"
          (sessionChange)="onSessionChange($event)"
          (timeWindowChange)="selectedTimeWindow.set($event)"
          (crossSessionFilterToggle)="useSessionFilterInCross.set($event)"
          (customFromChange)="customFrom.set($event)"
          (customToChange)="customTo.set($event)"
          (bestSolveClick)="bestSolveModalOpen.set(true)"
        />
      </section>

      <section class="panel">
        @switch (selectedFeature()) {
          @case ('session') {
            <app-analysis-session-statistics
              [sessionId]="stats.selectedSessionIdSignal()"
              (solveOpen)="openSolveModal($event)"
            />
          }
          @case ('trend') {
            <app-analysis-time-trend [sessionId]="stats.selectedSessionIdSignal()" />
          }
          @case ('cross') {
            <app-analysis-cross-section
              [timeWindow]="selectedTimeWindow()"
              [customFrom]="customFrom()"
              [customTo]="customTo()"
              [useSessionFilter]="useSessionFilterInCross()"
              [sessionFilterId]="stats.selectedSessionIdSignal()"
            />
          }
          @case ('training') {
            <app-analysis-training-statistics
              [sessionId]="stats.selectedSessionIdSignal()"
              (bestSolveDblClick)="onBestSolveDblClick($event)"
            />
          }
          @default {
            <p class="empty">No feature selected.</p>
          }
        }
      </section>
    </div>

    @if (modalSolve(); as sol) {
      <app-analysis-solve-modal
        [solve]="sol"
        [caseStatScope]="modalCaseStatScope()"
        [contextSessionId]="contextSessionIdForModal()"
        (closed)="closeSolveModal()"
        (deleted)="closeSolveModal()"
      />
    }

    @if (bestSolveModalOpen()) {
      <app-best-solve-suggestions
        [isVisible]="bestSolveModalOpen()"
        [initialCaseType]="selectedBestSolveCaseType()"
        [initialCaseIndex]="selectedBestSolveCaseIndex()"
        (closed)="bestSolveModalOpen.set(false)"
      />
    }
  `,
  styles: [`
    :host { display: block; background: var(--background); color: var(--text-primary); }
    .analysis-page { margin: 0 auto; padding: 20px; }
    .top { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
    .back { color: var(--link-color); text-decoration: none; }
    .back:hover { text-decoration: underline; }
    .panel { background: var(--card-bg); border-radius: 12px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .empty { color: var(--text-muted); margin: 0; }
    .bt-status-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 14px;
      background: var(--hover-bg);
      border-radius: 8px;
      margin-bottom: 14px;
      font-size: 13px;
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
    .device-name {
      color: var(--text-secondary);
      font-size: 12px;
    }
  `],
})
export class AnalysisPageComponent {
  private readonly store = inject(LocalSolveStoreService);
  private readonly state = inject(StateService);
  private readonly bluetooth = inject(BluetoothService);
  private readonly i18n = inject(I18nService);
  readonly stats = inject(StatisticsService);

  readonly selectedFeature = signal<AnalysisFeature>('training');
  readonly selectedTimeWindow = signal<TimeWindow>('7d');
  readonly useSessionFilterInCross = signal<boolean>(false);
  readonly customFrom = signal<string>('');
  readonly customTo = signal<string>('');
  readonly modalSolve = signal<Solve | null>(null);
  readonly bestSolveModalOpen = signal<boolean>(false);
  readonly selectedBestSolveCaseType = signal<CaseType>('oll');
  readonly selectedBestSolveCaseIndex = signal<number | null>(null);

  cubeConnected = computed(() => this.state.cubeConnected());
  isScanning = computed(() => this.bluetooth.isScanning());
  deviceName = computed(() => this.bluetooth.getDeviceName());

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });
  readonly sessions = computed(() => {
    this.store.storeRevision();
    return this.store.getSessions();
  });

  readonly modalCaseStatScope = computed(() => {
    const sid = this.stats.selectedSessionIdSignal();
    return filterBySession(this.solves(), sid);
  });

  readonly contextSessionIdForModal = computed((): number | undefined => {
    const sid = this.stats.selectedSessionIdSignal();
    return sid === 'all' ? undefined : sid;
  });

  constructor() {
    // When feature changes to session/trend, ensure we have a valid session selected
    effect(() => {
      const feat = this.selectedFeature();
      if (feat !== 'session' && feat !== 'trend') {
        return;
      }
      if (this.stats.selectedSessionIdSignal() !== 'all') {
        return;
      }
      const list = this.sessions();
      if (list.length > 0) {
        this.stats.setSelectedSession(list[0]!.id);
      }
    });
  }

  onSessionChange(sessionId: number | 'all'): void {
    this.stats.setSelectedSession(sessionId);
  }

  onToolbarFeature(v: AnalysisFeature): void {
    this.selectedFeature.set(v);
    if (v === 'session' || v === 'trend') {
      if (this.stats.selectedSessionIdSignal() === 'all') {
        const s = this.sessions();
        if (s.length > 0) {
          this.stats.setSelectedSession(s[0]!.id);
        }
      }
    }
  }

  openSolveModal(solve: Solve): void {
    this.modalSolve.set(solve);
  }

  closeSolveModal(): void {
    this.modalSolve.set(null);
  }

  onBestSolveDblClick(event: { caseType: CaseType; caseIndex: number }): void {
    this.selectedBestSolveCaseType.set(event.caseType);
    this.selectedBestSolveCaseIndex.set(event.caseIndex);
    this.bestSolveModalOpen.set(true);
  }
}
