import { CubeCallbackService } from './services/cube-callback.service';

declare global {
  interface Window {
    cubeCallbackService?: CubeCallbackService;
    showMacModal?: (callback: (mac: string | null) => void) => void;
    onGanCubeState?: (facelets: string) => void;
    GanCube?: any;
    GiikerCube?: any;
    QiyiCube?: any;
    GoCube?: any;
    MoyuCube?: any;
    BluetoothManager?: any;
    CubeDriver?: any;
    GiikerDriver?: any;
    GanDriver?: any;
    GoCubeDriver?: any;
    QiyiDriver?: any;
    MoyuDriver?: any;
    /** csTimer vendor mathlib (public/vendor/cstimer/mathlib.js); cubeutil/recons are TypeScript modules. */
    mathlib?: Record<string, unknown>;
    /** public/vendor/cstimer/scramble_333_edit.js — min2phase Search + genFacelet (see csTimer giiker.js markScrambled). */
    scramble_333?: { genFacelet(facelet: string): string };
  }
}

export {};
