// Import BluetoothManager from hardware module
import { bluetoothManager } from '../hardware/index.js';

let cubeMoveBuffer: any[] = [];

// Reset cube tracking state (called when marking cube as solved)
function resetCubeTracking(): void {
    cubeMoveBuffer = [];
    console.log('[Bluetooth] Cube tracking reset');
}

        function updateBtDropdown(name: string | null, connected: boolean) {
            const dropdown = document.getElementById('btDropdown');
            const devicesList = document.getElementById('btDevices');

            if (connected && name) {
                dropdown?.classList.add('show');
                devicesList.innerHTML = `
                    <div class="bt-device" onclick="disconnectCube()">
                        <span class="bt-device-name">${name}</span>
                        <span class="bt-device-rssi">Connected ✓</span>
                    </div>
                `;
            } else {
                dropdown?.classList.remove('show');
                devicesList.innerHTML = '';
            }
        }

        function updateHeaderScanBtn(scanning: boolean) {
            const btn = document.getElementById('headerScanBtn');
            if (btn) {
                if (scanning) {
                    btn.classList.add('scanning');
                    btn.innerHTML = '<span class="recording">📡</span>';
                } else {
                    btn.classList.remove('scanning');
                    btn.innerHTML = '<span>📡</span>';
                }
            }
        }

        async function scanForCubes() {
            const scanBtn = document.getElementById('scanBtn');
            if (!navigator.bluetooth) {
                showToast('Web Bluetooth not supported. Use Chrome/Edge on HTTPS or localhost.', 'error');
                return;
            }

            updateHeaderScanBtn(true);
            if (scanBtn) {
                scanBtn.innerHTML = '<span class="recording">📡</span> Scanning...';
                scanBtn.disabled = true;
            }

            try {
                const { device, mac } = await bluetoothManager.scan();

                bluetoothManager.setOnConnect((name) => {
                    state.cubeConnected = true;
                    document.getElementById('connectionDot').classList.add('connected');
                    document.getElementById('connectionText').textContent = name || 'Smart Cube';
                    showToast(`Connected to ${name || 'Smart Cube'}!`, 'success');
                    updateBtDropdown(name || 'Smart Cube', true);
                    window.updateTimerVisibility?.();
                });

                bluetoothManager.setOnDisconnect(() => {
                    state.cubeConnected = false;
                    document.getElementById('connectionDot').classList.remove('connected');
                    document.getElementById('connectionText').textContent = 'Disconnected';
                    updateBtDropdown(null, false);
                    showToast('Cube disconnected', 'error');
                    window.updateTimerVisibility?.();
                });

                bluetoothManager.setOnMove((moves) => {
                    if (moves && moves.length > 0) {
                        // Add to global buffer
                        cubeMoveBuffer.push(...moves);
                        if (cubeMoveBuffer.length > 10) cubeMoveBuffer = cubeMoveBuffer.slice(-10);

                        // Apply moves to virtual bluetooth cube (for Gan cube moves)
                        for (const moveStr of moves) {
                            const face = moveStr[0];
                            const modifier = moveStr.length > 1 ? moveStr.slice(1) : '';
                            updateBtCubeView({ face, modifier });

                            if (state.status === 'idle') {
                                if (window.navigateScramble) {
                                    window.navigateScramble(face, modifier);
                                }
                            }
                        }

                        if (state.status === 'idle') {
                            // Scramble phase
                            if (isScrambleReached()) {
                                showToast('Scramble completed!', 'success');
                                startSolve(); // Starts inspection
                            }
                        } else if (state.status === 'ready' || state.status === 'inspection') {
                            // During inspection or ready phase, any twist starts the solve timer
                            console.log('[Timer] Starting solve from cube move');
                            startTimer();
                        } else if (state.status === 'solving') {
                            // During solving, record moves
                            state.currentSolve.moveCount = (state.currentSolve.moveCount || 0) + moves.length;
                            
                            // End timer if solved
                            if (isCubeSolved(state.btCubeState)) {
                                stopTimer();
                            }
                        }
                    }
                });

                await bluetoothManager.connect(device, mac);

            } catch (error: any) {
                if (error.name === 'NotFoundError') {
                    console.log('Bluetooth connection cancelled by user.');
                } else {
                    console.error('Bluetooth error:', error);
                    showToast('Could not connect: ' + error.message, 'error');
                }
            }

            updateHeaderScanBtn(false);
            if (scanBtn) {
                scanBtn.innerHTML = '<span>📡</span> <span data-i18n="scanForCubes">Scan for Cubes</span>';
                scanBtn.disabled = false;
            }
        }

        function onCubeDisconnected() {
            if (bluetoothManager) bluetoothManager.disconnect();
        }

        async function disconnectCube() {
            if (bluetoothManager) bluetoothManager.disconnect();
            showToast('Cube disconnected', 'success');
        }

        function isCubeConnected() {
            return state.cubeConnected && bluetoothManager && bluetoothManager.isConnected();
        }

// Expose to window for inline HTML and other modules
window.isCubeConnected = isCubeConnected;
window.scanForCubes = scanForCubes;
window.disconnectCube = disconnectCube;
window.onCubeDisconnected = onCubeDisconnected;
window.bluetoothManager = bluetoothManager;
window.cubeMoveBuffer = cubeMoveBuffer;
window.resetCubeTracking = resetCubeTracking;
