function updateAnalysis() {
            if (!state.solves || state.solves.length === 0) {
                document.getElementById('analysisContent').innerHTML = `
                    <div class="no-data">
                        <div class="no-data-icon">📊</div>
                        <p>Complete solves to see CFOP analysis</p>
                    </div>
                `;
                return;
            }

            const lastSolve = state.solves[state.solves.length - 1];
            if (!lastSolve) return;

            // Calculate times based on percentages: Cross (12%), F2L (45%), OLL (18%), PLL (25%)
            const totalTime = lastSolve.finalTime || lastSolve.time || 0;
            const crossTime = lastSolve.crossTime || Math.floor(totalTime * 0.12);
            const f2lTime = lastSolve.f2lTime || Math.floor(totalTime * 0.45);
            const ollTime = lastSolve.ollTime || Math.floor(totalTime * 0.18);
            const pllTime = lastSolve.pllTime || Math.floor(totalTime * 0.25);

            document.getElementById('analysisContent').innerHTML = `
                <div class="cfop-card cross-step">
                    <div class="cfop-header">
                        <span class="cfop-title">🟢 Cross</span>
                        <span class="cfop-badge ${lastSolve.crossEfficiency || 'average'}">${(lastSolve.crossEfficiency || 'average').toUpperCase()}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="crossTime">Cross Time</span>
                        <span class="cfop-metric-value">${formatTime(crossTime)}</span>
                    </div>
                </div>

                <div class="cfop-card f2l-step">
                    <div class="cfop-header">
                        <span class="cfop-title">🟡 F2L</span>
                        <span class="cfop-badge ${lastSolve.f2lEfficiency || 'average'}">${(lastSolve.f2lEfficiency || 'average').toUpperCase()}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="f2lTime">F2L Time</span>
                        <span class="cfop-metric-value">${formatTime(f2lTime)}</span>
                    </div>
                </div>

                <div class="cfop-card oll-step">
                    <div class="cfop-header">
                        <span class="cfop-title">🟠 OLL</span>
                        <span class="cfop-badge ${lastSolve.ollEfficiency || 'average'}">${(lastSolve.ollEfficiency || 'average').toUpperCase()}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="ollTime">OLL Time</span>
                        <span class="cfop-metric-value">${formatTime(ollTime)}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="ollCase">OLL Case</span>
                        <span class="cfop-metric-value">${lastSolve.ollCase || 'N/A'}</span>
                    </div>
                    <div class="cfop-algorithm">
                        <span class="cfop-metric-label" data-i18n="algorithm">Algorithm</span>
                        <span class="cfop-algorithm-text">${lastSolve.ollAlgorithm || 'N/A'}</span>
                    </div>
                </div>

                <div class="cfop-card pll-step">
                    <div class="cfop-header">
                        <span class="cfop-title">🔵 PLL</span>
                        <span class="cfop-badge ${lastSolve.pllEfficiency || 'average'}">${(lastSolve.pllEfficiency || 'average').toUpperCase()}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="pllTime">PLL Time</span>
                        <span class="cfop-metric-value">${formatTime(pllTime)}</span>
                    </div>
                    <div class="cfop-metric">
                        <span class="cfop-metric-label" data-i18n="pllCase">PLL Case</span>
                        <span class="cfop-metric-value">${lastSolve.pllCase || 'N/A'}</span>
                    </div>
                    <div class="cfop-algorithm">
                        <span class="cfop-metric-label" data-i18n="algorithm">Algorithm</span>
                        <span class="cfop-algorithm-text">${lastSolve.pllAlgorithm || 'N/A'}</span>
                    </div>
                </div>
            `;

            viewSolve(state.solves.length - 1);
        }

// Expose to window for inline HTML and other modules
window.updateAnalysis = updateAnalysis;
