import { describe, expect, it } from 'vitest';
import { cubeStateToCstimerFacelet } from './cstimer-giiker-scramble';
import type { CubeState } from '../../services/state.service';

describe('cstimer-giiker-scramble', () => {
  it('cubeStateToCstimerFacelet matches mathlib SOLVED_FACELET order (URFDLB × 9)', () => {
    const solved: CubeState = {
      U: Array(9).fill('white'),
      R: Array(9).fill('red'),
      F: Array(9).fill('green'),
      D: Array(9).fill('yellow'),
      L: Array(9).fill('orange'),
      B: Array(9).fill('blue'),
    };
    expect(cubeStateToCstimerFacelet(solved)).toBe(
      'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
    );
  });
});
