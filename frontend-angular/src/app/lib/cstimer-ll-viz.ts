/**
 * Read-only helpers for csTimer scramble_333 last-layer image APIs (no canvas — returns face data).
 * Layout matches csTimer src/js/tools/image.js llImage.drawImage (21 chars: U 3×3 + L/F/R/B top rows).
 * @see ../data/cstimer-reference.ts
 */

export interface Scramble333Global {
  getOLLImage: (cases: number, canvas: null) => [string, null, string] | undefined;
  getPLLImage: (cases: number, canvas: null) => unknown;
}

export function getScramble333(): Scramble333Global | undefined {
  return (window as unknown as { scramble_333?: Scramble333Global }).scramble_333;
}

/**
 * Same mapping as csTimer image.js llImage.drawImage:
 * `colors["DLBURF".indexOf(pieces[i])] || '#888'`
 * OLL uses 'G' for non-U stickers on U view — not in DLBURF → gray, not green.
 */
const COL_CUBE_DLBURF = ['#ffd500', '#ff5900', '#0045ad', '#ffffff', '#b90000', '#009b48'] as const;

/** Map one llImage character to CSS fill (OLL: D/L/B/U/R/F/G; PLL: DLBURF on edges). */
export function llCharColor(ch: string): string {
  const idx = 'DLBURF'.indexOf(ch);
  if (idx < 0) {
    return '#888888';
  }
  return COL_CUBE_DLBURF[idx]!;
}

export function getOllFace21(caseIndex: number): string | null {
  const s = getScramble333();
  if (!s?.getOLLImage) {
    return null;
  }
  const r = s.getOLLImage(caseIndex, null);
  if (!r || typeof r[0] !== 'string' || r[0].length !== 21) {
    return null;
  }
  return r[0];
}

export function ollStickerColorsU(caseIndex: number): string[] | null {
  const face = getOllFace21(caseIndex);
  if (!face) {
    return null;
  }
  return Array.from({ length: 9 }, (_, i) => llCharColor(face[i]!));
}

export function ollFilterLabel(caseIndex: number): string | null {
  const s = getScramble333();
  if (!s?.getOLLImage) {
    return null;
  }
  const r = s.getOLLImage(caseIndex, null);
  if (!r || typeof r[2] !== 'string') {
    return null;
  }
  return r[2];
}

/** PLL: face string + arrow pairs for drawing (csTimer format). */
export function pllVizFromCstimer(caseIndex: number): {
  face: string;
  arrows: number[][];
  filter: string;
} | null {
  const s = getScramble333();
  if (!s?.getPLLImage) {
    return null;
  }
  const raw = s.getPLLImage(caseIndex, null);
  if (!Array.isArray(raw) || raw.length < 3) {
    return null;
  }
  const face = raw[0] as string;
  const arrows = (raw[1] as number[][]) ?? [];
  const filter = raw[2] as string;
  if (typeof face !== 'string' || face.length < 9) {
    return null;
  }
  return { face, arrows: normalizePllArrows(arrows), filter };
}

/** Flatten csTimer arrow list (pairs of cell indices 0–8 on U). */
function normalizePllArrows(arrows: unknown): number[][] {
  if (!Array.isArray(arrows)) {
    return [];
  }
  const out: number[][] = [];
  for (const item of arrows) {
    if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
      out.push([item[0], item[1]]);
    }
  }
  return out;
}
