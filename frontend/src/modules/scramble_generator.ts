// Cross scrambles - 4 move setups for cross practice (R, L, U, D moves only)
        const crossScrambles = [
            'R U R\'', 'R U2 R\'', 'R\' D R', 'R\' D2 R',
            'L U L\'', 'L U2 L\'', 'L\' D L', 'L\' D2 L',
            'U R U\' R\'', 'U R2 U\' R\'', 'U\' R\' U R',
            'U L U\' L\'', 'U L2 U\' L\'', 'U\' L\' U L',
            'D R D\' R\'', 'D R2 D\' R\'', 'D\' R\' D R',
            'D L D\' L\'', 'D L2 D\' L\'', 'D\' L\' D L',
            'R U R\' U\'', 'R U\' R\'', 'R\' D R', 'R D\' R\'',
            'L U L\' U\'', 'L U\' L\'', 'L\' D L', 'L D\' L\'',
            'R2 U R\' U\' R', 'R\' U2 R U R\'', 'U R2 U\' R2 U\' R2',
            'L2 U L\' U\' L', 'L\' U2 L U L\'', 'U L2 U\' L2 U\' L2'
        ];

        // F2L scrambles - 8 move setups for F2L practice (random F2L state with solved LL)
        const f2lScrambles = [
            'R U R\' U\' R U2 R\'', 'R U2 R\' U\' R U\' R\'', 'R\' U\' R U\' R\' U2 R',
            'R U R\' U R U2 R\' U\' R U R\'', 'R U\' R\' U R U R\'',
            'L U L\' U\' L U2 L\'', 'L U2 L\' U\' L U\' L\'', 'L\' U\' L U\' L\' U2 L',
            'L U L\' U L U2 L\' U\' L U L\'', 'L U\' L\' U L U L\'',
            'R U R\' U R U\' R\'', 'R U\' R\' U\' R U R\'',
            'L U L\' U L U\' L\'', 'L U\' L\' U\' L U L\'',
            'R U2 R\' U R U2 R\'', 'R\' U2 R U\' R\' U2 R',
            'L U2 L\' U L U2 L\'', 'L\' U2 L U\' L\' U2 L'
        ];

        // PLL scrambles (21 unique cases)
        const pllScrambles = [
            'Ua', 'Ub', 'H', 'Z', 'Aa', 'Ab', 'E', 'T', 'Jb', 'Ja', 'F', 'V', 'Y', 'Na', 'Nb',
            'Ra', 'Rb', 'Ga', 'Gb', 'Gc', 'Gd'
        ];

        // OLL scrambles (57 unique cases - simplified subset for demo)
        const ollScrambles = [
            'R U R\' U R U2 R\'', 'R U2 R\' U\' R U\' R\'', 'R\' U\' R U\' R\' U2 R',
            'R U R\' U\' R\' F R2 U\' R\' U\' R', 'R U2 R2 U\' R2 U\' R2 U2 R',
            'R U R\' U R U2 R\' F R U R\' U\'', 'M\' U R\' U\' R U\' R\' U2 R',
            'R U R\' U R\' F R2 U\' R\' U R', 'R\' F R2 B\' R2 U R\' U\' R2',
            'F R U\' R\' U\' R U R\' F\''
        ];

        function setScrambleType(type) {
            state.scrambleType = type;
            document.querySelectorAll('.scramble-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
            document.getElementById('wcaOptions').style.display = type === 'wca' ? 'flex' : 'none';
            document.getElementById('crossOptions').style.display = type === 'cross' ? 'flex' : 'none';
            document.getElementById('f2lOptions').style.display = type === 'f2l' ? 'flex' : 'none';
            document.getElementById('pllOptions').style.display = type === 'pll' ? 'flex' : 'none';
            document.getElementById('ollOptions').style.display = type === 'oll' ? 'flex' : 'none';
            generateScramble();
        }

        function generateScramble() {
            if (state.scrambleType === 'cross') {
                // Random Cross case - 4 move setups
                const cross = crossScrambles[Math.floor(Math.random() * crossScrambles.length)];
                state.scramble = cross;
            } else if (state.scrambleType === 'f2l') {
                // Random F2L case - 8 move setups
                const f2l = f2lScrambles[Math.floor(Math.random() * f2lScrambles.length)];
                state.scramble = f2l;
            } else if (state.scrambleType === 'pll') {
                // Random PLL case
                const pll = pllScrambles[Math.floor(Math.random() * pllScrambles.length)];
                state.scramble = pll;
            } else if (state.scrambleType === 'oll') {
                // Random OLL case
                const oll = ollScrambles[Math.floor(Math.random() * ollScrambles.length)];
                state.scramble = oll;
            } else {
                // WCA standard scramble
                const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
                const modifiers = ['', "'", '2'];

                let scrambleArray = [];
                let lastAxis = { R: -1, L: -1, U: -1, D: -1, F: -1, B: -1 };

                for (let i = 0; i < state.scrambleLength; i++) {
                    let move, axis;
                    let attempts = 0;

                    do {
                        move = moves[Math.floor(Math.random() * moves.length)];
                        axis = moves.indexOf(move.replace(/[2']/g, ''));
                        attempts++;
                    } while (axis === lastAxis[move.replace(/[2']/g, '')] && attempts < 10);

                    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
                    scrambleArray.push(move + modifier);
                    lastAxis[move.replace(/[2']/g, '')] = axis;
                }

                state.scramble = scrambleArray.join(' ');
            }

            document.getElementById('scramble').textContent = state.scramble;
            applyScrambleToCube(state.scramble);
        }

// Expose to window for inline HTML and other modules
window.setScrambleType = setScrambleType;
window.generateScramble = generateScramble;
