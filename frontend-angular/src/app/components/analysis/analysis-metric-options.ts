import type { PrimaryMetric } from '../../lib/analysis-selectors';

export const METRIC_OPTIONS: { value: PrimaryMetric; labelKey: string }[] = [
  { value: 'timestamp', labelKey: 'metricTimestamp' },
  { value: 'total', labelKey: 'metricTotal' },
  { value: 'inspection', labelKey: 'metricInspection' },
  { value: 'moveCount', labelKey: 'metricMoveCount' },
  { value: 'cross', labelKey: 'cross' },
  { value: 'f2l', labelKey: 'f2l' },
  { value: 'oll', labelKey: 'oll' },
  { value: 'pll', labelKey: 'pll' },
  { value: 'ollRecog', labelKey: 'ollRecog' },
  { value: 'pllRecog', labelKey: 'pllRecog' },
];
