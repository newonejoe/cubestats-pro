async function fetchUsers() {
            try {
                const response = await fetch(`${API_BASE}/users`);
                return await response.json();
            } catch (error) {
                console.error('Error fetching users:', error);
                return [];
            }
        }

        async function createSession() {
            try {
                const response = await fetch(`${API_BASE}/sessions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: state.currentUserId,
                        name: `Session ${new Date().toLocaleDateString()}`
                    })
                });
                return await response.json();
            } catch (error) {
                console.error('Error creating session:', error);
                return null;
            }
        }

        async function loadSolves() {
            try {
                const response = await fetch(`${API_BASE}/solves?userId=${state.currentUserId}`);
                state.solves = await response.json();
                updateStats();
                updateHistory();
                if (state.solves.length > 0) {
                    updateAnalysis();
                }
            } catch (error) {
                console.error('Error loading solves:', error);
            }
        }

        async function loadStatistics() {
            try {
                const response = await fetch(`${API_BASE}/solves/statistics?userId=${state.currentUserId}`);
                const stats = await response.json();

                document.getElementById('bestTime').textContent = formatTime(stats.bestTime);
                document.getElementById('ao5').textContent = formatTime(stats.ao5);
                document.getElementById('ao12').textContent = formatTime(stats.ao12);
                document.getElementById('ao100').textContent = formatTime(stats.ao100);
                document.getElementById('solveCount').textContent = stats.totalSolves || 0;
            } catch (error) {
                console.error('Error loading statistics:', error);
            }
        }

        async function saveSolve(solveData) {
            try {
                const response = await fetch(`${API_BASE}/solves`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(solveData)
                });
                return await response.json();
            } catch (error) {
                console.error('Error saving solve:', error);
                return null;
            }
        }

        async function analyzeSolve(time) {
            try {
                const response = await fetch(`${API_BASE}/analysis/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ time: time })
                });
                return await response.json();
            } catch (error) {
                console.error('Error analyzing solve:', error);
                return null;
            }
        }

        async function loadUserAnalysis() {
            try {
                const response = await fetch(`${API_BASE}/analysis/summary/${state.currentUserId}`);
                return await response.json();
            } catch (error) {
                console.error('Error loading analysis:', error);
                return null;
            }
        }

        async function loadAllUsersAnalysis() {
            try {
                const users = await fetchUsers();
                const analysis = [];

                for (const user of users) {
                    if (user.role === 'User') {
                        const response = await fetch(`${API_BASE}/analysis/summary/${user.id}`);
                        const stats = await response.json();
                        analysis.push({ user, stats });
                    }
                }

                return analysis;
            } catch (error) {
                console.error('Error loading all analysis:', error);
                return [];
            }
        }

// Expose to window for inline HTML and other modules
window.loadUserAnalysis = loadUserAnalysis;
window.loadStatistics = loadStatistics;
window.analyzeSolve = analyzeSolve;
window.loadSolves = loadSolves;
window.createSession = createSession;
window.fetchUsers = fetchUsers;
window.saveSolve = saveSolve;
window.loadAllUsersAnalysis = loadAllUsersAnalysis;
