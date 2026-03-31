import { Injectable, inject } from '@angular/core';
import { parseMoveTrace } from '../lib/cstimer-storage';
import { CubeService } from './cube.service';

const MAX_STEP_DELAY_MS = 500;

/**
 * Visual replay of recorded `moveTrace` (notation only; not WCA verification).
 * Resets virtual cube, applies scramble, then plays moves with capped inter-move delays.
 */
@Injectable({
  providedIn: 'root',
})
export class SolveReplayService {
  private readonly cube = inject(CubeService);
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];

  cancel(): void {
    for (const id of this.timeoutIds) {
      clearTimeout(id);
    }
    this.timeoutIds = [];
  }

  startReplay(scramble: string, trace: string | null | undefined, onComplete?: () => void): boolean {
    this.cancel();
    const moves = parseMoveTrace(trace);
    if (moves.length === 0) {
      onComplete?.();
      return false;
    }

    this.cube.applySavedScramble(scramble);

    let accumulated = 0;
    for (let i = 0; i < moves.length; i++) {
      const delta =
        i === 0
          ? 0
          : Math.min(
              Math.max(moves[i]!.offsetMs - moves[i - 1]!.offsetMs, 0),
              MAX_STEP_DELAY_MS,
            );
      accumulated += delta;
      const notation = moves[i]!.notation;
      const id = setTimeout(() => {
        this.cube.applyMoveToCube(notation);
        if (i === moves.length - 1) {
          onComplete?.();
        }
      }, accumulated);
      this.timeoutIds.push(id);
    }
    return true;
  }
}
