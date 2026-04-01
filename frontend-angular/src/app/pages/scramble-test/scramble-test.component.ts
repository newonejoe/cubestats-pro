import { Component, OnInit, inject, computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StateService, type CubeState } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';
import { ScrambleTargetVizComponent } from '../../components/scramble-target-viz/scramble-target-viz.component';
import { OllCasePickerComponent } from '../../components/oll-case-picker/oll-case-picker.component';
import { PllCasePickerComponent } from '../../components/pll-case-picker/pll-case-picker.component';
import { F2lCasePickerComponent } from '../../components/f2l-case-picker/f2l-case-picker.component';
import { OllPllCaseVizComponent } from '../../components/oll-pll-case-viz/oll-pll-case-viz.component';
import { rotateCubeX2 } from '../../lib/cube-orientation';
import { AppModalComponent } from '../../components/shared/app-modal.component';

@Component({
  selector: 'app-scramble-test',
  standalone: true,
  imports: [
    CommonModule,
    AppModalComponent,
    RouterLink,
    ScrambleTargetVizComponent,
    OllCasePickerComponent,
    PllCasePickerComponent,
    F2lCasePickerComponent,
    OllPllCaseVizComponent
  ],
  template: `
    <div class="page">
      <header class="top">
        <a routerLink="/" class="back">← Home</a>
        <h1>Scramble generation test</h1>
        <span class="badge" [class.on]="cstimerReady()">cstimer stack {{ cstimerReady() ? 'ready' : 'not loaded' }}</span>
      </header>

      <section class="panel">
        <h2>Controls</h2>
        <div class="toolbar-row">
          <label for="stype">Scramble type</label>
          <select id="stype" [value]="scrambleType()" (change)="onTypeChange($event)">
            <option value="wca">WCA (25 moves, 333o mega)</option>
            <option value="cross">Cross (easyc)</option>
            <option value="f2l">F2L (Last slot+last layer)</option>
            <option value="oll">OLL</option>
            <option value="pll">PLL</option>
          </select>
          @if (scrambleType() === 'cross' || scrambleType() === 'f2l' || scrambleType() === 'oll' || scrambleType() === 'pll') {
            <button
              type="button"
              class="btn-mid icon-btn"
              (click)="openCaseModal()"
              [attr.aria-label]="scrambleType() === 'cross'
                ? 'Cross options'
                : (scrambleType() === 'f2l'
                  ? 'F2L options'
                  : (scrambleType() === 'oll' ? 'OLL options' : 'PLL options'))"
              title="Options"
            >
              <svg class="settings-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M7.5 10.5C8.9 10.5 10 9.4 10 8S8.9 5.5 7.5 5.5S5 6.6 5 8S6.2 10.5 7.5 10.5zM7.5 11.5C5.6 11.5 4 9.9 4 8S5.6 4.5 7.5 4.5S11 6.1 11 8S9.5 11.5 7.5 11.5z"/>
                <path d="M6.3 2.6L6 2.7C5.3 2.9 4.7 3.2 4.1 3.7L3.9 3.9L2.5 3.1L1.2 4.9L2.4 6L2.3 6.2C2.1 6.8 2 7.4 2 8c0 .3 0 .7.1 1l.1.3L1 10.3l1.2 1.7l1.1-.6l.3.3C4.2 12.5 5 13 6 13.3l.3.1L6.5 15h2.1l.2-1.6l.3-.1c.8-.2 1.6-.7 2.2-1.3l.3-.2l1.1.6l1.2-1.7l-1.1-1l.1-.3C13 8.9 13 8.4 13 8c0-.5-.1-1.1-.2-1.6l-.1-.3l1.2-1l-1.2-1.7L11.3 4l-.3-.2c-.6-.5-1.3-.9-2-1.1L8.8 2.6L8.6 1H6.5L6.3 2.6zM5.5.9C5.5.4 6 0 6.5 0h2.1c.5 0 .9.4 1 .9l.1 1c.6.2 1.2.5 1.8 1l.7-.4c.4-.2 1-.1 1.3.3l1.2 1.7c.3.4.2 1-.1 1.3l-.7.6C14 6.9 14 7.5 14 8c0 .4 0 .8-.1 1.3l.6.6c.4.3.4.9.1 1.3l-1.2 1.7c-.3.4-.8.5-1.3.3l-.8-.4c-.6.5-1.3.9-2 1.2l-.1 1c-.1.5-.5.9-1 .9H6.5c-.5 0-.9-.4-1-.9l-.1-1c-.8-.3-1.6-.8-2.3-1.4l-.4.2c-.4.2-1 .1-1.3-.3l-1.2-1.7c-.3-.4-.2-1 .1-1.3l.8-.7C1.1 8.6 1 8.3 1 8c0-.6.1-1.2.2-1.8L.6 5.6C.2 5.3.1 4.7.4 4.3l1.2-1.7C1.9 2.1 2.5 2 2.9 2.2l.9.5c.5-.3 1-.6 1.6-.8L5.5.9z"/>
              </svg>
            </button>
          }
          <button type="button" class="btn-mid" [disabled]="!canGoLast()" (click)="lastScramble()">Last</button>
          <button type="button" class="btn-next" (click)="nextScramble()">Next scramble</button>
        </div>
        <pre class="scramble-line">{{ scramble() || '(empty — click Next scramble)' }}</pre>
        @if (scrambleType() !== 'cross' && scrambleType() !== 'oll' && scrambleType() !== 'pll') {
          <div class="row">
            <span class="hint muted">
              WCA: fixed 25 moves (333o). F2L / OLL / PLL: cstimer subsets. Length encoding applies only to Cross above.
            </span>
          </div>
        }
      </section>

      @if (caseModalOpen()) {
        <app-modal
          [isVisible]="true"
          [title]="scrambleType() === 'cross' ? 'Cross options' : (scrambleType() === 'f2l' ? 'F2L options' : (scrambleType() === 'oll' ? 'OLL options' : 'PLL options'))"
          maxWidth="960px"
          theme="light"
          (closed)="closeCaseModal()">
          @if (scrambleType() === 'cross') {
            <div class="cross-modal">
              <div class="bounds-group">
                <span class="bounds-label">Lower</span>
                <input
                  type="number"
                  min="0"
                  max="8"
                  step="1"
                  class="bounds-digit"
                  [value]="crossLower()"
                  (change)="onCrossLowerChange($event)"
                >
                <span class="bounds-label">Upper</span>
                <input
                  type="number"
                  min="0"
                  max="8"
                  step="1"
                  class="bounds-digit"
                  [value]="crossUpper()"
                  (change)="onCrossUpperChange($event)"
                >
              </div>
              <p class="hint small cross-hint">
                Bounds apply only to <strong>cross</strong> (csTimer <code>cross.js</code> pruning / HTM to finish the cross),
                not to the total scramble length. The full scramble is still from
                <code>getAnyScramble</code> + min2phase (usually ~15–21 moves).
                Encoded as <code>upper×10 + lower</code> (digits ≤8). Old default <code>20</code> meant cross-only 0–2.
              </p>
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

      @if (scrambleType() === 'oll' || scrambleType() === 'pll') {
        <section class="panel">
          <h2>Last-layer case & scramble target</h2>
          <div class="viz-row">
            <div class="viz-col">
              <app-oll-pll-case-viz
                [kind]="scrambleType() === 'oll' ? 'oll' : 'pll'"
                [caseIndex]="scrambleType() === 'oll' ? lastOllCase() : lastPllCase()"
              />
            </div>
            <div class="viz-col">
              <p class="hint small net-hint">
                Net is shown with whole-cube x2 so the top face is yellow (matches csTimer last-layer / CFOP training view).
              </p>
              <app-scramble-target-viz [cubeState]="scrambleTargetDisplay()" />
            </div>
          </div>
        </section>
      } @else {
        <section class="panel">
          <h2>Scramble picture (target state)</h2>
          <app-scramble-target-viz [cubeState]="scrambleTargetDisplay()" />
        </section>
      }
    </div>
  `,
  styles: [`
    .page {
      margin: 0 auto;
      padding: 24px;
      min-height: 100vh;
      background: var(--background);
      font-family: system-ui, sans-serif;
    }
    .top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 20px;
      margin-bottom: 24px;
    }
    .top h1 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .back {
      color: var(--link-color);
      text-decoration: none;
      font-weight: 500;
    }
    .back:hover {
      text-decoration: underline;
    }
    .badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--hover-bg);
      color: var(--text-muted);
    }
    .badge.on {
      background: var(--success-color);
      color: #fff;
    }
    .panel {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .panel h2 {
      margin: 0 0 16px;
      font-size: 1rem;
      color: var(--text-secondary);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .row label {
      min-width: 200px;
      font-size: 14px;
      color: var(--text-primary);
    }
    select, input[type="number"] {
      padding: 8px 12px;
      border: 1px solid var(--input-border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--input-bg);
      color: var(--text-primary);
    }
    .hint {
      font-size: 12px;
      color: var(--text-muted);
      flex: 1 1 100%;
      margin-left: 212px;
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .toolbar-row label {
      min-width: auto;
      font-size: 14px;
      color: var(--text-primary);
    }
    .btn-mid,
    .btn-next {
      padding: 10px 20px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid var(--input-border);
      background: var(--card-bg);
      color: var(--text-primary);
    }
    .btn-mid:hover {
      background: var(--hover-bg);
    }
    .icon-btn {
      padding: 9px 10px;
      min-width: 40px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .settings-icon {
      width: 18px;
      height: 18px;
      fill: currentColor;
      display: block;
    }
    .btn-mid:disabled {
      cursor: not-allowed;
      color: var(--text-muted);
      border-color: var(--border-color);
      background: var(--hover-bg);
    }
    .btn-next {
      color: #fff;
      background: var(--primary-color);
      border-color: var(--primary-color);
    }
    .btn-next:hover {
      filter: brightness(0.9);
    }
    .scramble-line {
      margin: 0;
      padding: 14px;
      background: var(--hover-bg);
      border-radius: 8px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 15px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-primary);
    }
    .move-list {
      margin: 0;
      padding-left: 1.25rem;
    }
    .move-list li {
      margin-bottom: 6px;
    }
    .move-list code {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 14px;
      background: var(--hover-bg);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .cross-bounds .bounds-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
    }
    .bounds-label {
      font-size: 13px;
      color: var(--text-secondary);
    }
    input.bounds-digit {
      width: 4rem;
      text-align: center;
    }
    .hint code {
      font-size: 11px;
      background: var(--hover-bg);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .hint.muted {
      margin-left: 0;
      color: var(--text-muted);
    }
    .hint.small {
      margin-left: 0;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .subh {
      margin: 0 0 8px;
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    .net-hint {
      margin: 0 0 12px;
    }
    .cross-hint {
      margin: 0;
    }
    .viz-row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .viz-col {
      flex: 1;
      min-width: 280px;
    }
  `]
})
export class ScrambleTestComponent implements OnInit {
  private readonly history: ScrambleSnapshot[] = [];
  private readonly historyIndex = signal(-1);
  private state = inject(StateService);
  private cube = inject(CubeService);
  private cstimer = inject(CstimerScrambleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly caseModalOpen = signal(false);

  scramble: Signal<string> = computed(() => this.state.scramble());
  sequence: Signal<string[]> = computed(() => this.state.scrambleSequence());
  scrambleType: Signal<string> = computed(() => this.state.scrambleType());
  moveCount: Signal<number> = computed(() => this.sequence().length);
  cstimerReady: Signal<boolean> = computed(() => this.cstimer.isReady());
  scrambleTarget: Signal<CubeState | null> = computed(() => this.state.scrambleTargetState());
  /** OLL/PLL: rotate x2 so U is yellow for net (csTimer assumes yellow top for LL). */
  scrambleTargetDisplay: Signal<CubeState | null> = computed(() => {
    const s = this.state.scrambleTargetState();
    const t = this.state.scrambleType();
    if (!s) {
      return null;
    }
    if (t === 'oll' || t === 'pll') {
      return rotateCubeX2(s);
    }
    return s;
  });
  lastOllCase: Signal<number | null> = computed(() => this.state.lastOllCaseIndex());
  lastPllCase: Signal<number | null> = computed(() => this.state.lastPllCaseIndex());

  /** Easy cross: lower/upper HTM bounds (0–8), encoded into state.scrambleLength as upper×10+lower. */
  crossLower: WritableSignal<number> = signal(0);
  crossUpper: WritableSignal<number> = signal(8);
  readonly canGoLast: Signal<boolean> = computed(() => this.historyIndex() > 0);

  ngOnInit(): void {
    this.decodeCrossBoundsFromState();
    const qp = this.route.snapshot.queryParamMap;
    const fromQuery = qp.get('scramble');
    const type = qp.get('type');
    if (
      type &&
      (type === 'wca' || type === 'cross' || type === 'f2l' || type === 'oll' || type === 'pll')
    ) {
      this.state.scrambleType.set(type);
      if (type === 'cross') {
        this.decodeCrossBoundsFromState();
      }
    }
    if (fromQuery) {
      this.cube.applySavedScramble(fromQuery);
      this.pushCurrentStateToHistory();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { scramble: null, type: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } else {
      this.nextScramble();
    }
  }

  onTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.state.scrambleType.set(v);
    if (v === 'cross') {
      this.decodeCrossBoundsFromState();
    }
    this.nextScramble();
  }

  openCaseModal(): void {
    this.caseModalOpen.set(true);
  }

  closeCaseModal(): void {
    this.caseModalOpen.set(false);
  }

  onCrossLowerChange(event: Event): void {
    const raw = parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(raw)) {
      return;
    }
    this.crossLower.set(this.clampCrossDigit(raw));
    this.syncCrossEncodedLengthAndRegenerate();
  }

  onCrossUpperChange(event: Event): void {
    const raw = parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(raw)) {
      return;
    }
    this.crossUpper.set(this.clampCrossDigit(raw));
    this.syncCrossEncodedLengthAndRegenerate();
  }

  private clampCrossDigit(n: number): number {
    return Math.max(0, Math.min(8, Math.round(n)));
  }

  /** Decode cstimer easyc: lenA = length%10, lenB = floor(length/10); bounds are min/max of the two. */
  private decodeCrossBoundsFromState(): void {
    const len = this.state.scrambleLength();
    const a = Math.min(len % 10, 8);
    const b = Math.min(Math.floor(len / 10), 8);
    this.crossLower.set(Math.min(a, b));
    this.crossUpper.set(Math.max(a, b));
  }

  private syncCrossEncodedLengthAndRegenerate(): void {
    let lo = this.crossLower();
    let hi = this.crossUpper();
    lo = this.clampCrossDigit(lo);
    hi = this.clampCrossDigit(hi);
    if (lo > hi) {
      const t = lo;
      lo = hi;
      hi = t;
    }
    this.crossLower.set(lo);
    this.crossUpper.set(hi);
    this.state.scrambleLength.set(hi * 10 + lo);
    this.nextScramble();
  }

  lastScramble(): void {
    if (this.historyIndex() <= 0) {
      return;
    }
    const nextIndex = this.historyIndex() - 1;
    this.historyIndex.set(nextIndex);
    this.applySnapshot(this.history[nextIndex]!);
  }

  nextScramble(): void {
    this.cube.generateScramble();
    this.pushCurrentStateToHistory();
  }

  private pushCurrentStateToHistory(): void {
    const current = this.captureSnapshot();
    if (!current.scramble) {
      return;
    }
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

interface ScrambleSnapshot {
  scramble: string;
  sequence: string[];
  target: CubeState | null;
  lastOllCase: number | null;
  lastF2lCase: number | null;
  lastPllCase: number | null;
}
