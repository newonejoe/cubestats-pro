/**
 * csTimer stats reconstruction: calcRecons from src/js/stats/recons.js (GPL-3.0, cs0x7f/cstimer).
 * Depends on mathlib (CubieCube) and cubeutil getProgress / getStepCount.
 */

import type { CubieCube } from './cstimer-mathlib';
import { getMathlib } from './cstimer-mathlib';
import { getCubeUtil } from './cubeutil';

export type CstimerCalcReconsTimes = [
  [number, number],
  string,
  string,
  number,
  [string, string],
];

export type ReconsDataRow = [number, number, number, number, ...unknown[]];

export interface CalcReconsResult {
  data: ReconsDataRow[];
  rawMoves: [string, number][][];
}

class MoveCounterHTM {
  lastPow = 0;
  lastMove = -3;
  moveCnt = 0;
  moves: number[] = [];

  push(move: number): void {
    const axis = ~~(move / 3);
    const amask = 1 << axis;
    if (axis % 3 !== this.lastMove % 3) {
      this.lastMove = axis;
      this.lastPow = 0;
    }
    this.moveCnt += (this.lastPow & amask) === amask ? 0 : 1;
    this.lastPow |= amask;
    this.moves.push(move);
  }

  clear(): void {
    this.lastPow = 0;
    this.lastMove = -3;
    this.moveCnt = 0;
    this.moves = [];
  }
}

/**
 * Same contract as csTimer `calcRecons(times, method)`.
 */
export function calcRecons(times: CstimerCalcReconsTimes, method: string): CalcReconsResult | undefined {
  if (!times?.[4] || times[0]![0]! < 0) {
    return undefined;
  }
  const ml = getMathlib();
  const cubeutil = getCubeUtil();
  const solution = times[4]![0]!.split(/\s+/).filter(Boolean);
  const c = new ml.CubieCube();
  c.ori = 0;
  for (let i = solution.length - 1; i >= 0; i--) {
    c.selfMoveStr(solution[i]!, true);
  }
  c.selfConj();
  const data: ReconsDataRow[] = [];
  const cnter = new MoveCounterHTM();
  const startCubieI = new ml.CubieCube();
  startCubieI.invFrom(c);
  let tsStart = 0;
  /** Match post-phase reset in csTimer: min(tstamp) must be the first turn of the step, not 0. */
  let tsFirst = 1e9;
  const stepMoves: [string, number][] = [];
  let progress = cubeutil.getProgress(c, method);
  if (progress === undefined) {
    return undefined;
  }

  for (let i = 0; i < solution.length; i++) {
    const effMove = c.selfMoveStr(solution[i]!, false);
    if (effMove !== undefined) {
      tsFirst = Math.min(tsFirst, c.tstamp);
      cnter.push(effMove);
      const axis = ~~(effMove / 3);
      stepMoves.push(['URFDLB'.charAt(axis % 6) + " 2'".charAt(effMove % 3), c.tstamp]);
      if (axis >= 6) {
        stepMoves.push(["DLBURF".charAt(axis % 6) + "'2 ".charAt(effMove % 3), c.tstamp]);
      }
    }
    const curProg = cubeutil.getProgress(c, method);
    if (curProg === undefined) {
      return undefined;
    }
    if (curProg < progress) {
      const transCubie = new ml.CubieCube();
      ml.CubieCube.CubeMult(startCubieI, c, transCubie);
      data[--progress] = [tsStart, tsFirst, c.tstamp, cnter.moveCnt, transCubie, stepMoves, cnter.moves.slice()];
      while (progress > curProg) {
        data[--progress] = [c.tstamp, c.tstamp, c.tstamp, 0, new ml.CubieCube(), [], []];
      }
      startCubieI.invFrom(c);
      tsStart = c.tstamp;
      cnter.clear();
      stepMoves.length = 0;
      tsFirst = 1e9;
    }
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row[3] !== 1) {
      continue;
    }
    let j = i + 1;
    while (j < data.length && data[j]![3] === 0) {
      j++;
    }
    if (j === data.length) {
      break;
    }
    cnter.clear();
    const ts = row[2]!;
    const dj = data[j]!;
    const stepMovesJ = dj[5] as [string, number][];
    const stepMovesI = row[5] as [string, number][];
    const effJ = dj[6] as number[];
    const effI = row[6] as number[];
    Array.prototype.push.apply(stepMovesJ, stepMovesI);
    Array.prototype.push.apply(effJ, effI);
    for (let m = 0; m < effJ.length; m++) {
      cnter.push(effJ[m]!);
    }
    for (let m = 0; m < stepMovesI.length; m++) {
      (dj[4] as CubieCube).selfMoveStr(stepMovesI[m]![0], false);
    }
    dj[2] = ts;
    dj[3] = cnter.moveCnt;
    data[i] = [ts, ts, ts, 0, new ml.CubieCube(), [], []];
  }

  const stepCount = cubeutil.getStepCount(method);
  const rawMoves: [string, number][][] = [];
  for (let i = 0; i < stepCount; i++) {
    const slot = data[i]?.[5] as [string, number][] | undefined;
    rawMoves[i] = slot ?? [];
  }
  return {
    data,
    rawMoves: rawMoves.reverse(),
  };
}
