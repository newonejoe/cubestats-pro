# CubeStats Pro - Test Plan

## Test Environment
- **Application**: CubeStats Pro
- **Version**: 1.0.0
- **URL**: http://172.29.228.139:6688
- **Platform**: .NET 10.0 Web API + SQLite + Vanilla JS

---

## 1. Timer System Tests

### 1.1 Basic Timer Functionality
- [ ] Timer displays correctly on page load (shows 00:00.00)
- [ ] Press Spacebar starts the timer
- [ ] Press Spacebar stops the timer
- [ ] Timer counts accurately to millisecond precision
- [ ] Timer resets after solve completion

### 1.2 Inspection Time
- [ ] 15-second countdown displays when inspection starts
- [ ] Timer starts automatically after inspection ends
- [ ] Can configure inspection time (0-15 seconds)
- [ ] Visual warning when inspection time is low

### 1.3 Penalties
- [ ] DNF penalty can be applied
- [ ] +2 penalty can be applied
- [ ] Penalties correctly affect final time display

---

## 2. Scramble System Tests

### 2.1 Scramble Generation
- [ ] WCA scrambles generate correctly (20/25/30 moves)
- [ ] Scramble displays in standard notation
- [ ] New scramble generates on Enter key press

### 2.2 Scramble Types
- [ ] WCA scrambles work
- [ ] Cross scrambles work (4-move setups)
- [ ] F2L scrambles work (8-move setups)
- [ ] OLL scrambles work (57 cases)
- [ ] PLL scrambles work (21 cases)

### 2.3 Virtual Cube
- [ ] 3D cube renders correctly
- [ ] Cube displays correct colors
- [ ] Scramble applies to cube visually
- [ ] Cube can be rotated with mouse drag
- [ ] Cube resets to solved state

---

## 3. Session & Statistics Tests

### 3.1 Session Management
- [ ] New session creates successfully
- [ ] Session tracks solve count
- [ ] Session calculates average time
- [ ] Session tracks best time

### 3.2 Statistics Display
- [ ] Current solve time displays
- [ ] Ao5 calculates correctly
- [ ] Ao12 calculates correctly
- [ ] Ao100 calculates correctly
- [ ] Best time displays correctly

### 3.3 Solve History
- [ ] Solves save to database
- [ ] History list displays correctly
- [ ] Can view solve details
- [ ] Can delete solves

---

## 4. CFOP Analysis Tests

### 4.1 Step Breakdown
- [ ] Cross time displays
- [ ] F2L time displays
- [ ] OLL time displays
- [ ] PLL time displays

### 4.2 Case Recognition
- [ ] OLL case name displays
- [ ] PLL case name displays
- [ ] Algorithm displays for OLL
- [ ] Algorithm displays for PLL

### 4.3 Efficiency Ratings
- [ ] Good/Average/Slow ratings display correctly
- [ ] Color coding is visible (green/yellow/red)

---

## 5. Internationalization (i18n) Tests

### 5.1 Language Switching
- [ ] English displays correctly
- [ ] Chinese (中文) displays correctly
- [ ] Japanese (日本語) displays correctly
- [ ] Language persists after page reload

### 5.2 Translated Elements
- [ ] Timer labels translate
- [ ] Button labels translate
- [ ] Statistics labels translate
- [ ] Analysis labels translate

---

## 6. Bluetooth Cube Tests

### 6.1 System Requirements

#### Operating System
- [ ] **Windows 10/11**: Chrome, Edge (Chromium)
- [ ] **macOS**: Chrome, Safari
- [ ] **Linux**: Chrome (with BLE support)
- [ ] **Android**: Chrome
- [ ] **iOS**: Chrome, Safari (limited BLE support)

#### Browser Requirements
- [ ] **Web Bluetooth API Support**: Check via https://webbluetoothcodelab.appspot.com/
- [ ] **HTTPS Required**: Must run on HTTPS or localhost
- [ ] **Browser Flags**: `chrome://flags/#enable-experimental-web-platform-features` enabled (if needed)

#### Hardware Requirements
- [ ] Computer/device has Bluetooth 4.0+ (BLE)
- [ ] Bluetooth is enabled and powered on

### 6.2 Supported Cube Brands
- [ ] **Giiker** (Xiaomi Mi Smart Cube)
- [ ] **GAN** (GAN Cube with BLE)
- [ ] **Rubik's** (Bluetooth-enabled)
- [ ] **GoCube** (Smart Cube)
- [ ] **YuXin** (Little Magic)

### 6.3 Connection Tests

#### Pre-Connection
- [ ] "Scan for Cubes" button is visible
- [ ] Bluetooth is enabled on device
- [ ] Cube is powered on and in pairing mode
- [ ] Cube battery is sufficiently charged

#### Scanning
- [ ] Click "Scan for Cubes" initiates BLE scan
- [ ] Scanning indicator/loading shows during scan
- [ ] Available cubes appear in list (if implemented)
- [ ] Scan times out after ~30 seconds if no cubes found
- [ ] Error message if Bluetooth is not available

#### Connecting
- [ ] Can select cube from discovered devices
- [ ] Connecting indicator shows during connection
- [ ] Connection successful message/indicator
- [ ] "Connected" status displays in UI
- [ ] Connection persists during solve

#### Disconnecting
- [ ] Can disconnect via UI button
- [ ] Cube disconnects properly
- [ ] "Disconnected" status displays
- [ ] Re-connection works after disconnect

### 6.4 Functionality Tests

#### Move Detection
- [ ] Cube moves are detected in real-time
- [ ] Move count increments correctly
- [ ] Scramble verification works (if implemented)

#### Timer Integration
- [ ] Timer starts when cube first move detected
- [ ] Timer stops when cube is placed down (if implemented)
- [ ] Solves are saved with move data

#### Data Sync
- [ ] Solve data syncs from cube to app
- [ ] Move history is recorded
- [ ] Time is accurate to cube's internal timer

### 6.5 Error Handling

#### Connection Errors
- [ ] "Bluetooth not available" message if no BLE
- [ ] "No devices found" message if scan fails
- [ ] "Connection failed" message with retry option
- [ ] Timeout handling for unresponsive cubes

#### Runtime Errors
- [ ] Handles cube disconnection during solve
- [ ] Handles cube battery low warnings
- [ ] Recovers gracefully from errors

### 6.6 Browser-Specific Tests

#### Chrome (Windows/macOS/Linux)
- [ ] Full Web Bluetooth API support
- [ ] Works with USB Bluetooth adapters
- [ ] Permissions prompt handled correctly

#### Edge (Windows)
- [ ] Full Web Bluetooth API support
- [ ] Works with Edge Chromium

#### Safari (macOS/iOS)
- [ ] Limited BLE support
- [ ] May require experimental features enabled
- [ ] iOS requires HTTPS

#### Firefox
- [ ] No Web Bluetooth support (as of current)
- [ ] Alternative: Use Chrome/Edge

---

## 7. User Management Tests

### 7.1 User Roles
- [ ] Regular user can access timer
- [ ] Coach can access dashboard
- [ ] User switching works

---

## 8. Data Export Tests

### 8.1 Export Functionality
- [ ] CSV export works
- [ ] Export includes all solve data
- [ ] Export includes CFOP analysis

---

## Test Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
| Approved | | | |
