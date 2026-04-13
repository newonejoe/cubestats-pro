import { Injectable, inject, computed, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalSolveStoreService } from './local-solve-store.service';
import {
  Solve,
  Session,
} from './state.service';
import {
  computeSessionSummaries,
  computeSessionStats,
  computeRollingAoBySolve,
  computeTrainingSummary,
  filterBySession,
  sortSolvesByMetric,
  finalMillis,
  solveTimestamp,
  type SessionSummary,
  type SessionStats,
  type RollingAoAtSolve,
  type TrainingSummary,
  type PrimaryMetric,
} from '../lib/analysis-selectors';
import { runCstimerCf4opRecons, cstimerReconsEngineReady, type CstimerCfopMacroRecons } from '../lib/cstimer-recons';
import { estimateCfopFromMoveTrace } from '../lib/move-trace-cfop';

/**
 * All possible metric values for a solve.
 * Pre-computed once per store revision.
 */
export interface SolveMetrics {
  // Basic
  time: number | null;              // finalTime or time with +2
  timestamp: number;                // solve order

  // CFOP phases (from recons or fallback)
  crossTime: number | null;
  f2lTime: number | null;
  ollTime: number | null;
  pllTime: number | null;

  // CFOP aggregated
  cfopInsp: number | null;          // sum of recognition times
  cfopExec: number | null;          // sum of execution times

  // Move-based
  htm: number | null;               // move count
  fps: number | null;               // moves / execution time
  fmc: number | null;               // moves / total time

  // Inspection (WCA)
  inspectionTime: number | null;    // from solve or default 15s
}

/**
 * Complete solve data including reconstruction and derived values.
 * This is the primary data structure returned by StatisticsService.
 */
export interface SolveAnalysis {
  /** Original solve data */
  solve: Solve;
  /** CFOP reconstruction (cached) */
  reconstruction: CstimerCfopMacroRecons | null;
  /** All pre-computed metric values */
  metrics: SolveMetrics;
}

/**
 * StatisticsService provides centralized computed signals for all analysis data.
 * Instead of computing metrics on-demand, it pre-computes all values in a single pass.
 */
@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly store = inject(LocalSolveStoreService);
  private readonly PLATFORM_ID = inject(PLATFORM_ID);

  // Current selected session ID (persisted to localStorage)
  private _selectedSessionId = signal<number | 'all'>('all');

  // Getter/setter for selected session with localStorage persistence
  get selectedSessionId(): number | 'all' {
    return this._selectedSessionId();
  }

  set selectedSessionId(value: number | 'all') {
    this._selectedSessionId.set(value);
    this.persistSessionId(value);
  }

  private persistSessionId(value: number | 'all'): void {
    if (isPlatformBrowser(this.PLATFORM_ID)) {
      localStorage.setItem('cubestats_selected_session', value === 'all' ? 'all' : String(value));
    }
  }

  private loadPersistedSessionId(): void {
    if (!isPlatformBrowser(this.PLATFORM_ID)) return;
    const saved = localStorage.getItem('cubestats_selected_session');
    console.log('Loaded persisted session ID:', saved);
    if (saved === 'all') {
      this._selectedSessionId.set('all');
    } else if (saved) {
      const id = parseInt(saved, 10);
      if (!isNaN(id)) {
        // We'll verify session exists after store is initialized
        // For now, set the ID - verification will happen in verifySelectedSession()
        this._selectedSessionId.set(id);
      }
    }
  }

  /**
   * Verify the selected session exists and is valid.
   * Call this after store initialization is complete.
   */
  verifySelectedSession(): void {
    const selectedId = this._selectedSessionId();
    console.log('Verifying selected session ID:', selectedId);
    if (selectedId === 'all') return;

    const sessions = this.store.getSessions();
    const exists = sessions.some(s => s.id === selectedId);
    if (!exists) {
      // Selected session no longer exists, default to first session or 'all'
      if (sessions.length > 0) {
        this._selectedSessionId.set(sessions[0]!.id);
      } else {
        this._selectedSessionId.set('all');
      }
      this.persistSessionId(this._selectedSessionId());
    }
  }

  // Initialize on construction
  constructor() {
    this.loadPersistedSessionId();
  }

  // Signal for template binding
  readonly selectedSessionIdSignal = computed(() => this._selectedSessionId());

  // Base: all solves (triggers recomputation when store changes)
  readonly allSolves = computed(() => {
    this.store.storeRevision();
    return this.store.getSolves();
  });

  // Base: all sessions
  readonly allSessions = computed((): Session[] => {
    return this.store.getSessions();
  });

  // Session summaries for all sessions
  readonly sessionSummaries = computed((): SessionSummary[] => {
    return computeSessionSummaries(this.allSolves());
  });

  // Training summary (cached, expensive)
  readonly trainingSummary = computed((): TrainingSummary => {
    return computeTrainingSummary(this.allSolves());
  });

  // Cache for session-filtered solves
  private solvesBySessionCache = new Map<number | 'all', Solve[]>();

  /**
   * Get solves filtered by session ID.
   * Results are cached per session - recomputes only when that session changes.
   */
  solvesBySession(sessionId: number | 'all'): Solve[] {
    if (this.solvesBySessionCache.has(sessionId)) {
      return this.solvesBySessionCache.get(sessionId)!;
    }

    const solves = sessionId === 'all'
      ? this.allSolves()
      : filterBySession(this.allSolves(), sessionId);

    this.solvesBySessionCache.set(sessionId, solves);
    return solves;
  }

  /**
   * Invalidate session caches (call when store changes).
   */
  private invalidateSessionCaches(): void {
    this.solvesBySessionCache.clear();
    this.sessionStatsCache.clear();
    this.rollingAoCache.clear();
    this.sortedSolvesCache.clear();
  }

  // Cache for session stats
  private sessionStatsCache = new Map<number | 'all', SessionStats>();

  /**
   * Get session statistics for a specific session.
   */
  sessionStats(sessionId: number | 'all'): SessionStats {
    if (this.sessionStatsCache.has(sessionId)) {
      return this.sessionStatsCache.get(sessionId)!;
    }

    const solves = this.solvesBySession(sessionId);
    const stats = computeSessionStats(solves);
    this.sessionStatsCache.set(sessionId, stats);
    return stats;
  }

  // Cache for rolling Ao
  private rollingAoCache = new Map<number | 'all', Map<Solve, RollingAoAtSolve>>();

  /**
   * Get rolling Ao by solve for a specific session.
   */
  rollingAo(sessionId: number | 'all'): Map<Solve, RollingAoAtSolve> {
    if (this.rollingAoCache.has(sessionId)) {
      return this.rollingAoCache.get(sessionId)!;
    }

    const solves = this.solvesBySession(sessionId);
    const rolling = computeRollingAoBySolve(solves);
    this.rollingAoCache.set(sessionId, rolling);
    return rolling;
  }

  // Cache for sorted solves
  private sortedSolvesCache = new Map<string, Solve[]>(); // key: `${sessionId}:${metric}`

  /**
   * Get solves sorted by a specific metric for a session.
   */
  sortedSolves(sessionId: number | 'all', metric: PrimaryMetric): Solve[] {
    const key = `${sessionId}:${metric}`;
    if (this.sortedSolvesCache.has(key)) {
      return this.sortedSolvesCache.get(key)!;
    }

    const solves = this.solvesBySession(sessionId);
    const sorted = sortSolvesByMetric(solves, metric);
    this.sortedSolvesCache.set(key, sorted);
    return sorted;
  }

  /**
   * Pre-computed analysis and metrics for all solves.
   * This runs once per store revision and caches all computations.
   */
  readonly solveAnalysisMap = computed((): Map<number, SolveAnalysis> => {
    const solves = this.allSolves();
    const ready = cstimerReconsEngineReady();
    const map = new Map<number, SolveAnalysis>();

    for (const solve of solves) {
      const solveId = solve.id ?? -1;
      let reconstruction: CstimerCfopMacroRecons | null = null;

      if (ready && solve.id != null) {
        reconstruction = runCstimerCf4opRecons(solve);
      }

      // Pre-compute all metrics for this solve
      const metrics = this.computeAllMetrics(solve, reconstruction);

      map.set(solveId, {
        solve,
        reconstruction,
        metrics,
      });
    }

    return map;
  });

  /**
   * Compute all metric values for a single solve.
   * This is the core computation that was duplicated across components.
   */
  private computeAllMetrics(solve: Solve, recons: CstimerCfopMacroRecons | null): SolveMetrics {
    // Helper to get execution time from recons or fallback
    const getExecMs = (phase: 'cross' | 'f2l' | 'oll' | 'pll'): number | null => {
      if (recons) {
        return recons[phase]?.executionMs ?? null;
      }
      // Fallback to estimateCfopFromMoveTrace
      const est = estimateCfopFromMoveTrace(solve.moveTrace);
      return est?.[phase]?.executionMs ?? null;
    };

    // 1. Basic time
    const time = finalMillis(solve);
    const timestamp = solveTimestamp(solve);

    // 2. CFOP phases - prefer stored, then recons, then estimate
    const crossTime = solve.crossTime ?? getExecMs('cross');
    const f2lTime = solve.f2lTime ?? getExecMs('f2l');
    const ollTime = solve.ollTime ?? getExecMs('oll');
    const pllTime = solve.PLLTime ?? getExecMs('pll');

    // 3. CFOP aggregated inspection time
    let cfopInsp: number | null = null;
    if (recons) {
      const totalInsp =
        (recons.cross?.recognitionMs ?? 0) +
        (recons.f2l?.recognitionMs ?? 0) +
        (recons.oll?.recognitionMs ?? 0) +
        (recons.pll?.recognitionMs ?? 0);
      cfopInsp = totalInsp > 0 ? totalInsp : null;
    }
    if (cfopInsp === null && solve.inspectionTime != null) {
      cfopInsp = solve.inspectionTime * 1000;
    }

    // 4. CFOP aggregated execution time
    const cfopExec = (crossTime != null ? crossTime : 0) +
      (f2lTime != null ? f2lTime : 0) +
      (ollTime != null ? ollTime : 0) +
      (pllTime != null ? pllTime : 0) || null;

    // 5. Move-based metrics
    const htm = solve.moveCount ?? null;
    let fps: number | null = null;
    if (htm != null && htm > 0 && cfopExec != null && cfopExec > 0) {
      fps = Math.round(htm / (cfopExec / 1000) * 10) / 10;
    }

    let fmc: number | null = null;
    if (htm != null && htm > 0 && time != null && time > 0) {
      fmc = Math.round(htm / (time / 60000) * 10) / 10;
    }

    // 6. Inspection time
    const inspectionTime = solve.inspectionTime != null
      ? solve.inspectionTime * 1000
      : null;

    return {
      time,
      timestamp,
      crossTime,
      f2lTime,
      ollTime,
      pllTime,
      cfopInsp,
      cfopExec,
      htm,
      fps,
      fmc,
      inspectionTime,
    };
  }

  /**
   * Get all metric values for a specific solve by ID.
   */
  getSolveMetrics(solveId: number): SolveMetrics | undefined {
    return this.solveAnalysisMap().get(solveId)?.metrics;
  }

  /**
   * Get analysis for a specific solve by ID.
   */
  getSolveAnalysis(solveId: number): SolveAnalysis | undefined {
    return this.solveAnalysisMap().get(solveId);
  }

  /**
   * Get analysis for multiple solves by IDs.
   */
  getSolveAnalyses(solveIds: number[]): SolveAnalysis[] {
    const map = this.solveAnalysisMap();
    return solveIds.map(id => map.get(id)).filter((a): a is SolveAnalysis => a !== undefined);
  }

  // Get current session (last selected session, or first session if none selected)
  getCurrentSession(): Session | undefined {
    const selectedId = this._selectedSessionId();
    const sessions = this.allSessions();

    if (selectedId === 'all') {
      return sessions[0]; // Default to first session
    }

    return sessions.find(s => s.id === selectedId) ?? sessions[0];
  }

  // Get sessions
  getSessions(): Session[] {
    return this.allSessions();
  }

  // Set selected session (triggers localStorage persistence)
  setSelectedSession(sessionId: number | 'all'): void {
    this.selectedSessionId = sessionId;
    // Invalidate caches when session changes
    this.solvesBySessionCache.clear();
    this.sessionStatsCache.clear();
    this.rollingAoCache.clear();
    this.sortedSolvesCache.clear();
  }
}