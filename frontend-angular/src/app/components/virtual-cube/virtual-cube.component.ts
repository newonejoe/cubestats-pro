import { Component, inject, AfterViewInit, OnDestroy, OnInit, ViewChild, ElementRef, computed, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { StateService, CubeState, Theme } from '../../services/state.service';

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

// Theme background colors (both for CSS and Three.js)
const THEME_BACKGROUNDS: Record<Theme, string> = {
  'white': '#eeffcb',
  'black': '#1a1a1a'
};

const THEME_BACKGROUNDS_HEX: Record<Theme, number> = {
  'white': 0xeeffcb,
  'black': 0x1a1a1a
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


const BORDER_LINE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x000000,
  linewidth: 1   // note: linewidth >1 only works in WebGL1 on some drivers
});


@Component({
  selector: 'app-virtual-cube',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cube-container" #cubeContainer [class.theme-black]="isBlackTheme">
      <canvas #cubeCanvas></canvas>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .cube-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      background: #eeffcb;
      border-radius: 4px;
      overflow: hidden;
      transition: background-color 0.3s;
    }
    .cube-container.theme-black {
      background: #1a1a1a;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class VirtualCubeComponent implements OnInit, AfterViewInit, OnDestroy {
  private state = inject(StateService);

  @ViewChild('cubeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cubeContainer') containerRef!: ElementRef<HTMLElement>;

  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.PerspectiveCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private cubeGroup!: THREE.Group;
  private animationId: number = 0;
  private resizeObserver?: ResizeObserver;

  private lastBtState: string = '';
  private lastVirtualState: string = '';
  private lastTheme: Theme = 'white';
  private currentTheme: Theme = 'white';

  // Computed theme for reactivity
  get isBlackTheme(): boolean {
    return this.state.settings().theme === 'black';
  }

  ngOnInit(): void {
    // Set initial state tracking
    this.lastVirtualState = JSON.stringify(this.state.cubeState());
    this.lastBtState = JSON.stringify(this.state.btCubeState());
    this.lastTheme = this.state.settings().theme;
    this.currentTheme = this.lastTheme;
  }

  ngAfterViewInit(): void {
    try {
      this.initThreeJs();
      this.buildThreeJsCube();

      // Check for theme changes
      setInterval(() => {
        this.checkForStateChange();
        this.checkForThemeChange();
      }, 100);

      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.containerRef.nativeElement);
    } catch (e) {
      console.error('[VirtualCube] Error in ngAfterViewInit:', e);
    }
  }

  private checkForThemeChange(): void {
    const newTheme = this.state.settings().theme;
    if (newTheme !== this.lastTheme) {
      this.lastTheme = newTheme;
      this.currentTheme = newTheme;
      this.updateBackgroundColor();
    }
  }

  private updateBackgroundColor(): void {
    if (this.threeScene) {
      const bgColor = THEME_BACKGROUNDS_HEX[this.currentTheme] || THEME_BACKGROUNDS_HEX['white'];
      this.threeScene.background = new THREE.Color(bgColor);
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.resizeObserver?.disconnect();
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  }

  private checkForStateChange(): void {
    const currentBtState = JSON.stringify(this.state.btCubeState());
    const currentVirtualState = JSON.stringify(this.state.cubeState());

    if (currentBtState !== this.lastBtState || currentVirtualState !== this.lastVirtualState) {
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

  private handleResize(): void {
    if (!this.threeRenderer || !this.containerRef) return;
    const { clientWidth: w, clientHeight: h } = this.containerRef.nativeElement;
    if (w === 0 || h === 0) return;
    this.threeCamera.aspect = w / h;
    this.threeCamera.updateProjectionMatrix();
    this.threeRenderer.setSize(w, h);
  }

  private initThreeJs(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const w = container.clientWidth || 500;
    const h = container.clientHeight || 500;

    this.threeScene = new THREE.Scene();
    const bgColor = THEME_BACKGROUNDS_HEX[this.currentTheme] || THEME_BACKGROUNDS_HEX['white'];
    this.threeScene.background = new THREE.Color(bgColor);

    this.threeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.threeCamera.position.set(0, 0, 8);
    this.threeCamera.lookAt(0, 0, 0);

    this.threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.threeRenderer.setSize(w, h);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);

    this.cubeGroup = new THREE.Group();
    this.threeScene.add(this.cubeGroup);

    this.animate();
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
    const coreMaterial = new THREE.MeshBasicMaterial({
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
      cubie.add(this.createSticker(color, stickerSize, 1, 0, 0, -stickerOffset));
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
      cubie.add(this.createSticker(color, stickerSize, 0, 1, 0, -stickerOffset));
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
      cubie.add(this.createSticker(color, stickerSize, 0, 0, 1, -stickerOffset));
    }

    return cubie;
  }

  private createSticker(color: number, size: number, nx: number, ny: number, nz: number, offset: number): THREE.Group {
    const geometry = new THREE.PlaneGeometry(size, size);

    const fillMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide })
    );

    const edgesGeometry = new THREE.EdgesGeometry(geometry, 1);
    const borderLine = new THREE.LineSegments(edgesGeometry, BORDER_LINE_MATERIAL);
    borderLine.renderOrder = 1;

    const group = new THREE.Group();
    group.add(fillMesh);
    // group.add(borderMesh);
    group.add(borderLine);
    
    // Position the sticker
    group.position.set(nx * offset, ny * offset, nz * offset);

    // Rotate to face outward
    if (nx !== 0) group.rotation.y = nx * Math.PI / 2;
    if (ny !== 0) group.rotation.x = -ny * Math.PI / 2;
    if (nz === -1) group.rotation.y = Math.PI;

    return group;
  }
}
