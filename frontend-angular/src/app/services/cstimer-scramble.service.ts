import { Injectable } from '@angular/core';
import { buildFace3ImageDataUrl } from '../lib/ll-image-data-url';

export type CstimerScrType = 'easyc' | 'oll' | 'pll' | 'f2l' | 'lsll2';

interface ScrMgrGlobal {
  scramblers: Record<string, (type: string, length: number, cases: unknown, neut: number) => string>;
  getExtra?: (type: string, idx: number) => unknown;
}

function getScrMgr(): ScrMgrGlobal | undefined {
  return (window as unknown as { scrMgr?: ScrMgrGlobal }).scrMgr;
}

/**
 * Wraps `window.scrMgr.scramblers[type](type, length, cases, neut)` — same as csTimer’s menu.
 * @see ../data/cstimer-reference.ts — vendor paths and upstream https://github.com/cs0x7f/cstimer
 */
@Injectable({
  providedIn: 'root'
})
export class CstimerScrambleService {
  private readonly f2lCaseCode = [
    0x2000, 0x1011, 0x2012, 0x1003, 0x2003, 0x1012, 0x2002, 0x1013, 0x2013, 0x1002, 0x2010, 0x1001,
    0x2011, 0x1000, 0x2001, 0x1010, 0x0000, 0x0011, 0x0003, 0x0012, 0x0002, 0x0013, 0x0001, 0x0010,
    0x0400, 0x0411, 0x1400, 0x2411, 0x1411, 0x2400, 0x0018, 0x0008, 0x2008, 0x1008, 0x2018, 0x1018,
    0x0418, 0x1408, 0x2408, 0x1418, 0x2418, 0x0408
  ];
  isReady(): boolean {
    const s = getScrMgr()?.scramblers;
    return !!(s && typeof s['oll'] === 'function' && typeof s['easyc'] === 'function');
  }

  getLsll2Meta(): { filters: string[]; probs: number[] } | null {
    const extra = getScrMgr()?.getExtra;
    if (!extra) {
      return null;
    }
    const filters = extra('lsll2', 0);
    const probs = extra('lsll2', 1);
    if (!Array.isArray(filters) || !Array.isArray(probs)) {
      return null;
    }
    return {
      filters: filters.filter((v): v is string => typeof v === 'string'),
      probs: probs.filter((v): v is number => typeof v === 'number'),
    };
  }

  /** csTimer lsll2 image generator -> <img src="data:image/svg+xml;base64,..."> */
  getLsll2ImageDataUrl(caseIndex: number): string | null {
    const extra = getScrMgr()?.getExtra;
    if (!extra) {
      return null;
    }
    const imgGen = extra('lsll2', 2);
    if (typeof imgGen !== 'function') {
      return null;
    }
    let src = '';
    const imgLike = {
      attr: (name: string, value: string) => {
        if (name === 'src') {
          src = value;
        }
      }
    };
    try {
      (imgGen as (cases: number, canvas: { attr: (name: string, value: string) => void }) => void)(caseIndex, imgLike);
      if (src) {
        return src;
      }
      return this.renderLsll2ImageFallback(caseIndex);
    } catch {
      return this.renderLsll2ImageFallback(caseIndex);
    }
  }

  private renderLsll2ImageFallback(caseIndex: number): string | null {
    const caze = this.f2lCaseCode[caseIndex];
    if (typeof caze !== 'number') {
      return null;
    }
    // Same mapping as cstimer scramble_333_edit.js getF2LImage()
    const emap: Array<[number, number] | [number, number, number] | null> = [
      [5, 10], [7, 19], [3, -1], [1, -1], null, null, null, null, [23, 12]
    ];
    const cmap: Array<[number, number, number] | [number, number, number] | [number, number, number] | [number, number, number] | [number, number, number]> = [
      [8, 20, 9], [6, -1, 18], [0, -1, -1], [2, 11, -1], [-1, 15, 26]
    ];
    const ep = emap[caze & 0xf];
    const eo = (caze >> 4) & 1;
    const cp = cmap[(caze >> 8) & 0xf];
    const co = (caze >> 12) & 3;
    if (!ep || !cp) {
      return null;
    }

    const pieces = 'GGGGDGGGGGGGGRRGRRGGGBBGBBG'.split('');
    for (let i = 0; i < 3; i++) {
      if (i < 2 && ep[i] >= 0) {
        pieces[ep[i]!] = 'BR'.charAt(eo ^ i);
      }
      if (cp[i] >= 0) {
        pieces[cp[i]!] = 'URB'.charAt((co + 3 + i) % 3);
      }
    }
    return buildFace3ImageDataUrl(pieces.join(''));
  }

  /**
   * @param type 'easyc' | 'oll' | 'pll' | 'f2l'
   * @param length For easyc: encoded difficulty (see cstimer cross.getEasyCross); others often 0.
   * @param options.cases OLL/PLL case index (csTimer oll_map / pll_map). Omit for random.
   * @param options.neut Orientation neutralization (0 = default)
   */
  scrambleString(
    type: CstimerScrType,
    length: number,
    options?: { cases?: number; neut?: number }
  ): string {
    const fn = getScrMgr()?.scramblers?.[type];
    if (!fn) {
      throw new Error('cstimer scramble scripts not loaded (scrMgr.scramblers)');
    }
    const cases = options?.cases;
    const neut = options?.neut ?? 0;
    return fn(type, length, cases, neut).replace(/\s+/g, ' ').trim();
  }
}
