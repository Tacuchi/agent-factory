// Mapping canónico (Claude-style) → nativo por plataforma
const TOOL_MAP = {
    claude: {
        Read: 'Read', Write: 'Write', Edit: 'Edit',
        Grep: 'Grep', Glob: 'Glob', Bash: 'Bash',
        Task: 'Task',
    },
    codex: {
        Read: 'read_file', Write: 'write', Edit: 'edit',
        Grep: 'grep', Glob: 'glob', Bash: 'shell',
        Task: 'spawn_agent',
    },
    gemini: {
        Read: 'read_file', Write: 'write_file', Edit: 'replace',
        Grep: 'grep_search', Glob: 'glob', Bash: 'run_shell_command',
        Task: 'complete_task',
    },
    crush: {
        Read: 'view', Write: 'write', Edit: 'edit',
        Grep: 'grep', Glob: 'glob', Bash: 'bash',
        Task: 'agent',
    },
    warp: {
        Read: 'Read', Write: 'Write', Edit: 'Edit',
        Grep: 'Grep', Glob: 'Glob', Bash: 'Bash',
        Task: 'Task',
    },
};

function mapTools(canonicalToolsCsv, target) {
    const mapping = TOOL_MAP[target];
    if (!mapping) return canonicalToolsCsv;

    return canonicalToolsCsv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => mapping[t] || t)
        .join(', ');
}

function getCanonicalTools() {
    return Object.keys(TOOL_MAP.claude);
}

module.exports = { TOOL_MAP, mapTools, getCanonicalTools };
