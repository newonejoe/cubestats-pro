// Three.js variables
        let threeScene, threeCamera, threeRenderer, threeCube;
        let cubeGroup;

        function initThreeJs() {
            const canvas = document.getElementById('threeJsCanvas');
            if (!canvas) return;

            // Scene
            threeScene = new THREE.Scene();
            threeScene.background = new THREE.Color(0x14141f);

            // Camera
            threeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            // Camera looking at white-green edge center - see both equally
            threeCamera.position.set(0, 0, 6);
            threeCamera.lookAt(0, 0, 0);

            // Renderer
            threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            threeRenderer.setSize(400, 400);
            threeRenderer.setPixelRatio(window.devicePixelRatio);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            threeScene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 7);
            threeScene.add(directionalLight);

            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight2.position.set(-5, -5, -5);
            threeScene.add(directionalLight2);

            // Create cube group
            cubeGroup = new THREE.Group();
            threeScene.add(cubeGroup);

            // Build the cube
            buildThreeJsCube();

            // Start render loop
            animateThreeJs();
        }

        function buildThreeJsCube() {
            // Clear existing
            while(cubeGroup.children.length > 0) {
                cubeGroup.remove(cubeGroup.children[0]);
            }

            // Color mapping
            const colors = {
                white: 0xffffff,
                yellow: 0xffd500,
                red: 0xb71234,
                orange: 0xff5800,
                green: 0x009b48,
                blue: 0x0046ad,
                black: 0x111111
            };

            // Kimi spec: GAP=0.05, ISO view: 25,-30
            const cubieSize = 0.95;
            const gap = 1.12; // gap at corners to see other faces

            // Create 27 cubies (3x3x3)
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const cubie = createCubie(x, y, z, cubieSize, colors);
                        cubie.position.set(x * gap, y * gap, z * gap);
                        cubeGroup.add(cubie);
                    }
                }
            }

            // Tilt to show corner between top (white) and front (green)
            // Position cube so white-green edge is at center
            // White on top (y=1), Green in front (z=1), edge at x=0
            cubeGroup.position.y = 0;
            cubeGroup.rotation.x = Math.PI / 4; // 45 degrees X axis
            cubeGroup.rotation.y = 0;
            cubeGroup.rotation.z = 0;
        }

        function createCubie(x, y, z, size, colors) {
            const group = new THREE.Group();

            // Black core - more transparent to see through
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshLambertMaterial({
                color: colors.black,
                transparent: true,
                opacity: 0.15
            });
            const cubie = new THREE.Mesh(geometry, material);
            group.add(cubie);

            // Sticker settings
            const stickerSize = size * 0.85;
            const stickerOffset = size / 2 + 0.01;

            // Right face (x = 1) - Red - opaque
            if (x === 1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.red });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(stickerOffset, 0, 0);
                sticker.rotation.y = Math.PI / 2;
                group.add(sticker);
            }

            // Left face (x = -1) - Orange - opaque
            if (x === -1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.orange });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(-stickerOffset, 0, 0);
                sticker.rotation.y = -Math.PI / 2;
                group.add(sticker);
            }

            // Up face (y = 1) - White - opaque
            if (y === 1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.white });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, stickerOffset, 0);
                sticker.rotation.x = -Math.PI / 2;
                group.add(sticker);
            }

            // Down face (y = -1) - Yellow - opaque
            if (y === -1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.yellow });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, -stickerOffset, 0);
                sticker.rotation.x = Math.PI / 2;
                group.add(sticker);
            }

            // Front face (z = 1) - Green - opaque
            if (z === 1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.green });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, 0, stickerOffset);
                group.add(sticker);
            }

            // Back face (z = -1) - Blue - opaque
            if (z === -1) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.blue });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, 0, -stickerOffset);
                sticker.rotation.y = Math.PI;
                group.add(sticker);
            }

            return group;
        }

        function animateThreeJs() {
            requestAnimationFrame(animateThreeJs);
            if (threeRenderer && threeScene && threeCamera) {
                threeRenderer.render(threeScene, threeCamera);
            }
        }

        function initCube() {
            // Initialize Bluetooth cube state to solved
            state.btCubeState = {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };
            updateCubeView();
            initThreeJs();
        }

        function setupCubeInteraction() {
            const cubeEl = document.getElementById('virtualCube');
            let isDragging = false;
            let startX, startY;
            let rotX = state.cubeRotation.x;
            let rotY = state.cubeRotation.y;

            cubeEl.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                cubeEl.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                rotY += deltaX * 0.5;
                rotX -= deltaY * 0.5;
                rotX = Math.max(-90, Math.min(90, rotX));
                startX = e.clientX;
                startY = e.clientY;
                state.cubeRotation = { x: rotX, y: rotY };
                updateCubeView();
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                cubeEl.style.cursor = 'grab';
            });

            // Touch support
            cubeEl.addEventListener('touchstart', (e) => {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });

            document.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                const deltaX = e.touches[0].clientX - startX;
                const deltaY = e.touches[0].clientY - startY;
                rotY += deltaX * 0.5;
                rotX -= deltaY * 0.5;
                rotX = Math.max(-90, Math.min(90, rotX));
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                state.cubeRotation = { x: rotX, y: rotY };
                updateCubeView();
            });

            document.addEventListener('touchend', () => {
                isDragging = false;
            });
        }

        function resetCube() {
            // Reset flat view (scramble target) - solved state
            state.cubeState = {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };
            // Reset 3D view (Bluetooth status) - always starts solved
            state.btCubeState = JSON.parse(JSON.stringify(state.cubeState));
            updateCubeView();
        }

        function resetBtCube() {
            // Reset only the Bluetooth 3D cube to solved state
            state.btCubeState = {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };
            updateCubeView();
        }

        function applyScrambleToCube(scramble) {
            // Reset flat view to solved state first
            state.cubeState = {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };
            // Apply scramble to flat view only (scramble target)
            if (!scramble) return;

            const moves = scramble.split(' ');
            moves.forEach(move => {
                const face = move[0];
                const modifier = move.slice(1);
                applyMove(face, modifier);
            });
            if (!validateCube()) {
                console.error('Cube state invalid after scramble:', state.cubeState);
            }
            updateCubeView();
        }

        function applyMove(face, modifier) {
            const s = state.cubeState;

            // Helper to reverse an array
            const reverse = arr => [arr[2], arr[1], arr[0]];
            const reverse3 = arr => [arr[2], arr[1], arr[0]];

            // All moves from the perspective of looking at the face
            switch(face) {
                case 'R':
                    // R face: right columns of U, F, D, B
                    // R clockwise: U right column -> F right column -> D right column -> B left column (reversed)
                    if (modifier === "'") {
                        // R' - counter-clockwise
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse(temp);
                    } else if (modifier === '2') {
                        // R2 - 180 degrees
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse(temp);
                        const tempF = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = tempF;
                    } else {
                        // R - clockwise
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = temp;
                    }
                    rotateFace(s.R, modifier);
                    break;
                case 'L':
                    // L clockwise: U left column -> B right column (reversed) -> D left column -> F left column
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                        [s.D[0], s.D[3], s.D[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse(temp);
                        const tempF = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                        [s.D[0], s.D[3], s.D[6]] = tempF;
                    } else {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse([s.D[0], s.D[3], s.D[6]]);
                        [s.D[0], s.D[3], s.D[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = temp;
                    }
                    rotateFace(s.L, modifier);
                    break;
                case 'U':
                    // U clockwise: F top row -> R top row -> B top row -> L top row
                    if (modifier === "'") {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = temp;
                    } else if (modifier === '2') {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = temp;
                        const tempR = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = tempR;
                    } else {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = temp;
                    }
                    rotateFace(s.U, modifier);
                    break;
                case 'D':
                    // D clockwise: F bottom row -> L bottom row -> B bottom row -> R bottom row
                    if (modifier === "'") {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = temp;
                    } else if (modifier === '2') {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = temp;
                        const tempR = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = tempR;
                    } else {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = temp;
                    }
                    rotateFace(s.D, modifier);
                    break;
                case 'F':
                    // F clockwise: U bottom row -> R left column (reversed) -> D top row -> L right column (reversed)
                    if (modifier === "'") {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.R[0], s.R[3], s.R[6]]);
                        [s.R[0], s.R[3], s.R[6]] = [s.D[2], s.D[1], s.D[0]];
                        [s.D[0], s.D[1], s.D[2]] = reverse([s.L[8], s.L[5], s.L[2]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = [s.D[0], s.D[1], s.D[2]];
                        [s.D[0], s.D[1], s.D[2]] = temp;
                        const tempR = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.L[8], s.L[5], s.L[2]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse([s.D[2], s.D[1], s.D[0]]);
                        [s.D[0], s.D[1], s.D[2]] = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = temp;
                    }
                    rotateFace(s.F, modifier);
                    break;
                case 'B':
                    // B clockwise: U top row -> L left column (reversed) -> D bottom row -> R right column (reversed)
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[6], s.D[7], s.D[8]] = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = [s.D[6], s.D[7], s.D[8]];
                        [s.D[6], s.D[7], s.D[8]] = temp;
                        const tempR = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse([s.L[6], s.L[3], s.L[0]]);
                        [s.L[0], s.L[3], s.L[6]] = reverse(tempR);
                    } else {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = reverse([s.L[0], s.L[3], s.L[6]]);
                        [s.L[0], s.L[3], s.L[6]] = [s.D[8], s.D[7], s.D[6]];
                        [s.D[6], s.D[7], s.D[8]] = reverse([s.R[8], s.R[5], s.R[2]]);
                        [s.R[2], s.R[5], s.R[8]] = temp;
                    }
                    rotateFace(s.B, modifier);
                    break;
            }
        }

        function rotateFace(face, modifier) {
            if (modifier === "'") {
                // Counter-clockwise: rotate 270 degrees or 90 degrees CCW
                const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
                face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
                face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
                face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
            } else if (modifier === '2') {
                // 180 degrees
                const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
                face[0] = temp[8]; face[1] = temp[7]; face[2] = temp[6];
                face[3] = temp[5]; face[4] = temp[4]; face[5] = temp[3];
                face[6] = temp[2]; face[7] = temp[1]; face[8] = temp[0];
            } else {
                // Clockwise
                const temp = [face[0], face[1], face[2], face[3], face[4], face[5], face[6], face[7], face[8]];
                face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
                face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
                face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
            }
        }

        // Cube view mode (flat or 3d)
        let cubeViewMode = 'both';

        function validateCube() {
            const s = state.cubeState;
            const colors = ['white', 'yellow', 'green', 'blue', 'red', 'orange'];
            const counts = {};
            colors.forEach(c => counts[c] = 0);

            // Count all stickers
            Object.values(s).forEach(face => {
                face.forEach(color => {
                    if (counts[color] !== undefined) {
                        counts[color]++;
                    }
                });
            });

            // Check if each color has exactly 9 stickers
            let valid = true;
            colors.forEach(c => {
                if (counts[c] !== 9) {
                    console.error(`Invalid: ${c} has ${counts[c]} stickers (expected 9)`);
                    valid = false;
                }
            });
            return valid;
        }

        function toggleCubeView() {
            const cubeContainer = document.getElementById('cubeContainer');
            const btn = document.getElementById('cubeViewBtn');

            if (cubeViewMode === 'both') {
                cubeViewMode = 'flat';
                cubeContainer.classList.add('hidden-3d');
                btn.textContent = 'Show 3D View';
            } else if (cubeViewMode === 'flat') {
                cubeViewMode = '3d';
                cubeContainer.classList.remove('hidden-3d');
                cubeContainer.classList.add('hidden-flat');
                btn.textContent = 'Show Both';
            } else {
                cubeViewMode = 'both';
                cubeContainer.classList.remove('hidden-flat', 'hidden-3d');
                btn.textContent = 'Hide Flat View';
            }
            // Save preference
            localStorage.setItem('cubeViewMode', cubeViewMode);
        }

        function initCubeView() {
            const savedMode = localStorage.getItem('cubeViewMode');
            if (savedMode) {
                cubeViewMode = savedMode;
            }
            // Apply saved mode
            const cubeContainer = document.getElementById('cubeContainer');
            const btn = document.getElementById('cubeViewBtn');
            if (cubeViewMode === 'flat') {
                cubeContainer.classList.add('hidden-3d');
                btn.textContent = 'Show 3D View';
            } else if (cubeViewMode === '3d') {
                cubeContainer.classList.add('hidden-flat');
                btn.textContent = 'Show Both';
            } else {
                btn.textContent = 'Hide Flat View';
            }
        }

        function updateCubeView() {
            // Update all 6 faces of both views
            const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
            faces.forEach(face => {
                for (let i = 0; i < 9; i++) {
                    // Update flat view (scramble target) from cubeState
                    const cell = document.getElementById(face + i);
                    if (cell) {
                        cell.className = state.cubeState[face][i];
                    }
                    // Update 3D view (Bluetooth status) from btCubeState
                    const cell3d = document.getElementById(face + '3d' + i);
                    if (cell3d && state.btCubeState) {
                        cell3d.className = state.btCubeState[face][i];
                    }
                }
            });
        }

        function updateBtCubeView(move) {
            // Apply a single move to the Bluetooth 3D cube state
            if (!state.btCubeState) {
                resetBtCube();
            }
            applyBtMove(move.face, move.modifier);
            updateCubeView();
        }

        function applyBtMove(face, modifier) {
            // Apply move to btCubeState (same logic as applyMove but for Bluetooth state)
            const s = state.btCubeState;
            const reverse = arr => [arr[2], arr[1], arr[0]];

            switch(face) {
                case 'R':
                    if (modifier === "'") {
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse(temp);
                        const tempF = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = tempF;
                    } else {
                        const temp = [s.U[2], s.U[5], s.U[8]];
                        [s.U[2], s.U[5], s.U[8]] = reverse([s.B[6], s.B[3], s.B[0]]);
                        [s.B[6], s.B[3], s.B[0]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = temp;
                    }
                    rotateFace(s.R, modifier);
                    break;
                case 'L':
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                        [s.D[0], s.D[3], s.D[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse(temp);
                        const tempF = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = [s.D[0], s.D[3], s.D[6]];
                        [s.D[0], s.D[3], s.D[6]] = tempF;
                    } else {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[8], s.B[5], s.B[2]]);
                        [s.B[8], s.B[5], s.B[2]] = reverse([s.D[0], s.D[3], s.D[6]]);
                        [s.D[0], s.D[3], s.D[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = temp;
                    }
                    rotateFace(s.L, modifier);
                    break;
                case 'U':
                    if (modifier === "'") {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = temp;
                    } else if (modifier === '2') {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = temp;
                        const tempR = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = tempR;
                    } else {
                        const temp = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = [s.R[0], s.R[1], s.R[2]];
                        [s.R[0], s.R[1], s.R[2]] = [s.B[0], s.B[1], s.B[2]];
                        [s.B[0], s.B[1], s.B[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = temp;
                    }
                    rotateFace(s.U, modifier);
                    break;
                case 'D':
                    if (modifier === "'") {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = temp;
                    } else if (modifier === '2') {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = temp;
                        const tempR = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = tempR;
                    } else {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.L[6], s.L[7], s.L[8]];
                        [s.L[6], s.L[7], s.L[8]] = [s.B[6], s.B[7], s.B[8]];
                        [s.B[6], s.B[7], s.B[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = temp;
                    }
                    rotateFace(s.D, modifier);
                    break;
                case 'F':
                    if (modifier === "'") {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.R[0], s.R[3], s.R[6]]);
                        [s.R[0], s.R[3], s.R[6]] = [s.D[2], s.D[1], s.D[0]];
                        [s.D[0], s.D[1], s.D[2]] = reverse([s.L[8], s.L[5], s.L[2]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = [s.D[0], s.D[1], s.D[2]];
                        [s.D[0], s.D[1], s.D[2]] = temp;
                        const tempR = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.L[8], s.L[5], s.L[2]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse([s.D[2], s.D[1], s.D[0]]);
                        [s.D[0], s.D[1], s.D[2]] = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = temp;
                    }
                    rotateFace(s.F, modifier);
                    break;
                case 'B':
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[6], s.D[7], s.D[8]] = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = [s.D[6], s.D[7], s.D[8]];
                        [s.D[6], s.D[7], s.D[8]] = temp;
                        const tempR = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse([s.L[6], s.L[3], s.L[0]]);
                        [s.L[0], s.L[3], s.L[6]] = reverse(tempR);
                    } else {
                        const temp = [s.U[0], s.U[1], s.U[2]];
                        [s.U[0], s.U[1], s.U[2]] = reverse([s.L[0], s.L[3], s.L[6]]);
                        [s.L[0], s.L[3], s.L[6]] = [s.D[8], s.D[7], s.D[6]];
                        [s.D[6], s.D[7], s.D[8]] = reverse([s.R[8], s.R[5], s.R[2]]);
                        [s.R[2], s.R[5], s.R[8]] = temp;
                    }
                    rotateFace(s.B, modifier);
                    break;
            }
        }

// Expose to window for inline HTML and other modules
window.buildThreeJsCube = buildThreeJsCube;
window.resetCube = resetCube;
window.initThreeJs = initThreeJs;
window.createCubie = createCubie;
window.applyMove = applyMove;
window.animateThreeJs = animateThreeJs;
window.toggleCubeView = toggleCubeView;
window.applyBtMove = applyBtMove;
window.updateBtCubeView = updateBtCubeView;
window.initCube = initCube;
window.initCubeView = initCubeView;
window.validateCube = validateCube;
window.updateCubeView = updateCubeView;
window.setupCubeInteraction = setupCubeInteraction;
window.resetBtCube = resetBtCube;
window.applyScrambleToCube = applyScrambleToCube;
window.rotateFace = rotateFace;
