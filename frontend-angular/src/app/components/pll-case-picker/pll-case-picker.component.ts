import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { PLL_CASES, ALL_PLL_INDICES } from '../../data/pll-cases';
import { pllVizFromCstimer } from '../../lib/cstimer-ll-viz';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';

@Component({
  selector: 'app-pll-case-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pll-picker">
      <div class="mode-row">
        <label class="mode-label">
          <input
            type="radio"
            name="pllMode"
            [checked]="state.pllSubsetMode() === 'full'"
            (change)="setMode('full')"
          />
          Full PLL set (21 cases)
        </label>
        <label class="mode-label">
          <input
            type="radio"
            name="pllMode"
            [checked]="state.pllSubsetMode() === 'subset'"
            (change)="setMode('subset')"
          />
          Custom subset
        </label>
      </div>
      @if (state.pllSubsetMode() === 'subset' && !inline()) {
        <div class="subset-bar">
          <button type="button" class="btn primary" (click)="openModal()">Choose cases…</button>
          <span class="count">{{ enabledCount() }} / {{ ALL_PLL_INDICES.length }} selected</span>
        </div>
      }
    </div>

    @if (inline()) {
      <div class="modal-toolbar inline-toolbar">
        <button type="button" class="btn" (click)="selectAll()">Select all</button>
        <button type="button" class="btn" (click)="clearAll()">Clear all</button>
      </div>
      <div class="inline-body">
        <div class="case-grid">
          @for (c of PLL_CASES; track c.index) {
            <label class="case-tile" [class.on]="isOn(c.index)">
              <input
                class="sr-only"
                type="checkbox"
                [checked]="isOn(c.index)"
                (change)="toggle(c.index, $any($event.target).checked)"
              />
              @if (pllImgUrl(c.index); as src) {
                <img
                  class="ll-thumb"
                  [src]="src"
                  width="120"
                  height="120"
                  [attr.alt]="c.name + ' PLL shape'"
                  loading="lazy"
                />
              } @else {
                <div class="ll-fallback">…</div>
              }
              <span class="case-name">{{ c.name }}</span>
            </label>
          }
        </div>
      </div>
    } @else if (modalOpen()) {
      <div class="backdrop" (click)="closeModal()"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pll-modal-title">
        <div class="modal-inner">
          <header class="modal-head">
            <h2 id="pll-modal-title">PLL case pool</h2>
            <button type="button" class="icon-close" (click)="closeModal()" aria-label="Close">×</button>
          </header>
          <div class="modal-toolbar">
            <button type="button" class="btn" (click)="selectAll()">Select all</button>
            <button type="button" class="btn" (click)="clearAll()">Clear all</button>
          </div>
          <div class="modal-body">
            <div class="case-grid">
              @for (c of PLL_CASES; track c.index) {
                <label class="case-tile" [class.on]="isOn(c.index)">
                  <input
                    class="sr-only"
                    type="checkbox"
                    [checked]="isOn(c.index)"
                    (change)="toggle(c.index, $any($event.target).checked)"
                  />
                  @if (pllImgUrl(c.index); as src) {
                    <img
                      class="ll-thumb"
                      [src]="src"
                      width="120"
                      height="120"
                      [attr.alt]="c.name + ' PLL shape'"
                      loading="lazy"
                    />
                  } @else {
                    <div class="ll-fallback">…</div>
                  }
                  <span class="case-name">{{ c.name }}</span>
                </label>
              }
            </div>
          </div>
          <footer class="modal-foot">
            <button type="button" class="btn primary" (click)="closeModal()">Done</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .pll-picker { font-size: 13px; color: #333; }
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
      background: #fd7e14;
      border-color: #fd7e14;
      color: #fff;
    }
    .btn.primary:hover { filter: brightness(0.95); }
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
      max-width: min(920px, 100%);
      max-height: min(90vh, 880px);
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
    .inline-toolbar {
      border-top: 1px solid #f1f3f5;
    }
    .inline-body {
      padding: 14px 0 0;
      max-height: min(72vh, 760px);
      overflow-y: auto;
    }
    .modal-foot {
      padding: 12px 18px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
    }
    .case-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
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
      border-color: #fd7e14;
      background: #fff8f0;
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
      font-size: 13px;
      font-weight: 600;
      color: #495057;
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
export class PllCasePickerComponent {
  readonly inline = input<boolean>(false);
  readonly state = inject(StateService);
  readonly PLL_CASES = PLL_CASES;
  readonly ALL_PLL_INDICES = ALL_PLL_INDICES;

  readonly modalOpen = signal(false);

  /** csTimer llImage-equivalent SVG as data URL (image.js llImage.drawImage). */
  pllImgUrl(index: number): string {
    const v = pllVizFromCstimer(index);
    if (!v || v.face.length < 21) {
      return '';
    }
    return buildLlImageDataUrl(v.face.slice(0, 21), v.arrows);
  }

  enabledCount(): number {
    return this.state.pllEnabledIndices().size;
  }

  isOn(index: number): boolean {
    return this.state.pllEnabledIndices().has(index);
  }

  openModal(): void {
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  setMode(mode: 'full' | 'subset'): void {
    this.state.pllSubsetMode.set(mode);
    this.state.persistPllSubsetPrefs();
    if (this.inline()) {
      this.closeModal();
      return;
    }
    if (mode === 'subset') {
      this.openModal();
    } else {
      this.closeModal();
    }
  }

  toggle(index: number, checked: boolean): void {
    const next = new Set(this.state.pllEnabledIndices());
    if (checked) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this.state.pllEnabledIndices.set(next);
    this.state.persistPllSubsetPrefs();
  }

  selectAll(): void {
    this.state.pllEnabledIndices.set(new Set(ALL_PLL_INDICES));
    this.state.persistPllSubsetPrefs();
  }

  clearAll(): void {
    this.state.pllEnabledIndices.set(new Set());
    this.state.persistPllSubsetPrefs();
  }
}
