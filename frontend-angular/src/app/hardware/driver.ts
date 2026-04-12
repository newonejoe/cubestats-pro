// Base driver interface for Bluetooth cube drivers

import type { CubeMove } from './cube-move.js';

export interface CubeDriverOptions {
    device: BluetoothDevice | null;
    gattServer: BluetoothRemoteGATTServer | null;
    characteristic: BluetoothRemoteGATTCharacteristic | null;
    writeCharacteristic: BluetoothRemoteGATTCharacteristic | null;
    mac: string | null;
}

export abstract class CubeDriver {
    // Use different property names to avoid conflicts with Function.name
    declare static driverName: string;
    declare static prefixes: string[];
    declare static serviceUUIDs: string[];
    declare static cics: number[];

    device: BluetoothDevice | null = null;
    gattServer: BluetoothRemoteGATTServer | null = null;
    characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
    mac: string | null = null;
    type: string = 'unknown';

    // Callback for move events
    onMoveCallback?: (moves: CubeMove[]) => void;

    // Store bound event handler reference for proper removal
    private onDataBound: ((event: Event) => void) | null = null;

    constructor() {}

    // Get driver name (handles both naming conventions)
    static getName(): string {
        return (this as unknown as { driverName?: string }).driverName || 'Unknown';
    }

    // Get service UUIDs
    static getServiceUUIDs(): string[] {
        return (this as unknown as { serviceUUIDs?: string[] }).serviceUUIDs || [];
    }

    // Override in subclass to extract MAC from advertisement data
    static extractMacFromAdv(manufacturerData: Map<number, DataView> | null, deviceName: string | null): string | null {
        return null;
    }

    // Override in subclass to check if this driver matches the device
    static matchDevice(device: BluetoothDevice, services: string[] | null): boolean {
        const name = (device.name || '').trim();
        const prefixes = (this as any).prefixes || [];
        const serviceUUIDs = (this as any).serviceUUIDs || [];

        // Match by name prefix
        if (prefixes.some((p: string) => name.startsWith(p))) {
            return true;
        }
        // Match by service UUID
        if (services && serviceUUIDs.some((s: string) => services.includes(s.toLowerCase()))) {
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

    onMove(moves: CubeMove[]): void {
        console.log('[CubeDriver] Move:', moves);
        if (this.onMoveCallback) {
            this.onMoveCallback(moves);
        }
    }

    disconnect(): void {
        // Properly remove event listener using saved reference
        this.unregisterCharacteristicListener();
        if (this.gattServer && this.gattServer.connected) {
            this.gattServer.disconnect();
        }
    }

    protected onData(event: Event): void {
        const target = event.target as unknown as { value?: { buffer: ArrayBuffer } };
        if (!target?.value) return;
        const bytes = new Uint8Array(target.value.buffer);
        this.parseData(bytes);
    }

    // Helper to register event listener with saved reference
    protected registerCharacteristicListener(): void {
        if (this.characteristic && !this.onDataBound) {
            this.onDataBound = this.onData.bind(this);
            this.characteristic.addEventListener('characteristicvaluechanged', this.onDataBound);
        }
    }

    // Helper to unregister event listener
    protected unregisterCharacteristicListener(): void {
        if (this.characteristic && this.onDataBound) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.onDataBound);
            this.onDataBound = null;
        }
    }
}

// Driver registry
const DRIVER_REGISTRY: typeof CubeDriver[] = [];

export function registerDriver(driverClass: typeof CubeDriver): void {
    DRIVER_REGISTRY.push(driverClass);
    const name = driverClass.getName();
    console.log('[DriverRegistry] Registered:', name);
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
