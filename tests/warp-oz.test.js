const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildWarpOzEnvironmentExample } = require('../src/core/warp-oz');

describe('warp-oz', () => {
  it('returns documentation with skills portability note', () => {
    const content = buildWarpOzEnvironmentExample();
    assert.ok(content.includes('.agents/skills/'));
    assert.ok(content.includes('Warp Oz'));
  });
});
