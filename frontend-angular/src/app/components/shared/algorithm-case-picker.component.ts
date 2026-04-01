import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppModalComponent } from '../shared/app-modal.component';
import { I18nService } from '../../services/i18n.service';

export interface AlgorithmCase {
  index: number;
  name: string;
  imgUrl?: string | null;
}

export interface AlgorithmGroup {
  id?: string;
  title: string;
  cases: AlgorithmCase[];
}

@Component({
  selector: 'app-algorithm-case-picker',
  standalone: true,
  imports: [CommonModule, AppModalComponent],
  template: `
    <div class="alg-picker">
      <div class="mode-row">
        <label class="mode-label">
          <input
            type="radio"
            [name]="radioName"
            [checked]="mode === 'full'"
            (change)="modeChange.emit('full')"
          />
          {{ t('full') }} {{ title }} {{ t('set') }} ({{ allIndices.length }} {{ t('cases') }})
        </label>
        <label class="mode-label">
          <input
            type="radio"
            [name]="radioName"
            [checked]="mode === 'subset'"
            (change)="modeChange.emit('subset')"
          />
          {{ t('customSubset') }}
        </label>
      </div>
      @if (mode === 'subset' && !inline) {
        <div class="subset-bar">
          <button type="button" class="btn primary" (click)="openModal()">{{ t('chooseCases') }}</button>
          <span class="count">{{ enabledIndices.size }} / {{ allIndices.length }} {{ t('selected') }}</span>
        </div>
      }
    </div>

    @if (inline) {
      <div class="modal-toolbar inline-toolbar">
        <button type="button" class="btn" (click)="selectAll.emit()">{{ t('selectAll') }}</button>
        <button type="button" class="btn" (click)="clearAll.emit()">{{ t('clearAll') }}</button>
      </div>
      <div class="inline-body">
        <ng-container *ngTemplateOutlet="gridTemplate"></ng-container>
      </div>
    } @else if (modalOpen()) {
      <app-modal
        [isVisible]="true"
        [title]="title + ' ' + t('casePool')"
        maxWidth="920px"
        theme="light"
        [noPadding]="true"
        (closed)="closeModal()">
        <div class="modal-toolbar">
          <button type="button" class="btn" (click)="selectAll.emit()">{{ t('selectAll') }}</button>
          <button type="button" class="btn" (click)="clearAll.emit()">{{ t('clearAll') }}</button>
        </div>
        <div class="modal-body-scroll">
          <ng-container *ngTemplateOutlet="gridTemplate"></ng-container>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn primary" (click)="closeModal()">{{ t('done') }}</button>
        </div>
      </app-modal>
    }

    <ng-template #gridTemplate>
      @if (groups.length > 0) {
        @for (g of groups; track g.id || g.title) {
          <section class="group">
            <header class="group-head">
              <span class="group-title">{{ g.title }}</span>
              <button type="button" class="btn tiny" (click)="selectGroup.emit(g)">{{ t('all') }}</button>
              <button type="button" class="btn tiny" (click)="clearGroup.emit(g)">{{ t('none') }}</button>
            </header>
            <div class="case-grid">
              @for (c of g.cases; track c.index) {
                <ng-container *ngTemplateOutlet="tileTemplate; context: { $implicit: c }"></ng-container>
              }
            </div>
          </section>
        }
      } @else {
        <div class="case-grid">
          @for (c of cases; track c.index) {
            <ng-container *ngTemplateOutlet="tileTemplate; context: { $implicit: c }"></ng-container>
          }
        </div>
      }
    </ng-template>

    <ng-template #tileTemplate let-c>
      <label class="case-tile" [class.on]="enabledIndices.has(c.index)">
        <input
          class="sr-only"
          type="checkbox"
          [checked]="enabledIndices.has(c.index)"
          (change)="toggleCase.emit({index: c.index, checked: $any($event.target).checked})"
        />
        @if (c.imgUrl) {
          <img
            class="ll-thumb"
            [src]="c.imgUrl"
            width="120"
            height="120"
            [attr.alt]="c.name + ' shape'"
            loading="lazy"
          />
        } @else {
          <div class="ll-fallback">…</div>
        }
        <span class="case-name">{{ c.name }}</span>
      </label>
    </ng-template>
  `,
  styles: [`
    .alg-picker { font-size: 13px; color: var(--text-primary); }
    .mode-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 8px;
    }
    .mode-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .subset-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    .btn {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
      border: 1px solid var(--input-border);
      background: var(--card-bg);
      color: var(--text-primary);
      cursor: pointer;
    }
    .btn.primary {
      background: #fd7e14;
      border-color: #fd7e14;
      color: #fff;
    }
    .btn.primary:hover { filter: brightness(0.95); }
    .count { font-size: 12px; color: var(--text-muted); }

    .modal-toolbar {
      padding: 12px 18px;
      background: var(--hover-bg);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
    }
    .inline-toolbar { border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color); }
    .modal-body-scroll { padding: 18px; overflow-y: auto; background: var(--hover-bg); }
    .inline-body { padding: 0; background: transparent; }

    .case-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .case-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--card-bg);
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .case-tile:hover { border-color: var(--border-color); transform: translateY(-1px); }
    .case-tile.on { border-color: #fd7e14; background: var(--card-bg); }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0;
    }
    .ll-thumb { width: 100px; height: 100px; object-fit: contain; margin-bottom: 8px; border-radius: 4px; }
    .ll-fallback { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background: var(--hover-bg); color: var(--text-muted); border-radius: 4px; margin-bottom: 8px; font-size: 24px; }
    .case-name { font-size: 12px; font-weight: 600; text-align: center; color: var(--text-primary); }

    .group { margin-bottom: 24px; }
    .group-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
    .group-title { font-size: 15px; font-weight: 600; color: var(--text-secondary); }
    .btn.tiny { padding: 2px 8px; font-size: 11px; }

    .modal-foot {
      padding: 14px 18px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      background: var(--card-bg);
    }
  `]
})
export class AlgorithmCasePickerComponent {
  private i18n = inject(I18nService);

  @Input() title = 'Cases';
  @Input() radioName = 'caseMode';
  @Input() mode: 'full' | 'subset' = 'full';
  @Input() cases: AlgorithmCase[] = [];
  @Input() groups: AlgorithmGroup[] = [];
  @Input() enabledIndices: ReadonlySet<number> = new Set<number>();
  @Input() allIndices: readonly number[] = [];
  @Input() inline = false;

  @Output() modeChange = new EventEmitter<'full' | 'subset'>();
  @Output() toggleCase = new EventEmitter<{index: number; checked: boolean}>();
  @Output() selectAll = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() selectGroup = new EventEmitter<AlgorithmGroup>();
  @Output() clearGroup = new EventEmitter<AlgorithmGroup>();

  modalOpen = signal(false);

  t(key: string): string {
    return this.i18n.t(key);
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }
}