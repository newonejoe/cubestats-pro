// CubeBluetooth.js - Modular Bluetooth cube drivers with registry pattern

// ============ DRIVER REGISTRY ============

const DRIVER_REGISTRY = [];

function registerDriver(driverClass) {
    DRIVER_REGISTRY.push(driverClass);
    console.log('[DriverRegistry] Registered:', driverClass.name);
}

// ============ BASE CUBE DRIVER ============

class CubeDriver {
    static name = 'Unknown';
    static prefixes = [];
    static serviceUUIDs = [];
    static cics = [];

    constructor() {
        this.device = null;
        this.gattServer = null;
        this.characteristic = null;
        this.writeCharacteristic = null;
        this.mac = null;
    }

    // Override in subclass to extract MAC from advertisement data
    static extractMacFromAdv(manufacturerData, deviceName) {
        return null;
    }

    // Override in subclass to check if this driver matches the device
    static matchDevice(device, services) {
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

    async connect(device, service, characteristic) {
        throw new Error('Not implemented');
    }

    parseData(bytes) {
        throw new Error('Not implemented');
    }

    onMove(moves) {
        console.log('[CubeDriver] Move:', moves);
    }

    disconnect() {
        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.onData.bind(this));
        }
        if (this.gattServer && this.gattServer.connected) {
            this.gattServer.disconnect();
        }
    }

    onData(event) {
        const bytes = new Uint8Array(event.target.value.buffer);
        this.parseData(bytes);
    }
}

// ============ GIIKER CUBE DRIVER ============

class GiikerDriver extends CubeDriver {
    static name = 'Giiker';
    static prefixes = ['Giiker', 'Mi Smart', 'Rubik'];
    static serviceUUIDs = ['0000aadb-0000-1000-8000-00805f9b34fb'];
    static cics = [0x02e5];

    constructor() {
        super();
        this.type = 'giiker';
        this.lastState = null;
    }

    async connect(device, serviceUUID, charUUID) {
        this.device = device;
        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        this.characteristic = await service.getCharacteristic(charUUID);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        return this;
    }

    parseData(bytes) {
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
        const moves = [];
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
            this.onMove(moves);
        }
    }
}
registerDriver(GiikerDriver);

// ============ GAN CUBE DRIVER ============

class GanDriver extends CubeDriver {
    static name = 'GAN';
    static prefixes = ['GAN', 'MG', 'AiCube'];
    static serviceUUIDs = [
        '6e400001-b5a3-f393-e0a9-e50e24dc4179',  // V2
        '8653000a-43e6-47b7-9cb0-5fc21d4ae340',  // V3
        '00000010-0000-fff7-fff6-fff5fff4fff0'  // V1/V4
    ];
    static cics = Array.from({length: 256}, (_, i) => (i << 8) | 0x01);

    constructor() {
        super();
        this.type = 'gan';
        this.decoder = null;
        this.protocolVersion = 0;
        this.prevMoveCnt = -1;
    }

    async connect(device, serviceUUID, charUUID, writeCharUUID, mac) {
        this.device = device;
        this.mac = mac;

        // Determine protocol version
        if (serviceUUID.includes('6e400001')) this.protocolVersion = 2;
        else if (serviceUUID.includes('8653000a')) this.protocolVersion = 3;
        else if (serviceUUID.includes('00000010')) this.protocolVersion = 4;
        else this.protocolVersion = 1;

        const nowIso = new Date().toISOString();
        console.log(`[${nowIso}] [gancube] v2init start`);

        // Initialize decoder
        this.initDecoder(mac, (this.device.name || '').startsWith('AiCube') ? 1 : 0);

        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        const characteristics = await service.getCharacteristics();

        this.characteristic = characteristics.find(c => c.properties.notify);
        this.writeCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        console.log(`[${nowIso}] [gancube] v2init find chrcts ${this.characteristic},${this.writeCharacteristic}`);

        await this.characteristic.startNotifications();
        console.log(`[${nowIso}] [gancube] v2init v2read start notifications`);

        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        console.log(`[${nowIso}] [gancube] v2init v2read notification started`);

        if (this.writeCharacteristic) {
            setTimeout(() => this.sendInitialRequests(), 100);
        }

        return this;
    }

    async sendInitialRequests() {
        try {
            if (this.protocolVersion === 2) {
                // v2init sends: hardware info (5), facelets (4), battery (9)
                await this.sendV2Request(5);
                await this.sendV2Request(4);
                await this.sendV2Request(9);
            } else if (this.protocolVersion === 3) {
                // v3init sends: hardware info (4), facelets (1)
                await this.sendV3Request(4);
                await this.sendV3Request(1);
            } else if (this.protocolVersion === 4) {
                // v4init sends: hardware info, facelets
                await this.sendV4Request([0xDF, 0x03]);
                await this.sendV4Request([0xDD, 0x04, 0, 0xED]);
            }
        } catch (e) {
            console.log('[GAN] Initial request error:', e);
        }
    }

    async sendV2Request(opcode) {
        const req = new Array(20).fill(0);
        req[0] = opcode;
        const encoded = this.encode(req);
        const nowIso = new Date().toISOString();
        console.log(`[${nowIso}] [gancube] v2sendRequest ${req.join(',')} ${encoded.join(',')}`);
        await this.writeCharacteristic.writeValue(new Uint8Array(encoded).buffer);
    }

    async sendV3Request(opcode) {
        const req = new Array(16).fill(0);
        req[0] = 0x68;
        req[1] = opcode;
        await this.writeCharacteristic.writeValue(new Uint8Array(this.encode(req)).buffer);
    }

    async sendV4Request(reqBytes) {
        const req = new Array(20).fill(0);
        for (let i = 0; i < reqBytes.length; i++) req[i] = reqBytes[i];
        await this.writeCharacteristic.writeValue(new Uint8Array(this.encode(req)).buffer);
    }

    initDecoder(mac, ver) {
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

    aesDecryptBlock(block) {
        const key = this.decoder.key;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    aesEncryptBlock(block) {
        const key = this.decoder.key;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    decode(data) {
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

    encode(data) {
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

    parseData(bytes) {
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

    parseV2Data(bin) {
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
            const movesToEmit = [];
            const timeOffsToEmit = [];

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
            if (window.onGanCubeState) {
                window.onGanCubeState(facelets);
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

    parseFaceletsV2(bin) {
        // Simplified facelets parsing for V2
        // Parse corner permutation and orientation
        const ca = [];
        const ea = [];
        let echk = 0;
        let cchk = 0xf00;

        for (let i = 0; i < 7; i++) {
            const perm = parseInt(bin.slice(12 + i * 3, 15 + i * 3), 2);
            const ori = parseInt(bin.slice(33 + i * 2, 35 + i * 2), 2);
            cchk -= ori << 3;
            cchk ^= perm;
            ca[i] = ori << 3 | perm;
        }
        ca[7] = (cchk & 0xff8) % 24 | cchk & 0x7;

        for (let i = 0; i < 11; i++) {
            const perm = parseInt(bin.slice(47 + i * 4, 51 + i * 4), 2);
            const ori = parseInt(bin.slice(91 + i, 92 + i), 2);
            echk ^= perm << 1 | ori;
            ea[i] = perm << 1 | ori;
        }
        ea[11] = echk;

        // Return facelets string (simplified - assumes solved state for now)
        return 'UUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
    }

    parseV3Data(bin) {
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

    parseV4Data(bin) {
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

// ============ GOCUBE DRIVER ============

class GoCubeDriver extends CubeDriver {
    static name = 'GoCube';
    static prefixes = ['GoCube'];
    static serviceUUIDs = ['0000fff0-0000-1000-8000-00805f9b34fb'];
    static cics = [0x0397];

    constructor() {
        super();
        this.type = 'gocube';
    }

    async connect(device, serviceUUID, charUUID) {
        this.device = device;
        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        this.characteristic = await service.getCharacteristic(charUUID);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        return this;
    }

    parseData(bytes) {
        console.log('[GoCube] Data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
    }
}
registerDriver(GoCubeDriver);

// ============ QIYI CUBE DRIVER ============

class QiyiDriver extends CubeDriver {
    static name = 'Qiyi';
    static prefixes = ['QY-QYSC', 'XMD-TornadoV4-i'];
    static serviceUUIDs = ['0000fff0-0000-1000-8000-00805f9b34fb'];
    static cics = [0x0504];
    static QIYI_KEYS = ['NoDg7ANAjGkEwBYCc0xQnADAVgkzGAzHNAGyRTanQi5QIFyHrjQMQgsC6QA'];

    static extractMacFromAdv(manufacturerData, deviceName) {
        if (!manufacturerData) return null;
        for (const [cid, data] of manufacturerData.entries()) {
            if (cid === 0x0504) {
                const dv = data instanceof DataView ? data : new DataView(data.buffer);
                if (dv.byteLength >= 6) {
                    const mac = [];
                    for (let i = 5; i >= 0; i--) {
                        mac.push((dv.getUint8(i) + 0x100).toString(16).slice(1));
                    }
                    return mac.join(':');
                }
            }
        }
        // Fallback from device name
        if (/^(QY-QYSC|XMD-TornadoV4-i)-.-[0-9A-F]{4}$/.test(deviceName)) {
            return 'CC:A3:00:00:' + deviceName.slice(-4, -2) + ':' + deviceName.slice(-2);
        }
        return null;
    }

    constructor() {
        super();
        this.type = 'qiyi';
        this.decoder = null;
        this.lastTs = 0;
    }

    crc16modbus(data) {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x1) ? (crc >> 1) ^ 0xa001 : crc >> 1;
            }
        }
        return crc;
    }

    aesEncryptBlock(block) {
        const key = this.decoder;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    aesDecryptBlock(block) {
        const key = this.decoder;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    sendMessage(content) {
        if (!this.characteristic) return Promise.reject();
        const msg = [0xfe, 4 + content.length];
        for (let i = 0; i < content.length; i++) msg.push(content[i]);
        const crc = this.crc16modbus(msg);
        msg.push(crc & 0xff, crc >> 8);
        const npad = (16 - msg.length % 16) % 16;
        for (let i = 0; i < npad; i++) msg.push(0);
        const encMsg = [];
        for (let i = 0; i < msg.length; i += 16) {
            const block = msg.slice(i, i + 16);
            const encrypted = this.aesEncryptBlock(block);
            for (let j = 0; j < 16; j++) encMsg[i + j] = encrypted[j];
        }
        console.log('[Qiyi] send message', msg.slice(0, 20).join(','));
        return this.characteristic.writeValue(new Uint8Array(encMsg).buffer);
    }

    sendHello(mac) {
        if (!mac) return Promise.reject('empty mac');
        const content = [0x00, 0x6b, 0x01, 0x00, 0x00, 0x22, 0x06, 0x00, 0x02, 0x08, 0x00];
        for (let i = 5; i >= 0; i--) {
            content.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
        }
        return this.sendMessage(content);
    }

    async connect(device, serviceUUID, charUuid, writeCharUUID, mac) {
        this.device = device;
        this.mac = mac;
        if (!mac) {
            throw new Error('Qiyi cube requires MAC from advertisement');
        }
        this.initDecoder();
        this.gattServer = await device.gatt.connect();
        const service = await this.gattServer.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        this.characteristic = await service.getCharacteristic('0000fff6-0000-1000-8000-00805f9b34fb');
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));
        await this.sendHello(mac);
        console.log('[Qiyi] Connected and hello sent');
        return this;
    }

    initDecoder() {
        try {
            const key = JSON.parse(LZString.decompressFromEncodedURIComponent(QiyiDriver.QIYI_KEYS[0]));
            this.decoder = key;
            console.log('[Qiyi] AES decoder initialized');
        } catch (e) {
            console.log('[Qiyi] Decoder init error:', e);
        }
    }

    parseData(bytes) {
        const encMsg = Array.from(bytes);
        if (!this.decoder) return;
        const msg = [];
        for (let i = 0; i < encMsg.length; i += 16) {
            const block = encMsg.slice(i, i + 16);
            const decrypted = this.aesDecryptBlock(block);
            for (let j = 0; j < 16; j++) msg[i + j] = decrypted[j];
        }
        const len = msg[1];
        const trimmed = msg.slice(0, len);
        if (trimmed.length < 3 || this.crc16modbus(trimmed) !== 0) {
            console.log('[Qiyi] CRC check failed');
            return;
        }
        this.parseCubeData(trimmed);
    }

    parseCubeData(msg) {
        if (msg[0] !== 0xfe) return;
        const opcode = msg[2];
        const ts = (msg[3] << 24 | msg[4] << 16 | msg[5] << 8 | msg[6]);
        if (opcode === 0x2) {
            this.sendMessage(msg.slice(2, 7));
            this.lastTs = ts;
        } else if (opcode === 0x3) {
            this.sendMessage(msg.slice(2, 7));
            const mv = msg[34];
            const axis = [4, 1, 3, 0, 2, 5][(mv - 1) >> 1];
            const power = [0, 2][mv & 1];
            const moveStr = "URFDLB".charAt(axis) + " 2'".charAt(power);
            console.log('[Qiyi] Move:', moveStr);
            this.onMove([moveStr]);
            this.lastTs = ts;
        }
    }
}
registerDriver(QiyiDriver);

// ============ MOYU CUBE DRIVER ============

class MoyuDriver extends CubeDriver {
    static name = 'Moyu';
    static prefixes = ['MHC', 'WCU_MY3', 'Moyu', 'MY'];
    static serviceUUIDs = ['00001000-0000-1000-8000-00805f9b34fb', '0783b03e-7735-b5a0-1760-a305d2795cb0'];
    static cics = Array.from({length: 255}, (_, i) => (i + 1) << 8);

    // Moyu32 encryption keys (from cstimer)
    static MOYU_KEYS = [
        'NoJgjANGYJwQrADgjEUAMBmKAWCP4JNIRswt81Yp5DztE1EB2AXSA',
        'NoRg7ANAzArNAc1IigFgqgTB9MCcE8cAbBCJpKgeaSAAxTSPxgC6QA'
    ];

    constructor() {
        super();
        this.type = 'moyu';
        this.decoder = null;
        this.prevMoveCnt = -1;
        this.deviceTime = 0;
        this.timeOffs = [];
        this.prevMoves = [];
    }

    // Initialize AES decoder with MAC address
    initDecoder(mac) {
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
    aesEncryptBlock(block) {
        const key = this.cipherKeyBytes;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    aesDecryptBlock(block) {
        const key = this.cipherKeyBytes;
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
        const result = [];
        for (let i = 0; i < 16; i++) {
            result.push((words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
        }
        return result;
    }

    // Encode (same as GanDriver)
    encode(data) {
        if (!this.cipherKeyBytes) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.cipherIvBytes;

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
    decode(data) {
        if (!this.cipherKeyBytes) return Array.from(data);

        const ret = Array.from(data);
        const iv = this.cipherIvBytes;

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
    encrypt(data) {
        return this.encode(data);
    }

    decrypt(dataView) {
        return this.decode(dataView);
    }

    async connect(device, serviceUUID, charUUID, writeCharUUID, mac) {
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

    // Derive MAC from device name (e.g., WCU_MY32_BEB6 -> CF:30:16:00:BE:B6)
    deriveMacFromName(deviceName) {
        const match = /^WCU_MY32_([0-9A-F]{4})$/.exec(deviceName);
        if (match) {
            return 'CF:30:16:00:' + match[1].slice(0, 2) + ':' + match[1].slice(2);
        }
        return null;
    }

    // Prompt user for manual MAC entry
    async promptForMac(deviceName) {
        const defaultMac = this.deriveMacFromName(deviceName);
        const promptText = defaultMac
            ? `Could not automatically determine MAC for ${deviceName}.\nEnter MAC address (e.g., ${defaultMac}):`
            : `Could not automatically determine MAC for ${deviceName}.\nEnter MAC address:`;

        // Use browser prompt or a custom modal
        let mac = null;

        // Try to use a more user-friendly approach with a custom prompt
        if (window.prompt) {
            mac = window.prompt(promptText, defaultMac || 'CF:30:16:00:00:00');
        }

        // Validate MAC format
        if (mac && /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac)) {
            console.log('[Moyu] User entered MAC:', mac);
            return mac.toUpperCase();
        }

        console.log('[Moyu] Invalid MAC or cancelled');
        return defaultMac; // Fallback to derived MAC
    }

    // Send a request to the cube
    async sendRequest(opcode) {
        if (!this.writeCharacteristic) {
            console.log('[Moyu] No write characteristic, cannot send request');
            return;
        }

        // Create 20-byte request with opcode
        const req = new Uint8Array(20);
        req[0] = opcode;

        // Encrypt the request
        const encrypted = this.encode(req);
        console.log(`[Moyu] Sending opcode: ${opcode}, encrypted: ${Array.from(encrypted).join(',')}`);

        try {
            await this.writeCharacteristic.writeValue(new Uint8Array(encrypted).buffer);
            console.log(`[Moyu] Sent encrypted request opcode: ${opcode}`);
        } catch (e) {
            console.log('[Moyu] Error sending request:', e.message);
        }
    }

    async requestCubeInfo() {
        return this.sendRequest(161); // 0xA1
    }

    async requestCubeStatus() {
        return this.sendRequest(163); // 0xA3
    }

    async requestCubePower() {
        return this.sendRequest(164); // 0xA4
    }

    onData(event) {
        const value = event.target.value;
        if (!value) return;

        const rawLen = value.byteLength;

        // Convert DataView to array for decoding
        const dataArray = [];
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
            console.log(`[${nowIso}] [Moyu] message type: ${msgType} (0x${msgType.toString(16)})`);
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
            // Could parse facelets here
        } else if (msgType === 164) { // Battery level
            const battery = parseInt(bin.slice(8, 16), 2);
            console.log(`[${nowIso}] [Moyu] Battery: ${battery}%`);
        } else if (msgType === 165) { // Move
            const moveCnt = parseInt(bin.slice(88, 96), 2);
            console.log(`[${nowIso}] [Moyu] move count: ${moveCnt}, prev: ${this.prevMoveCnt}`);

            if (moveCnt === this.prevMoveCnt || this.prevMoveCnt === -1) {
                this.prevMoveCnt = moveCnt;
                return;
            }

            // Parse up to 5 moves
            for (let i = 0; i < 5; i++) {
                const m = parseInt(bin.slice(96 + i * 5, 101 + i * 5), 2);
                this.timeOffs[i] = parseInt(bin.slice(8 + i * 16, 24 + i * 16), 2);

                // Face: bits 0-2, Direction: bit 3
                const face = m >> 1;
                const dir = m & 1;

                if (m >= 12) {
                    // Invalid move
                    break;
                }

                const moveStr = "FBUDLR".charAt(face) + " '".charAt(dir);
                console.log(`[${nowIso}] [Moyu] Move: ${moveStr}, time offset: ${this.timeOffs[i]}`);
                this.onMove([moveStr]);
            }

            this.prevMoveCnt = moveCnt;
        }
    }

    // Legacy parseData for compatibility
    parseData(bytes) {
        // Handled in onData now
    }
}
registerDriver(MoyuDriver);

// ============ BLUETOOTH MANAGER ============

class BluetoothManager {
    constructor() {
        this.driver = null;
        this.onMoveCallback = null;
        this.onConnectCallback = null;
        this.onDisconnectCallback = null;
    }

    setOnMove(callback) {
        this.onMoveCallback = callback;
    }

    setOnConnect(callback) {
        this.onConnectCallback = callback;
    }

    setOnDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    // Get all unique CICs from registered drivers
    getAllCics() {
        const cics = new Set();
        for (const driver of DRIVER_REGISTRY) {
            if (driver.cics) {
                for (const cic of driver.cics) {
                    cics.add(cic);
                }
            }
        }
        return Array.from(cics);
    }

    // Get all unique service UUIDs from registered drivers
    getAllServiceUUIDs() {
        const services = new Set();
        services.add('0000180a-0000-1000-8000-00805f9b34fb'); // Device Information
        for (const driver of DRIVER_REGISTRY) {
            if (driver.serviceUUIDs) {
                for (const uuid of driver.serviceUUIDs) {
                    services.add(uuid);
                }
            }
        }
        return Array.from(services);
    }

    // Build Bluetooth scan filters from registered drivers
    getScanFilters() {
        const filters = [];
        for (const driver of DRIVER_REGISTRY) {
            if (driver.prefixes) {
                for (const prefix of driver.prefixes) {
                    filters.push({ namePrefix: prefix });
                }
            }
        }
        return filters;
    }

    // Find matching driver for a device
    findDriver(device, services) {
        const deviceName = (device.name || '').trim().toLowerCase();
        const serviceUUIDs = services ? services.map(s => s.uuid.toLowerCase()) : [];

        console.log('[Bluetooth] findDriver: deviceName =', deviceName);
        console.log('[Bluetooth] findDriver: serviceUUIDs =', serviceUUIDs);

        for (const driver of DRIVER_REGISTRY) {
            // Match by name prefix (higher priority)
            if (driver.prefixes) {
                for (const prefix of driver.prefixes) {
                    const prefixLower = prefix.toLowerCase();
                    if (deviceName.startsWith(prefixLower)) {
                        console.log('[Bluetooth] findDriver: matched by name prefix', prefix, '->', driver.name);
                        return driver;
                    }
                }
            }
        }

        // Try service UUID match only if name didn't match
        for (const driver of DRIVER_REGISTRY) {
            if (driver.serviceUUIDs && serviceUUIDs.length > 0) {
                for (const suuid of driver.serviceUUIDs) {
                    if (serviceUUIDs.includes(suuid.toLowerCase())) {
                        console.log('[Bluetooth] findDriver: matched by service UUID', suuid, '->', driver.name);
                        return driver;
                    }
                }
            }
        }
        return null;
    }

    async scan() {
        const allCics = this.getAllCics();
        const allServices = this.getAllServiceUUIDs();
        const filters = this.getScanFilters();

        console.log('[Bluetooth] Scanning with CICs:', allCics.map(c => '0x' + c.toString(16)).join(', '));

        const device = await navigator.bluetooth.requestDevice({
            filters: filters,
            optionalServices: allServices,
            optionalManufacturerData: allCics
        });

        console.log('[Bluetooth] Selected:', device.name);

        // Try to extract MAC from advertisement data using driver-specific logic
        let mac = null;
        const deviceName = device.name || '';

        if (device.watchAdvertisements) {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(), 10000);
                const onAdv = (event) => {
                    const mfData = event.manufacturerData;
                    if (!mfData) return;

                    // Try each driver's MAC extraction
                    for (const driver of DRIVER_REGISTRY) {
                        if (driver.extractMacFromAdv) {
                            const extracted = driver.extractMacFromAdv(mfData, deviceName);
                            if (extracted) {
                                mac = extracted;
                                console.log('[Bluetooth] MAC from', driver.name, ':', mac);
                                break;
                            }
                        }
                    }

                    clearTimeout(timeout);
                    device.removeEventListener('advertisementreceived', onAdv);
                    device.stopWatchingAdvertisements?.();
                    resolve();
                };
                device.addEventListener('advertisementreceived', onAdv);
                device.watchAdvertisements();
            });
        }

        return { device, mac };
    }

    async connect(device, mac) {
        const gattServer = await device.gatt.connect();

        // Get MAC from Device Information Service if missing
        if (!mac) {
            try {
                const dis = await gattServer.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb');
                if (dis) {
                    const chars = await dis.getCharacteristics();
                    for (const char of chars) {
                        const uuid = char.uuid.toLowerCase();
                        if (uuid.includes('2a25') || uuid.includes('2a27')) {
                            const value = await char.readValue();
                            const str = new TextDecoder().decode(value);
                            if (str.match(/^[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}$/)) {
                                mac = str.toLowerCase();
                                console.log('[Bluetooth] MAC from Device Info:', mac);
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('[Bluetooth] Could not get MAC from Device Info:', e.message);
            }
        }

        // Fallback to localStorage for known cube types
        const name = (device.name || '').trim();
        const cacheKey = `cubestats_mac_${name}`;

        if (!mac) {
            mac = localStorage.getItem(cacheKey);
            if (mac) {
                console.log('[Bluetooth] MAC from localStorage:', mac);
            }
        }

        if (mac) {
            localStorage.setItem(cacheKey, mac);
        }

        // Get services and find matching driver
        const services = await gattServer.getPrimaryServices();
        const DriverClass = this.findDriver(device, services);

        if (!DriverClass) {
            console.log('[Bluetooth] No matching driver found, defaulting to Giiker');
            this.driver = new GiikerDriver();
            await this.driver.connect(device, '0000aadb-0000-1000-8000-00805f9b34fb', '0000aadc-0000-1000-8000-00805f9b34fb');
        } else {
            console.log('[Bluetooth] Using driver:', DriverClass.name);
            this.driver = new DriverClass();

            // Call connect with appropriate parameters based on driver type
            if (DriverClass.name === 'GAN') {
                const service = services.find(s => s.uuid.toLowerCase().includes('6e400001') || s.uuid.toLowerCase().includes('8653000a') || s.uuid.toLowerCase().includes('00000010'));
                const serviceUUID = service ? service.uuid : DriverClass.serviceUUIDs[0];
                const characteristics = await service.getCharacteristics();
                const notifyChar = characteristics.find(c => c.properties.notify);
                const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
                await this.driver.connect(device, serviceUUID, notifyChar?.uuid, writeChar?.uuid, mac);
            } else if (DriverClass.name === 'Qiyi') {
                await this.driver.connect(device, null, null, null, mac);
            } else if (DriverClass.name === 'Moyu') {
                const moyuService = services.find(s => s.uuid.toLowerCase().includes('0783b03e') || s.uuid.toLowerCase().includes('00001000'));
                const moyuServiceUUID = moyuService ? moyuService.uuid : DriverClass.serviceUUIDs[0];
                await this.driver.connect(device, moyuServiceUUID, null, null, mac);
            } else if (DriverClass.name === 'GoCube') {
                await this.driver.connect(device, '0000fff0-0000-1000-8000-00805f9b34fb', '0000fff1-0000-1000-8000-00805f9b34fb');
            } else {
                await this.driver.connect(device, DriverClass.serviceUUIDs[0], '0000aadc-0000-1000-8000-00805f9b34fb');
            }
        }

        // Set up callbacks
        this.driver.onMove = (moves) => {
            if (this.onMoveCallback) {
                this.onMoveCallback(moves);
            }
        };

        device.addEventListener('gattserverdisconnected', () => {
            if (this.onDisconnectCallback) {
                this.onDisconnectCallback();
            }
        });

        if (this.onConnectCallback) {
            this.onConnectCallback(device.name);
        }

        return this.driver;
    }

    disconnect() {
        if (this.driver) {
            this.driver.disconnect();
            this.driver = null;
        }
    }

    isConnected() {
        return this.driver !== null;
    }
}

// Export for global use
window.CubeDriver = CubeDriver;
window.GiikerDriver = GiikerDriver;
window.GanDriver = GanDriver;
window.GoCubeDriver = GoCubeDriver;
window.QiyiDriver = QiyiDriver;
window.MoyuDriver = MoyuDriver;
window.BluetoothManager = BluetoothManager;
