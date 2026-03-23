/**
 * csTimer reference map — keep Angular behavior aligned with bundled vendor scripts.
 *
 * Upstream source (GPL): https://github.com/cs0x7f/cstimer
 *
 * Local copies (loaded from index.html before the app):
 * - public/vendor/cstimer/cstimer-init.js — shims ($, ISCSTIMER)
 * - public/vendor/cstimer/mathlib.js
 * - public/vendor/cstimer/min2phase.js
 * - public/vendor/cstimer/cross.js — getEasyCross, easy cross scrambles
 * - public/vendor/cstimer/scramble.js — scrMgr, reg(), fixCase(), scramblers{}
 * - public/vendor/cstimer/scramble_333_edit.js — 333 training scrambles:
 *   - oll_map, getOLLScramble, getOLLImage; pll_map, getPLLScramble, getPLLImage
 *   - scrMgr.reg('oll', …), scrMgr.reg('pll', …), reg('easyc', …), reg('f2l', …)
 *   - global `scramble_333` export object: getOLLImage, getPLLImage, getAnyScramble, …
 * Upstream full UI also loads src/js/tools/image.js — `llImage.drawImage` (21 chars: U 3×3 + L/F/R/B top rows).
 *
 * Scrambler call shape (same as csTimer UI): fn(type, length, cases, neut).
 * When `cases` is undefined, scrMgr.fixCase picks a random case using ollprobs/pllprobs.
 */
export const CSTIMER_UPSTREAM_REPO = 'https://github.com/cs0x7f/cstimer';

export const CSTIMER_VENDOR_SCRAMBLE_CORE = 'public/vendor/cstimer/scramble_333_edit.js';
export const CSTIMER_VENDOR_SCRAMBLE_MGR = 'public/vendor/cstimer/scramble.js';
