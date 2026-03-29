/** One Bluetooth face turn with optional hardware-reported clock (GAN/Moyu/Qiyi). */
export interface CubeMove {
  notation: string;
  /** Cube clock milliseconds when available; TimerService anchors to first move in the solve. */
  hwMs?: number;
}
