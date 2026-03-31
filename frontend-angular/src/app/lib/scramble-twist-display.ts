/**
 * HTML for Bluetooth twist phase: csTimer-like segments (done / current / upcoming).
 * Move tokens are escaped; only WCA face turns expected.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param sequence scramble tokens
 * @param progress number of leading moves already applied (0 .. sequence.length)
 * @param undoFirst optional inverse move to show first (highlighted) when user made one wrong face turn
 */
export function buildScrambleTwistHighlightHtml(
  sequence: string[],
  progress: number,
  undoFirst: string | null = null,
): string {
  if (sequence.length === 0 && !undoFirst) {
    return '';
  }
  const parts: string[] = [];
  if (undoFirst) {
    const u = undoFirst.trim();
    if (u) {
      parts.push(
        `<span class="scrm-seg scrm-undo" title="Undo wrong turn — do this move first">${escapeHtml(u)}</span>`,
      );
    }
  }
  for (let i = 0; i < sequence.length; i++) {
    const raw = sequence[i] ?? '';
    const esc = escapeHtml(raw);
    let cls: string;
    if (i < progress) {
      cls = 'scrm-done';
    } else if (i === progress) {
      cls = 'scrm-cur';
    } else {
      cls = 'scrm-todo';
    }
    parts.push(`<span class="scrm-seg ${cls}">${esc}</span>`);
  }
  return parts.join(' ');
}
