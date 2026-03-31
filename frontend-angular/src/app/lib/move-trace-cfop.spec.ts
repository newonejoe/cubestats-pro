import { describe, expect, it } from 'vitest';
import { estimateCfopFromMoveTrace, segmentTraceByPauses } from './move-trace-cfop';
import { parseMoveTrace } from './cstimer-storage';

describe('move-trace-cfop', () => {
  it('segments on pause gaps', () => {
    const m = parseMoveTrace('U@0 R@100 F@900 B@950');
    const segs = segmentTraceByPauses(m, 400);
    expect(segs.length).toBe(2);
    expect(segs[0]!.map((x) => x.notation).join(' ')).toBe('U R');
    expect(segs[1]!.map((x) => x.notation).join(' ')).toBe('F B');
  });

  it('estimateCfopFromMoveTrace maps segments to phases', () => {
    const est = estimateCfopFromMoveTrace('U@0 R@50 F@800 D@850 L@900', 400);
    expect(est).not.toBeNull();
    expect(est!.cross!.moves.length).toBeGreaterThan(0);
    expect(est!.pll!.moves.length).toBeGreaterThan(0);
  });

  it('four pause groups: F2L and OLL both come from middle (not slice off by one)', () => {
    // cross | f2l | oll | pll — small gaps inside each block, >400ms between blocks
    const trace = 'U@0 R@50 F@600 D@650 L@1200 B@1250 R@1800 U@1850';
    const est = estimateCfopFromMoveTrace(trace, 400);
    expect(est).not.toBeNull();
    expect(est!.cross!.moves.map((x) => x.notation).join(' ')).toBe('U R');
    expect(est!.f2l!.moves.map((x) => x.notation).join(' ')).toBe('F D');
    expect(est!.oll!.moves.map((x) => x.notation).join(' ')).toBe('L B');
    expect(est!.pll!.moves.map((x) => x.notation).join(' ')).toBe('R U');
  });
});
