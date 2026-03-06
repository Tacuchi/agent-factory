const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { validateTarget } = require('./target-profiles');
const { mapTools } = require('./tool-mapping');

const TOOLS_BY_ROLE = {
  specialist: 'Read, Write, Edit, Bash',
  coordinator: 'Read, Glob, Grep, Task, Bash',
  reviewer: 'Read, Grep, Glob, Bash',
  architect: 'Read, Grep, Glob, Bash',
  custom: 'Read, Bash',
};

function buildClaudeFormat(name, description, model, tools, body) {
  const frontmatter = yaml.dump(
    { name, description, tools, model },
    { lineWidth: -1, quotingType: "'", forceQuotes: false }
  ).trim();
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function buildCodexFormat(body) {
  return `${body}\n`;
}

function buildGeminiFormat(name, description, model, tools, body) {
  const fm = {
    name,
    kind: 'local',
    description,
    tools: tools.split(',').map((t) => t.trim()).filter(Boolean),
    model: model === 'inherit' ? undefined : `gemini-3-${model === 'opus' ? 'pro' : model === 'haiku' ? 'flash' : 'pro'}`,
    max_turns: 15,
    timeout_mins: 5,
  };
  const frontmatter = yaml.dump(fm, { lineWidth: -1, quotingType: "'", forceQuotes: false }).trim();
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function buildCrushConfig(name, model) {
  const crushModel = model === 'inherit' ? undefined : model;
  return {
    agents: {
      coder: { model: crushModel, maxTokens: 8000 },
      task: { model: crushModel, maxTokens: 5000 },
      title: { model: crushModel, maxTokens: 80 },
    },
    options: {
      initialize_as: 'AGENTS.md',
    },
  };
}

function deriveMetadata(role, name) {
  const autoInvokeByRole = {
    specialist: `Working on ${name} codebase`,
    coordinator: 'Cross-repo coordination and task delegation',
    reviewer: `Reviewing code in ${name} scope`,
    architect: `Architecture decisions for ${name}`,
  };
  return {
    scope: ['root'],
    autoInvoke: autoInvokeByRole[role] || `Working with ${name}`,
    version: '1.0',
  };
}

function buildSkillsFormat(name, description, body, metadata = {}) {
  const fm = { name, description };
  const meta = Object.keys(metadata).length > 0 ? metadata : {};
  if (Object.keys(meta).length > 0) {
    fm.metadata = {};
    if (meta.scope) fm.metadata.scope = Array.isArray(meta.scope) ? meta.scope : [meta.scope];
    if (meta.autoInvoke) fm.metadata.auto_invoke = meta.autoInvoke;
    if (meta.version) fm.metadata.version = meta.version;
  }
  const fmStr = yaml.dump(fm, { lineWidth: -1, quotingType: "'", forceQuotes: false }).trim();
  return `---\n${fmStr}\n---\n\n${body}\n`;
}

function buildDescription(role, primaryTech, framework) {
  const tech = framework ? `${framework} (${primaryTech})` : primaryTech;
  const descriptions = {
    specialist: `Specialist agent for ${tech} development`,
    coordinator: 'Workspace coordinator with cross-repo visibility',
    reviewer: `Code reviewer for ${tech} projects`,
    architect: `Software architect for ${tech} systems`,
  };
  return descriptions[role] || `Agent for ${tech}`;
}

function ensureAgentSuffix(name) {
  return name.endsWith('-agent') ? name : `${name}-agent`;
}

async function writeAgent({ name: rawName, role, model, tools, body, outputDir, target, description: customDesc, metadata }) {
  const validation = validateTarget(target);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { profile } = validation;
  const name = ensureAgentSuffix(rawName);
  const results = { claude: null, codex: null, gemini: null, crush: null, skills: null };
  const description = customDesc || body.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || name;
  const resolvedTools = tools || TOOLS_BY_ROLE[role] || 'Read, Write, Edit, Bash';
  const nativeTools = mapTools(resolvedTools, target);

  // Agent definition file
  if (profile.agentDir) {
    const agentDir = path.join(outputDir, profile.agentDir);
    await fs.ensureDir(agentDir);

    let content;
    if (target === 'claude') {
      content = buildClaudeFormat(name, description, model, resolvedTools, body);
      const agentPath = path.join(agentDir, `${name}.md`);
      await fs.writeFile(agentPath, content, 'utf8');
      results.claude = agentPath;
    } else if (target === 'gemini') {
      content = buildGeminiFormat(name, description, model, nativeTools, body);
      const agentPath = path.join(agentDir, `${name}.md`);
      await fs.writeFile(agentPath, content, 'utf8');
      results.gemini = agentPath;
    } else if (target === 'codex') {
      content = buildCodexFormat(body);
      const agentPath = path.join(agentDir, `${name}.md`);
      await fs.writeFile(agentPath, content, 'utf8');
      results.codex = agentPath;
    }
  }

  // Crush config (merge-safe)
  if (target === 'crush' && profile.configFile) {
    const configPath = path.join(outputDir, profile.configFile);
    let existing = {};
    if (await fs.pathExists(configPath)) {
      try {
        existing = JSON.parse(await fs.readFile(configPath, 'utf8'));
      } catch { /* ignore malformed */ }
    }
    const crushConfig = buildCrushConfig(name, model);
    const merged = { ...existing, ...crushConfig };
    if (existing.agents) merged.agents = { ...existing.agents, ...crushConfig.agents };
    if (existing.options) merged.options = { ...existing.options, ...crushConfig.options };
    await fs.writeFile(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    results.crush = configPath;
  }

  // Skills (all targets except claude generate skills)
  if (profile.skillsDir) {
    const skillsDir = path.join(outputDir, profile.skillsDir, name);
    await fs.ensureDir(skillsDir);
    const resolvedMeta = metadata || deriveMetadata(role, name);
    const skillsContent = buildSkillsFormat(name, description, body, resolvedMeta);
    const skillsPath = path.join(skillsDir, 'SKILL.md');
    await fs.writeFile(skillsPath, skillsContent, 'utf8');
    results.skills = skillsPath;
  }

  return results;
}

module.exports = {
  writeAgent, buildClaudeFormat, buildCodexFormat, buildGeminiFormat,
  buildCrushConfig, buildSkillsFormat, buildDescription, ensureAgentSuffix,
  deriveMetadata, TOOLS_BY_ROLE,
};
