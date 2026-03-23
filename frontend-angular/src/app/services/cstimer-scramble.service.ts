import { Injectable } from '@angular/core';

export type CstimerScrType = 'easyc' | 'oll' | 'pll' | 'f2l';

interface ScrMgrGlobal {
  scramblers: Record<string, (type: string, length: number, cases: unknown, neut: number) => string>;
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
  isReady(): boolean {
    const s = getScrMgr()?.scramblers;
    return !!(s && typeof s['oll'] === 'function' && typeof s['easyc'] === 'function');
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
