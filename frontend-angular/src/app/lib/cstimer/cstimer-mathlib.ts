/**
 * Typed access to csTimer's bundled `mathlib` (public/vendor/cstimer/mathlib.js).
 * The scramble stack still loads that script in index.html; application code must not use `window.mathlib` directly.
 */

export interface CubieCube {
  ori: number;
  tstamp: number;
  ca: Int32Array | number[];
  ea: Int32Array | number[];
  init(ca: Int32Array | number[], ea: Int32Array | number[]): void;
  selfMoveStr(moveStr: string, isInv?: boolean): number | undefined;
  selfConj(conj?: number): void;
  invFrom(c: CubieCube): void;
  /** Returns `this` on success or `-1` on invalid facelet (csTimer mathlib). */
  fromFacelet(facelet: string, cFacelet?: number[][], eFacelet?: number[][]): CubieCube | -1;
  toFaceCube(cFacelet?: number[][], eFacelet?: number[][], ctFacelet?: number[], withOri?: boolean): string;
  isEqual(c: CubieCube): boolean;
}

export interface CubieCubeClass {
  new (): CubieCube;
  readonly rotCube: { toPerm(): number[] }[];
  readonly faceMap: (number[] | null)[];
  readonly cFacelet: number[][];
  readonly eFacelet: number[][];
  CubeMult(a: CubieCube, b: CubieCube | unknown, out: CubieCube): void;
  readonly moveCube: unknown[];
  readonly rotMult: number[][];
  readonly rotMulM: number[][];
  readonly rotMulI: number[][];
}

export interface Mathlib {
  SOLVED_FACELET: string;
  CubieCube: CubieCubeClass;
  circle(arr: number[], ...rest: number[]): unknown;
}

const MATHLIB_KEY = 'mathlib' as const;

export function getMathlib(): Mathlib {
  const m = (globalThis as unknown as Record<string, Mathlib | undefined>)[MATHLIB_KEY];
  if (!m?.CubieCube) {
    throw new Error(
      'csTimer mathlib is not available. Ensure vendor/cstimer/mathlib.js is loaded in index.html before the Angular app.',
    );
  }
  return m;
}

export function isMathlibLoaded(): boolean {
  const m = (globalThis as unknown as Record<string, Mathlib | undefined>)[MATHLIB_KEY];
  return !!m?.CubieCube;
}
