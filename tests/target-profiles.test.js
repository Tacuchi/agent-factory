const { describe, it } = require('node:test');
const assert = require('node:assert');
const { TARGETS, resolveProfile, validateTarget } = require('../src/core/target-profiles');

describe('target-profiles', () => {
    describe('TARGETS', () => {
        it('includes 5 valid targets', () => {
            assert.deepStrictEqual(TARGETS, ['claude', 'codex', 'gemini', 'crush', 'warp']);
        });

        it('does not include all or opencode', () => {
            assert.ok(!TARGETS.includes('all'));
            assert.ok(!TARGETS.includes('opencode'));
        });
    });

    describe('resolveProfile', () => {
        it('returns profile for valid target', () => {
            const profile = resolveProfile('claude');
            assert.strictEqual(profile.id, 'claude');
            assert.strictEqual(profile.contextFile, 'CLAUDE.md');
            assert.strictEqual(profile.agentDir, '.claude/agents');
        });

        it('returns profile for gemini', () => {
            const profile = resolveProfile('gemini');
            assert.strictEqual(profile.id, 'gemini');
            assert.strictEqual(profile.agentDir, '.gemini/agents');
            assert.strictEqual(profile.frontmatterFormat, 'yaml-md');
        });

        it('returns profile for crush with configFile', () => {
            const profile = resolveProfile('crush');
            assert.strictEqual(profile.configFile, '.crush.json');
            assert.strictEqual(profile.agentDir, null);
        });

        it('returns profile for warp (skills-only)', () => {
            const profile = resolveProfile('warp');
            assert.strictEqual(profile.agentDir, null);
            assert.strictEqual(profile.contextFile, null);
            assert.strictEqual(profile.skillsDir, '.agents/skills');
        });

        it('returns null for invalid target', () => {
            assert.strictEqual(resolveProfile('invalid'), null);
            assert.strictEqual(resolveProfile(null), null);
            assert.strictEqual(resolveProfile(''), null);
        });

        it('is case-insensitive', () => {
            assert.strictEqual(resolveProfile('Claude').id, 'claude');
            assert.strictEqual(resolveProfile('GEMINI').id, 'gemini');
        });
    });

    describe('validateTarget', () => {
        it('accepts valid targets', () => {
            for (const t of TARGETS) {
                const result = validateTarget(t);
                assert.ok(result.valid, `${t} should be valid`);
                assert.ok(result.profile, `${t} should return profile`);
            }
        });

        it('rejects all', () => {
            const result = validateTarget('all');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error.includes('not supported'));
        });

        it('rejects opencode with crush suggestion', () => {
            const result = validateTarget('opencode');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error.includes('crush'));
        });

        it('rejects unknown target', () => {
            const result = validateTarget('cursor');
            assert.strictEqual(result.valid, false);
            assert.ok(result.error.includes('Unknown'));
        });

        it('rejects empty/null', () => {
            assert.strictEqual(validateTarget('').valid, false);
            assert.strictEqual(validateTarget(null).valid, false);
            assert.strictEqual(validateTarget(undefined).valid, false);
        });
    });
});
