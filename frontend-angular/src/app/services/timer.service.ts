import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService, Solve } from './state.service';
import { CubeService } from './cube.service';
import { BluetoothService } from './bluetooth.service';
import { LocalSolveStoreService } from './local-solve-store.service';

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

  constructor() {
    // Set up Bluetooth move callback
    this.bluetooth.setOnMove((moves: string[]) => {
      this.handleCubeMoves(moves);
    });
  }

  private handleCubeMoves(moves: string[]): void {
    console.log('[TimerService] Cube moves:', moves, 'Current status:', this.state.status());

    const currentStatus = this.state.status();

    // Only process moves if Bluetooth is connected and we're in an active solve phase
    if (!this.bluetooth.isConnected()) {
      console.log('[TimerService] Bluetooth not connected, ignoring moves');
      return;
    }

    const scrambleSequence = this.state.scrambleSequence();
    let userMoves: string[] = [...this.state.userTwistMoves()].map(m => m.trim());

    // Trim each move to remove trailing spaces
    const trimmedMoves = moves.map(m => m.trim());

    // Track user moves for scramble navigation (decoupled from cube state)
    for (const move of trimmedMoves) {
      if (!move) continue; // Skip empty moves
      userMoves.push(move);
      this.currentMoveCount++;
      this.cubeState.push(move);

      // Apply move to virtual cube state (Bluetooth cube state updates separately)
      this.cube.applyMoveToCube(move);
    }

    // Update user twist moves and calculate progress
    // This is decoupled from cube state - just tracks move sequence
    if (currentStatus === 'twisting') {
      // Get previously matched user moves (as prefix)
      const prevMatched = this.state.matchedUserMoves();

      // Get unmatched user moves as suffix after prevMatched prefix
      const unmatchedMoves = userMoves.slice(prevMatched.length);
      console.log('[TimerService] Previous matched:', prevMatched);
      console.log('[TimerService] User moves:', userMoves);
      console.log('[TimerService] Unmatched moves for calculation:', unmatchedMoves);

      // Calculate and update progress
      const result = this.calculateScrambleProgress(unmatchedMoves, scrambleSequence);
      this.state.scrambleProgress.set(result.progress);

      // Update matched user moves
      const newMatched = [...prevMatched, ...result.matchedUserMoves];
      this.state.matchedUserMoves.set(newMatched);
      console.log('[TimerService] New matched:', newMatched);

      this.state.userTwistMoves.set(userMoves);
      console.log('[TimerService] Scramble progress:', result.progress, '/', scrambleSequence.length);
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
        // Re-process moves in new context - set user moves and calculate progress
        userMoves = [...moves].map(m => m.trim());
        this.state.userTwistMoves.set(userMoves);
        // Calculate progress for all moves
        const result = this.calculateScrambleProgress(userMoves, scrambleSequence);
        this.state.scrambleProgress.set(result.progress);
        this.state.matchedUserMoves.set(result.matchedUserMoves);
        console.log('[TimerService] Scramble progress:', result.progress, '/', scrambleSequence.length);
        console.log('[TimerService] User twist moves:', userMoves);
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
        // Inspection timer running - moves don't affect it
        break;

      case 'ready':
        // First move after inspection starts the timer
        console.log('[TimerService] First move -> Starting solve timer');
        this.startTimer();
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
    // Reset move count and user twist moves
    this.currentMoveCount = 0;
    this.cubeState = [];
    this.state.userTwistMoves.set([]);
    this.state.scrambleProgress.set(0);
    this.state.scramblePendingHalfMove.set(null);
    this.state.matchedUserMoves.set([]);

    // Reset cube to solved state for twisting
    this.cube.resetCube();

    // Enter twisting phase
    this.state.status.set('twisting');
    console.log('[TimerService] Entered twisting phase - waiting for user to match scramble');
  }

  // Get inverse of a move (R -> R', R' -> R, R2 -> R2)
  private getInverseMove(move: string): string {
    const face = move[0];
    const modifier = move.slice(1);

    if (modifier === '2') {
      return face + '2'; // R2 inverse is R2
    } else if (modifier === "'") {
      return face; // R' inverse is R
    } else {
      return face + "'"; // R inverse is R'
    }
  }

  // Calculate progress by comparing each user move sequentially against scramble
  // Returns: { progress: number, matchedUserMoves: string[] }
  private calculateScrambleProgress(userMoves: string[], scrambleSequence: string[]): { progress: number, matchedUserMoves: string[] } {
    if (userMoves.length === 0 || scrambleSequence.length === 0) {
      console.log('[TimerService] Empty userMoves or scrambleSequence');
      return { progress: 0, matchedUserMoves: [] };
    }

    console.log('[TimerService] User moves:', userMoves);
    console.log('[TimerService] Scramble sequence:', scrambleSequence);

    // Get current progress to start from
    const currentProgress = this.state.scrambleProgress();
    const pendingHalfMove = this.state.scramblePendingHalfMove();
    const matchedUserMoves: string[] = [];

    // Start from current progress index
    let scrambleIndex = currentProgress;
    let pendingHalf: string | null = pendingHalfMove;
    let pendingHalfCount: number = 0;

    console.log('[TimerService] Starting from index:', scrambleIndex, 'pendingHalf:', pendingHalf);

    // Process each user move sequentially
    for (let i = 0; i < userMoves.length && scrambleIndex < scrambleSequence.length; i++) {
      const userMove = userMoves[i];
      const expectedMove = scrambleSequence[scrambleIndex];
      const userFace = userMove[0];
      const expectedFace = expectedMove[0];
      const expectedMod = expectedMove.length > 1 ? expectedMove.slice(1) : '';
      const userMod = userMove.length > 1 ? userMove.slice(1) : '';

      console.log('[TimerService] Comparing userMove:', userMove, 'with expected:', expectedMove, 'at scramble index:', scrambleIndex);

      // Handle pending half move completion (need 2 for R2)
      if (pendingHalf) {
        if (userFace === pendingHalf && expectedMod === '2') {
          pendingHalfCount++;
          console.log('[TimerService] Half move count:', pendingHalfCount);

          if (pendingHalfCount >= 2 || userMod === '2') {
            // Add both the pending move (first R) and current move (second R)
            matchedUserMoves.push(pendingHalf);
            scrambleIndex++;
            matchedUserMoves.push(userMove);
            console.log('[TimerService] Half move completed, progress:', scrambleIndex);
            pendingHalf = null;
            pendingHalfCount = 0;
          } else {
            console.log('[TimerService] Waiting for second half');
          }
          continue;
        } else {
          pendingHalf = null;
          pendingHalfCount = 0;
        }
      }

      // Check if faces match
      if (userFace !== expectedFace) {
        console.log('[TimerService] Different face, no progress');
        continue;
      }

      // Check exact match
      if (userMove === expectedMove) {
        scrambleIndex++;
        matchedUserMoves.push(userMove);
        console.log('[TimerService] Exact match, progress:', scrambleIndex);
        continue;
      }

      // Check inverse cancel
      const isInverse = (userMod === '' && expectedMod === "'") ||
                       (userMod === "'" && expectedMod === '') ||
                       (userMod === '2' && expectedMod === '2');

      if (isInverse) {
        // Cancel - don't advance progress
        console.log('[TimerService] Inverse cancel');
        continue;
      }

      // Check half move (expected B2, user did B)
      if (expectedMod === '2' && userMod === '') {
        pendingHalf = userFace;
        pendingHalfCount = 1;
        console.log('[TimerService] Half move pending, count:', pendingHalfCount);
        continue;
      }

      console.log('[TimerService] No match');
    }

    // Save pending half move state
    this.state.scramblePendingHalfMove.set(pendingHalf);

    console.log('[TimerService] Final progress:', scrambleIndex, 'pendingHalf:', pendingHalf);
    return { progress: scrambleIndex, matchedUserMoves };
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
      // User pressed space during twisting - skip to inspection
      this.startInspection();
    } else if (this.state.status() === 'ready') {
      // Start timer immediately
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

    const saved = this.localStore.saveSolve({
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
    } else if (currentSolve.scrambleType === 'f2l') {
      currentSolve.f2lCaseIndex = this.state.lastF2lCaseIndex();
    }
    const saved = this.localStore.saveSolve(currentSolve);
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
      if (this.state.status() === 'idle' || this.state.status() === 'solving') {
        this.startSolve();
      }
    } else if (event.code === 'Enter') {
      event.preventDefault();
      this.cube.generateScramble();
    }
  }
}
