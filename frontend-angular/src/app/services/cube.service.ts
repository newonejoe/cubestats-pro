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

  private applyMove(state: CubeState, move: string): CubeState {
    const face = move[0];
    const modifier = move.slice(1);

    const newState: CubeState = {
      U: [...state.U],
      D: [...state.D],
      R: [...state.R],
      L: [...state.L],
      F: [...state.F],
      B: [...state.B]
    };

    switch (face) {
      case 'U':
        newState.U = this.rotateFaceClockwise(state.U, modifier);
        break;
      case 'D':
        newState.D = this.rotateFaceClockwise(state.D, modifier);
        break;
      case 'R':
        newState.R = this.rotateFaceClockwise(state.R, modifier);
        break;
      case 'L':
        newState.L = this.rotateFaceClockwise(state.L, modifier);
        break;
      case 'F':
        newState.F = this.rotateFaceClockwise(state.F, modifier);
        break;
      case 'B':
        newState.B = this.rotateFaceClockwise(state.B, modifier);
        break;
    }

    return newState;
  }

  private rotateFaceClockwise(face: string[], modifier: string): string[] {
    const result = [...face];
    let times = 1;

    if (modifier === '2') {
      times = 2;
    } else if (modifier === "'") {
      times = 3;
    }

    for (let t = 0; t < times; t++) {
      const temp = [...result];
      result[0] = temp[6];
      result[1] = temp[3];
      result[2] = temp[0];
      result[3] = temp[7];
      result[4] = temp[4];
      result[5] = temp[1];
      result[6] = temp[8];
      result[7] = temp[5];
      result[8] = temp[2];
    }

    return result;
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
}
