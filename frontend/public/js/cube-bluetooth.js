// CubeBluetooth.js - Modular Bluetooth cube drivers

// ============ BASE CUBE DRIVER ============

class CubeDriver {
    constructor() {
        this.device = null;
        this.gattServer = null;
        this.characteristic = null;
        this.writeCharacteristic = null;
        this.mac = null;
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

// ============ GAN CUBE DRIVER ============

class GanDriver extends CubeDriver {
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
        else this.protocolVersion = 1; // Assuming V1 or fallback
        
        // Initialize decoder
        this.initDecoder(mac, (this.device.name || '').startsWith('AiCube') ? 1 : 0);

        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        const characteristics = await service.getCharacteristics();

        this.characteristic = characteristics.find(c => c.properties.notify);
        this.writeCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        if (this.protocolVersion === 2) {
            console.log('[gancube] v2init start');
            console.log(`[gancube] v2init find chrcts ${this.characteristic},${this.writeCharacteristic}`);
            console.log('[gancube] v2init v2read start notifications');
        }

        await this.characteristic.startNotifications();
        
        if (this.protocolVersion === 2) {
            console.log('[gancube] v2init v2read notification started');
        }
        
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        // Initial requests if writing is supported
        if (this.writeCharacteristic) {
            // Give the cube a little time before requesting
            setTimeout(() => this.sendInitialRequests(), 100);
        }

        return this;
    }

    async sendInitialRequests() {
        try {
            if (this.protocolVersion === 2) {
                await this.sendV2Request(5); // HW info
                await this.sendV2Request(4); // Facelets
            } else if (this.protocolVersion === 3) {
                await this.sendV3Request(4); // HW info
                await this.sendV3Request(1); // Facelets
            } else if (this.protocolVersion === 4) {
                await this.sendV4Request([0xDF, 0x03]); // HW info
                await this.sendV4Request([0xDD, 0x04, 0, 0xED]); // Facelets
            }
        } catch (e) {
            console.log('[GAN] Initial request error:', e);
        }
    }

    async sendV2Request(opcode) {
        const req = new Array(20).fill(0);
        req[0] = opcode;
        const encoded = this.encode(req);
        console.log(`[gancube] v2sendRequest ${req.join(',')} ${encoded.join(',')}`);
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
        for(let i=0; i<reqBytes.length; i++) req[i] = reqBytes[i];
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
            
            for (let i = 0; i < 6; i++) {
                key[i] = (key[i] + macBytes[i]) % 255;
                iv[i] = (iv[i] + macBytes[i]) % 255;
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
            (key[0]<<24) | (key[1]<<16) | (key[2]<<8) | key[3],
            (key[4]<<24) | (key[5]<<16) | (key[6]<<8) | key[7],
            (key[8]<<24) | (key[9]<<16) | (key[10]<<8) | key[11],
            (key[12]<<24) | (key[13]<<16) | (key[14]<<8) | key[15]
        ], 16);
        const encrypted = CryptoJS.lib.WordArray.create([
            (block[0]<<24) | (block[1]<<16) | (block[2]<<8) | block[3],
            (block[4]<<24) | (block[5]<<16) | (block[6]<<8) | block[7],
            (block[8]<<24) | (block[9]<<16) | (block[10]<<8) | block[11],
            (block[12]<<24) | (block[13]<<16) | (block[14]<<8) | block[15]
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
            (key[0]<<24) | (key[1]<<16) | (key[2]<<8) | key[3],
            (key[4]<<24) | (key[5]<<16) | (key[6]<<8) | key[7],
            (key[8]<<24) | (key[9]<<16) | (key[10]<<8) | key[11],
            (key[12]<<24) | (key[13]<<16) | (key[14]<<8) | key[15]
        ], 16);
        const dataWord = CryptoJS.lib.WordArray.create([
            (block[0]<<24) | (block[1]<<16) | (block[2]<<8) | block[3],
            (block[4]<<24) | (block[5]<<16) | (block[6]<<8) | block[7],
            (block[8]<<24) | (block[9]<<16) | (block[10]<<8) | block[11],
            (block[12]<<24) | (block[13]<<16) | (block[14]<<8) | block[15]
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
        
        // Convert to binary string
        let bin = '';
        for (let i = 0; i < decrypted.length; i++) {
            // Add 256 then toString(2) and slice(1) to safely pad to 8 bits like cstimer
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
        
        if (mode === 2) { // cube move
            const nowIso = new Date().toISOString();
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
                    movesToEmit.unshift(moveStr); // Invalid moves might be >= 12
                    timeOffsToEmit.unshift(timeOffs);
                }
            }
            
            for (let i = 0; i < movesToEmit.length; i++) {
                const move = movesToEmit[i];
                const timeOffs = timeOffsToEmit[i];
                const logIso = new Date().toISOString();
                console.log(`[${logIso}] [gancube] move ${move}  ${timeOffs}`);
                this.onMove([move]);
            }
            
            this.prevMoveCnt = moveCnt;
        } else if (mode === 4) { // facelets
            this.prevMoveCnt = parseInt(bin.slice(4, 12), 2);
            console.log('[GAN V2] Facelets received, moveCnt:', this.prevMoveCnt);
            
            // Parse facelets state
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
            
            console.log('[gancube] v2 facelets event state parsed');
            
            // Check if it's solved (ca: 0..7, ea: 0,2,4,6,8,10,12,14,16,18,20,22)
            let isSolved = true;
            for (let i = 0; i < 8; i++) {
                if (ca[i] !== i) isSolved = false;
            }
            for (let i = 0; i < 12; i++) {
                if (ea[i] !== i * 2) isSolved = false;
            }
            
            if (isSolved) {
                console.log('[gancube] init cube state - Cube is solved');
                if (window.resetBtCube) {
                    window.resetBtCube();
                }
            } else {
                console.log('[gancube] init cube state - Cube is NOT solved, ca:', ca, 'ea:', ea);
                // Map the corners and edges to sticker colors
                if (window.initBtCubeFromState) {
                    window.initBtCubeFromState(ca, ea);
                }
            }
            
            // Replicate cstimer: send battery request after facelets
            console.log('[gancube] v2sendRequest 9 (battery)');
            this.sendV2Request(9);
        } else if (mode === 5) { // hardware info
            console.log(`[gancube] v2 received hardware info event`);
            const hardwareVersion = parseInt(bin.slice(8, 16), 2) + "." + parseInt(bin.slice(16, 24), 2);
            const softwareVersion = parseInt(bin.slice(24, 32), 2) + "." + parseInt(bin.slice(32, 40), 2);
            let devName = '';
            for (let i = 0; i < 8; i++) {
                const charCode = parseInt(bin.slice(40 + i * 8, 48 + i * 8), 2);
                if (charCode > 0) {
                    devName += String.fromCharCode(charCode);
                }
            }
            const gyroEnabled = 1 === parseInt(bin.slice(104, 105), 2);
            console.log('[gancube] Hardware Version:', hardwareVersion);
            console.log('[gancube] Software Version:', softwareVersion);
            console.log('[gancube] Device Name:', devName);
            console.log('[gancube] Gyro Enabled:', gyroEnabled);
        } else if (mode === 9) { // battery
            const batteryLevel = parseInt(bin.slice(8, 16), 2);
            console.log('[gancube] v2 received battery event, level:', batteryLevel);
        }
    }

    parseV3Data(bin) {
        const magic = parseInt(bin.slice(0, 8), 2);
        const mode = parseInt(bin.slice(8, 16), 2);
        
        if (magic !== 0x55) return;
        
        if (mode === 1) { // move
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
        } else if (mode === 2) { // facelets
            this.prevMoveCnt = parseInt(bin.slice(32, 40) + bin.slice(24, 32), 2);
            console.log('[GAN V3] Facelets received, moveCnt:', this.prevMoveCnt);
        }
    }

    parseV4Data(bin) {
        const mode = parseInt(bin.slice(0, 8), 2);
        
        if (mode === 0x01) { // move
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
        } else if (mode === 0xED) { // facelets
            this.prevMoveCnt = parseInt(bin.slice(24, 32) + bin.slice(16, 24), 2);
            console.log('[GAN V4] Facelets received, moveCnt:', this.prevMoveCnt);
        }
    }
}

// ============ GOCUBE DRIVER ============

class GoCubeDriver extends CubeDriver {
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
        // GoCube protocol parsing would go here
    }
}

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

    async scan() {
        const ALL_SERVICES = [
            '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
            '0000aadb-0000-1000-8000-00805f9b34fb',
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '6e400001-b5a3-f393-e0a9-e50e24dc4179',
            '8653000a-43e6-47b7-9cb0-5fc21d4ae340',
            '00000010-0000-fff7-fff6-fff5fff4fff0'
        ];

        const filters = [
            { namePrefix: 'Giiker' },
            { namePrefix: 'Mi Smart' },
            { namePrefix: 'GAN' },
            { namePrefix: 'GoCube' },
            { namePrefix: 'Rubik' },
            { namePrefix: 'MG' },
            { namePrefix: 'AiCube' }
        ];

        const device = await navigator.bluetooth.requestDevice({
            filters: filters,
            optionalServices: ALL_SERVICES,
            optionalManufacturerData: Array.from({length: 256}, (_, i) => (i << 8) | 0x01)
        });

        console.log('[Bluetooth] Selected:', device.name);

        // Try to get MAC
        let mac = null;
        if (device.watchAdvertisements) {
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(), 5000);
                device.addEventListener('advertisementreceived', (event) => {
                    for (const [id, data] of event.manufacturerData || []) {
                        const dv = new DataView(data.buffer);
                        if (dv.byteLength >= 6) {
                            mac = [];
                            for (let i = 6; i >= 1; i--) {
                                mac.push(dv.getUint8(dv.byteLength - i).toString(16).padStart(2, '0'));
                            }
                            mac = mac.join(':');
                            console.log('[Bluetooth] MAC:', mac);
                        }
                    }
                    clearTimeout(timeout);
                    device.stopWatchingAdvertisements?.();
                    resolve();
                });
                device.watchAdvertisements();
            });
        }

        return { device, mac };
    }

    async connect(device, mac) {
        const gattServer = await device.gatt.connect();
        
        // Improve MAC address extraction: Try to get MAC from Device Information Service if missing
        if (!mac) {
            try {
                const dis = await gattServer.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb');
                if (dis) {
                    const chars = await dis.getCharacteristics();
                    for (const char of chars) {
                        const uuid = char.uuid.toLowerCase();
                        if (uuid.includes('2a25') || uuid.includes('2a27')) { // Serial Number or Hardware Revision
                            const value = await char.readValue();
                            const str = new TextDecoder().decode(value);
                            if (str.match(/^[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}:[0-9a-fA-F]{2}$/)) {
                                mac = str.toLowerCase();
                                console.log('[Bluetooth] MAC retrieved from Device Info:', mac);
                                break;
                            }
                        }
                    }
                }
            } catch(e) {
                console.log('[Bluetooth] Could not get MAC from Device Info:', e.message);
            }
        }
        
        // If still no MAC for GAN cube, we may need to prompt the user
        const name = device.name || '';
        const cacheKey = `cubestats_mac_${device.id}`;
        
        if (!mac && (name.startsWith('GAN') || name.startsWith('MG') || name.startsWith('AiCube'))) {
            // Try to get from localStorage
            mac = localStorage.getItem(cacheKey) || localStorage.getItem('cubestats_mac_last');
            if (mac) {
                console.log('[Bluetooth] MAC retrieved from localStorage:', mac);
            } else {
                const userMac = prompt(`Could not automatically detect cube MAC address needed for decryption. Please enter it for ${name} (format XX:XX:XX:XX:XX:XX):`);
                if (userMac) {
                    mac = userMac.toLowerCase();
                    console.log('[Bluetooth] MAC provided by user:', mac);
                }
            }
        }
        
        if (mac) {
            localStorage.setItem(cacheKey, mac);
            localStorage.setItem('cubestats_mac_last', mac);
        }

        const services = await gattServer.getPrimaryServices();

        // Detect cube type and create appropriate driver
        let service = null;
        let serviceUUID = null;
        const targetServices = [
            '0000aadb-0000-1000-8000-00805f9b34fb',
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '6e400001-b5a3-f393-e0a9-e50e24dc4179',
            '8653000a-43e6-47b7-9cb0-5fc21d4ae340',
            '00000010-0000-fff7-fff6-fff5fff4fff0'
        ];
        
        for (const s of services) {
            const uuid = s.uuid.toLowerCase();
            if (targetServices.includes(uuid)) {
                service = s;
                serviceUUID = uuid;
                break;
            }
        }
        
        if (!service) {
            service = services[0];
            serviceUUID = service.uuid.toLowerCase();
        }

        console.log('[Bluetooth] Service:', serviceUUID);

        if (name.startsWith('GAN') || name.startsWith('MG') || name.startsWith('AiCube')) {
            // GAN cube - detect version
            if (serviceUUID.includes('6e400001')) {
                // V2
                const characteristics = await service.getCharacteristics();
                const notifyChar = characteristics.find(c => c.properties.notify);
                const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

                this.driver = new GanDriver();
                await this.driver.connect(device, serviceUUID, notifyChar.uuid, writeChar?.uuid, mac);
            } else if (serviceUUID.includes('8653000a')) {
                // V3
                this.driver = new GanDriver();
                this.driver.protocolVersion = 3;
                const characteristics = await service.getCharacteristics();
                await this.driver.connect(device, serviceUUID, characteristics.find(c => c.properties.notify)?.uuid, null, mac);
            } else {
                // V1 or V4
                this.driver = new GanDriver();
                const characteristics = await service.getCharacteristics();
                await this.driver.connect(device, serviceUUID, characteristics.find(c => c.properties.notify)?.uuid, null, mac);
            }
        } else if (name.startsWith('GoCube')) {
            this.driver = new GoCubeDriver();
            await this.driver.connect(device, serviceUUID, '0000fff1-0000-1000-8000-00805f9b34fb');
        } else {
            // Default to Giiker
            this.driver = new GiikerDriver();
            await this.driver.connect(device, serviceUUID, '0000aadc-0000-1000-8000-00805f9b34fb');
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
window.BluetoothManager = BluetoothManager;
