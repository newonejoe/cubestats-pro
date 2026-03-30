import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService, Solve, type CubeState } from './state.service';
import { CubeService } from './cube.service';
import { BluetoothService } from './bluetooth.service';
import { LocalSolveStoreService } from './local-solve-store.service';
import type { CubeMove } from '../hardware/cube-move';
import { buildMoveAtMsTrace } from '../lib/cstimer-storage';
import { cubeStateToCstimerFacelet } from '../lib/cstimer/cstimer-giiker-scramble';
import {
  computeTwistScrHinterDisplay,
  type TwistScrHinterCache,
} from '../lib/cstimer/cstimer-scr-hinter';
import { getMathlib, isMathlibLoaded } from '../lib/cstimer/cstimer-mathlib';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private state = inject(StateService);
  private cube = inject(CubeService);
  private bluetooth = inject(BluetoothService);
  private localStore = inject(LocalSolveStoreService);

  private currentSolveStartTime = 0;
  private inspectionStart = 0;
  inspectionStartTime = 0;
  private currentMoveCount = 0;
  private cubeState: string[] = [];
  private solvePerfOrigin = 0;
  private moveTraceHwAnchor: number | null = null;
  private moveTraceBuffer: { notation: string; offsetMs: number }[] = [];
  /** csTimer scrHinter genState / genScr cache between BLE updates (bluetoothutil.js). */
  private twistScrHinterCache: TwistScrHinterCache | null = null;

  constructor() {
    // Set up Bluetooth move callback
    this.bluetooth.setOnMove((moves: CubeMove[]) => {
      this.handleCubeMoves(moves);
    });
  }

  private recordSolvingTrace(cm: CubeMove): void {
    const notation = cm.notation.trim();
    if (!notation) {
      return;
    }
    let offsetMs: number;
    if (cm.hwMs !== undefined) {
      if (this.moveTraceHwAnchor === null) {
        this.moveTraceHwAnchor = cm.hwMs;
      }
      offsetMs = Math.max(0, Math.round(cm.hwMs - this.moveTraceHwAnchor));
    } else {
      offsetMs = Math.round(performance.now() - this.solvePerfOrigin);
    }
    const last = this.moveTraceBuffer[this.moveTraceBuffer.length - 1];
    if (last && offsetMs < last.offsetMs) {
      offsetMs = last.offsetMs;
    }
    this.moveTraceBuffer.push({ notation, offsetMs });
  }

  private handleCubeMoves(moves: CubeMove[]): void {
    console.log('[TimerService] Cube moves:', moves, 'Current status:', this.state.status());

    // Only process moves if Bluetooth is connected and we're in an active solve phase
    if (!this.bluetooth.isConnected()) {
      console.log('[TimerService] Bluetooth not connected, ignoring moves');
      return;
    }

    let currentStatus = this.state.status();
    if (currentStatus === 'ready') {
      this.startTimer();
      currentStatus = 'solving';
    } else if (
      currentStatus === 'inspecting' &&
      moves.some((m) => m.notation && m.notation.trim().length > 0)
    ) {
      // WCA: first face turn ends inspection (was no-op in switch below)
      this.startTimer();
      currentStatus = 'solving';
    }

    const scrambleSequence = this.state.scrambleSequence();
    let userMoves: string[] = [...this.state.userTwistMoves()].map(m => m.trim());

    const trimmedMoves = moves.map((m) => m.notation.trim());

    // Idle: do not apply here — startTwistingPhase() resets the cube, then case 'idle' replays
    // this batch once. Applying in the loop would duplicate work and leave wrong intermediate
    // btCubeState before the switch runs.
    const deferCubeApply = currentStatus === 'idle';

    for (let i = 0; i < moves.length; i++) {
      const move = trimmedMoves[i]!;
      if (!move) {
        continue;
      }
      const cm = moves[i]!;
      if (!deferCubeApply) {
        userMoves.push(move);
        this.currentMoveCount++;
        this.cubeState.push(move);
        this.cube.applyMoveToCube(move);
      }

      if (this.state.status() === 'solving') {
        this.recordSolvingTrace(cm);
      }
    }

    // Facelet-based progress (csTimer-style): survives wrong moves once the cube matches a valid prefix again
    if (currentStatus === 'twisting') {
      this.syncTwistProgressFromCubeState();
    }

    // Get current cube state
    const currentCubeState = this.state.btCubeState();
    const scrambleTarget = this.state.scrambleTargetState();

    // Check if cube matches scramble target
    const matchesScramble = scrambleTarget && currentCubeState &&
      this.cube.statesEqual(currentCubeState, scrambleTarget);

    // Check if cube is solved
    const isSolved = this.cube.checkSolved();

    // Phase-based handling
    switch (currentStatus) {
      case 'idle':
        // Start new solve when cube moves - enter twisting phase
        console.log('[TimerService] Idle -> Starting solve (twisting phase)');
        this.startTwistingPhase();
        // Moves were applied before reset; replay on fresh solved cube
        for (const m of trimmedMoves) {
          if (m) {
            this.cube.applyMoveToCube(m);
          }
        }
        this.syncTwistProgressFromCubeState();
        console.log(
          '[TimerService] Scramble progress:',
          this.state.scrambleProgress(),
          '/',
          scrambleSequence.length,
        );
        break;

      case 'twisting':
        // Phase 2: User is twisting to match scramble
        if (matchesScramble) {
          console.log('[TimerService] Twist complete! -> Inspection phase');
          this.state.status.set('twisted');
          // Auto-transition to inspection after a brief moment
          setTimeout(() => {
            if (this.state.status() === 'twisted') {
              this.startInspection();
            }
          }, 500);
        }
        break;

      case 'twisted':
        // Already matched scramble, waiting for inspection to start
        break;

      case 'inspecting':
        // Start is handled above when moves arrive; interval/timeout still clear on startTimer
        break;

      case 'solving':
        // Update move count during solve
        console.log('[TimerService] Solving, move count:', this.currentMoveCount);
        if (isSolved) {
          console.log('[TimerService] Cube solved! -> Stopping timer');
          this.stopTimer();
        }
        break;
    }
  }

  private startTwistingPhase(): void {
    this.moveTraceBuffer = [];
    this.moveTraceHwAnchor = null;
    // Reset move count and user twist moves
    this.currentMoveCount = 0;
    this.cubeState = [];
    this.state.userTwistMoves.set([]);
    this.state.scrambleProgress.set(0);
    this.state.scramblePendingHalfMove.set(null);
    this.state.matchedUserMoves.set([]);
    this.state.twistScrambleDisplay.set(null);
    this.twistScrHinterCache = null;
    this.state.btCubeState.set(null);

    // Reset cube to solved state for twisting
    this.cube.resetCube();

    // Enter twisting phase
    this.state.status.set('twisting');
    console.log('[TimerService] Entered twisting phase - waiting for user to match scramble');
  }

  /**
   * Progress + UI: csTimer scrHinter.checkState when mathlib is available (wrong face → regen + ':' progress),
   * else prefix match on original scramble.
   */
  private syncTwistProgressFromCubeState(): void {
    const seq = this.state.scrambleSequence();
    const cur = this.state.btCubeState() ?? this.state.cubeState();
    const target = this.state.scrambleTargetState();
    if (target && this.cube.statesEqual(cur, target)) {
      this.twistScrHinterCache = null;
      this.state.twistScrambleDisplay.set(null);
      this.state.scrambleProgress.set(seq.length);
      this.state.scramblePendingHalfMove.set(null);
      this.state.matchedUserMoves.set(seq);
      this.state.userTwistMoves.set(seq);
      return;
    }

    const joined = this.state.scramble();
    if (!isMathlibLoaded()) {
      this.fallbackTwistPrefixSync(seq, cur);
      return;
    }

    const facelet = cubeStateToCstimerFacelet(cur);
    if (facelet.includes('?')) {
      this.fallbackTwistPrefixSync(seq, cur);
      return;
    }

    const ml = getMathlib();
    const curCubie = new ml.CubieCube();
    if (curCubie.fromFacelet(facelet) === -1) {
      this.fallbackTwistPrefixSync(seq, cur);
      return;
    }

    const res = computeTwistScrHinterDisplay(joined, curCubie, this.twistScrHinterCache);
    if (res) {
      this.twistScrHinterCache = res.nextCache;
      this.state.twistScrambleDisplay.set(res.display);
      this.state.scrambleProgress.set(res.display.progress);
      this.state.scramblePendingHalfMove.set(null);
      const matched = res.display.sequence.slice(0, res.display.progress);
      this.state.matchedUserMoves.set(matched);
      this.state.userTwistMoves.set(matched);
      return;
    }

    this.twistScrHinterCache = null;
    this.fallbackTwistPrefixSync(seq, cur);
  }

  private fallbackTwistPrefixSync(seq: string[], cur: CubeState): void {
    this.state.twistScrambleDisplay.set(null);
    const progress = this.cube.scrambleProgressFromCubeState(cur, seq);
    this.state.scrambleProgress.set(progress);
    this.state.scramblePendingHalfMove.set(null);
    const matched = seq.slice(0, progress);
    this.state.matchedUserMoves.set(matched);
    this.state.userTwistMoves.set(matched);
  }

  private startInspection(): void {
    this.state.status.set('inspecting');
    this.inspectionStart = Date.now();
    this.inspectionStartTime = Date.now();

    this.startInspectionInterval();

    // Auto-transition to ready after inspection time
    const inspectionTime = this.state.inspectionTime();
    setTimeout(() => {
      if (this.state.status() === 'inspecting') {
        this.state.status.set('ready');
        // Auto-start after 1 second if still ready
        setTimeout(() => {
          if (this.state.status() === 'ready') {
            this.startTimer();
          }
        }, 1000);
      }
    }, inspectionTime * 1000 + 1000);
  }

  formatTime(ms: number | null): string {
    if (ms === null || ms === undefined) return '--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
  }

  async startSolve(): Promise<void> {
    if (this.state.status() === 'idle') {
      // Create session if not exists (disabled for testing)
      // if (!this.state.currentSession()) {
      //   const session = await this.api.createSession();
      //   this.state.currentSession.set(session);
      // }

      // Check if Bluetooth cube is connected
      if (this.bluetooth.isConnected()) {
        // With Bluetooth cube: enter twisting phase
        // User must twist to match scramble first
        this.startTwistingPhase();
      } else {
        // No Bluetooth: start inspection directly (keyboard-based solve)
        this.startInspection();
      }
    } else if (this.state.status() === 'solving') {
      this.stopTimer();
    } else if (this.state.status() === 'twisting' || this.state.status() === 'twisted') {
      // csTimer giiker markScrambled: if cube ≠ scramble target, regen from genFacelet + getConjMoves(gen, true)
      if (this.bluetooth.isConnected()) {
        this.cube.regenerateScrambleIfCstimerMismatch();
        this.syncTwistProgressFromCubeState();
      }
      this.startInspection();
    } else if (this.state.status() === 'ready') {
      // Start timer immediately
      this.startTimer();
    } else if (this.state.status() === 'inspecting') {
      // Keyboard / stackmat-style: end inspection early
      this.startTimer();
    }
  }

  private startInspectionInterval(): void {
    this.state.inspectionInterval = setInterval(() => {
      if (this.state.status() === 'inspecting') {
        const elapsed = Math.floor((Date.now() - this.inspectionStart) / 1000);
        const left = this.state.inspectionTime() - elapsed;
        if (left <= 0) {
          this.clearInspectionInterval();
          // Set status to ready - cube moves will start timer
          this.state.status.set('ready');
          // Auto-start after 1 second if no cube connected
          setTimeout(() => {
            if (this.state.status() === 'ready') {
              this.startTimer();
            }
          }, 1000);
        }
      }
    }, 100);
  }

  private clearInspectionInterval(): void {
    if (this.state.inspectionInterval) {
      clearInterval(this.state.inspectionInterval);
      this.state.inspectionInterval = null;
    }
  }

  startTimer(): void {
    this.clearInspectionInterval();

    this.state.status.set('solving');
    this.solvePerfOrigin = performance.now();
    this.moveTraceHwAnchor = null;
    this.moveTraceBuffer = [];
    this.currentSolveStartTime = Date.now();
    this.state.timer.set(0);

    this.state.currentSolve.set({
      time: 0,
      startTime: new Date(this.currentSolveStartTime).toISOString(),
      scramble: this.state.scramble(),
      inspectionTime: this.state.inspectionTime(),
      sessionId: this.state.currentSession()?.id
    });

    this.state.timerInterval = setInterval(() => {
      this.state.timer.set(Date.now() - this.currentSolveStartTime);
    }, 10);
  }

  async stopTimer(penalty: string | null = null): Promise<void> {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
    this.clearInspectionInterval();

    const endTime = Date.now();
    const solveTime = endTime - this.currentSolveStartTime;
    this.state.timer.set(solveTime);

    this.state.status.set('idle');

    const currentSolve = this.state.currentSolve();
    if (!currentSolve) return;

    currentSolve.endTime = new Date(endTime).toISOString();
    currentSolve.time = solveTime;
    currentSolve.displayTime = solveTime;

    // If penalty is provided (auto-stop from cube detection), apply it
    if (penalty) {
      if (penalty === '+2') {
        currentSolve.penalty = 1;
        currentSolve.plus2 = true;
      } else if (penalty === 'DNF') {
        currentSolve.penalty = 2;
        currentSolve.dnf = true;
      }
    }

    // Calculate final time
    const isDNF = currentSolve.penalty === 2;
    const isPlus2 = currentSolve.penalty === 1;
    const finalTime = isDNF ? null : (isPlus2 ? solveTime + 2000 : solveTime);

    const moveTrace = buildMoveAtMsTrace(this.moveTraceBuffer);
    const saved = await this.localStore.saveSolve({
      ...currentSolve,
      time: solveTime,
      finalTime,
      scramble: currentSolve.scramble || this.state.scramble(),
      moveCount: this.currentMoveCount,
      dnf: isDNF,
      plus2: isPlus2,
      scrambleType: this.state.scrambleType(),
      ollCaseIndex: this.state.lastOllCaseIndex(),
      pllCaseIndex: this.state.lastPllCaseIndex(),
      f2lCaseIndex: this.state.lastF2lCaseIndex(),
      date: new Date(endTime).toISOString(),
      sessionId: currentSolve.sessionId ?? this.state.currentSession()?.id ?? 1,
      moveTrace,
    });
    this.state.currentSolve.set(saved);
    this.state.solves.update((s) => [saved, ...s.filter((x) => x.id !== saved.id)]);

    // Save to API (disabled for testing)
    // await this.api.saveSolve(currentSolve);
    // await this.loadSolves();
    // await this.loadStatistics();

    // Generate new scramble after delay
    setTimeout(() => {
      this.cube.generateScramble();
    }, 1000);
  }

  async applyPenalty(penalty: string): Promise<void> {
    const currentSolve = this.state.currentSolve();
    if (!currentSolve) return;

    let finalTime: number | null = currentSolve.time;
    if (penalty === '+2') {
      finalTime += 2000;
      currentSolve.penalty = 1;
      currentSolve.plus2 = true;
    } else if (penalty === 'DNF') {
      finalTime = null;
      currentSolve.penalty = 2;
      currentSolve.dnf = true;
    }

    currentSolve.finalTime = finalTime;
    currentSolve.dnf = penalty === 'DNF';
    currentSolve.plus2 = penalty === '+2';

    // Get CFOP analysis (disabled for testing)
    // const analysis = await this.api.analyzeSolve(currentSolve.time);
    // if (analysis) { ... }

    currentSolve.sessionId = this.state.currentSession()?.id ?? currentSolve.sessionId ?? 1;
    currentSolve.scrambleType = currentSolve.scrambleType ?? this.state.scrambleType();
    if (currentSolve.scrambleType === 'oll') {
      currentSolve.ollCaseIndex = this.state.lastOllCaseIndex();
    } else if (currentSolve.scrambleType === 'pll') {
      currentSolve.pllCaseIndex = this.state.lastPllCaseIndex();
    } else     if (currentSolve.scrambleType === 'f2l') {
      currentSolve.f2lCaseIndex = this.state.lastF2lCaseIndex();
    }
    currentSolve.moveTrace = buildMoveAtMsTrace(this.moveTraceBuffer);
    const saved = await this.localStore.saveSolve(currentSolve);
    this.state.solves.update((s) => [saved, ...s.filter((x) => x.id !== saved.id)]);

    // Save to API (disabled for testing)
    // await this.api.saveSolve(currentSolve);
    // await this.loadSolves();
    // await this.loadStatistics();

    this.state.currentSolve.set(null);
    this.state.timer.set(0);
  }

  async loadSolves(): Promise<void> {
    this.state.solves.set(this.localStore.getSolves());
  }

  async loadStatistics(): Promise<void> {
    const stats = this.localStore.getStatistics();
    window.dispatchEvent(new CustomEvent('statisticsLoaded', { detail: stats }));
  }

  // For keyboard shortcuts
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      const st = this.state.status();
      if (st === 'idle' || st === 'solving' || st === 'inspecting' || st === 'ready') {
        void this.startSolve();
      }
    } else if (event.code === 'Enter') {
      event.preventDefault();
      this.cube.generateScramble();
    }
  }
}
