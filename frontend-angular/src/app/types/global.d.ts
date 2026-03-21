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
  }
}

export {};
