import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseArchitect } from '../src/lib/account-boundary.js';

test('Arquiteto individual exige autorização na conta ativa do próprio usuário', () => {
  const user = { id: 'estudante', role: 'user' };
  const profile = { id: user.id, status: 'active', architectEnabled: true };

  assert.equal(canUseArchitect(user, profile), true);
  for (const other of [
    null,
    { ...profile, id: 'outra-conta' },
    { ...profile, status: 'pending' },
    { ...profile, status: 'suspended' },
    { ...profile, architectEnabled: false },
    { ...profile, architectEnabled: 'true' },
    { id: user.id, status: 'active' },
  ]) assert.equal(canUseArchitect(user, other), false);

  assert.equal(canUseArchitect(null, profile), false);
  assert.equal(canUseArchitect({ ...user, role: 'editor' }, profile), false);
  assert.equal(canUseArchitect({ id: 'admin', role: 'admin' }, null), true);
});
