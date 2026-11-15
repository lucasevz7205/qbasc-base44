import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { isAuthPage, safeReturnTo } from '../src/lib/authReturnTo.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('as entradas do design usam o formulário real e os ativos locais', () => {
  for (const path of ['src/routes/login.jsx', 'src/routes/boas-vindas.jsx']) {
    assert.match(read(path), /component: LoginPage/);
    assert.match(read(path), /ssr: false/);
  }
  assert.match(read('src/components/auth/LoginPage.jsx'), /await loginWithMfa\(email, password\)/);
  assert.match(read('src/components/auth/LoginPage.jsx'), /<MfaFlow challenge=\{mfaChallenge\} returnTo=\{returnTo\}/);
  assert.match(read('src/components/auth/AuthLayout.jsx'), /qb-scene-night/);
  for (const asset of ['logo/logo-q-sword-full.jpg', 'scenes/ascension-night.jpg']) {
    assert.ok(statSync(new URL('../public/assets/' + asset, import.meta.url)).size > 0);
  }
});

test('retorno preserva a tela interna e evita desvio externo ou volta ao login', () => {
  globalThis.window = { location: { origin: 'https://qbasc.example' } };
  try {
    assert.equal(safeReturnTo('?returnTo=%2Fplanejamento%3Ftab%3Dsemana'), '/planejamento?tab=semana');
    assert.equal(safeReturnTo('?from_url=%2Fdesempenho'), '/desempenho');
    assert.equal(safeReturnTo('?returnTo=https%3A%2F%2Fother.example'), '/');
    assert.equal(safeReturnTo('?returnTo=%2Fboas-vindas'), '/');
    assert.equal(isAuthPage('/boas-vindas/'), true);
  } finally { delete globalThis.window; }
});
