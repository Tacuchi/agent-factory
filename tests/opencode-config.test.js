const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeOpenCodeConfig } = require('../src/core/opencode-config');

describe('opencode-config', () => {
  it('builds default options when empty', () => {
    const merged = mergeOpenCodeConfig({});
    assert.equal(merged.options.initialize_as, 'AGENTS.md');
    assert.ok(merged.options.skills_paths.includes('.agents/skills'));
  });

  it('preserves existing options and appends required skills path', () => {
    const merged = mergeOpenCodeConfig({
      options: { skills_paths: ['legacy/skills'], custom: true },
      foo: 'bar',
    });

    assert.equal(merged.foo, 'bar');
    assert.equal(merged.options.custom, true);
    assert.equal(merged.options.initialize_as, 'AGENTS.md');
    assert.ok(merged.options.skills_paths.includes('legacy/skills'));
    assert.ok(merged.options.skills_paths.includes('.agents/skills'));
  });
});
