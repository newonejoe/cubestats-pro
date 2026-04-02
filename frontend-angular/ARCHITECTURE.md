# Frontend Angular - Architecture & Progress

## Overview

This document describes the refactoring of the CubeStats frontend from a monolithic vanilla TypeScript/Vite project to Angular. The refactoring preserves all existing Bluetooth cube driver functionality while leveraging Angular's component-based architecture.

## Project Structure

```
frontend-angular/
├── src/
│   ├── app/
│   │   ├── components/          # Angular standalone components
│   │   │   ├── shared/               # Reusable UI components
│   │   │   │   ├── app-modal.component.ts
│   │   │   │   ├── app-card.component.ts
│   │   │   │   ├── app-empty-state.component.ts
│   │   │   │   └── algorithm-case-picker.component.ts
│   │   │   ├── header/
│   │   │   ├── timer/
│   │   │   │   ├── timer.component.ts
│   │   │   │   └── scramble-display.component.ts
│   │   │   ├── statistics/
│   │   │   ├── history/
│   │   │   ├── analysis/             # Advanced statistics and solve details
│   │   │   │   ├── analysis-session-statistics.component.ts
│   │   │   │   ├── compact-stats-table.component.ts  # Compact metric table with metric selector
│   │   │   │   ├── analysis-toolbar.component.ts
│   │   │   ├── bluetooth-manager/    # Bluetooth connection modal & device caching
│   │   │   ├── mac-modal/            # MAC address input modal
│   │   │   ├── solved-state-modal/   # Solved state confirmation modal
│   │   │   ├── settings-modal/       # User preferences modal
│   │   │   ├── virtual-cube/         # Three.js 3D cube rendering
│   │   │   ├── oll-case-picker/      # OLL subset configuration
│   │   │   ├── pll-case-picker/      # PLL subset configuration
│   │   │   └── f2l-case-picker/      # F2L subset configuration
│   │   ├── services/                 # Angular services
│   │   │   ├── state.service.ts      # App state management
│   │   │   ├── timer.service.ts      # Timer logic
│   │   │   ├── cube.service.ts       # Cube state & moves
│   │   │   ├── api.service.ts        # Backend API calls
│   │   │   ├── i18n.service.ts      # Internationalization
│   │   │   ├── bluetooth.service.ts # BLE coordination
│   │   │   └── cube-callback.service.ts  # Driver-UI bridge
│   │   ├── hardware/            # Bluetooth cube drivers (copied from vanilla)
│   │   │   ├── driver.ts        # Base driver interface
│   │   │   ├── manager.ts       # BluetoothManager coordinator
│   │   │   ├── giiker.ts        # Giiker/Xiaomi driver
│   │   │   ├── gan.ts           # GAN Cube driver
│   │   │   ├── gocube.ts        # GoCube driver
│   │   │   ├── qiyi.ts          # Qiyi driver
│   │   │   ├── moyu.ts          # Moyu driver
│   │   │   ├── keyboard.ts      # Keyboard Simulator driver
│   │   │   ├── types.ts         # TypeScript types
│   │   │   └── index.ts         # Module exports
│   │   ├── app.ts               # Root component (App)
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── styles.css
│   └── main.ts
└── angular.json
```

## Architecture

### Services Layer

| Service | Responsibility |
|---------|---------------|
| `StateService` | Global app state using Angular signals |
| `TimerService` | Timer start/stop/inspection logic |
| `CubeService` | Cube state, scramble generation, solve tracking |
| `ApiService` | HTTP calls to backend API |
| `I18nService` | Language switching (EN/ZH/JA) |
| `BluetoothService` | Coordinates BLE scanning/connection |
| `CubeCallbackService` | Bridge between drivers and Angular UI |

### Hardware Drivers

The hardware drivers are copied from the vanilla frontend and integrated with minimal changes:

1. **Driver Pattern**: Each driver (GAN, Giiker, Qiyi, Moyu, GoCube, Keyboard Simulator) extends `CubeDriver` base class
2. **Driver Registry**: Static registration via `registerDriver()` for dynamic matching
3. **Manager**: `BluetoothManager` coordinates scanning, driver selection, and connection

### Key Integration Points

#### 1. BluetoothService → BluetoothManager

```typescript
// BluetoothService wraps the vanilla BluetoothManager
import { bluetoothManager } from '../hardware';

async scan() {
  const result = await bluetoothManager.scan();
  this.lastMac = result.mac;
  return result.device;
}

async connect(device: BluetoothDevice) {
  await bluetoothManager.connect(device, this.lastMac);
}
```

#### 2. CubeCallbackService - Driver ↔ Angular Bridge

The drivers run outside Angular's DI system. `CubeCallbackService` provides:

- **Singleton on window**: Accessible via `window.cubeCallbackService`
- **MAC modal registration**: Components register to handle MAC prompts
- **Cube state notifications**: Drivers notify Angular of facelet updates

```typescript
// In service constructor
(window as any).cubeCallbackService = this;

// Drivers use:
import { getCubeCallbackService } from '../services/cube-callback.service';
const cb = getCubeCallbackService();
cb.notifyCubeState(facelets);
```

### Bluetooth Connection Flow

The app uses a modal-based connection flow to satisfy Web Bluetooth's user gesture requirement:

1. **Page Load**: Full-screen modal appears (`connectionState = 'prompt'`)
2. **User Action**: User clicks "Scan for Cubes" or selects a cached device
3. **Scanning**: `BluetoothService.scan()` calls `BluetoothManager.scan()`
4. **Connection**: User selects device → `BluetoothService.connect()` → `BluetoothManager.connect()`
5. **Callback Chain**:
   - `BluetoothManager.connect()` calls `onConnectCallback(name, mac)`
   - `BluetoothService` forwards callback with MAC
   - `BluetoothManagerComponent` caches device to localStorage
6. **Connected**: Modal fades, main app content displayed

#### Device Caching

```typescript
interface CachedDevice {
  name: string;       // Device display name
  mac: string;        // MAC address
  type: string;       // GAN, Giiker, Qiyi, Moyu, GoCube
  lastConnected: number; // Unix timestamp
}
```

- **Storage Key**: `cubestats_bt_devices`
- **Max Devices**: 5
- **Note**: Web Bluetooth requires `requestDevice()` on each connection (browser security requirement)

## Progress

### Completed

- [x] Create Angular project with standalone components
- [x] Implement core services (State, Timer, Cube, API, I18n)
- [x] Copy hardware drivers from vanilla frontend
- [x] Add Web Bluetooth type declarations
- [x] Integrate BluetoothManager with Angular BluetoothService
- [x] Create MAC address modal component
- [x] Implement CubeCallbackService for driver-UI communication
- [x] Fix static property TypeScript issues (driverName, prefixes, etc.)
- [x] Fix Qiyi MAC extraction fallback (name-based)
- [x] Fix GAN cube driver MAC prompt handling
- [x] Build verification
- [x] Integrate Timer with cube moves (Bluetooth move callback)
- [x] Virtual cube 2D rendering (flat view with 6 faces)
- [x] History component - display solve list
- [x] Statistics component - show averages (current, ao5, ao12, ao100, best)
- [x] Remove `(window as any)` usages - added global.d.ts type declarations

### Recently Completed

- [x] **Component Consolidation & UI Refactoring**
  - Created shared UI components (`AppModalComponent`, `AppCardComponent`, `AppEmptyStateComponent`)
  - Unified `AlgorithmCasePickerComponent` for OLL, PLL, and F2L selection
  - Abstracted `.tbl` styles into global `styles.scss`
  - Split monolithic components (`ScrambleDisplayComponent`, `SettingsModalComponent`)
- [x] Virtual cube 3D rendering with Three.js (27 cubies, transparent, double-side stickers)
- [x] Fix applyMove for proper cube rotation (face + adjacent edges)
- [x] Solved state confirmation modal - shows when cube is NOT solved
- [x] Save custom solved state to localStorage (same key as drivers)
- [x] Improve GAN, Qiyi, Moyu drivers with initial solved state check
- [x] **Bluetooth Connection Modal** - Full-screen modal for Bluetooth cube connection (cstimer-style)
  - Prompts user to connect on page load (captures required user gesture for Web Bluetooth)
  - Shows cached devices for quick reconnect
  - Displays connection state (scanning, connecting, connected, error)
  - Device caching in localStorage (`cubestats_bt_devices`)
- [x] **BluetoothManager** component - manages Bluetooth connection UI
  - `ConnectionState` type: 'prompt' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error'
  - Stores up to 5 recently connected devices
  - Passes MAC address through callback chain (manager → service → component)
- [x] **Device Caching** - Persist connected devices
  - Caches: name, MAC address, type (GAN/Giiker/Qiyi/Moyu/GoCube), lastConnected timestamp
  - Quick connect buttons for recent devices
  - MAC passed via `ConnectCallback(name, mac)` type
- [x] **Internationalization (i18n)**
  - Implemented `I18nService` with `APP_INITIALIZER` for preloading translations
  - Added i18n for all analysis components (session statistics, time trend, cross-section, training stats, solve modal)
  - Added i18n for bluetooth-manager, mac-modal, multiphase-display, case-picker components
  - Added i18n for scramble-display (Last/Next buttons)
  - Translation files: `src/assets/i18n/en.json`, `zh.json`, `ja.json`
  - Fixed 404 for zh.json by adding `src/assets` to angular.json assets config
- [x] **Header Redesign**
  - Created minimal header with click-based dropdown menu (☰)
  - Menu items: Statistics, Scramble Test, Keyboard Mapping, Language selector, Role selector
  - Added Bluetooth connection status display
  - Header moved into sidebar on home page (above analysis-session-statistics)
- [x] **Multi-Theme Color Scheme**
  - Created `src/app/data/themes.ts` with 9 predefined themes (default, style1, style2, style3, black, white, style6, solarized-dark, solarized-light)
  - Each theme defined as constant object with 15 color properties (card-bg, primary-color, success-color, danger-color, warning-color, text-primary, text-secondary, text-muted, border-color, background, cube-bg, hover-bg, input-bg, input-border, link-color)
  - Applied via CSS customProperties on `:root` using Angular effect()
  - Removed hardcoded `.theme-black` class approach from styles.scss
  - Theme selection dropdown in settings modal
  - Click-outside-to-close for header dropdown and session-selector (using HostListener)
- [x] **Timer Layout**
  - Cube background positioned to avoid overlapping with right panel and scramble bar
  - Right panel width 300px, bottom aligns with screen bottom
  - Responsive design with media queries for mobile

### Known Issues / TODO

- [ ] Re-enable API calls (currently disabled for testing)
- [ ] Test Giiker and GoCube drivers (GAN, Qiyi, Moyu tested)

## Scramble Generation & Inspection Timer

### Scramble Generation (cstimer-style)

Uses the `mega` algorithm matching cstimer's implementation:

```typescript
// 3-axis grouping: [U/D, R/L, F/B]
private scrambleAxesGrouped: string[][][] = [
  [['U', 'U2', "U'"], ['D', 'D2', "D'"]],   // axis 0: U/D
  [['R', 'R2', "R'"], ['L', 'L2', "L'"]],   // axis 1: R/L
  [['F', 'F2', "F'"], ['B', 'B2', "B'"]],   // axis 2: F/B
];

// mega(length) - generates random moves avoiding:
// - Same face consecutive moves (R R)
// - Same axis redundant moves (U then U')
// - Uses bitmask to track used modifiers on current axis
```

- **WCA Scrambles**: Fixed at 25 moves
- **Cross Scrambles**: Predefined cases + random setup moves

### Inspection Timer Phases (cstimer-style)

Implements 5 phases for Bluetooth cube solving:

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | idle | No solve in progress |
| 2 | twisting | User twists cube to match scramble |
| 3 | twisted | Cube matches scramble, waiting for inspection |
| 4 | inspecting | Inspection timer counting down (15s WCA) |
| 5 | ready | Inspection done, waiting for first move |
| 6 | solving | Timer running |

### Scramble Navigation (Phase 2)

Tracks user moves to show scramble progress:

- **Display**: Completed moves shown as `**`, pending moves shown normally
- **Progress Calculation**:
  - Compares user moves against scramble sequence
  - Tracks `matchedUserMoves` as prefix
  - Calculates unmatched moves as suffix for new comparison
  - Handles half-moves: R2 = R + R (two moves complete a double)
  - Handles inverse cancellation: R + R' = cancel

Key State Signals:
- `scrambleProgress`: Number of scramble moves matched
- `scramblePendingHalfMove`: Face with pending half-move (e.g., 'R' for R2)
- `matchedUserMoves`: Array of user moves that matched scramble prefix

## TypeScript Refactoring

### Web Bluetooth Types

Added proper TypeScript declarations for Web Bluetooth API in `bluetooth.service.ts`:

```typescript
declare global {
  interface Navigator {
    bluetooth?: Bluetooth;
  }
  interface Bluetooth {
    requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
  }
  // ... more interfaces
}
```

### Driver Static Properties

Fixed TypeScript conflicts with JavaScript's `Function.name`:

```typescript
// Before (error)
static name = 'GAN';

// After
declare static driverName: string;
static {
  this.driverName = 'GAN';
}
```

## Build

```bash
cd frontend-angular
npm run build
# Output: dist/frontend-angular/
```

## Running

```bash
cd frontend-angular
npm start
# Opens http://localhost:4200
```
