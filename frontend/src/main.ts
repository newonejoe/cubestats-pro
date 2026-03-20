// Import styles
import './style.css';

// Import modules
import './modules/internationalization.ts';
import './modules/state.ts';
import './modules/virtual_cube.ts';
import './modules/api_functions.ts';
import './modules/timer_functions.ts';
import './modules/scramble_generator.ts';
import './modules/statistics.ts';
import './modules/history.ts';
import './modules/cfop_analysis.ts';
import './modules/user_management.ts';
import './modules/settings.ts';
import './modules/utilities.ts';
import './modules/event_listeners.ts';

// Import hardware drivers (these register themselves)
// Must be imported before BluetoothManager is used
import './hardware/giiker.js';
import './hardware/gan.js';
import './hardware/gocube.js';
import './hardware/qiyi.js';
import './hardware/moyu.js';
import './hardware/manager.js';

// Import hardware index to get the manager
import { bluetoothManager } from './hardware/index.js';

// Initialize Bluetooth module with the new manager
import './modules/bluetooth.ts';

import './modules/initialization.ts';
