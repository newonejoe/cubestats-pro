import { describe, expect, it } from 'vitest';
import { buildScrambleTwistHighlightHtml, escapeHtml } from './scramble-twist-display';

describe('scramble-twist-display', () => {
  it('escapeHtml escapes special chars', () => {
    expect(escapeHtml('a<b>')).toBe('a&lt;b&gt;');
  });

  it('buildScrambleTwistHighlightHtml marks done, current, todo', () => {
    const html = buildScrambleTwistHighlightHtml(['R', "U'", 'F2'], 1);
    expect(html).toContain('scrm-done');
    expect(html).toContain('scrm-cur');
    expect(html).toContain('scrm-todo');
    expect(html).toContain('R');
    expect(html).toContain("U'");
  });

  it('full progress: all done, no current', () => {
    const html = buildScrambleTwistHighlightHtml(['R', 'U'], 2);
    expect(html.match(/scrm-done/g)?.length).toBe(2);
    expect(html).not.toContain('scrm-cur');
  });

  it('prepends highlighted undo token before full scramble', () => {
    const html = buildScrambleTwistHighlightHtml(['L2', "U'", 'R2'], 0, "F'");
    expect(html.indexOf('scrm-undo')).toBeLessThan(html.indexOf('L2'));
    expect(html).toContain('scrm-undo');
    expect(html).toContain('scrm-cur');
  });
});
