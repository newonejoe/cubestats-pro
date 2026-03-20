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

// Reset modal functions
let resetModalCallback: ((confirmed: boolean) => void) | null = null;

function showResetModal(callback: (confirmed: boolean) => void) {
    resetModalCallback = callback;
    const modal = document.getElementById('resetModal');
    modal?.classList.add('active');
}

function closeResetModal(confirmed: boolean) {
    const modal = document.getElementById('resetModal');
    modal?.classList.remove('active');
    if (resetModalCallback) {
        resetModalCallback(confirmed);
        resetModalCallback = null;
    }
}

// MAC address modal functions
let macModalCallback: ((mac: string | null) => void) | null = null;

function showMacModal(callback: (mac: string | null) => void) {
    macModalCallback = callback;
    const modal = document.getElementById('macModal');
    const input = document.getElementById('macInput') as HTMLInputElement;
    if (input) input.value = '';
    modal?.classList.add('active');
    // Focus input
    setTimeout(() => input?.focus(), 100);
}

function closeMacModal(mac: string | null) {
    const modal = document.getElementById('macModal');
    modal?.classList.remove('active');
    if (macModalCallback) {
        macModalCallback(mac);
        macModalCallback = null;
    }
}

function submitMacAddress() {
    const input = document.getElementById('macInput') as HTMLInputElement;
    const mac = input?.value?.trim().toUpperCase() || '';
    // Validate MAC format
    const macRegex = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/;
    if (macRegex.test(mac)) {
        closeMacModal(mac);
    } else {
        showToast('Invalid MAC address format (AA:BB:CC:DD:EE:FF)', 'error');
    }
}

// Expose to window for inline HTML and other modules
window.exportData = exportData;
window.showToast = showToast;
window.showResetModal = showResetModal;
window.closeResetModal = closeResetModal;
window.showMacModal = showMacModal;
window.closeMacModal = closeMacModal;
window.submitMacAddress = submitMacAddress;
