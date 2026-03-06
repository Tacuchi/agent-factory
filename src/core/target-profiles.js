const TARGETS = ['claude', 'codex', 'gemini', 'opencode', 'crush', 'warp', 'all'];

const OUTPUT_DESTINATIONS = {
  claudeAgent: '.claude/agents/',
  codexAgent: '.agents/',
  skills: '.agents/skills/',
  geminiAgent: '.gemini/agents/',
  crushConfig: '.crush.json',
  opencodeConfig: '.opencode.json',
  warpOzDoc: 'docs/warp-oz/',
};

const TARGET_OUTPUTS = {
  claude: ['claudeAgent'],
  codex: ['codexAgent', 'skills'],
  gemini: ['geminiAgent'],
  opencode: ['codexAgent', 'skills', 'opencodeConfig'],
  crush: ['codexAgent', 'skills', 'crushConfig'],
  warp: ['skills', 'warpOzDoc'],
  all: ['claudeAgent', 'codexAgent', 'skills', 'geminiAgent', 'opencodeConfig', 'crushConfig', 'warpOzDoc'],
};

function isValidTarget(target) {
  return TARGETS.includes(target);
}

function resolveOutputs(target) {
  if (!isValidTarget(target)) {
    throw new Error(`Invalid target: ${target}`);
  }

  const outputs = TARGET_OUTPUTS[target] || [];
  return [...new Set(outputs)];
}

function resolveTargets(target) {
  if (!isValidTarget(target)) {
    throw new Error(`Invalid target: ${target}`);
  }

  if (target === 'all') {
    return ['claude', 'codex', 'gemini', 'opencode', 'crush', 'warp'];
  }

  return [target];
}

function getTargetDestinations(target) {
  const outputs = resolveOutputs(target);
  const destinations = outputs.map((key) => OUTPUT_DESTINATIONS[key]).filter(Boolean);
  return [...new Set(destinations)];
}

module.exports = {
  TARGETS,
  OUTPUT_DESTINATIONS,
  TARGET_OUTPUTS,
  isValidTarget,
  resolveOutputs,
  resolveTargets,
  getTargetDestinations,
};
