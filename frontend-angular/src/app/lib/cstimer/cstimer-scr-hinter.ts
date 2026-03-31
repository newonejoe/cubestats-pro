/**
 * csTimer Bluetooth live scramble hint / regen (scrHinter.checkState in bluetoothutil.js).
 * When the cube is off the original scramble, builds genScr = genFacelet(inv(cur)·target) and
 * uses checkInSeq to place ':' markers; the UI maps that to sequence + progress for highlights.
 *
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/tools/bluetoothutil.js (scrHinter)
 */

import type { CubieCube, Mathlib } from './cstimer-mathlib';
import { getMathlib, isMathlibLoaded } from './cstimer-mathlib';
import { getCubeUtil } from './cubeutil';
import {
  cstimerScrCubieFromScrambleString,
  getScramble333GenFacelet,
} from './cstimer-giiker-scramble';

export interface TwistScrHinterCache {
  genCa: Int32Array;
  genEa: Int32Array;
  genOri: number;
  genScr: number[][];
}

function copyCubieArrays(cc: CubieCube): { ca: Int32Array; ea: Int32Array } {
  return {
    ca: Int32Array.from(cc.ca as ArrayLike<number>),
    ea: Int32Array.from(cc.ea as ArrayLike<number>),
  };
}

/**
 * Port of scrHinter.checkInSeq (bluetoothutil.js): returns move string with ':' around index `next`.
 */
export function cstimerCheckInSeq(
  ml: Mathlib,
  state: CubieCube,
  gen: CubieCube | null,
  seq: number[][],
): string | null {
  const CC = ml.CubieCube;
  const c = new CC();
  const d = new CC();
  if (gen) {
    c.init(gen.ca as never, gen.ea as never);
    c.ori = gen.ori;
  }
  let next = 99;
  if (c.isEqual(state)) {
    next = 0;
  }
  let pow = 0;
  for (let i = 0; i < seq.length; i++) {
    const a = seq[i]![0]! * 3;
    for (pow = 0; pow < 3; pow++) {
      CC.CubeMult(c, CC.moveCube[a + pow] as never, d);
      if (d.isEqual(state)) {
        next = pow === seq[i]![2]! - 1 ? i + 1 : i;
        break;
      }
    }
    if (next === i) {
      break;
    }
    const m = seq[i]![0]! * 3 + seq[i]![2]! - 1;
    if (m < 0 || m >= 18) {
      continue;
    }
    CC.CubeMult(c, CC.moveCube[m] as never, d);
    c.init(d.ca, d.ea);
  }
  if (next === 99) {
    return null;
  }
  const faceSuffix = [null as string | null, '', '2', "'"];
  const ret: string[] = [];
  for (let i = 0; i < seq.length; i++) {
    let mi = seq[i]!;
    if (next === 0 && i === 0) {
      mi = [mi[0]!, mi[1]!, ((mi[2]! - pow + 7) % 4) as number];
    }
    if (i === next) {
      ret.push(':');
    }
    ret.push('URFDLB'.charAt(mi[0]!) + (faceSuffix[mi[2]!] ?? ''));
    if (i === next) {
      ret.push(':');
    }
  }
  let s = ret.join(' ');
  s = getCubeUtil().getConjMoves(s, true, 0);
  return s;
}

/** Parse checkInSeq output into flat move list + done count (current move at index progress). */
export function parseScrHinterColonString(colonMoves: string): { sequence: string[]; progress: number } {
  const s = colonMoves.trim();
  if (!s.includes(':')) {
    const sequence = s.split(/\s+/).filter(Boolean);
    return { sequence, progress: sequence.length };
  }
  const parts = s.split(':', 3).map((p) => p.trim());
  const tok = (t: string) => t.split(/\s+/).filter(Boolean);
  const p0 = tok(parts[0]!);
  const p1 = parts.length > 1 ? tok(parts[1]!) : [];
  const p2 = parts.length > 2 ? tok(parts[2]!) : [];
  return { sequence: [...p0, ...p1, ...p2], progress: p0.length };
}

export interface TwistScrHinterDisplayResult {
  display: { sequence: string[]; progress: number };
  nextCache: TwistScrHinterCache | null;
}

/**
 * Live twist display (csTimer kernel scrfix data), without changing the stored WCA scramble / target.
 */
export function computeTwistScrHinterDisplay(
  scrambleJoined: string,
  curCubie: CubieCube,
  cache: TwistScrHinterCache | null,
): TwistScrHinterDisplayResult | null {
  if (!scrambleJoined.trim() || !isMathlibLoaded()) {
    return null;
  }
  const ml = getMathlib();
  const cu = getCubeUtil();
  const rawScr = cu.parseScramble(cu.getConjMoves(scrambleJoined.trim(), false, 0), 'URFDLB');
  const scrState = cstimerScrCubieFromScrambleString(scrambleJoined);
  if (!scrState) {
    return null;
  }

  const state = curCubie;
  let toMoveFix: string | null = null;
  let toMoveRaw: string | null = null;
  let nextCache: TwistScrHinterCache | null = cache;

  if (cache) {
    const genCubie = new ml.CubieCube();
    genCubie.init(cache.genCa as never, cache.genEa as never);
    genCubie.ori = cache.genOri;
    toMoveFix = cstimerCheckInSeq(ml, state, genCubie, cache.genScr);
  }

  if (toMoveFix == null || !toMoveFix.includes(':')) {
    toMoveRaw = cstimerCheckInSeq(ml, state, null, rawScr);
    nextCache = null;
    toMoveFix = null;
  }

  if (toMoveRaw == null && toMoveFix == null) {
    const genFacelet = getScramble333GenFacelet();
    if (!genFacelet) {
      return null;
    }
    const genState = new ml.CubieCube();
    genState.init(state.ca as never, state.ea as never);
    genState.ori = state.ori;
    const stateInv = new ml.CubieCube();
    stateInv.invFrom(state);
    const toSolve = new ml.CubieCube();
    ml.CubieCube.CubeMult(stateInv, scrState, toSolve);
    const f = toSolve.toFaceCube();
    const genStr = genFacelet(f);
    if (typeof genStr !== 'string' || !genStr.trim() || /^Error\s/i.test(genStr.trim()) || !/[URFDLB]/.test(genStr)) {
      return null;
    }
    const genScrParsed = cu.parseScramble(genStr.trim(), 'URFDLB');
    toMoveFix = cstimerCheckInSeq(ml, state, genState, genScrParsed);
    if (toMoveFix) {
      const { ca, ea } = copyCubieArrays(genState);
      nextCache = {
        genCa: ca,
        genEa: ea,
        genOri: genState.ori,
        genScr: genScrParsed.map((row) => [...row]),
      };
    } else {
      nextCache = null;
    }
  }

  const toMove = toMoveFix ?? toMoveRaw;
  if (!toMove) {
    return null;
  }
  const display = parseScrHinterColonString(toMove);
  if (display.sequence.length === 0) {
    return null;
  }
  return { display, nextCache };
}
