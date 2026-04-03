import { Component, inject, signal, computed, ChangeDetectionStrategy, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../services/i18n.service';
import { BestSolveService, type CaseBestSolve } from '../../services/best-solve.service';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { getOllFace21, pllVizFromCstimer } from '../../lib/cstimer-ll-viz';
import { CaseType } from '../../data/best-solve-data';
import { AppModalComponent } from '../shared/app-modal.component';

interface TableRow {
  caseType: CaseType;
  caseIndex: number;
  selectedSolve: number;
  execTarget: number | null;
  execBest: number | null;
}

@Component({
  selector: 'app-best-solve-suggestions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AppModalComponent],
  template: `
    <app-modal
      [isVisible]="isVisible()"
      [title]="t('bestSolveSuggestions')"
      [maxWidth]="'800px'"
      (closed)="onClose()"
    >
      <div class="modal-filters">
        <label>
          {{ t('caseType') }}
          <select [value]="filterCaseType()" (change)="onFilterCaseTypeChange($event)">
            <option value="oll">{{ t('oll') }}</option>
            <option value="pll">{{ t('pll') }}</option>
          </select>
        </label>
        <label>
          {{ t('caseIndex') }}
          <input type="number" [value]="filterCaseIndex()" (change)="onFilterCaseIndexChange($event)" min="1" max="57" />
        </label>
      </div>
      <div class="modal-body">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ t('case') }}</th>
              <th>{{ t('caseIndex') }}</th>
              <th>{{ t('algorithms') }}</th>
              <th>{{ t('selected') }}</th>
              <th>{{ t('target') }}</th>
              <th>{{ t('best') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filteredRows(); track row.caseType + '-' + row.caseIndex) {
              <tr (dblclick)="onRowDoubleClick(row)">
                <td>
                  @if (getCaseImgUrl(row.caseType, row.caseIndex); as imgUrl) {
                    <img [src]="imgUrl" alt="Case" class="case-img" />
                  }
                </td>
                <td>{{ row.caseIndex }}</td>
                <td>
                  <select class="alg-select" [value]="row.selectedSolve" (change)="onAlgorithmChange(row, $event)">
                    @for (alg of getAlgorithms(row.caseType, row.caseIndex); track $index) {
                      <option [value]="$index">{{ $index + 1 }}: {{ alg }}</option>
                    }
                  </select>
                </td>
                <td>{{ getAlgorithms(row.caseType, row.caseIndex)[row.selectedSolve] }}</td>
                <td>
                  <input type="number" class="target-input" [value]="row.execTarget ?? ''"
                    (change)="onExecTargetChange(row, $event)" placeholder="ms" />
                </td>
                <td>{{ row.execBest !== null ? formatMs(row.execBest) : '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (filteredRows().length === 0) {
          <p class="empty">{{ t('noRecords') }}</p>
        }
      </div>
    </app-modal>
  `,
  styles: [`
    :host { display: block; }
    .modal-filters { display: flex; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
    .modal-filters label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
    .modal-filters select, .modal-filters input { padding: 6px 10px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-primary); font-size: 13px; }
    .modal-body { padding: 16px; overflow: auto; max-height: 60vh; }
    .tbl { width: 100%; border-collapse: collapse; }
    .tbl th, .tbl td { padding: 8px; text-align: left; border-bottom: 1px solid var(--border-color); }
    .tbl th { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
    .case-img { width: 32px; height: 32px; object-fit: contain; }
    .alg-select { padding: 4px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-primary); font-size: 12px; max-width: 150px; }
    .target-input { padding: 4px; border-radius: 4px; border: 1px solid var(--input-border); background: var(--input-bg); color: var(--text-primary); font-size: 12px; width: 70px; }
    .empty { color: var(--text-muted); text-align: center; padding: 20px; }
  `]
})
export class BestSolveSuggestionsComponent {
  private readonly bestSolveService = inject(BestSolveService);
  private readonly i18n = inject(I18nService);

  isVisible = input<boolean>(false);
  initialCaseType = input<CaseType>('oll');
  initialCaseIndex = input<number | null>(null);

  filterCaseType = signal<CaseType>('oll');
  filterCaseIndex = signal<number | null>(null);

  constructor() {
    // Watch for input changes and update filters
    effect(() => {
      const type = this.initialCaseType();
      const index = this.initialCaseIndex();
      if (this.isVisible() && index !== null) {
        this.filterCaseType.set(type);
        this.filterCaseIndex.set(index);
      }
    });
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly allRows = computed((): TableRow[] => {
    const rows: TableRow[] = [];

    // OLL cases 1-57
    for (let i = 1; i <= 57; i++) {
      if (this.bestSolveService.hasAlgorithms('oll', i)) {
        rows.push({
          caseType: 'oll',
          caseIndex: i,
          selectedSolve: this.bestSolveService.getSelectedSolve('oll', i),
          execTarget: this.bestSolveService.getExecTarget('oll', i),
          execBest: this.bestSolveService.getExecBest('oll', i, [])
        });
      }
    }

    // PLL cases 0-20
    for (let i = 0; i <= 20; i++) {
      if (this.bestSolveService.hasAlgorithms('pll', i)) {
        rows.push({
          caseType: 'pll',
          caseIndex: i,
          selectedSolve: this.bestSolveService.getSelectedSolve('pll', i),
          execTarget: this.bestSolveService.getExecTarget('pll', i),
          execBest: this.bestSolveService.getExecBest('pll', i, [])
        });
      }
    }

    return rows;
  });

  readonly filteredRows = computed((): TableRow[] => {
    const type = this.filterCaseType();
    const index = this.filterCaseIndex();
    return this.allRows().filter(row => {
      if (row.caseType !== type) return false;
      if (index !== null && row.caseIndex !== index) return false;
      return true;
    });
  });

  getAlgorithms(type: CaseType, index: number): string[] {
    return this.bestSolveService.getAlgorithms(type, index) ?? [];
  }

  getCaseImgUrl(type: CaseType, index: number): string | null {
    if (type === 'oll') {
      const data = getOllFace21(index);
      return data ? buildLlImageDataUrl(data) : null;
    } else {
      const data = pllVizFromCstimer(index);
      return data ? buildLlImageDataUrl(data.face, data.arrows) : null;
    }
  }

  formatMs(ms: number): string {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(2) + 's';
    }
    return ms + 'ms';
  }

  onFilterCaseTypeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CaseType;
    this.filterCaseType.set(value);
  }

  onFilterCaseIndexChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterCaseIndex.set(value ? parseInt(value, 10) : null);
  }

  onAlgorithmChange(row: TableRow, event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.bestSolveService.setSelectedSolve(row.caseType, row.caseIndex, value);
  }

  onExecTargetChange(row: TableRow, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const target = value ? parseInt(value, 10) : null;
    this.bestSolveService.setExecTarget(row.caseType, row.caseIndex, target);
  }

  onRowDoubleClick(row: TableRow): void {
    // Could open detail modal in the future
  }

  onClose(): void {
    // The parent will handle closing via the (closed) event
  }
}