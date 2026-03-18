function openSettings() {
            document.getElementById('settingsModal').classList.add('active');
            document.getElementById('inspectionTime').value = state.settings.inspectionTime;
            document.getElementById('timerSound').value = state.settings.sound ? 'on' : 'off';
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function saveSettings() {
            state.settings.inspectionTime = parseInt(document.getElementById('inspectionTime').value);
            state.settings.sound = document.getElementById('timerSound').value === 'on';
            state.inspectionTime = state.settings.inspectionTime;
            localStorage.setItem('cubestats_settings', JSON.stringify(state.settings));
            closeSettings();
            showToast('Settings saved!', 'success');
        }

        async function clearAllData() {
            if (confirm('Are you sure you want to clear all solve data?')) {
                // In production, this would call an API to delete data
                state.solves = [];
                localStorage.removeItem('cubestats_solves');
                updateStats();
                updateHistory();
                document.getElementById('analysisContent').innerHTML = `
                    <div class="no-data">
                        <div class="no-data-icon">📊</div>
                        <p>Complete solves to see CFOP analysis</p>
                    </div>
                `;
                document.getElementById('lastSolveDetails').innerHTML = `
                    <div class="no-data">
                        <div class="no-data-icon">🎯</div>
                        <p>No solve data yet</p>
                    </div>
                `;
                closeSettings();
                showToast('All data cleared', 'success');
            }
        }

// Expose to window for inline HTML and other modules
window.saveSettings = saveSettings;
window.closeSettings = closeSettings;
window.clearAllData = clearAllData;
window.openSettings = openSettings;
