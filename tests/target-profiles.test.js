const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TARGETS, isValidTarget, resolveOutputs, getTargetDestinations } = require('../src/core/target-profiles');

describe('target-profiles', () => {
  it('contains expected target values', () => {
    assert.deepEqual(TARGETS, ['claude', 'codex', 'gemini', 'opencode', 'crush', 'warp', 'all']);
  });

  it('validates known targets', () => {
    assert.equal(isValidTarget('claude'), true);
    assert.equal(isValidTarget('all'), true);
    assert.equal(isValidTarget('invalid'), false);
  });

  it('resolves all target outputs', () => {
    const outputs = resolveOutputs('all');
    assert.ok(outputs.includes('claudeAgent'));
    assert.ok(outputs.includes('codexAgent'));
    assert.ok(outputs.includes('skills'));
    assert.ok(outputs.includes('geminiAgent'));
    assert.ok(outputs.includes('crushConfig'));
    assert.ok(outputs.includes('opencodeConfig'));
    assert.ok(outputs.includes('warpOzDoc'));
  });

  it('resolves crush destinations including config', () => {
    const destinations = getTargetDestinations('crush');
    assert.ok(destinations.includes('.agents/'));
    assert.ok(destinations.includes('.agents/skills/'));
    assert.ok(destinations.includes('.crush.json'));
  });
});
