const path = require('path');
const fs = require('fs-extra');
const { detect, deriveAlias } = require('../core/stack-detector');
const { renderFile } = require('../core/template-engine');
const { writeAgent, TOOLS_BY_ROLE } = require('../core/agent-writer');
const { buildOrchestrationProfile } = require('../core/orchestration-profile');
const { TARGETS, isValidTarget } = require('../core/target-profiles');
const { AgentValidator } = require('../core/agent-validator');
const { log, spinner, chalk } = require('../utils/logger');
const { askInitAgents } = require('../utils/prompts');

async function runInit(repoPath, options = {}) {
  const abs = path.resolve(repoPath);

  if (!(await fs.pathExists(abs))) {
    log.error(`Path does not exist: ${abs}`);
    process.exit(1);
  }

  const spin = spinner('Analyzing repository...').start();
  const stackResult = await detect(abs);
  const alias = deriveAlias(abs);
  spin.succeed(`Detected: ${stackResult.primaryTech}${stackResult.framework ? ` / ${stackResult.framework}` : ''}`);

  const suggestions = buildSuggestions(alias, stackResult);

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

  const target = options.target;
  if (!isValidTarget(target)) {
    log.error(`--target is required: ${TARGETS.join(', ')}`);
    process.exit(1);
  }

  const model = options.model || 'sonnet';
  const outputDir = options.output ? path.resolve(options.output) : abs;
  const validator = new AgentValidator();

  for (const agent of selected) {
    const templateData = {
      name: agent.name,
      primary_tech: stackResult.primaryTech,
      framework: stackResult.framework,
      scope: abs,
      stack_list:
        stackResult.stackParts.length > 0
          ? stackResult.stackParts.map((p) => `- ${p}`).join('\n')
          : `- ${stackResult.primaryTech}`,
      verify_cmds: stackResult.verifyCommands || 'N/A',
      stack_csv: stackResult.stackCsv,
    };

    let body;
    try {
      body = await renderFile(`${agent.role}.md.tmpl`, templateData);
    } catch {
      log.warn(`Template not found for role: ${agent.role}, skipping`);
      continue;
    }

    const orchestrationProfile = buildOrchestrationProfile({
      name: agent.name,
      role: agent.role,
      scope: abs,
      tools: TOOLS_BY_ROLE[agent.role],
      instructions: body,
      description: agent.description,
    });

    const results = await writeAgent({
      name: agent.name,
      role: agent.role,
      model,
      tools: TOOLS_BY_ROLE[agent.role],
      body,
      outputDir,
      target,
      orchestrationProfile,
    });

    if (results.claude) {
      const content = await fs.readFile(results.claude, 'utf8');
      const validation = validator.validate(content, `${agent.name}.md`);
      log.success(`${agent.name} → .claude/agents/ (score: ${validation.score}/100)`);
    }
    if (results.codex) {
      log.success(`${agent.name} → .agents/`);
    }
    if (results.gemini) {
      log.success(`${agent.name} → .gemini/agents/`);
    }
    if (results.crush) {
      log.success(`config → .crush.json`);
    }
    if (results.opencode) {
      log.success(`config → .opencode.json`);
    }
  }

  log.success(`${selected.length} agent(s) generated in ${outputDir}`);
}

function buildSuggestions(alias, stackResult) {
  const suggestions = [];
  const tech = stackResult.framework || stackResult.primaryTech;

  suggestions.push({
    name: `repo-${alias}`,
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
