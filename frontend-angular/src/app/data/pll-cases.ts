/**
 * csTimer `pll_map` order (indices 0–20), names from scramble_333_edit.js.
 * @see ./cstimer-reference.ts
 */

export interface PllCaseMeta {
  index: number;
  name: string;
}

export const PLL_CASES: readonly PllCaseMeta[] = [
  { index: 0, name: 'H' },
  { index: 1, name: 'Ua' },
  { index: 2, name: 'Ub' },
  { index: 3, name: 'Z' },
  { index: 4, name: 'Aa' },
  { index: 5, name: 'Ab' },
  { index: 6, name: 'E' },
  { index: 7, name: 'F' },
  { index: 8, name: 'Ga' },
  { index: 9, name: 'Gb' },
  { index: 10, name: 'Gc' },
  { index: 11, name: 'Gd' },
  { index: 12, name: 'Ja' },
  { index: 13, name: 'Jb' },
  { index: 14, name: 'Na' },
  { index: 15, name: 'Nb' },
  { index: 16, name: 'Ra' },
  { index: 17, name: 'Rb' },
  { index: 18, name: 'T' },
  { index: 19, name: 'V' },
  { index: 20, name: 'Y' }
];

export const ALL_PLL_INDICES: readonly number[] = PLL_CASES.map((c) => c.index);

export function pllNameByIndex(index: number): string {
  return PLL_CASES.find((c) => c.index === index)?.name ?? `PLL-${index}`;
}
