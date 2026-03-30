// Hardware module exports

export type { CubeMove } from './cube-move.js';
export { CubeDriver, registerDriver, getDriverRegistry, findDriver } from './driver.js';
export type { CubeDriverOptions } from './driver.js';

// Import driver classes (this triggers their registration)
import './giiker.js';
import './gan.js';
import './gocube.js';
import './qiyi.js';
import './moyu.js';
import './keyboard.js';

// Re-export driver classes
export { GiikerDriver } from './giiker.js';
export { GanDriver } from './gan.js';
export { GoCubeDriver } from './gocube.js';
export { QiyiDriver } from './qiyi.js';
export { MoyuDriver } from './moyu.js';
export { KeyboardDriver } from './keyboard.js';

// Initialize Bluetooth manager
import { initBluetoothManager } from './manager.js';
export { BluetoothManager, initBluetoothManager } from './manager.js';
export type { MoveCallback, ConnectCallback, DisconnectCallback } from './manager.js';

const bluetoothManager = initBluetoothManager();
export { bluetoothManager };
