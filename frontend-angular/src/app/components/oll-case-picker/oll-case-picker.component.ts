import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { OLL_GROUPS, ALL_OLL_INDICES } from '../../data/oll-cases';
import { getOllFace21 } from '../../lib/cstimer-ll-viz';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { AlgorithmCasePickerComponent, type AlgorithmGroup } from '../shared/algorithm-case-picker.component';

@Component({
  selector: 'app-oll-case-picker',
  standalone: true,
  imports: [CommonModule, AlgorithmCasePickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-algorithm-case-picker
      title="OLL"
      radioName="ollMode"
      [mode]="state.ollSubsetMode()"
      [groups]="mappedGroups()"
      [enabledIndices]="state.ollEnabledIndices()"
      [allIndices]="ALL_OLL_INDICES"
      [inline]="inline()"
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
export class OllCasePickerComponent {
  readonly state = inject(StateService);
  readonly inline = input<boolean>(false);
  readonly ALL_OLL_INDICES = ALL_OLL_INDICES;

  readonly mappedGroups = computed<AlgorithmGroup[]>(() => {
    return OLL_GROUPS.map(g => ({
      id: g.id,
      title: g.title,
      cases: g.cases.map(c => ({
        index: c.index,
        name: c.cstimerName,
        imgUrl: this.ollImgUrl(c.index)
      }))
    }));
  });

  private ollImgUrl(index: number): string | null {
    const data = getOllFace21(index);
    if (!data) {
      return null;
    }
    return buildLlImageDataUrl(data);
  }

  setMode(mode: 'full' | 'subset'): void {
    this.state.ollSubsetMode.set(mode);
  }

  toggle(index: number, checked: boolean): void {
    const s = new Set(this.state.ollEnabledIndices());
    if (checked) {
      s.add(index);
    } else {
      s.delete(index);
    }
    this.state.ollEnabledIndices.set(s);
  }

  selectAll(): void {
    this.state.ollEnabledIndices.set(new Set(ALL_OLL_INDICES));
  }

  clearAll(): void {
    this.state.ollEnabledIndices.set(new Set());
  }

  selectGroup(group: AlgorithmGroup): void {
    const s = new Set(this.state.ollEnabledIndices());
    for (const c of group.cases) {
      s.add(c.index);
    }
    this.state.ollEnabledIndices.set(s);
  }

  clearGroup(group: AlgorithmGroup): void {
    const s = new Set(this.state.ollEnabledIndices());
    for (const c of group.cases) {
      s.delete(c.index);
    }
    this.state.ollEnabledIndices.set(s);
  }
}