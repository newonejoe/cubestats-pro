function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toastMessage');
            toast.className = `toast ${type} show`;
            toastMessage.textContent = message;
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        function exportData() {
            if (state.solves.length === 0) {
                showToast('No data to export', 'error');
                return;
            }

            const headers = 'Date,Time,Penalty,Scramble,O-Step,P-Step\n';
            const rows = state.solves.map(s =>
                `${new Date(s.startTime).toISOString()},${s.finalTime != null ? s.finalTime / 1000 : 'DNF'},${s.penalty || 'None'},"${s.scramble || ''}",${s.oStepTime || ''},${s.pStepTime || ''}`
            ).join('\n');

            const content = headers + rows;
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cubestats_export.csv';
            a.click();
            URL.revokeObjectURL(url);

            showToast(`Exported ${state.solves.length} solves`, 'success');
        }

// Expose to window for inline HTML and other modules
window.exportData = exportData;
window.showToast = showToast;
