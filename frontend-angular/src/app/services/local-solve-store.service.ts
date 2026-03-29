import { Injectable, inject } from '@angular/core';
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

  constructor() {
    this.migrateLegacySolvesKeyIntoAnalysisKey();
  }

  /** Called from APP_INITIALIZER before first read. */
  async init(): Promise<void> {
    if (this.initDone) {
      return;
    }
    await this.idb.init();
    await this.migrateLocalStorageSolvesToIndexedDb();
    await this.hydrateMemoryFromIdb();
    this.initDone = true;
  }

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
    return session;
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

  private async ensureInit(): Promise<void> {
    if (!this.initDone) {
      await this.init();
    }
  }

  private async hydrateMemoryFromIdb(): Promise<void> {
    const flat = await this.idb.getAllRecordsFlat();
    const solves: Solve[] = flat.map(({ sessionId, record }) => solveFromRecord(record, sessionId));
    this.memorySolves = solves;
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
