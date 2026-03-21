// Web Bluetooth API type declarations and window extensions

export interface BluetoothAdvertisingEvent extends Event {
    manufacturerData: Map<number, DataView>;
}

export interface BluetoothDeviceEx extends BluetoothDevice {
    watchAdvertisements?: () => void;
    stopWatchingAdvertisements?: () => void;
    addEventListener(type: 'advertisementreceived', listener: (event: BluetoothAdvertisingEvent) => void): void;
    removeEventListener(type: 'advertisementreceived', listener: (event: BluetoothAdvertisingEvent) => void): void;
}

export interface BluetoothRemoteGATTCharacteristicEx extends BluetoothRemoteGATTCharacteristic {
    value?: DataView;
}

// Cube state callback type
export type CubeStateCallback = (facelets: string) => void;

// MAC address modal callback type
export type MacModalCallback = (mac: string | null) => void;

// Extend Window interface for cube-related callbacks
declare global {
    interface Window {
        onGanCubeState?: CubeStateCallback;
        showMacModal?: (callback: MacModalCallback) => void;

        // Bluetooth globals for backward compatibility
        BluetoothManager?: typeof import('./manager').BluetoothManager;
        CubeDriver?: typeof import('./driver').CubeDriver;
        GiikerDriver?: typeof import('./giiker').GiikerDriver;
        GanDriver?: typeof import('./gan').GanDriver;
        GoCubeDriver?: typeof import('./gocube').GoCubeDriver;
        QiyiDriver?: typeof import('./qiyi').QiyiDriver;
        MoyuDriver?: typeof import('./moyu').MoyuDriver;
    }
}

export {};
