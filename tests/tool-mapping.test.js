const { describe, it } = require('node:test');
const assert = require('node:assert');
const { TOOL_MAP, mapTools, getCanonicalTools } = require('../src/core/tool-mapping');

describe('tool-mapping', () => {
    describe('TOOL_MAP', () => {
        it('has entries for all 5 targets', () => {
            const targets = ['claude', 'codex', 'gemini', 'crush', 'warp'];
            for (const t of targets) {
                assert.ok(TOOL_MAP[t], `Missing mapping for ${t}`);
            }
        });

        it('maps all canonical tools for each target', () => {
            const canonical = ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'Task'];
            for (const [target, mapping] of Object.entries(TOOL_MAP)) {
                for (const tool of canonical) {
                    assert.ok(mapping[tool] !== undefined, `${target} missing mapping for ${tool}`);
                }
            }
        });
    });

    describe('mapTools', () => {
        it('maps Claude tools (identity)', () => {
            assert.strictEqual(mapTools('Read, Write, Bash', 'claude'), 'Read, Write, Bash');
        });

        it('maps to Gemini-native tool names', () => {
            assert.strictEqual(mapTools('Read, Grep, Bash', 'gemini'), 'read_file, grep_search, run_shell_command');
        });

        it('maps to Crush-native tool names', () => {
            assert.strictEqual(mapTools('Read, Grep, Task', 'crush'), 'view, grep, agent');
        });

        it('maps to Codex-native tool names', () => {
            assert.strictEqual(mapTools('Read, Task', 'codex'), 'read_file, spawn_agent');
        });

        it('passes through unknown tools unchanged', () => {
            assert.strictEqual(mapTools('Read, CustomTool', 'gemini'), 'read_file, CustomTool');
        });

        it('handles empty string', () => {
            assert.strictEqual(mapTools('', 'claude'), '');
        });

        it('returns original for unknown target', () => {
            assert.strictEqual(mapTools('Read, Write', 'unknown'), 'Read, Write');
        });
    });

    describe('getCanonicalTools', () => {
        it('returns all canonical tool names', () => {
            const tools = getCanonicalTools();
            assert.ok(tools.includes('Read'));
            assert.ok(tools.includes('Task'));
            assert.strictEqual(tools.length, 7);
        });
    });
});
