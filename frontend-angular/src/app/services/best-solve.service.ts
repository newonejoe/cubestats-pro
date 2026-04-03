import { Injectable, signal } from '@angular/core';
import { CaseType, getAlgorithms } from '../data/best-solve-data';

export interface CaseBestSolve {
  caseType: CaseType;
  caseIndex: number;
  selectedSolve: number;
  execTarget: number | null;
  execBest: number | null;
}

interface StorageData {
  selectedSolves: Record<string, number>;
  execTargets: Record<string, number>;
}

const STORAGE_KEY = 'cubestats_best_solve';

@Injectable({
  providedIn: 'root'
})
export class BestSolveService {
  private selectedSolves = signal<Record<string, number>>({});
  private execTargets = signal<Record<string, number>>({});

  constructor() {
    this.loadFromStorage();
  }

  private makeKey(type: CaseType, index: number): string {
    return `${type}:${index}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StorageData = JSON.parse(stored);
        this.selectedSolves.set(data.selectedSolves ?? {});
        this.execTargets.set(data.execTargets ?? {});
      }
    } catch {
      // Ignore parsing errors
    }
  }

  private saveToStorage(): void {
    try {
      const data: StorageData = {
        selectedSolves: this.selectedSolves(),
        execTargets: this.execTargets()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Get selected solve index for a case
   */
  getSelectedSolve(type: CaseType, index: number): number {
    const key = this.makeKey(type, index);
    return this.selectedSolves()[key] ?? 0;
  }

  /**
   * Set selected solve index for a case
   */
  setSelectedSolve(type: CaseType, index: number, solveIndex: number): void {
    const key = this.makeKey(type, index);
    const current = this.selectedSolves();
    this.selectedSolves.set({ ...current, [key]: solveIndex });
    this.saveToStorage();
  }

  /**
   * Get the selected algorithm string for a case
   */
  getSelectedAlgorithm(type: CaseType, index: number): string | null {
    const algs = getAlgorithms(type, index);
    if (!algs) return null;
    const selected = this.getSelectedSolve(type, index);
    return algs[selected] ?? algs[0] ?? null;
  }

  /**
   * Get all algorithms for a case
   */
  getAlgorithms(type: CaseType, index: number): string[] | null {
    return getAlgorithms(type, index);
  }

  /**
   * Check if case has algorithm data
   */
  hasAlgorithms(type: CaseType, index: number): boolean {
    return getAlgorithms(type, index) !== null;
  }

  /**
   * Get execution target for a case (in ms)
   */
  getExecTarget(type: CaseType, index: number): number | null {
    const key = this.makeKey(type, index);
    return this.execTargets()[key] ?? null;
  }

  /**
   * Set execution target for a case (in ms)
   */
  setExecTarget(type: CaseType, index: number, target: number | null): void {
    const key = this.makeKey(type, index);
    const current = this.execTargets();
    if (target === null) {
      const updated = { ...current };
      delete updated[key];
      this.execTargets.set(updated);
    } else {
      this.execTargets.set({ ...current, [key]: target });
    }
    this.saveToStorage();
  }

  /**
   * Get execution best from session history - to be called with computed data
   */
  getExecBest(type: CaseType, index: number, sessionSolves: { ollCase: number | null, pllCase: number | null, execMs: number | null }[]): number | null {
    let caseKey: number | null;
    if (type === 'oll') {
      caseKey = index;
    } else {
      caseKey = index;
    }

    const matching = sessionSolves.filter(s => {
      if (type === 'oll') {
        return s.ollCase === caseKey && s.execMs !== null;
      } else {
        return s.pllCase === caseKey && s.execMs !== null;
      }
    });

    if (matching.length === 0) return null;

    let best: number | null = null;
    for (const s of matching) {
      if (s.execMs !== null && (best === null || s.execMs < best)) {
        best = s.execMs;
      }
    }
    return best;
  }

  /**
   * Get all cases with their data
   */
  getAllCases(type: CaseType): CaseBestSolve[] {
    const result: CaseBestSolve[] = [];
    const maxIndex = type === 'oll' ? 57 : 20;

    for (let i = 1; i <= maxIndex; i++) {
      const algs = getAlgorithms(type, i);
      if (algs && algs.length > 0) {
        result.push({
          caseType: type,
          caseIndex: i,
          selectedSolve: this.getSelectedSolve(type, i),
          execTarget: this.getExecTarget(type, i),
          execBest: null // Will be computed separately
        });
      }
    }
    return result;
  }
}