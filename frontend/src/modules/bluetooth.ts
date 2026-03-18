let bluetoothManager = new window.BluetoothManager();
        let cubeMoveBuffer = [];

        async function scanForCubes() {
            const scanBtn = document.getElementById('scanBtn');
            if (!navigator.bluetooth) {
                showToast('Web Bluetooth not supported. Use Chrome/Edge on HTTPS or localhost.', 'error');
                return;
            }

            scanBtn.innerHTML = '<span class="recording">📡</span> Scanning...';
            scanBtn.disabled = true;

            try {
                const { device, mac } = await bluetoothManager.scan();

                bluetoothManager.setOnConnect((name) => {
                    state.cubeConnected = true;
                    document.getElementById('connectionDot').classList.add('connected');
                    document.getElementById('connectionText').textContent = name || 'Smart Cube';
                    showToast(`Connected to ${name || 'Smart Cube'}!`, 'success');

                    const devicesList = document.getElementById('btDevices');
                    devicesList.innerHTML = `
                        <div class="bt-device" onclick="disconnectCube()">
                            <span class="bt-device-name">${name || 'Smart Cube'}</span>
                            <span class="bt-device-rssi">Connected ✓</span>
                        </div>
                    `;
                });

                bluetoothManager.setOnDisconnect(() => {
                    state.cubeConnected = false;
                    document.getElementById('connectionDot').classList.remove('connected');
                    document.getElementById('connectionText').textContent = 'Disconnected';
                    document.getElementById('btDevices').innerHTML = '';
                    showToast('Cube disconnected', 'error');
                });

                bluetoothManager.setOnMove((moves) => {
                    if (moves && moves.length > 0) {
                        // Add to global buffer
                        cubeMoveBuffer.push(...moves);
                        if (cubeMoveBuffer.length > 10) cubeMoveBuffer = cubeMoveBuffer.slice(-10);

                        // If timer is ready (inspection done) and cube moves, start timer
                        if (state.status === 'ready') {
                            console.log('[Timer] Starting from cube move');
                            startTimer();
                        } else if (state.status === 'idle') {
                            // Optionally start inspection
                            console.log('[Timer] Starting inspection from cube move');
                            startSolve();
                        }

                        // If timer is running and we get moves, record them
                        if (state.status === 'running') {
                            state.currentSolve.moveCount = (state.currentSolve.moveCount || 0) + moves.length;
                            // Update virtual cube
                            applyScrambleToCube(moves.join(' '));
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

            scanBtn.innerHTML = '<span>📡</span> <span data-i18n="scanForCubes">Scan for Cubes</span>';
            scanBtn.disabled = false;
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
