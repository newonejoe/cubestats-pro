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

// Expose to window for inline HTML and other modules
window.state = state;
window.API_BASE = API_BASE;
