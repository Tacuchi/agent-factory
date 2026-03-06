const path = require('path');
const { detect } = require('../core/stack-detector');
const { renderFile } = require('../core/template-engine');
const { writeAgent, TOOLS_BY_ROLE } = require('../core/agent-writer');
const { buildOrchestrationProfile } = require('../core/orchestration-profile');
const { TARGETS, isValidTarget, getTargetDestinations } = require('../core/target-profiles');
const { AgentValidator } = require('../core/agent-validator');
const { log, spinner } = require('../utils/logger');
const { askCreateOptions, confirmGeneration } = require('../utils/prompts');

async function runCreate(options = {}) {
  const isInteractive = !options.name;
  const config = isInteractive ? await askCreateOptions() : normalizeFlags(options);

  if (!isInteractive && !isValidTarget(config.target)) {
    log.error(`--target is required: ${TARGETS.join(', ')}`);
    process.exit(1);
  }

  const {
    name,
    role,
    model,
    scope,
    output,
    target,
    tools,
    specialists,
    repoCount,
    description,
    instructions,
    stack,
    dryRun,
  } = config;

  const spin = spinner('Generating agent...').start();

  let body;

  if (role === 'custom') {
    body = await resolveCustomBody(instructions, name, description);
    spin.succeed('Custom agent generated');
  } else {
    let stackResult = { primaryTech: 'Generic', framework: '', verifyCommands: '', stackParts: [], stackCsv: 'Generic' };
    if (stack) {
      const parts = stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      stackResult = {
        primaryTech: parts[0] || 'Generic',
        framework: parts[1] || '',
        verifyCommands: '',
        stackParts: parts,
        stackCsv: parts.join(', '),
      };
    } else if (scope) {
      stackResult = await detect(scope);
    }

    const techLabel = stackResult.framework ? `${stackResult.framework} (${stackResult.primaryTech})` : stackResult.primaryTech;

    const templateData = {
      name,
      primary_tech: stackResult.primaryTech,
      tech_label: techLabel,
      framework: stackResult.framework,
      scope: scope || '.',
      stack_list:
        stackResult.stackParts.length > 0
          ? stackResult.stackParts.map((p) => `- ${p}`).join('\n')
          : `- ${stackResult.primaryTech}`,
      verify_cmds: stackResult.verifyCommands || 'N/A',
      stack_csv: stackResult.stackCsv,
      specialist_list: formatSpecialistList(specialists),
      N: repoCount ? String(repoCount) : '',
      repos_word: repoCount === 1 ? 'repositorio' : 'repositorios',
    };

    const templateFile = `${role}.md.tmpl`;
    try {
      body = await renderFile(templateFile, templateData);
    } catch {
      spin.fail(`Template not found: ${templateFile}`);
      process.exit(1);
    }

    spin.succeed('Agent generated');
  }

  const outputDir = output || process.cwd();
  const targetDirs = getTargetDestinations(target);

  if (dryRun) {
    log.info('--- DRY RUN: Agent preview ---');
    console.log(body);
    log.info('--- End preview ---');
    return;
  }

  if (!options.yes && isInteractive) {
    const confirmed = await confirmGeneration(name, targetDirs);
    if (!confirmed) {
      log.warn('Cancelled');
      return;
    }
  }

  const resolvedTools = tools || TOOLS_BY_ROLE[role] || 'Read, Write, Edit, Bash';
  const orchestrationProfile = buildOrchestrationProfile({
    name,
    role,
    scope: scope || '.',
    tools: resolvedTools,
    instructions: body,
    specialists,
    description: description || '',
  });

  const results = await writeAgent({
    name,
    role,
    model,
    tools: resolvedTools,
    body,
    outputDir,
    target,
    description: description || undefined,
    orchestrationProfile,
  });

  const validator = new AgentValidator();
  if (results.claude) {
    const fs = require('fs-extra');
    const content = await fs.readFile(results.claude, 'utf8');
    const validation = validator.validate(content, `${name}.md`);
    if (validation.valid) {
      log.success(`Claude:  ${results.claude} (score: ${validation.score}/100)`);
    } else {
      log.warn(`Claude:  ${results.claude} (score: ${validation.score}/100, ${validation.errorCount} errors)`);
    }
  }

  if (results.codex) {
    log.success(`Codex:   ${results.codex}`);
  }

  if (results.skills) {
    log.success(`Skills:  ${results.skills}`);
  }

  if (results.gemini) {
    log.success(`Gemini:  ${results.gemini}`);
  }

  if (results.crush) {
    log.success(`Crush:   ${results.crush}`);
  }

  if (results.opencode) {
    log.success(`OpenCode:${results.opencode}`);
  }

  if (results.warpOz) {
    log.success(`WarpOz:  ${results.warpOz}`);
  }
}

function normalizeFlags(options) {
  return {
    name: options.name,
    role: options.role || 'specialist',
    model: options.model || 'sonnet',
    scope: options.scope ? path.resolve(options.scope) : '',
    output: options.output ? path.resolve(options.output) : process.cwd(),
    target: options.target,
    tools: options.tools || '',
    yes: options.yes || false,
    specialists: options.specialists || '',
    repoCount: options.repoCount || 0,
    description: options.description || '',
    instructions: options.instructions || '',
    stack: options.stack || '',
    dryRun: options.dryRun || false,
  };
}

function formatSpecialistList(csv) {
  if (!csv) return '';
  const names = csv
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return `\`${names[0]}\``;
  const last = names.pop();
  return names.map((n) => `\`${n}\``).join(', ') + ` y \`${last}\``;
}

async function resolveCustomBody(instructions, name, description) {
  if (!instructions) {
    return `# ${name}\n\n${description || 'Custom agent.'}\n`;
  }

  const fs = require('fs-extra');
  if (instructions.endsWith('.md') && (await fs.pathExists(instructions))) {
    return await fs.readFile(instructions, 'utf8');
  }

  return `# ${name}\n\n${instructions}\n`;
}

module.exports = { runCreate, normalizeFlags, formatSpecialistList };
