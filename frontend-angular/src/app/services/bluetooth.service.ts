import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { StateService } from './state.service';
import { bluetoothManager, type MoveCallback, type ConnectCallback, type DisconnectCallback } from '../hardware';
import type { CubeMove } from '../hardware/cube-move';

// Web Bluetooth types
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface BluetoothRequestDeviceOptions {
    filters?: { namePrefix?: string }[];
    optionalServices?: string[];
    optionalManufacturerData?: number[];
  }

  interface BluetoothDevice {
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    watchAdvertisements?: () => void;
    stopWatchingAdvertisements?: () => void;
    addEventListener(event: string, callback: (event: any) => void): void;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
    connected: boolean;
  }

  interface BluetoothRemoteGATTService {
    uuid: string;
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    properties: {
      read?: boolean;
      write?: boolean;
      writeWithoutResponse?: boolean;
      notify?: boolean;
    };
    readValue(): Promise<DataView>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(event: string, callback: (event: any) => void): void;
    removeEventListener(event: string, callback: (event: any) => void): void;
    writeValue(value: ArrayBuffer): Promise<void>;
  }
}

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {
  private state = inject(StateService);

  // Signals
  readonly isScanning: WritableSignal<boolean> = signal<boolean>(false);
  readonly isConnecting: WritableSignal<boolean> = signal<boolean>(false);
  readonly lastError: WritableSignal<string | null> = signal<string | null>(null);

  // Callbacks (to be forwarded to the app)
  private onMoveCallback: MoveCallback | null = null;
  private onConnectCallback: ConnectCallback | null = null;
  private onDisconnectCallback: DisconnectCallback | null = null;

  // Current device info
  private deviceName: string | null = null;
  private lastMac: string | null = null;

  constructor() {
    this.setupManagerCallbacks();
  }

  private setupManagerCallbacks(): void {
    // Set up callbacks from the BluetoothManager
    bluetoothManager.setOnMove((moves: CubeMove[]) => {
      console.log('[BluetoothService] Moves received:', moves);
      if (this.onMoveCallback) {
        this.onMoveCallback(moves);
      }
    });

    bluetoothManager.setOnConnect((name: string, mac: string | null) => {
      console.log('[BluetoothService] Connected to:', name, 'MAC:', mac);
      this.deviceName = name;
      this.lastMac = mac;
      this.state.cubeConnected.set(true);
      this.isConnecting.set(false);
      if (this.onConnectCallback) {
        this.onConnectCallback(name, mac);
      }
    });

    bluetoothManager.setOnDisconnect(() => {
      console.log('[BluetoothService] Disconnected');
      this.deviceName = null;
      this.state.cubeConnected.set(false);
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    });
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

  async scan(): Promise<BluetoothDevice | null> {
    if (!navigator.bluetooth) {
      this.lastError.set('Web Bluetooth not supported');
      return null;
    }

    this.isScanning.set(true);
    this.lastError.set(null);

    try {
      console.log('[BluetoothService] Starting scan...');
      const result = await bluetoothManager.scan();
      this.lastMac = result.mac;  // Store MAC for connect
      console.log('[BluetoothService] Scanned device:', result.device.name, 'MAC:', result.mac);
      this.isScanning.set(false);
      return result.device;
    } catch (error: any) {
      this.isScanning.set(false);
      const errorMsg = error.message || 'Failed to scan';
      console.error('[BluetoothService] Scan error:', errorMsg);
      this.lastError.set(errorMsg);
      return null;
    }
  }

  async connect(device: BluetoothDevice): Promise<boolean> {
    if (!device.gatt) {
      this.lastError.set('GATT not supported on this device');
      return false;
    }

    this.isConnecting.set(true);
    this.lastError.set(null);

    try {
      console.log('[BluetoothService] Connecting to device:', device.name, 'with MAC:', this.lastMac);

      // Use the BluetoothManager to connect (it will find the right driver)
      await bluetoothManager.connect(device, this.lastMac);

      console.log('[BluetoothService] Connection established');
      return true;
    } catch (error: any) {
      this.isConnecting.set(false);
      const errorMsg = error.message || 'Failed to connect';
      console.error('[BluetoothService] Connection error:', errorMsg);
      this.lastError.set(errorMsg);
      return false;
    }
  }

  async connectWithMac(device: BluetoothDevice, mac: string): Promise<boolean> {
    if (!device.gatt) {
      this.lastError.set('GATT not supported on this device');
      return false;
    }

    this.isConnecting.set(true);
    this.lastError.set(null);

    try {
      console.log('[BluetoothService] Connecting to device:', device.name, 'with MAC:', mac);
      await bluetoothManager.connect(device, mac);
      return true;
    } catch (error: any) {
      this.isConnecting.set(false);
      const errorMsg = error.message || 'Failed to connect';
      console.error('[BluetoothService] Connection error:', errorMsg);
      this.lastError.set(errorMsg);
      return false;
    }
  }

  disconnect(): void {
    console.log('[BluetoothService] Disconnecting...');
    bluetoothManager.disconnect();
    this.deviceName = null;
    this.state.cubeConnected.set(false);
  }

  isConnected(): boolean {
    return bluetoothManager.isConnected();
  }

  getDeviceName(): string | null {
    return this.deviceName;
  }

  // Get connected device info (name and MAC)
  getConnectedDeviceInfo(): { name: string | null; mac: string | null } {
    return bluetoothManager.getConnectedDeviceInfo();
  }

  // Check if Web Bluetooth is available
  isSupported(): boolean {
    return !!navigator.bluetooth;
  }

  // Get last MAC address used
  getLastMac(): string | null {
    return this.lastMac;
  }
}
