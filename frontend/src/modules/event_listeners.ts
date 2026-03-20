document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                startSolve();
            } else if (e.code === 'Enter' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                generateScramble();
            }
        });

        document.querySelectorAll('.scramble-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.scramble-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.scrambleLength = parseInt(btn.dataset.length);
                generateScramble();
            });
        });

        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeSettings();
        });

        document.getElementById('coachModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeCoachDashboard();
        });

        document.getElementById('resetModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeResetModal(false);
        });

        document.getElementById('macModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeMacModal(null);
        });

        // Handle Enter key in MAC input
        document.getElementById('macInput')?.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                e.preventDefault();
                submitMacAddress();
            }
        });