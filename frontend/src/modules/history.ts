// Session and History Management with localStorage
        const STORAGE_KEY = 'cubestats_sessions';

        interface Solve {
            time: number;
            dnf: boolean;
            plus2: boolean;
            scramble: string;
            date: number;
            moveCount: number;
        }

        interface Session {
            id: number;
            name: string;
            solves: Solve[];
        }

        interface SessionsData {
            sessions: Session[];
            currentSession: number;
        }

        let sessionsData: SessionsData = {
            sessions: [],
            currentSession: 0
        };

        function saveSessions() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionsData));
        }

        function loadSessions(): SessionsData {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    sessionsData = JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse sessions:', e);
                    sessionsData = { sessions: [], currentSession: 0 };
                }
            }
            // Create default session if none exist
            if (sessionsData.sessions.length === 0) {
                createSession('Session 1');
            }
            return sessionsData;
        }

        function createSession(name: string): number {
            const id = Date.now();
            sessionsData.sessions.push({
                id,
                name,
                solves: []
            });
            saveSessions();
            updateSessionSelector();
            return id;
        }

        function switchSession(id: number) {
            const index = sessionsData.sessions.findIndex(s => s.id === id);
            if (index !== -1) {
                sessionsData.currentSession = index;
                saveSessions();
                updateHistory();
                updateSessionStats();
            }
        }

        function getCurrentSession(): Session | null {
            if (sessionsData.sessions.length === 0) return null;
            return sessionsData.sessions[sessionsData.currentSession] || sessionsData.sessions[0];
        }

        function addSolve(time: number, scramble: string, moveCount: number, dnf: boolean = false, plus2: boolean = false) {
            const session = getCurrentSession();
            if (!session) return;

            const finalTime = dnf ? -1 : (plus2 ? time + 2000 : time);

            session.solves.push({
                time: finalTime,
                dnf,
                plus2,
                scramble,
                date: Date.now(),
                moveCount
            });
            saveSessions();
            updateHistory();
            updateSessionStats();
        }

        function updateSessionSelector() {
            const selector = document.getElementById('sessionSelector');
            if (!selector) return;

            selector.innerHTML = sessionsData.sessions.map((s, i) =>
                `<option value="${s.id}" ${i === sessionsData.currentSession ? 'selected' : ''}>${s.name}</option>`
            ).join('');
        }

        function deleteSession(id: number) {
            if (sessionsData.sessions.length <= 1) {
                showToast('Cannot delete the last session', 'error');
                return;
            }

            const index = sessionsData.sessions.findIndex(s => s.id === id);
            if (index !== -1) {
                sessionsData.sessions.splice(index, 1);
                if (sessionsData.currentSession >= sessionsData.sessions.length) {
                    sessionsData.currentSession = sessionsData.sessions.length - 1;
                }
                saveSessions();
                updateSessionSelector();
                updateHistory();
                updateSessionStats();
            }
        }

        function renameSession(id: number, newName: string) {
            const session = sessionsData.sessions.find(s => s.id === id);
            if (session) {
                session.name = newName;
                saveSessions();
                updateSessionSelector();
            }
        }

        // Legacy function for backwards compatibility
        function loadSolves() {
            loadSessions();
            const session = getCurrentSession();
            if (session) {
                state.solves = session.solves.map(s => ({
                    startTime: s.date,
                    finalTime: s.time >= 0 ? s.time : null,
                    penalty: s.dnf ? 2 : (s.plus2 ? 1 : 0),
                    scramble: s.scramble,
                    moveCount: s.moveCount
                }));
            }
            updateSessionSelector();
            updateHistory();
            updateSessionStats();
        }

        function getAllSolves(): any[] {
            const session = getCurrentSession();
            if (!session) return [];
            return session.solves.map(s => ({
                startTime: s.date,
                finalTime: s.time >= 0 ? s.time : null,
                penalty: s.dnf ? 2 : (s.plus2 ? 1 : 0),
                scramble: s.scramble,
                moveCount: s.moveCount
            }));
        }

        function updateHistory() {
            const list = document.getElementById('solvesList');
            const solves = getAllSolves();

            if (!solves || solves.length === 0) {
                list.innerHTML = '<div class="no-data"><p>No solves recorded yet</p></div>';
                return;
            }

            list.innerHTML = solves.slice().reverse().map((solve, index) => {
                const time = solve.finalTime != null ? formatTime(solve.finalTime) : 'DNF';
                const date = new Date(solve.startTime).toLocaleTimeString();
                const isDNF = solve.penalty === 2;
                const isPlus2 = solve.penalty === 1;

                return `
                    <div class="solve-item" onclick="viewSolve(${solves.length - 1 - index})">
                        <span class="solve-time ${isDNF ? 'dnf' : ''} ${isPlus2 && !isDNF ? 'plus2' : ''}">${time}</span>
                        <div class="solve-info">
                            <span class="solve-date">${date}</span>
                            <span>${solve.moveCount || solve.scramble?.split(' ').length || 0} moves</span>
                        </div>
                    </div>
                `;
            }).join('');

            // Update state.solves for backwards compatibility
            state.solves = solves;
        }

        function viewSolve(index) {
            const solve = state.solves[index];
            if (!solve) return;

            const details = document.getElementById('lastSolveDetails');
            const time = solve.finalTime != null ? formatTime(solve.finalTime) : 'DNF';

            details.innerHTML = `
                <div class="cfop-metric">
                    <span class="cfop-metric-label" data-i18n="time">Time</span>
                    <span class="cfop-metric-value" style="color: var(--primary);">${time}</span>
                </div>
                <div class="cfop-metric">
                    <span class="cfop-metric-label" data-i18n="scramble">Scramble</span>
                    <span class="cfop-metric-value">${solve.scramble || 'N/A'}</span>
                </div>
                <div class="cfop-metric">
                    <span class="cfop-metric-label" data-i18n="penalty">Penalty</span>
                    <span class="cfop-metric-value">${solve.penalty === 2 ? 'DNF' : solve.penalty === 1 ? '+2' : 'None'}</span>
                </div>
                <div class="cfop-metric">
                    <span class="cfop-metric-label" data-i18n="date">Date</span>
                    <span class="cfop-metric-value">${new Date(solve.startTime).toLocaleString()}</span>
                </div>
            `;
        }

        function updateSessionStats() {
            const solves = getAllSolves();
            const validSolves = solves.filter(s => s.penalty !== 2);

            document.getElementById('solveCount').textContent = validSolves.length.toString();

            if (validSolves.length > 0) {
                const times = validSolves.map(s => s.finalTime || 0);
                const best = Math.min(...times);
                document.getElementById('bestTime').textContent = formatTime(best);

                if (validSolves.length >= 5) {
                    const ao5 = calculateAverage(times, 5);
                    document.getElementById('ao5').textContent = formatTime(ao5);
                }
                if (validSolves.length >= 12) {
                    const ao12 = calculateAverage(times, 12);
                    document.getElementById('ao12').textContent = formatTime(ao12);
                }
                if (validSolves.length >= 100) {
                    const ao100 = calculateAverage(times, 100);
                    document.getElementById('ao100').textContent = formatTime(ao100);
                }
            } else {
                document.getElementById('bestTime').textContent = '--';
                document.getElementById('ao5').textContent = '--';
                document.getElementById('ao12').textContent = '--';
                document.getElementById('ao100').textContent = '--';
            }
        }

        function calculateAverage(times: number[], n: number): number {
            if (times.length < n) return 0;
            const recent = times.slice(-n);
            const sorted = [...recent].sort((a, b) => a - b);
            let sum = 0;
            for (let i = 1; i < sorted.length - 1; i++) {
                sum += sorted[i];
            }
            return Math.round(sum / (sorted.length - 2));
        }

        function onSessionChange(event: Event) {
            const select = event.target as HTMLSelectElement;
            const sessionId = parseInt(select.value);
            switchSession(sessionId);
        }

        function createNewSession() {
            const sessionNum = sessionsData.sessions.length + 1;
            createSession(`Session ${sessionNum}`);
            showToast('New session created', 'success');
        }

        function exportData() {
            const solves = getAllSolves();
            const data = JSON.stringify(solves, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cubestats_solves_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Data exported', 'success');
        }

        function formatTime(ms: number): string {
            if (ms < 0) return 'DNF';
            const seconds = Math.floor(ms / 1000);
            const centiseconds = Math.floor((ms % 1000) / 10);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            if (minutes > 0) {
                return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
            }
            return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
        }

        // Legacy compatibility
        window.formatTime = formatTime;

// Expose to window for inline HTML and other modules
window.updateHistory = updateHistory;
window.viewSolve = viewSolve;
window.loadSolves = loadSolves;
window.updateSessionStats = updateSessionStats;
window.onSessionChange = onSessionChange;
window.createNewSession = createNewSession;
window.exportData = exportData;
window.switchSession = switchSession;
window.addSolve = addSolve;
