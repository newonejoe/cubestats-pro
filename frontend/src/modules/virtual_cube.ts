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
            threeCamera.position.set(0, 0, 8);
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

	    // Add the axis helper
	    // const axesHelper = new THREE.AxesHelper(5);
	    // threeScene.add(axesHelper);

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
            const colorsOriginal = {
                white: 0xffffff,
                yellow: 0xffd500,
                red: 0xb71234,
                orange: 0xff5800,
                green: 0x009b48,
                blue: 0x0046ad,
                black: 0x111111
            };

	    // Color mapping
            const colors = {
                white: 0xffffff,
                yellow: 0xfffd05,
                red: 0xfe0100,
                orange: 0xfdab01,
                green: 0x00df00,
                blue: 0x0001fd,
                black: 0x111111
            };


            // Get colors from btCubeState if it exists
            const stateColors = state.btCubeState || {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };

            const getIdx = (y, z) => {
                const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                const col = z === -1 ? 2 : (z === 0 ? 1 : 0);
                return row * 3 + col;
            };

            // Kimi spec: GAP=0.05, ISO view: 25,-30
            const cubieSize = 0.95;
            const gap = 1; // gap at corners to see other faces

            // Create 27 cubies (3x3x3)
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        // Gather the colors for this specific cubie based on its position
                        const cubieColors = { ...colors }; // base colors for black core
                        
                        // Right face (x=1) -> R
                        if (x === 1) {
                            const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                            const col = z === -1 ? 2 : (z === 0 ? 1 : 0);
                            cubieColors.R = colors[stateColors.R[row * 3 + col]];
                        }
                        
                        // Left face (x=-1) -> L
                        if (x === -1) {
                            const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                            const col = z === 1 ? 2 : (z === 0 ? 1 : 0);
                            cubieColors.L = colors[stateColors.L[row * 3 + col]];
                        }
                        
                        // Up face (y=1) -> U
                        if (y === 1) {
                            const row = z === -1 ? 0 : (z === 0 ? 1 : 2);
                            const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
                            cubieColors.U = colors[stateColors.U[row * 3 + col]];
                        }
                        
                        // Down face (y=-1) -> D
                        if (y === -1) {
                            const row = z === 1 ? 0 : (z === 0 ? 1 : 2);
                            const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
                            cubieColors.D = colors[stateColors.D[row * 3 + col]];
                        }
                        
                        // Front face (z=1) -> F
                        if (z === 1) {
                            const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                            const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
                            cubieColors.F = colors[stateColors.F[row * 3 + col]];
                        }
                        
                        // Back face (z=-1) -> B
                        if (z === -1) {
                            const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                            const col = x === 1 ? 0 : (x === 0 ? 1 : 2);
                            cubieColors.B = colors[stateColors.B[row * 3 + col]];
                        }

                        const cubie = createCubie(x, y, z, cubieSize, cubieColors);
                        cubie.position.set(x * gap, y * gap, z * gap);
                        cubeGroup.add(cubie);
                    }
                }
            }

            // Tilt to show corner between top (white) and front (green)
            // Position cube so white-green edge is at center
            // White on top (y=1), Green in front (z=1), edge at x=0
            cubeGroup.position.y = 0;
            
            // Only set rotation if it's the initial build, otherwise keep user's rotation
            if (state.cubeRotation.x === -25 && state.cubeRotation.y === -45) {
                // Initialize default view similar to before
                // cubeGroup.rotation.x = Math.PI / 6; // ~30 deg
                // cubeGroup.rotation.y = -Math.PI / 4; // -45 deg
                cubeGroup.rotation.x = Math.PI / 4; // ~45 deg
            } else {
                cubeGroup.rotation.x = state.cubeRotation.x * Math.PI / 180;
                cubeGroup.rotation.y = state.cubeRotation.y * Math.PI / 180;
            }
        }

        function createCubie(x, y, z, size, colors) {
            const group = new THREE.Group();

            // Transparent core - only sticker visible, sticker has color on both sides
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshLambertMaterial({
                transparent: true,
                opacity: 0.0,
		depthWrite: false,
            });
            const cubie = new THREE.Mesh(geometry, material);
            group.add(cubie);

            // Sticker settings
            const stickerSize = size * 0.85;
            const stickerOffset = size / 2 + 0.01;

            // Right face (x = 1) - R
            if (x === 1 && colors.R !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.R, side: THREE.DoubleSide });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(stickerOffset, 0, 0);
                sticker.rotation.y = Math.PI / 2;
                group.add(sticker);
            }

            // Left face (x = -1) - L
            if (x === -1 && colors.L !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.L, side: THREE.DoubleSide  });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(-stickerOffset, 0, 0);
                sticker.rotation.y = -Math.PI / 2;
                group.add(sticker);
            }

            // Up face (y = 1) - U
            if (y === 1 && colors.U !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.U, side: THREE.DoubleSide  });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, stickerOffset, 0);
                sticker.rotation.x = -Math.PI / 2;
                group.add(sticker);
            }

            // Down face (y = -1) - D
            if (y === -1 && colors.D !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.D, side: THREE.DoubleSide  });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, -stickerOffset, 0);
                sticker.rotation.x = Math.PI / 2;
                group.add(sticker);
            }

            // Front face (z = 1) - F
            if (z === 1 && colors.F !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.F, side: THREE.DoubleSide  });
                const sticker = new THREE.Mesh(stickerGeo, stickerMat);
                sticker.position.set(0, 0, stickerOffset);
                group.add(sticker);
            }

            // Back face (z = -1) - B
            if (z === -1 && colors.B !== undefined) {
                const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
                const stickerMat = new THREE.MeshLambertMaterial({ color: colors.B, side: THREE.DoubleSide  });
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
            buildThreeJsCube();
        }

        function setBtCubeStateFromFacelets(facelets: string) {
            // facelets format: "UUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
            // U: 0-8, R: 9-17, F: 18-26, D: 27-35, L: 36-44, B: 45-53
            if (!facelets || facelets.length !== 54) {
                console.log('[VirtualCube] Invalid facelets:', facelets);
                return;
            }

            // Map facelet character to color
            const colorMap: { [key: string]: string } = {
                'U': 'white',
                'D': 'yellow',
                'R': 'red',
                'L': 'orange',
                'F': 'green',
                'B': 'blue'
            };

            state.btCubeState = {
                U: facelets.slice(0, 9).split('').map(c => colorMap[c] || 'white'),
                R: facelets.slice(9, 18).split('').map(c => colorMap[c] || 'red'),
                F: facelets.slice(18, 27).split('').map(c => colorMap[c] || 'green'),
                D: facelets.slice(27, 36).split('').map(c => colorMap[c] || 'yellow'),
                L: facelets.slice(36, 45).split('').map(c => colorMap[c] || 'orange'),
                B: facelets.slice(45, 54).split('').map(c => colorMap[c] || 'blue')
            };

            updateCubeView();
            buildThreeJsCube();
            console.log('[VirtualCube] Updated from facelets:', facelets);
        }

        // Callback for hardware drivers to update cube state from facelets
        (window as any).onGanCubeState = setBtCubeStateFromFacelets;

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
                    if (modifier === "'") {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = reverse(temp);
                        const tempR = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = reverse([s.B[0], s.B[3], s.B[6]]);
                        [s.B[0], s.B[3], s.B[6]] = temp;
                    }
                    rotateFace(s.R, modifier);
                    break;
                case 'L':
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = [s.B[2], s.B[5], s.B[8]];
                        [s.B[2], s.B[5], s.B[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = reverse(temp);
                        const tempR = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = [s.D[6], s.D[3], s.D[0]];
                        [s.D[6], s.D[3], s.D[0]] = reverse([s.F[0], s.F[3], s.F[6]]);
                        [s.F[0], s.F[3], s.F[6]] = temp;
                    }
                    rotateFace(s.L, modifier);
                    break;
                case 'U':
                    if (modifier === "'") {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = reverse(temp);
                        const tempR = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = reverse(tempR);
                    } else {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = reverse([s.R[2], s.R[1], s.R[0]]);
                        [s.R[2], s.R[1], s.R[0]] = temp;
                    }
                    rotateFace(s.U, modifier);
                    break;
                case 'D':
                    if (modifier === "'") {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = [s.L[8], s.L[7], s.L[6]];
                        [s.L[8], s.L[7], s.L[6]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = reverse(temp);
                        const tempR = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = reverse(tempR);
                    } else {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = [s.B[8], s.B[7], s.B[6]];
                        [s.B[8], s.B[7], s.B[6]] = reverse([s.R[6], s.R[7], s.R[8]]);
                        [s.R[6], s.R[7], s.R[8]] = temp;
                    }
                    rotateFace(s.D, modifier);
                    break;
                case 'F':
                    if (modifier === "'") {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = [s.L[2], s.L[5], s.L[8]];
                        [s.L[2], s.L[5], s.L[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = reverse(temp);
                        const tempR = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = [s.D[0], s.D[1], s.D[2]];
                        [s.D[0], s.D[1], s.D[2]] = reverse([s.R[0], s.R[3], s.R[6]]);
                        [s.R[0], s.R[3], s.R[6]] = temp;
                    }
                    rotateFace(s.F, modifier);
                    break;
                case 'B':
                    if (modifier === "'") {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = reverse(temp);
                        const tempR = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = [s.D[8], s.D[7], s.D[6]];
                        [s.D[8], s.D[7], s.D[6]] = reverse([s.L[0], s.L[3], s.L[6]]);
                        [s.L[0], s.L[3], s.L[6]] = temp;
                    }
                    rotateFace(s.B, modifier);
                    break;
            }
        }

        function rotateFace(face, modifier) {
            if (modifier === "'") {
                // Counter-clockwise: rotate 270 degrees or 90 degrees CCW
                const temp = [...face];
                face[0] = temp[2]; face[1] = temp[5]; face[2] = temp[8];
                face[3] = temp[1]; face[4] = temp[4]; face[5] = temp[7];
                face[6] = temp[0]; face[7] = temp[3]; face[8] = temp[6];
            } else if (modifier === '2') {
                // 180 degrees
                const temp = [...face];
                face[0] = temp[8]; face[1] = temp[7]; face[2] = temp[6];
                face[3] = temp[5]; face[4] = temp[4]; face[5] = temp[3];
                face[6] = temp[2]; face[7] = temp[1]; face[8] = temp[0];
            } else {
                // Clockwise
                const temp = [...face];
                face[0] = temp[6]; face[1] = temp[3]; face[2] = temp[0];
                face[3] = temp[7]; face[4] = temp[4]; face[5] = temp[1];
                face[6] = temp[8]; face[7] = temp[5]; face[8] = temp[2];
            }
        }

        function isCubeSolved(cubeState) {
            if (!cubeState) return false;
            const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
            for (const face of faces) {
                const firstColor = cubeState[face][0];
                for (let i = 1; i < 9; i++) {
                    if (cubeState[face][i] !== firstColor) return false;
                }
            }
            return true;
        }

        function isScrambleReached() {
            if (!state.btCubeState || !state.cubeState) return false;
            const faces = ['U', 'D', 'R', 'L', 'F', 'B'];
            for (const face of faces) {
                for (let i = 0; i < 9; i++) {
                    if (state.btCubeState[face][i] !== state.cubeState[face][i]) return false;
                }
            }
            return true;
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
        }

        function toggleScrambleTarget() {
            const flatPanel = document.getElementById('cubeFlatPanel');
            if (flatPanel) {
                flatPanel.classList.toggle('hidden');
            }
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
            // Update all 6 faces of flat view
            const faces = ['U', 'L', 'F', 'R', 'B', 'D'];
            faces.forEach(face => {
                for (let i = 0; i < 9; i++) {
                    // Update flat view (scramble target) from cubeState
                    const cell = document.getElementById(face + i);
                    if (cell) {
                        cell.className = state.cubeState[face][i];
                    }
                }
            });

            // Update 3D view (Bluetooth status) from btCubeState
            if (cubeGroup && state.btCubeState) {
                // Color mapping to map string colors back to hex values
                const colors = {
                    white: 0xffffff,
                    yellow: 0xffd500,
                    red: 0xb71234,
                    orange: 0xff5800,
                    green: 0x009b48,
                    blue: 0x0046ad
                };

                // Helper to set color of a facelet based on its position in the 3x3x3 grid
                // This requires iterating through the children of cubeGroup
                let childIdx = 0;
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        for (let z = -1; z <= 1; z++) {
                            const cubie = cubeGroup.children[childIdx];
                            
                            // Each cubie has 1 child (black core), and then faces
                            // We need to map (x,y,z) back to face and index
                            
                            // Right face (x = 1) -> R
                            if (x === 1) {
                                // Maps to R face. y:1..-1, z:-1..1 -> indices 0..8
                                // y=1: top row (0,1,2). y=0: mid row (3,4,5). y=-1: bot row (6,7,8)
                                // z=-1: back (2,5,8). z=0: mid (1,4,7). z=1: front (0,3,6)
                                // Actually standard R face looking at it: top-left is U-B, top-right is U-F
                                const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
                                const col = z === -1 ? 2 : (z === 0 ? 1 : 0);
                                const idx = row * 3 + col;
                                
                                // Find the red mesh in this cubie's children
                                // Note: first child is the core mesh, subsequent ones are stickers
                                // To make this simple, let's just clear and rebuild the cube
                            }
                            childIdx++;
                        }
                    }
                }
            }
        }

        function updateBtCubeView(move) {
            // Apply a single move to the Bluetooth 3D cube state
            if (!state.btCubeState) {
                resetBtCube();
            }
            applyBtMove(move.face, move.modifier);
            updateCubeView();
            // Rebuild the 3D model with the new state
            buildThreeJsCube();
        }

        function applyBtMove(face, modifier) {
            // Apply move to btCubeState (same logic as applyMove but for Bluetooth state)
            const s = state.btCubeState;
            const reverse = arr => [arr[2], arr[1], arr[0]];

            switch(face) {
                case 'R':
                    if (modifier === "'") {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = [s.F[2], s.F[5], s.F[8]];
                        [s.F[2], s.F[5], s.F[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.D[2], s.D[5], s.D[8]]);
                        [s.D[2], s.D[5], s.D[8]] = reverse(temp);
                        const tempR = [s.B[0], s.B[3], s.B[6]];
                        [s.B[0], s.B[3], s.B[6]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[8], s.U[5], s.U[2]];
                        [s.U[8], s.U[5], s.U[2]] = reverse([s.F[2], s.F[5], s.F[8]]);
                        [s.F[2], s.F[5], s.F[8]] = [s.D[2], s.D[5], s.D[8]];
                        [s.D[2], s.D[5], s.D[8]] = reverse([s.B[0], s.B[3], s.B[6]]);
                        [s.B[0], s.B[3], s.B[6]] = temp;
                    }
                    rotateFace(s.R, modifier);
                    break;
                case 'L':
                    if (modifier === "'") {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = [s.B[2], s.B[5], s.B[8]];
                        [s.B[2], s.B[5], s.B[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.D[6], s.D[3], s.D[0]]);
                        [s.D[6], s.D[3], s.D[0]] = reverse(temp);
                        const tempR = [s.F[0], s.F[3], s.F[6]];
                        [s.F[0], s.F[3], s.F[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[0], s.U[3], s.U[6]];
                        [s.U[0], s.U[3], s.U[6]] = reverse([s.B[2], s.B[5], s.B[8]]);
                        [s.B[2], s.B[5], s.B[8]] = [s.D[6], s.D[3], s.D[0]];
                        [s.D[6], s.D[3], s.D[0]] = reverse([s.F[0], s.F[3], s.F[6]]);
                        [s.F[0], s.F[3], s.F[6]] = temp;
                    }
                    rotateFace(s.L, modifier);
                    break;
                case 'U':
                    if (modifier === "'") {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = [s.L[0], s.L[1], s.L[2]];
                        [s.L[0], s.L[1], s.L[2]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.F[0], s.F[1], s.F[2]]);
                        [s.F[0], s.F[1], s.F[2]] = reverse(temp);
                        const tempR = [s.R[2], s.R[1], s.R[0]];
                        [s.R[2], s.R[1], s.R[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = reverse(tempR);
                    } else {
                        const temp = [s.B[2], s.B[1], s.B[0]];
                        [s.B[2], s.B[1], s.B[0]] = reverse([s.L[0], s.L[1], s.L[2]]);
                        [s.L[0], s.L[1], s.L[2]] = [s.F[0], s.F[1], s.F[2]];
                        [s.F[0], s.F[1], s.F[2]] = reverse([s.R[2], s.R[1], s.R[0]]);
                        [s.R[2], s.R[1], s.R[0]] = temp;
                    }
                    rotateFace(s.U, modifier);
                    break;
                case 'D':
                    if (modifier === "'") {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = [s.L[8], s.L[7], s.L[6]];
                        [s.L[8], s.L[7], s.L[6]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.B[8], s.B[7], s.B[6]]);
                        [s.B[8], s.B[7], s.B[6]] = reverse(temp);
                        const tempR = [s.R[6], s.R[7], s.R[8]];
                        [s.R[6], s.R[7], s.R[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = reverse(tempR);
                    } else {
                        const temp = [s.F[6], s.F[7], s.F[8]];
                        [s.F[6], s.F[7], s.F[8]] = reverse([s.L[8], s.L[7], s.L[6]]);
                        [s.L[8], s.L[7], s.L[6]] = [s.B[8], s.B[7], s.B[6]];
                        [s.B[8], s.B[7], s.B[6]] = reverse([s.R[6], s.R[7], s.R[8]]);
                        [s.R[6], s.R[7], s.R[8]] = temp;
                    }
                    rotateFace(s.D, modifier);
                    break;
                case 'F':
                    if (modifier === "'") {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = [s.L[2], s.L[5], s.L[8]];
                        [s.L[2], s.L[5], s.L[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.D[0], s.D[1], s.D[2]]);
                        [s.D[0], s.D[1], s.D[2]] = reverse(temp);
                        const tempR = [s.R[0], s.R[3], s.R[6]];
                        [s.R[0], s.R[3], s.R[6]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[6], s.U[7], s.U[8]];
                        [s.U[6], s.U[7], s.U[8]] = reverse([s.L[2], s.L[5], s.L[8]]);
                        [s.L[2], s.L[5], s.L[8]] = [s.D[0], s.D[1], s.D[2]];
                        [s.D[0], s.D[1], s.D[2]] = reverse([s.R[0], s.R[3], s.R[6]]);
                        [s.R[0], s.R[3], s.R[6]] = temp;
                    }
                    rotateFace(s.F, modifier);
                    break;
                case 'B':
                    if (modifier === "'") {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = [s.R[2], s.R[5], s.R[8]];
                        [s.R[2], s.R[5], s.R[8]] = reverse(temp);
                    } else if (modifier === '2') {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.D[8], s.D[7], s.D[6]]);
                        [s.D[8], s.D[7], s.D[6]] = reverse(temp);
                        const tempR = [s.L[0], s.L[3], s.L[6]];
                        [s.L[0], s.L[3], s.L[6]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = reverse(tempR);
                    } else {
                        const temp = [s.U[2], s.U[1], s.U[0]];
                        [s.U[2], s.U[1], s.U[0]] = reverse([s.R[2], s.R[5], s.R[8]]);
                        [s.R[2], s.R[5], s.R[8]] = [s.D[8], s.D[7], s.D[6]];
                        [s.D[8], s.D[7], s.D[6]] = reverse([s.L[0], s.L[3], s.L[6]]);
                        [s.L[0], s.L[3], s.L[6]] = temp;
                    }
                    rotateFace(s.B, modifier);
                    break;
            }
        }

        function initBtCubeFromState(ca, ea) {
            // Mapping from cstimer CubieCube ca/ea to 3D cube colors
            // Corners: URF(0), UFL(1), ULB(2), UBR(3), DFR(4), DLF(5), DBL(6), DRB(7)
            const cornerColors = [
                ['white', 'red', 'green'],    // URF
                ['white', 'green', 'orange'], // UFL
                ['white', 'orange', 'blue'],  // ULB
                ['white', 'blue', 'red'],     // UBR
                ['yellow', 'green', 'red'],   // DFR
                ['yellow', 'orange', 'green'],// DLF
                ['yellow', 'blue', 'orange'], // DBL
                ['yellow', 'red', 'blue']     // DRB
            ];
            const cornerIndices = [
                [{f:'U', i:8}, {f:'R', i:0}, {f:'F', i:2}], // URF
                [{f:'U', i:6}, {f:'F', i:0}, {f:'L', i:2}], // UFL
                [{f:'U', i:0}, {f:'L', i:0}, {f:'B', i:2}], // ULB
                [{f:'U', i:2}, {f:'B', i:0}, {f:'R', i:2}], // UBR
                [{f:'D', i:2}, {f:'F', i:8}, {f:'R', i:6}], // DFR
                [{f:'D', i:0}, {f:'L', i:8}, {f:'F', i:6}], // DLF
                [{f:'D', i:6}, {f:'B', i:8}, {f:'L', i:6}], // DBL
                [{f:'D', i:8}, {f:'R', i:8}, {f:'B', i:6}]  // DRB
            ];

            // Edges: UR(0), UF(1), UL(2), UB(3), DR(4), DF(5), DL(6), DB(7), FR(8), FL(9), BL(10), BR(11)
            const edgeColors = [
                ['white', 'red'],     // UR
                ['white', 'green'],   // UF
                ['white', 'orange'],  // UL
                ['white', 'blue'],    // UB
                ['yellow', 'red'],    // DR
                ['yellow', 'green'],  // DF
                ['yellow', 'orange'], // DL
                ['yellow', 'blue'],   // DB
                ['green', 'red'],     // FR
                ['green', 'orange'],  // FL
                ['blue', 'orange'],   // BL
                ['blue', 'red']       // BR
            ];
            const edgeIndices = [
                [{f:'U', i:5}, {f:'R', i:1}], // UR
                [{f:'U', i:7}, {f:'F', i:1}], // UF
                [{f:'U', i:3}, {f:'L', i:1}], // UL
                [{f:'U', i:1}, {f:'B', i:1}], // UB
                [{f:'D', i:5}, {f:'R', i:7}], // DR
                [{f:'D', i:1}, {f:'F', i:7}], // DF
                [{f:'D', i:3}, {f:'L', i:7}], // DL
                [{f:'D', i:7}, {f:'B', i:7}], // DB
                [{f:'F', i:5}, {f:'R', i:3}], // FR
                [{f:'F', i:3}, {f:'L', i:5}], // FL
                [{f:'B', i:5}, {f:'L', i:3}], // BL
                [{f:'B', i:3}, {f:'R', i:5}]  // BR
            ];

            const newState = {
                U: Array(9).fill('white'),
                D: Array(9).fill('yellow'),
                R: Array(9).fill('red'),
                L: Array(9).fill('orange'),
                F: Array(9).fill('green'),
                B: Array(9).fill('blue')
            };

            // Apply corners
            for (let i = 0; i < 8; i++) {
                const perm = ca[i] & 7;
                const ori = ca[i] >> 3;
                for (let j = 0; j < 3; j++) {
                    const mappedOri = (3 - ori + j) % 3;
                    const color = cornerColors[perm][mappedOri];
                    const pos = cornerIndices[i][j];
                    newState[pos.f][pos.i] = color;
                }
            }

            // Apply edges
            for (let i = 0; i < 12; i++) {
                const perm = ea[i] >> 1;
                const ori = ea[i] & 1;
                for (let j = 0; j < 2; j++) {
                    const mappedOri = (j + ori) % 2;
                    const color = edgeColors[perm][mappedOri];
                    const pos = edgeIndices[i][j];
                    newState[pos.f][pos.i] = color;
                }
            }

            state.btCubeState = newState;
            updateCubeView();
            // Rebuild the 3D model with the new state
            buildThreeJsCube();
        }

// Expose to window for inline HTML and other modules
window.initBtCubeFromState = initBtCubeFromState;
window.buildThreeJsCube = buildThreeJsCube;
window.resetCube = resetCube;
window.initThreeJs = initThreeJs;
window.createCubie = createCubie;
window.applyMove = applyMove;
window.animateThreeJs = animateThreeJs;
window.toggleCubeView = toggleCubeView;
window.toggleScrambleTarget = toggleScrambleTarget;
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
window.isCubeSolved = isCubeSolved;
window.isScrambleReached = isScrambleReached;
