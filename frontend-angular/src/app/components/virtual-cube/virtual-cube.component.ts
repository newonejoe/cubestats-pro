import { Component, inject, AfterViewInit, OnDestroy, OnInit, WritableSignal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { CubeService } from '../../services/cube.service';
import { StateService, CubeState } from '../../services/state.service';

// WCA standard colors
const COLORS: Record<string, number> = {
  'white': 0xffffff,
  'yellow': 0xffd500,
  'red': 0xb71234,
  'orange': 0xff5800,
  'blue': 0x0046ad,
  'green': 0x009b48,
  'black': 0x111111
};

// Default solved state
const DEFAULT_STATE: CubeState = {
  U: Array(9).fill('white'),
  D: Array(9).fill('yellow'),
  R: Array(9).fill('red'),
  L: Array(9).fill('orange'),
  F: Array(9).fill('green'),
  B: Array(9).fill('blue')
};

@Component({
  selector: 'app-virtual-cube',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cube-container">
      <canvas id="threeJsCanvas" width="300" height="300"></canvas>
    </div>
  `,
  styles: [`
    .cube-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
      background: #1a1a2e;
      border-radius: 12px;
    }
    canvas {
      border-radius: 8px;
    }
  `]
})
export class VirtualCubeComponent implements OnInit, AfterViewInit, OnDestroy {
  private cubeService = inject(CubeService);
  private state = inject(StateService);

  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private cubeGroup!: THREE.Group;
  private animationId: number = 0;

  // Track previous state to detect changes
  private lastBtState: string = '';
  private lastVirtualState: string = '';

  ngOnInit(): void {
    // Set initial state tracking
    this.lastVirtualState = JSON.stringify(this.state.cubeState());
    this.lastBtState = JSON.stringify(this.state.btCubeState());
  }

  ngAfterViewInit(): void {
    try {
      console.log('[VirtualCube] ngAfterViewInit called');
      this.initThreeJs();
      this.buildThreeJsCube();

      // Poll for state changes instead of using effect()
      setInterval(() => {
        this.checkForStateChange();
      }, 100);
      console.log('[VirtualCube] Polling interval started');
    } catch (e) {
      console.error('[VirtualCube] Error in ngAfterViewInit:', e);
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  }

  private checkForStateChange(): void {
    const currentBtState = JSON.stringify(this.state.btCubeState());
    const currentVirtualState = JSON.stringify(this.state.cubeState());

    if (currentBtState !== this.lastBtState || currentVirtualState !== this.lastVirtualState) {
      console.log('[VirtualCube] State changed, rebuilding...', {
        btChanged: currentBtState !== this.lastBtState,
        vChanged: currentVirtualState !== this.lastVirtualState,
        bt: !!this.state.btCubeState(),
        v: !!this.state.cubeState()
      });
      this.lastBtState = currentBtState;
      this.lastVirtualState = currentVirtualState;
      this.buildThreeJsCube();
    }
  }

  // Get cube state - prefer Bluetooth state, fallback to virtual cube state
  private getCubeState(): CubeState {
    const btState = this.state.btCubeState();
    if (btState) return btState;
    const virtualState = this.state.cubeState();
    return virtualState || DEFAULT_STATE;
  }

  private initThreeJs(): void {
    const canvas = document.getElementById('threeJsCanvas');
    if (!canvas) {
      console.error('[VirtualCube] Canvas not found');
      return;
    }

    // Scene
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x14141f);

    // Camera
    this.threeCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.threeCamera.position.set(0, 0, 8);
    this.threeCamera.lookAt(0, 0, 0);

    // Renderer
    this.threeRenderer = new THREE.WebGLRenderer({ canvas: canvas as HTMLCanvasElement, antialias: true });
    this.threeRenderer.setSize(300, 300);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.threeScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.threeScene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    this.threeScene.add(directionalLight2);

    // Create cube group
    this.cubeGroup = new THREE.Group();
    this.threeScene.add(this.cubeGroup);

    // Start render loop
    this.animate();

    console.log('[VirtualCube] Three.js initialized');
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.threeRenderer.render(this.threeScene, this.threeCamera);
  };

  buildThreeJsCube(): void {
    if (!this.cubeGroup) return;

    // Clear existing
    while (this.cubeGroup.children.length > 0) {
      this.cubeGroup.remove(this.cubeGroup.children[0]);
    }

    const stateColors = this.getCubeState();
    const cubieSize = 0.95;

    console.log('[VirtualCube] Building cube with state:', stateColors);

    // Create 27 cubies (3x3x3)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = this.createCubie(x, y, z, stateColors, cubieSize);
          // Position the cubie in the 3D space
          cubie.position.set(x, y, z);
          this.cubeGroup.add(cubie);
        }
      }
    }

    // Set the cube group rotation for better initial view: to show edge between top and front faces
    this.cubeGroup.rotation.x = Math.PI / 4;
  }

  private createCubie(x: number, y: number, z: number, stateColors: CubeState, size: number): THREE.Group {
    const cubie = new THREE.Group();

    // Helper to get color from state
    const getFaceColor = (face: string, idx: number): number => {
      const colorName = stateColors[face as keyof CubeState]?.[idx];
      return COLORS[colorName?.toLowerCase() || 'black'] || COLORS['black'];
    };

    // Helper to calculate index based on position
    const getIdx = (row: number, col: number): number => row * 3 + col;

    // Create black core cubie (transparent)
    const geometry = new THREE.BoxGeometry(size, size, size);
    const coreMaterial = new THREE.MeshLambertMaterial({
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const coreMesh = new THREE.Mesh(geometry, coreMaterial);
    cubie.add(coreMesh);

    const stickerSize = size * 0.85;
    const stickerOffset = size / 2 + 0.001;

    // Right face (x=1) -> R
    if (x === 1) {
      const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
      const col = z === -1 ? 2 : (z === 0 ? 1 : 0);
      const color = getFaceColor('R', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, 1, 0, 0, stickerOffset));
    }

    // Left face (x=-1) -> L
    if (x === -1) {
      const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
      const col = z === 1 ? 2 : (z === 0 ? 1 : 0);
      const color = getFaceColor('L', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, -1, 0, 0, -stickerOffset));
    }

    // Up face (y=1) -> U
    if (y === 1) {
      const row = z === -1 ? 0 : (z === 0 ? 1 : 2);
      const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
      const color = getFaceColor('U', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, 0, 1, 0, stickerOffset));
    }

    // Down face (y=-1) -> D
    if (y === -1) {
      const row = z === 1 ? 0 : (z === 0 ? 1 : 2);
      const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
      const color = getFaceColor('D', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, 0, -1, 0, -stickerOffset));
    }

    // Front face (z=1) -> F
    if (z === 1) {
      const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
      const col = x === -1 ? 0 : (x === 0 ? 1 : 2);
      const color = getFaceColor('F', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, 0, 0, 1, stickerOffset));
    }

    // Back face (z=-1) -> B
    if (z === -1) {
      const row = y === 1 ? 0 : (y === 0 ? 1 : 2);
      const col = x === 1 ? 0 : (x === 0 ? 1 : 2);
      const color = getFaceColor('B', getIdx(row, col));
      cubie.add(this.createSticker(color, stickerSize, 0, 0, -1, -stickerOffset));
    }

    return cubie;
  }

  private createSticker(color: number, size: number, nx: number, ny: number, nz: number, offset: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);

    // Position the sticker
    mesh.position.set(nx * offset, ny * offset, nz * offset);

    // Rotate to face outward
    if (nx !== 0) mesh.rotation.y = nx * Math.PI / 2;
    if (ny !== 0) mesh.rotation.x = -ny * Math.PI / 2;
    if (nz === -1) mesh.rotation.y = Math.PI;

    return mesh;
  }
}
