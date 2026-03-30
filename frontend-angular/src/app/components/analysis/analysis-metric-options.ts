import type { PrimaryMetric } from '../../lib/analysis-selectors';

export const METRIC_OPTIONS: { value: PrimaryMetric; label: string }[] = [
  { value: 'timestamp', label: 'Solve time (newest first)' },
  { value: 'total', label: 'Total time' },
  { value: 'inspection', label: 'Inspection setting' },
  { value: 'moveCount', label: 'Move count' },
  { value: 'cross', label: 'Cross' },
  { value: 'f2l', label: 'F2L' },
  { value: 'oll', label: 'OLL' },
  { value: 'pll', label: 'PLL' },
  { value: 'ollRecog', label: 'OLL recog' },
  { value: 'pllRecog', label: 'PLL recog' },
];
