import assert from 'node:assert/strict';

import {
  formatDateValue,
  parseDateOnlyValue,
  parseDateValue,
  toDateOnlyString,
} from '../src/lib/date-utils.ts';

const dateOnly = parseDateOnlyValue('2026-05-24');

assert.ok(dateOnly, 'date-only strings should parse');
assert.equal(dateOnly.getFullYear(), 2026);
assert.equal(dateOnly.getMonth(), 4);
assert.equal(dateOnly.getDate(), 24);

const genericDate = parseDateValue('2026-05-24');
assert.ok(genericDate, 'generic parsing should support date-only strings');
assert.equal(genericDate.getFullYear(), 2026);
assert.equal(genericDate.getMonth(), 4);
assert.equal(genericDate.getDate(), 24);

assert.equal(formatDateValue('2026-05-24'), '24/05/2026');
assert.equal(toDateOnlyString(new Date(2026, 4, 24)), '2026-05-24');
assert.equal(toDateOnlyString('2026-05-24'), '2026-05-24');

console.log('date-utils tests passed');
