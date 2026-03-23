/**
 * Same data URL pattern as csTimer llImage: `data:image/svg+xml;base64,' + btoa(svg)`.
 * Geometry matches csTimer image.js llImage.drawImage + $.ctxRotate / $.ctxTransform (utillib.js).
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/tools/image.js#L634
 * @see https://github.com/cs0x7f/cstimer/blob/master/src/js/lib/utillib.js (ctxRotate, ctxTransform, ctxDrawPolygon)
 */

import { llCharColor } from './cstimer-ll-viz';

const CACHE_VER = 'v2';
const cache = new Map<string, string>();

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Same as $.ctxTransform in cstimer utillib.js (single transform). */
function ctxTransform(arr: [number[], number[]], trans: number[]): [number[], number[]] {
  let t = trans;
  if (t.length === 3) {
    const s = t[0];
    t = [s, 0, t[1] * s, 0, s, t[2] * s];
  }
  const ret: [number[], number[]] = [[], []];
  for (let i = 0; i < arr[0].length; i++) {
    ret[0][i] = arr[0][i] * t[0] + arr[1][i] * t[1] + t[2];
    ret[1][i] = arr[0][i] * t[3] + arr[1][i] * t[4] + t[5];
  }
  return ret;
}

/** Same as $.ctxRotate in cstimer utillib.js. */
function ctxRotate(arr: [number[], number[]], theta: number): [number[], number[]] {
  return ctxTransform(arr, [Math.cos(theta), -Math.sin(theta), 0, Math.sin(theta), Math.cos(theta), 0]);
}

function polygonPoints(poly: [number[], number[]]): string {
  const [xs, ys] = poly;
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    parts.push(`${xs[i]},${ys[i]}`);
  }
  return parts.join(' ');
}

const PI = Math.PI;

/**
 * @param pieces 21-char llImage string
 * @param arrows PLL U-cell pairs (indices 0–8), optional
 */
export function buildLlImageDataUrl(pieces: string, arrows?: number[][] | null): string {
  const key = `${CACHE_VER}:${pieces}:${JSON.stringify(arrows ?? [])}`;
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }
  if (pieces.length < 21) {
    return '';
  }

  const dim = 3;
  const width = 50;
  const svgW = (dim + 1.2) * width;
  const svgH = (dim + 1.2) * width;

  const polys: { fill: string; pts: [number[], number[]] }[] = [];

  // U face (same as image.js)
  for (let i = 0; i < dim * dim; i++) {
    const x = (i % dim) + 0.5;
    const y = Math.floor(i / dim) + 0.5;
    const base: [number[], number[]] = [
      [x, x + 1, x + 1, x],
      [y, y, y + 1, y + 1],
    ];
    const transformed = ctxTransform(base, [width, 0.1, 0.1]);
    polys.push({ fill: escapeXml(llCharColor(pieces[i]!)), pts: transformed });
  }

  // L / F / R / B strips: trapezoids rotated around U (same as image.js)
  for (let i = 0; i < dim * 4; i++) {
    const x = i % dim;
    const rot = Math.floor(i / dim);
    const base: [number[], number[]] = [
      [x - dim / 2, x - dim / 2 + 1, (x - dim / 2 + 1) * 0.9, (x - dim / 2) * 0.9],
      [dim / 2 + 0.05, dim / 2 + 0.05, dim / 2 + 0.5, dim / 2 + 0.5],
    ];
    const rotated = ctxRotate(base, (-rot * PI) / 2);
    const transformed = ctxTransform(rotated, [width, 0.6 + dim / 2, 0.6 + dim / 2]);
    polys.push({
      fill: escapeXml(llCharColor(pieces[i + dim * dim]!)),
      pts: transformed,
    });
  }

  let arrowSvg = '';
  if (arrows?.length) {
    const lines: string[] = [];
    for (const p of arrows) {
      if (!p || p.length < 2) {
        continue;
      }
      const a = p[0];
      const b = p[1];
      if (a < 0 || a > 8 || b < 0 || b > 8) {
        continue;
      }
      const x1 = (a % dim) + 1.1;
      const y1 = Math.floor(a / dim) + 1.1;
      const x2 = (b % dim) + 1.1;
      const y2 = Math.floor(b / dim) + 1.1;
      const length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      const arrowBase: [number[], number[]] = [
        [0.2, length - 0.4, length - 0.4, length - 0.1, length - 0.4, length - 0.4, 0.2],
        [0.05, 0.05, 0.15, 0, -0.15, -0.05, -0.05],
      ];
      const theta = Math.atan2(y2 - y1, x2 - x1);
      const rotated = ctxRotate(arrowBase, theta);
      const transformed = ctxTransform(rotated, [width, x1, y1]);
      lines.push(
        `<polygon points="${polygonPoints(transformed)}" fill="#000" stroke="none"/>`
      );
    }
    if (lines.length) {
      arrowSvg = `<g>${lines.join('')}</g>`;
    }
  }

  const body = polys
    .map(
      (p) =>
        `<polygon points="${polygonPoints(p.pts)}" fill="${p.fill}" stroke="#1a1a1a" stroke-width="0.6" stroke-linejoin="round"/>`
    )
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
<rect width="100%" height="100%" fill="#ffffff"/>
${body}
${arrowSvg}
</svg>`;

  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  cache.set(key, url);
  return url;
}

export function clearLlImageCache(): void {
  cache.clear();
}
