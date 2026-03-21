# Frontend Angular - Architecture & Progress

## Overview

This document describes the refactoring of the CubeStats frontend from a monolithic vanilla TypeScript/Vite project to Angular. The refactoring preserves all existing Bluetooth cube driver functionality while leveraging Angular's component-based architecture.

## Project Structure

```
frontend-angular/
├── src/
│   ├── app/
│   │   ├── components/          # Angular standalone components
│   │   │   ├── header/
│   │   │   ├── timer/
│   │   │   ├── statistics/
│   │   │   ├── history/
│   │   │   └── mac-modal/       # MAC address input modal
│   │   ├── services/            # Angular services
│   │   │   ├── state.service.ts       # App state management
│   │   │   ├── timer.service.ts       # Timer logic
│   │   │   ├── cube.service.ts        # Cube state & moves
│   │   │   ├── api.service.ts         # Backend API calls
│   │   │   ├── i18n.service.ts       # Internationalization
│   │   │   ├── bluetooth.service.ts  # BLE coordination
│   │   │   └── cube-callback.service.ts # Driver-UI bridge
│   │   ├── hardware/            # Bluetooth cube drivers (copied from vanilla)
│   │   │   ├── driver.ts        # Base driver interface
│   │   │   ├── manager.ts       # BluetoothManager coordinator
│   │   │   ├── giiker.ts        # Giiker/Xiaomi driver
│   │   │   ├── gan.ts           # GAN Cube driver
│   │   │   ├── gocube.ts        # GoCube driver
│   │   │   ├── qiyi.ts          # Qiyi driver
│   │   │   ├── moyu.ts          # Moyu driver
│   │   │   ├── types.ts         # TypeScript types
│   │   │   └── index.ts         # Module exports
│   │   ├── app.component.ts
│   │   └── app.config.ts
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

1. **Driver Pattern**: Each driver (GAN, Giiker, Qiyi, Moyu, GoCube) extends `CubeDriver` base class
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

### Known Issues / TODO

- [ ] Test all cube drivers (GAN, Giiker, Qiyi, Moyu, GoCube) - user tested GAN, Qiyi, Moyu
- [ ] Virtual cube 3D rendering (Three.js) - currently using 2D flat view

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
