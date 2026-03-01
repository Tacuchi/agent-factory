const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFlags, formatSpecialistList } = require('../src/commands/create');

describe('create command', () => {
  describe('normalizeFlags()', () => {
    it('sets all defaults when no options provided', () => {
      const result = normalizeFlags({ name: 'test' });
      assert.equal(result.name, 'test');
      assert.equal(result.role, 'specialist');
      assert.equal(result.model, 'sonnet');
      assert.equal(result.scope, '');
      assert.equal(result.target, 'all');
      assert.equal(result.tools, '');
      assert.equal(result.yes, false);
      assert.equal(result.specialists, '');
      assert.equal(result.repoCount, 0);
      assert.equal(result.description, '');
      assert.equal(result.instructions, '');
      assert.equal(result.stack, '');
      assert.equal(result.dryRun, false);
    });

    it('propagates --stack flag', () => {
      const result = normalizeFlags({ name: 'test', stack: 'Bash,Shell' });
      assert.equal(result.stack, 'Bash,Shell');
    });

    it('propagates --dryRun flag', () => {
      const result = normalizeFlags({ name: 'test', dryRun: true });
      assert.equal(result.dryRun, true);
    });

    it('resolves scope to absolute path', () => {
      const result = normalizeFlags({ name: 'test', scope: '.' });
      assert.ok(result.scope.startsWith('/'), 'scope should be absolute');
    });

    it('resolves output to absolute path', () => {
      const result = normalizeFlags({ name: 'test', output: './out' });
      assert.ok(result.output.startsWith('/'), 'output should be absolute');
    });
  });

  describe('formatSpecialistList()', () => {
    it('returns empty string for empty input', () => {
      assert.equal(formatSpecialistList(''), '');
      assert.equal(formatSpecialistList(null), '');
      assert.equal(formatSpecialistList(undefined), '');
    });

    it('formats single specialist', () => {
      assert.equal(formatSpecialistList('repo-backend-agent'), '`repo-backend-agent`');
    });

    it('formats two specialists with "y"', () => {
      const result = formatSpecialistList('repo-a-agent,repo-b-agent');
      assert.equal(result, '`repo-a-agent` y `repo-b-agent`');
    });

    it('formats three specialists with commas and "y"', () => {
      const result = formatSpecialistList('a,b,c');
      assert.equal(result, '`a`, `b` y `c`');
    });

    it('trims whitespace from names', () => {
      const result = formatSpecialistList(' a , b ');
      assert.equal(result, '`a` y `b`');
    });
  });
});
