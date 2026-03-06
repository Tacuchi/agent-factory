const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeCrushConfig, CRUSH_SCHEMA_URL } = require('../src/core/crush-config');

describe('crush-config', () => {
  it('builds default options when empty', () => {
    const merged = mergeCrushConfig({});
    assert.equal(merged.$schema, CRUSH_SCHEMA_URL);
    assert.equal(merged.options.initialize_as, 'AGENTS.md');
    assert.ok(merged.options.skills_paths.includes('.agents/skills'));
  });

  it('preserves existing keys and appends required options', () => {
    const merged = mergeCrushConfig({
      providers: { openai: { disabled: false } },
      options: { skills_paths: ['custom/skills'], foo: 'bar' },
    });

    assert.ok(merged.providers.openai);
    assert.equal(merged.options.foo, 'bar');
    assert.equal(merged.options.initialize_as, 'AGENTS.md');
    assert.ok(merged.options.skills_paths.includes('custom/skills'));
    assert.ok(merged.options.skills_paths.includes('.agents/skills'));
  });
});
