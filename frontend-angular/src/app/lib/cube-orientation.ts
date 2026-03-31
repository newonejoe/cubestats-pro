import type { CubeState } from '../services/state.service';

/**
 * Whole-cube x2 rotation (R rotation 180° about x through L–R): U↔D, F↔B, each face rotated 180°.
 * Use so CFOP "yellow on top" matches csTimer last-layer training when app state is white-U / yellow-D.
 */
export function rotateCubeX2(s: CubeState): CubeState {
  const rot180 = (f: string[]) => [...f].reverse();
  return {
    U: rot180(s.D),
    D: rot180(s.U),
    F: rot180(s.B),
    B: rot180(s.F),
    L: rot180(s.L),
    R: rot180(s.R)
  };
}
