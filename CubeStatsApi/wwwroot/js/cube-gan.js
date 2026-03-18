// GAN Cube Driver - Based on cstimer implementation
// Supports GAN V1, V2, V3, V4, V5 cubes

class GanDriver {
    constructor() {
        this.device = null;
        this.gattServer = null;
        this.readChar = null;
        this.writeChar = null;
        this.mac = null;
        this.decoder = null;
        this.type = 'gan';
        this.onMoveCallback = null;
        this.onConnectCallback = null;
        this.onStateCallback = null;
        this.moveBuffer = [];
        this.prevMoveCnt = -1;
        this.initComplete = false;
    }

    setOnMove(callback) { this.onMoveCallback = callback; }
    setOnConnect(callback) { this.onConnectCallback = callback; }
    setOnState(callback) { this.onStateCallback = callback; }

    // GAN UUIDs
    static get SERVICE_UUID_V2() { return '6e400001-b5a3-f393-e0a9-e50e24dc4179'; }
    static get CHAR_UUID_V2_READ() { return '28be4cb6-cd67-11e9-a32f-2a2ae2dbcce4'; }
    static get CHAR_UUID_V2_WRITE() { return '28be4a4a-cd67-11e9-a32f-2a2ae2dbcce4'; }

    static get SERVICE_UUID_V3() { return '8653000a-43e6-47b7-9cb0-5fc21d4ae340'; }
    static get CHAR_UUID_V3_READ() { return '8653000b-43e6-47b7-9cb0-5fc21d4ae340'; }
    static get CHAR_UUID_V3_WRITE() { return '8653000c-43e6-47b7-9cb0-5fc21d4ae340'; }

    // Keys from cstimer
    static get KEYS() {
        return [
            ["NoRgnAHANATADDWJYwMxQOxiiEcfYgSK6Hpr4TYCs0IG1OEAbDszALpA", "NoNg7ANATFIQnARmogLBRUCs0oAYN8U5J45EQBmFADg0oJAOSlUQF0g"], // V1
            ["NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g", "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA"], // V2
            ["NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA", "NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA"] // V3/V4
        ];
    }

    async connect(device, mac) {
        this.device = device;
        this.mac = mac;
        console.log('[GAN] Connecting with MAC:', mac);

        // Connect to GATT
        this.gattServer = await device.gatt.connect();

        // Find the correct service (V2 or V3)
        const services = await this.gattServer.getPrimaryServices();
        let service = null;

        for (const s of services) {
            const uuid = s.uuid.toLowerCase();
            if (uuid.includes('6e400001')) {
                service = s;
                console.log('[GAN] Using V2 service');
                break;
            } else if (uuid.includes('8653000a')) {
                service = s;
                console.log('[GAN] Using V3 service');
                break;
            }
        }

        if (!service) {
            throw new Error('GAN service not found');
        }

        // Find characteristics
        const characteristics = await service.getCharacteristics();
        this.readChar = characteristics.find(c => c.properties.notify);
        this.writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        if (!this.readChar || !this.writeChar) {
            throw new Error('GAN characteristics not found');
        }

        console.log('[GAN] Read char:', this.readChar.uuid);
        console.log('[GAN] Write char:', this.writeChar.uuid);

        // Initialize decoder with MAC
        this.initDecoder(mac);

        // Start notifications
        await this.readChar.startNotifications();
        this.readChar.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        // Request initial data
        await this.requestHardwareInfo();
        await this.requestFacelets();

        if (this.onConnectCallback) {
            this.onConnectCallback(device.name);
        }

        return this;
    }

    initDecoder(mac) {
        if (!mac) return;

        const macBytes = mac.split(':').map(p => parseInt(p, 16));

        // Use V2 keys (most common)
        const keyStr = GanDriver.KEYS[1][0];
        const ivStr = GanDriver.KEYS[1][1];

        const key = JSON.parse(LZString.decompressFromEncodedURIComponent(keyStr));
        const iv = JSON.parse(LZString.decompressFromEncodedURIComponent(ivStr));

        // Apply MAC salt
        for (let i = 0; i < 6; i++) {
            key[i] = (key[i] + macBytes[5 - i]) % 255;
            iv[i] = (iv[i] + macBytes[5 - i]) % 255;
        }

        this.decoder = { key, iv };
        console.log('[GAN] Decoder initialized with MAC:', mac);
    }

    async requestHardwareInfo() {
        // Opcode 5 for hardware info
        await this.sendCommand([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }

    async requestFacelets() {
        // Opcode 4 for facelets
        await this.sendCommand([4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    }

    async sendCommand(data) {
        if (!this.writeChar) return;

        const encoded = this.encode(data);
        await this.writeChar.writeValue(new Uint8Array(encoded).buffer);
    }

    // Encode command - XOR + AES as per cstimer
    encode(data) {
        if (!this.decoder) return data;

        const { key, iv } = this.decoder;
        const ret = data.slice();

        // XOR first 16 bytes with IV
        for (let i = 0; i < 16; i++) {
            ret[i] ^= iv[i];
        }

        // AES encrypt (using CryptoJS)
        try {
            const keyWord = CryptoJS.lib.WordArray.create(key, 16);

            // First block
            const words = [];
            for (let i = 0; i < 16; i += 4) {
                let word = 0;
                for (let j = 0; j < 4; j++) {
                    word |= ret[i + j] << (j * 8);
                }
                words.push(word);
            }

            const encrypted = CryptoJS.lib.WordArray.create(words, 16);
            const cipher = CryptoJS.AES.encrypt(encrypted, keyWord, {
                padding: CryptoJS.pad.NoPadding,
                mode: CryptoJS.mode.ECB
            });

            const ct = cipher.ciphertext.words;
            for (let i = 0; i < 16; i++) {
                const wordIdx = Math.floor(i / 4);
                const byteIdx = 3 - (i % 4);
                ret[i] = (ct[wordIdx] >> (byteIdx * 8)) & 0xFF;
            }
        } catch (e) {
            console.log('[GAN] Encode error:', e);
        }

        return ret;
    }

    // Decode response - AES decrypt + XOR as per cstimer
    decode(data) {
        if (!this.decoder) return data;

        const { key, iv } = this.decoder;
        const ret = data.slice();

        try {
            const keyWord = CryptoJS.lib.WordArray.create(key, 16);

            // Last block first if > 16
            if (ret.length > 16) {
                const offset = ret.length - 16;
                const wordsLast = [];
                for (let i = 0; i < 16; i += 4) {
                    let word = 0;
                    for (let j = 0; j < 4; j++) {
                        word |= ret[offset + i + j] << (j * 8);
                    }
                    wordsLast.push(word);
                }

                const encrypted = CryptoJS.lib.WordArray.create(wordsLast, 16);
                const decrypted = CryptoJS.AES.decrypt(encrypted, keyWord, {
                    padding: CryptoJS.pad.NoPadding,
                    mode: CryptoJS.mode.ECB
                });

                const dw = decrypted.words;
                for (let i = 0; i < 16; i++) {
                    const wordIdx = Math.floor(i / 4);
                    const byteIdx = 3 - (i % 4);
                    ret[offset + i] = ((dw[wordIdx] >> (byteIdx * 8)) & 0xFF) ^ iv[i];
                }
            }

            // First block
            const wordsFirst = [];
            for (let i = 0; i < 16; i += 4) {
                let word = 0;
                for (let j = 0; j < 4; j++) {
                    word |= ret[i + j] << (j * 8);
                }
                wordsFirst.push(word);
            }

            const encryptedFirst = CryptoJS.lib.WordArray.create(wordsFirst, 16);
            const decryptedFirst = CryptoJS.AES.decrypt(encryptedFirst, keyWord, {
                padding: CryptoJS.pad.NoPadding,
                mode: CryptoJS.mode.ECB
            });

            const dfw = decryptedFirst.words;
            for (let i = 0; i < 16 && i < ret.length; i++) {
                const wordIdx = Math.floor(i / 4);
                const byteIdx = 3 - (i % 4);
                ret[i] = ((dfw[wordIdx] >> (byteIdx * 8)) & 0xFF) ^ iv[i];
            }
        } catch (e) {
            console.log('[GAN] Decode error:', e);
        }

        return ret;
    }

    onData(event) {
        const bytes = new Uint8Array(event.target.value.buffer);
        console.log('[GAN] Raw data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

        const decoded = this.decode(bytes);
        console.log('[GAN] Decoded:', Array.from(decoded).map(b => b.toString(16).padStart(2, '0')).join(' '));

        this.parseResponse(decoded);
    }

    parseResponse(data) {
        if (data.length < 2) return;

        // Get mode from first 4 bits
        const mode = (data[0] >> 4) & 0x0F;
        console.log('[GAN] Mode:', mode);

        // Convert to binary string for parsing
        let binaryStr = '';
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            binaryStr += data[i].toString(2).padStart(8, '0');
        }

        if (mode === 2) {
            // Move event
            const moveCnt = parseInt(binaryStr.slice(4, 12), 2);
            const axis = parseInt(binaryStr.slice(12, 15), 2);
            const direction = parseInt(binaryStr.slice(15, 16), 2);

            console.log('[GAN] Move - axis:', axis, 'dir:', direction, 'count:', moveCnt);

            if (moveCnt !== this.prevMoveCnt && this.prevMoveCnt !== -1) {
                const faces = 'URFDLB';
                const modifiers = " 2'";
                const move = faces[axis] + modifiers[direction];
                console.log('[GAN] Move:', move);

                if (this.onMoveCallback) {
                    this.onMoveCallback([move]);
                }
            }
            this.prevMoveCnt = moveCnt;
        } else if (mode === 4) {
            // Facelets state
            console.log('[GAN] Facelets state received');
            if (this.onStateCallback) {
                this.onStateCallback({ type: 'facelets', data: data });
            }
        } else if (mode === 5) {
            // Hardware info
            const hwVersion = parseInt(binaryStr.slice(8, 16), 2);
            const swVersion = parseInt(binaryStr.slice(16, 24), 2);
            let devName = '';
            for (let i = 0; i < 8; i++) {
                devName += String.fromCharCode(parseInt(binaryStr.slice(40 + i * 8, 48 + i * 8), 2));
            }

            console.log('[GAN] Hardware Version:', hwVersion + '.' + (swVersion >> 4));
            console.log('[GAN] Software Version:', (swVersion >> 4) + '.' + (swVersion & 0x0F));
            console.log('[GAN] Device Name:', devName);

            if (this.onStateCallback) {
                this.onStateCallback({ type: 'hardware', data: { hwVersion, swVersion, devName } });
            }
        } else if (mode === 9) {
            // Battery
            const battery = parseInt(binaryStr.slice(8, 16), 2);
            console.log('[GAN] Battery:', battery);
        }
    }

    disconnect() {
        if (this.readChar) {
            this.readChar.removeEventListener('characteristicvaluechanged', this.onData);
        }
        if (this.gattServer && this.gattServer.connected) {
            this.gattServer.disconnect();
        }
    }
}

// Export for global use
window.GanDriver = GanDriver;
