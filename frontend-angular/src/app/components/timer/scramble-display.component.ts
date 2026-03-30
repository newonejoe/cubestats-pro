import { Component, inject, computed, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { StateService } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import {
  buildScrambleTwistHighlightHtml,
  escapeHtml,
} from '../../lib/scramble-twist-display';

@Component({
  selector: 'app-scramble-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scramble-controls-row">
      <div class="scramble-display">
        <div class="scramble-label">{{ t('scramble') }}</div>
        <div class="scramble-text"
             [class.with-progress]="status() === 'twisting' || status() === 'twisted'"
             [innerHTML]="scrambleHtml()">
        </div>
      </div>
      <div class="scramble-dropdown-container">
        <select class="scramble-type-select" [value]="scrambleType()" (change)="onScrambleTypeChange($event)">
          <option value="wca">WCA</option>
          <option value="cross">Cross</option>
          <option value="f2l">F2L</option>
          <option value="oll">OLL</option>
          <option value="pll">PLL</option>
        </select>
        @if (scrambleType() !== 'wca') {
          <div class="scramble-info">
            <span class="scramble-length-label">{{ getScrambleLengthLabel() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .scramble-controls-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
    }

    .scramble-display {
      text-align: left;
      flex: 1;
    }

    .scramble-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .scramble-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: #333;
      word-break: break-all;
      line-height: 1.5;
    }

    .scramble-text.with-progress {
      color: #495057;
    }

    :host ::ng-deep .scrm-seg {
      display: inline-block;
      margin-right: 0.35em;
    }

    :host ::ng-deep .scrm-done {
      color: #adb5bd;
      font-weight: 500;
    }

    :host ::ng-deep .scrm-todo {
      color: #212529;
    }

    :host ::ng-deep .scrm-cur {
      color: #0d6efd;
      font-weight: 700;
      background: #e7f1ff;
      padding: 0 0.1em;
      border-radius: 4px;
    }

    .scramble-dropdown-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }

    .scramble-type-select {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: #f8f9fa;
      font-size: 14px;
      color: #333;
      cursor: pointer;
    }

    .scramble-info {
      font-size: 12px;
      color: #666;
    }

    .scramble-length-label {
      display: inline-block;
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
    }
  `]
})
export class ScrambleDisplayComponent {
  private state = inject(StateService);
  private cubeService = inject(CubeService);
  private sanitizer = inject(DomSanitizer);

  scrambleType: Signal<string> = computed(() => this.state.scrambleType());
  status: Signal<string> = computed(() => this.state.status());

  scrambleHtml: Signal<SafeHtml> = computed(() => {
    const currentStatus = this.status();
    const twist = this.state.twistScrambleDisplay();
    const seq = twist?.sequence ?? this.state.scrambleSequence();
    const progress = twist?.progress ?? this.state.scrambleProgress();

    if (currentStatus !== 'twisting' && currentStatus !== 'twisted') {
      return this.sanitizer.bypassSecurityTrustHtml(escapeHtml(this.state.scramble()));
    }

    const html = buildScrambleTwistHighlightHtml(seq, progress, null);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  private translations: Record<string, string> = {
    scramble: 'Scramble'
  };

  t(key: string): string {
    return this.translations[key] || key;
  }

  getScrambleLengthLabel(): string {
    const type = this.scrambleType();
    const length = this.state.scrambleLength();
    switch (type) {
      case 'wca':
        return '25 moves (333o)';
      case 'cross':
        return 'easyc · len ' + length;
      case 'f2l':
        return 'cstimer F2L subset';
      case 'oll':
        return '57 cases (cstimer)';
      case 'pll':
        return '21 cases (cstimer)';
      default:
        return length + ' moves';
    }
  }

  onScrambleTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newType = select.value;
    
    // Always clear the physical cube state tracking when changing scramble types
    // This prevents residual checkScramble matches from confusing the new type's logic
    if (this.state.btCubeState()) {
      this.state.resetCubeState();
      this.state.btCubeState.set(null);
    }
    
    this.state.scrambleType.set(newType);
    this.cubeService.generateScramble();
  }
}