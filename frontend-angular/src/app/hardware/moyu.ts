// Moyu Cube Driver

import { CubeDriver, registerDriver } from './driver.js';
import './types.js';
import { getCubeCallbackService } from '../services/cube-callback.service';

// CryptoJS and LZString are loaded via script tags from CDN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const CryptoJS: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const LZString: any;

// Get the callback service instance
function getCallbackService() {
  return getCubeCallbackService();
}

const SOLVED_FACELET = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

function getProp(key: string, defaultValue: string): string {
    try {
        const STORAGE_KEYS = { PROPERTIES: 'cubestats_props' };
        const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
        if (propsStr) {
            const props = JSON.parse(propsStr);
            if (props[key] !== undefined) return props[key];
        }
    } catch (e) { /* ignore */ }
    return defaultValue;
}

export class MoyuDriver extends CubeDriver {
    declare static driverName: string;
    declare static prefixes: string[];
    declare static serviceUUIDs: string[];
    declare static cics: number[];

    static {
        this.driverName = 'Moyu';
        this.prefixes = ['MHC', 'WCU_MY3', 'Moyu', 'MY'];
        this.serviceUUIDs = ['00001000-0000-1000-8000-00805f9b34fb', '0783b03e-7735-b5a0-1760-a305d2795cb0'];
        this.cics = Array.from({length: 255}, (_, i) => (i + 1) << 8);
    }

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

    initDecoder(mac: string): void {
        if (!mac) return;

        const macBytes = mac.split(':').map(b => parseInt(b, 16));

        const keyBase = JSON.parse(LZString.decompressFromEncodedURIComponent(MoyuDriver.MOYU_KEYS[0]));
        const ivBase = JSON.parse(LZString.decompressFromEncodedURIComponent(MoyuDriver.MOYU_KEYS[1]));

        const key = new Uint8Array(16);
        const iv = new Uint8Array(16);
        for (let i = 0; i < 6; i++) {
            key[i] = (keyBase[i] + macBytes[5 - i]) % 255;
            iv[i] = (ivBase[i] + macBytes[5 - i]) % 255;
        }
        for (let i = 6; i < 16; i++) {
            key[i] = keyBase[i];
            iv[i] = ivBase[i];
        }

        this.cipherKeyBytes = key;
        this.cipherIvBytes = iv;

        console.log('[Moyu] Cipher initialized with MAC:', mac);
    }

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

        const encrypted = CryptoJS.AES.encrypt(dataWord, keyWord, { padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.ECB });

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

        const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, keyWord, { padding: CryptoJS.pad.NoPadding, mode: CryptoJS.mode.ECB });

        const words = decrypted.words;
        const result: number[] = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

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

    encrypt(data: Uint8Array | number[]): number[] {
        return this.encode(Array.from(data));
    }

    decrypt(dataView: Uint8Array): number[] {
        return this.decode(dataView);
    }

    parseFacelet(faceletBits: string): string {
        const state: string[] = [];
        const faces = [2, 5, 0, 3, 4, 1];
        for (let i = 0; i < 6; i++) {
            const faceIdx = faces[i];
            const face = faceletBits.slice(faceIdx * 24, 24 + faceIdx * 24);
            for (let j = 0; j < 8; j++) {
                state.push("FBUDLR".charAt(parseInt(face.slice(j * 3, 3 + j * 3), 2)));
                if (j === 3) {
                    state.push("FBUDLR".charAt(faceIdx));
                }
            }
        }
        return state.join('');
    }

    override async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;

        if (!mac) {
            const deviceName = device.name || '';
            const cacheKey = `cubestats_mac_${deviceName}`;
            mac = localStorage.getItem(cacheKey) || undefined;
            if (mac) {
                console.log(`[Moyu] MAC from localStorage: ${mac}`);
            }
        }

        if (!mac) {
            mac = this.deriveMacFromName(device.name || '') || undefined;
            if (mac) {
                console.log(`[Moyu] MAC derived from device name: ${mac}`);
            }
        }

        if (!mac) {
            console.log('[Moyu] MAC not available, prompting user...');
            mac = await this.promptForMac(device.name || null);
            if (mac) {
                const deviceName = device.name || '';
                const cacheKey = `cubestats_mac_${deviceName}`;
                localStorage.setItem(cacheKey, mac);
                console.log(`[Moyu] MAC saved to localStorage: ${mac}`);
            }
        }

        this.mac = mac || null;

        console.log('[Moyu] Using MAC:', this.mac);

        this.gattServer = await device.gatt!.connect();

        this.initDecoder(this.mac || '');

        const actualServiceUUID = serviceUUID || '0783b03e-7735-b5a0-1760-a305d2795cb0';
        console.log('[Moyu] Connecting with service UUID:', actualServiceUUID);

        const service = await this.gattServer!.getPrimaryService(actualServiceUUID);
        const characteristics = await service.getCharacteristics();
        console.log('[Moyu] Available characteristics:', characteristics.map(c => c.uuid));

        const READ_CHAR_UUID = '0783b03e-7735-b5a0-1760-a305d2795cb1';
        const WRITE_CHAR_UUID = '0783b03e-7735-b5a0-1760-a305d2795cb2';

        this.characteristic = characteristics.find(c => c.uuid.toLowerCase() === READ_CHAR_UUID) || null;
        this.writeCharacteristic = characteristics.find(c => c.uuid.toLowerCase() === WRITE_CHAR_UUID) || null;

        if (!this.characteristic) {
            this.characteristic = characteristics.find(c => c.properties.notify) || null;
        }

        if (!this.characteristic) {
            throw new Error('Could not find read characteristic');
        }

        console.log('[Moyu] Using read characteristic:', this.characteristic.uuid);
        console.log('[Moyu] Using write characteristic:', this.writeCharacteristic?.uuid);

        await this.characteristic.startNotifications();
        this.registerCharacteristicListener();

        console.log('[Moyu] Sending requestCubeInfo...');
        await this.requestCubeInfo();
        await new Promise(r => setTimeout(r, 500));

        console.log('[Moyu] Sending requestCubeStatus...');
        await this.requestCubeStatus();
        await new Promise(r => setTimeout(r, 500));

        console.log('[Moyu] Sending requestCubePower...');
        await this.requestCubePower();

        console.log('[Moyu] Connected and initialized, listening to events');
        return this;
    }

    async sendRequest(opcode: number): Promise<void> {
        if (!this.writeCharacteristic) {
            console.log('[Moyu] No write characteristic, cannot send request');
            return;
        }

        const req = new Uint8Array(20);
        req[0] = opcode;

        const encrypted = this.encode(Array.from(req));
        console.log(`[Moyu] Sending opcode: ${opcode}, encrypted: ${encrypted.join(',')}`);

        try {
            await this.writeCharacteristic.writeValue(new Uint8Array(encrypted).buffer);
            console.log(`[Moyu] Sent encrypted request opcode: ${opcode}`);
        } catch (e: any) {
            console.log('[Moyu] Error sending request:', e.message);
        }
    }

    async requestCubeInfo(): Promise<void> {
        return this.sendRequest(161);
    }

    async requestCubeStatus(): Promise<void> {
        return this.sendRequest(163);
    }

    async requestCubePower(): Promise<void> {
        return this.sendRequest(164);
    }

    initCubeState(nowIso: string, bin: string): void {
        const moveCnt = parseInt(bin.slice(152, 160), 2);
        console.log(`[${nowIso}] [Moyu] initializing move count from state: ${moveCnt}`);
        this.prevMoveCnt = moveCnt;

        const facelets = this.parseFacelet(bin.slice(8, 152));
        console.log(`[${nowIso}] [Moyu] facelets: ${facelets}`);

        const savedSolved = getCallbackService().getSavedSolvedState();
        const isSolved = facelets === (savedSolved || getProp('giiSolved', SOLVED_FACELET));
        if (!isSolved) {
            // Prompt user to confirm if cube is solved
            console.log('[Moyu] Cube not solved - showing confirm modal');
            getCallbackService().confirmSolvedState(facelets).then((confirmed) => {
                console.log('[Moyu] User confirmed cube is solved:', confirmed);
            });
        } else {
            getCallbackService().notifyCubeState(SOLVED_FACELET);
            console.log('[Moyu] Cube is solved');
        }
    }

    protected override onData(event: Event): void {
        const target = event.target as unknown as { value?: { byteLength: number; getUint8: (i: number) => number } };
        const value = target?.value;
        if (!value) return;

        const rawLen = value.byteLength;

        const dataArray: number[] = [];
        for (let i = 0; i < rawLen; i++) {
            dataArray.push(value.getUint8(i));
        }

        const decrypted = this.decode(dataArray);

        if (decrypted.length < 8) return;

        let bin = '';
        for (let i = 0; i < decrypted.length; i++) {
            bin += (decrypted[i] + 0x100).toString(2).slice(1);
        }

        const msgType = parseInt(bin.slice(0, 8), 2);

        const nowIso = new Date().toISOString();
        if (msgType === 161 || msgType === 163 || msgType === 164 || msgType === 165) {
            console.log(`[${nowIso}] [Moyu] message type: ${msgType} (0x${msgType.toString(16)}) ${bin}`);
        }

        if (msgType === 161) {
            console.log(`[${nowIso}] [Moyu] received hardware info event`);
            let devName = '';
            for (let i = 0; i < 8; i++) {
                const charCode = parseInt(bin.slice(8 + i * 8, 16 + i * 8), 2);
                if (charCode > 0) devName += String.fromCharCode(charCode);
            }
            const hardwareVersion = parseInt(bin.slice(88, 96), 2) + "." + parseInt(bin.slice(96, 104), 2);
            const softwareVersion = parseInt(bin.slice(72, 80), 2) + "." + parseInt(bin.slice(80, 88), 2);
            console.log(`[${nowIso}] [Moyu] Hardware Version: ${hardwareVersion}`);
            console.log(`[${nowIso}] [Moyu] Software Version: ${softwareVersion}`);
            console.log(`[${nowIso}] [Moyu] Device Name: ${devName}`);
        } else if (msgType === 163) {
            console.log(`[${nowIso}] [Moyu] received facelets state`);

            if (this.prevMoveCnt === -1) {
               this.initCubeState(nowIso, bin);
            }
        } else if (msgType === 164) {
            const battery = parseInt(bin.slice(8, 16), 2);
            console.log(`[${nowIso}] [Moyu] Battery: ${battery}%`);
        } else if (msgType === 165) {
            const moveCnt = parseInt(bin.slice(88, 96), 2);
            console.log(`[${nowIso}] [Moyu] move count: ${moveCnt}, prev: ${this.prevMoveCnt}`);

            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                return;
            }

            let invalidMove = false;
            for (let i = 0; i < 5; i++) {
                const m = parseInt(bin.slice(96 + i * 5, 101 + i * 5), 2);
                this.timeOffs[i] = parseInt(bin.slice(8 + i * 16, 24 + i * 16), 2);
                this.prevMoves[i] = "FBUDLR".charAt(m >> 1) + " '".charAt(m & 1);

                if (m >= 12) {
                    this.prevMoves[i] = 'U ';
                    invalidMove = true;
                }
            }

            if (!invalidMove) {
                let moveDiff = (moveCnt - this.prevMoveCnt) & 0xff;
                this.prevMoveCnt = moveCnt;

                if (moveDiff > this.prevMoves.length) {
                    moveDiff = this.prevMoves.length;
                }

                for (let i = moveDiff - 1; i >= 0; i--) {
                    const moveStr = this.prevMoves[i];
                    console.log(`[${nowIso}] [Moyu] Move: ${moveStr}, time offset: ${this.timeOffs[i]}`);
                    this.onMove([{ notation: moveStr, hwMs: this.timeOffs[i] }]);
                }
            }
        }
    }

    deriveMacFromName(deviceName: string): string | null {
        const match = /^WCU_MY32_([0-9A-F]{4})$/.exec(deviceName);
        if (match) {
            return 'CF:30:16:00:' + match[1].slice(0, 2) + ':' + match[1].slice(2);
        }
        return null;
    }

    private async promptForMac(deviceName: string | null): Promise<string> {
        const mac = await getCallbackService().promptForMac();
        return mac || '';
    }

    override parseData(bytes: Uint8Array): void {
        // Handled in onData now
    }
}

registerDriver(MoyuDriver);
