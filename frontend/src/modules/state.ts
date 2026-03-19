const API_BASE = '/api';
        const state = {
            currentUserId: 2,
            currentUserRole: 'User',
            timer: 0,
            timerInterval: null,
            inspectionInterval: null,
            status: 'idle',
            inspectionTime: 15,
            scrambleLength: 20,
            scrambleType: 'wca',
            scramble: '',
            scrambleSequence: [],
            scrambleIndex: 0,
            scramblePendingHalfMove: null,
            solves: [],
            currentSession: null,
            currentSolve: null,
            cubeConnected: false,
            settings: {
                inspectionTime: 15,
                sound: true
            },
            cubeState: {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            },
            btCubeState: null, // Bluetooth cube state (starts solved)
            cubeRotation: { x: -25, y: -45 }
        };

        function updateTimerVisibility() {
            const timerSection = document.querySelector('.timer-section') as HTMLElement;
            const noConnectionMsg = document.getElementById('noConnectionMsg');

            if (!state.cubeConnected) {
                // Show "Connect a cube to start" message
                if (!noConnectionMsg && timerSection) {
                    const appContainer = document.querySelector('.app-container');
                    if (appContainer) {
                        const msg = document.createElement('div');
                        msg.id = 'noConnectionMsg';
                        msg.className = 'card no-connection-card';
                        msg.innerHTML = `
                            <div class="no-connection-content">
                                <div class="no-connection-icon">📡</div>
                                <h3>Connect a Cube</h3>
                                <p>Click the Bluetooth icon in the header to connect your smart cube</p>
                                <button class="btn btn-primary" onclick="scanForCubes()">
                                    <span>📡</span> Scan for Cubes
                                </button>
                            </div>
                        `;
                        appContainer.insertBefore(msg, timerSection);
                    }
                }
                if (timerSection) {
                    timerSection.classList.remove('visible');
                }
            } else {
                // Show timer section
                if (timerSection) {
                    timerSection.classList.add('visible');
                }
                const msg = document.getElementById('noConnectionMsg');
                if (msg) {
                    msg.remove();
                }
            }
        }

        // Call on load to set initial state (delayed to ensure DOM is ready)
        setTimeout(() => {
            updateTimerVisibility();
        }, 100);

// Expose to window for inline HTML and other modules
window.state = state;
window.API_BASE = API_BASE;
window.updateTimerVisibility = updateTimerVisibility;
