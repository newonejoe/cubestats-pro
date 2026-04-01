import { Injectable, inject, signal } from '@angular/core';
import { Session, Solve } from './state.service';
import { computeAverageOfN, computeBest } from '../lib/analysis-selectors';
import {
  extraFromSolve,
  solveFromRecord,
  tupleFromSolve,
  type SessionSolveRecord
} from '../lib/cstimer-storage';
import { IndexedDbSessionStoreService } from './indexed-db-session-store.service';

const SESSIONS_KEY = 'analysis.sessions.v1';
const LEGACY_SOLVES_KEY = 'solves';
const LEGACY_ANALYSIS_SOLVES_KEY = 'analysis.solves.v1';
const MIGRATION_LS_TO_IDB_KEY = 'analysis.migration.lsToIdb.v1';

@Injectable({
  providedIn: 'root'
})
export class LocalSolveStoreService {
  private readonly idb = inject(IndexedDbSessionStoreService);

  private sessionIdSeq = 1;
  private solveIdSeq = 1;
  private memorySolves: Solve[] | null = null;
  private initDone = false;

  /** Bump after solves/sessions change so computed() readers re-run. */
  readonly storeRevision = signal(0);

  constructor() {
    this.migrateLegacySolvesKeyIntoAnalysisKey();
  }

  /**
   * Hydrates from IndexedDB and runs LS→IDB migration. Invoked via APP_INITIALIZER
   * in normal app bootstrap; await before any `getSolves()` if init may not have finished (e.g. tests).
   */
  async init(): Promise<void> {
    if (this.initDone) {
      return;
    }
    await this.idb.init();
    await this.migrateLocalStorageSolvesToIndexedDb();
    await this.hydrateMemoryFromIdb();
    this.initDone = true;
  }

  /** Uses IDB-backed memory after `init()`; otherwise legacy JSON from localStorage only. */
  getSolves(): Solve[] {
    if (this.memorySolves !== null) {
      return [...this.memorySolves].sort((a, b) => this.timeOf(b) - this.timeOf(a));
    }
    return this.readLegacyAnalysisSolvesSync();
  }

  async saveSolve(solve: Solve): Promise<Solve> {
    await this.ensureInit();
    const solves = this.getSolves();
    const saved: Solve = {
      ...solve,
      id: solve.id ?? this.nextSolveId(solves),
      date: solve.date ?? new Date().toISOString(),
    };
    const sessionId = saved.sessionId ?? 1;
    const endWallMs = Date.now();
    const moveTrace = saved.moveTrace ?? '';
    const tuple = tupleFromSolve(saved, { moveTrace, endWallMs });
    const record: SessionSolveRecord = {
      id: saved.id!,
      tuple,
      extra: extraFromSolve(saved),
    };
    await this.idb.appendRecord(sessionId, record);
    const merged: Solve = { ...saved, moveTrace: moveTrace || undefined };
    const prev = this.memorySolves ?? [];
    this.memorySolves = [merged, ...prev.filter((s) => s.id !== merged.id)];
    this.bumpStoreRevision();
    return merged;
  }

  async deleteSolve(solveId: number): Promise<void> {
    await this.ensureInit();
    await this.idb.deleteSolveById(solveId);
    await this.hydrateMemoryFromIdb();
  }

  getSessions(): Session[] {
    const sessions = this.readJson<Session[]>(SESSIONS_KEY, []);
    if (sessions.length === 0) {
      const def = this.createSession('Session 1');
      return [def];
    }
    return [...sessions].sort((a, b) => a.id - b.id);
  }

  createSession(name?: string): Session {
    const sessions = this.readJson<Session[]>(SESSIONS_KEY, []);
    const session: Session = {
      id: this.nextSessionId(sessions),
      name: name ?? `Session ${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    this.writeJson(SESSIONS_KEY, sessions);
    this.bumpStoreRevision();
    return session;
  }

  deleteSession(sessionId: number): void {
    const sessions = this.readJson<Session[]>(SESSIONS_KEY, []);
    const filtered = sessions.filter(s => s.id !== sessionId);
    this.writeJson(SESSIONS_KEY, filtered);
    this.bumpStoreRevision();
    // Also delete all solves for this session
    const solves = this.readJson<Solve[]>(LEGACY_ANALYSIS_SOLVES_KEY, []);
    const filteredSolves = solves.filter(s => s.sessionId !== sessionId);
    this.writeJson(LEGACY_ANALYSIS_SOLVES_KEY, filteredSolves);
    this.bumpStoreRevision();
  }

  getStatistics() {
    const solves = this.getSolves();
    return {
      currentTime: solves.length ? (solves[0].finalTime ?? solves[0].time) : null,
      ao5: computeAverageOfN(solves, 5),
      ao12: computeAverageOfN(solves, 12),
      ao100: computeAverageOfN(solves, 100),
      bestTime: computeBest(solves),
      solveCount: solves.length,
    };
  }

  exportCsv(): string {
    const rows = [
      ['id', 'date', 'sessionId', 'type', 'time', 'finalTime', 'dnf', 'plus2', 'scramble', 'moveTrace']
    ];
    for (const s of this.getSolves()) {
      rows.push([
        String(s.id ?? ''),
        s.date ?? s.endTime ?? '',
        String(s.sessionId ?? ''),
        s.scrambleType ?? '',
        String(s.time ?? ''),
        String(s.finalTime ?? ''),
        s.dnf ? '1' : '0',
        s.plus2 ? '1' : '0',
        `"${(s.scramble ?? '').replace(/"/g, '""')}"`,
        `"${(s.moveTrace ?? '').replace(/"/g, '""')}"`,
      ]);
    }
    return rows.map((r) => r.join(',')).join('\n');
  }

  /**
   * Export all sessions and solves as JSON
   */
  exportSessionsJson(): string {
    const data = {
      sessions: this.getSessions(),
      solves: this.getSolves(),
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import sessions and solves from JSON
   */
  importSessionsJson(json: string): { sessions: number; solves: number } {
    const data = JSON.parse(json) as {
      sessions: Session[];
      solves: Solve[];
      version?: number;
    };

    if (!Array.isArray(data.sessions) || !Array.isArray(data.solves)) {
      throw new Error('Invalid import data format');
    }

    // Merge sessions (keep existing, add new with new IDs)
    const existingSessions = this.readJson<Session[]>(SESSIONS_KEY, []);
    const existingIds = new Set(existingSessions.map(s => s.id));
    const newSessions = data.sessions.filter(s => !existingIds.has(s.id));
    const allSessions = [...existingSessions, ...newSessions];
    this.writeJson(SESSIONS_KEY, allSessions);
    this.bumpStoreRevision();

    // Merge solves (keep existing, add new)
    const existingSolves = this.readJson<Solve[]>(LEGACY_ANALYSIS_SOLVES_KEY, []);
    const existingSolveIds = new Set(existingSolves.map(s => s.id));
    const newSolves = data.solves.filter(s => s.id !== undefined && !existingSolveIds.has(s.id));
    const allSolves = [...existingSolves, ...newSolves];
    this.writeJson(LEGACY_ANALYSIS_SOLVES_KEY, allSolves);
    this.bumpStoreRevision();

    return { sessions: newSessions.length, solves: newSolves.length };
  }

  /**
   * Import sessions and solves from cstimer export format
   * Saves to IndexedDB so imported solves are included in OLL case stats
   */
  async importCstimerJson(json: string): Promise<{ sessions: number; solves: number }> {
    await this.ensureInit();

    // Get current max IDs from IDB to avoid collisions
    const flat = await this.idb.getAllRecordsFlat();
    let maxSolveId = 0;
    for (const { record } of flat) {
      if (record.id > maxSolveId) maxSolveId = record.id;
    }

    const data = JSON.parse(json);

    // Parse session properties to get session names
    const sessionNames: Record<string, string> = {};
    if (data.properties?.sessionData) {
      const sessionData = JSON.parse(data.properties.sessionData);
      for (const [id, info] of Object.entries(sessionData)) {
        const si = info as { name?: string };
        if (si.name) {
          sessionNames[id] = si.name;
        }
      }
    }

    // Get current max session IDs to avoid collisions
    const existingSessions = this.readJson<Session[]>(SESSIONS_KEY, []);
    let maxSessionId = Math.max(0, ...existingSessions.map(s => s.id));

    const newSessions: Session[] = [];

    // Process each session in cstimer data
    for (const [key, value] of Object.entries(data)) {
      if (!key.startsWith('session')) continue;
      const sessionSolves = value as unknown[][];
      if (!Array.isArray(sessionSolves) || sessionSolves.length === 0) continue;

      // Extract session number from key (e.g., "session16" -> 16)
      const sessionNum = key.replace('session', '');
      const sessionName = sessionNames[sessionNum] || `Import ${sessionNum}`;

      // Create new session
      maxSessionId++;
      const sessionId = maxSessionId;
      const session: Session = {
        id: sessionId,
        name: sessionName,
        createdAt: new Date().toISOString(),
      };
      newSessions.push(session);

      // Process solves in this session and save to IndexedDB
      for (const solveData of sessionSolves) {
        if (!Array.isArray(solveData) || solveData.length < 2) continue;

        const optTime = solveData[0] as [number[], number];
        const options = optTime[0];
        const time = optTime[1];

        const scramble = (solveData[1] as string) || '';
        const timestamp = (solveData[3] as number) || 0;
        const traceAndType = solveData[4] as [string, string];
        const moveTrace = traceAndType?.[0] || '';
        const type = traceAndType?.[1] || '333';

        const isDnf = options[0] === 0;
        const isPlus2 = options[1] === 2;

        const endWallMs = timestamp > 0 ? timestamp * 1000 : Date.now();

        // Generate unique ID for this solve
        maxSolveId++;
        const solveId = maxSolveId;

        const solve: Solve = {
          id: solveId,
          sessionId,
          scramble,
          scrambleType: type === '333' ? 'wca' : type,
          time,
          finalTime: isDnf ? null : (isPlus2 ? time + 2000 : time),
          dnf: isDnf,
          plus2: isPlus2,
          moveTrace,
          date: timestamp > 0 ? new Date(timestamp * 1000).toISOString() : undefined,
          endTime: timestamp > 0 ? new Date(timestamp * 1000).toISOString() : undefined,
        };

        // Save to IndexedDB (similar to saveSolve)
        const tuple = tupleFromSolve(solve, { moveTrace, endWallMs });
        const record: SessionSolveRecord = {
          id: solveId,
          tuple,
          extra: extraFromSolve(solve),
        };
        await this.idb.appendRecord(sessionId, record);
      }
    }

    // Save new sessions to localStorage
    const allSessions = [...existingSessions, ...newSessions];
    this.writeJson(SESSIONS_KEY, allSessions);
    this.bumpStoreRevision();

    // Refresh memory solves from IDB
    await this.hydrateMemoryFromIdb();

    // Count imported solves
    let totalSolves = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('session')) {
        totalSolves += (value as unknown[][]).length;
      }
    }

    return { sessions: newSessions.length, solves: totalSolves };
  }

  private async ensureInit(): Promise<void> {
    if (!this.initDone) {
      await this.init();
    }
  }

  private async hydrateMemoryFromIdb(): Promise<void> {
    const flat = await this.idb.getAllRecordsFlat();
    const solves: Solve[] = flat.map(({ sessionId, record }) => solveFromRecord(record, sessionId));
    this.memorySolves = solves;
    this.bumpStoreRevision();
  }

  private bumpStoreRevision(): void {
    this.storeRevision.update((n) => n + 1);
  }

  private migrateLegacySolvesKeyIntoAnalysisKey(): void {
    const hasNew = localStorage.getItem(LEGACY_ANALYSIS_SOLVES_KEY);
    if (hasNew) {
      return;
    }
    const legacy = this.readJson<unknown[]>(LEGACY_SOLVES_KEY, []);
    if (legacy.length > 0) {
      this.writeJson(LEGACY_ANALYSIS_SOLVES_KEY, legacy);
    }
  }

  private readLegacyAnalysisSolvesSync(): Solve[] {
    const raw = this.readJson<Array<Record<string, unknown>>>(LEGACY_ANALYSIS_SOLVES_KEY, []);
    if (raw.length === 0) {
      return [];
    }
    return raw.map((s, idx) => ({
      id: Number(s['id'] ?? idx + 1),
      time: Number(s['time'] ?? 0),
      finalTime: s['dnf'] ? null : Number(s['plus2'] ? Number(s['time'] ?? 0) + 2000 : Number(s['time'] ?? 0)),
      scramble: String(s['scramble'] ?? ''),
      moveCount: Number(s['moveCount'] ?? 0),
      dnf: Boolean(s['dnf']),
      plus2: Boolean(s['plus2']),
      date: String(s['date'] ?? new Date().toISOString()),
      sessionId: Number(s['sessionId'] ?? 1),
      scrambleType: String(s['scrambleType'] ?? 'wca'),
    }));
  }

  private async migrateLocalStorageSolvesToIndexedDb(): Promise<void> {
    if (localStorage.getItem(MIGRATION_LS_TO_IDB_KEY) === '1') {
      return;
    }
    const legacy = this.readJson<Solve[]>(LEGACY_ANALYSIS_SOLVES_KEY, []);
    if (legacy.length === 0) {
      localStorage.setItem(MIGRATION_LS_TO_IDB_KEY, '1');
      return;
    }
    let maxId = 0;
    const bySession = new Map<number, SessionSolveRecord[]>();
    for (const s of legacy) {
      const sid = s.sessionId ?? 1;
      const id = s.id ?? ++maxId;
      maxId = Math.max(maxId, id);
      const endMs = Date.parse(s.date ?? s.endTime ?? '') || Date.now();
      const tuple = tupleFromSolve(s, { moveTrace: s.moveTrace ?? '', endWallMs: endMs });
      const rec: SessionSolveRecord = { id, tuple, extra: extraFromSolve(s) };
      const arr = bySession.get(sid) ?? [];
      arr.push(rec);
      bySession.set(sid, arr);
    }
    for (const [, arr] of bySession) {
      arr.sort((a, b) => b.id - a.id);
    }
    await this.idb.replaceAllForMigration(bySession);
    localStorage.removeItem(LEGACY_ANALYSIS_SOLVES_KEY);
    localStorage.setItem(MIGRATION_LS_TO_IDB_KEY, '1');
  }

  private nextSolveId(existing: Solve[]): number {
    this.solveIdSeq = Math.max(this.solveIdSeq, ...existing.map((s) => s.id ?? 0), 0) + 1;
    return this.solveIdSeq;
  }

  private nextSessionId(existing: Session[]): number {
    this.sessionIdSeq = Math.max(this.sessionIdSeq, ...existing.map((s) => s.id), 0) + 1;
    return this.sessionIdSeq;
  }

  private timeOf(s: Solve): number {
    return Date.parse(s.date ?? s.endTime ?? '') || 0;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
