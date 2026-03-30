import { CubeDriver, registerDriver } from './driver';
import type { CubeMove } from './cube-move';
import { getCubeCallbackService } from '../services/cube-callback.service';

export class KeyboardDriver extends CubeDriver {
    static override driverName = 'KeyboardSimulator';
    static override prefixes: string[] = ['Keyboard'];
    static override serviceUUIDs: string[] = [];
    static override cics: number[] = [];

    // Standard csTimer virtual cube keyboard mapping
    static DEFAULT_MAPPING: Record<string, string> = {
        'j': 'U',
        'f': "U'",
        's': 'D',
        'l': "D'",
        'i': 'R',
        'k': "R'",
        'd': 'L',
        'e': "L'",
        'h': 'F',
        'g': "F'",
        'w': 'B',
        'o': "B'"
    };

    static getMapping(): Record<string, string> {
        try {
            const saved = localStorage.getItem('cubestats_keyboard_mapping');
            if (saved) {
                return { ...this.DEFAULT_MAPPING, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Failed to parse keyboard mapping', e);
        }
        return { ...this.DEFAULT_MAPPING };
    }

    static saveMapping(mapping: Record<string, string>): void {
        localStorage.setItem('cubestats_keyboard_mapping', JSON.stringify(mapping));
    }

    private boundOnKeyDown: (e: KeyboardEvent) => void;
    private keyMap: Record<string, string>;

    constructor() {
        super();
        this.type = 'Keyboard';
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.keyMap = KeyboardDriver.getMapping();
    }

    public reloadMapping(): void {
        this.keyMap = KeyboardDriver.getMapping();
    }

    override async connect(
        device: BluetoothDevice,
        serviceUUID: string,
        charUUID: string,
        writeCharUUID?: string,
        mac?: string
    ): Promise<this> {
        this.device = device;
        this.mac = mac || '00:00:00:00:00:00';
        
        // Listen to keyboard events
        window.addEventListener('keydown', this.boundOnKeyDown);
        
        return this;
    }

    private onKeyDown(e: KeyboardEvent): void {
        // Ignore if typing in input fields
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const key = e.key.toLowerCase();
        const move = this.keyMap[key];

        if (move) {
            const ts = performance.now();
            this.onMove([{
                notation: move,
                hwMs: ts
            }]);
        }
    }

    override disconnect(): void {
        window.removeEventListener('keydown', this.boundOnKeyDown);
        super.disconnect();
    }
}

registerDriver(KeyboardDriver);
