import { Injectable } from '@angular/core';
import type { SessionSolveRecord } from '../lib/cstimer-storage';

export const CUBESTATS_DB_NAME = 'cubestats';
export const CUBESTATS_DB_VERSION = 1;
export const SESSIONS_STORE = 'sessions';

function sessionStorageKey(sessionId: number): string {
  return `session_${sessionId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CUBESTATS_DB_NAME, CUBESTATS_DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE);
      }
    };
  });
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbSessionStoreService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) {
      return;
    }
    this.db = await openDb();
  }

  async getSessionRecords(sessionId: number): Promise<SessionSolveRecord[]> {
    await this.init();
    const key = sessionStorageKey(sessionId);
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const g = store.get(key);
      g.onerror = () => reject(g.error);
      g.onsuccess = () => resolve((g.result as SessionSolveRecord[] | undefined) ?? []);
    });
  }

  async setSessionRecords(sessionId: number, records: SessionSolveRecord[]): Promise<void> {
    await this.init();
    const key = sessionStorageKey(sessionId);
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      const r = store.put(records, key);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => resolve();
    });
  }

  async getAllRecordsFlat(): Promise<{ sessionId: number; record: SessionSolveRecord }[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const out: { sessionId: number; record: SessionSolveRecord }[] = [];
      const tx = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const cur = store.openCursor();
      cur.onerror = () => reject(cur.error);
      cur.onsuccess = () => {
        const cursor = cur.result;
        if (!cursor) {
          resolve(out);
          return;
        }
        const key = cursor.key as string;
        const m = /^session_(\d+)$/.exec(key);
        const sessionId = m ? Number.parseInt(m[1]!, 10) : 1;
        const rows = (cursor.value as SessionSolveRecord[]) ?? [];
        for (const record of rows) {
          out.push({ sessionId, record });
        }
        cursor.continue();
      };
    });
  }

  async appendRecord(sessionId: number, record: SessionSolveRecord): Promise<void> {
    const existing = await this.getSessionRecords(sessionId);
    const next = existing.filter((r) => r.id !== record.id);
    next.push(record);
    next.sort((a, b) => b.id - a.id);
    await this.setSessionRecords(sessionId, next);
  }

  async deleteSolveById(solveId: number): Promise<void> {
    const flat = await this.getAllRecordsFlat();
    const hit = flat.find((x) => x.record.id === solveId);
    if (!hit) {
      return;
    }
    const rest = await this.getSessionRecords(hit.sessionId);
    const filtered = rest.filter((r) => r.id !== solveId);
    await this.setSessionRecords(hit.sessionId, filtered);
  }

  async replaceAllForMigration(map: Map<number, SessionSolveRecord[]>): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
      for (const [sessionId, records] of map.entries()) {
        store.put(records, sessionStorageKey(sessionId));
      }
    });
  }
}
