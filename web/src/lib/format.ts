export function formatDate(input) {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function isoDate(input) {
  if (!input) return '';
  return new Date(input).toISOString();
}

export function plainTextFromRich(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((b) => {
      if (typeof b === 'string') return b;
      if (b?.children) {
        return b.children.map((c) => c?.text || '').join('');
      }
      return '';
    })
    .join('\n\n');
}
