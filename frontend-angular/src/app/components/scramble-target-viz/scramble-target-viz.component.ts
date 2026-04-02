import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CubeState } from '../../services/state.service';

/** WCA-style sticker colors (facelet names from CubeState) */
const STICKER_CSS: Record<string, string> = {
  white: '#ffffff',
  yellow: '#ffd500',
  red: '#b90000',
  orange: '#ff5900',
  green: '#009b48',
  blue: '#0045ad'
};

type FaceId = 'U' | 'L' | 'F' | 'R' | 'B' | 'D';

@Component({
  selector: 'app-scramble-target-viz',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="viz-wrap">
      <p class="caption">
        Unfolded net (csTimer-style tools layout: U on top, L–F–R–B middle row, D below)
      </p>
      @if (!cubeState()) {
        <div class="placeholder">No scramble target — generate a scramble first.</div>
      } @else {
        <div class="net" aria-label="Scramble target cube net">
          <!-- row 1: gap, U, gap, gap -->
          <div class="net-cell empty"></div>
          <div class="net-cell face-slot">
            <span class="face-label">U</span>
            <div class="face">
              @for (c of stickerColors('U'); track $index) {
                <span class="sticker" [style.background]="c"></span>
              }
            </div>
          </div>
          <div class="net-cell empty"></div>
          <div class="net-cell empty"></div>
          <!-- row 2: L F R B -->
          @for (fid of midFaces; track fid) {
            <div class="net-cell face-slot">
              <span class="face-label">{{ fid }}</span>
              <div class="face">
                @for (c of stickerColors(fid); track $index) {
                  <span class="sticker" [style.background]="c"></span>
                }
              </div>
            </div>
          }
          <!-- row 3: gap, D, gap, gap -->
          <div class="net-cell empty"></div>
          <div class="net-cell face-slot">
            <span class="face-label">D</span>
            <div class="face">
              @for (c of stickerColors('D'); track $index) {
                <span class="sticker" [style.background]="c"></span>
              }
            </div>
          </div>
          <div class="net-cell empty"></div>
          <div class="net-cell empty"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .viz-wrap {
      overflow-x: auto;
    }
    .caption {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .placeholder {
      padding: 28px;
      text-align: center;
      color: var(--text-muted);
      background: var(--hover-bg);
      border: 2px dashed var(--border-color);
      border-radius: 10px;
      font-size: 14px;
    }
    .net {
      display: grid;
      grid-template-columns: repeat(4, var(--st));
      grid-template-rows: repeat(3, var(--st));
      gap: 3px;
      width: fit-content;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 10px;
      --st: min(22vw, 92px);
    }
    :global(.theme-black) .net {
      background: #000;
    }
    .net-cell.empty {
      min-height: 0;
    }
    .face-slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    .face-label {
      font-size: 11px;
      font-weight: 700;
      color: #adb5bd;
      letter-spacing: 0.06em;
    }
    .face {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      width: var(--st);
      height: var(--st);
      gap: 2px;
      padding: 2px;
      background: #000;
      border-radius: 4px;
    }
    .sticker {
      display: block;
      border-radius: 2px;
      min-width: 0;
      min-height: 0;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.35);
    }
  `]
})
export class ScrambleTargetVizComponent {
  /** Cube state after applying the scramble (target to match). */
  cubeState = input<CubeState | null>(null);

  readonly midFaces: FaceId[] = ['L', 'F', 'R', 'B'];

  stickerColors(face: FaceId): string[] {
    const state = this.cubeState();
    if (!state) {
      return Array(9).fill('#495057');
    }
    return state[face].map(s => STICKER_CSS[s] ?? '#6c757d');
  }
}
