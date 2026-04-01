import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';
import { SolveReplayService } from '../../services/solve-replay.service';
import { CubeService } from '../../services/cube.service';
import { StateService, type Solve } from '../../services/state.service';
import { formatMs } from '../../lib/analysis-selectors';
import {
  finalSolveMs,
  joinTraceNotation,
  penaltyLabel,
} from './analysis-solve-display';

import { AppModalComponent } from '../shared/app-modal.component';
import { CfopReconstructionComponent } from '../shared/cfop-reconstruction.component';

@Component({
  selector: 'app-analysis-solve-modal',
  standalone: true,
  imports: [CommonModule, RouterLink, AppModalComponent, CfopReconstructionComponent],
  template: `
    <app-modal
      [isVisible]="true"
      [title]="t('solveDetails')"
      maxWidth="720px"
      theme="light"
      [noPadding]="true"
      (closed)="onClose()">
      <div class="solve-modal-body">
          <div class="row-actions">
            <button type="button" class="btn" (click)="retrySolve(solve())">{{ t('retry') }}</button>
            <button type="button" class="btn" [disabled]="!solve().moveTrace || replayBusy()" (click)="replaySolve(solve())">
              {{ replayBusy() ? t('replaying') : t('replay') }}
            </button>
            <button type="button" class="btn btn-danger" (click)="deleteSolve(solve())">{{ t('delete') }}</button>
          </div>
          <section class="detail-block">
            <h3>{{ t('scramble') }}</h3>
            <pre class="mono-block">{{ solve().scramble }}</pre>
            <button type="button" class="btn-small" (click)="copyText(solve().scramble)">{{ t('copyScramble') }}</button>
          </section>
          <section class="detail-block">
            <h3>{{ t('summary') }}</h3>
            <ul class="kv">
              <li><span>{{ t('final') }}</span><span class="mono">{{ fm(finalSolveMs(solve())) }}</span></li>
              <li><span>{{ t('dnfPlus2') }}</span><span>{{ penaltyLabel(solve()) || '—' }}</span></li>
              <li><span>{{ t('moves') }}</span><span class="mono">{{ solve().moveCount ?? '—' }}</span></li>
              <li>
                <span>{{ t('inspectionWca') }}</span>
                <span class="mono">{{ solve().inspectionTime != null ? solve().inspectionTime + ' s' : '—' }}</span>
              </li>
              <li><span>{{ t('type') }}</span><span>{{ solve().scrambleType ?? '—' }}</span></li>
            </ul>
          </section>
          <section class="detail-block reconstruct">
            <h3>{{ t('reconstruct') }}</h3>
            <p class="muted">
              {{ t('reconstructHint') }}
            </p>
            <p class="mono-line"><strong>{{ t('inverse') }}</strong> {{ inverseScramble(solve().scramble) }}</p>
            @if (joinTraceNotation(solve().moveTrace)) {
              <p class="mono-line"><strong>{{ t('solution') }}</strong> {{ joinTraceNotation(solve().moveTrace) }}</p>
              <button type="button" class="btn-small" (click)="copyText(joinTraceNotation(solve().moveTrace))">{{ t('copySolution') }}</button>
            }
            <div class="row-actions">
              <button type="button" class="btn-small" (click)="copyText(inverseScramble(solve().scramble))">{{ t('copyInverse') }}</button>
              <a
                class="btn-small link"
                [routerLink]="['/scramble-test']"
                [queryParams]="{ scramble: solve().scramble, type: solve().scrambleType || 'wca' }"
              >{{ t('openInScrambleTest') }}</a>
            </div>
          </section>
          <app-cfop-reconstruction [solve]="solve()" [caseStatScope]="caseStatScope()" />
          <section class="detail-block">
            <h3>{{ t('moveTrace') }}</h3>
            @if (solve().moveTrace) {
              <pre class="mono-block trace">{{ solve().moveTrace }}</pre>
              <button type="button" class="btn-small" (click)="copyText(solve().moveTrace!)">{{ t('copyTrace') }}</button>
            } @else {
              <p class="muted">{{ t('noMoveTrace') }}</p>
            }
          </section>
      </div>
    </app-modal>
  `,
  styles: [`
    .solve-modal-body { padding: 14px 18px 20px; overflow-y: auto; }
    .row-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--input-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer; font-size: 13px; }
    .btn:hover { background: var(--hover-bg); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: var(--danger-color); border-color: var(--danger-color); color: #fff; }
    .btn-small { padding: 6px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--input-border); background: var(--card-bg); color: var(--text-primary); cursor: pointer; margin-top: 8px; margin-right: 8px; }
    .btn-small.link { display: inline-block; text-decoration: none; color: var(--link-color); text-align: center; }
    .detail-block { margin-bottom: 18px; }
    .detail-block h3 { margin: 0 0 8px; font-size: 14px; color: var(--text-secondary); }
    .mono-block { margin: 0 0 8px; padding: 10px; background: var(--hover-bg); border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; color: var(--text-primary); }
    .mono-line { font-family: 'JetBrains Mono', monospace; font-size: 12px; word-break: break-all; }
    .mono-tiny { font-size: 11px; margin: 4px 0 0; white-space: pre-wrap; word-break: break-all; }
    .trace { max-height: 160px; overflow-y: auto; }
    .kv { list-style: none; margin: 0; padding: 0; }
    .kv li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-primary); }
    .muted { color: var(--text-muted); font-size: 12px; margin-top: 0; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  `],
})
export class AnalysisSolveModalComponent {
  readonly penaltyLabel = penaltyLabel;
  readonly finalSolveMs = finalSolveMs;
  readonly joinTraceNotation = joinTraceNotation;

  private readonly store = inject(LocalSolveStoreService);
  private readonly state = inject(StateService);
  private readonly router = inject(Router);
  private readonly replay = inject(SolveReplayService);
  private readonly cube = inject(CubeService);
  private readonly i18n = inject(I18nService);

  readonly solve = input.required<Solve>();
  readonly caseStatScope = input<Solve[]>([]);
  /** Used for Retry when the solve record has no sessionId. */
  readonly contextSessionId = input<number | undefined>(undefined);

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly closed = output<void>();
  readonly deleted = output<void>();

  readonly replayBusy = signal(false);

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  onClose(): void {
    this.replay.cancel();
    this.replayBusy.set(false);
    this.closed.emit();
  }

  copyText(text: string): void {
    void navigator.clipboard?.writeText(text);
  }

  inverseScramble(scramble: string): string {
    return this.cube.inverseScrambleNotation(scramble);
  }

  retrySolve(solve: Solve): void {
    const sessionId = solve.sessionId ?? this.contextSessionId();
    const q: Record<string, string> = {
      launchScramble: solve.scramble,
    };
    if (typeof sessionId === 'number') {
      q['launchSession'] = String(sessionId);
    }
    if (solve.scrambleType) {
      q['launchType'] = solve.scrambleType;
    }
    void this.router.navigate(['/'], { queryParams: q });
  }

  replaySolve(solve: Solve): void {
    if (!solve.moveTrace) {
      return;
    }
    this.replayBusy.set(true);
    const ok = this.replay.startReplay(solve.scramble, solve.moveTrace, () => {
      this.replayBusy.set(false);
    });
    if (!ok) {
      this.replayBusy.set(false);
    }
  }

  async deleteSolve(solve: Solve): Promise<void> {
    if (!solve.id || !confirm(this.t('deleteThisSolve'))) {
      return;
    }
    await this.store.deleteSolve(solve.id);
    this.state.solves.set(this.store.getSolves());
    this.replay.cancel();
    this.replayBusy.set(false);
    this.deleted.emit();
  }
}
