// Moyu Cube Driver

import { CubeDriver, registerDriver } from './driver.js';

declare const CryptoJS: any;
declare const LZString: any;

export class MoyuDriver extends CubeDriver {
    static name = 'Moyu';
    static prefixes = ['MHC', 'WCU_MY3', 'Moyu', 'MY'];
    static serviceUUIDs = ['00001000-0000-1000-8000-00805f9b34fb', '0783b03e-7735-b5a0-1760-a305d2795cb0'];
    static cics = Array.from({length: 255}, (_, i) => (i + 1) << 8);

    // Moyu32 encryption keys (from cstimer)
    static MOYU_KEYS = [
        'NoJgjANGYJwQrADgjEUAMBmKAWCP4JNIRswt81Yp5DztE1EB2AXSA',
        'NoRg7ANAzArNAc1IigFgqgTB9MCcE8cAbBCJpKgeaSAAxTSPxgC6QA'
    ];

    cipherKeyBytes: Uint8Array | null = null;
    cipherIvBytes: Uint8Array | null = null;
    prevMoveCnt: number = -1;
    deviceTime: number = 0;
    timeOffs: number[] = [];
    prevMoves: string[] = [];

    constructor() {
        super();
        this.type = 'moyu';
    }

    // Initialize AES decoder with MAC address
    initDecoder(mac: string): void {
        if (!mac) return;

        // Parse MAC bytes
        const macBytes = mac.split(':').map(b => parseInt(b, 16));

        // Decompress and parse keys
        const keyBase = JSON.parse(LZString.decompressFromEncodedURIComponent(MoyuDriver.MOYU_KEYS[0]));
        const ivBase = JSON.parse(LZString.decompressFromEncodedURIComponent(MoyuDriver.MOYU_KEYS[1]));

        // Derive key and IV from MAC
        const key = new Uint8Array(16);
        const iv = new Uint8Array(16);
        for (let i = 0; i < 6; i++) {
            key[i] = (keyBase[i] + macBytes[5 - i]) % 255;
            iv[i] = (ivBase[i] + macBytes[5 - i]) % 255;
        }
        // Fill rest with defaults
        for (let i = 6; i < 16; i++) {
            key[i] = keyBase[i];
            iv[i] = ivBase[i];
        }

        // Store raw bytes for manual encryption
        this.cipherKeyBytes = key;
        this.cipherIvBytes = iv;

        console.log('[Moyu] Cipher initialized with MAC:', mac);
    }

    // Use same encryption/decryption as GanDriver
    aesEncryptBlock(block: number[]): number[] {
        const key = this.cipherKeyBytes!;
        const keyWord = CryptoJS.lib.WordArray.create([
            (key[0] << 24) | (key[1] << 16) | (key[2] << 8) | key[3],
            (key[4] << 24) | (key[5] << 16) | (key[6] << 8) | key[7],
            (key[8] << 24) | (key[9] << 16) | (key[10] << 8) | key[11],
            (key[12] << 24) | (key[13] << 16) | (key[14] << 8) | key[15]
        ], 16);
        const dataWord = CryptoJS.lib.WordArray.create([
            (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3],
            (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7],
            (block[8] << 24) | (block[9] << 16) | (block[10] << 8) | block[11],
            (block[12] << 24) | (block[13] << 16) | (block[14] << 8) | block[15]
        ], 16);

        const encrypted = CryptoJS.AES.encrypt(
            dataWord,
            keyWord,
            { padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.ECB }
        );

        const words = encrypted.ciphertext.words;
        const result: number[] = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    aesDecryptBlock(block: number[]): number[] {
        const key = this.cipherKeyBytes!;
        const keyWord = CryptoJS.lib.WordArray.create([
            (key[0] << 24) | (key[1] << 16) | (key[2] << 8) | key[3],
            (key[4] << 24) | (key[5] << 16) | (key[6] << 8) | key[7],
            (key[8] << 24) | (key[9] << 16) | (key[10] << 8) | key[11],
            (key[12] << 24) | (key[13] << 16) | (key[14] << 8) | key[15]
        ], 16);
        const encrypted = CryptoJS.lib.WordArray.create([
            (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3],
            (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7],
            (block[8] << 24) | (block[9] << 16) | (block[10] << 8) | block[11],
            (block[12] << 24) | (block[13] << 16) | (block[14] << 8) | block[15]
        ], 16);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encrypted },
            keyWord,
            { padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.ECB }
        );

        const words = decrypted.words;
        const result: number[] = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    // Encode (same as GanDriver)
    encode(data: number[]): number[] {
        if (!this.cipherKeyBytes) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.cipherIvBytes!;

        for (let i = 0; i < 16; i++) {
            ret[i] ^= (~~iv[i]);
        }

        let block = this.aesEncryptBlock(ret.slice(0, 16));
        for (let i = 0; i < 16; i++) {
            ret[i] = block[i];
        }

        if (ret.length > 16) {
            const offset = ret.length - 16;
            const block2 = ret.slice(offset, offset + 16);
            for (let i = 0; i < 16; i++) {
                block2[i] ^= (~~iv[i]);
            }
            const encBlock2 = this.aesEncryptBlock(block2);
            for (let i = 0; i < 16; i++) {
                ret[i + offset] = encBlock2[i];
            }
        }

        return ret;
    }

    // Decode (same as GanDriver)
    decode(data: Uint8Array | number[]): number[] {
        if (!this.cipherKeyBytes) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.cipherIvBytes!;

        if (ret.length > 16) {
            const offset = ret.length - 16;
            const block = this.aesDecryptBlock(ret.slice(offset, offset + 16));
            for (let i = 0; i < 16; i++) {
                ret[i + offset] = block[i] ^ (~~iv[i]);
            }
        }

        const block = this.aesDecryptBlock(ret.slice(0, 16));
        for (let i = 0; i < 16; i++) {
            ret[i] = block[i] ^ (~~iv[i]);
        }

        return ret;
    }

    // Aliases for compatibility
    encrypt(data: Uint8Array | number[]): number[] {
        return this.encode(data);
    }

    decrypt(dataView: Uint8Array): number[] {
        return this.decode(dataView);
    }

    private deriveMacFromName(name: string | null): string | null {
        if (!name) return null;
        // Try to extract MAC from device name if possible
        // This is a placeholder - actual implementation would need device-specific logic
        return null;
    }

    private async promptForMac(name: string | null): Promise<string> {
        // This would need UI integration - return a placeholder
        console.log('[Moyu] Please enter MAC manually');
        return '00:00:00:00:00:00';
    }

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;
        this.mac = mac || this.deriveMacFromName(device.name);

        // If MAC is not available, prompt user for manual entry
        if (!this.mac) {
            console.log('[Moyu] MAC not available, prompting user...');
            this.mac = await this.promptForMac(device.name);
        }

        console.log('[Moyu] Using MAC:', this.mac);

        this.gattServer = await device.gatt.connect();

        // Initialize decoder with MAC
        this.initDecoder(this.mac);

        // Use the actual service UUID from the device
        const actualServiceUUID = serviceUUID || '0783b03e-7735-b5a0-1760-a305d2795cb0';
        console.log('[Moyu] Connecting with service UUID:', actualServiceUUID);

        const service = await this.gattServer.getPrimaryService(actualServiceUUID);
        const characteristics = await service.getCharacteristics();
        console.log('[Moyu] Available characteristics:', characteristics.map(c => c.uuid));

        // Find the read and write characteristics
        const READ_CHAR_UUID = '0783b03e-7735-b5a0-1760-a305d2795cb1';
        const WRITE_CHAR_UUID = '0783b03e-7735-b5a0-1760-a305d2795cb2';

        this.characteristic = characteristics.find(c => c.uuid.toLowerCase() === READ_CHAR_UUID);
        this.writeCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === WRITE_CHAR_UUID);

        if (!this.characteristic) {
            this.characteristic = characteristics.find(c => c.properties.notify);
        }

        if (!this.characteristic) {
            throw new Error('Could not find read characteristic');
        }

        console.log('[Moyu] Using read characteristic:', this.characteristic.uuid);
        console.log('[Moyu] Using write characteristic:', this.writeCharacteristic?.uuid);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        return this;
    }

    parseData(bytes: Uint8Array): void {
        const decrypted = this.decode(bytes);
        console.log('[Moyu] Decrypted data:', decrypted.slice(0, 20).join(','));

        // Parse move data - simplified version
        if (decrypted.length < 4) return;

        const moveCnt = decrypted[0];
        if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
            this.prevMoveCnt = moveCnt;
            return;
        }

        const diff = (moveCnt - this.prevMoveCnt) & 0xFF;

        for (let i = 0; i < Math.min(diff, 10); i++) {
            if (decrypted.length > 1 + i * 2) {
                const mv = decrypted[1 + i * 2];
                if (mv === 0) continue;

                const axis = [4, 1, 3, 0, 2, 5][((mv - 1) >> 1) % 6];
                const power = [0, 2][mv & 1];
                const moveStr = "URFDLB".charAt(axis) + " 2'".charAt(power);

                this.prevMoves.push(moveStr);
                this.onMove([moveStr]);
            }
        }

        this.prevMoveCnt = moveCnt;
    }
}

registerDriver(MoyuDriver);
