import { Component, inject, signal, computed, type WritableSignal, type Signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BluetoothService } from '../../services/bluetooth.service';
import { StateService } from '../../services/state.service';

export interface CachedDevice {
  name: string;
  mac: string;
  type: string;
  lastConnected: number;
}

type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error' | 'prompt';

@Component({
  selector: 'app-bluetooth-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bluetooth-manager">
      <!-- Initial Prompt (cstimer-style popup) -->
      @if (connectionState() === 'prompt') {
        <div class="connect-prompt">
          <div class="prompt-icon">🧊</div>
          <h3 class="prompt-title">{{ t('connectYourCube') }}</h3>
          <p class="prompt-text">{{ t('promptDescription') }}</p>

          <!-- Quick connect to last device -->
          @if (cachedDevices().length > 0) {
            <div class="quick-connect">
              @for (device of cachedDevices(); track device.mac) {
                <button class="quick-connect-btn" (click)="quickConnect(device)">
                  <span class="device-icon">{{ getDeviceIcon(device.type) }}</span>
                  <span class="device-name">{{ device.name }}</span>
                </button>
              }
            </div>
          }

          <div class="prompt-actions-vertical">
            <button class="btn btn-primary btn-scan-prompt" (click)="startScan()">
              <span>📡</span> {{ t('scanForCubes') }}
            </button>
            <button class="btn btn-secondary" (click)="startKeyboardSimulator()">
              <span>⌨️</span> Keyboard Simulator
            </button>
            <button class="btn btn-secondary" (click)="skipPrompt()">
              {{ t('skip') }}
            </button>
          </div>
        </div>
      }

      <!-- Connected State -->
      @if (connectionState() === 'connected') {
        <div class="status-connected">
          <div class="status-header">
            <span class="status-dot connected"></span>
            <span class="status-text">{{ t('connected') }}</span>
          </div>
          <div class="device-info">
            <span class="device-icon">🧊</span>
            <span class="device-name">{{ deviceName() }}</span>
          </div>
          <button class="btn btn-secondary btn-disconnect" (click)="disconnect()">
            {{ t('disconnect') }}
          </button>
        </div>
      }

      <!-- Scanning State -->
      @if (connectionState() === 'scanning') {
        <div class="status-scanning">
          <div class="scanner">
            <div class="scanner-pulse"></div>
            <span class="scanner-icon">📡</span>
          </div>
          <span class="status-text">{{ t('scanning') }}</span>
          <button class="btn btn-secondary" (click)="stopScan()">
            {{ t('cancel') }}
          </button>
        </div>
      }

      <!-- Connecting State -->
      @if (connectionState() === 'connecting') {
        <div class="status-connecting">
          <div class="spinner"></div>
          <span class="status-text">{{ t('connecting') }} {{ connectingToDevice() }}</span>
        </div>
      }

      <!-- Disconnected State -->
      @if (connectionState() === 'disconnected') {
        <div class="status-disconnected">
          <div class="status-header">
            <span class="status-dot"></span>
            <span class="status-text">{{ t('disconnected') }}</span>
          </div>

          <!-- Device History -->
          @if (cachedDevices().length > 0) {
            <div class="device-history">
              <div class="history-header">{{ t('recentDevices') }}</div>
              @for (device of cachedDevices(); track device.mac) {
                <button class="device-item" (click)="connectToCachedDevice(device)">
                  <span class="device-icon">{{ getDeviceIcon(device.type) }}</span>
                  <div class="device-details">
                    <span class="device-name">{{ device.name }}</span>
                    <span class="device-mac">{{ device.mac }}</span>
                  </div>
                </button>
              }
            </div>
          }

          <div class="prompt-actions-vertical">
            <button class="btn btn-primary btn-scan" (click)="startScan()">
              <span>📡</span> {{ t('scanForCubes') }}
            </button>
            <button class="btn btn-secondary" (click)="startKeyboardSimulator()">
              <span>⌨️</span> Keyboard Simulator
            </button>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (connectionState() === 'error') {
        <div class="status-error">
          <span class="error-icon">⚠️</span>
          <span class="error-text">{{ errorMessage() }}</span>
          <button class="btn btn-primary" (click)="startScan()">
            {{ t('tryAgain') }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .bluetooth-manager {
      width: 100%;
    }

    /* Connect Prompt (cstimer-style) */
    .connect-prompt {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px;
      gap: 16px;
    }

    .prompt-icon {
      font-size: 48px;
    }

    .prompt-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }

    .prompt-text {
      font-size: 14px;
      color: #666;
      margin: 0;
    }

    .prompt-actions-vertical {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .prompt-actions-vertical .btn {
      width: 100%;
      justify-content: center;
    }

    .quick-connect {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      width: 100%;
    }

    .quick-connect-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 20px;
      font-size: 13px;
      color: #1976d2;
      cursor: pointer;
      transition: all 0.2s;
    }

    .quick-connect-btn:hover {
      background: #2196f3;
      color: white;
    }

    .prompt-actions {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .btn-scan-prompt {
      flex: 1;
    }

    .status-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #999;
    }

    .status-dot.connected {
      background: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    }

    .status-text {
      font-size: 14px;
      color: #666;
    }

    /* Connected State */
    .status-connected {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .device-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .device-icon {
      font-size: 24px;
    }

    .device-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .btn-disconnect {
      margin-top: 8px;
    }

    /* Scanning State */
    .status-scanning {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .scanner {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .scanner-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(0, 123, 255, 0.2);
      animation: pulse 1.5s ease-out infinite;
    }

    .scanner-icon {
      font-size: 28px;
      z-index: 1;
    }

    @keyframes pulse {
      0% {
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    /* Connecting State */
    .status-connecting {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #007bff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Disconnected State */
    .status-disconnected {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }

    .device-history {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }

    .history-header {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .device-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }

    .device-item:hover {
      background: #e9ecef;
      border-color: #dee2e6;
    }

    .device-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .device-details .device-name {
      font-size: 14px;
      font-weight: 500;
    }

    .device-mac {
      font-size: 11px;
      color: #999;
      font-family: monospace;
    }

    .btn-scan {
      width: 100%;
    }

    /* Error State */
    .status-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      text-align: center;
    }

    .error-icon {
      font-size: 32px;
    }

    .error-text {
      font-size: 14px;
      color: #dc3545;
    }

    /* Buttons */
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #e9ecef;
      color: #333;
    }

    .btn-secondary:hover {
      background: #dee2e6;
    }
  `]
})
export class BluetoothManagerComponent implements OnInit {
  private bluetooth = inject(BluetoothService);
  private state = inject(StateService);

  // Connection state
  connectionState: WritableSignal<ConnectionState> = signal<ConnectionState>('disconnected');
  deviceName: WritableSignal<string> = signal<string>('');
  connectingToDevice: WritableSignal<string> = signal<string>('');
  errorMessage: WritableSignal<string> = signal<string>('');
  cachedDevices: WritableSignal<CachedDevice[]> = signal<CachedDevice[]>([]);
  // Store pending device info for caching after connection
  private pendingDevice: { name: string; mac: string } | null = null;

  // Computed signals from BluetoothService
  isScanning: Signal<boolean> = computed(() => this.bluetooth.isScanning());
  isConnecting: Signal<boolean> = computed(() => this.bluetooth.isConnecting());
  cubeConnected: Signal<boolean> = computed(() => this.state.cubeConnected());

  private readonly STORAGE_KEY = 'cubestats_bt_devices';
  private readonly MAX_CACHED_DEVICES = 5;

  private translations: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    scanning: 'Scanning for cubes...',
    connecting: 'Connecting to',
    scanForCubes: 'Scan for Cubes',
    cancel: 'Cancel',
    disconnect: 'Disconnect',
    tryAgain: 'Try Again',
    recentDevices: 'Recent Devices',
    connectYourCube: 'Connect Your Cube',
    promptDescription: 'Connect your Bluetooth smart cube to start timing',
    skip: 'Skip'
  };

  ngOnInit(): void {
    this.loadCachedDevices();

    // Set up connect callback to cache device when connection succeeds
    this.bluetooth.setOnConnect((name: string, mac: string | null) => {
      console.log('[BluetoothManager] Connection callback, name:', name, 'mac:', mac);
      if (mac) {
        this.cacheDevice(name, mac);
      } else if (this.pendingDevice) {
        // Fallback to pending device info
        this.cacheDevice(this.pendingDevice.name, this.pendingDevice.mac);
        this.pendingDevice = null;
      }
    });

    // Check if already connected
    if (this.cubeConnected()) {
      this.connectionState.set('connected');
      this.deviceName.set(this.bluetooth.getDeviceName() || 'Smart Cube');
    } else {
      // Show prompt to get user gesture
      this.connectionState.set('prompt');
    }

    // Subscribe to state changes
    const checkState = () => {
      setTimeout(() => this.updateConnectionState(), 100);
    };

    // Poll for state changes
    const interval = setInterval(() => {
      if (this.connectionState() !== 'disconnected' && this.connectionState() !== 'prompt') {
        this.updateConnectionState();
      }
    }, 500);

    // Cleanup on destroy would be better but this is simple
    (window as any).__bluetoothManagerInterval = interval;
  }

  skipPrompt(): void {
    this.connectionState.set('disconnected');
  }

  quickConnect(device: CachedDevice): void {
    this.connectToCachedDevice(device);
  }

  private updateConnectionState(): void {
    if (this.cubeConnected()) {
      this.connectionState.set('connected');
      this.deviceName.set(this.bluetooth.getDeviceName() || 'Smart Cube');
    } else if (this.isConnecting()) {
      this.connectionState.set('connecting');
      this.connectingToDevice.set(this.bluetooth.getDeviceName() || '');
    } else if (this.isScanning()) {
      this.connectionState.set('scanning');
    } else if (this.bluetooth.lastError()) {
      this.connectionState.set('error');
      this.errorMessage.set(this.bluetooth.lastError() || 'Unknown error');
    } else {
      this.connectionState.set('disconnected');
    }
  }

  t(key: string): string {
    return this.translations[key] || key;
  }

  getDeviceIcon(type: string): string {
    const icons: Record<string, string> = {
      'GAN': '🧊',
      'Giiker': '🧊',
      'Qiyi': '🧊',
      'Moyu': '🧊',
      'GoCube': '🧊'
    };
    return icons[type] || '🧊';
  }

  async startScan(): Promise<void> {
    this.connectionState.set('scanning');
    this.errorMessage.set('');

    const device = await this.bluetooth.scan();
    if (device) {
      // Get MAC and store pending device info for callback
      const mac = this.bluetooth.getLastMac() || '';
      this.pendingDevice = {
        name: device.name || 'Smart Cube',
        mac: mac
      };

      this.connectingToDevice.set(device.name || 'Smart Cube');
      this.connectionState.set('connecting');

      // Connection will be handled by callback - don't call cacheDevice here
      await this.bluetooth.connect(device);
    } else {
      // Check if there's an error
      if (this.bluetooth.lastError()) {
        this.connectionState.set('error');
        this.errorMessage.set(this.bluetooth.lastError() || 'Failed to scan');
      } else {
        this.connectionState.set('disconnected');
      }
    }
  }

  async startKeyboardSimulator(): Promise<void> {
    this.connectionState.set('connecting');
    this.connectingToDevice.set('Keyboard Simulator');
    this.errorMessage.set('');

    const success = await this.bluetooth.connectKeyboardSimulator();
    if (!success) {
      this.connectionState.set('error');
      this.errorMessage.set(this.bluetooth.lastError() || 'Failed to start keyboard simulator');
    }
  }

  stopScan(): void {
    this.connectionState.set('disconnected');
  }

  disconnect(): void {
    this.bluetooth.disconnect();
    this.connectionState.set('disconnected');
    this.deviceName.set('');
  }

  // Device History Methods
  private loadCachedDevices(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const devices: CachedDevice[] = JSON.parse(stored);
        // Sort by lastConnected descending
        devices.sort((a, b) => b.lastConnected - a.lastConnected);
        this.cachedDevices.set(devices);
      }
    } catch (e) {
      console.error('Failed to load cached devices:', e);
    }
  }

  private cacheDevice(name: string, mac?: string): void {
    // Do not cache the keyboard simulator
    if (name === 'Keyboard Simulator') {
      return;
    }

    try {
      // Use provided MAC or get from service
      const deviceMac = mac || this.bluetooth.getLastMac() || '';
      if (!deviceMac) {
        console.warn('[BluetoothManager] No MAC available to cache device');
        return;
      }

      const currentDevices = this.cachedDevices();
      const existingIndex = currentDevices.findIndex(d => d.mac.toLowerCase() === deviceMac.toLowerCase());

      const newDevice: CachedDevice = {
        name,
        mac: deviceMac,
        type: this.detectCubeType(name),
        lastConnected: Date.now()
      };

      let updatedDevices: CachedDevice[];
      if (existingIndex >= 0) {
        // Update existing
        updatedDevices = [...currentDevices];
        updatedDevices[existingIndex] = newDevice;
      } else {
        // Add new
        updatedDevices = [newDevice, ...currentDevices].slice(0, this.MAX_CACHED_DEVICES);
      }

      // Sort and save
      updatedDevices.sort((a, b) => b.lastConnected - a.lastConnected);
      this.cachedDevices.set(updatedDevices);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDevices));
    } catch (e) {
      console.error('Failed to cache device:', e);
    }
  }

  private detectCubeType(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('gan')) return 'GAN';
    if (lowerName.includes('giiker') || lowerName.includes('xiaomi') || lowerName.includes('mi smart')) return 'Giiker';
    if (lowerName.includes('qiyi')) return 'Qiyi';
    if (lowerName.includes('moyu')) return 'Moyu';
    if (lowerName.includes('gocube') || lowerName.includes('go cube')) return 'GoCube';
    return 'Smart Cube';
  }

  async connectToCachedDevice(device: CachedDevice): Promise<void> {
    this.connectingToDevice.set(device.name);
    this.connectionState.set('connecting');

    // Store pending device info - we already have the MAC
    this.pendingDevice = {
      name: device.name,
      mac: device.mac
    };

    // Trigger scan and try to connect to the specific MAC
    try {
      const btDevice = await this.bluetooth.scan();
      if (btDevice) {
        // Connection will be handled by callback
        await this.bluetooth.connectWithMac(btDevice, device.mac);
      } else {
        this.pendingDevice = null;
        this.connectionState.set('disconnected');
      }
    } catch (e: any) {
      this.pendingDevice = null;
      this.connectionState.set('error');
      this.errorMessage.set(e.message || 'Connection failed');
    }
  }
}
