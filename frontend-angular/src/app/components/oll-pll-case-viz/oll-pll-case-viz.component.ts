import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { getOllFace21, pllVizFromCstimer } from '../../lib/cstimer-ll-viz';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { ollMetaByIndex } from '../../data/oll-cases';
import { pllNameByIndex as pllNameFn } from '../../data/pll-cases';

@Component({
  selector: 'app-oll-pll-case-viz',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (caseIndex() === null) {
      <div class="empty">No case — generate an OLL/PLL scramble.</div>
    } @else if (kind() === 'oll') {
      <div class="card oll">
        <div class="title-row">
          <span class="badge">OLL</span>
          <span class="name">{{ ollTitle() }}</span>
        </div>
        <p class="sub">Yellow top, F2L solved (csTimer LL view).</p>
        @if (ollImgUrl(); as src) {
          <img
            class="ll-viz"
            [src]="src"
            width="210"
            height="210"
            [attr.alt]="ollTitle() + ' OLL last-layer shape'"
            loading="lazy"
          />
        } @else {
          <div class="empty small">csTimer scripts not loaded.</div>
        }
      </div>
    } @else {
      <div class="card pll">
        <div class="title-row">
          <span class="badge pll">PLL</span>
          <span class="name">{{ pllName() }}</span>
        </div>
        <p class="sub">Yellow U; only LL unsolved (csTimer LL view).</p>
        @if (pllImgUrl(); as src) {
          <img
            class="ll-viz"
            [src]="src"
            width="210"
            height="210"
            [attr.alt]="pllName() + ' PLL last-layer shape'"
            loading="lazy"
          />
        } @else {
          <div class="empty small">csTimer scripts not loaded.</div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .empty {
      padding: 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
      background: var(--hover-bg);
      border-radius: 10px;
      border: 1px dashed var(--border-color);
    }
    .empty.small { padding: 10px; font-size: 12px; }
    .card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      max-width: 320px;
    }
    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .sub {
      margin: 0 0 10px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: #e7f1ff;
      color: #0d47a1;
    }
    .badge.pll { background: #fff3e0; color: #e65100; }
    .name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .ll-viz {
      display: block;
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }
  `]
})
export class OllPllCaseVizComponent {
  readonly kind = input.required<'oll' | 'pll'>();
  readonly caseIndex = input<number | null>(null);

  readonly pllName = computed(() => {
    const i = this.caseIndex();
    return i === null ? '' : pllNameFn(i);
  });

  readonly ollTitle: Signal<string> = computed(() => {
    const i = this.caseIndex();
    if (i === null) {
      return '';
    }
    return ollMetaByIndex(i)?.cstimerName ?? `OLL #${i}`;
  });

  readonly ollFace: Signal<string | null> = computed(() => {
    const i = this.caseIndex();
    if (i === null || this.kind() !== 'oll') {
      return null;
    }
    return getOllFace21(i);
  });

  readonly pllFace = computed(() => {
    const i = this.caseIndex();
    if (i === null || this.kind() !== 'pll') {
      return null;
    }
    const v = pllVizFromCstimer(i);
    if (!v || v.face.length < 21) {
      return null;
    }
    return { face: v.face.slice(0, 21), arrows: v.arrows };
  });

  /** csTimer llImage-equivalent SVG as data URL (image.js llImage.drawImage). */
  readonly ollImgUrl = computed(() => {
    const face = this.ollFace();
    if (!face) {
      return '';
    }
    return buildLlImageDataUrl(face);
  });

  readonly pllImgUrl = computed(() => {
    const pf = this.pllFace();
    if (!pf) {
      return '';
    }
    return buildLlImageDataUrl(pf.face, pf.arrows);
  });
}
