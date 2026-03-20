// Moyu Cube Driver

import { getProp } from '../kernel.js';
import { SOLVED_FACELET } from '../lib/mathlib.js';
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

    // Parse facelets from binary string (reference: cstimer moyu32cube.js)
    parseFacelet(faceletBits: string): string {
        const state: string[] = [];
        const faces = [2, 5, 0, 3, 4, 1]; // parse in order URFDLB instead of FBUDRL
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

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;

        // Try to get MAC from parameter, localStorage, device name, or prompt user
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

        // If still not available, prompt user
        if (!mac) {
            console.log('[Moyu] MAC not available, prompting user...');
            mac = await this.promptForMac(device.name);
            if (mac) {
                // Save to localStorage for future use
                const deviceName = device.name || '';
                const cacheKey = `cubestats_mac_${deviceName}`;
                localStorage.setItem(cacheKey, mac);
                console.log(`[Moyu] MAC saved to localStorage: ${mac}`);
            }
        }

        this.mac = mac || null;

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

        // Send initialization requests with delays
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

    // Send a request to the cube
    async sendRequest(opcode: number): Promise<void> {
        if (!this.writeCharacteristic) {
            console.log('[Moyu] No write characteristic, cannot send request');
            return;
        }

        // Create 20-byte request with opcode
        const req = new Uint8Array(20);
        req[0] = opcode;

        // Encrypt the request
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
        return this.sendRequest(161); // 0xA1
    }

    async requestCubeStatus(): Promise<void> {
        return this.sendRequest(163); // 0xA3
    }

    async requestCubePower(): Promise<void> {
        return this.sendRequest(164); // 0xA4
    }

    initCubeState(nowIso:string , bin: string): void {
        const moveCnt = parseInt(bin.slice(152, 160), 2);
        console.log(`[${nowIso}] [Moyu] initializing move count from state: ${moveCnt}`);
        this.prevMoveCnt = moveCnt;

        // Parse facelets and check solved state
        const facelets = this.parseFacelet(bin.slice(8, 152));
        console.log(`[${nowIso}] [Moyu] facelets: ${facelets}`);

        // Check if cube matches saved solved state
        if (facelets !== getProp('giiSolved', SOLVED_FACELET)) {
            console.log('[gancube] Cube does not match saved solved state, asking user...');
            // Show modal to ask user if cube is actually solved
            (window as any).showResetModal?.((confirmed: boolean) => {
                if (confirmed) {
                    console.log('[gancube] User confirmed solved, saving facelets...');
                    (window as any).markCubeSolved?.(facelets);
                } else {
                    // Update virtual cube with facelets if user says it's scrambled
                    if ((window as any).onGanCubeState) {
                        (window as any).onGanCubeState(facelets);
                    }
                }
            });
        } else {
            console.log('[gancube] Cube matches saved solved state');
            // Update virtual cube with facelets
            if ((window as any).onGanCubeState) {
                (window as any).onGanCubeState(facelets);
            }
        }
 }

    // Handle incoming data from the cube
    onData(event: Event): void {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (!value) return;

        const rawLen = value.byteLength;

        // Convert DataView to array for decoding
        const dataArray: number[] = [];
        for (let i = 0; i < rawLen; i++) {
            dataArray.push(value.getUint8(i));
        }

        // Try decoding
        const decrypted = this.decode(dataArray);

        if (decrypted.length < 8) return;

        // Convert to binary string for parsing
        let bin = '';
        for (let i = 0; i < decrypted.length; i++) {
            bin += (decrypted[i] + 0x100).toString(2).slice(1);
        }

        const msgType = parseInt(bin.slice(0, 8), 2);

        // Only log important message types (161=info, 163=state, 164=battery, 165=move)
        const nowIso = new Date().toISOString();
        if (msgType === 161 || msgType === 163 || msgType === 164 || msgType === 165) {
            console.log(`[${nowIso}] [Moyu] message type: ${msgType} (0x${msgType.toString(16)}) ${bin}`);
        }

        if (msgType === 161) { // Hardware info
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
        } else if (msgType === 163) { // State (facelets)
            console.log(`[${nowIso}] [Moyu] received facelets state`);

            // Initialize move count from state message (only on first state)
            if (this.prevMoveCnt === -1) {
               this.initCubeState(nowIso, bin); 
            }
        } else if (msgType === 164) { // Battery level
            const battery = parseInt(bin.slice(8, 16), 2);
            console.log(`[${nowIso}] [Moyu] Battery: ${battery}%`);
        } else if (msgType === 165) { // Move
            const moveCnt = parseInt(bin.slice(88, 96), 2);
            console.log(`[${nowIso}] [Moyu] move count: ${moveCnt}, prev: ${this.prevMoveCnt}`);

            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                return;
            }

            let invalidMove = false;
            // Parse up to 5 moves
            for (let i = 0; i < 5; i++) {
                const m = parseInt(bin.slice(96 + i * 5, 101 + i * 5), 2);
                this.timeOffs[i] = parseInt(bin.slice(8 + i * 16, 24 + i * 16), 2);
                this.prevMoves[i] = "FBUDLR".charAt(m >> 1) + " '".charAt(m & 1);

                if (m >= 12) {
                    this.prevMoves[i] = 'U ';
                    invalidMove = true;
                }
            }

            if(!invalidMove) {
                let moveDiff = (moveCnt - this.prevMoveCnt) & 0xff;
                this.prevMoveCnt = moveCnt;

                if (moveDiff > this.prevMoves.length) {
                    moveDiff = this.prevMoves.length;
                }

                for (let i = moveDiff - 1; i >= 0; i--) {
                    // this could be a bug
                    const moveStr = this.prevMoves[i];
                    console.log(`[${nowIso}] [Moyu] Move: ${moveStr}, time offset: ${this.timeOffs[i]}`);
                    this.onMove([moveStr]);
                }
            }

            /*
            console.log(`[${nowIso}] [Moyu] Move: ${moveStr}, time offset: ${this.timeOffs[i]}`);
            this.onMove([moveStr]);
            */
        }
    }

    // Derive MAC from device name (e.g., WCU_MY32_BEB6 -> CF:30:16:00:BE:B6)
    deriveMacFromName(deviceName: string): string | null {
        const match = /^WCU_MY32_([0-9A-F]{4})$/.exec(deviceName);
        if (match) {
            return 'CF:30:16:00:' + match[1].slice(0, 2) + ':' + match[1].slice(2);
        }
        return null;
    }

    // Prompt user for MAC address when not available
    private async promptForMac(deviceName: string | null): Promise<string> {
        return new Promise((resolve) => {
            (window as any).showMacModal?.((mac: string | null) => {
                if (mac) {
                    resolve(mac);
                } else {
                    resolve('');
                }
            });
        });
    }

    // Legacy parseData for compatibility
    parseData(bytes: Uint8Array): void {
        // Handled in onData now
    }
}

registerDriver(MoyuDriver);
