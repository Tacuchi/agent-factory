const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const { writeAgent } = require('../src/core/agent-writer');

const TMP = path.join('/tmp', `af-test-writer-${Date.now()}`);

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

describe('agent-writer multi-target', () => {
  before(async () => {
    await fs.ensureDir(TMP);
  });

  after(async () => {
    await fs.remove(TMP);
  });

  it('writes all expected artifacts for target=all', async () => {
    const out = path.join(TMP, 'all');
    await fs.ensureDir(out);

    const result = await writeAgent({
      name: 'demo',
      role: 'specialist',
      model: 'sonnet',
      tools: 'Read, Grep, Glob, Bash',
      body: '# demo\n\nbody',
      outputDir: out,
      target: 'all',
    });

    assert.ok(await fs.pathExists(result.claude));
    assert.ok(await fs.pathExists(result.codex));
    assert.ok(await fs.pathExists(result.skills));
    assert.ok(await fs.pathExists(result.gemini));
    assert.ok(await fs.pathExists(result.crush));
    assert.ok(await fs.pathExists(result.opencode));
    assert.ok(await fs.pathExists(result.warpOz));

    const geminiContent = await fs.readFile(result.gemini, 'utf8');
    const fm = parseFrontmatter(geminiContent);
    assert.equal(fm.kind, 'local');
    assert.ok(Array.isArray(fm.tools));
    assert.ok(fm.tools.includes('read_file'));
    assert.ok(fm.tools.includes('grep_search'));
  });

  it('writes codex+skills+crush config for target=crush', async () => {
    const out = path.join(TMP, 'crush');
    await fs.ensureDir(out);

    const result = await writeAgent({
      name: 'demo-crush',
      role: 'specialist',
      model: 'sonnet',
      tools: 'Read, Bash',
      body: '# demo\n\nbody',
      outputDir: out,
      target: 'crush',
    });

    assert.ok(await fs.pathExists(result.codex));
    assert.ok(await fs.pathExists(result.skills));
    assert.ok(await fs.pathExists(result.crush));
    assert.equal(result.claude, null);
    assert.equal(result.gemini, null);
  });
});
