import { Component, inject, signal, computed, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CubeService } from '../../services/cube.service';
import { StateService, CubeState } from '../../services/state.service';

// WCA standard colors
const COLORS: Record<string, string> = {
  'white': '#ffffff',
  'yellow': '#ffd500',
  'red': '#b90000',
  'orange': '#ff5900',
  'blue': '#0045ad',
  'green': '#009b48'
};

@Component({
  selector: 'app-virtual-cube',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cube-container">
      <div class="cube-faces">
        <!-- U face (top) -->
        <div class="face face-u">
          <div class="face-label">U</div>
          <div class="face-grid">
            @for (color of getFaceColors('U'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>

        <!-- Middle row: L, F, R, B -->
        <div class="face face-l">
          <div class="face-label">L</div>
          <div class="face-grid">
            @for (color of getFaceColors('L'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>

        <div class="face face-f">
          <div class="face-label">F</div>
          <div class="face-grid">
            @for (color of getFaceColors('F'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>

        <div class="face face-r">
          <div class="face-label">R</div>
          <div class="face-grid">
            @for (color of getFaceColors('R'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>

        <div class="face face-b">
          <div class="face-label">B</div>
          <div class="face-grid">
            @for (color of getFaceColors('B'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>

        <!-- D face (bottom) -->
        <div class="face face-d">
          <div class="face-label">D</div>
          <div class="face-grid">
            @for (color of getFaceColors('D'); track $index) {
              <div class="sticker" [style.background-color]="getColor(color)"></div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cube-container {
      padding: 16px;
      background: #1a1a2e;
      border-radius: 12px;
    }

    .cube-faces {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }

    .face {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .face-label {
      color: #888;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .face-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      background: #333;
      padding: 2px;
      border-radius: 4px;
    }

    .sticker {
      width: 24px;
      height: 24px;
      border-radius: 2px;
      border: 1px solid rgba(0,0,0,0.2);
    }

    /* Face arrangement - standard cube net */
    .face-u { order: 1; }
    .face-l { order: 2; }
    .face-f { order: 3; }
    .face-r { order: 4; }
    .face-b { order: 5; }
    .face-d { order: 6; }
  `]
})
export class VirtualCubeComponent {
  private cubeService = inject(CubeService);
  private state = inject(StateService);

  // Get cube state from either Bluetooth or generated state
  cubeState: Signal<CubeState> = computed(() => {
    const btState = this.state.btCubeState();
    if (btState) return btState;
    return this.state.cubeState();
  });

  getFaceColors(face: string): string[] {
    const state = this.cubeState();
    return state[face as keyof CubeState] || [];
  }

  getColor(colorName: string): string {
    return COLORS[colorName.toLowerCase()] || colorName;
  }
}
