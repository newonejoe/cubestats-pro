import { ChangeDetectionStrategy, Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { I18nService } from '../../services/i18n.service';
import { PLL_CASES, ALL_PLL_INDICES } from '../../data/pll-cases';
import { pllVizFromCstimer } from '../../lib/cstimer-ll-viz';
import { buildLlImageDataUrl } from '../../lib/ll-image-data-url';
import { AlgorithmCasePickerComponent, type AlgorithmCase } from '../shared/algorithm-case-picker.component';

@Component({
  selector: 'app-pll-case-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AlgorithmCasePickerComponent],
  template: `
    <app-algorithm-case-picker
      [title]="t('pll')"
      radioName="pllMode"
      [mode]="state.pllSubsetMode()"
      [cases]="mappedCases()"
      [enabledIndices]="state.pllEnabledIndices()"
      [allIndices]="ALL_PLL_INDICES"
      [inline]="inline()"
      (modeChange)="setMode($event)"
      (toggleCase)="toggle($event.index, $event.checked)"
      (selectAll)="selectAll()"
      (clearAll)="clearAll()">
    </app-algorithm-case-picker>
  `,
  styles: [``]
})
export class PllCasePickerComponent {
  readonly state = inject(StateService);
  private readonly i18n = inject(I18nService);
  readonly inline = input<boolean>(false);
  readonly ALL_PLL_INDICES = ALL_PLL_INDICES;

  t(key: string): string {
    return this.i18n.t(key);
  }

  readonly mappedCases = computed<AlgorithmCase[]>(() => {
    return PLL_CASES.map(c => ({
      index: c.index,
      name: c.name,
      imgUrl: this.pllImgUrl(c.index)
    }));
  });

  private pllImgUrl(index: number): string | null {
    const data = pllVizFromCstimer(index);
    if (!data) {
      return null;
    }
    return buildLlImageDataUrl(data.face, data.arrows);
  }

  setMode(mode: 'full' | 'subset'): void {
    this.state.pllSubsetMode.set(mode);
  }

  toggle(index: number, checked: boolean): void {
    const s = new Set(this.state.pllEnabledIndices());
    if (checked) {
      s.add(index);
    } else {
      s.delete(index);
    }
    this.state.pllEnabledIndices.set(s);
  }

  selectAll(): void {
    this.state.pllEnabledIndices.set(new Set(ALL_PLL_INDICES));
  }

  clearAll(): void {
    this.state.pllEnabledIndices.set(new Set());
  }
}