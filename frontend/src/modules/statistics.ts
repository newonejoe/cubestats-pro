function updateStats() {
            // Stats are loaded from API
            loadStatistics();
        }

// Expose to window for inline HTML and other modules
window.updateStats = updateStats;
