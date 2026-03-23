import { Component, OnInit, inject, computed, signal, type Signal, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StateService, type CubeState } from '../../services/state.service';
import { CubeService } from '../../services/cube.service';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';
import { ScrambleTargetVizComponent } from '../../components/scramble-target-viz/scramble-target-viz.component';
import { OllCasePickerComponent } from '../../components/oll-case-picker/oll-case-picker.component';
import { PllCasePickerComponent } from '../../components/pll-case-picker/pll-case-picker.component';
import { OllPllCaseVizComponent } from '../../components/oll-pll-case-viz/oll-pll-case-viz.component';
import { rotateCubeX2 } from '../../lib/cube-orientation';

@Component({
  selector: 'app-scramble-test',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ScrambleTargetVizComponent,
    OllCasePickerComponent,
    PllCasePickerComponent,
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
        <h2>Settings</h2>
        <div class="row">
          <label for="stype">Scramble type</label>
          <select id="stype" [value]="scrambleType()" (change)="onTypeChange($event)">
            <option value="wca">WCA (25 moves, 333o mega)</option>
            <option value="cross">Cross (easyc)</option>
            <option value="f2l">F2L</option>
            <option value="oll">OLL</option>
            <option value="pll">PLL</option>
          </select>
        </div>
        @if (scrambleType() === 'cross') {
          <div class="row cross-bounds">
            <label>Easy cross bounds (≤8 each)</label>
            <div class="bounds-group">
              <span class="bounds-label">Lower</span>
              <input type="number" min="0" max="8" step="1" class="bounds-digit"
                     [value]="crossLower()" (change)="onCrossLowerChange($event)">
              <span class="bounds-label">Upper</span>
              <input type="number" min="0" max="8" step="1" class="bounds-digit"
                     [value]="crossUpper()" (change)="onCrossUpperChange($event)">
            </div>
            <span class="hint">
              Bounds apply only to <strong>cross</strong> (csTimer <code>cross.js</code> pruning / HTM to finish the cross),
              not to the total number of moves in the scramble. The full scramble is still from
              <code>getAnyScramble</code> + min2phase (random corners + long solution, typically ~15–21 moves).
              Encoded as <code>upper×10 + lower</code> (digits ≤8). Old default <code>20</code> meant cross-only 0–2 — use 0–8 for full range.
            </span>
          </div>
        } @else {
          <div class="row">
            <span class="hint muted">
              WCA: fixed 25 moves (333o). F2L / OLL / PLL: cstimer subsets. Length encoding applies only to Cross above.
            </span>
          </div>
        }
        @if (scrambleType() === 'oll') {
          <div class="oll-pll-settings">
            <h3 class="subh">OLL case pool</h3>
            <p class="hint small">
              Matches csTimer <code>oll_map</code>: random case is drawn only from enabled indices when “Custom subset” is on.
            </p>
            <app-oll-case-picker />
          </div>
        }
        @if (scrambleType() === 'pll') {
          <div class="oll-pll-settings">
            <h3 class="subh">PLL case pool</h3>
            <p class="hint small">csTimer <code>pll_map</code> (21 named perms).</p>
            <app-pll-case-picker />
          </div>
        }
        <button type="button" class="btn-next" (click)="nextScramble()">Next scramble</button>
      </section>

      @if (scrambleType() === 'oll' || scrambleType() === 'pll') {
        <section class="panel">
          <h2>Last-layer case (csTimer)</h2>
          @if (scrambleType() === 'oll') {
            <app-oll-pll-case-viz kind="oll" [caseIndex]="lastOllCase()" />
          } @else {
            <app-oll-pll-case-viz kind="pll" [caseIndex]="lastPllCase()" />
          }
        </section>
      }

      <section class="panel">
        <h2>Scramble picture (target state)</h2>
        @if (scrambleType() === 'oll' || scrambleType() === 'pll') {
          <p class="hint small net-hint">
            Net is shown with whole-cube x2 so the top face is yellow (matches csTimer last-layer / CFOP training view).
          </p>
        }
        <app-scramble-target-viz [cubeState]="scrambleTargetDisplay()" />
      </section>

      <section class="panel">
        <h2>Scramble string</h2>
        <pre class="scramble-line">{{ scramble() || '(empty — click Next scramble)' }}</pre>
      </section>

      <section class="panel">
        <h2>Moves ({{ moveCount() }})</h2>
        <ol class="move-list">
          @for (m of sequence(); track $index) {
            <li><code>{{ m }}</code></li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: [`
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      min-height: 100vh;
      background: #f0f2f5;
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
      color: #1a1a1a;
    }
    .back {
      color: #0d6efd;
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
      background: #e9ecef;
      color: #666;
    }
    .badge.on {
      background: #d1e7dd;
      color: #0f5132;
    }
    .panel {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .panel h2 {
      margin: 0 0 16px;
      font-size: 1rem;
      color: #444;
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
      color: #333;
    }
    select, input[type="number"] {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 14px;
    }
    .hint {
      font-size: 12px;
      color: #888;
      flex: 1 1 100%;
      margin-left: 212px;
    }
    .btn-next {
      padding: 10px 20px;
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      background: #0d6efd;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-next:hover {
      background: #0b5ed7;
    }
    .scramble-line {
      margin: 0;
      padding: 14px;
      background: #f8f9fa;
      border-radius: 8px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 15px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      color: #222;
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
      background: #f1f3f5;
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
      color: #495057;
    }
    input.bounds-digit {
      width: 4rem;
      text-align: center;
    }
    .hint code {
      font-size: 11px;
      background: #f1f3f5;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .hint.muted {
      margin-left: 0;
      color: #868e96;
    }
    .hint.small {
      margin-left: 0;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .subh {
      margin: 0 0 8px;
      font-size: 0.95rem;
      color: #495057;
    }
    .oll-pll-settings {
      margin: 16px 0;
      padding-top: 12px;
      border-top: 1px solid #e9ecef;
    }
    .net-hint {
      margin: 0 0 12px;
    }
  `]
})
export class ScrambleTestComponent implements OnInit {
  private state = inject(StateService);
  private cube = inject(CubeService);
  private cstimer = inject(CstimerScrambleService);

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

  ngOnInit(): void {
    this.decodeCrossBoundsFromState();
    this.nextScramble();
  }

  onTypeChange(event: Event): void {
    const v = (event.target as HTMLSelectElement).value;
    this.state.scrambleType.set(v);
    if (v === 'cross') {
      this.decodeCrossBoundsFromState();
    }
    this.nextScramble();
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

  nextScramble(): void {
    this.cube.generateScramble();
  }
}
