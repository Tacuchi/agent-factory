const TARGETS = ['claude', 'codex', 'gemini', 'crush', 'warp'];

const PROFILES = {
  claude: {
    id: 'claude',
    contextFile: 'CLAUDE.md',
    agentDir: '.claude/agents',
    skillsDir: '.agents/skills',
    configFile: null,
    frontmatterFormat: 'yaml-md',
  },
  codex: {
    id: 'codex',
    contextFile: 'AGENTS.md',
    agentDir: '.agents',
    skillsDir: '.agents/skills',
    configFile: null,
    frontmatterFormat: 'plain-md',
  },
  gemini: {
    id: 'gemini',
    contextFile: 'GEMINI.md',
    agentDir: '.gemini/agents',
    skillsDir: '.agents/skills',
    configFile: null,
    frontmatterFormat: 'yaml-md',
  },
  crush: {
    id: 'crush',
    contextFile: 'AGENTS.md',
    agentDir: null,
    skillsDir: '.agents/skills',
    configFile: '.crush.json',
    frontmatterFormat: 'json',
  },
  warp: {
    id: 'warp',
    contextFile: null,
    agentDir: null,
    skillsDir: '.agents/skills',
    configFile: null,
    frontmatterFormat: 'skill-only',
  },
};

function resolveProfile(target) {
  if (!target || typeof target !== 'string') {
    return null;
  }
  const key = target.toLowerCase().trim();
  return PROFILES[key] || null;
}

function validateTarget(target) {
  if (!target) return { valid: false, error: '--target is required' };
  const key = target.toLowerCase().trim();
  if (key === 'all') return { valid: false, error: "--target 'all' is not supported. Use a single target: " + TARGETS.join(', ') };
  if (key === 'opencode') return { valid: false, error: "'opencode' is archived. Use 'crush' instead" };
  if (!TARGETS.includes(key)) return { valid: false, error: `Unknown target '${target}'. Valid targets: ${TARGETS.join(', ')}` };
  return { valid: true, profile: PROFILES[key] };
}

module.exports = { TARGETS, PROFILES, resolveProfile, validateTarget };
