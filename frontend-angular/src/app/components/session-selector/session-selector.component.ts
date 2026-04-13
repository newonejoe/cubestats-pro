import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService, type Session } from '../../services/state.service';
import { LocalSolveStoreService } from '../../services/local-solve-store.service';
import { StatisticsService } from '../../services/statistics.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-session-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)'
  },
  imports: [CommonModule],
  template: `
    <div class="session-selector">
      <button type="button" class="btn-selector" (click)="toggleDropdown()">
        <span class="current-session">{{ currentSessionName() }}</span>
        <span class="arrow">▼</span>
      </button>
      @if (dropdownOpen()) {
        <div class="dropdown-menu" (click)="$event.stopPropagation()">
          @for (session of sessions(); track session.id) {
            <div class="dropdown-item" [class.active]="session.id === currentSessionId()">
              <button type="button" class="item-label" (click)="selectSession(session)">
                {{ session.name }}
              </button>
              @if (sessions().length > 1) {
                <button type="button" class="btn-delete" (click)="deleteSession(session); $event.stopPropagation()" [title]="t('delete')">
                  ×
                </button>
              }
            </div>
          }
          <button type="button" class="dropdown-item new-item" (click)="onNewSession()">
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
      background: var(--hover-bg);
      border-bottom: 1px solid var(--border-color);
    }
    .btn-selector {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      background: var(--card-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-primary);
    }
    .btn-selector:hover {
      background: var(--hover-bg);
    }
    .current-session {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .arrow {
      font-size: 10px;
      color: var(--text-secondary);
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 12px;
      right: 12px;
      margin-top: 4px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
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
      border-bottom: 1px solid var(--border-color);
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
      color: var(--text-primary);
    }
    .item-label:hover {
      background: var(--hover-bg);
    }
    .dropdown-item.active .item-label {
      background: var(--primary-color);
      color: #fff;
    }
    .btn-delete {
      padding: 8px 12px;
      border: none;
      background: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }
    .btn-delete:hover {
      color: var(--danger-color);
    }
    .new-item {
      padding: 0;
    }
    .new-item .icon {
      padding: 10px 12px;
      font-size: 16px;
      font-weight: bold;
      color: var(--primary-color);
    }
    .new-item:hover {
      background: var(--hover-bg);
    }
  `]
})
export class SessionSelectorComponent implements OnInit {
  private state = inject(StateService);
  private localStore = inject(LocalSolveStoreService);
  private stats = inject(StatisticsService);
  private i18n = inject(I18nService);

  dropdownOpen = signal(false);

  sessions = signal<Session[]>([]);

  // Use StatisticsService as the single source of truth for current session
  readonly currentSession = computed(() => this.state.currentSession());

  readonly currentSessionId = computed(() => this.currentSession()?.id);

  readonly currentSessionName = computed(() => this.currentSession()?.name ?? '');

  ngOnInit(): void {
    // Load sessions from store
    this.sessions.set(this.localStore.getSessions());

    // Initialize current session from persisted selection
    const selectedId = this.stats.selectedSessionId;
    const sessions = this.localStore.getSessions();

    if (selectedId !== 'all' && selectedId !== null) {
      const session = sessions.find(s => s.id === selectedId);
      if (session) {
        this.state.currentSession.set(session);
      } else if (sessions.length > 0) {
        this.state.currentSession.set(sessions[0]!);
      }
    } else if (sessions.length > 0) {
      this.state.currentSession.set(sessions[0]!);
    }
  }

  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest('.session-selector')) {
      return;
    }
    this.dropdownOpen.set(false);
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  onNewSession(): void {
    const scrambleType = this.state.scrambleType() || 'wca';
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const sessionName = `${month}.${day} ${scrambleType.toUpperCase()}`;

    const newSession = this.localStore.createSession(sessionName);
    this.state.currentSession.set(newSession);
    this.stats.setSelectedSession(newSession.id);
    this.sessions.set(this.localStore.getSessions());
    this.dropdownOpen.set(false);
  }

  selectSession(session: Session): void {
    this.state.currentSession.set(session);
    this.stats.setSelectedSession(session.id);
    this.dropdownOpen.set(false);
  }

  deleteSession(session: Session): void {
    if (this.sessions().length <= 1) return;

    this.localStore.deleteSession(session.id);

    // If deleted current session, switch to another
    if (session.id === this.currentSessionId()) {
      const remaining = this.localStore.getSessions();
      if (remaining.length > 0) {
        this.state.currentSession.set(remaining[0]);
        this.stats.setSelectedSession(remaining[0]!.id);
      }
    }

    this.sessions.set(this.localStore.getSessions());
  }
}