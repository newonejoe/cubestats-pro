// Qiyi Cube Driver

import { CubeDriver, registerDriver } from './driver.js';

declare const CryptoJS: any;
declare const LZString: any;

export class QiyiDriver extends CubeDriver {
    static name = 'Qiyi';
    static prefixes = ['QY-QYSC', 'XMD-TornadoV4-i'];
    static serviceUUIDs = ['0000fff0-0000-1000-8000-00805f9b34fb'];
    static cics = [0x0504];
    static QIYI_KEYS = ['NoDg7ANAjGkEwBYCc0xQnADAVgkzGAzHNAGyRTanQi5QIFyHrjQMQgsC6QA'];

    decoder: number[] | null = null;
    lastTs: number = 0;

    constructor() {
        super();
        this.type = 'qiyi';
    }

    static extractMacFromAdv(manufacturerData: Map<number, DataView> | null, deviceName: string | null): string | null {
        if (!manufacturerData) return null;
        for (const [cid, data] of manufacturerData.entries()) {
            if (cid === 0x0504) {
                const dv = data instanceof DataView ? data : new DataView(data.buffer);
                if (dv.byteLength >= 6) {
                    const mac: string[] = [];
                    for (let i = 5; i >= 0; i--) {
                        mac.push((dv.getUint8(i) + 0x100).toString(16).slice(1));
                    }
                    return mac.join(':');
                }
            }
        }
        // Fallback from device name
        if (/^(QY-QYSC|XMD-TornadoV4-i)-.-[0-9A-F]{4}$/.test(deviceName || '')) {
            return 'CC:A3:00:00:' + deviceName!.slice(-4, -2) + ':' + deviceName!.slice(-2);
        }
        return null;
    }

    crc16modbus(data: number[]): number {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x1) ? (crc >> 1) ^ 0xa001 : crc >> 1;
            }
        }
        return crc;
    }

    aesEncryptBlock(block: number[]): number[] {
        const key = this.decoder!;
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
        const key = this.decoder!;
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

    async sendMessage(content: number[]): Promise<void> {
        if (!this.characteristic) return;
        const msg = [0xfe, 4 + content.length];
        for (let i = 0; i < content.length; i++) msg.push(content[i]);
        const crc = this.crc16modbus(msg);
        msg.push(crc & 0xff, crc >> 8);
        const npad = (16 - msg.length % 16) % 16;
        for (let i = 0; i < npad; i++) msg.push(0);
        const encMsg: number[] = [];
        for (let i = 0; i < msg.length; i += 16) {
            const block = msg.slice(i, i + 16);
            const encrypted = this.aesEncryptBlock(block);
            for (let j = 0; j < 16; j++) encMsg[i + j] = encrypted[j];
        }
        console.log('[Qiyi] send message', msg.slice(0, 20).join(','));
        await this.characteristic.writeValue(new Uint8Array(encMsg).buffer);
    }

    async sendHello(mac: string): Promise<void> {
        if (!mac) throw new Error('empty mac');
        const content = [0x00, 0x6b, 0x01, 0x00, 0x00, 0x22, 0x06, 0x00, 0x02, 0x08, 0x00];
        for (let i = 5; i >= 0; i--) {
            content.push(parseInt(mac.slice(i * 3, i * 3 + 2), 16));
        }
        await this.sendMessage(content);
    }

    async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUuid: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;
        this.mac = mac || null;
        if (!this.mac) {
            throw new Error('Qiyi cube requires MAC from advertisement');
        }
        this.initDecoder();
        this.gattServer = await device.gatt.connect();
        const service = await this.gattServer.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        this.characteristic = await service.getCharacteristic('0000fff6-0000-1000-8000-00805f9b34fb');
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.onData.bind(this));
        await this.sendHello(this.mac);
        console.log('[Qiyi] Connected and hello sent');
        return this;
    }

    initDecoder(): void {
        try {
            const key = JSON.parse(LZString.decompressFromEncodedURIComponent(QiyiDriver.QIYI_KEYS[0]));
            this.decoder = key;
            console.log('[Qiyi] AES decoder initialized');
        } catch (e) {
            console.log('[Qiyi] Decoder init error:', e);
        }
    }

    parseData(bytes: Uint8Array): void {
        const encMsg = Array.from(bytes);
        if (!this.decoder) return;
        const msg: number[] = [];
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

    parseCubeData(msg: number[]): void {
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
