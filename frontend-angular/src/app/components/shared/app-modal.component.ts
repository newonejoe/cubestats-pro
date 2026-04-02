import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="modal-backdrop" (click)="onBackdropClick()"></div>
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <div class="modal-inner" [class.dark-theme]="theme() === 'dark'" [style.maxWidth]="maxWidth()" (click)="$event.stopPropagation()">
          @if (title()) {
            <header class="modal-head">
              <h2 [id]="titleId">{{ title() }}</h2>
              <button type="button" class="icon-close" (click)="close()" aria-label="Close">&times;</button>
            </header>
          }
          <div class="modal-body" [class.no-padding]="noPadding()">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100000; }
    .modal { position: fixed; inset: 0; z-index: 100001; display: flex; align-items: center; justify-content: center; padding: 16px; pointer-events: none; }
    .modal-inner {
      pointer-events: auto; background: var(--card-bg); border-radius: 12px; width: 100%; max-height: 90vh;
      overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 100002;
    }
    .modal-inner.dark-theme {
      background: #1a1a2e; color: #eee;
    }
    .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
    .modal-head h2 { margin: 0; font-size: 18px; color: var(--text-primary); }
    .icon-close { border: none; background: transparent; font-size: 26px; line-height: 1; cursor: pointer; color: var(--text-muted); }
    .dark-theme .icon-close { color: #888; }
    .icon-close:hover { color: var(--text-primary); }
    .dark-theme .icon-close:hover { color: #ccc; }
    .modal-body { padding: 24px; overflow-y: auto; color: var(--text-primary); }
    .modal-body.no-padding { padding: 0; }
  `]
})
export class AppModalComponent {
  readonly isVisible = input(false);
  readonly title = input('');
  readonly theme = input<'light' | 'dark'>('light');
  readonly maxWidth = input('720px');
  readonly closeOnBackdrop = input(true);
  readonly noPadding = input(false);

  readonly closed = output<void>();

  titleId = 'modal-title-' + Math.random().toString(36).slice(2, 9);

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}