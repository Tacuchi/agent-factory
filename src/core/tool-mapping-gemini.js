const CLAUDE_TO_GEMINI_TOOL = {
  Read: 'read_file',
  Write: 'write_file',
  Edit: 'replace',
  Grep: 'grep_search',
  Glob: 'glob',
  Bash: 'run_shell_command',
  Task: 'complete_task',
};

function mapClaudeToolsToGemini(tools) {
  const mapped = new Set();

  for (const tool of tools) {
    const key = String(tool || '').trim();
    if (!key) {
      continue;
    }

    const geminiTool = CLAUDE_TO_GEMINI_TOOL[key];
    if (geminiTool) {
      mapped.add(geminiTool);
    }
  }

  if (mapped.size === 0) {
    mapped.add('read_file');
  }

  return [...mapped];
}

module.exports = {
  CLAUDE_TO_GEMINI_TOOL,
  mapClaudeToolsToGemini,
};
