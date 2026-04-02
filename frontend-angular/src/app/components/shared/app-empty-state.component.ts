import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="no-data" [class.no-bg]="noBackground()">
      @if (icon()) {
        <div class="no-data-icon">{{ icon() }}</div>
      }
      <p>{{ message() }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .no-data {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      background: var(--hover-bg);
      border-radius: 8px;
    }
    .no-data.no-bg {
      background: transparent;
    }
    .no-data-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    p {
      margin: 0;
    }
  `]
})
export class AppEmptyStateComponent {
  readonly message = input('No data yet');
  readonly icon = input('');
  readonly noBackground = input(false);
}