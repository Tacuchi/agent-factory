const path = require('path');
const fs = require('fs-extra');
const { detect, deriveAlias } = require('../core/stack-detector');
const { renderFile } = require('../core/template-engine');
const { writeAgent, TOOLS_BY_ROLE } = require('../core/agent-writer');
const { AgentValidator } = require('../core/agent-validator');
const { validateTarget } = require('../core/target-profiles');
const { generateAgentsMd } = require('../core/agents-md-generator');
const { copyContextFile, createSkillsSymlink } = require('../core/target-setup');
const { log, spinner, chalk } = require('../utils/logger');
const { askInitAgents } = require('../utils/prompts');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

async function runInit(target, repoPath, options = {}) {
  const validation = validateTarget(target);
  if (!validation.valid) {
    log.error(validation.error);
    process.exit(1);
  }

  const abs = path.resolve(repoPath);
  if (!(await fs.pathExists(abs))) {
    log.error(`Path does not exist: ${abs}`);
    process.exit(1);
  }

  const spin = spinner('Analyzing repository...').start();
  const stackResult = await detect(abs);
  const alias = deriveAlias(abs);
  spin.succeed(`Detected: ${stackResult.primaryTech}${stackResult.framework ? ` / ${stackResult.framework}` : ''}`);

  const suggestions = buildSuggestions(alias, stackResult, abs);

  log.info(`Suggested agents for ${chalk.white(alias)}:`);
  suggestions.forEach((s) => {
    log.muted(`  • ${s.name} (${s.role}) — ${s.description}`);
  });

  let selected = suggestions;
  if (!options.yes) {
    selected = await askInitAgents(suggestions);
    if (selected.length === 0) {
      log.warn('No agents selected');
      return;
    }
  }

  const model = options.model || 'sonnet';
  const validator = new AgentValidator();

  // Generate agent definition files
  for (const agent of selected) {
    const templateData = buildTemplateData(agent, stackResult, abs);

    let body;
    try {
      body = await renderFile(`${agent.role}.md.tmpl`, templateData);
    } catch {
      log.warn(`Template not found for role: ${agent.role}, skipping`);
      continue;
    }

    const results = await writeAgent({
      name: agent.name,
      role: agent.role,
      model,
      tools: TOOLS_BY_ROLE[agent.role],
      body,
      outputDir: abs,
      target,
    });

    logAgentResults(results, agent.name, validator, target);
  }

  // Generate project skill
  const skillPath = await generateProjectSkill(abs, alias, stackResult);
  if (skillPath) log.success(`Skill:   ${path.relative(abs, skillPath)}`);

  // Generate skills/README.md
  await generateSkillsReadme(abs, alias, stackResult);

  // Generate AGENTS.md with auto-invoke tables
  const agentsMdPath = await generateAgentsMd(abs, { alias, stackResult, agents: selected });
  log.success(`AGENTS:  ${path.relative(abs, agentsMdPath)}`);

  // Copy AGENTS.md -> CLAUDE.md / GEMINI.md
  const contextPath = await copyContextFile(abs, target);
  if (contextPath) log.success(`Context: ${path.relative(abs, contextPath)}`);

  // Create skills symlink (.claude/skills -> skills/)
  const symlinkPath = await createSkillsSymlink(abs, target);
  if (symlinkPath) log.success(`Symlink: ${path.relative(abs, symlinkPath)} -> skills/`);

  log.success(`\nSingle-repo setup complete for ${chalk.white(alias)} (${target})`);
}

function buildTemplateData(agent, stackResult, repoPath) {
  const techLabel = stackResult.framework
    ? `${stackResult.framework} (${stackResult.primaryTech})`
    : stackResult.primaryTech;

  return {
    name: agent.name,
    primary_tech: stackResult.primaryTech,
    tech_label: techLabel,
    framework: stackResult.framework,
    scope: repoPath,
    stack_list: stackResult.stackParts.length > 0
      ? stackResult.stackParts.map((p) => `- ${p}`).join('\n')
      : `- ${stackResult.primaryTech}`,
    verify_cmds: stackResult.verifyCommands || 'N/A',
    stack_csv: stackResult.stackCsv,
  };
}

function logAgentResults(results, agentName, validator, target) {
  if (results.claude) {
    const content = require('fs-extra').readFileSync(results.claude, 'utf8');
    const val = validator.validate(content, `${agentName}.md`);
    log.success(`${agentName} → .claude/agents/ (score: ${val.score}/100)`);
  }
  if (results.codex) log.success(`${agentName} → .agents/`);
  if (results.gemini) log.success(`${agentName} → .gemini/agents/`);
  if (results.crush) log.success(`${agentName} → .crush.json`);
  if (results.skills) log.success(`${agentName} → .agents/skills/`);
}

async function generateProjectSkill(repoPath, alias, stackResult) {
  const skillDir = path.join(repoPath, 'skills', `${alias}-dev`);
  await fs.ensureDir(skillDir);

  const templatePath = path.join(TEMPLATES_DIR, 'project-skill.md.tmpl');
  let template;
  if (await fs.pathExists(templatePath)) {
    template = await fs.readFile(templatePath, 'utf8');
  } else {
    template = buildFallbackSkillTemplate();
  }

  const stackList = stackResult.stackParts.length > 0
    ? stackResult.stackParts.map((p) => `- ${p}`).join('\n')
    : `- ${stackResult.primaryTech}`;

  const content = template
    .replace(/\{\{alias\}\}/g, alias)
    .replace(/\{\{primary_tech\}\}/g, stackResult.primaryTech)
    .replace(/\{\{stack_list\}\}/g, stackList)
    .replace(/\{\{verify_cmds\}\}/g, stackResult.verifyCommands || 'npm test');

  const skillPath = path.join(skillDir, 'SKILL.md');
  await fs.writeFile(skillPath, content, 'utf8');
  return skillPath;
}

function buildFallbackSkillTemplate() {
  return `---
name: {{alias}}-dev
description: >
  Main development skill for {{alias}}.
  Trigger: General {{primary_tech}} development questions.
metadata:
  version: '1.0'
  scope:
    - root
  auto_invoke: 'General {{alias}} development questions'
---

## Stack

{{stack_list}}

## Commands

\`\`\`bash
{{verify_cmds}}
\`\`\`
`;
}

async function generateSkillsReadme(repoPath, alias, stackResult) {
  const readmePath = path.join(repoPath, 'skills', 'README.md');
  if (await fs.pathExists(readmePath)) return;

  const templatePath = path.join(TEMPLATES_DIR, 'skills-readme.md.tmpl');
  let content;
  if (await fs.pathExists(templatePath)) {
    const template = await fs.readFile(templatePath, 'utf8');
    content = template.replace(/\{\{skills_table\}\}/g,
      `| \`${alias}-dev\` | Main development skill for ${alias} |`
    );
  } else {
    content = `# AI Agent Skills\n\nSee individual SKILL.md files for details.\n`;
  }
  await fs.writeFile(readmePath, content, 'utf8');
}

function buildSuggestions(alias, stackResult, repoPath) {
  const suggestions = [];
  const tech = stackResult.framework || stackResult.primaryTech;

  suggestions.push({
    name: `${alias}-specialist`,
    role: 'specialist',
    description: `${tech} specialist for ${alias}`,
  });

  suggestions.push({
    name: `${alias}-reviewer`,
    role: 'reviewer',
    description: `Code reviewer for ${tech}`,
  });

  if (stackResult.stackParts.length >= 3) {
    suggestions.push({
      name: `${alias}-architect`,
      role: 'architect',
      description: `Architecture advisor for ${tech}`,
    });
  }

  return suggestions;
}

module.exports = { runInit };
