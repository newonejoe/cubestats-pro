function formatTime(ms) {
            if (ms === null || ms === undefined) return '--';
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            const milliseconds = Math.floor(ms % 1000);
            if (minutes > 0) {
                return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            }
            return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
        }

        function updateTimerDisplay() {
            const timerEl = document.getElementById('timer');
            timerEl.textContent = formatTime(state.timer);
            timerEl.className = 'timer';
            if (state.status === 'solving') {
                timerEl.classList.add('running');
            } else if (state.status === 'inspection') {
                timerEl.classList.add('inspection');
            }
        }

        async function startSolve() {
            if (state.status === 'idle') {
                // Create session if not exists
                if (!state.currentSession) {
                    state.currentSession = await createSession();
                }

                // Start inspection
                state.status = 'inspection';
                let inspectionLeft = state.inspectionTime;
                const inspectionEl = document.getElementById('inspectionTimer');
                inspectionEl.textContent = `Inspection: ${inspectionLeft}`;

                state.inspectionInterval = setInterval(() => {
                    inspectionLeft--;
                    inspectionEl.textContent = `Inspection: ${inspectionLeft}`;
                    if (inspectionLeft <= 0) {
                        clearInterval(state.inspectionInterval);
                        inspectionEl.textContent = 'GO!';
                        setTimeout(() => {
                            inspectionEl.textContent = '';
                            // Set status to ready - cube moves will start timer
                            state.status = 'ready';
                            document.getElementById('timer').classList.add('ready');
                            // Auto-start after 1 second if no cube connected
                            setTimeout(() => {
                                if (state.status === 'ready') {
                                    startTimer();
                                }
                            }, 1000);
                        }, 500);
                    }
                }, 1000);

                updateTimerDisplay();
                document.getElementById('penaltyBtns').style.display = 'none';
            } else if (state.status === 'solving') {
                stopTimer();
            }
        }

        let currentSolveStartTime = 0;

        function startTimer() {
            if (state.inspectionInterval) {
                clearInterval(state.inspectionInterval);
                state.inspectionInterval = null;
            }
            const inspectionEl = document.getElementById('inspectionTimer');
            if (inspectionEl) inspectionEl.textContent = '';

            state.status = 'solving';
            currentSolveStartTime = Date.now();
            state.timer = 0;
            state.currentSolve = {
                startTime: new Date(currentSolveStartTime).toISOString(),
                scramble: state.scramble,
                inspectionTime: state.inspectionTime,
                sessionId: state.currentSession?.id
            };

            state.timerInterval = setInterval(() => {
                state.timer = Date.now() - currentSolveStartTime;
                updateTimerDisplay();
            }, 10);

            updateTimerDisplay();
            document.getElementById('penaltyBtns').style.display = 'none';
        }

        async function stopTimer(penalty: string | null = null) {
            if (state.timerInterval) {
                clearInterval(state.timerInterval);
                state.timerInterval = null;
            }
            if (state.inspectionInterval) {
                clearInterval(state.inspectionInterval);
                state.inspectionInterval = null;
            }

            const endTime = Date.now();
            const solveTime = endTime - currentSolveStartTime;
            state.timer = solveTime;

            state.status = 'idle';
            document.getElementById('penaltyBtns').style.display = 'flex';

            state.currentSolve.endTime = new Date(endTime).toISOString();
            state.currentSolve.time = solveTime;
            state.currentSolve.displayTime = solveTime;

            document.getElementById('currentTime').textContent = formatTime(solveTime);

            // If penalty is provided (auto-stop from cube detection), apply it
            if (penalty) {
                if (penalty === '+2') {
                    state.currentSolve.penalty = 1;
                    state.currentSolve.plus2 = true;
                } else if (penalty === 'DNF') {
                    state.currentSolve.penalty = 2;
                    state.currentSolve.dnf = true;
                }
            }

            // Save solve to localStorage
            const isDNF = state.currentSolve.penalty === 2;
            const isPlus2 = state.currentSolve.penalty === 1;
            const finalTime = isDNF ? null : (isPlus2 ? solveTime + 2000 : solveTime);

            window.addSolve?.(solveTime, state.currentSolve.scramble || state.scramble, state.currentSolve.moveCount || 0, isDNF, isPlus2);

            // Save to API
            await saveSolve(state.currentSolve);

            // Reload data
            loadSolves();
            loadStatistics();

            setTimeout(() => {
                generateScramble();
            }, 1000);
        }

        async function applyPenalty(penalty: string) {
            if (!state.currentSolve) return;

            let finalTime = state.currentSolve.time;
            if (penalty === '+2') {
                finalTime += 2000;
                state.currentSolve.penalty = 1; // Plus2
                state.currentSolve.plus2 = true;
            } else if (penalty === 'DNF') {
                finalTime = null;
                state.currentSolve.penalty = 2; // DNF
                state.currentSolve.dnf = true;
            }

            state.currentSolve.finalTime = finalTime;

            // Save to localStorage
            const isDNF = penalty === 'DNF';
            const isPlus2 = penalty === '+2';
            window.addSolve?.(state.currentSolve.time, state.currentSolve.scramble || state.scramble, state.currentSolve.moveCount || 0, isDNF, isPlus2);

            // Get CFOP analysis
            const analysis = await analyzeSolve(state.currentSolve.time);
            if (analysis) {
                state.currentSolve.crossTime = analysis.cross.time;
                state.currentSolve.crossEfficiency = analysis.cross.efficiency;
                state.currentSolve.f2lTime = analysis.f2l.time;
                state.currentSolve.f2lEfficiency = analysis.f2l.efficiency;
                state.currentSolve.ollTime = analysis.oll.time;
                state.currentSolve.ollCase = analysis.oll.caseName;
                state.currentSolve.ollAlgorithm = analysis.oll.algorithm;
                state.currentSolve.ollRecognitionTime = analysis.oll.recognitionTime;
                state.currentSolve.ollEfficiency = analysis.oll.efficiency;
                state.currentSolve.pllTime = analysis.pll.time;
                state.currentSolve.pllCase = analysis.pll.caseName;
                state.currentSolve.pllAlgorithm = analysis.pll.algorithm;
                state.currentSolve.pllRecognitionTime = analysis.pll.recognitionTime;
                state.currentSolve.pllEfficiency = analysis.pll.efficiency;
            }

            state.currentSolve.sessionId = state.currentSession?.id;

            // Save to API
            await saveSolve(state.currentSolve);

            // Reload data
            loadSolves();
            loadStatistics();

            // Reset UI
            document.getElementById('penaltyBtns').style.display = 'none';
            document.getElementById('timer').textContent = formatTime(finalTime);
            if (penalty === 'DNF') {
                document.getElementById('timer').classList.add('dnf');
            }

            showToast(penalty === 'DNF' ? 'DNF applied!' : '+2 penalty applied!', penalty === 'DNF' ? 'error' : 'success');

            state.currentSolve = null;
            state.timer = 0;
            setTimeout(() => {
                document.getElementById('timer').classList.remove('dnf');
                updateTimerDisplay();
            }, 2000);
        }

// Expose to window for inline HTML and other modules
window.updateTimerDisplay = updateTimerDisplay;
window.formatTime = formatTime;
window.applyPenalty = applyPenalty;
window.startTimer = startTimer;
window.startSolve = startSolve;
window.stopTimer = stopTimer;
