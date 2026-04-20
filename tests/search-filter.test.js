const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appScript = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('password refreshes render through the active search filter', () => {
  assert.match(appScript, /function renderFilteredPasswords\(\)/);
  assert.match(appScript, /async function loadPasswords\(\)[\s\S]*renderFilteredPasswords\(\)/);
  assert.doesNotMatch(appScript, /async function loadPasswords\(\)[\s\S]*renderPasswords\(\);/);
});
