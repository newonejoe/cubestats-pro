// GoCube Driver

import { CubeDriver, registerDriver } from './driver.js';

export class GoCubeDriver extends CubeDriver {
    static name = 'GoCube';
    static prefixes = ['GoCube'];
    static serviceUUIDs = ['0000fff0-0000-1000-8000-00805f9b34fb'];
    static cics = [0x0397];

    constructor() {
        super();
        this.type = 'gocube';
    }

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string
    ): Promise<this> {
        this.device = device;
        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        this.characteristic = await service.getCharacteristic(charUUID);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        return this;
    }

    parseData(bytes: Uint8Array): void {
        console.log('[GoCube] Data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
}

registerDriver(GoCubeDriver);
