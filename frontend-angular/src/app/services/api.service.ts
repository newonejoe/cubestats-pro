import { Injectable, inject } from '@angular/core';
import { StateService, Solve, Session } from './state.service';

export interface Statistics {
  currentTime?: number;
  ao5?: number;
  ao12?: number;
  ao100?: number;
  bestTime?: number;
  solveCount?: number;
}

export interface CFOPAnalysis {
  cross: {
    time: number;
    efficiency: number;
  };
  f2l: {
    time: number;
    efficiency: number;
  };
  oll: {
    time: number;
    caseName: string;
    algorithm: string;
    recognitionTime: number;
    efficiency: number;
  };
  PLL: {
    time: number;
    caseName: string;
    algorithm: string;
    recognitionTime: number;
    efficiency: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private state = inject(StateService);

  private get baseUrl(): string {
    return this.state.API_BASE;
  }

  async createSession(): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Session ${new Date().toLocaleDateString()}` })
    });
    return response.json();
  }

  async getSessions(): Promise<Session[]> {
    const userId = this.state.currentUserId();
    const response = await fetch(`${this.baseUrl}/users/${userId}/sessions`);
    return response.json();
  }

  async getSolves(): Promise<Solve[]> {
    const userId = this.state.currentUserId();
    const response = await fetch(`${this.baseUrl}/users/${userId}/solves`);
    return response.json();
  }

  async saveSolve(solve: Solve): Promise<Solve> {
    const userId = this.state.currentUserId();
    const response = await fetch(`${this.baseUrl}/users/${userId}/solves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solve)
    });
    return response.json();
  }

  async deleteSolve(solveId: number): Promise<void> {
    const userId = this.state.currentUserId();
    await fetch(`${this.baseUrl}/users/${userId}/solves/${solveId}`, {
      method: 'DELETE'
    });
  }

  async getStatistics(): Promise<Statistics> {
    const userId = this.state.currentUserId();
    const response = await fetch(`${this.baseUrl}/users/${userId}/statistics`);
    return response.json();
  }

  async analyzeSolve(time: number): Promise<CFOPAnalysis | null> {
    const response = await fetch(`${this.baseUrl}/analysis/cfop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time, scramble: this.state.scramble() })
    });
    if (!response.ok) return null;
    return response.json();
  }

  async getUserStats(userId: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/${userId}/stats`);
    return response.json();
  }

  async exportData(): Promise<string> {
    const userId = this.state.currentUserId();
    const response = await fetch(`${this.baseUrl}/users/${userId}/export`);
    return response.text();
  }
}
