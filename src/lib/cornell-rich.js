// Versioned Delta in the existing Cornell string fields. Plain notes stay plain until formatted.
const PREFIX = 'qbasc-cornell-rich-v1:';

export const CORNELL_INK = [
  { name: 'Marfim', value: '#f1e8d5' },
  { name: 'Bronze', value: '#a58a67' },
  { name: 'Dourado', value: '#d0b386' },
  { name: 'Brasa', value: '#ee8a7c' },
];
export const CORNELL_HIGHLIGHTS = [
  { name: 'Dourado', value: '#d0b386', ink: '#0a1e34' },
  { name: 'Bronze', value: '#a58a67', ink: '#0a1e34' },
  { name: 'Carmesim', value: '#a92e3a', ink: '#f1e8d5' },
];

const ink = new Set([...CORNELL_INK.map(tone => tone.value), ...CORNELL_HIGHLIGHTS.map(tone => tone.ink)]);
const highlights = new Set(CORNELL_HIGHLIGHTS.map(tone => tone.value));
const inline = ['bold', 'underline', 'strike'];
export const CORNELL_FORMATS = [...inline, 'color', 'background', 'list', 'indent'];

function cleanAttributes(value = {}) {
  const attrs = {};
  for (const key of inline) if (value?.[key] === true) attrs[key] = true;
  const color = typeof value?.color === 'string' ? value.color.toLowerCase() : '';
  const background = typeof value?.background === 'string' ? value.background.toLowerCase() : '';
  if (ink.has(color)) attrs.color = color;
  if (highlights.has(background)) attrs.background = background;
  if (value?.list === 'ordered' || value?.list === 'bullet') attrs.list = value.list;
  if (Number.isInteger(value?.indent) && value.indent >= 1 && value.indent <= 8) attrs.indent = value.indent;
  return attrs;
}

export function cornellContentOps(ops = []) {
  const clean = [];
  for (const op of ops) {
    if (typeof op?.insert !== 'string' || !op.insert) continue;
    const attributes = cleanAttributes(op.attributes);
    clean.push(Object.keys(attributes).length ? { insert: op.insert, attributes } : { insert: op.insert });
  }
  return clean;
}

function asDocument(ops) {
  const clean = cornellContentOps(ops);
  if (!clean.at(-1)?.insert.endsWith('\n')) clean.push({ insert: '\n' });
  return { ops: clean };
}

export function readCornellRich(value = '') {
  if (value.startsWith(PREFIX)) {
    try {
      const stored = JSON.parse(value.slice(PREFIX.length));
      if (Array.isArray(stored?.ops) && stored.ops.every(op => typeof op?.insert === 'string')) return asDocument(stored.ops);
    } catch {
      // A plain note can contain the prefix.
    }
  }
  return asDocument([{ insert: value.replace(/\r\n?/g, '\n') + '\n' }]);
}

const plainFromOps = ops => ops.map(op => op.insert).join('').replace(/\n$/, '');

export function cornellPlainText(value = '') {
  return value.startsWith(PREFIX) ? plainFromOps(readCornellRich(value).ops) : value;
}

export function writeCornellRich(delta) {
  const doc = asDocument(delta.ops);
  const plain = plainFromOps(doc.ops);
  return doc.ops.some(op => op.attributes) || plain.startsWith(PREFIX) ? PREFIX + JSON.stringify(doc) : plain;
}
