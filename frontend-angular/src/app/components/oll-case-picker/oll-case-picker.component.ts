import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { OLL_GROUPS, ALL_OLL_INDICES } from '../../data/oll-cases';
import { getOllFace21 } from '../../lib/cstimer-ll-viz';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';

@Component({
  selector: 'app-oll-case-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="oll-picker">
      <div class="mode-row">
        <label class="mode-label">
          <input
            type="radio"
            name="ollMode"
            [checked]="state.ollSubsetMode() === 'full'"
            (change)="setMode('full')"
          />
          Full OLL set (58 csTimer indices, 0–57)
        </label>
        <label class="mode-label">
          <input
            type="radio"
            name="ollMode"
            [checked]="state.ollSubsetMode() === 'subset'"
            (change)="setMode('subset')"
          />
          Custom subset
        </label>
      </div>
      @if (state.ollSubsetMode() === 'subset') {
        <div class="subset-bar">
          <button type="button" class="btn primary" (click)="openModal()">Choose cases…</button>
          <span class="count">{{ enabledCount() }} / {{ ALL_OLL_INDICES.length }} selected</span>
        </div>
      }
    </div>

    @if (modalOpen()) {
      <div class="backdrop" (click)="closeModal()"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="oll-modal-title">
        <div class="modal-inner">
          <header class="modal-head">
            <h2 id="oll-modal-title">OLL case pool</h2>
            <button type="button" class="icon-close" (click)="closeModal()" aria-label="Close">×</button>
          </header>
          <div class="modal-toolbar">
            <button type="button" class="btn" (click)="selectAll()">Select all</button>
            <button type="button" class="btn" (click)="clearAll()">Clear all</button>
          </div>
          <div class="modal-body">
            @for (g of OLL_GROUPS; track g.id) {
              <section class="group">
                <header class="group-head">
                  <span class="group-title">{{ g.title }}</span>
                  <button type="button" class="btn tiny" (click)="selectGroup(g)">All</button>
                  <button type="button" class="btn tiny" (click)="clearGroup(g)">None</button>
                </header>
                <div class="case-grid">
                  @for (c of g.cases; track c.index) {
                    <label class="case-tile" [class.on]="isOn(c.index)">
                      <input
                        class="sr-only"
                        type="checkbox"
                        [checked]="isOn(c.index)"
                        (change)="toggle(c.index, $any($event.target).checked)"
                      />
                      @if (ollImgUrl(c.index); as src) {
                        <img
                          class="ll-thumb"
                          [src]="src"
                          width="120"
                          height="120"
                          [attr.alt]="c.cstimerName + ' OLL shape'"
                          loading="lazy"
                        />
                      } @else {
                        <div class="ll-fallback">…</div>
                      }
                      <span class="case-name">{{ c.cstimerName }}</span>
                    </label>
                  }
                </div>
              </section>
            }
          </div>
          <footer class="modal-foot">
            <button type="button" class="btn primary" (click)="closeModal()">Done</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .oll-picker { font-size: 13px; color: #333; }
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
      border: 1px solid #ced4da;
      background: #fff;
      cursor: pointer;
    }
    .btn.primary {
      background: #0d6efd;
      border-color: #0d6efd;
      color: #fff;
    }
    .btn.primary:hover { background: #0b5ed7; }
    .btn.tiny { padding: 4px 8px; font-size: 11px; }
    .count { font-size: 12px; color: #868e96; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1040;
    }
    .modal {
      position: fixed;
      inset: 0;
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      pointer-events: none;
    }
    .modal-inner {
      pointer-events: auto;
      background: #fff;
      border-radius: 14px;
      max-width: min(960px, 100%);
      max-height: min(90vh, 900px);
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 12px 48px rgba(0,0,0,0.2);
    }
    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid #e9ecef;
    }
    .modal-head h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .icon-close {
      border: none;
      background: transparent;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      color: #6c757d;
      padding: 0 4px;
    }
    .icon-close:hover { color: #212529; }
    .modal-toolbar {
      padding: 10px 18px;
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #f1f3f5;
    }
    .modal-body {
      overflow-y: auto;
      padding: 14px 18px;
      flex: 1;
    }
    .modal-foot {
      padding: 12px 18px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
    }
    .group { margin-bottom: 22px; }
    .group-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .group-title {
      font-weight: 600;
      color: #495057;
      flex: 1 1 auto;
    }
    .case-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }
    .case-tile {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px;
      border-radius: 10px;
      border: 1px solid #dee2e6;
      background: #fafbfc;
      cursor: pointer;
    }
    .case-tile.on {
      border-color: #86b7fe;
      background: #e7f1ff;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .case-name {
      font-size: 10px;
      text-align: center;
      color: #495057;
      line-height: 1.2;
    }
    .ll-thumb {
      display: block;
      width: 120px;
      height: auto;
      border-radius: 6px;
      background: #1a1a1a;
    }
    .ll-fallback {
      width: 120px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e9ecef;
      border-radius: 6px;
      color: #adb5bd;
    }
  `]
})
export class OllCasePickerComponent {
  readonly state = inject(StateService);
  readonly OLL_GROUPS = OLL_GROUPS;
  readonly ALL_OLL_INDICES = ALL_OLL_INDICES;

  readonly modalOpen = signal(false);

  /** csTimer llImage-equivalent SVG as data URL (image.js llImage.drawImage). */
  ollImgUrl(index: number): string {
    const face = getOllFace21(index);
    if (!face) {
      return '';
    }
    return buildLlImageDataUrl(face);
  }

  enabledCount(): number {
    return this.state.ollEnabledIndices().size;
  }

  isOn(index: number): boolean {
    return this.state.ollEnabledIndices().has(index);
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  setMode(mode: 'full' | 'subset'): void {
    this.state.ollSubsetMode.set(mode);
    this.state.persistOllSubsetPrefs();
    if (mode === 'subset') {
      this.openModal();
    } else {
      this.closeModal();
    }
  }

  toggle(index: number, checked: boolean): void {
    const next = new Set(this.state.ollEnabledIndices());
    if (checked) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this.state.ollEnabledIndices.set(next);
    this.state.persistOllSubsetPrefs();
  }

  selectAll(): void {
    this.state.ollEnabledIndices.set(new Set(ALL_OLL_INDICES));
    this.state.persistOllSubsetPrefs();
  }

  clearAll(): void {
    this.state.ollEnabledIndices.set(new Set());
    this.state.persistOllSubsetPrefs();
  }

  selectGroup(g: (typeof OLL_GROUPS)[number]): void {
    const next = new Set(this.state.ollEnabledIndices());
    for (const c of g.cases) {
      next.add(c.index);
    }
    this.state.ollEnabledIndices.set(next);
    this.state.persistOllSubsetPrefs();
  }

  clearGroup(g: (typeof OLL_GROUPS)[number]): void {
    const next = new Set(this.state.ollEnabledIndices());
    for (const c of g.cases) {
      next.delete(c.index);
    }
    this.state.ollEnabledIndices.set(next);
    this.state.persistOllSubsetPrefs();
  }
}
