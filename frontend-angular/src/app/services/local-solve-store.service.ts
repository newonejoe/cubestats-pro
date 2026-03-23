import { Injectable } from '@angular/core';
import { Session, Solve } from './state.service';
import { computeAverageOfN, computeBest } from '../lib/analysis-selectors';

const SOLVES_KEY = 'analysis.solves.v1';
const SESSIONS_KEY = 'analysis.sessions.v1';
const LEGACY_SOLVES_KEY = 'solves';

@Injectable({
  providedIn: 'root'
})
export class LocalSolveStoreService {
  private sessionIdSeq = 1;
  private solveIdSeq = 1;

  constructor() {
    this.migrateLegacySolves();
  }

  getSolves(): Solve[] {
    const solves = this.readJson<Solve[]>(SOLVES_KEY, []);
    return [...solves].sort((a, b) => this.timeOf(b) - this.timeOf(a));
  }

  saveSolve(solve: Solve): Solve {
    const solves = this.getSolves();
    const saved: Solve = {
      ...solve,
      id: solve.id ?? this.nextSolveId(solves),
      date: solve.date ?? new Date().toISOString(),
    };
    const filtered = solves.filter((s) => s.id !== saved.id);
    filtered.unshift(saved);
    this.writeJson(SOLVES_KEY, filtered);
    return saved;
  }

  deleteSolve(solveId: number): void {
    const solves = this.getSolves().filter((s) => s.id !== solveId);
    this.writeJson(SOLVES_KEY, solves);
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
    const rows = [['id', 'date', 'sessionId', 'type', 'time', 'finalTime', 'dnf', 'plus2', 'scramble']];
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
      ]);
    }
    return rows.map((r) => r.join(',')).join('\n');
  }

  private migrateLegacySolves(): void {
    const newData = this.readJson<Solve[]>(SOLVES_KEY, []);
    if (newData.length > 0) {
      return;
    }
    const legacy = this.readJson<Array<Record<string, unknown>>>(LEGACY_SOLVES_KEY, []);
    if (legacy.length === 0) {
      return;
    }
    const mapped: Solve[] = legacy.map((s, idx) => ({
      id: idx + 1,
      time: Number(s['time'] ?? 0),
      finalTime: s['dnf'] ? null : Number(s['plus2'] ? Number(s['time'] ?? 0) + 2000 : Number(s['time'] ?? 0)),
      scramble: String(s['scramble'] ?? ''),
      moveCount: Number(s['moveCount'] ?? 0),
      dnf: Boolean(s['dnf']),
      plus2: Boolean(s['plus2']),
      date: String(s['date'] ?? new Date().toISOString()),
      sessionId: 1,
      scrambleType: 'wca',
    }));
    this.writeJson(SOLVES_KEY, mapped);
    if (this.readJson<Session[]>(SESSIONS_KEY, []).length === 0) {
      this.writeJson(SESSIONS_KEY, [{ id: 1, name: 'Session 1', createdAt: new Date().toISOString() }]);
    }
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

