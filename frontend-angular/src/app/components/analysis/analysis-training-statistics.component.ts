import { Component, computed, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';
import { computeTrainingSummary, filterBySession, formatMs, type CaseStatItem } from '../../lib/analysis-selectors';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { getOllFace21, pllVizFromCstimer, getZbllFace21 } from '../../lib/cstimer-ll-viz';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';

type SortColumn = 'count' | 'insp' | 'exec' | 'turns' | 'tps';
type SortDirection = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 10;

@Component({
  selector: 'app-analysis-training-statistics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <h2>{{ t('caseStats') }}</h2>
    <div class="training-head">
      <label>
        {{ t('caseType') }}
        <select [value]="trainingCaseType()" (change)="onTrainingCaseTypeChange($event)">
          <option value="oll">{{ t('oll') }}</option>
          <option value="pll">{{ t('pll') }}</option>
          <option value="zbll">{{ t('zbll') }}</option>
          <option value="f2l">{{ t('f2l') }}</option>
        </select>
      </label>
      <label>
        {{ t('pageSize') }}
        <select [value]="pageSize()" (change)="onPageSizeChange($event)">
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </label>
    </div>
    <table class="tbl">
      <thead>
        <tr>
          <th>{{ t('case') }}</th>
          <th class="num sortable" (click)="onSort('count')">
            {{ t('solveCount') }}
            @if (sortColumn() === 'count') {
              <span class="sort-icon">{{ sortDirection() === 'desc' ? '▼' : '▲' }}</span>
            }
          </th>
          <th class="num sortable" (click)="onSort('insp')">
            {{ t('insp') }}
            @if (sortColumn() === 'insp') {
              <span class="sort-icon">{{ sortDirection() === 'desc' ? '▼' : '▲' }}</span>
            }
          </th>
          <th class="num sortable" (click)="onSort('exec')">
            {{ t('exec') }}
            @if (sortColumn() === 'exec') {
              <span class="sort-icon">{{ sortDirection() === 'desc' ? '▼' : '▲' }}</span>
            }
          </th>
          <th class="num sortable" (click)="onSort('turns')">
            {{ t('turns') }}
            @if (sortColumn() === 'turns') {
              <span class="sort-icon">{{ sortDirection() === 'desc' ? '▼' : '▲' }}</span>
            }
          </th>
          <th class="num sortable" (click)="onSort('tps')">
            {{ t('tps') }}
            @if (sortColumn() === 'tps') {
              <span class="sort-icon">{{ sortDirection() === 'desc' ? '▼' : '▲' }}</span>
            }
          </th>
        </tr>
      </thead>
      <tbody>
        @for (x of paginatedRows(); track x.key) {
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
          @if (x.avgExecMs !== null) {
            <tr class="scramble-row">
              <td colspan="6" class="scramble-cell">
                <span class="scramble-tag">{{ scrambleForCase()[x.key] }}</span>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>
    @if (trainingCaseRows().length === 0) {
      <p class="empty">{{ t('noRecordsInScope') }} {{ trainingCaseType().toUpperCase() }}</p>
    }
    @if (totalPages() > 1) {
      <div class="pagination">
        <button type="button" class="btn-page" (click)="onPageChange(1)" [disabled]="currentPage() === 1">««</button>
        <button type="button" class="btn-page" (click)="onPageChange(currentPage() - 1)" [disabled]="currentPage() === 1">«</button>
        <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
        <button type="button" class="btn-page" (click)="onPageChange(currentPage() + 1)" [disabled]="currentPage() === totalPages()">»</button>
        <button type="button" class="btn-page" (click)="onPageChange(totalPages())" [disabled]="currentPage() === totalPages()">»»</button>
      </div>
    }
    <div class="training-type-summary">
      <h3>{{ t('typeDistribution') }}</h3>
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
    .training-head label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); }
    .training-head select { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--input-border); font-size: 13px; background: var(--input-bg); color: var(--text-primary); }
    .training-type-summary { margin-top: 12px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-color); }
    .empty { color: var(--text-muted); margin: 0; }
    .case-label { display: flex; align-items: center; gap: 8px; }
    .case-img { width: 32px; height: 32px; object-fit: contain; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { background: var(--hover-bg); }
    .sort-icon { margin-left: 4px; font-size: 10px; }
    .scramble-row { background: var(--hover-bg); }
    .scramble-cell { padding: 4px 8px 8px !important; }
    .scramble-tag { display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; background: var(--hover-bg); border-radius: 4px; font-size: 12px; font-family: monospace; color: var(--text-primary); }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin: 16px 0; }
    .btn-page { padding: 6px 12px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-primary); border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn-page:hover:not(:disabled) { background: var(--hover-bg); }
    .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-info { font-size: 13px; color: var(--text-secondary); }
  `],
})
export class AnalysisTrainingStatisticsComponent {
  private readonly store = inject(LocalSolveStoreService);
  private readonly cstimer = inject(CstimerScrambleService);
  private readonly i18n = inject(I18nService);

  readonly sessionId = input<number | 'all'>('all');

  readonly trainingCaseType = signal<'oll' | 'pll' | 'zbll' | 'f2l'>('oll');
  readonly sortColumn = signal<SortColumn>('count');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly pageSize = signal<number>(DEFAULT_PAGE_SIZE);
  readonly currentPage = signal<number>(1);

  t(key: string): string {
    return this.i18n.t(key);
  }

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

    const col = this.sortColumn();
    const dir = this.sortDirection();

    return [...source].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (col) {
        case 'count':
          aVal = a.count;
          bVal = b.count;
          break;
        case 'insp':
          aVal = a.avgInspMs ?? -1;
          bVal = b.avgInspMs ?? -1;
          break;
        case 'exec':
          aVal = a.avgExecMs ?? -1;
          bVal = b.avgExecMs ?? -1;
          break;
        case 'turns':
          aVal = a.avgTurns ?? -1;
          bVal = b.avgTurns ?? -1;
          break;
        case 'tps':
          aVal = a.tps ?? -1;
          bVal = b.tps ?? -1;
          break;
        default:
          aVal = a.count;
          bVal = b.count;
      }

      return dir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  });

  // Cache for scramble strings to avoid calling cstimer during change detection
  private scrambleCache = new Map<string, string>();

  readonly scrambleForCase = computed(() => {
    const type = this.trainingCaseType();
    const rows = this.trainingCaseRows();
    const cache = this.scrambleCache;

    // Pre-compute scrambles for current page items
    const result: Record<string, string> = {};
    for (const row of rows) {
      const key = row.key;
      if (!cache.has(key)) {
        const index = parseInt(key, 10);
        if (!isNaN(index)) {
          try {
            if (type === 'oll') {
              cache.set(key, this.cstimer.scrambleString('oll', 0, { cases: index }));
            } else if (type === 'pll') {
              cache.set(key, this.cstimer.scrambleString('pll', 0, { cases: index }));
            } else if (type === 'f2l') {
              cache.set(key, this.cstimer.scrambleString('f2l', 0, { cases: index }));
            }
          } catch {
            cache.set(key, '');
          }
        }
      }
      result[key] = cache.get(key) ?? '';
    }
    return result;
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.trainingCaseRows().length / this.pageSize()) || 1;
  });

  readonly paginatedRows = computed(() => {
    const rows = this.trainingCaseRows();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
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

  getScrambleForCase(type: string, key: string): string {
    const index = parseInt(key, 10);
    if (isNaN(index)) return '';
    try {
      if (type === 'oll') {
        return this.cstimer.scrambleString('oll', 0, { cases: index });
      } else if (type === 'pll') {
        return this.cstimer.scrambleString('pll', 0, { cases: index });
      } else if (type === 'f2l') {
        return this.cstimer.scrambleString('f2l', 0, { cases: index });
      }
    } catch {
      return '';
    }
    return '';
  }

  onTrainingCaseTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value as 'oll' | 'pll' | 'zbll' | 'f2l';
    this.trainingCaseType.set(v);
    this.currentPage.set(1);
    this.scrambleCache.clear();
  }

  onSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  onPageSizeChange(event: Event): void {
    const v = parseInt((event.target as HTMLSelectElement).value, 10);
    this.pageSize.set(v);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    const total = this.totalPages();
    if (page >= 1 && page <= total) {
      this.currentPage.set(page);
    }
  }
}