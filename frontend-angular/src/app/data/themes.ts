/**
 * Theme configuration for CubeStats
 * Each theme defines a complete color palette as CSS custom properties
 */

export interface ThemeColors {
  'card-bg': string;
  'primary-color': string;
  'success-color': string;
  'danger-color': string;
  'warning-color': string;
  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;
  'border-color': string;
  'background': string;
  'cube-bg': string;
  'hover-bg': string;
  'input-bg': string;
  'input-border': string;
  'link-color': string;
}

export interface ThemeDefinition {
  name: string;
  colors: ThemeColors;
}

// Theme key type
type ThemeKeyTuple = [
  'default',
  'style1',
  'style2',
  'style3',
  'black',
  'white',
  'style6',
  'solarized-dark',
  'solarized-light'
];
export type ThemeKey = ThemeKeyTuple[number];

// Theme definitions
const defaultTheme: ThemeDefinition = {
  name: 'Default',
  colors: {
    'card-bg': '#fff',
    'primary-color': '#007bff',
    'success-color': '#4caf50',
    'danger-color': '#dc3545',
    'warning-color': '#ff9800',
    'text-primary': '#333',
    'text-secondary': '#666',
    'text-muted': '#999',
    'border-color': '#eee',
    'background': '#f5f7fa',
    'cube-bg': '#eeffcb',
    'hover-bg': '#f8f9fa',
    'input-bg': '#fff',
    'input-border': '#ddd',
    'link-color': '#0d6efd'
  }
};

const style1Theme: ThemeDefinition = {
  name: 'Style 1',
  colors: {
    'card-bg': '#ffffff',
    'primary-color': '#2196f3',
    'success-color': '#4caf50',
    'danger-color': '#f44336',
    'warning-color': '#ff9800',
    'text-primary': '#212121',
    'text-secondary': '#757575',
    'text-muted': '#9e9e9e',
    'border-color': '#e0e0e0',
    'background': '#fafafa',
    'cube-bg': '#e3f2fd',
    'hover-bg': '#f5f5f5',
    'input-bg': '#ffffff',
    'input-border': '#e0e0e0',
    'link-color': '#1976d2'
  }
};

const style2Theme: ThemeDefinition = {
  name: 'Style 2',
  colors: {
    'card-bg': '#fafafa',
    'primary-color': '#9c27b0',
    'success-color': '#8bc34a',
    'danger-color': '#f44336',
    'warning-color': '#ff9800',
    'text-primary': '#424242',
    'text-secondary': '#616161',
    'text-muted': '#9e9e9e',
    'border-color': '#e0e0e0',
    'background': '#eeeeee',
    'cube-bg': '#f3e5f5',
    'hover-bg': '#f5f5f5',
    'input-bg': '#ffffff',
    'input-border': '#e0e0e0',
    'link-color': '#7b1fa2'
  }
};

const style3Theme: ThemeDefinition = {
  name: 'Style 3',
  colors: {
    'card-bg': '#fffaf0',
    'primary-color': '#ff5722',
    'success-color': '#8bc34a',
    'danger-color': '#e91e63',
    'warning-color': '#ffc107',
    'text-primary': '#3e2723',
    'text-secondary': '#5d4037',
    'text-muted': '#8d6e63',
    'border-color': '#d7ccc8',
    'background': '#efebe9',
    'cube-bg': '#fff3e0',
    'hover-bg': '#f5f5f5',
    'input-bg': '#fff',
    'input-border': '#d7ccc8',
    'link-color': '#e64a19'
  }
};

const blackTheme: ThemeDefinition = {
  name: 'Black',
  colors: {
    'card-bg': '#2a2a2a',
    'primary-color': '#4da6ff',
    'success-color': '#66bb6a',
    'danger-color': '#ef5350',
    'warning-color': '#ffa726',
    'text-primary': '#e0e0e0',
    'text-secondary': '#aaa',
    'text-muted': '#777',
    'border-color': '#444',
    'background': '#1a1a1a',
    'cube-bg': '#1a1a1a',
    'hover-bg': '#333',
    'input-bg': '#333',
    'input-border': '#555',
    'link-color': '#4da6ff'
  }
};

const whiteTheme: ThemeDefinition = {
  name: 'White',
  colors: {
    'card-bg': '#ffffff',
    'primary-color': '#007bff',
    'success-color': '#28a745',
    'danger-color': '#dc3545',
    'warning-color': '#ffc107',
    'text-primary': '#212529',
    'text-secondary': '#6c757d',
    'text-muted': '#adb5bd',
    'border-color': '#dee2e6',
    'background': '#f8f9fa',
    'cube-bg': '#e9ecef',
    'hover-bg': '#e9ecef',
    'input-bg': '#ffffff',
    'input-border': '#ced4da',
    'link-color': '#0056b3'
  }
};

const style6Theme: ThemeDefinition = {
  name: 'Style 6',
  colors: {
    'card-bg': '#f0f4f8',
    'primary-color': '#3b82f6',
    'success-color': '#10b981',
    'danger-color': '#ef4444',
    'warning-color': '#f59e0b',
    'text-primary': '#1e293b',
    'text-secondary': '#475569',
    'text-muted': '#94a3b8',
    'border-color': '#cbd5e1',
    'background': '#e2e8f0',
    'cube-bg': '#dbeafe',
    'hover-bg': '#e2e8f0',
    'input-bg': '#ffffff',
    'input-border': '#cbd5e1',
    'link-color': '#2563eb'
  }
};

const solarizedDarkTheme: ThemeDefinition = {
  name: 'Solarized Dark',
  colors: {
    'card-bg': '#002b36',
    'primary-color': '#268bd2',
    'success-color': '#859900',
    'danger-color': '#dc322f',
    'warning-color': '#b58900',
    'text-primary': '#93a1a1',
    'text-secondary': '#839496',
    'text-muted': '#586e75',
    'border-color': '#073642',
    'background': '#001e26',
    'cube-bg': '#073642',
    'hover-bg': '#073642',
    'input-bg': '#002b36',
    'input-border': '#073642',
    'link-color': '#268bd2'
  }
};

const solarizedLightTheme: ThemeDefinition = {
  name: 'Solarized Light',
  colors: {
    'card-bg': '#fdf6e3',
    'primary-color': '#268bd2',
    'success-color': '#859900',
    'danger-color': '#dc322f',
    'warning-color': '#b58900',
    'text-primary': '#657b83',
    'text-secondary': '#586e75',
    'text-muted': '#93a1a1',
    'border-color': '#eee8d5',
    'background': '#f5efdc',
    'cube-bg': '#eee8d5',
    'hover-bg': '#eee8d5',
    'input-bg': '#fdf6e3',
    'input-border': '#eee8d5',
    'link-color': '#268bd2'
  }
};

// THEMES constant object
export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  'default': defaultTheme,
  'style1': style1Theme,
  'style2': style2Theme,
  'style3': style3Theme,
  'black': blackTheme,
  'white': whiteTheme,
  'style6': style6Theme,
  'solarized-dark': solarizedDarkTheme,
  'solarized-light': solarizedLightTheme
};

// All theme keys for dropdown
export const THEME_KEYS: ThemeKey[] = [
  'default', 'style1', 'style2', 'style3', 'black', 'white', 'style6', 'solarized-dark', 'solarized-light'
];

// Helper to get theme by key
export function getTheme(key: ThemeKey): ThemeDefinition {
  return THEMES[key] || THEMES['default'];
}

// Apply theme colors to CSS custom properties on root element
export function applyTheme(key: ThemeKey): void {
  const theme = getTheme(key);
  const root = document.documentElement;

  // Set each CSS custom property
  const colors = theme.colors;
  root.style.setProperty('--card-bg', colors['card-bg']);
  root.style.setProperty('--primary-color', colors['primary-color']);
  root.style.setProperty('--success-color', colors['success-color']);
  root.style.setProperty('--danger-color', colors['danger-color']);
  root.style.setProperty('--warning-color', colors['warning-color']);
  root.style.setProperty('--text-primary', colors['text-primary']);
  root.style.setProperty('--text-secondary', colors['text-secondary']);
  root.style.setProperty('--text-muted', colors['text-muted']);
  root.style.setProperty('--border-color', colors['border-color']);
  root.style.setProperty('--background', colors['background']);
  root.style.setProperty('--cube-bg', colors['cube-bg']);
  root.style.setProperty('--hover-bg', colors['hover-bg']);
  root.style.setProperty('--input-bg', colors['input-bg']);
  root.style.setProperty('--input-border', colors['input-border']);
  root.style.setProperty('--link-color', colors['link-color']);
}