/**
 * csTimer Bluetooth scramble correction (same calls as upstream markScrambled when giiMode == 'n'):
 * - giikerutil.checkScramble → scrState.isEqual(curCubie) after scrHinter.setScramble (bluetoothutil.js)
 * - if false: gen = scramble_333.genFacelet(currentFacelet); kernel.pushSignal('scramble', [ '333', cubeutil.getConjMoves(gen, true), 0 ]) (giiker.js)
 *
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/timer/giiker.js (markScrambled)
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/tools/bluetoothutil.js (scrHinter)
 */

import type { CubeState } from '../../services/state.service';
import type { CubieCube } from './cstimer-mathlib';
import { getMathlib, isMathlibLoaded } from './cstimer-mathlib';
import { getCubeUtil } from './cubeutil';

/** WCA-style sticker colors on our virtual/BT cube → csTimer facelet letters (SOLVED_FACELET / fromFacelet). */
const COLOR_TO_FACELET: Readonly<Record<string, string>> = {
  white: 'U',
  yellow: 'D',
  green: 'F',
  blue: 'B',
  red: 'R',
  orange: 'L',
};

/** URFDLB block order matches mathlib.SOLVED_FACELET. */
export function cubeStateToCstimerFacelet(state: CubeState): string {
  const ch = (c: string) => COLOR_TO_FACELET[c] ?? '?';
  const faces: (keyof CubeState)[] = ['U', 'R', 'F', 'D', 'L', 'B'];
  let s = '';
  for (const f of faces) {
    for (const c of state[f]) {
      s += ch(c);
    }
  }
  return s;
}

/** Exposed for scrHinter.checkState (genFacelet on toSolve facelet). */
export function getScramble333GenFacelet(): ((facelet: string) => string) | null {
  const s = (globalThis as unknown as { scramble_333?: { genFacelet(f: string): string } }).scramble_333;
  return s?.genFacelet?.bind(s) ?? null;
}

/**
 * Target cubie after applying scramble string from solved (csTimer scrHinter.setScramble, preconj = 0).
 */
export function cstimerScrCubieFromScrambleString(scrambleJoined: string): CubieCube | null {
  if (!isMathlibLoaded()) {
    return null;
  }
  const ml = getMathlib();
  const cu = getCubeUtil();
  const conj = cu.getConjMoves(scrambleJoined.trim(), false, 0);
  const scr = cu.parseScramble(conj, 'URFDLB');
  const c = new ml.CubieCube();
  const d = new ml.CubieCube();
  c.ori = 0;
  for (let i = 0; i < scr.length; i++) {
    const axis = scr[i]![0]!;
    let pow = scr[i]![2]!;
    let m = axis * 3 + pow - 1;
    if (m < 0 || m >= 18) {
      continue;
    }
    if (scr[i]![1] === 2) {
      const rot = [3, 15, 17, 1, 11, 23][axis]!;
      for (let j = 0; j < pow; j++) {
        c.ori = ml.CubieCube.rotMult[rot]![c.ori]!;
      }
      m = ml.CubieCube.rotMulM[c.ori]![((axis + 3) % 6) * 3 + pow - 1]!;
    }
    ml.CubieCube.CubeMult(c, ml.CubieCube.moveCube[m] as never, d);
    c.init(d.ca, d.ea);
  }
  return c;
}

/** giikerutil.checkScramble(curCubie): cube matches full scramble target (not prefix-only). */
export function cstimerGiikerCheckScramble(state: CubeState, scrambleJoined: string): boolean {
  if (!scrambleJoined.trim()) {
    return false;
  }
  if (!isMathlibLoaded()) {
    return false;
  }
  const ml = getMathlib();
  const facelet = cubeStateToCstimerFacelet(state);
  if (facelet.includes('?')) {
    return false;
  }
  const cur = new ml.CubieCube();
  if (cur.fromFacelet(facelet) === -1) {
    return false;
  }
  const scr = cstimerScrCubieFromScrambleString(scrambleJoined);
  if (!scr) {
    return false;
  }
  return cur.isEqual(scr);
}

/**
 * Regenerated scramble string for the current physical/virtual state (csTimer markScrambled branch).
 * Returns null if vendor stack is missing or min2phase reports an error.
 */
export function cstimerRegenScrambleFromCubeState(state: CubeState): string | null {
  const genFacelet = getScramble333GenFacelet();
  if (!genFacelet || !isMathlibLoaded()) {
    return null;
  }
  const facelet = cubeStateToCstimerFacelet(state);
  if (facelet.includes('?')) {
    return null;
  }
  const gen = genFacelet(facelet);
  if (typeof gen !== 'string' || !gen.trim() || /^Error\s/i.test(gen.trim())) {
    return null;
  }
  if (!/[URFDLB]/.test(gen)) {
    return null;
  }
  return getCubeUtil().getConjMoves(gen.trim(), true, 0);
}
