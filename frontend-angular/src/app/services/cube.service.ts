import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService, CubeState } from './state.service';
import { CstimerScrambleService } from './cstimer-scramble.service';
import { ALL_OLL_INDICES } from '../data/oll-cases';
import { ALL_PLL_INDICES } from '../data/pll-cases';
/** @see ../data/cstimer-reference.ts — OLL/PLL indices match csTimer oll_map / pll_map */

// Standard WCA colors
const COLORS: Record<string, string> = {
  white: '#ffffff',
  yellow: '#ffd500',
  red: '#b90000',
  orange: '#ff5900',
  green: '#009b48',
  blue: '#0045ad'
};

@Injectable({
  providedIn: 'root'
})
export class CubeService {
  private state = inject(StateService);
  private cstimerScramble = inject(CstimerScrambleService);

  // Signals
  scrambleGenerated = signal<string>('');

  generateScramble(): void {
    const type = this.state.scrambleType();
    const length = this.state.scrambleLength();

    let scramble = '';
    let sequence: string[] = [];

    switch (type) {
      case 'wca':
        sequence = this.generateWCAScramble(length);
        break;
      case 'cross':
        sequence = this.generateCrossScramble();
        break;
      case 'f2l':
        sequence = this.generateF2LScramble();
        break;
      case 'oll':
        sequence = this.generateOLLScramble();
        break;
      case 'pll':
        sequence = this.generatePLLScramble();
        break;
      default:
        sequence = this.generateWCAScramble(length);
    }

    scramble = sequence.join(' ');
    this.state.scramble.set(scramble);
    this.state.scrambleSequence.set(sequence);
    this.state.scrambleIndex.set(0);

    // Reset cube to solved state first, then apply scramble
    // This creates the "scramble target" state that user must match
    this.state.resetCubeState();
    const scrambleTargetState = this.applyScrambleGetState(sequence);
    this.state.scrambleTargetState.set(scrambleTargetState);

    this.scrambleGenerated.set(scramble);
  }

  // Apply scramble and return the resulting state (without saving)
  private applyScrambleGetState(sequence: string[]): CubeState {
    let cubeState = this.getSolvedState();

    for (const move of sequence) {
      cubeState = this.applyMove(cubeState, move);
    }

    return cubeState;
  }

  // Get solved cube state
  getSolvedState(): CubeState {
    return {
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      R: Array(9).fill('red'),
      L: Array(9).fill('orange'),
      F: Array(9).fill('green'),
      B: Array(9).fill('blue')
    };
  }

  // Compare two cube states
  statesEqual(state1: CubeState, state2: CubeState): boolean {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'] as const;
    for (const face of faces) {
      const colors1 = state1[face];
      const colors2 = state2[face];
      for (let i = 0; i < 9; i++) {
        if (colors1[i] !== colors2[i]) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * WCA-style 25-move random-turn scramble: cstimer megascramble "333o"
   * ([["U","D"],["R","L"],["F","B"]], cubesuff) — NOT the same as cstimer's
   * default menu "333", which uses min2phase random-state (getRandomScramble).
   */
  private generateWCAScramble(_length: number): string[] {
    return this.mega333o(25);
  }

  /**
   * cstimer scramble.js mega() — bitmask applies to face slot within axis (second),
   * then a random suffix from cubesuff is appended (same as megascramble.js "333o").
   */
  private mega333o(length: number): string[] {
    const turns = [
      ['U', 'D'],
      ['R', 'L'],
      ['F', 'B']
    ];
    const suffixes = ['', '2', "'"];
    const sequence: string[] = [];
    let donemoves = 0;
    let lastaxis = -1;

    for (let i = 0; i < length; i++) {
      let first: number;
      let second: number;
      do {
        first = Math.floor(Math.random() * turns.length);
        second = Math.floor(Math.random() * turns[first].length);
        if (first !== lastaxis) {
          donemoves = 0;
          lastaxis = first;
        }
      } while (((donemoves >> second) & 1) !== 0);
      donemoves |= 1 << second;
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      sequence.push(turns[first][second] + suffix);
    }
    return sequence;
  }

  /** Setup moves for cross training — same mega as cstimer 333o. */
  private mega333oSetup(length: number): string[] {
    return this.mega333o(length);
  }

  /**
   * cstimer easyc: cross.getEasyCross(length) picks a cross edge pattern whose *cross-only*
   * HTM distance lies between min/max of the two digits (see cross.js); getAnyScramble then
   * builds a full-cube random state with random corners — scramble length is from min2phase (~15–21),
   * not the cross bound.
   */
  private generateCrossScramble(): string[] {
    if (this.cstimerScramble.isReady()) {
      try {
        const s = this.cstimerScramble.scrambleString('easyc', this.state.scrambleLength());
        return this.tokenizeScramble(s);
      } catch (e) {
        console.warn('[CubeService] cstimer easy cross failed, using mega fallback', e);
      }
    }
    // Match WCA-ish length if cstimer unavailable (do not use 1–3 moves — that only looks like “easy cross”)
    return this.mega333o(25);
  }

  private generateF2LScramble(): string[] {
    if (this.cstimerScramble.isReady()) {
      try {
        const s = this.cstimerScramble.scrambleString('f2l', 0);
        return this.tokenizeScramble(s);
      } catch (e) {
        console.warn('[CubeService] cstimer F2L failed, using mega fallback', e);
      }
    }
    return this.mega333o(8);
  }

  private generateOLLScramble(): string[] {
    if (this.cstimerScramble.isReady()) {
      try {
        const pool = this.pickOllCasePool();
        const idx = pool[Math.floor(Math.random() * pool.length)]!;
        this.state.lastOllCaseIndex.set(idx);
        const s = this.cstimerScramble.scrambleString('oll', 0, { cases: idx });
        return this.tokenizeScramble(s);
      } catch (e) {
        console.warn('[CubeService] cstimer OLL failed, using mega fallback', e);
      }
    }
    this.state.lastOllCaseIndex.set(null);
    return this.mega333o(8);
  }

  private generatePLLScramble(): string[] {
    if (this.cstimerScramble.isReady()) {
      try {
        const pool = this.pickPllCasePool();
        const idx = pool[Math.floor(Math.random() * pool.length)]!;
        this.state.lastPllCaseIndex.set(idx);
        const s = this.cstimerScramble.scrambleString('pll', 0, { cases: idx });
        return this.tokenizeScramble(s);
      } catch (e) {
        console.warn('[CubeService] cstimer PLL failed, using mega fallback', e);
      }
    }
    this.state.lastPllCaseIndex.set(null);
    return this.mega333o(8);
  }

  /** csTimer oll_map indices 0–57 */
  private pickOllCasePool(): number[] {
    if (this.state.ollSubsetMode() === 'full') {
      return [...ALL_OLL_INDICES];
    }
    const s = this.state.ollEnabledIndices();
    const arr = [...s].filter((i) => i >= 0 && i <= 57);
    return arr.length > 0 ? arr : [...ALL_OLL_INDICES];
  }

  /** csTimer pll_map indices 0–20 */
  private pickPllCasePool(): number[] {
    if (this.state.pllSubsetMode() === 'full') {
      return [...ALL_PLL_INDICES];
    }
    const s = this.state.pllEnabledIndices();
    const arr = [...s].filter((i) => i >= 0 && i <= 20);
    return arr.length > 0 ? arr : [...ALL_PLL_INDICES];
  }

  private tokenizeScramble(s: string): string[] {
    return s.trim().split(/\s+/).filter(Boolean);
  }

  // Cube state manipulation
  private applyScramble(sequence: string[]): void {
    // Reset to solved first
    let cubeState = this.getSolvedState();

    for (const move of sequence) {
      cubeState = this.applyMove(cubeState, move);
    }

    this.state.saveCubeState(cubeState);
  }

  // Apply a single move to the virtual cube state (called when Bluetooth moves are received)
  applyMoveToCube(move: string): void {
    console.log('[CubeService] applyMoveToCube called with move:', move);

    // Use btCubeState if available (has scrambled state from facelets)
    let currentState = this.state.btCubeState();
    // console.log('[CubeService] btCubeState:', JSON.stringify(currentState));

    if (!currentState) {
      // Fall back to cubeState if btCubeState not available
      currentState = this.state.cubeState();
      // console.log('[CubeService] Using cubeState:', JSON.stringify(currentState));
    }

    const workingState = currentState ? { ...currentState } : {
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      R: Array(9).fill('red'),
      L: Array(9).fill('orange'),
      F: Array(9).fill('green'),
      B: Array(9).fill('blue')
    };

    const newState = this.applyMove(workingState, move);
    // console.log('[CubeService] New state after applyMove:', JSON.stringify(newState));

    // Update both states
    this.state.saveCubeState(newState);
    this.state.btCubeState.set(newState);

    // console.log('[CubeService] States after save - cubeState:', JSON.stringify(this.state.cubeState()));
    // console.log('[CubeService] States after save - btCubeState:', JSON.stringify(this.state.btCubeState()));
  }

  // Apply multiple moves to the virtual cube state
  applyMovesToCube(moves: string[]): void {
    let cubeState = { ...this.state.cubeState() };
    for (const move of moves) {
      cubeState = this.applyMove(cubeState, move);
    }
    this.state.saveCubeState(cubeState);
    console.log('[CubeService] Applied moves:', moves);
  }

  applyMove(state: CubeState, move: string): CubeState {
    const face = move[0];
    const modifier = move.slice(1);

    // Create mutable copies
    const s: CubeState = {
      U: [...state.U],
      D: [...state.D],
      R: [...state.R],
      L: [...state.L],
      F: [...state.F],
      B: [...state.B]
    };

    // Helper to reverse an array
    const reverse = (arr: string[]): string[] => [arr[2], arr[1], arr[0]];

    switch (face) {
      case 'R':
        if (modifier === "'") {
          const temp = [s.U[8], s.U[5], s.U[2]];
          [s.U[8], s.U[5], s.U[2]] = [s.B[0], s.B[3], s.B[6]];
          [s.B[0], s.B[3], s.B[6]] = reverse([s.D[2], s.D[5], s.D[8]]);
          [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
          [s.F[2], s.F[5], s.F[8]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.U[8], s.U[5], s.U[2]];
          [s.U[8], s.U[5], s.U[2]] = reverse([s.D[2], s.D[5], s.D[8]]);
          [s.D[2], s.D[5], s.D[8]] = reverse(temp);
          const tempR = [s.B[0], s.B[3], s.B[6]];
          [s.B[0], s.B[3], s.B[6]] = reverse([s.F[2], s.F[5], s.F[8]]);
          [s.F[2], s.F[5], s.F[8]] = reverse(tempR);
        } else {
          const temp = [s.U[8], s.U[5], s.U[2]];
          [s.U[8], s.U[5], s.U[2]] = reverse([s.F[2], s.F[5], s.F[8]]);
          [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
          [s.D[2], s.D[5], s.D[8]] = reverse([s.B[0], s.B[3], s.B[6]]);
          [s.B[0], s.B[3], s.B[6]] = temp;
        }
        this.rotateFace(s.R, modifier);
        break;
      case 'L':
        if (modifier === "'") {
          const temp = [s.U[0], s.U[3], s.U[6]];
          [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
          [s.F[0], s.F[3], s.F[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
          [s.D[6], s.D[3], s.D[0]] = [s.B[2], s.B[5], s.B[8]];
          [s.B[2], s.B[5], s.B[8]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.U[0], s.U[3], s.U[6]];
          [s.U[0], s.U[3], s.U[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
          [s.D[6], s.D[3], s.D[0]] = reverse(temp);
          const tempR = [s.F[0], s.F[3], s.F[6]];
          [s.F[0], s.F[3], s.F[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
          [s.B[2], s.B[5], s.B[8]] = reverse(tempR);
        } else {
          const temp = [s.U[0], s.U[3], s.U[6]];
          [s.U[0], s.U[3], s.U[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
          [s.B[2], s.B[5], s.B[8]] = [s.D[6], s.D[3], s.D[0]];
          [s.D[6], s.D[3], s.D[0]] = reverse([s.F[0], s.F[3], s.F[6]]);
          [s.F[0], s.F[3], s.F[6]] = temp;
        }
        this.rotateFace(s.L, modifier);
        break;
      case 'U':
        if (modifier === "'") {
          const temp = [s.B[2], s.B[1], s.B[0]];
          [s.B[2], s.B[1], s.B[0]] = [s.R[2], s.R[1], s.R[0]];
          [s.R[2], s.R[1], s.R[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
          [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
          [s.L[0], s.L[1], s.L[2]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.B[2], s.B[1], s.B[0]];
          [s.B[2], s.B[1], s.B[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
          [s.F[0], s.F[1], s.F[2]] = reverse(temp);
          const tempR = [s.R[2], s.R[1], s.R[0]];
          [s.R[2], s.R[1], s.R[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
          [s.L[0], s.L[1], s.L[2]] = reverse(tempR);
        } else {
          const temp = [s.B[2], s.B[1], s.B[0]];
          [s.B[2], s.B[1], s.B[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
          [s.L[0], s.L[1], s.L[2]] = [s.F[0], s.F[1], s.F[2]];
          [s.F[0], s.F[1], s.F[2]] = reverse([s.R[2], s.R[1], s.R[0]]);
          [s.R[2], s.R[1], s.R[0]] = temp;
        }
        this.rotateFace(s.U, modifier);
        break;
      case 'D':
        if (modifier === "'") {
          const temp = [s.F[6], s.F[7], s.F[8]];
          [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
          [s.R[6], s.R[7], s.R[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
          [s.B[8], s.B[7], s.B[6]] = [s.L[8], s.L[7], s.L[6]];
          [s.L[8], s.L[7], s.L[6]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.F[6], s.F[7], s.F[8]];
          [s.F[6], s.F[7], s.F[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
          [s.B[8], s.B[7], s.B[6]] = reverse(temp);
          const tempR = [s.R[6], s.R[7], s.R[8]];
          [s.R[6], s.R[7], s.R[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
          [s.L[8], s.L[7], s.L[6]] = reverse(tempR);
        } else {
          const temp = [s.F[6], s.F[7], s.F[8]];
          [s.F[6], s.F[7], s.F[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
          [s.L[8], s.L[7], s.L[6]] = [s.B[8], s.B[7], s.B[6]];
          [s.B[8], s.B[7], s.B[6]] = reverse([s.R[6], s.R[7], s.R[8]]);
          [s.R[6], s.R[7], s.R[8]] = temp;
        }
        this.rotateFace(s.D, modifier);
        break;
      case 'F':
        if (modifier === "'") {
          const temp = [s.U[6], s.U[7], s.U[8]];
          [s.U[6], s.U[7], s.U[8]] = [s.R[0], s.R[3], s.R[6]];
          [s.R[0], s.R[3], s.R[6]] = reverse([s.D[0], s.D[1], s.D[2]]);
          [s.D[0], s.D[1], s.D[2]] = [s.L[2], s.L[5], s.L[8]];
          [s.L[2], s.L[5], s.L[8]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.U[6], s.U[7], s.U[8]];
          [s.U[6], s.U[7], s.U[8]] = reverse([s.D[0], s.D[1], s.D[2]]);
          [s.D[0], s.D[1], s.D[2]] = reverse(temp);
          const tempR = [s.R[0], s.R[3], s.R[6]];
          [s.R[0], s.R[3], s.R[6]] = reverse([s.L[2], s.L[5], s.L[8]]);
          [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
        } else {
          const temp = [s.U[6], s.U[7], s.U[8]];
          [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
          [s.L[2], s.L[5], s.L[8]] = [s.D[0], s.D[1], s.D[2]];
          [s.D[0], s.D[1], s.D[2]] = reverse([s.R[0], s.R[3], s.R[6]]);
          [s.R[0], s.R[3], s.R[6]] = temp;
        }
        this.rotateFace(s.F, modifier);
        break;
      case 'B':
        if (modifier === "'") {
          const temp = [s.U[2], s.U[1], s.U[0]];
          [s.U[2], s.U[1], s.U[0]] = [s.L[0], s.L[3], s.L[6]];
          [s.L[0], s.L[3], s.L[6]] = reverse([s.D[8], s.D[7], s.D[6]]);
          [s.D[8], s.D[7], s.D[6]] = [s.R[2], s.R[5], s.R[8]];
          [s.R[2], s.R[5], s.R[8]] = reverse(temp);
        } else if (modifier === '2') {
          const temp = [s.U[2], s.U[1], s.U[0]];
          [s.U[2], s.U[1], s.U[0]] = reverse([s.D[8], s.D[7], s.D[6]]);
          [s.D[8], s.D[7], s.D[6]] = reverse(temp);
          const tempR = [s.L[0], s.L[3], s.L[6]];
          [s.L[0], s.L[3], s.L[6]] = reverse([s.R[2], s.R[5], s.R[8]]);
          [s.R[2], s.R[5], s.R[8]] = reverse(tempR);
        } else {
          const temp = [s.U[2], s.U[1], s.U[0]];
          [s.U[2], s.U[1], s.U[0]] = reverse([s.R[2], s.R[5], s.R[8]]);
          [s.R[2], s.R[5], s.R[8]] = [s.D[8], s.D[7], s.D[6]];
          [s.D[8], s.D[7], s.D[6]] = reverse([s.L[0], s.L[3], s.L[6]]);
          [s.L[0], s.L[3], s.L[6]] = temp;
        }
        this.rotateFace(s.B, modifier);
        break;
    }

    return s;
  }

  private rotateFace(face: string[], modifier: string): void {
    if (modifier === "'") {
      // Counter-clockwise
      const temp = [...face];
      face[0] = temp[2]; face[1] = temp[5]; face[2] = temp[8];
      face[3] = temp[1]; face[4] = temp[4]; face[5] = temp[7];
      face[6] = temp[0]; face[7] = temp[3]; face[8] = temp[6];
    } else if (modifier === '2') {
      // 180 degrees
      const temp = [...face];
      face[0] = temp[8]; face[1] = temp[7]; face[2] = temp[6];
      face[3] = temp[5]; face[4] = temp[4]; face[5] = temp[3];
      face[6] = temp[2]; face[7] = temp[1]; face[8] = temp[0];
    } else {
      // Clockwise
      const temp = [...face];
      face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
      face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
      face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
    }
  }

  // Get CSS color for a face color name
  getColor(colorName: string): string {
    return COLORS[colorName] || colorName;
  }

  // Reset cube to solved state
  resetCube(): void {
    this.state.resetCubeState();
  }

  // Update cube from Bluetooth
  updateFromBluetooth(newState: CubeState): void {
    this.state.btCubeState.set(newState);
    this.state.saveCubeState(newState);
  }

  // Check if cube is solved
  checkSolved(): boolean {
    const state = this.state.btCubeState();
    if (!state) return false;

    const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
    for (const face of faces) {
      const faceColors = state[face as keyof CubeState];
      if (!faceColors || faceColors.length !== 9) continue;
      const firstColor = faceColors[0];
      if (!faceColors.every(c => c === firstColor)) {
        return false;
      }
    }
    return true;
  }
}
