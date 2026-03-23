import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';

interface F2LCaseItem {
  index: number;
  name: string;
  prob: number;
}

interface F2LCaseGroup {
  key: string;
  title: string;
  cases: F2LCaseItem[];
}

@Component({
  selector: 'app-f2l-case-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="f2l-picker">
      <div class="mode-row">
        <label class="mode-label">
          <input
            type="radio"
            name="f2lMode"
            [checked]="state.f2lSubsetMode() === 'full'"
            (change)="setMode('full')"
          />
          Full Last slot+last layer set
        </label>
        <label class="mode-label">
          <input
            type="radio"
            name="f2lMode"
            [checked]="state.f2lSubsetMode() === 'subset'"
            (change)="setMode('subset')"
          />
          Custom subset
        </label>
      </div>

      @if (inline() || state.f2lSubsetMode() === 'subset') {
        <div class="toolbar">
          <button type="button" class="btn" (click)="selectAll()">Select all</button>
          <button type="button" class="btn" (click)="clearAll()">Clear all</button>
          <span class="count">{{ enabledCount() }} / {{ cases().length }} selected</span>
        </div>

        @for (g of groups(); track g.key) {
          <section class="group">
            <header class="group-head">
              <span class="group-title">{{ g.title }}</span>
              <button type="button" class="btn tiny" (click)="selectGroup(g.cases)">All</button>
              <button type="button" class="btn tiny" (click)="clearGroup(g.cases)">None</button>
            </header>
            <div class="case-grid">
              @for (c of g.cases; track c.index) {
                <label class="case-tile" [class.on]="isOn(c.index)">
                  <input
                    class="sr-only"
                    type="checkbox"
                    [checked]="isOn(c.index)"
                    (change)="toggle(c.index, $any($event.target).checked)"
                  />
                  @if (imgUrl(c.index); as src) {
                    <img
                      class="thumb"
                      [src]="src"
                      width="120"
                      height="120"
                      [attr.alt]="c.name + ' last slot+last layer case'"
                      loading="lazy"
                    />
                  } @else {
                    <div class="fallback">…</div>
                  }
                  <span class="case-name">{{ c.name }}</span>
                </label>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .f2l-picker { font-size: 13px; color: #333; }
    .mode-row { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px; }
    .mode-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 10px 0 12px; }
    .btn {
      padding: 6px 12px; font-size: 12px; border-radius: 6px; border: 1px solid #ced4da;
      background: #fff; cursor: pointer;
    }
    .count { font-size: 12px; color: #868e96; }
    .group { margin-bottom: 18px; }
    .group-head {
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .group-title { font-size: 12px; font-weight: 700; color: #495057; }
    .btn.tiny { padding: 4px 8px; font-size: 11px; }
    .case-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .case-tile {
      position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 8px; border-radius: 10px; border: 1px solid #dee2e6; background: #fafbfc; cursor: pointer;
    }
    .case-tile.on { border-color: #198754; background: #e8f6ee; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .thumb { display: block; width: 120px; height: auto; border-radius: 6px; background: #fff; }
    .fallback {
      width: 120px; height: 90px; display: flex; align-items: center; justify-content: center;
      background: #e9ecef; border-radius: 6px; color: #adb5bd;
    }
    .case-name { font-size: 11px; text-align: center; color: #495057; line-height: 1.2; }
  `]
})
export class F2lCasePickerComponent {
  readonly inline = input<boolean>(false);
  readonly state = inject(StateService);
  private readonly cstimer = inject(CstimerScrambleService);

  readonly cases = computed<F2LCaseItem[]>(() => {
    const meta = this.cstimer.getLsll2Meta();
    if (!meta) {
      return [];
    }
    return meta.filters.map((name, index) => ({ index, name, prob: meta.probs[index] ?? 1 }));
  });

  readonly groups = computed<F2LCaseGroup[]>(() => {
    const grouped = new Map<string, F2LCaseItem[]>();
    for (const c of this.cases()) {
      const key = this.groupKey(c.name);
      const arr = grouped.get(key) ?? [];
      arr.push(c);
      grouped.set(key, arr);
    }
    const order = ['Solved', 'Easy', 'RE', 'REFC', 'SPGO', 'PMS', 'Weird', 'CPEU', 'EPCU', 'ECP'];
    const keys = [...grouped.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia >= 0 && ib >= 0) {
        return ia - ib;
      }
      if (ia >= 0) {
        return -1;
      }
      if (ib >= 0) {
        return 1;
      }
      return a.localeCompare(b);
    });
    return keys.map((key) => {
      const items = grouped.get(key) ?? [];
      const selected = items.filter((x) => this.isOn(x.index)).length;
      const title = key === 'Solved' ? `Solved-${items[0]?.name.split('-')[1] ?? ''}` : `${key} ${selected}/${items.length}`;
      return { key, title, cases: items };
    });
  });

  enabledCount(): number {
    if (this.state.f2lSubsetMode() === 'full') {
      return this.cases().length;
    }
    return this.state.f2lEnabledIndices().size;
  }

  isOn(index: number): boolean {
    if (this.state.f2lSubsetMode() === 'full') {
      return true;
    }
    return this.state.f2lEnabledIndices().has(index);
  }

  setMode(mode: 'full' | 'subset'): void {
    this.state.f2lSubsetMode.set(mode);
    this.state.persistF2lSubsetPrefs();
  }

  toggle(index: number, checked: boolean): void {
    const next = new Set(this.state.f2lEnabledIndices());
    if (checked) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this.state.f2lEnabledIndices.set(next);
    this.state.persistF2lSubsetPrefs();
  }

  selectAll(): void {
    this.state.f2lEnabledIndices.set(new Set(this.cases().map((c) => c.index)));
    this.state.persistF2lSubsetPrefs();
  }

  clearAll(): void {
    this.state.f2lEnabledIndices.set(new Set());
    this.state.persistF2lSubsetPrefs();
  }

  selectGroup(group: F2LCaseItem[]): void {
    const next = new Set(this.state.f2lEnabledIndices());
    for (const c of group) {
      next.add(c.index);
    }
    this.state.f2lEnabledIndices.set(next);
    this.state.persistF2lSubsetPrefs();
  }

  clearGroup(group: F2LCaseItem[]): void {
    const next = new Set(this.state.f2lEnabledIndices());
    for (const c of group) {
      next.delete(c.index);
    }
    this.state.f2lEnabledIndices.set(next);
    this.state.persistF2lSubsetPrefs();
  }

  imgUrl(index: number): string {
    return this.cstimer.getLsll2ImageDataUrl(index) ?? '';
  }

  private groupKey(name: string): string {
    return (name.split('-')[0] ?? '').trim();
  }
}

