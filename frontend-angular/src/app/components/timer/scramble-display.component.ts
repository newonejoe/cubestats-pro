import { Component, inject, computed, signal, type Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { StateService, type CubeState } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';
import { I18nService } from '../../services/i18n.service';
import {
  buildScrambleTwistHighlightHtml,
  escapeHtml,
} from '../../lib/scramble-twist-display';
import { AppModalComponent } from '../shared/app-modal.component';
import { OllCasePickerComponent } from '../oll-case-picker/oll-case-picker.component';
import { PllCasePickerComponent } from '../pll-case-picker/pll-case-picker.component';
import { F2lCasePickerComponent } from '../f2l-case-picker/f2l-case-picker.component';

interface ScrambleSnapshot {
  scramble: string;
  sequence: string[];
  target: CubeState | null;
  lastOllCase: number | null;
  lastF2lCase: number | null;
  lastPllCase: number | null;
}

@Component({
  selector: 'app-scramble-display',
  standalone: true,
  imports: [
    CommonModule,
    AppModalComponent,
    OllCasePickerComponent,
    PllCasePickerComponent,
    F2lCasePickerComponent,
  ],
  template: `
    <div class="toolbar-row">
      <select class="type-select" [value]="scrambleType()" (change)="onScrambleTypeChange($event)">
        <option value="wca">WCA</option>
        <option value="cross">Cross</option>
        <option value="f2l">F2L</option>
        <option value="oll">OLL</option>
        <option value="pll">PLL</option>
      </select>
      @if (hasOptions()) {
        <button type="button" class="icon-btn" (click)="openCaseModal()" [title]="t('options')">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M7.5 10.5C8.9 10.5 10 9.4 10 8S8.9 5.5 7.5 5.5S5 6.6 5 8S6.2 10.5 7.5 10.5zM7.5 11.5C5.6 11.5 4 9.9 4 8S5.6 4.5 7.5 4.5S11 6.1 11 8S9.5 11.5 7.5 11.5z"/>
            <path d="M6.3 2.6L6 2.7C5.3 2.9 4.7 3.2 4.1 3.7L3.9 3.9L2.5 3.1L1.2 4.9L2.4 6L2.3 6.2C2.1 6.8 2 7.4 2 8c0 .3 0 .7.1 1l.1.3L1 10.3l1.2 1.7l1.1-.6l.3.3C4.2 12.5 5 13 6 13.3l.3.1L6.5 15h2.1l.2-1.6l.3-.1c.8-.2 1.6-.7 2.2-1.3l.3-.2l1.1.6l1.2-1.7l-1.1-1l.1-.3C13 8.9 13 8.4 13 8c0-.5-.1-1.1-.2-1.6l-.1-.3l1.2-1l-1.2-1.7L11.3 4l-.3-.2c-.6-.5-1.3-.9-2-1.1L8.8 2.6L8.6 1H6.5L6.3 2.6zM5.5.9C5.5.4 6 0 6.5 0h2.1c.5 0 .9.4 1 .9l.1 1c.6.2 1.2.5 1.8 1l.7-.4c.4-.2 1-.1 1.3.3l1.2 1.7c.3.4.2 1-.1 1.3l-.7.6C14 6.9 14 7.5 14 8c0 .4 0 .8-.1 1.3l.6.6c.4.3.4.9.1 1.3l-1.2 1.7c-.3.4-.8.5-1.3.3l-.8-.4c-.6.5-1.3.9-2 1.2l-.1 1c-.1.5-.5.9-1 .9H6.5c-.5 0-.9-.4-1-.9l-.1-1c-.8-.3-1.6-.8-2.3-1.4l-.4.2c-.4.2-1 .1-1.3-.3l-1.2-1.7c-.3-.4-.2-1 .1-1.3l.8-.7C1.1 8.6 1 8.3 1 8c0-.6.1-1.2.2-1.8L.6 5.6C.2 5.3.1 4.7.4 4.3l1.2-1.7C1.9 2.1 2.5 2 2.9 2.2l.9.5c.5-.3 1-.6 1.6-.8L5.5.9z"/>
          </svg>
        </button>
      }
      <button type="button" class="nav-btn" [disabled]="!canGoLast()" (click)="lastScramble()">{{ t('last') }}</button>
      <button type="button" class="nav-btn primary" (click)="nextScramble()">{{ t('nextScramble') }}</button>
      @if (scrambleType() !== 'wca') {
        <span class="scramble-info">{{ getScrambleLengthLabel() }}</span>
      }
    </div>
    <div class="scramble-text"
         [class.with-progress]="status() === 'twisting' || status() === 'twisted'"
         [innerHTML]="scrambleHtml()">
    </div>

    @if (caseModalOpen()) {
      <app-modal
        [isVisible]="true"
        [title]="getCaseModalTitle()"
        maxWidth="960px"
        theme="light"
        (closed)="closeCaseModal()">
        @if (scrambleType() === 'cross') {
          <div class="cross-modal">
            <div class="bounds-group">
              <span class="bounds-label">{{ t('lower') }}</span>
              <input type="number" min="0" max="8" step="1" class="bounds-digit"
                [value]="crossLower()" (change)="onCrossLowerChange($event)">
              <span class="bounds-label">{{ t('upper') }}</span>
              <input type="number" min="0" max="8" step="1" class="bounds-digit"
                [value]="crossUpper()" (change)="onCrossUpperChange($event)">
            </div>
          </div>
        } @else if (scrambleType() === 'f2l') {
          <app-f2l-case-picker [inline]="true" />
        } @else if (scrambleType() === 'oll') {
          <app-oll-case-picker [inline]="true" />
        } @else if (scrambleType() === 'pll') {
          <app-pll-case-picker [inline]="true" />
        }
      </app-modal>
    }
  `,
  styles: [`
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .type-select {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--input-border);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
    }
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--card-bg);
      cursor: pointer;
      padding: 0;
    }
    .icon-btn:hover { background: var(--hover-bg); }
    .icon-btn svg { fill: var(--text-secondary); }
    .nav-btn {
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--card-bg);
      color: var(--text-primary);
      font-size: 13px;
      cursor: pointer;
    }
    .nav-btn:hover { background: var(--hover-bg); }
    .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-btn.primary { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    .nav-btn.primary:hover { filter: brightness(0.9); }
    .scramble-info {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--hover-bg);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .scramble-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      color: var(--text-primary);
      word-break: break-all;
      line-height: 1.5;
    }
    .scramble-text.with-progress { color: var(--text-secondary); }
    :host ::ng-deep .scrm-seg { display: inline-block; margin-right: 0.35em; }
    :host ::ng-deep .scrm-done { color: var(--text-muted); font-weight: 500; }
    :host ::ng-deep .scrm-todo { color: var(--text-primary); }
    :host ::ng-deep .scrm-cur {
      color: var(--primary-color);
      font-weight: 700;
      background: var(--hover-bg);
      padding: 0 0.1em;
      border-radius: 4px;
    }
    .bounds-group { display: flex; align-items: center; gap: 8px; }
    .bounds-label { font-size: 13px; color: var(--text-secondary); }
    .bounds-digit { width: 4rem; text-align: center; padding: 6px; border: 1px solid var(--input-border); border-radius: 6px; }
  `]
})
export class ScrambleDisplayComponent {
  private state = inject(StateService);
  private cubeService = inject(CubeService);
  private sanitizer = inject(DomSanitizer);
  private i18n = inject(I18nService);

  private readonly history: ScrambleSnapshot[] = [];
  private readonly historyIndex = signal(-1);
  readonly caseModalOpen = signal(false);
  readonly crossLower = signal(0);
  readonly crossUpper = signal(8);

  scrambleType: Signal<string> = computed(() => this.state.scrambleType());
  status: Signal<string> = computed(() => this.state.status());
  readonly hasOptions = computed(() => {
    const t = this.scrambleType();
    return t === 'cross' || t === 'f2l' || t === 'oll' || t === 'pll';
  });
  readonly canGoLast = computed(() => this.historyIndex() > 0);

  t(key: string): string {
    return this.i18n.t(key);
  }

  getCaseModalTitle(): string {
    const type = this.scrambleType();
    if (type === 'cross') return this.t('cross') + ' ' + this.t('options');
    if (type === 'f2l') return this.t('f2l') + ' ' + this.t('options');
    if (type === 'oll') return this.t('oll') + ' ' + this.t('options');
    return this.t('pll') + ' ' + this.t('options');
  }

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

  getScrambleLengthLabel(): string {
    const type = this.scrambleType();
    const length = this.state.scrambleLength();
    switch (type) {
      case 'cross': return 'easyc · ' + this.t('len') + ' ' + length;
      case 'f2l': return 'cstimer F2L ' + this.t('subset');
      case 'oll': return '57 ' + this.t('cases') + ' (cstimer)';
      case 'pll': return '21 ' + this.t('cases') + ' (cstimer)';
      default: return length + ' ' + this.t('moves');
    }
  }

  onScrambleTypeChange(event: Event): void {
    const newType = (event.target as HTMLSelectElement).value;
    if (this.state.btCubeState()) {
      this.state.resetCubeState();
      this.state.btCubeState.set(null);
    }
    this.state.scrambleType.set(newType);
    if (newType === 'cross') {
      this.decodeCrossBoundsFromState();
    }
    this.nextScramble();
  }

  nextScramble(): void {
    this.cubeService.generateScramble();
    this.pushCurrentStateToHistory();
  }

  lastScramble(): void {
    if (this.historyIndex() <= 0) return;
    const nextIndex = this.historyIndex() - 1;
    this.historyIndex.set(nextIndex);
    this.applySnapshot(this.history[nextIndex]!);
  }

  openCaseModal(): void {
    this.caseModalOpen.set(true);
  }

  closeCaseModal(): void {
    this.caseModalOpen.set(false);
  }

  onCrossLowerChange(event: Event): void {
    const raw = parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(raw)) return;
    this.crossLower.set(this.clampCrossDigit(raw));
    this.syncCrossAndRegenerate();
  }

  onCrossUpperChange(event: Event): void {
    const raw = parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(raw)) return;
    this.crossUpper.set(this.clampCrossDigit(raw));
    this.syncCrossAndRegenerate();
  }

  private clampCrossDigit(n: number): number {
    return Math.max(0, Math.min(8, Math.round(n)));
  }

  private decodeCrossBoundsFromState(): void {
    const len = this.state.scrambleLength();
    const a = Math.min(len % 10, 8);
    const b = Math.min(Math.floor(len / 10), 8);
    this.crossLower.set(Math.min(a, b));
    this.crossUpper.set(Math.max(a, b));
  }

  private syncCrossAndRegenerate(): void {
    let lo = this.crossLower();
    let hi = this.crossUpper();
    lo = this.clampCrossDigit(lo);
    hi = this.clampCrossDigit(hi);
    if (lo > hi) { const t = lo; lo = hi; hi = t; }
    this.crossLower.set(lo);
    this.crossUpper.set(hi);
    this.state.scrambleLength.set(hi * 10 + lo);
    this.nextScramble();
  }

  private pushCurrentStateToHistory(): void {
    const current = this.captureSnapshot();
    if (!current.scramble) return;
    const currentIndex = this.historyIndex();
    if (currentIndex < this.history.length - 1) {
      this.history.splice(currentIndex + 1);
    }
    this.history.push(current);
    this.historyIndex.set(this.history.length - 1);
  }

  private captureSnapshot(): ScrambleSnapshot {
    const target = this.state.scrambleTargetState();
    return {
      scramble: this.state.scramble(),
      sequence: [...this.state.scrambleSequence()],
      target: target ? structuredClone(target) : null,
      lastOllCase: this.state.lastOllCaseIndex(),
      lastF2lCase: this.state.lastF2lCaseIndex(),
      lastPllCase: this.state.lastPllCaseIndex(),
    };
  }

  private applySnapshot(snapshot: ScrambleSnapshot): void {
    this.state.scramble.set(snapshot.scramble);
    this.state.scrambleSequence.set([...snapshot.sequence]);
    this.state.scrambleTargetState.set(snapshot.target ? structuredClone(snapshot.target) : null);
    this.state.lastOllCaseIndex.set(snapshot.lastOllCase);
    this.state.lastF2lCaseIndex.set(snapshot.lastF2lCase);
    this.state.lastPllCaseIndex.set(snapshot.lastPllCase);
  }
}
