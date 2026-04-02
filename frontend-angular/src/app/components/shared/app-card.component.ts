import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="card">
      @if (title() || hasControls()) {
        <div class="card-header">
          <span class="card-title">{{ title() }}</span>
          @if (hasControls()) {
            <div class="card-controls">
              <ng-content select="[card-controls]"></ng-content>
            </div>
          }
        </div>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .card {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 20px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .card-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `]
})
export class AppCardComponent {
  readonly title = input('');
  readonly hasControls = input(false);
}