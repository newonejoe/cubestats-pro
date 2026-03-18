async function switchUser() {
            const userId = parseInt(document.getElementById('userSelect').value);
            state.currentUserId = userId;

            // Check if coach
            const users = await fetchUsers();
            const user = users.find(u => u.id === userId);
            state.currentUserRole = user?.role || 'User';

            // Show/hide coach panel
            document.getElementById('coachPanel').style.display =
                (state.currentUserRole === 'Coach' || state.currentUserRole === 'Admin') ? 'block' : 'none';

            // Reload data
            state.currentSession = null;
            await loadSolves();
            generateScramble();
            updateTimerDisplay();
        }

        async function viewCoachDashboard() {
            document.getElementById('coachModal').classList.add('active');
            const content = document.getElementById('coachContent');
            content.innerHTML = '<div class="loading"></div> Loading...';

            const allAnalysis = await loadAllUsersAnalysis();

            content.innerHTML = allAnalysis.map(({ user, stats }) => `
                <div class="user-stat-card" style="margin-bottom: 16px;">
                    <h3>${user.username}</h3>
                    <div class="user-stats">
                        <div>
                            <h4>Total Solves</h4>
                            <div class="stat-value">${stats.totalSolves || 0}</div>
                        </div>
                        <div>
                            <h4>Best Time</h4>
                            <div class="stat-value">${formatTime(stats.oStepAnalysis?.averageTime)}</div>
                        </div>
                    </div>
                    <p style="font-size: 12px; color: var(--text-secondary);">
                        O-Step Avg: ${formatTime(stats.oStepAnalysis?.averageTime)} |
                        P-Step Avg: ${formatTime(stats.pStepAnalysis?.averageTime)}
                    </p>
                </div>
            `).join('');

            if (allAnalysis.length === 0) {
                content.innerHTML = '<div class="no-data"><p>No user data available</p></div>';
            }
        }

        function closeCoachDashboard() {
            document.getElementById('coachModal').classList.remove('active');
        }

// Expose to window for inline HTML and other modules
window.closeCoachDashboard = closeCoachDashboard;
window.viewCoachDashboard = viewCoachDashboard;
window.switchUser = switchUser;
