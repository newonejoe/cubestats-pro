// Bluetooth Manager - Coordinates between drivers and the app

import { CubeDriver, getDriverRegistry } from './driver.js';
import { GiikerDriver } from './giiker.js';
import { GanDriver } from './gan.js';
import { GoCubeDriver } from './gocube.js';
import { QiyiDriver } from './qiyi.js';
import { MoyuDriver } from './moyu.js';
import type { BluetoothDeviceEx, BluetoothAdvertisingEvent } from './types.js';

// Import drivers to register them
import './giiker.js';
import './gan.js';
import './gocube.js';
import './qiyi.js';
import './moyu.js';

export type MoveCallback = (moves: string[]) => void;
export type ConnectCallback = (name: string) => void;
export type DisconnectCallback = () => void;

export class BluetoothManager {
    driver: CubeDriver | null = null;
    onMoveCallback: MoveCallback | null = null;
    onConnectCallback: ConnectCallback | null = null;
    onDisconnectCallback: DisconnectCallback | null = null;

    constructor() {
        // Drivers are auto-registered when their modules are imported
    }

    setOnMove(callback: MoveCallback): void {
        this.onMoveCallback = callback;
    }

    setOnConnect(callback: ConnectCallback): void {
        this.onConnectCallback = callback;
    }

    setOnDisconnect(callback: DisconnectCallback): void {
        this.onDisconnectCallback = callback;
    }

    getAllCics(): number[] {
        const cics = new Set<number>();
        const registry = getDriverRegistry();
        for (const driver of registry) {
            if (driver.cics) {
                for (const cic of driver.cics) {
                    cics.add(cic);
                }
            }
        }
        return Array.from(cics);
    }

    getAllServiceUUIDs(): string[] {
        const services = new Set<string>();
        services.add('0000180a-0000-1000-8000-00805f9b34fb');
        const registry = getDriverRegistry();
        for (const driver of registry) {
            if (driver.serviceUUIDs) {
                for (const uuid of driver.serviceUUIDs) {
                    services.add(uuid);
                }
            }
        }
        return Array.from(services);
    }

    getScanFilters(): { namePrefix: string }[] {
        const filters: { namePrefix: string }[] = [];
        const registry = getDriverRegistry();
        for (const driver of registry) {
            if (driver.prefixes) {
                for (const prefix of driver.prefixes) {
                    filters.push({ namePrefix: prefix });
                }
            }
        }
        return filters;
    }

    findDriver(device: BluetoothDevice, services: BluetoothRemoteGATTService[]): typeof CubeDriver | null {
        const deviceName = (device.name || '').trim().toLowerCase();
        const serviceUUIDs = services ? services.map(s => s.uuid.toLowerCase()) : [];

        console.log('[Bluetooth] findDriver: deviceName =', deviceName);
        console.log('[Bluetooth] findDriver: serviceUUIDs =', serviceUUIDs);

        const registry = getDriverRegistry();

        for (const driver of registry) {
            if (driver.prefixes) {
                for (const prefix of driver.prefixes) {
                    const prefixLower = prefix.toLowerCase();
                    if (deviceName.startsWith(prefixLower)) {
                        console.log('[Bluetooth] findDriver: matched by name prefix', prefix, '->', driver.getName());
                        return driver;
                    }
                }
            }
        }

        for (const driver of registry) {
            if (driver.serviceUUIDs && serviceUUIDs.length > 0) {
                for (const suuid of driver.serviceUUIDs) {
                    if (serviceUUIDs.includes(suuid.toLowerCase())) {
                        console.log('[Bluetooth] findDriver: matched by service UUID', suuid, '->', driver.getName());
                        return driver;
                    }
                }
            }
        }
        return null;
    }

    async scan(): Promise<{ device: BluetoothDevice; mac: string | null }> {
        const allCics = this.getAllCics();
        const allServices = this.getAllServiceUUIDs();
        const filters = this.getScanFilters();

        console.log('[Bluetooth] Scanning with CICs:', allCics.map(c => '0x' + c.toString(16)).join(', '));

        const device = await navigator.bluetooth!.requestDevice({
            filters: filters,
            optionalServices: allServices,
            optionalManufacturerData: allCics
        });

        console.log('[Bluetooth] Selected:', device.name);

        let mac: string | null = null;
        const deviceName = device.name || '';

        const extDevice = device as unknown as BluetoothDeviceEx;
        if (extDevice.watchAdvertisements) {
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => resolve(), 10000);
                const onAdv = (event: BluetoothAdvertisingEvent) => {
                    const mfData = event.manufacturerData;

                    // Try to extract MAC from manufacturer data first
                    if (mfData) {
                        const registry = getDriverRegistry();
                        for (const driver of registry) {
                            if (driver.extractMacFromAdv) {
                                const extracted = driver.extractMacFromAdv(mfData, deviceName);
                                if (extracted) {
                                    mac = extracted;
                                    console.log('[Bluetooth] MAC from', driver.getName(), ':', mac);
                                    break;
                                }
                            }
                        }
                    }

                    // If no MAC from manufacturer data, try name-based extraction
                    if (!mac && deviceName) {
                        const registry = getDriverRegistry();
                        for (const driver of registry) {
                            if (driver.extractMacFromAdv) {
                                // Pass null manufacturerData to trigger name-only fallback
                                const extracted = driver.extractMacFromAdv(null, deviceName);
                                if (extracted) {
                                    mac = extracted;
                                    console.log('[Bluetooth] MAC from', driver.getName(), '(name fallback):', mac);
                                    break;
                                }
                            }
                        }
                    }

                    clearTimeout(timeout);
                    extDevice.removeEventListener('advertisementreceived', onAdv);
                    extDevice.stopWatchingAdvertisements?.();
                    resolve();
                };
                extDevice.addEventListener('advertisementreceived', onAdv);
                extDevice.watchAdvertisements?.();
            });
        }

        // Final fallback: try name-based extraction even if watchAdvertisements didn't work
        if (!mac && deviceName) {
            const registry = getDriverRegistry();
            for (const driver of registry) {
                if (driver.extractMacFromAdv) {
                    const extracted = driver.extractMacFromAdv(null, deviceName);
                    if (extracted) {
                        mac = extracted;
                        console.log('[Bluetooth] MAC from', driver.getName(), '(final name fallback):', mac);
                        break;
                    }
                }
            }
        }

        return { device, mac };
    }

    async connect(device: BluetoothDevice, mac: string | null): Promise<CubeDriver> {
        const gattServer = await device.gatt!.connect();

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
            } catch (e: any) {
                console.log('[Bluetooth] Could not get MAC from Device Info:', e.message);
            }
        }

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

        const services = await gattServer.getPrimaryServices();
        const DriverClass = this.findDriver(device, services);

        if (!DriverClass) {
            console.log('[Bluetooth] No matching driver found, defaulting to Giiker');
            this.driver = new GiikerDriver();
            await this.driver.connect(device, '0000aadb-0000-1000-8000-00805f9b34fb', '0000aadc-0000-1000-8000-00805f9b34fb');
        } else {
            console.log('[Bluetooth] Using driver:', DriverClass.getName());

            // Create instance based on driver name
            if (DriverClass.getName() === 'GAN') {
                this.driver = new GanDriver();
                const service = services.find(s =>
                    s.uuid.toLowerCase().includes('6e400001') ||
                    s.uuid.toLowerCase().includes('8653000a') ||
                    s.uuid.toLowerCase().includes('00000010')
                );
                const serviceUUID = service ? service.uuid : DriverClass.getServiceUUIDs()[0];
                const characteristics = await service!.getCharacteristics();
                const notifyChar = characteristics.find(c => c.properties.notify);
                const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
                await this.driver.connect(device, serviceUUID, notifyChar?.uuid || '', writeChar?.uuid, mac || undefined);
            } else if (DriverClass.getName() === 'Qiyi') {
                this.driver = new QiyiDriver();
                await this.driver.connect(device, '', '', '', mac || undefined);
            } else if (DriverClass.getName() === 'Moyu') {
                this.driver = new MoyuDriver();
                const moyuService = services.find(s =>
                    s.uuid.toLowerCase().includes('0783b03e') ||
                    s.uuid.toLowerCase().includes('00001000')
                );
                const moyuServiceUUID = moyuService ? moyuService.uuid : DriverClass.getServiceUUIDs()[0];
                await this.driver.connect(device, moyuServiceUUID, '', '', mac || undefined);
            } else if (DriverClass.getName() === 'GoCube') {
                this.driver = new GoCubeDriver();
                await this.driver.connect(device, '0000fff0-0000-1000-8000-00805f9b34fb', '0000fff1-0000-1000-8000-00805f9b34fb');
            } else {
                this.driver = new GiikerDriver();
                await this.driver.connect(device, DriverClass.getServiceUUIDs()[0], '0000aadc-0000-1000-8000-00805f9b34fb');
            }
        }

        this.driver.onMove = (moves: string[]) => {
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
            this.onConnectCallback(device.name || 'Unknown');
        }

        return this.driver;
    }

    disconnect(): void {
        if (this.driver) {
            this.driver.disconnect();
            this.driver = null;
        }
    }

    isConnected(): boolean {
        return this.driver !== null;
    }
}

export function initBluetoothManager(): BluetoothManager {
    const manager = new BluetoothManager();

    // Expose classes to window for backward compatibility
    window.BluetoothManager = BluetoothManager;
    window.CubeDriver = CubeDriver;
    window.GiikerDriver = GiikerDriver;
    window.GanDriver = GanDriver;
    window.GoCubeDriver = GoCubeDriver;
    window.QiyiDriver = QiyiDriver;
    window.MoyuDriver = MoyuDriver;

    return manager;
}
