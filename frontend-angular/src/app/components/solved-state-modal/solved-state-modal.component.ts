import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CubeCallbackService } from '../../services/cube-callback.service';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-solved-state-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="modal-overlay">
        <div class="modal-content">
          @if (isSolved()) {
            <h3>Cube Solved!</h3>
            <p>Your cube matches the solved state.</p>
          } @else {
            <h3>Cube Not Solved</h3>
            <p>The cube is in a scrambled state.</p>
          }
          <p class="subtitle">Ready to start solving?</p>
          <div class="modal-buttons">
            <button class="btn-cancel" (click)="onCancel()">Cancel</button>
            <button class="btn-submit" (click)="onConfirm()">Resolved</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1a1a2e;
      padding: 24px;
      border-radius: 12px;
      min-width: 320px;
      max-width: 400px;
      text-align: center;
    }

    h3 {
      margin: 0 0 8px;
      color: #4caf50;
      font-size: 24px;
    }

    h3:not(.solved) {
      color: #ff9800;
    }

    p {
      margin: 0 0 8px;
      color: #888;
      font-size: 16px;
    }

    .subtitle {
      margin: 16px 0 20px;
      color: #666;
    }

    .modal-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    button {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .btn-cancel {
      background: #333;
      color: #aaa;
    }

    .btn-cancel:hover {
      background: #444;
    }

    .btn-submit {
      background: #6366f1;
      color: white;
    }

    .btn-submit:hover {
      background: #5558e3;
    }
  `]
})
export class SolvedStateModalComponent implements OnInit {
  private cubeCallback = inject(CubeCallbackService);
  private state = inject(StateService);

  isVisible = signal(false);
  isSolved = signal(false);
  private resolveCallback: ((confirmed: boolean) => void) | null = null;
  private currentFacelets: string = '';

  ngOnInit(): void {
    // Register this modal with the callback service
    this.cubeCallback.registerSolvedStateModal((resolve, facelets) => {
      this.show(resolve, facelets);
    });
  }

  private show(resolve: (confirmed: boolean) => void, facelets: string = ''): void {
    this.resolveCallback = resolve;
    this.currentFacelets = facelets;
    this.isVisible.set(true);
  }

  setSolvedState(isSolved: boolean): void {
    this.isSolved.set(isSolved);
  }

  onConfirm(): void {
    if (this.resolveCallback) {
      // Save current facelets as solved state
      if (this.currentFacelets) {
        this.cubeCallback.saveAsSolvedState(this.currentFacelets);
      }
      // Reset cube state for fresh tracking
      this.state.resetCubeState();
      this.state.btCubeState.set(null);
      this.resolveCallback(true);
      this.close();
    }else {
      this.cubeCallback.notifyCubeState(this.currentFacelets);
    }
  }

  onCancel(): void {
    if (this.resolveCallback) {
      this.resolveCallback(false);
      this.close();
    }
  }

  private close(): void {
    this.isVisible.set(false);
    this.resolveCallback = null;
  }
}
