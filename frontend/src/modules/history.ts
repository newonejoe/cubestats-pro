function updateHistory() {
            const list = document.getElementById('solvesList');

            if (!state.solves || state.solves.length === 0) {
                list.innerHTML = '<div class="no-data"><p>No solves recorded yet</p></div>';
                return;
            }

            list.innerHTML = state.solves.slice().reverse().map((solve, index) => {
                const time = solve.finalTime != null ? formatTime(solve.finalTime) : 'DNF';
                const date = new Date(solve.startTime).toLocaleTimeString();
                const isDNF = solve.penalty === 2;
                const isPlus2 = solve.penalty === 1;

                return `
                    <div class="solve-item" onclick="viewSolve(${state.solves.length - 1 - index})">
                        <span class="solve-time ${isDNF ? 'dnf' : ''} ${isPlus2 && !isDNF ? 'plus2' : ''}">${time}</span>
                        <div class="solve-info">
                            <span class="solve-date">${date}</span>
                            <span>${solve.moveCount || solve.scramble?.split(' ').length || 0} moves</span>
                        </div>
                    </div>
                `;
            }).join('');
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

// Expose to window for inline HTML and other modules
window.updateHistory = updateHistory;
window.viewSolve = viewSolve;
