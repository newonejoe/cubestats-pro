import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { llCharColor } from '../../lib/cstimer-ll-viz';

/**
 * csTimer llImage layout: yellow-top U (3×3) + L/F/R/B top rows (3 stickers each).
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/tools/image.js (llImage.drawImage)
 */
@Component({
  selector: 'app-last-layer-net',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (face21() && face21()!.length >= 21) {
      <div class="ll" [class.compact]="compact()" aria-label="Last layer: yellow U face and neighbours">
        <div class="u-band">
          <div class="u-wrap">
            @if (kind() === 'pll' && arrows().length) {
              <svg class="arr" viewBox="0 0 3 3" preserveAspectRatio="xMidYMid meet">
                @for (seg of pllLineSegments(); track $index) {
                  <line
                    [attr.x1]="seg.x1"
                    [attr.y1]="seg.y1"
                    [attr.x2]="seg.x2"
                    [attr.y2]="seg.y2"
                    stroke="#111"
                    stroke-width="0.08"
                    stroke-linecap="round"
                  />
                }
              </svg>
            }
            <div class="u-grid">
              @for (i of uIdx; track i) {
                <span class="st" [style.background]="colorAt(i)"></span>
              }
            </div>
          </div>
        </div>
        <div class="ring">
          @for (seg of ringSegs(); track $index) {
            <div class="seg">
              @for (j of [0, 1, 2]; track j) {
                <span class="st" [style.background]="colorAt(seg[j])"></span>
              }
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="placeholder">—</div>
    }
  `,
  styles: [`
    :host { display: inline-block; vertical-align: middle; }
    .ll {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px;
      background: #1a1a1a;
      border-radius: 8px;
      --sz: 14px;
    }
    .ll.compact { --sz: 10px; padding: 4px; gap: 2px; }
    .u-band { width: 100%; display: flex; justify-content: center; }
    .u-wrap {
      position: relative;
      display: inline-block;
    }
    .u-grid {
      display: grid;
      grid-template-columns: repeat(3, var(--sz));
      grid-template-rows: repeat(3, var(--sz));
      gap: 2px;
    }
    .ring {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      justify-content: center;
    }
    .seg {
      display: grid;
      grid-template-columns: repeat(3, var(--sz));
      gap: 2px;
    }
    .st {
      display: block;
      border-radius: 2px;
      width: var(--sz);
      height: var(--sz);
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
    }
    .arr {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .placeholder {
      width: 48px;
      height: 32px;
      background: #e9ecef;
      border-radius: 4px;
      color: #adb5bd;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class LastLayerNetComponent {
  /** 21-char string from getOLLImage / getPLLImage (first 9 = U, then L×3, F×3, R×3, B×3). */
  face21 = input<string | null>(null);
  /** Pairs of U-cell indices 0–8 for PLL arrows (csTimer). */
  arrows = input<number[][]>([]);
  kind = input<'oll' | 'pll'>('oll');
  compact = input(false);

  readonly uIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  ringSegs(): number[][] {
    const f = this.face21();
    if (!f || f.length < 21) {
      return [];
    }
    return [
      [9, 10, 11],
      [12, 13, 14],
      [15, 16, 17],
      [18, 19, 20]
    ];
  }

  colorAt(i: number): string {
    const f = this.face21();
    if (!f || i < 0 || i >= f.length) {
      return '#888';
    }
    return llCharColor(f[i]!);
  }

  pllLineSegments(): { x1: number; y1: number; x2: number; y2: number }[] {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const p of this.arrows()) {
      if (!p || p.length < 2) {
        continue;
      }
      const ax = (p[0] % 3) + 0.5;
      const ay = Math.floor(p[0] / 3) + 0.5;
      const bx = (p[1] % 3) + 0.5;
      const by = Math.floor(p[1] / 3) + 0.5;
      out.push({ x1: ax, y1: ay, x2: bx, y2: by });
    }
    return out;
  }
}
