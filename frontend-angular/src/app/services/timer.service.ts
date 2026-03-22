import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService, Solve } from './state.service';
import { ApiService } from './api.service';
import { CubeService } from './cube.service';
import { BluetoothService } from './bluetooth.service';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private state = inject(StateService);
  private api = inject(ApiService);
  private cube = inject(CubeService);
  private bluetooth = inject(BluetoothService);

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
    console.log('[TimerService] Cube moves:', moves);

    for (const move of moves) {
      this.currentMoveCount++;
      this.cubeState.push(move);
      // Apply move to virtual cube state
      this.cube.applyMoveToCube(move);
    }

    // Check if cube is solved (simplified check - could be enhanced)
    const isSolved = this.cube.checkSolved();

    if (this.state.status() === 'ready') {
      // First move after inspection starts the timer
      console.log('[TimerService] First move - starting timer');
      this.startTimer();
    } else if (this.state.status() === 'solving') {
      // Update move count during solve
      console.log('[TimerService] Move count:', this.currentMoveCount);
      if (isSolved) {
        console.log('[TimerService] Cube solved - stopping timer');
        this.stopTimer();
      }
    } else if (this.state.status() === 'idle' && this.bluetooth.isConnected()) {
      // Cube connected but idle - start inspection
      console.log('[TimerService] Cube move but idle - starting inspection');
      this.startSolve();
    }
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

      // Start inspection
      this.state.status.set('inspection');
      this.inspectionStart = Date.now();
      this.inspectionStartTime = Date.now();

      this.startInspectionInterval();

      // Auto-start after inspection time if no cube connected
      setTimeout(() => {
        if (this.state.status() === 'ready') {
          this.startTimer();
        }
      }, this.state.inspectionTime() * 1000 + 1000);
    } else if (this.state.status() === 'solving') {
      this.stopTimer();
    }
  }

  private startInspectionInterval(): void {
    this.state.inspectionInterval = setInterval(() => {
      if (this.state.status() === 'inspection') {
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

    // Save to localStorage
    this.addSolveToLocalStorage(solveTime, currentSolve.scramble || this.state.scramble(), currentSolve.moveCount || 0, isDNF, isPlus2);

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

    // Save to localStorage
    const isDNF = penalty === 'DNF';
    const isPlus2 = penalty === '+2';
    this.addSolveToLocalStorage(currentSolve.time, currentSolve.scramble || this.state.scramble(), currentSolve.moveCount || 0, isDNF, isPlus2);

    // Get CFOP analysis (disabled for testing)
    // const analysis = await this.api.analyzeSolve(currentSolve.time);
    // if (analysis) { ... }

    currentSolve.sessionId = this.state.currentSession()?.id;

    // Save to API (disabled for testing)
    // await this.api.saveSolve(currentSolve);
    // await this.loadSolves();
    // await this.loadStatistics();

    this.state.currentSolve.set(null);
    this.state.timer.set(0);
  }

  private addSolveToLocalStorage(time: number, scramble: string, moveCount: number, isDNF: boolean, isPlus2: boolean): void {
    const solves = JSON.parse(localStorage.getItem('solves') || '[]');
    solves.unshift({
      time,
      scramble,
      moveCount,
      dnf: isDNF,
      plus2: isPlus2,
      date: new Date().toISOString()
    });
    localStorage.setItem('solves', JSON.stringify(solves));
  }

  async loadSolves(): Promise<void> {
    // API disabled for testing
    // const solves = await this.api.getSolves();
    // this.state.solves.set(solves);
  }

  async loadStatistics(): Promise<void> {
    // API disabled for testing
    // const stats = await this.api.getStatistics();
    // window.dispatchEvent(new CustomEvent('statisticsLoaded', { detail: stats }));
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
