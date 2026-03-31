/**
 * OLL case metadata aligned with csTimer `oll_map` (indices 0–57).
 * @see ./cstimer-reference.ts — upstream repo and `scramble_333_edit.js` locations.
 * Source of truth: `oll_map` array and getOLLScramble(type, length, cases, neut).
 */

export interface OllCaseMeta {
  index: number;
  /** Label from csTimer oll_map, e.g. Point-1, OCLL-21 */
  cstimerName: string;
}

export interface OllGroup {
  id: string;
  title: string;
  cases: OllCaseMeta[];
}

/** Index 0: solved last layer (OLL skip) — csTimer name 'PLL' */
export const OLL_SKIP_INDEX = 0;

export const OLL_GROUPS: OllGroup[] = [
  {
    id: 'solved',
    title: 'Solved LL (OLL skip)',
    cases: [{ index: 0, cstimerName: 'PLL' }]
  },
  {
    id: 'point',
    title: 'Point (7/7)',
    cases: [
      { index: 1, cstimerName: 'Point-1' },
      { index: 2, cstimerName: 'Point-2' },
      { index: 3, cstimerName: 'Point-3' },
      { index: 4, cstimerName: 'Point-4' },
      { index: 17, cstimerName: 'Point-17' },
      { index: 18, cstimerName: 'Point-18' },
      { index: 19, cstimerName: 'Point-19' }
    ]
  },
  {
    id: 'square',
    title: 'Square (2/2)',
    cases: [
      { index: 5, cstimerName: 'Square-5' },
      { index: 6, cstimerName: 'Square-6' }
    ]
  },
  {
    id: 'slbs',
    title: 'SLBS (4/4)',
    cases: [
      { index: 7, cstimerName: 'SLBS-7' },
      { index: 8, cstimerName: 'SLBS-8' },
      { index: 11, cstimerName: 'SLBS-11' },
      { index: 12, cstimerName: 'SLBS-12' }
    ]
  },
  {
    id: 'fish',
    title: 'Fish (4/4)',
    cases: [
      { index: 9, cstimerName: 'Fish-9' },
      { index: 10, cstimerName: 'Fish-10' },
      { index: 35, cstimerName: 'Fish-35' },
      { index: 37, cstimerName: 'Fish-37' }
    ]
  },
  {
    id: 'knight',
    title: 'Knight (4/4)',
    cases: [
      { index: 13, cstimerName: 'Knight-13' },
      { index: 14, cstimerName: 'Knight-14' },
      { index: 15, cstimerName: 'Knight-15' },
      { index: 16, cstimerName: 'Knight-16' }
    ]
  },
  {
    id: 'co',
    title: 'CO (3/3)',
    cases: [
      { index: 20, cstimerName: 'CO-20' },
      { index: 28, cstimerName: 'CO-28' },
      { index: 57, cstimerName: 'CO-57' }
    ]
  },
  {
    id: 'ocll',
    title: 'OCLL (7/7)',
    cases: [21, 22, 23, 24, 25, 26, 27].map((i) => ({
      index: i,
      cstimerName: `OCLL-${i}`
    }))
  },
  {
    id: 'awkward',
    title: 'Awkward (4/4)',
    cases: [
      { index: 29, cstimerName: 'Awkward-29' },
      { index: 30, cstimerName: 'Awkward-30' },
      { index: 41, cstimerName: 'Awkward-41' },
      { index: 42, cstimerName: 'Awkward-42' }
    ]
  },
  {
    id: 'p',
    title: 'P (4/4)',
    cases: [
      { index: 31, cstimerName: 'P-31' },
      { index: 32, cstimerName: 'P-32' },
      { index: 43, cstimerName: 'P-43' },
      { index: 44, cstimerName: 'P-44' }
    ]
  },
  {
    id: 't',
    title: 'T (2/2)',
    cases: [
      { index: 33, cstimerName: 'T-33' },
      { index: 45, cstimerName: 'T-45' }
    ]
  },
  {
    id: 'c',
    title: 'C (2/2)',
    cases: [
      { index: 34, cstimerName: 'C-34' },
      { index: 46, cstimerName: 'C-46' }
    ]
  },
  {
    id: 'w',
    title: 'W (2/2)',
    cases: [
      { index: 36, cstimerName: 'W-36' },
      { index: 38, cstimerName: 'W-38' }
    ]
  },
  {
    id: 'blbs',
    title: 'BLBS (2/2)',
    cases: [
      { index: 39, cstimerName: 'BLBS-39' },
      { index: 40, cstimerName: 'BLBS-40' }
    ]
  },
  {
    id: 'l',
    title: 'L (6/6)',
    cases: [
      { index: 47, cstimerName: 'L-47' },
      { index: 48, cstimerName: 'L-48' },
      { index: 49, cstimerName: 'L-49' },
      { index: 50, cstimerName: 'L-50' },
      { index: 53, cstimerName: 'L-53' },
      { index: 54, cstimerName: 'L-54' }
    ]
  },
  {
    id: 'i',
    title: 'I (4/4)',
    cases: [
      { index: 51, cstimerName: 'I-51' },
      { index: 52, cstimerName: 'I-52' },
      { index: 55, cstimerName: 'I-55' },
      { index: 56, cstimerName: 'I-56' }
    ]
  }
];

export const ALL_OLL_INDICES: readonly number[] = Array.from({ length: 58 }, (_, i) => i);

export function allOllCasesFlat(): OllCaseMeta[] {
  const out: OllCaseMeta[] = [];
  for (const g of OLL_GROUPS) {
    out.push(...g.cases);
  }
  return out.sort((a, b) => a.index - b.index);
}

export function ollMetaByIndex(index: number): OllCaseMeta | undefined {
  return allOllCasesFlat().find((c) => c.index === index);
}
