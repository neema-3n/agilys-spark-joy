import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDevLoginDefaults } from './dev-login-defaults.ts';

test('retient les variables NEXT_PUBLIC en développement', () => {
  const defaults = resolveDevLoginDefaults({
    NODE_ENV: 'development',
    NEXT_PUBLIC_DEV_LOGIN_EMAIL: 'next@agilys.local',
    NEXT_PUBLIC_DEV_LOGIN_PASSWORD: 'NextPublic123!',
  });

  assert.deepEqual(defaults, {
    email: 'next@agilys.local',
    password: 'NextPublic123!',
  });
});

test('désactive le pré-remplissage hors mode development', () => {
  const defaults = resolveDevLoginDefaults({
    NODE_ENV: 'test',
    NEXT_PUBLIC_DEV_LOGIN_EMAIL: 'next@agilys.local',
    NEXT_PUBLIC_DEV_LOGIN_PASSWORD: 'NextPublic123!',
  });

  assert.equal(defaults, null);
});

test('désactive le pré-remplissage si une seule valeur est fournie', () => {
  const defaults = resolveDevLoginDefaults({
    NODE_ENV: 'development',
    NEXT_PUBLIC_DEV_LOGIN_EMAIL: 'next@agilys.local',
  });

  assert.equal(defaults, null);
});

test('ignore les valeurs vides après trim', () => {
  const defaults = resolveDevLoginDefaults({
    NODE_ENV: 'development',
    NEXT_PUBLIC_DEV_LOGIN_EMAIL: '  ',
    NEXT_PUBLIC_DEV_LOGIN_PASSWORD: '  ',
  });

  assert.equal(defaults, null);
});
