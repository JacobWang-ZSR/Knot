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

test('password block titles navigate to their address when clicked', () => {
  assert.match(appScript, /function getPasswordAddress\(pwd\)/);
  assert.match(appScript, /data-navigate-address="\$\{escapeHtml\(getPasswordAddress\(pwd\)\)\}"/);
  assert.match(appScript, /function navigateToAddress\(address\)/);
  assert.match(appScript, /passwordsContainer\.addEventListener\('click'[\s\S]*closest\('\[data-navigate-address\]'\)[\s\S]*navigateToAddress\([^)]+\.dataset\.navigateAddress\)/);
  assert.doesNotMatch(appScript, /navigateToAddress\(block\.dataset\.address\)/);
});
