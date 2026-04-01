import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, type Session } from '../../services/state.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-session-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="session-selector">
      <button type="button" class="btn-selector" (click)="dropdownOpen.update(v => !v)">
        <span class="current-session">{{ currentSessionName() }}</span>
        <span class="arrow">▼</span>
      </button>
      @if (dropdownOpen()) {
        <div class="dropdown-menu" (click)="$event.stopPropagation()">
          @for (session of sessions(); track session.id) {
            <div class="dropdown-item" [class.active]="session.id === currentSessionId()">
              <button type="button" class="item-label" (click)="selectSession(session); dropdownOpen.set(false)">
                {{ session.name }}
              </button>
              @if (sessions().length > 1) {
                <button type="button" class="btn-delete" (click)="deleteSession(session); $event.stopPropagation()" [title]="t('delete')">
                  ×
                </button>
              }
            </div>
          }
          <button type="button" class="dropdown-item new-item" (click)="onNewSession(); dropdownOpen.set(false)">
            <span class="icon">+</span>
            {{ t('newSession') }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .session-selector {
      position: relative;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }
    .btn-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-selector:hover {
      background: #f8f9fa;
    }
    .current-session {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .arrow {
      font-size: 10px;
      color: #6c757d;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 12px;
      right: 12px;
      margin-top: 4px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      max-height: 240px;
      overflow-y: auto;
      z-index: 100;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .dropdown-item:last-child {
      border-bottom: none;
    }
    .item-label {
      flex: 1;
      padding: 10px 12px;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
    }
    .item-label:hover {
      background: #f8f9fa;
    }
    .dropdown-item.active .item-label {
      background: #e7f5ff;
      color: #0d6efd;
    }
    .btn-delete {
      padding: 8px 12px;
      border: none;
      background: none;
      color: #999;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }
    .btn-delete:hover {
      color: #dc3545;
    }
    .new-item {
      padding: 0;
    }
    .new-item .icon {
      padding: 10px 12px;
      font-size: 16px;
      font-weight: bold;
      color: #6366f1;
    }
    .new-item:hover {
      background: #f8f9fa;
    }
  `]
})
export class SessionSelectorComponent {
  private state = inject(StateService);
  private localStore = inject(LocalSolveStoreService);
  private i18n = inject(I18nService);

  dropdownOpen = signal(false);

  sessions = signal<Session[]>(this.localStore.getSessions());
  currentSessionId = signal<number | undefined>(this.state.currentSession()?.id);
  currentSessionName = signal<string>(this.state.currentSession()?.name ?? '');

  t(key: string): string {
    return this.i18n.t(key);
  }

  onNewSession(): void {
    const scrambleType = this.state.scrambleType() || 'wca';
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const sessionName = `${month}.${day} ${scrambleType.toUpperCase()}`;

    const newSession = this.localStore.createSession(sessionName);
    this.state.currentSession.set(newSession);
    this.sessions.set(this.localStore.getSessions());
    this.currentSessionId.set(newSession.id);
    this.currentSessionName.set(newSession.name);
  }

  selectSession(session: Session): void {
    this.state.currentSession.set(session);
    this.currentSessionId.set(session.id);
    this.currentSessionName.set(session.name);
  }

  deleteSession(session: Session): void {
    if (this.sessions().length <= 1) return;

    this.localStore.deleteSession(session.id);

    // If deleted current session, switch to another
    if (session.id === this.currentSessionId()) {
      const remaining = this.localStore.getSessions();
      if (remaining.length > 0) {
        this.state.currentSession.set(remaining[0]);
        this.currentSessionId.set(remaining[0].id);
        this.currentSessionName.set(remaining[0].name);
      }
    }

    this.sessions.set(this.localStore.getSessions());
  }
}