import { CubeDriver } from './driver';
import type { CubeMove } from './cube-move';
import { getCubeCallbackService } from '../services/cube-callback.service';

export class KeyboardDriver extends CubeDriver {
    static override driverName = 'KeyboardSimulator';
    static override prefixes: string[] = ['Keyboard'];
    static override serviceUUIDs: string[] = [];
    static override cics: number[] = [];

    private boundOnKeyDown: (e: KeyboardEvent) => void;

    // Standard csTimer virtual cube keyboard mapping
    private keyMap: Record<string, string> = {
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

    constructor() {
        super();
        this.type = 'Keyboard';
        this.boundOnKeyDown = this.onKeyDown.bind(this);
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
