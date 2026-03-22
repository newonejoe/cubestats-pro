import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService, CubeState } from './state.service';

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

  // Signals
  scrambleGenerated = signal<string>('');

  // Scramble generation
  private moves = ['U', 'D', 'R', 'L', 'F', 'B'];
  private modifiers = ['', "'", '2'];

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

    // Apply scramble to cube state
    this.applyScramble(sequence);

    this.scrambleGenerated.set(scramble);
  }

  private generateWCAScramble(length: number): string[] {
    const sequence: string[] = [];
    let lastMove = '';
    let secondLastMove = '';

    for (let i = 0; i < length; i++) {
      // Get available moves (avoid same face and opposite face)
      const availableMoves = this.moves.filter(m => {
        if (m === lastMove) return false;
        if (this.isOpposite(m, lastMove) && m === secondLastMove) return false;
        return true;
      });

      const move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      const modifier = this.modifiers[Math.floor(Math.random() * this.modifiers.length)];

      sequence.push(move + modifier);
      secondLastMove = lastMove;
      lastMove = move;
    }

    return sequence;
  }

  private generateCrossScramble(): string[] {
    return this.generateWCAScramble(4);
  }

  private generateF2LScramble(): string[] {
    return this.generateWCAScramble(8);
  }

  private generateOLLScramble(): string[] {
    // 57 OLL cases - simplified random selection
    const ollCases = [
      'R U2 R2 U R2 U R2 U2 R', 'R U R U R U2 R2',
      'R2 D R U2 R D R U2 R', 'M U R U R U R U2 M',
      'R U R U R U2 R', 'R U2 R2 U R2 U R'
    ];
    return [ollCases[Math.floor(Math.random() * ollCases.length)]];
  }

  private generatePLLScramble(): string[] {
    // 21 PLL cases - simplified random selection
    const pllCases = [
      'R U R U R U2 R', 'R U2 R2 U R2 U R',
      'M2 U M2 U2 M2 U M2', 'R U R U R2 D R U2 R D R2'
    ];
    return [pllCases[Math.floor(Math.random() * pllCases.length)]];
  }

  private isOpposite(m1: string, m2: string): boolean {
    const opposites: Record<string, string> = {
      'U': 'D', 'D': 'U',
      'R': 'L', 'L': 'R',
      'F': 'B', 'B': 'F'
    };
    return opposites[m1] === m2;
  }

  // Cube state manipulation
  private applyScramble(sequence: string[]): void {
    let cubeState = { ...this.state.cubeState() };

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
    console.log('[CubeService] btCubeState:', JSON.stringify(currentState));

    if (!currentState) {
      // Fall back to cubeState if btCubeState not available
      currentState = this.state.cubeState();
      console.log('[CubeService] Using cubeState:', JSON.stringify(currentState));
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
    console.log('[CubeService] New state after applyMove:', JSON.stringify(newState));

    // Update both states
    this.state.saveCubeState(newState);
    this.state.btCubeState.set(newState);

    console.log('[CubeService] States after save - cubeState:', JSON.stringify(this.state.cubeState()));
    console.log('[CubeService] States after save - btCubeState:', JSON.stringify(this.state.btCubeState()));
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

  private applyMove(state: CubeState, move: string): CubeState {
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
