import { describe, expect, it } from 'vitest';
import { parseScrHinterColonString } from './cstimer-scr-hinter';

describe('cstimer-scr-hinter', () => {
  it('parseScrHinterColonString: no colon means fully done', () => {
    expect(parseScrHinterColonString('R U F2')).toEqual({
      sequence: ['R', 'U', 'F2'],
      progress: 3,
    });
  });

  it('parseScrHinterColonString: colon splits done / current / todo', () => {
    expect(parseScrHinterColonString('R U : R2 : F')).toEqual({
      sequence: ['R', 'U', 'R2', 'F'],
      progress: 2,
    });
  });

  it('parseScrHinterColonString: leading colon (current is first move)', () => {
    expect(parseScrHinterColonString(': R : U F')).toEqual({
      sequence: ['R', 'U', 'F'],
      progress: 0,
    });
  });
});
