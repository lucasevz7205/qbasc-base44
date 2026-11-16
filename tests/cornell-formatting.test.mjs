import test from 'node:test';
import assert from 'node:assert/strict';
import { cornellPlainText, readCornellRich, writeCornellRich } from '../src/lib/cornell-rich.js';
import { cornellPairTitle, readCornellPairs } from '../src/lib/cornell-pairs.js';

test('texto legado mantém espaços, quebras e caracteres literais ao carregar e salvar', () => {
  for (const text of ['', '  Anotação antiga\n\n• José\n', '<negrito> é texto literal']) {
    assert.equal(writeCornellRich(readCornellRich(text)), text);
    assert.equal(cornellPlainText(text), text);
  }
});

test('listas longas, recuos e destaques continuam vinculados ao campo após sincronizar', () => {
  const ops = [{ insert: 'Regra', attributes: { bold: true, underline: true, strike: true, color: '#f1e8d5', background: '#a92e3a' } }, { insert: '\n' }];
  for (let i = 1; i <= 25; i++) ops.push({ insert: 'Item ' + i }, { insert: '\n', attributes: { list: 'ordered' } });
  ops.push({ insert: 'Subitem' }, { insert: '\n', attributes: { list: 'bullet', indent: 1 } });
  const stored = writeCornellRich({ ops });
  assert.deepEqual(readCornellRich(stored).ops, ops);
  assert.match(cornellPlainText(stored), /Item 24\nItem 25\nSubitem/);
  const [pair] = readCornellPairs(JSON.stringify([{ id: 'p1', cue: stored, note: 'Nota anterior' }]));
  assert.equal(cornellPairTitle(pair, 0), 'Regra');
  assert.equal(pair.note, 'Nota anterior');
});

test('formatos externos e mídia são removidos e o texto selecionado é preservado', () => {
  const value = writeCornellRich({ ops: [
    { insert: 'Trecho', attributes: { bold: true, color: '#3366ff', link: 'https://example.test' } },
    { insert: { image: 'https://example.test/asset.png' } }, { insert: '\n' },
  ] });
  assert.deepEqual(readCornellRich(value).ops, [{ insert: 'Trecho', attributes: { bold: true } }, { insert: '\n' }]);
});
