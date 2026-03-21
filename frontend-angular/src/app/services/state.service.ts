import { Injectable, signal, computed, type WritableSignal, type Signal } from '@angular/core';

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
  displayTime?: number;
  finalTime?: number | null;
  scramble: string;
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
}

export interface Session {
  id: number;
  name: string;
  createdAt?: string;
}

export type TimerStatus = 'idle' | 'inspection' | 'ready' | 'solving';

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
  readonly scrambleLength: WritableSignal<number> = signal<number>(20);
  readonly scrambleType: WritableSignal<string> = signal<string>('wca');
  readonly scramble: WritableSignal<string> = signal<string>('');
  readonly scrambleSequence: WritableSignal<string[]> = signal<string[]>([]);
  readonly scrambleIndex: WritableSignal<number> = signal<number>(0);

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
  readonly isInspecting: Signal<boolean> = computed(() => this.status() === 'inspection');
  readonly isReady: Signal<boolean> = computed(() => this.status() === 'ready');

  constructor() {
    // Initialize cube state in localStorage for reference
    this.initializeCubeState();
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
