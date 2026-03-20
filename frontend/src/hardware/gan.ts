// GAN Cube Driver

import { CubeDriver, registerDriver } from './driver.js';

declare const CryptoJS: any;
declare const LZString: any;

interface GanDecoder {
    key: number[];
    iv: number[];
}

export class GanDriver extends CubeDriver {
    static name = 'GAN';
    static prefixes = ['GAN', 'MG', 'AiCube'];
    static serviceUUIDs = [
        '6e400001-b5a3-f393-e0a9-e50e24dc4179',  // V2
        '8653000a-43e6-47b7-9cb0-5fc21d4ae340',  // V3
        '00000010-0000-fff7-fff6-fff5fff4fff0'  // V1/V4
    ];
    static cics = Array.from({length: 256}, (_, i) => (i << 8) | 0x01);

    decoder: GanDecoder | null = null;
    protocolVersion: number = 0;
    prevMoveCnt: number = -1;

    constructor() {
        super();
        this.type = 'gan';
    }

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;
        this.mac = mac || null;

        // Determine protocol version
        if (serviceUUID.includes('6e400001')) this.protocolVersion = 2;
        else if (serviceUUID.includes('8653000a')) this.protocolVersion = 3;
        else if (serviceUUID.includes('00000010')) this.protocolVersion = 4;
        else this.protocolVersion = 1;

        const nowIso = new Date().toISOString();
        console.log(`[${nowIso}] [gancube] v2init start`);

        // Initialize decoder
        const isAiCube = device.name?.startsWith('AiCube') || false;
        this.initDecoder(mac || '', isAiCube ? 1 : 0);

        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        const characteristics = await service.getCharacteristics();

        this.characteristic = characteristics.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.notify);
        this.writeCharacteristic = characteristics.find((c: BluetoothRemoteGATTCharacteristic) => c.properties.write || c.properties.writeWithoutResponse);

        console.log(`[${nowIso}] [gancube] v2init find chrcts ${this.characteristic?.uuid},${this.writeCharacteristic?.uuid}`);

        await this.characteristic?.startNotifications();
        console.log(`[${nowIso}] [gancube] v2init v2read start notifications`);

        this.characteristic?.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        if (this.writeCharacteristic) {
            setTimeout(() => this.sendInitialRequests(), 100);
        }

        return this;
    }

    async sendInitialRequests(): Promise<void> {
        try {
            if (this.protocolVersion === 2) {
                await this.sendV2Request(5);
                await this.sendV2Request(4);
                await this.sendV2Request(9);
            } else if (this.protocolVersion === 3) {
                await this.sendV3Request(4);
                await this.sendV3Request(1);
            } else if (this.protocolVersion === 4) {
                await this.sendV4Request([0xDF, 0x03]);
                await this.sendV4Request([0xDD, 0x04, 0, 0xED]);
            }
        } catch (e) {
            console.log('[GAN] Initial request error:', e);
        }
    }

    async sendV2Request(opcode: number): Promise<void> {
        const req = new Array(20).fill(0);
        req[0] = opcode;
        const encoded = this.encode(req);
        const nowIso = new Date().toISOString();
        console.log(`[${nowIso}] [gancube] v2sendRequest ${req.join(',')} ${encoded.join(',')}`);
        await this.writeCharacteristic?.writeValue(new Uint8Array(encoded).buffer);
    }

    async sendV3Request(opcode: number): Promise<void> {
        const req = new Array(16).fill(0);
        req[0] = 0x68;
        req[1] = opcode;
        await this.writeCharacteristic?.writeValue(new Uint8Array(this.encode(req)).buffer);
    }

    async sendV4Request(reqBytes: number[]): Promise<void> {
        const req = new Array(20).fill(0);
        for (let i = 0; i < reqBytes.length; i++) req[i] = reqBytes[i];
        await this.writeCharacteristic?.writeValue(new Uint8Array(this.encode(req)).buffer);
    }

    initDecoder(mac: string, ver: number): void {
        if (!mac) return;

        const KEYS = [
            "NoRgnAHANATADDWJYwMxQOxiiEcfYgSK6Hpr4TYCs0IG1OEAbDszALpA",
            "NoNg7ANATFIQnARmogLBRUCs0oAYN8U5J45EQBmFADg0oJAOSlUQF0g",
            "NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
            "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA",
            "NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA",
            "NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA"
        ];

        try {
            const macBytes = mac.split(':').map(p => parseInt(p, 16));
            const keyStr = KEYS[2 + ver * 2];
            const ivStr = KEYS[3 + ver * 2];

            const key = JSON.parse(LZString.decompressFromEncodedURIComponent(keyStr));
            const iv = JSON.parse(LZString.decompressFromEncodedURIComponent(ivStr));

            // cstimer uses reverse order: value[5-i]
            for (let i = 0; i < 6; i++) {
                key[i] = (key[i] + macBytes[5 - i]) % 255;
                iv[i] = (iv[i] + macBytes[5 - i]) % 255;
            }

            this.decoder = { key, iv };
            console.log('[GAN] Decoder initialized for protocol', this.protocolVersion, 'ver', ver);
        } catch (e) {
            console.log('[GAN] Decoder init error:', e);
        }
    }

    aesDecryptBlock(block: number[]): number[] {
        const key = this.decoder!.key;
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

    aesEncryptBlock(block: number[]): number[] {
        const key = this.decoder!.key;
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

    decode(data: Uint8Array | number[]): number[] {
        if (!this.decoder) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.decoder.iv;

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

    encode(data: number[]): number[] {
        if (!this.decoder) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.decoder.iv;

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

    parseData(bytes: Uint8Array): void {
        const decrypted = this.decode(bytes);

        let bin = '';
        for (let i = 0; i < decrypted.length; i++) {
            bin += (decrypted[i] + 256).toString(2).slice(1);
        }

        if (this.protocolVersion === 2) {
            this.parseV2Data(bin);
        } else if (this.protocolVersion === 3) {
            this.parseV3Data(bin);
        } else if (this.protocolVersion === 4) {
            this.parseV4Data(bin);
        }
    }

    parseV2Data(bin: string): void {
        const mode = parseInt(bin.slice(0, 4), 2);
        const nowIso = new Date().toISOString();

        if (mode === 2) {
            // Move event
            console.log(`[${nowIso}] [gancube] v2 received move event ${bin}`);

            const moveCnt = parseInt(bin.slice(4, 12), 2);
            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                this.prevMoveCnt = moveCnt;
                return;
            }

            const diff = (moveCnt - this.prevMoveCnt) & 0xFF;
            const movesToEmit: string[] = [];
            const timeOffsToEmit: number[] = [];

            for (let i = 0; i < Math.min(diff, 7); i++) {
                const m = parseInt(bin.slice(12 + i * 5, 17 + i * 5), 2);
                const timeOffs = parseInt(bin.slice(47 + i * 16, 63 + i * 16), 2);
                const moveStr = "URFDLB".charAt(m >> 1) + " '".charAt(m & 1);
                if (m < 12) {
                    movesToEmit.unshift(moveStr);
                    timeOffsToEmit.unshift(timeOffs);
                }
            }

            for (let i = 0; i < movesToEmit.length; i++) {
                const move = movesToEmit[i];
                const timeOffs = timeOffsToEmit[i];
                console.log(`[${nowIso}] [gancube] move ${move}  ${timeOffs}`);
                this.onMove([move]);
            }

            this.prevMoveCnt = moveCnt;
        } else if (mode === 4) {
            // Facelets event
            console.log(`[${nowIso}] [gancube] v2 received facelets event ${bin}`);

            this.prevMoveCnt = parseInt(bin.slice(4, 12), 2);

            // Parse facelets state
            const facelets = this.parseFaceletsV2(bin);
            console.log(`[${nowIso}] [gancube] v2 facelets event state parsed ${facelets}`);

            // Update virtual cube with facelets
            if ((window as any).onGanCubeState) {
                (window as any).onGanCubeState(facelets);
            }
        } else if (mode === 5) {
            // Hardware info event
            console.log(`[${nowIso}] [gancube] v2 received hardware info event ${bin}`);

            const hardwareVersion = parseInt(bin.slice(8, 16), 2) + "." + parseInt(bin.slice(16, 24), 2);
            const softwareVersion = parseInt(bin.slice(24, 32), 2) + "." + parseInt(bin.slice(32, 40), 2);
            let devName = '';
            for (let i = 0; i < 8; i++) {
                const charCode = parseInt(bin.slice(40 + i * 8, 48 + i * 8), 2);
                if (charCode > 0) devName += String.fromCharCode(charCode);
            }
            const gyroEnabled = 1 === parseInt(bin.slice(104, 105), 2);

            console.log(`[${nowIso}] [gancube] Hardware Version ${hardwareVersion}`);
            console.log(`[${nowIso}] [gancube] Software Version ${softwareVersion}`);
            console.log(`[${nowIso}] [gancube] Device Name ${devName}`);
            console.log(`[${nowIso}] [gancube] Gyro Enabled ${gyroEnabled}`);
        } else if (mode === 9) {
            // Battery event
            const batteryLevel = parseInt(bin.slice(8, 16), 2);
            console.log(`[${nowIso}] [gancube] v2 received battery event ${bin}`);
            console.log(`[${nowIso}] [gancube] Battery: ${batteryLevel}%`);
        }
    }

    // Convert cubie state to facelet string
    cubieToFacelet(ca: number[], ea: number[]): string {
        // Corner facelet positions from cstimer mathlib.js
        const cFacelet = [
            [8, 9, 20],   // URF
            [6, 18, 38],  // UFL
            [0, 36, 47],  // ULB
            [2, 45, 11],  // UBR
            [29, 26, 15], // DFR
            [27, 44, 24], // DLF
            [33, 53, 42], // DBL
            [35, 17, 51]  // DRB
        ];

        // Edge facelet positions from cstimer mathlib.js
        const eFacelet = [
            [5, 10],  // UR
            [7, 19],  // UF
            [3, 37],  // UL
            [1, 46],  // UB
            [32, 16], // DR
            [28, 25], // DF
            [30, 43], // DL
            [34, 52], // DB
            [23, 12], // FR
            [21, 41], // FL
            [50, 39], // BL
            [48, 14]  // BR
        ];

        // Center facelets
        const ctFacelet = [4, 13, 22, 31, 40, 49]; // U, R, F, D, L, B

        // Corner colors for each cubie position (URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB)
        const cornerColors = [
            ['U', 'R', 'F'], // URF
            ['U', 'F', 'L'], // UFL
            ['U', 'L', 'B'], // ULB
            ['U', 'B', 'R'], // UBR
            ['D', 'F', 'R'], // DFR
            ['D', 'L', 'F'], // DLF
            ['D', 'B', 'L'], // DBL
            ['D', 'R', 'B']  // DRB
        ];

        // Edge colors for each edge position
        const edgeColors = [
            ['U', 'R'], // UR
            ['U', 'F'], // UF
            ['U', 'L'], // UL
            ['U', 'B'], // UB
            ['D', 'R'], // DR
            ['D', 'F'], // DF
            ['D', 'L'], // DL
            ['D', 'B'], // DB
            ['F', 'R'], // FR
            ['F', 'L'], // FL
            ['B', 'L'], // BL
            ['B', 'R']  // BR
        ];

        // Helper to extract corner orientation and permutation
        const getOri = (c: number) => (c >> 3) & 0x3; // 2 bits for orientation
        const getPerm = (c: number) => c & 0x7; // 3 bits for permutation

        // Helper to extract edge orientation and permutation
        const getEdgeOri = (e: number) => e & 0x1; // 1 bit for orientation
        const getEdgePerm = (e: number) => (e >> 1) & 0xF; // 4 bits for permutation

        // Initialize facelets array (54 positions)
        const facelets: string[] = new Array(54);

        // Apply corners: ca[i] is the cubie at position i
        for (let i = 0; i < 8; i++) {
            const cubie = ca[i];
            const ori = getOri(cubie);  // orientation of this cubie
            const perm = getPerm(cubie); // which cubie is at position i

            // Get the colors of the cubie that's at position i
            const colors = cornerColors[perm];
            const positions = cFacelet[i];

            // Apply orientation - rotate which color is on which face
            // ori=0: colors as-is, ori=1: rotate once (2nd color on U/F/B), ori=2: rotate twice
            for (let j = 0; j < 3; j++) {
                const idx = (j + ori) % 3;
                facelets[positions[j]] = colors[idx];
            }
        }

        // Apply edges: ea[i] is the edge at position i
        for (let i = 0; i < 12; i++) {
            const cubie = ea[i];
            const ori = getEdgeOri(cubie);
            const perm = getEdgePerm(cubie);

            const colors = edgeColors[perm];
            const positions = eFacelet[i];

            // For edges, orientation flips which color is on which face
            if (ori === 0) {
                facelets[positions[0]] = colors[0];
                facelets[positions[1]] = colors[1];
            } else {
                facelets[positions[0]] = colors[1];
                facelets[positions[1]] = colors[0];
            }
        }

        // Fill centers
        const faceColors = ['U', 'R', 'F', 'D', 'L', 'B'];
        for (let i = 0; i < 6; i++) {
            facelets[ctFacelet[i]] = faceColors[i];
        }

        return facelets.join('');
    }

    parseFaceletsV2(bin: string): string {
        // Parse corner permutation and orientation from cubie data
        const ca: number[] = [];
        const ea: number[] = [];
        let echk = 0;
        let cchk = 0xf00;

        // Parse 7 corners (8th corner is computed)
        for (let i = 0; i < 7; i++) {
            const perm = parseInt(bin.slice(12 + i * 3, 15 + i * 3), 2);
            const ori = parseInt(bin.slice(33 + i * 2, 35 + i * 2), 2);
            cchk -= ori << 3;
            cchk ^= perm;
            ca[i] = ori << 3 | perm;
        }
        // Compute 8th corner from checksum
        ca[7] = (cchk & 0xff8) % 24 | cchk & 0x7;

        // Parse 11 edges (12th edge is computed)
        for (let i = 0; i < 11; i++) {
            const perm = parseInt(bin.slice(47 + i * 4, 51 + i * 4), 2);
            const ori = parseInt(bin.slice(91 + i, 92 + i), 2);
            echk ^= perm << 1 | ori;
            ea[i] = perm << 1 | ori;
        }
        // Compute 12th edge from checksum
        ea[11] = echk;

        // Convert cubie state to facelets
        return this.cubieToFacelet(ca, ea);
    }

    parseV3Data(bin: string): void {
        const magic = parseInt(bin.slice(0, 8), 2);
        const mode = parseInt(bin.slice(8, 16), 2);

        if (magic !== 0x55) return;

        if (mode === 1) {
            const moveCnt = parseInt(bin.slice(64, 72) + bin.slice(56, 64), 2);
            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                this.prevMoveCnt = moveCnt;
                return;
            }

            const pow = parseInt(bin.slice(72, 74), 2);
            const axisVal = parseInt(bin.slice(74, 80), 2);
            const axis = [2, 32, 8, 1, 16, 4].indexOf(axisVal);

            if (axis !== -1) {
                const moveStr = "URFDLB".charAt(axis) + " '".charAt(pow);
                this.onMove([moveStr]);
            }

            this.prevMoveCnt = moveCnt;
        }
    }

    parseV4Data(bin: string): void {
        const mode = parseInt(bin.slice(0, 8), 2);

        if (mode === 0x01) {
            const moveCnt = parseInt(bin.slice(56, 64) + bin.slice(48, 56), 2);
            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                this.prevMoveCnt = moveCnt;
                return;
            }

            const pow = parseInt(bin.slice(64, 66), 2);
            const axisVal = parseInt(bin.slice(66, 72), 2);
            const axis = [2, 32, 8, 1, 16, 4].indexOf(axisVal);

            if (axis !== -1) {
                const moveStr = "URFDLB".charAt(axis) + " '".charAt(pow);
                this.onMove([moveStr]);
            }

            this.prevMoveCnt = moveCnt;
        }
    }
}

registerDriver(GanDriver);
