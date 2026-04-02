import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { CstimerScrambleService } from '../../services/cstimer-scramble.service';
import { I18nService } from '../../services/i18n.service';
import { AlgorithmCasePickerComponent, type AlgorithmGroup } from '../shared/algorithm-case-picker.component';

@Component({
  selector: 'app-f2l-case-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AlgorithmCasePickerComponent],
  template: `
    <app-algorithm-case-picker
      [title]="t('f2l')"
      radioName="f2lMode"
      [mode]="state.f2lSubsetMode()"
      [groups]="mappedGroups()"
      [enabledIndices]="state.f2lEnabledIndices()"
      [allIndices]="allIndices()"
      [inline]="inline() || state.f2lSubsetMode() === 'subset'"
      (modeChange)="setMode($event)"
      (toggleCase)="toggle($event.index, $event.checked)"
      (selectAll)="selectAll()"
      (clearAll)="clearAll()"
      (selectGroup)="selectGroup($event)"
      (clearGroup)="clearGroup($event)">
    </app-algorithm-case-picker>
  `,
  styles: [``]
})
export class F2lCasePickerComponent {
  readonly inline = input<boolean>(false);
  readonly state = inject(StateService);
  private readonly cstimer = inject(CstimerScrambleService);
  private readonly i18n = inject(I18nService);

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly allIndices = computed<number[]>(() => {
    const meta = this.cstimer.getLsll2Meta();
    if (!meta) {
      return [];
    }
    return meta.filters.map((_, i) => i);
  });

  readonly mappedGroups = computed<AlgorithmGroup[]>(() => {
    const meta = this.cstimer.getLsll2Meta();
    if (!meta) {
      return [];
    }
    const items = meta.filters.map((name, index) => ({ index, name, prob: meta.probs[index] ?? 1 }));
    
    const grouped = new Map<string, typeof items>();
    for (const c of items) {
      const key = this.groupKey(c.name);
      const arr = grouped.get(key) ?? [];
      arr.push(c);
      grouped.set(key, arr);
    }
    const order = ['Solved', 'Easy', 'RE', 'REFC', 'SPGO', 'PMS', 'Weird', 'CPEU', 'EPCU', 'ECP'];
    const keys = [...grouped.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    });
    
    return keys.map(key => {
      const gItems = grouped.get(key) ?? [];
      const selected = gItems.filter((x) => this.isOn(x.index)).length;
      const title = key === 'Solved' ? `Solved-${gItems[0]?.name.split('-')[1] ?? ''}` : `${key} ${selected}/${gItems.length}`;
      return {
        id: key,
        title,
        cases: gItems.map(c => ({
          index: c.index,
          name: c.name,
          imgUrl: this.imgUrl(c.index)
        }))
      };
    });
  });

  private isOn(index: number): boolean {
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
    this.state.f2lEnabledIndices.set(new Set(this.allIndices()));
    this.state.persistF2lSubsetPrefs();
  }

  clearAll(): void {
    this.state.f2lEnabledIndices.set(new Set());
    this.state.persistF2lSubsetPrefs();
  }

  selectGroup(group: AlgorithmGroup): void {
    const next = new Set(this.state.f2lEnabledIndices());
    for (const c of group.cases) {
      next.add(c.index);
    }
    this.state.f2lEnabledIndices.set(next);
    this.state.persistF2lSubsetPrefs();
  }

  clearGroup(group: AlgorithmGroup): void {
    const next = new Set(this.state.f2lEnabledIndices());
    for (const c of group.cases) {
      next.delete(c.index);
    }
    this.state.f2lEnabledIndices.set(next);
    this.state.persistF2lSubsetPrefs();
  }

  private imgUrl(index: number): string {
    return this.cstimer.getLsll2ImageDataUrl(index) ?? '';
  }

  private groupKey(name: string): string {
    return (name.split('-')[0] ?? '').trim();
  }
}