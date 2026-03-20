// Base driver interface for Bluetooth cube drivers

export interface CubeDriverOptions {
    device: BluetoothDevice | null;
    gattServer: BluetoothRemoteGATTServer | null;
    characteristic: BluetoothRemoteGATTCharacteristic | null;
    writeCharacteristic: BluetoothRemoteGATTCharacteristic | null;
    mac: string | null;
}

export abstract class CubeDriver {
    static name = 'Unknown';
    static prefixes: string[] = [];
    static serviceUUIDs: string[] = [];
    static cics: number[] = [];

    device: BluetoothDevice | null = null;
    gattServer: BluetoothRemoteGATTServer | null = null;
    characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
    mac: string | null = null;
    type: string = 'unknown';

    // Callback for move events
    onMoveCallback?: (moves: string[]) => void;

    constructor() {}

    // Override in subclass to extract MAC from advertisement data
    static extractMacFromAdv(manufacturerData: Map<number, DataView> | null, deviceName: string | null): string | null {
        return null;
    }

    // Override in subclass to check if this driver matches the device
    static matchDevice(device: BluetoothDevice, services: string[] | null): boolean {
        const name = (device.name || '').trim();
        // Match by name prefix
        if (this.prefixes.some(p => name.startsWith(p))) {
            return true;
        }
        // Match by service UUID
        if (services && this.serviceUUIDs.some(s => services.includes(s.toLowerCase()))) {
            return true;
        }
        return false;
    }

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        throw new Error('Not implemented');
    }

    parseData(bytes: Uint8Array): void {
        throw new Error('Not implemented');
    }

    onMove(moves: string[]): void {
        console.log('[CubeDriver] Move:', moves);
        if (this.onMoveCallback) {
            this.onMoveCallback(moves);
        }
    }

    disconnect(): void {
        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.onData.bind(this));
        }
        if (this.gattServer && this.gattServer.connected) {
            this.gattServer.disconnect();
        }
    }

    protected onData(event: Event): void {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const bytes = new Uint8Array(target.value.buffer);
        this.parseData(bytes);
    }
}

// Driver registry
const DRIVER_REGISTRY: typeof CubeDriver[] = [];

export function registerDriver(driverClass: typeof CubeDriver): void {
    DRIVER_REGISTRY.push(driverClass);
    console.log('[DriverRegistry] Registered:', driverClass.name);
}

export function getDriverRegistry(): typeof CubeDriver[] {
    return DRIVER_REGISTRY;
}

export function findDriver(device: BluetoothDevice, services: string[] | null): typeof CubeDriver | null {
    for (const driverClass of DRIVER_REGISTRY) {
        if (driverClass.matchDevice(device, services)) {
            return driverClass;
        }
    }
    return null;
}
