import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { computeTrainingSummary, filterBySession, formatMs, type CaseStatItem } from '../../lib/analysis-selectors';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { getOllFace21, pllVizFromCstimer, getZbllFace21 } from '../../lib/cstimer-ll-viz';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';

@Component({
  selector: 'app-analysis-training-statistics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Cases Stats</h2>
    <div class="training-head">
      <label>
        Case Type
        <select [value]="trainingCaseType()" (change)="onTrainingCaseTypeChange($event)">
          <option value="oll">OLL</option>
          <option value="pll">PLL</option>
          <option value="zbll">ZBLL</option>
          <option value="f2l">F2L</option>
        </select>
      </label>
    </div>
    <table class="tbl">
      <thead>
        <tr>
          <th>Case</th>
          <th class="num">N</th>
          <th class="num">Insp</th>
          <th class="num">Exec</th>
          <th class="num">Turns</th>
          <th class="num">TPS</th>
        </tr>
      </thead>
      <tbody>
        @for (x of trainingCaseRows(); track x.key) {
          <tr>
            <td>
              <div class="case-label">
                @if (getCaseImgUrl(trainingCaseType(), x.key); as imgUrl) {
                  <img [src]="imgUrl" alt="Case {{x.key}}" class="case-img" />
                }
                <span>#{{ x.key }}</span>
              </div>
            </td>
            <td class="num">{{ x.count }}</td>
            <td class="num">{{ fm(x.avgInspMs) }}</td>
            <td class="num">{{ fm(x.avgExecMs) }}</td>
            <td class="num">{{ x.avgTurns ?? '—' }}</td>
            <td class="num">{{ x.tps ?? '—' }}</td>
          </tr>
        }
      </tbody>
    </table>
    @if (trainingCaseRows().length === 0) {
      <p class="empty">No {{ trainingCaseType().toUpperCase() }} records in current scope.</p>
    }
    <div class="training-type-summary">
      <h3>Type Distribution</h3>
      <ul class="list">
        @for (x of training().byType; track x.key) {
          <li><span>{{ x.key }}</span><span>{{ x.count }} / {{ fm(x.mean) }}</span></li>
        }
      </ul>
    </div>
  `,
  styles: [`
    h2 { margin: 0 0 12px; font-size: 18px; }
    h3 { margin: 12px 0 8px; font-size: 15px; }
    .training-head { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 10px; }
    .training-head label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #6c757d; }
    .training-head select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d0d7de; font-size: 13px; }
    .training-type-summary { margin-top: 12px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f3f5; }
    .empty { color: #868e96; margin: 0; }
    .case-label { display: flex; align-items: center; gap: 8px; }
    .case-img { width: 32px; height: 32px; object-fit: contain; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
  `],
})
export class AnalysisTrainingStatisticsComponent {
  private readonly store = inject(LocalSolveStoreService);
  private readonly cstimer = inject(CstimerScrambleService);

  readonly sessionId = input<number | 'all'>('all');

  readonly trainingCaseType = signal<'oll' | 'pll' | 'zbll' | 'f2l'>('oll');

  readonly solves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });

  readonly sessionSolves = computed(() => filterBySession(this.solves(), this.sessionId()));

  readonly training = computed(() => computeTrainingSummary(this.sessionSolves()));

  readonly trainingCaseRows = computed(() => {
    const type = this.trainingCaseType();
    let source: CaseStatItem[] = [];
    if (type === 'oll') source = this.training().ollCases;
    else if (type === 'pll') source = this.training().pllCases;
    else if (type === 'zbll') source = this.training().zbllCases;
    else if (type === 'f2l') source = this.training().f2lCases;

    return [...source].sort((a, b) => {
      const aExec = a.avgExecMs ?? -1;
      const bExec = b.avgExecMs ?? -1;
      if (bExec !== aExec) return bExec - aExec;
      return b.count - a.count;
    });
  });

  fm(ms: number | null | undefined): string {
    return formatMs(ms);
  }

  getCaseImgUrl(type: string, key: string): string | null {
    const index = parseInt(key, 10);
    if (isNaN(index)) return null;

    if (type === 'oll') {
      const data = getOllFace21(index);
      return data ? buildLlImageDataUrl(data) : null;
    } else if (type === 'pll') {
      const data = pllVizFromCstimer(index);
      return data ? buildLlImageDataUrl(data.face, data.arrows) : null;
    } else if (type === 'zbll') {
      const data = getZbllFace21(index);
      return data ? buildLlImageDataUrl(data) : null;
    } else if (type === 'f2l') {
      return this.cstimer.getLsll2ImageDataUrl(index) ?? null;
    }
    return null;
  }

  onTrainingCaseTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as 'oll' | 'pll' | 'zbll' | 'f2l';
    this.trainingCaseType.set(v);
  }
}
