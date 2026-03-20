// GAN Cube Driver

import { CubeDriver, registerDriver } from './driver.js';
import { getProp } from '../kernel.js';
import { SOLVED_FACELET } from '../lib/mathlib.js';

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
            // Facelets event - initial state or state query response
            console.log(`[${nowIso}] [gancube] v2 received facelets event ${bin}`);

            this.prevMoveCnt = parseInt(bin.slice(4, 12), 2);

            // Parse facelets state
            const facelets = this.parseFaceletsV2(bin);
            console.log(`[${nowIso}] [gancube] v2 facelets event state parsed ${facelets}`);

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
        // cFacelet[c][n] gives the facelet index for corner position c, facelet n
        // cFacelet[j][n] gives the facelet index for cubie j (in its default orientation), facelet n
        const cFacelet = [
            [8, 9, 20],   // position 0: URF
            [6, 18, 38],  // position 1: UFL
            [0, 36, 47],  // position 2: ULB
            [2, 45, 11],  // position 3: UBR
            [29, 26, 15], // position 4: DFR
            [27, 44, 24], // position 5: DLF
            [33, 53, 42], // position 6: DBL
            [35, 17, 51]  // position 7: DRB
        ];

        // eFacelet[e][n] gives the facelet index for edge position e, facelet n
        const eFacelet = [
            [5, 10],  // position 0: UR
            [7, 19],  // position 1: UF
            [3, 37],  // position 2: UL
            [1, 46],  // position 3: UB
            [32, 16], // position 4: DR
            [28, 25], // position 5: DF
            [30, 43], // position 6: DL
            [34, 52], // position 7: DB
            [23, 12], // position 8: FR
            [21, 41], // position 9: FL
            [50, 39], // position 10: BL
            [48, 14]  // position 11: BR
        ];

        // Center facelets
        const ctFacelet = [4, 13, 22, 31, 40, 49]; // U, R, F, D, L, B

        // Initialize facelets array (54 positions)
        const facelets: (string | number)[] = new Array(54);

        // Apply corners: ca[i] = (ori << 3) | perm
        // perm = which cubie is at position i, ori = how it's oriented
        for (let i = 0; i < 8; i++) {
            const cubie = ca[i];
            const perm = cubie & 0x7;  // which cubie (0-7) is at position i
            const ori = (cubie >> 3) & 0x3; // orientation (0-2)

            // For position i, we map facelets from cubie type perm
            // cFacelet[i][n] = facelet index at position i for facelet n
            // cFacelet[perm][n] = facelet index for cubie perm for facelet n
            // The orientation rotates which facelet from cubie goes to which position
            for (let n = 0; n < 3; n++) {
                facelets[cFacelet[i][(n + ori) % 3]] = cFacelet[perm][n];
            }
        }

        // Apply edges: ea[i] = (perm << 1) | ori
        // perm = which edge is at position i, ori = how it's oriented
        for (let i = 0; i < 12; i++) {
            const cubie = ea[i];
            const perm = (cubie >> 1) & 0xF; // which edge (0-11) is at position i
            const ori = cubie & 0x1; // orientation (0 or 1)

            // Similar mapping for edges
            for (let n = 0; n < 2; n++) {
                facelets[eFacelet[i][(n + ori) % 2]] = eFacelet[perm][n];
            }
        }

        // Now convert facelet indices to colors
        // Facelet 0-8 = U, 9-17 = R, 18-26 = F, 27-35 = D, 36-44 = L, 45-53 = B
        const faceFromIdx = (idx: number): string => {
            if (idx < 9) return 'U';
            if (idx < 18) return 'R';
            if (idx < 27) return 'F';
            if (idx < 36) return 'D';
            if (idx < 45) return 'L';
            return 'B';
        };

        // Fill centers
        const faceColors = ['U', 'R', 'F', 'D', 'L', 'B'];
        for (let i = 0; i < 6; i++) {
            facelets[ctFacelet[i]] = ctFacelet[i];
        }

        // Convert facelet indices to face colors
        const result: string[] = [];
        for (let i = 0; i < 54; i++) {
            const idx = typeof facelets[i] === 'number' ? facelets[i] as number : i;
            result.push(faceFromIdx(idx));
        }

        return result.join('');
    }

    parseFaceletsV2(bin: string): string {
        // Parse corner permutation and orientation from cubie data
        const ca: number[] = [];
        const ea: number[] = [];
        let echk = 0;
        let cchk = 0xf00;

        console.log('[gancube] Parsing facelets from bin length:', bin.length);

        // Parse 7 corners (8th corner is computed)
        for (let i = 0; i < 7; i++) {
            const perm = parseInt(bin.slice(12 + i * 3, 15 + i * 3), 2);
            const ori = parseInt(bin.slice(33 + i * 2, 35 + i * 2), 2);
            cchk -= ori << 3;
            cchk ^= perm;
            ca[i] = ori << 3 | perm;
            console.log(`[gancube] Corner ${i}: perm=${perm}, ori=${ori}, ca=${ca[i]}`);
        }
        // Compute 8th corner from checksum
        ca[7] = (cchk & 0xff8) % 24 | cchk & 0x7;
        console.log(`[gancube] Corner 7 (computed): ca=${ca[7]}, cchk=${cchk}`);

        // Parse 11 edges (12th edge is computed)
        for (let i = 0; i < 11; i++) {
            const perm = parseInt(bin.slice(47 + i * 4, 51 + i * 4), 2);
            const ori = parseInt(bin.slice(91 + i, 92 + i), 2);
            echk ^= perm << 1 | ori;
            ea[i] = perm << 1 | ori;
            console.log(`[gancube] Edge ${i}: perm=${perm}, ori=${ori}, ea=${ea[i]}`);
        }
        // Compute 12th edge from checksum
        ea[11] = echk;
        console.log(`[gancube] Edge 11 (computed): ea=${ea[11]}, echk=${echk}`);

        // Convert cubie state to facelets
        const facelets = this.cubieToFacelet(ca, ea);
        console.log('[gancube] Final facelets:', facelets);
        return facelets;
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
