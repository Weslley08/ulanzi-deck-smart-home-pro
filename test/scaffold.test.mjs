import test from 'node:test';
import assert from 'node:assert/strict';

test('scaffold ready', () => {
  assert.equal('com.ulanzi.smarthomepro'.startsWith('com.'), true);
});
