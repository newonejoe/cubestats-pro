import { Injectable, signal, APP_INITIALIZER, inject } from '@angular/core';
import { StateService, CubeState } from './state.service';

/**
 * Module-level singleton instance for use by drivers
 */
let cubeCallbackServiceInstance: CubeCallbackService | null = null;

/**
 * Convert facelets string (54 chars) to CubeState object
 * Format: U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
 */
function faceletsToCubeState(facelets: string): CubeState {
  const colors: Record<string, string> = {
    'U': 'white', 'R': 'red', 'F': 'green', 'D': 'yellow', 'L': 'orange', 'B': 'blue'
  };

  return {
    U: facelets.substring(0, 9).split('').map(c => colors[c] || c),
    R: facelets.substring(9, 18).split('').map(c => colors[c] || c),
    F: facelets.substring(18, 27).split('').map(c => colors[c] || c),
    D: facelets.substring(27, 36).split('').map(c => colors[c] || c),
    L: facelets.substring(36, 45).split('').map(c => colors[c] || c),
    B: facelets.substring(45, 54).split('').map(c => colors[c] || c)
  };
}

/**
 * Service for handling cube-related callbacks between hardware drivers and the UI.
 * This provides a clean Angular-native way to handle modal dialogs and state updates
 * without relying on window callbacks.
 *
 * Uses a singleton pattern so drivers can access the same instance.
 */
@Injectable({
  providedIn: 'root'
})
export class CubeCallbackService {
  private state = inject(StateService);

  // Signal for cube state changes (facelets)
  readonly cubeState = signal<string | null>(null);

  // Pending MAC modal callback
  private macResolve: ((mac: string | null) => void) | null = null;
  private macModalRegistrar: ((resolve: (mac: string | null) => void) => void) | null = null;

  // Pending solved state modal callback
  private solvedStateResolve: ((isSolved: boolean) => void) | null = null;
  private solvedStateModalRegistrar: ((resolve: (confirmed: boolean) => void, facelets: string) => void) | null = null;

  constructor() {
    // Register as global singleton for drivers (fallback when not using DI)
    (window as any).cubeCallbackService = this;
  }

  /**
   * Register a MAC modal component with this service.
   * The modal should call the provided callback with the MAC address or null.
   */
  registerMacModal(callback: (resolve: (mac: string | null) => void) => void): void {
    this.macModalRegistrar = callback;
    console.log('[CubeCallbackService] MAC modal registered');
  }

  /**
   * Check if a MAC modal is registered
   */
  hasMacModal(): boolean {
    return this.macModalRegistrar !== null;
  }

  /**
   * Unregister the MAC modal
   */
  unregisterMacModal(): void {
    this.macModalRegistrar = null;
  }

  /**
   * Register a solved state confirm modal with this service.
   * The modal should call the provided callback with confirmed (true) or cancelled (false).
   */
  registerSolvedStateModal(callback: (resolve: (confirmed: boolean) => void, facelets: string) => void): void {
    this.solvedStateModalRegistrar = callback;
    console.log('[CubeCallbackService] Solved state modal registered');
  }

  /**
   * Check if a solved state modal is registered
   */
  hasSolvedStateModal(): boolean {
    return this.solvedStateModalRegistrar !== null;
  }

  /**
   * Unregister the solved state modal
   */
  unregisterSolvedStateModal(): void {
    this.solvedStateModalRegistrar = null;
  }

  /**
   * Save the current facelets as the solved state (using same key as drivers)
   */
  saveAsSolvedState(facelets: string): void {
    try {
      const STORAGE_KEYS = { PROPERTIES: 'cubestats_props' };
      const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      const props = propsStr ? JSON.parse(propsStr) : {};
      props['giiSolved'] = facelets;
      localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(props));
      console.log('[CubeCallbackService] Saved solved state:', facelets);
    } catch (e) {
      console.error('[CubeCallbackService] Failed to save solved state:', e);
    }
  }

  /**
   * Get the saved solved state (using same key as drivers)
   */
  getSavedSolvedState(): string | null {
    try {
      const STORAGE_KEYS = { PROPERTIES: 'cubestats_props' };
      const propsStr = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
      if (propsStr) {
        const props = JSON.parse(propsStr);
        return props['giiSolved'] || null;
      }
    } catch (e) {
      console.error('[CubeCallbackService] Failed to get solved state:', e);
    }
    return null;
  }

  /**
   * Show solved state confirm modal when cube is NOT solved (scrambled).
   * Returns true if user confirmed, false if cancelled.
   */
  async confirmSolvedState(facelets: string = ''): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.solvedStateModalRegistrar) {
        console.log('[CubeCallbackService] Showing solved state modal');
        this.solvedStateModalRegistrar(resolve, facelets);
        return;
      }

      // Default: proceed without modal
      console.log('[CubeCallbackService] No solved state modal, proceeding');
      resolve(true);
    });
  }

  /**
   * Notify that cube state has changed (e.g., facelets update)
   */
  notifyCubeState(facelets: string): void {
    this.cubeState.set(facelets);

    // Convert facelets to CubeState and update StateService
    if (facelets.length === 54) {
      const cubeState = faceletsToCubeState(facelets);
      this.state.btCubeState.set(cubeState);
      console.log('[CubeCallbackService] Updated btCubeState from facelets');
    }
  }

  /**
   * Show MAC address input modal and return the entered MAC.
   * Returns null if user cancelled.
   */
  async promptForMac(): Promise<string | null> {
    return new Promise((resolve) => {
      // Try to use registered modal first
      if (this.macModalRegistrar) {
        console.log('[CubeCallbackService] Showing registered MAC modal');
        this.macModalRegistrar(resolve);
        return;
      }

      // Fallback: browser prompt
      console.log('[CubeCallbackService] No modal available, using browser prompt');
      const mac = prompt('Please enter the MAC address of your cube (e.g., AA:BB:CC:DD:EE:FF):');
      resolve(mac || null);
    });
  }
}

/**
 * Get the CubeCallbackService singleton instance for use in drivers
 */
export function getCubeCallbackService(): CubeCallbackService {
  // First check window for pre-Angular or non-DI context fallback
  const windowInstance = (window as any).cubeCallbackService;
  if (windowInstance) {
    return windowInstance;
  }
  // Use module-level singleton
  if (!cubeCallbackServiceInstance) {
    cubeCallbackServiceInstance = new CubeCallbackService();
  }
  return cubeCallbackServiceInstance;
}
