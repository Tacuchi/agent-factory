const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

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
    { lineWidth: -1, quotingType: '"', forceQuotes: false }
  ).trim();
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

function buildCodexFormat(body) {
  return `${body}\n`;
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
  return `---\nname: ${name}\ndescription: "${description}"\n---\n\n${body}\n`;
}

function ensureAgentSuffix(name) {
  return name.endsWith('-agent') ? name : `${name}-agent`;
}

async function writeAgent({ name: rawName, role, model, tools, body, outputDir, target, description: customDesc }) {
  const name = ensureAgentSuffix(rawName);
  const results = { claude: null, codex: null, skills: null };
  const description = customDesc || body.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() || name;

  const resolvedTools = tools || TOOLS_BY_ROLE[role] || 'Read, Write, Edit, Bash';

  if (target === 'claude' || target === 'all') {
    const claudeDir = path.join(outputDir, '.claude', 'agents');
    await fs.ensureDir(claudeDir);
    const claudeContent = buildClaudeFormat(name, description, model, resolvedTools, body);
    const claudePath = path.join(claudeDir, `${name}.md`);
    await fs.writeFile(claudePath, claudeContent, 'utf8');
    results.claude = claudePath;
  }

  if (target === 'codex' || target === 'all') {
    const codexDir = path.join(outputDir, '.agents');
    await fs.ensureDir(codexDir);
    const codexContent = buildCodexFormat(body);
    const codexPath = path.join(codexDir, `${name}.md`);
    await fs.writeFile(codexPath, codexContent, 'utf8');
    results.codex = codexPath;
  }

  if (target === 'codex' || target === 'all') {
    const skillsDir = path.join(outputDir, '.agents', 'skills', name);
    await fs.ensureDir(skillsDir);
    const skillsContent = buildSkillsFormat(name, description, body);
    const skillsPath = path.join(skillsDir, 'SKILL.md');
    await fs.writeFile(skillsPath, skillsContent, 'utf8');
    results.skills = skillsPath;
  }

  return results;
}

module.exports = { writeAgent, buildClaudeFormat, buildCodexFormat, buildSkillsFormat, buildDescription, ensureAgentSuffix, TOOLS_BY_ROLE };
