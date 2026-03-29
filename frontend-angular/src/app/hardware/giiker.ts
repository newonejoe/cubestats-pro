// Giiker Cube Driver

import { CubeDriver, registerDriver } from './driver.js';

export class GiikerDriver extends CubeDriver {
    declare static driverName: string;
    declare static prefixes: string[];
    declare static serviceUUIDs: string[];
    declare static cics: number[];

    static {
        this.driverName = 'Giiker';
        this.prefixes = ['Giiker', 'Mi Smart', 'Rubik'];
        this.serviceUUIDs = ['0000aadb-0000-1000-8000-00805f9b34fb'];
        this.cics = [0x02e5];
    }

    lastState: number[] | null = null;

    constructor() {
        super();
        this.type = 'giiker';
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
        if (bytes.length < 20) return;

        let raw = Array.from(bytes.slice(0, 20));

        // Check if data is encrypted (0xa7 marker)
        if (raw[18] === 0xa7) {
            const key = [176, 81, 104, 224, 86, 137, 237, 119, 38, 26, 193, 161, 210, 126, 150, 81, 93, 13, 236, 249, 89, 235, 88, 24, 113, 81, 214, 131, 130, 199, 2, 169, 39, 165, 171, 41];
            const k1 = (raw[19] >> 4) & 0xf;
            const k2 = raw[19] & 0xf;
            for (let i = 0; i < 18; i++) {
                raw[i] = (raw[i] - (key[i + k1] || 0) - (key[i + k2] || 0) + 256) % 256;
            }
            raw = raw.slice(0, 18);
        }

        // Extract moves from bytes 16-20
        const moveBytes = raw.slice(16, 20);
        const moves: string[] = [];
        const faces = 'BDLURF';

        for (let i = 0; i < moveBytes.length; i += 2) {
            if (moveBytes[i] === 0) continue;
            const faceIdx = moveBytes[i] - 1;
            if (faceIdx >= 0 && faceIdx < 6) {
                const modifier = (moveBytes[i + 1] - 1) % 7;
                const modStr = " 2'".charAt(modifier);
                moves.push(faces[faceIdx] + modStr);
            }
        }

        if (moves.length > 0) {
            console.log('[Giiker] Moves:', moves);
            this.onMove(moves.map((notation) => ({ notation })));
        }
    }
}

registerDriver(GiikerDriver);
