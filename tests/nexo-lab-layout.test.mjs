import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/components/qb/architect/nexo-experiments.css', import.meta.url), 'utf8');

test('Laboratório Visual: nenhum texto abaixo de 13 px', () => {
  const sizes = [...css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
  const shorthand = [...css.matchAll(/font:(?:\d+ )(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
  assert.ok(sizes.length > 20);
  assert.deepEqual([...sizes, ...shorthand].filter(size => size < 13), []);
  assert.doesNotMatch(css, /clamp\((?:[0-9]|1[0-2])px/);
});

test('Laboratório Visual: controles com 44 px e botões Certo/Errado grandes', () => {
  assert.match(css, /\.nexo-exp \.qb-seg__opt\{min-height:44px/);
  assert.match(css, /\.nexo-choice\{[^}]*min-height:56px/);
});
