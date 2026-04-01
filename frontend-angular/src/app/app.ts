import { Component, inject, computed, effect, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { StateService } from './services/state.service';
import { ThemeKey, applyTheme, THEMES } from './data/themes';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="app-container">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
    .app-container {
      min-height: 100vh;
    }
  `]
})
export class App implements OnInit {
  private state = inject(StateService);

  constructor() {
    // Effect to apply theme changes to CSS custom properties
    effect(() => {
      const themeKey = this.state.settings().theme;
      applyTheme(themeKey);
    });
  }

  ngOnInit(): void {
    // Apply initial theme on app load
    const initialTheme = this.state.settings().theme || 'default';
    applyTheme(initialTheme);
  }
}