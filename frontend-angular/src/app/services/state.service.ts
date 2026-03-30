import { Injectable, signal, computed, type WritableSignal, type Signal } from '@angular/core';
import { ALL_OLL_INDICES } from '../data/oll-cases';
import { ALL_PLL_INDICES } from '../data/pll-cases';

export interface CubeState {
  U: string[];
  D: string[];
  R: string[];
  L: string[];
  F: string[];
  B: string[];
}

export interface Settings {
  inspectionTime: number;
  sound: boolean;
}

export interface Solve {
  id?: number;
  time: number;
  date?: string;
  displayTime?: number;
  finalTime?: number | null;
  scramble: string;
  scrambleType?: string;
  ollCaseIndex?: number | null;
  pllCaseIndex?: number | null;
  f2lCaseIndex?: number | null;
  moveCount?: number;
  startTime?: string;
  endTime?: string;
  penalty?: number;
  dnf?: boolean;
  plus2?: boolean;
  sessionId?: number;
  inspectionTime?: number;
  // CFOP analysis
  crossTime?: number;
  crossEfficiency?: number;
  f2lTime?: number;
  f2lEfficiency?: number;
  ollTime?: number;
  ollCase?: string;
  ollAlgorithm?: string;
  ollRecognitionTime?: number;
  ollEfficiency?: number;
  PLLTime?: number;
  PLLCase?: string;
  PLLAlgorithm?: string;
  pllRecognitionTime?: number;
  pllEfficiency?: number;
  /** csTimer-style `U@0 R@120` move trace (optional; full history in IndexedDB) */
  moveTrace?: string;
}

export interface Session {
  id: number;
  name: string;
  createdAt?: string;
}

export type TimerStatus =
  | 'idle'           // No solve in progress
  | 'twisting'       // Phase 2: User twisting cube to match scramble
  | 'twisted'        // Cube matches scramble, waiting for inspection to start
  | 'inspecting'     // Phase 3: Inspection timer counting down
  | 'ready'          // Phase 3b: Inspection done, waiting for first move
  | 'solving';       // Phase 4: Timer running, solving

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // API Base
  readonly API_BASE = '/api';

  // Current user
  readonly currentUserId: WritableSignal<number> = signal<number>(2);
  readonly currentUserRole: WritableSignal<string> = signal<string>('User');

  // Timer state
  readonly timer: WritableSignal<number> = signal<number>(0);
  readonly status: WritableSignal<TimerStatus> = signal<TimerStatus>('idle');
  readonly inspectionTime: WritableSignal<number> = signal<number>(15);

  // Scramble state
  /**
   * For cstimer easyc (Cross): cross.getEasyCross(length) uses lenA = min(length%10,8),
   * lenB = min(⌊length/10⌋,8); cross HTM band is [min(lenA,lenB), max(lenA,lenB)] (see cross.js).
   * Value 80 ⇒ 0 and 8 ⇒ full 0–8 band. Default 20 ⇒ 0 and 2 ⇒ only easy crosses.
   */
  readonly scrambleLength: WritableSignal<number> = signal<number>(80);
  readonly scrambleType: WritableSignal<string> = signal<string>('wca');
  readonly scramble: WritableSignal<string> = signal<string>('');
  readonly scrambleSequence: WritableSignal<string[]> = signal<string[]>([]);
  readonly scrambleIndex: WritableSignal<number> = signal<number>(0);

  /**
   * Bluetooth twist phase: csTimer scrHinter-style display (regenerated move list + done count).
   * When null, UI uses scrambleSequence + scrambleProgress (prefix on original scramble).
   */
  readonly twistScrambleDisplay: WritableSignal<{ sequence: string[]; progress: number } | null> =
    signal(null);

  /** OLL: full csTimer pool (58 indices) vs custom enabled set */
  readonly ollSubsetMode: WritableSignal<'full' | 'subset'> = signal<'full' | 'subset'>('full');
  readonly ollEnabledIndices: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(
    new Set(ALL_OLL_INDICES)
  );
  /** Last generated OLL case index (csTimer oll_map), for recognition UI */
  readonly lastOllCaseIndex: WritableSignal<number | null> = signal<number | null>(null);

  /** PLL: full 21 cases vs custom */
  readonly pllSubsetMode: WritableSignal<'full' | 'subset'> = signal<'full' | 'subset'>('full');
  readonly pllEnabledIndices: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(
    new Set(ALL_PLL_INDICES)
  );
  readonly lastPllCaseIndex: WritableSignal<number | null> = signal<number | null>(null);

  /** F2L (csTimer lsll2 = Last Slot + Last Layer): full vs custom */
  readonly f2lSubsetMode: WritableSignal<'full' | 'subset'> = signal<'full' | 'subset'>('full');
  readonly f2lEnabledIndices: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(new Set());
  readonly lastF2lCaseIndex: WritableSignal<number | null> = signal<number | null>(null);

  // Twisting phase: user moves during twist phase
  readonly userTwistMoves: WritableSignal<string[]> = signal<string[]>([]);
  readonly scrambleProgress: WritableSignal<number> = signal<number>(0);
  readonly scramblePendingHalfMove: WritableSignal<string | null> = signal<string | null>(null);
  readonly matchedUserMoves: WritableSignal<string[]> = signal<string[]>([]);

  // Solves and session
  readonly solves: WritableSignal<Solve[]> = signal<Solve[]>([]);
  readonly currentSession: WritableSignal<Session | null> = signal<Session | null>(null);
  readonly currentSolve: WritableSignal<Solve | null> = signal<Solve | null>(null);

  // Bluetooth
  readonly cubeConnected: WritableSignal<boolean> = signal<boolean>(false);
  readonly btCubeState: WritableSignal<CubeState | null> = signal<CubeState | null>(null);

  // Cube state
  readonly cubeState: WritableSignal<CubeState> = signal<CubeState>({
    U: Array(9).fill('white'),
    D: Array(9).fill('yellow'),
    R: Array(9).fill('red'),
    L: Array(9).fill('orange'),
    F: Array(9).fill('green'),
    B: Array(9).fill('blue')
  });

  // Scramble target state (cube state after applying scramble)
  readonly scrambleTargetState: WritableSignal<CubeState | null> = signal<CubeState | null>(null);

  // Solved state for comparison (standard solved state)
  readonly solvedState: CubeState = {
    U: Array(9).fill('white'),
    D: Array(9).fill('yellow'),
    R: Array(9).fill('red'),
    L: Array(9).fill('orange'),
    F: Array(9).fill('green'),
    B: Array(9).fill('blue')
  };

  readonly cubeRotation: WritableSignal<{ x: number; y: number }> = signal<{ x: number; y: number }>({ x: -25, y: -45 });

  // Settings
  readonly settings: WritableSignal<Settings> = signal<Settings>({
    inspectionTime: 15,
    sound: true
  });

  // Intervals (not signals, just refs)
  timerInterval: ReturnType<typeof setInterval> | null = null;
  inspectionInterval: ReturnType<typeof setInterval> | null = null;

  // Computed values
  readonly isSolving: Signal<boolean> = computed(() => this.status() === 'solving');
  readonly isInspecting: Signal<boolean> = computed(() => this.status() === 'inspecting');
  readonly isReady: Signal<boolean> = computed(() => this.status() === 'ready');

  constructor() {
    this.initializeCubeState();
    this.loadSubsetTrainingPrefs();
  }

  private loadSubsetTrainingPrefs(): void {
    try {
      const om = localStorage.getItem('ollSubsetMode');
      if (om === 'full' || om === 'subset') {
        this.ollSubsetMode.set(om);
      }
      const oe = localStorage.getItem('ollEnabledIndices');
      if (oe) {
        const arr = JSON.parse(oe) as number[];
        if (Array.isArray(arr)) {
          this.ollEnabledIndices.set(new Set(arr.filter((n) => typeof n === 'number')));
        }
      }
      const pm = localStorage.getItem('pllSubsetMode');
      if (pm === 'full' || pm === 'subset') {
        this.pllSubsetMode.set(pm);
      }
      const pe = localStorage.getItem('pllEnabledIndices');
      if (pe) {
        const arr = JSON.parse(pe) as number[];
        if (Array.isArray(arr)) {
          this.pllEnabledIndices.set(new Set(arr.filter((n) => typeof n === 'number')));
        }
      }
      const fm = localStorage.getItem('f2lSubsetMode');
      if (fm === 'full' || fm === 'subset') {
        this.f2lSubsetMode.set(fm);
      }
      const fe = localStorage.getItem('f2lEnabledIndices');
      if (fe) {
        const arr = JSON.parse(fe) as number[];
        if (Array.isArray(arr)) {
          this.f2lEnabledIndices.set(new Set(arr.filter((n) => typeof n === 'number')));
        }
      }
    } catch {
      // defaults
    }
  }

  persistOllSubsetPrefs(): void {
    localStorage.setItem('ollSubsetMode', this.ollSubsetMode());
    localStorage.setItem('ollEnabledIndices', JSON.stringify([...this.ollEnabledIndices()]));
  }

  persistPllSubsetPrefs(): void {
    localStorage.setItem('pllSubsetMode', this.pllSubsetMode());
    localStorage.setItem('pllEnabledIndices', JSON.stringify([...this.pllEnabledIndices()]));
  }

  persistF2lSubsetPrefs(): void {
    localStorage.setItem('f2lSubsetMode', this.f2lSubsetMode());
    localStorage.setItem('f2lEnabledIndices', JSON.stringify([...this.f2lEnabledIndices()]));
  }

  private initializeCubeState(): void {
    const saved = localStorage.getItem('cubeState');
    if (saved) {
      try {
        this.cubeState.set(JSON.parse(saved));
      } catch {
        // Use default
      }
    }
  }

  saveCubeState(state: CubeState): void {
    this.cubeState.set(state);
    localStorage.setItem('cubeState', JSON.stringify(state));
  }

  resetCubeState(): void {
    const defaultState: CubeState = {
      U: Array(9).fill('white'),
      D: Array(9).fill('yellow'),
      R: Array(9).fill('red'),
      L: Array(9).fill('orange'),
      F: Array(9).fill('green'),
      B: Array(9).fill('blue')
    };
    this.saveCubeState(defaultState);
  }
}
