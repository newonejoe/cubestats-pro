// GoCube Driver

import { CubeDriver, registerDriver } from './driver.js';

export class GoCubeDriver extends CubeDriver {
    declare static driverName: string;
    declare static prefixes: string[];
    declare static serviceUUIDs: string[];
    declare static cics: number[];

    static {
        this.driverName = 'GoCube';
        this.prefixes = ['GoCube'];
        this.serviceUUIDs = ['0000fff0-0000-1000-8000-00805f9b34fb'];
        this.cics = [0x0397];
    }

    constructor() {
        super();
        this.type = 'gocube';
    }

    override async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string
    ): Promise<this> {
        this.device = device;
        this.gattServer = await device.gatt!.connect();

        const service = await this.gattServer!.getPrimaryService(serviceUUID);
        this.characteristic = await service.getCharacteristic(charUUID);

        await this.characteristic!.startNotifications();
        this.characteristic!.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        return this;
    }

    override parseData(bytes: Uint8Array): void {
        console.log('[GoCube] Data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
}

registerDriver(GoCubeDriver);
