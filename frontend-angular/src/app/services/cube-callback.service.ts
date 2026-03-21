import { Injectable, signal, APP_INITIALIZER, inject } from '@angular/core';

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
  // Signal for cube state changes (facelets)
  readonly cubeState = signal<string | null>(null);

  // Pending MAC modal callback
  private macResolve: ((mac: string | null) => void) | null = null;
  private macModalRegistrar: ((resolve: (mac: string | null) => void) => void) | null = null;

  constructor() {
    // Register self as global singleton for driver access
    window.cubeCallbackService = this;
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
   * Notify that cube state has changed (e.g., facelets update)
   */
  notifyCubeState(facelets: string): void {
    this.cubeState.set(facelets);
    // Also emit to window for backward compatibility
    window.onGanCubeState?.(facelets);
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

      // Fallback: Call window modal if available
      if (window.showMacModal) {
        window.showMacModal((mac) => {
          resolve(mac);
        });
        return;
      }

      // Final fallback: browser prompt
      console.log('[CubeCallbackService] No modal available, using browser prompt');
      const mac = prompt('Please enter the MAC address of your cube (e.g., AA:BB:CC:DD:EE:FF):');
      resolve(mac || null);
    });
  }
}

/**
 * Get the global CubeCallbackService instance for use in non-Angular contexts (drivers)
 */
export function getCubeCallbackService(): CubeCallbackService {
  return window.cubeCallbackService || new CubeCallbackService();
}
