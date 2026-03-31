/**
 * csTimer cubeutil (src/js/lib/cubeutil.js), TypeScript port. GPL-3.0 — cs0x7f/cstimer.
 * Requires `getMathlib()` (vendor mathlib script). Optional globals: scramble_333, scramble_222, kernel, tools.
 */

import type { CubieCube, Mathlib } from './cstimer-mathlib';
import { getMathlib } from './cstimer-mathlib';

type ProgressParam = [string | CubieCube, number];

let stepParamsRef: Record<string, [number, number[][]]> = {};

interface Scramble333 {
  getPLLImage(i: number): [string];
  getOLLImage(i: number): [string];
  getCOLLImage(face: string, i: number): [string];
  getZBLLImage(i: number): [string];
}

interface Scramble222 {
  getEGLLImage(i: number): [string];
}

function gScramble333(): Scramble333 {
  const s = (globalThis as unknown as { scramble_333?: Scramble333 }).scramble_333;
  if (!s) {
    throw new Error('scramble_333 is not loaded');
  }
  return s;
}

function gScramble222(): Scramble222 {
  const s = (globalThis as unknown as { scramble_222?: Scramble222 }).scramble_222;
  if (!s) {
    throw new Error('scramble_222 is not loaded');
  }
  return s;
}

function gKernel(): { getProp(key: string, def?: string): string } {
  const k = (globalThis as unknown as { kernel?: { getProp(key: string, def?: string): string } }).kernel;
  if (!k) {
    throw new Error('kernel is not loaded');
  }
  return k;
}

function gTools(): { isPuzzle(id: string, scramble: unknown): boolean; isCurTrainScramble?: () => boolean } {
  const t = (globalThis as unknown as { tools?: { isPuzzle(id: string, scramble: unknown): boolean } }).tools;
  if (!t) {
    throw new Error('tools is not loaded');
  }
  return t;
}

export interface CubeUtilApi {
  getProgress(facelet: unknown, method: string): number | undefined;
  getStepNames(method: string): string[] | undefined;
  getStepCount(method: string): number;
  getStepProgress(step: string, facelet: string, n_axis?: number): number;
  getPrettyMoves(rawMoveSeqs: [string, number][][]): [string, number][];
  getPrettyReconstruction(rawMoves: [string, number][][], method: string): { prettySolve: string; totalMoves: number };
  moveSeq2str(moveSeq: [string, number][]): string;
  getScrambledState(scramble: [string, string], reqFace?: boolean): string | CubieCube | undefined;
  identStep(step: string, facelet: string): number | undefined;
  getIdentData(method?: string): unknown;
  parseScramble(scramble: string, moveMap: string, addPreScr?: boolean): number[][];
  getConjMoves(moves: string, inv?: boolean, conj?: number): string;
  getPreConj(): number;
}

function toEqus(facelet: string): number[][] {
  const col2equ: Record<string, number[]> = {};
  for (let i = 0; i < facelet.length; i++) {
    const col = facelet[i]!;
    if (col === '-') {
      continue;
    }
    col2equ[col] = col2equ[col] || [];
    col2equ[col]!.push(i);
  }
  const equs: number[][] = [];
  for (const col of Object.keys(col2equ)) {
    const arr = col2equ[col]!;
    if (arr.length > 1) {
      equs.push(arr);
    }
  }
  return equs;
}

export function createCubeUtil(ml: Mathlib): CubeUtilApi {
  const crossMask = toEqus('----U--------R--R-----F--F--D-DDD-D-----L--L-----B--B-');
  const f2l1Mask = toEqus('----U-------RR-RR-----FF-FF-DDDDD-D-----L--L-----B--B-');
  const f2l2Mask = toEqus('----U--------R--R----FF-FF-DD-DDD-D-----LL-LL----B--B-');
  const f2l3Mask = toEqus('----U--------RR-RR----F--F--D-DDD-DD----L--L----BB-BB-');
  const f2l4Mask = toEqus('----U--------R--R-----F--F--D-DDDDD----LL-LL-----BB-BB-');
  const f2lMask = toEqus('----U-------RRRRRR---FFFFFFDDDDDDDDD---LLLLLL---BBBBBB');
  const ollMask = toEqus('UUUUUUUUU---RRRRRR---FFFFFFDDDDDDDDD---LLLLLL---BBBBBB');
  const eollMask = toEqus('-U-UUU-U----RRRRRR---FFFFFFDDDDDDDDD---LLLLLL---BBBBBB');
  const cpllMask = toEqus('UUUUUUUUUr-rRRRRRRf-fFFFFFFDDDDDDDDDl-lLLLLLLb-bBBBBBB');
  const roux1Mask = toEqus('---------------------F--F--D--D--D-----LLLLLL-----B--B');
  const roux2Mask = toEqus('------------RRRRRR---F-FF-FD-DD-DD-D---LLLLLL---B-BB-B');
  const roux3Mask = toEqus('U-U---U-Ur-rRRRRRRf-fF-FF-FD-DD-DD-Dl-lLLLLLLb-bB-BB-B');
  const LLPattern = '012345678cdeRRRRRR9abFFFFFFDDDDDDDDDijkLLLLLLfghBBBBBB';
  const c2LLPattern = '0-1---2-36-7---R-R4-5---F-FD-D---D-Da-b---L-L8-9---B-B';
  const c2LLMask = toEqus('---------------R-R------F-FD-D---D-D------L-L------B-B');
  const solvedMask = toEqus(ml.SOLVED_FACELET);

  const cubeRots = (function genRots() {
    function faceletRot(facelet: number[], rot: number[]) {
      const ret: number[] = [];
      for (let i = 0; i < 54; i++) {
        ret[rot[i]!] = facelet[i]!;
      }
      return ret;
    }
    const cubeRotY = ml.CubieCube.rotCube[3]!.toPerm();
    ml.circle(cubeRotY, 13, 49, 40, 22);
    const cubeRotX = ml.CubieCube.rotCube[15]!.toPerm();
    ml.circle(cubeRotX, 4, 22, 31, 49);
    const cubeRotZ = ml.CubieCube.rotCube[17]!.toPerm();
    ml.circle(cubeRotZ, 4, 40, 31, 13);
    const ret: number[][] = [];
    let cur: number[] = [];
    for (let i = 0; i < 54; i++) {
      cur[i] = i;
    }
    for (let a = 0; a < 24; a++) {
      ret[a] = cur.slice();
      cur = faceletRot(cur, a & 1 ? cubeRotX : cubeRotZ);
      if (a % 6 === 5) {
        cur = faceletRot(cur, cubeRotZ);
        cur = faceletRot(cur, cubeRotZ);
      }
      if (a % 12 === 11) {
        cur = faceletRot(cur, cubeRotY);
        cur = faceletRot(cur, cubeRotY);
      }
    }
    return ret;
  })();

  function solvedProgressCubie(param: ProgressParam, mask?: number[][]) {
    const facelet = param[0] as CubieCube;
    const faceGetter = (i: number) => {
      const src = ml.CubieCube.faceMap[i];
      let ret = 0;
      if (!src) {
        ret = i;
      } else if (src[0] === 0) {
        const val = facelet.ca[src[1]!]!;
        ret = ml.CubieCube.cFacelet[val & 0x7]![(3 - (val >> 3) + src[2]!) % 3]!;
      } else if (src[0] === 1) {
        const val = facelet.ea[src[1]!]!;
        ret = ml.CubieCube.eFacelet[val >> 1]![(val & 1) ^ src[2]!]!;
      }
      return ~~(ret / 9);
    };
    const cubeRot = cubeRots[param[1]!]!;
    const m = mask || solvedMask;
    for (let i = 0; i < m.length; i++) {
      const equ = m[i]!;
      const col = faceGetter(cubeRot[equ[0]!]!);
      for (let j = 1; j < equ.length; j++) {
        if (faceGetter(cubeRot[equ[j]!]!) !== col) {
          return 1;
        }
      }
    }
    return 0;
  }

  function solvedProgress(param: ProgressParam, mask?: number[][]) {
    if (param[0] instanceof ml.CubieCube) {
      return solvedProgressCubie(param, mask);
    }
    const cubeRot = cubeRots[param[1]!]!;
    const facelet = param[0] as string;
    const m = mask || solvedMask;
    for (let i = 0; i < m.length; i++) {
      const equ = m[i]!;
      const col = facelet[cubeRot[equ[0]!]!]!;
      for (let j = 1; j < equ.length; j++) {
        if (facelet[cubeRot[equ[j]!]!] !== col) {
          return 1;
        }
      }
    }
    return 0;
  }

  function getCF4O2P2Progress(param: ProgressParam) {
    if (solvedProgress(param, crossMask)) {
      return 9;
    }
    if (solvedProgress(param, f2lMask)) {
      return (
        4 +
        solvedProgress(param, f2l1Mask) +
        solvedProgress(param, f2l2Mask) +
        solvedProgress(param, f2l3Mask) +
        solvedProgress(param, f2l4Mask)
      );
    }
    if (solvedProgress(param, eollMask)) {
      return 4;
    }
    if (solvedProgress(param, ollMask)) {
      return 3;
    }
    if (solvedProgress(param, cpllMask)) {
      return 2;
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  function getCF4OPProgress(param: ProgressParam) {
    if (solvedProgress(param, crossMask)) {
      return 7;
    }
    if (solvedProgress(param, f2lMask)) {
      return (
        2 +
        solvedProgress(param, f2l1Mask) +
        solvedProgress(param, f2l2Mask) +
        solvedProgress(param, f2l3Mask) +
        solvedProgress(param, f2l4Mask)
      );
    }
    if (solvedProgress(param, ollMask)) {
      return 2;
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  function getCFOPProgress(param: ProgressParam) {
    if (solvedProgress(param, crossMask)) {
      return 4;
    }
    if (solvedProgress(param, f2lMask)) {
      return 3;
    }
    if (solvedProgress(param, ollMask)) {
      return 2;
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  function getCF3ZBProgress(param: ProgressParam) {
    if (solvedProgress(param, crossMask)) {
      return 6;
    }
    if (solvedProgress(param, eollMask)) {
      return (
        1 +
        Math.max(
          1,
          solvedProgress(param, f2l1Mask) +
            solvedProgress(param, f2l2Mask) +
            solvedProgress(param, f2l3Mask) +
            solvedProgress(param, f2l4Mask),
        )
      );
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  function getFPProgress(param: ProgressParam) {
    if (solvedProgress(param, f2lMask)) {
      return 2;
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  function getRouxProgress(param: ProgressParam) {
    if (solvedProgress(param, roux1Mask)) {
      return 4;
    }
    if (solvedProgress(param, roux2Mask)) {
      return 3;
    }
    if (solvedProgress(param, roux3Mask)) {
      return 2;
    }
    if (solvedProgress(param)) {
      return 1;
    }
    return 0;
  }

  stepParamsRef = {
    cross: [6, crossMask],
    f2l: [6, f2lMask],
    oll: [6, ollMask],
    eoll: [6, eollMask],
    cpll: [6, cpllMask],
    fb: [24, roux1Mask],
    sb: [24, roux2Mask],
    cmll: [24, roux3Mask],
  };

  function calcStepProgress(step: string, param: ProgressParam) {
    if (step in stepParamsRef) {
      return solvedProgress(param, stepParamsRef[step]![1]);
    }
    return solvedProgress(param);
  }

  function getProgressNAxis(facelet: unknown, process: (p: ProgressParam) => number, n_axis: number) {
    let minRet = 99;
    for (let a = 0; a < n_axis; a++) {
      minRet = Math.min(minRet, process([facelet as string | CubieCube, a]));
    }
    return minRet;
  }

  const centerRot = [
    [0, 2, 4, 3, 5, 1],
    [5, 1, 0, 2, 4, 3],
    [4, 0, 2, 1, 3, 5],
  ];

  function moveSeq2str(moveSeq: [string, number][]) {
    return moveSeq.map((val) => val[0].trim() + '@' + val[1]).join(' ');
  }

  function getPrettyMoves(rawMoveSeqs: [string, number][][]): [string, number][] {
    return rawMoveSeqs.map((moveSeq) => {
      const ret: number[] = [];
      let center = [0, 1, 2, 3, 4, 5];

      function pushSol(axis: number, pow: number) {
        if (ret.length === 0 || ~~(ret.at(-1)! / 3) !== axis) {
          ret.push(axis * 3 + pow);
          return;
        }
        pow = (pow + (ret.at(-1)! % 3) + 1) % 4;
        if (pow === 3) {
          ret.pop();
        } else {
          ret.splice(-1, 1, axis * 3 + pow);
        }
      }

      for (let i = 0; i < moveSeq.length; i++) {
        const axis = center.indexOf('URFDLB'.indexOf(moveSeq[i]![0]![0]!));
        const pow = ' 2\''.indexOf(moveSeq[i]![0]![1] || ' ') % 3;
        if (i === moveSeq.length - 1 || moveSeq[i + 1]![1] - moveSeq[i]![1] > 100) {
          pushSol(axis, pow);
          continue;
        }
        const axis2 = center.indexOf('URFDLB'.indexOf(moveSeq[i + 1]![0]![0]!));
        const pow2 = ' 2\''.indexOf(moveSeq[i + 1]![0]![1] || ' ') % 3;
        if (axis !== axis2 && axis % 3 === axis2 % 3 && pow + pow2 === 2) {
          const axisM = axis % 3;
          const powM = (pow - 1) * [1, 1, -1, -1, -1, 1][axis]! + 1;
          pushSol(axisM + 6, powM);
          for (let p = 0; p < powM + 1; p++) {
            const center_: number[] = [];
            for (let c = 0; c < 6; c++) {
              center_[c] = center[centerRot[axisM]![c]!]!;
            }
            center = center_;
          }
          i++;
          continue;
        }
        pushSol(axis, pow);
      }
      const moveStr = ret
        .map((val) => 'URFDLBEMS'.charAt(~~(val / 3)) + ' 2\''.charAt(val % 3))
        .join('');
      return [moveStr, ret.length] as [string, number];
    });
  }

  const pllPattern: number[][][] = [];
  function identPLL(facelet: string) {
    const S = gScramble333();
    for (let i = pllPattern.length; i < 22; i++) {
      const param = i === 21 ? 'UUUUUUUUUFFFRRRBBBLLL' : S.getPLLImage(i)[0]!;
      pllPattern.push(
        toEqus(LLPattern.replace(/[0-9a-z]/g, (v) => param[parseInt(v, 36)]!.toLowerCase())),
      );
    }
    return searchCaseByPattern(facelet, ollMask, pllPattern);
  }

  const ollPattern: number[][][] = [];
  function identOLL(facelet: string) {
    const S = gScramble333();
    for (let i = ollPattern.length; i < 58; i++) {
      const param = S.getOLLImage(i)[0]!.replace(/G/g, '-');
      ollPattern.push(
        toEqus(LLPattern.replace(/[0-9a-z]/g, (v) => param[parseInt(v, 36)]!.toLowerCase())),
      );
    }
    return searchCaseByPattern(facelet, f2lMask, ollPattern);
  }

  const collPattern: number[][][] = [];
  function identCOLL(facelet: string) {
    const S = gScramble333();
    for (let i = collPattern.length; i < 43; i++) {
      const param = S.getCOLLImage('D', i)[0]!.replace(/G/g, '-');
      collPattern.push(
        toEqus(LLPattern.replace(/[0-9a-z]/g, (v) => param[parseInt(v, 36)]!.toLowerCase())),
      );
    }
    return searchCaseByPattern(facelet, eollMask, collPattern);
  }

  const zbllPattern: number[][][] = [];
  function identZBLL(facelet: string) {
    const S = gScramble333();
    for (let i = zbllPattern.length; i < 493; i++) {
      const param = S.getZBLLImage(i)[0]!.replace(/G/g, '-');
      zbllPattern.push(
        toEqus(LLPattern.replace(/[0-9a-z]/g, (v) => param[parseInt(v, 36)]!.toLowerCase())),
      );
    }
    return searchCaseByPattern(facelet, eollMask, zbllPattern);
  }

  const cllPattern: number[][][] = [];
  function identC2CLL(facelet: string) {
    const S = gScramble222();
    for (let i = cllPattern.length; i < 40; i++) {
      const param = S.getEGLLImage(i)[0]!.replace(/G/g, '-');
      cllPattern.push(
        toEqus(c2LLPattern.replace(/[0-9a-z]/g, (v) => param[parseInt(v, 36)]!.toLowerCase())),
      );
    }
    return searchCaseByPattern(facelet, c2LLMask, cllPattern);
  }

  function searchCaseByPattern(facelet: string, baseMask: number[][], patterns: number[][][]) {
    const chkList: number[] = [];
    for (let a = 0; a < 24; a++) {
      if (solvedProgress([facelet, a], baseMask) === 0) {
        chkList.push(a);
      }
    }
    for (let i = 0; i < patterns.length; i++) {
      for (let j = 0; j < chkList.length; j++) {
        if (solvedProgress([facelet, chkList[j]!], patterns[i]!) === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  function identStep(step: string, facelet: string) {
    switch (step) {
      case 'PLL':
        return identPLL(facelet);
      case 'OLL':
        return identOLL(facelet);
      case 'COLL':
        return identCOLL(facelet);
      case 'ZBLL':
        return identZBLL(facelet);
      case 'C2CLL':
        return identC2CLL(facelet);
      default:
        return undefined;
    }
  }

  function getIdentData(method?: string) {
    const S3 = (globalThis as unknown as { scramble_333?: Scramble333 }).scramble_333;
    const S2 = (globalThis as unknown as { scramble_222?: Scramble222 }).scramble_222;
    if (!S3 || !S2) {
      throw new Error('scramble_333 / scramble_222 required for getIdentData');
    }
    const identData = {
      PLL: [identPLL, S3.getPLLImage.bind(S3), 0, 21, 0],
      OLL: [identOLL, S3.getOLLImage.bind(S3), 1, 58, 1],
      COLL: [identCOLL, S3.getCOLLImage.bind(S3, 'D'), 0, 40, 1],
      ZBLL: [identZBLL, S3.getZBLLImage.bind(S3), 0, 493, 0],
      CLL: [identC2CLL, S2.getEGLLImage.bind(S2), 0, 40, 1],
    };
    return method ? (identData as Record<string, unknown>)[method] : identData;
  }

  const scrambleReg = /^([\d]+(?:-\d+)?)?([FRUBLDfrubldzxySME])(?:([w])|&sup([\d]);)?([2'])?$/;

  function parseScramble(scramble: string, moveMap: string, addPreScr?: boolean) {
    let scr = scramble || '';
    if (addPreScr) {
      const kernel = gKernel();
      const tools = gTools();
      const pre =
        kernel.getProp(tools.isCurTrainScramble?.() ? 'preScrT' : 'preScr', '') + ' ';
      scr = pre + scr;
    }
    const moveseq: number[][] = [];
    const moves = scr.split(' ');
    for (let s = 0; s < moves.length; s++) {
      const m = scrambleReg.exec(moves[s]!);
      if (m == null) {
        continue;
      }
      let f = 'FRUBLDfrubldzxySME'.indexOf(m[2]!);
      let p: number;
      if (f > 14) {
        p = '2\''.indexOf(m[5] || 'X') + 2;
        f = [0, 4, 5][f % 3]!;
        moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f)), 2, p]);
        moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f)), 1, 4 - p]);
        continue;
      }
      const w = (m[1] || '').split('-');
      const w2 = ~~w[1]! || -1;
      const wv =
        f < 12 ? ~~w[0]! || ~~m[4]! || ((m[3] === 'w' || f > 5) && 2) || 1 : -1;
      p = (f < 12 ? 1 : -1) * ('2\''.indexOf(m[5] || 'X') + 2);
      moveseq.push([moveMap.indexOf('FRUBLD'.charAt(f % 6)), wv, p, w2]);
    }
    return moveseq;
  }

  function getScrambledState(scramble: [string, string], reqFace?: boolean) {
    const tools = gTools();
    if (!tools.isPuzzle('333', scramble)) {
      return undefined;
    }
    const scrSeq = scramble[1]!;
    const scr = parseScramble(scrSeq, 'URFDLB');
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
    return reqFace ? (c as CubieCube & { toFaceCube(): string }).toFaceCube() : c;
  }

  function getProgress(facelet: unknown, method: string) {
    switch (method) {
      case 'cfop':
        return getProgressNAxis(facelet, getCFOPProgress, 6);
      case 'fp':
        return getProgressNAxis(facelet, getFPProgress, 6);
      case 'cf4op':
        return getProgressNAxis(facelet, getCF4OPProgress, 6);
      case 'roux':
        return getProgressNAxis(facelet, getRouxProgress, 24);
      case 'cf4o2p2':
        return getProgressNAxis(facelet, getCF4O2P2Progress, 6);
      case 'cf3zb':
        return getProgressNAxis(facelet, getCF3ZBProgress, 6);
      case 'n':
        return getProgressNAxis(facelet, solvedProgress, 1);
      default:
        return undefined;
    }
  }

  function getStepNames(method: string): string[] | undefined {
    switch (method) {
      case 'cfop':
        return ['pll', 'oll', 'f2l', 'cross'];
      case 'fp':
        return ['op', 'cf'];
      case 'cf4op':
        return ['pll', 'oll', 'f2l-4', 'f2l-3', 'f2l-2', 'f2l-1', 'cross'];
      case 'roux':
        return ['l6e', 'cmll', 'sb', 'fb'];
      case 'cf4o2p2':
        return ['pll', 'cpll', 'oll', 'eoll', 'f2l-4', 'f2l-3', 'f2l-2', 'f2l-1', 'cross'];
      case 'cf3zb':
        return ['zbll', 'zbf2l', 'f2l-3', 'f2l-2', 'f2l-1', 'cross'];
      case 'n':
        return ['solve'];
      default:
        return undefined;
    }
  }

  function getStepCount(method: string) {
    const stepNames = getStepNames(method);
    return stepNames ? stepNames.length : 0;
  }

  function getStepProgress(step: string, facelet: string, n_axis?: number) {
    let na = n_axis;
    if (!na) {
      na = step in stepParamsRef ? stepParamsRef[step]![0] : 1;
    }
    return getProgressNAxis(facelet, (p) => calcStepProgress(step, p), na!);
  }

  function getPrettyReconstruction(rawMoves: [string, number][][], method: string) {
    let prettySolve = '';
    const prettyMoves = getPrettyMoves(rawMoves);
    const stepNames = getStepNames(method)?.slice().reverse() ?? [];
    let totalMoves = 0;
    for (let i = 0; i < prettyMoves.length; i++) {
      totalMoves += prettyMoves[i]![1]!;
      prettySolve +=
        prettyMoves[i]![0]!.replace(/ /g, '') +
        (stepNames[i] ? ' // ' + stepNames[i] + ' ' + prettyMoves[i]![1] + ' move(s)' : '') +
        '\n';
    }
    return { prettySolve, totalMoves };
  }

  function getConjMoves(moves: string, inv?: boolean, conj?: number) {
    if (!moves) {
      return moves;
    }
    let cj = conj;
    if (cj === undefined) {
      cj = getPreConj();
    }
    if (inv) {
      cj = ml.CubieCube.rotMulI[0]![cj || 0]!;
    }
    return moves.replace(/[URFDLB]/g, (face) =>
      'URFDLB'.charAt(ml.CubieCube.rotMulM[cj]!['URFDLB'.indexOf(face) * 3]! / 3),
    );
  }

  function getPreConj() {
    const kernel = gKernel();
    const tools = gTools();
    const preScr = kernel
      .getProp(tools.isCurTrainScramble?.() ? 'preScrT' : 'preScr', '')
      .split(' ');
    const cc = new ml.CubieCube();
    for (let i = 0; i < preScr.length; i++) {
      cc.selfMoveStr(preScr[i]!);
    }
    return cc.ori || 0;
  }

  return {
    getProgress,
    getStepNames,
    getStepCount,
    getStepProgress,
    getPrettyMoves,
    getPrettyReconstruction,
    moveSeq2str,
    getScrambledState,
    identStep,
    getIdentData,
    parseScramble,
    getConjMoves,
    getPreConj,
  };
}

let cubeUtilCache: CubeUtilApi | null = null;

export function getCubeUtil(): CubeUtilApi {
  if (!cubeUtilCache) {
    cubeUtilCache = createCubeUtil(getMathlib());
  }
  return cubeUtilCache;
}

/** @internal */
export function resetCubeUtilCacheForTesting(): void {
  cubeUtilCache = null;
}
