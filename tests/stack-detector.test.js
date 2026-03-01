const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const { detect, deriveAlias, sanitize } = require('../src/core/stack-detector');

const TMP = path.join('/tmp', `af-test-detector-${Date.now()}`);

async function makeFixture(name, files = {}) {
  const dir = path.join(TMP, name);
  await fs.ensureDir(dir);
  for (const [file, content] of Object.entries(files)) {
    const fp = path.join(dir, file);
    await fs.ensureDir(path.dirname(fp));
    await fs.writeFile(fp, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

describe('stack-detector', () => {
  before(async () => {
    await fs.ensureDir(TMP);
  });

  after(async () => {
    await fs.remove(TMP);
  });

  describe('detect()', () => {
    it('detects Bash/Shell project from .sh files', async () => {
      const dir = await makeFixture('bash-project', {
        'setup.sh': '#!/bin/bash\necho hello',
        'deploy.sh': '#!/bin/bash\necho deploy',
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'Bash');
      assert.equal(result.framework, 'Shell');
      assert.ok(result.stackCsv.includes('Bash'));
      assert.ok(result.verifyCommands.includes('bash'));
    });

    it('detects Node.js CLI from package.json with bin field', async () => {
      const dir = await makeFixture('node-cli', {
        'package.json': { name: 'my-cli', version: '1.0.0', bin: { 'my-cli': 'bin/cli.js' } },
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'Node.js');
      assert.equal(result.framework, 'CLI');
      assert.ok(result.stackCsv.includes('Node.js'));
      assert.ok(result.stackCsv.includes('CLI'));
    });

    it('detects plain JavaScript from package.json without bin or framework', async () => {
      const dir = await makeFixture('plain-js', {
        'package.json': { name: 'plain', version: '1.0.0' },
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'JavaScript');
      assert.ok(result.stackCsv.includes('JavaScript'));
    });

    it('detects React from package.json with react dependency', async () => {
      const dir = await makeFixture('react-app', {
        'package.json': { name: 'app', version: '1.0.0', dependencies: { react: '^18.0.0' } },
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'TypeScript/JS');
      assert.equal(result.framework, 'React');
      assert.ok(result.stackCsv.includes('React'));
    });

    it('detects Makefile standalone project', async () => {
      const dir = await makeFixture('make-project', {
        'Makefile': 'all:\n\techo build',
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'Make');
      assert.ok(result.stackCsv.includes('Make'));
    });

    it('returns Generic for empty directory', async () => {
      const dir = await makeFixture('empty-dir');
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'Generic');
    });

    it('prefers package.json frameworks over .sh fallback', async () => {
      const dir = await makeFixture('node-with-sh', {
        'package.json': { name: 'app', version: '1.0.0', dependencies: { express: '^4.0.0' } },
        'deploy.sh': '#!/bin/bash',
      });
      const result = await detect(dir);
      assert.equal(result.primaryTech, 'TypeScript/JS');
      assert.equal(result.framework, 'Node.js');
    });
  });

  describe('deriveAlias()', () => {
    it('normalizes underscores and dots to hyphens', () => {
      assert.equal(deriveAlias('/home/user/my_repo.name'), 'my-repo-name');
    });

    it('takes only the basename', () => {
      assert.equal(deriveAlias('/a/b/c/my-project'), 'my-project');
    });

    it('truncates to 30 characters', () => {
      const long = 'a'.repeat(50);
      assert.equal(deriveAlias(`/path/${long}`).length, 30);
    });
  });

  describe('sanitize()', () => {
    it('strips backticks', () => {
      assert.equal(sanitize('hello`world'), 'helloworld');
    });

    it('strips command substitution', () => {
      assert.equal(sanitize('hello$(rm -rf /)world'), 'helloworld');
    });

    it('strips template literals', () => {
      assert.equal(sanitize('hello${var}world'), 'helloworld');
    });

    it('strips HTML comments', () => {
      assert.equal(sanitize('hello<!--comment-->world'), 'helloworld');
    });

    it('strips angle brackets', () => {
      assert.equal(sanitize('hello<script>world'), 'helloscriptworld');
    });

    it('respects maxLen', () => {
      assert.equal(sanitize('abcdef', 3), 'abc');
    });

    it('returns empty string for falsy input', () => {
      assert.equal(sanitize(null), '');
      assert.equal(sanitize(''), '');
      assert.equal(sanitize(undefined), '');
    });
  });
});
