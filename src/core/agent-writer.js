const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { parseTools } = require('./orchestration-profile');
const { resolveOutputs } = require('./target-profiles');
const { mapClaudeToolsToGemini } = require('./tool-mapping-gemini');
const { mergeCrushConfig } = require('./crush-config');
const { mergeOpenCodeConfig } = require('./opencode-config');
const { buildWarpOzEnvironmentExample } = require('./warp-oz');

const TOOLS_BY_ROLE = {
  specialist: 'Read, Write, Edit, Bash',
  coordinator: 'Read, Glob, Grep, Task, Bash',
  reviewer: 'Read, Grep, Glob, Bash',
  architect: 'Read, Grep, Glob, Bash',
  custom: 'Read, Bash',
};

function dumpFrontmatter(data) {
  return yaml.dump(data, { lineWidth: -1, quotingType: "'", forceQuotes: false }).trim();
}

function buildClaudeFormat(name, description, model, tools, body) {
  const frontmatter = dumpFrontmatter({ name, description, tools, model });
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function buildCodexFormat(body) {
  return `${body}\n`;
}

function mapGeminiModel(model) {
  if (!model || ['sonnet', 'opus', 'haiku'].includes(model)) {
    return 'inherit';
  }

  return model;
}

function buildGeminiFormat(name, description, model, tools, body) {
  const frontmatter = dumpFrontmatter({
    name,
    kind: 'local',
    description,
    tools,
    model: mapGeminiModel(model),
    max_turns: 15,
    timeout_mins: 5,
  });

  return `---\n${frontmatter}\n---\n\n${body}\n`;
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

function buildSkillsFormat(name, description, body) {
  const frontmatter = dumpFrontmatter({ name, description });
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function ensureAgentSuffix(name) {
  return name.endsWith('-agent') ? name : `${name}-agent`;
}

async function readJsonIfExists(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return {};
  }

  try {
    return await fs.readJson(filePath);
  } catch {
    return {};
  }
}

async function writeJson(filePath, content) {
  await fs.writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

async function writeAgent({
  name: rawName,
  role,
  model,
  tools,
  body,
  outputDir,
  target,
  description: customDesc,
  orchestrationProfile,
}) {
  const name = ensureAgentSuffix(rawName);
  const results = {
    claude: null,
    codex: null,
    skills: null,
    gemini: null,
    crush: null,
    opencode: null,
    warpOz: null,
  };

  const outputs = resolveOutputs(target);
  const description = customDesc || body.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || name;
  const resolvedTools = tools || TOOLS_BY_ROLE[role] || 'Read, Write, Edit, Bash';
  const canonicalTools =
    orchestrationProfile && orchestrationProfile.toolsCanonical && orchestrationProfile.toolsCanonical.length > 0
      ? orchestrationProfile.toolsCanonical
      : parseTools(resolvedTools);

  if (outputs.includes('claudeAgent')) {
    const claudeDir = path.join(outputDir, '.claude', 'agents');
    await fs.ensureDir(claudeDir);
    const claudeContent = buildClaudeFormat(name, description, model, resolvedTools, body);
    const claudePath = path.join(claudeDir, `${name}.md`);
    await fs.writeFile(claudePath, claudeContent, 'utf8');
    results.claude = claudePath;
  }

  if (outputs.includes('codexAgent')) {
    const codexDir = path.join(outputDir, '.agents');
    await fs.ensureDir(codexDir);
    const codexContent = buildCodexFormat(body);
    const codexPath = path.join(codexDir, `${name}.md`);
    await fs.writeFile(codexPath, codexContent, 'utf8');
    results.codex = codexPath;
  }

  if (outputs.includes('skills')) {
    const skillsDir = path.join(outputDir, '.agents', 'skills', name);
    await fs.ensureDir(skillsDir);
    const skillsContent = buildSkillsFormat(name, description, body);
    const skillsPath = path.join(skillsDir, 'SKILL.md');
    await fs.writeFile(skillsPath, skillsContent, 'utf8');
    results.skills = skillsPath;
  }

  if (outputs.includes('geminiAgent')) {
    const geminiDir = path.join(outputDir, '.gemini', 'agents');
    await fs.ensureDir(geminiDir);
    const geminiTools = mapClaudeToolsToGemini(canonicalTools);
    const geminiContent = buildGeminiFormat(name, description, model, geminiTools, body);
    const geminiPath = path.join(geminiDir, `${name}.md`);
    await fs.writeFile(geminiPath, geminiContent, 'utf8');
    results.gemini = geminiPath;
  }

  if (outputs.includes('crushConfig')) {
    const crushPath = path.join(outputDir, '.crush.json');
    const existing = await readJsonIfExists(crushPath);
    const merged = mergeCrushConfig(existing);
    await writeJson(crushPath, merged);
    results.crush = crushPath;
  }

  if (outputs.includes('opencodeConfig')) {
    const opencodePath = path.join(outputDir, '.opencode.json');
    const existing = await readJsonIfExists(opencodePath);
    const merged = mergeOpenCodeConfig(existing);
    await writeJson(opencodePath, merged);
    results.opencode = opencodePath;
  }

  if (outputs.includes('warpOzDoc')) {
    const docsDir = path.join(outputDir, 'docs', 'warp-oz');
    await fs.ensureDir(docsDir);
    const warpPath = path.join(docsDir, 'environment-example.md');
    await fs.writeFile(warpPath, buildWarpOzEnvironmentExample(), 'utf8');
    results.warpOz = warpPath;
  }

  return results;
}

module.exports = {
  writeAgent,
  buildClaudeFormat,
  buildCodexFormat,
  buildGeminiFormat,
  buildSkillsFormat,
  buildDescription,
  ensureAgentSuffix,
  TOOLS_BY_ROLE,
};
