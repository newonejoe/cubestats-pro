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
        this.lastData = null;
        this.decoder = null;
        this.protocolVersion = 2; // Default to V2
    }

    async connect(device, serviceUUID, charUUID, writeCharUUID, mac) {
        this.device = device;
        this.mac = mac;
        this.gattServer = await device.gatt.connect();

        const service = await this.gattServer.getPrimaryService(serviceUUID);
        const characteristics = await service.getCharacteristics();

        this.characteristic = characteristics.find(c => c.properties.notify);
        this.writeCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));

        // Send initial request
        if (this.writeCharacteristic) {
            await this.sendInitialRequest();
        }

        return this;
    }

    async sendInitialRequest() {
        if (!this.writeCharacteristic) return;

        // Request facelets (opcode 4) - 20 bytes
        const req = new Uint8Array(20);
        req[0] = 4;
        await this.writeCharacteristic.writeValue(req.buffer);
        console.log('[GAN] Initial request sent');
    }

    decrypt(data) {
        if (!this.mac || data.length < 16) return Promise.resolve(data);

        // GAN V2/V3 keys
        const GAN_KEYS = [
            "NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
            "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA"
        ];

        try {
            const macBytes = this.mac.split(':').map(p => parseInt(p, 16));
            const keyArr = JSON.parse(LZString.decompressFromEncodedURIComponent(GAN_KEYS[0]));
            const ivArr = JSON.parse(LZString.decompressFromEncodedURIComponent(GAN_KEYS[1]));

            // Apply MAC salt
            for (let i = 0; i < 6; i++) {
                keyArr[i] = (keyArr[i] + macBytes[5 - i]) % 255;
                ivArr[i] = (ivArr[i] + macBytes[5 - i]) % 255;
            }

            // Use Web Crypto API
            return crypto.subtle.importKey('raw', new Uint8Array(keyArr), { name: 'AES-CBC', length: 128 }, false, ['decrypt'])
                .then(key => {
                    // Pad data to 16 bytes
                    const paddedData = new Uint8Array(16);
                    paddedData.set(data.slice(0, 16));
                    return crypto.subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(ivArr) }, key, paddedData);
                })
                .then(decrypted => new Uint8Array(decrypted))
                .catch(e => {
                    console.log('[GAN] Decryption failed:', e.message);
                    return data;
                });
        } catch (e) {
            console.log('[GAN] Decryption setup error:', e);
            return Promise.resolve(data);
        }
    }

    async parseData(bytes) {
        console.log('[GAN] Raw data:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

        const decrypted = await this.decrypt(Array.from(bytes));
        console.log('[GAN] Decrypted:', Array.from(decrypted).map(b => b.toString(16).padStart(2, '0')).join(' '));

        // Check for valid GAN protocol
        const firstByte = decrypted[0];
        const validProtocols = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x10, 0x16, 0x55, 0xED, 0xD1, 0xEF, 0xEC];

        if (validProtocols.includes(firstByte) || (firstByte >= 0xF5 && firstByte <= 0xFF)) {
            this.parseGanProtocol(decrypted);
            return;
        }

        // Fallback: detect moves from encrypted data changes
        this.detectMoveFromEncrypted(bytes);
    }

    parseGanProtocol(bytes) {
        const protocolType = bytes[0];
        console.log('[GAN] Protocol type:', '0x' + protocolType.toString(16));

        if (protocolType === 0x01) {
            // Move event
            const moveCnt = bytes[2];
            const axis = bytes[4];
            const direction = bytes[5];
            const faces = 'URFDLB';
            const modifiers = " 2'";

            if (axis < 6) {
                const move = faces[axis] + modifiers[direction];
                console.log('[GAN] Move:', move);
                this.onMove([move]);
            }
        }
    }

    detectMoveFromEncrypted(bytes) {
        console.log('[GAN] detectMoveFromEncrypted called');
        if (!this.lastData) {
            console.log('[GAN] First data, storing');
            this.lastData = Array.from(bytes);
            return;
        }

        let diffCount = 0;
        for (let i = 0; i < bytes.length && i < this.lastData.length; i++) {
            if (bytes[i] !== this.lastData[i]) diffCount++;
        }

        console.log('[GAN] Diff count:', diffCount, 'lastDiff:', this.lastDiffCount);

        // Check if this is a new move (different from last change pattern)
        if (diffCount > 0 && diffCount < 15) {
            // Only trigger if we haven't just triggered (debounce)
            if (!this.justTriggered) {
                console.log('[GAN] MOVE DETECTED! Calling onMove');
                this.justTriggered = true;
                setTimeout(() => { this.justTriggered = false; }, 500);
                this.onMove(['?']);
            } else {
                console.log('[GAN] Debounced');
            }
        }

        this.lastDiffCount = diffCount;
        this.lastData = Array.from(bytes);
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
        const services = await gattServer.getPrimaryServices();

        // Detect cube type and create appropriate driver
        const serviceUUID = services[0].uuid.toLowerCase();
        console.log('[Bluetooth] Service:', serviceUUID);

        const name = device.name || '';

        if (name.startsWith('GAN') || name.startsWith('MG') || name.startsWith('AiCube')) {
            // GAN cube - detect version
            if (serviceUUID.includes('6e400001')) {
                // V2
                const characteristics = await services[0].getCharacteristics();
                const notifyChar = characteristics.find(c => c.properties.notify);
                const writeChar = characteristics.find(c => c.properties.write);

                this.driver = new GanDriver();
                await this.driver.connect(device, serviceUUID, notifyChar.uuid, writeChar?.uuid, mac);
            } else if (serviceUUID.includes('8653000a')) {
                // V3
                this.driver = new GanDriver();
                this.driver.protocolVersion = 3;
                const characteristics = await services[0].getCharacteristics();
                await this.driver.connect(device, serviceUUID, characteristics.find(c => c.properties.notify)?.uuid, null, mac);
            } else {
                // V1 or V4
                this.driver = new GanDriver();
                const characteristics = await services[0].getCharacteristics();
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
