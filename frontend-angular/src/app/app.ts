import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StateService } from './services/state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div [class]="themeClass()">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class App {
  private state = inject(StateService);

  themeClass = computed(() => this.state.settings().theme === 'black' ? 'theme-black' : '');
}
