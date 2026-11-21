import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { execPath } from 'node:process';
import test from 'node:test';
import { URL, fileURLToPath } from 'node:url';

test('o bundle carrega o kit da Central sem injeção de módulos', () => {
  const chapter = 'da-10-1';
  const kit = (name) => JSON.parse(readFileSync(new URL(`../src/data/kits/${chapter}/${name}.json`, import.meta.url), 'utf8'));
  const countNodes = (nodes) => nodes.reduce((total, node) => total + 1 + countNodes(node.f ?? []), 0);
  const counts = [countNodes(kit('mapa').ramos), kit('cartoes').length, kit('itens').length];
  const check = fileURLToPath(new URL('./check-central-kit-build.mjs', import.meta.url));
  execFileSync(execPath, [check, chapter, chapter, ...counts.map(String)]);
});
