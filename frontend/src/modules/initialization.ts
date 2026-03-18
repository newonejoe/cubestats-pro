async function init() {
            const savedSettings = localStorage.getItem('cubestats_settings');
            if (savedSettings) {
                state.settings = JSON.parse(savedSettings);
                state.inspectionTime = state.settings.inspectionTime;
            }

            // Set language from localStorage
            const savedLang = localStorage.getItem('language');
            if (savedLang) {
                currentLang = savedLang;
                document.getElementById('langSelect').value = savedLang;
            }
            updateUITexts();

            // Check user role and show coach panel if needed
            await switchUser();

            await loadSolves();
            generateScramble();
            updateTimerDisplay();
            initCube();
            initCubeView();
            updateUITexts();
        }

        init();

// Expose to window for inline HTML and other modules
window.init = init;
