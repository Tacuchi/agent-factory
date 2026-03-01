const path = require('path');
const { detect } = require('../core/stack-detector');
const { renderFile } = require('../core/template-engine');
const { writeAgent, buildDescription, TOOLS_BY_ROLE } = require('../core/agent-writer');
const { AgentValidator } = require('../core/agent-validator');
const { log, spinner } = require('../utils/logger');
const { askCreateOptions, confirmGeneration } = require('../utils/prompts');

async function runCreate(options = {}) {
  const isInteractive = !options.name;
  const config = isInteractive ? await askCreateOptions() : normalizeFlags(options);

  const { name, role, model, scope, output, target, tools, specialists, repoCount, description, instructions } = config;

  const spin = spinner('Generating agent...').start();

  let body;

  if (role === 'custom') {
    body = await resolveCustomBody(instructions, name, description);
    spin.succeed('Custom agent generated');
  } else {
    let stackResult = { primaryTech: 'Generic', framework: '', verifyCommands: '', stackParts: [], stackCsv: 'Generic' };
    if (scope) {
      stackResult = await detect(scope);
    }

    const techLabel = stackResult.framework
      ? `${stackResult.framework} (${stackResult.primaryTech})`
      : stackResult.primaryTech;

    const templateData = {
      name,
      primary_tech: stackResult.primaryTech,
      tech_label: techLabel,
      framework: stackResult.framework,
      scope: scope || '.',
      stack_list: stackResult.stackParts.length > 0
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
  const targetDirs = [];
  if (target === 'claude' || target === 'all') targetDirs.push('.claude/agents/');
  if (target === 'codex' || target === 'all') targetDirs.push('.agents/');

  if (!options.yes && isInteractive) {
    const confirmed = await confirmGeneration(name, targetDirs);
    if (!confirmed) {
      log.warn('Cancelled');
      return;
    }
  }

  const resolvedTools = tools || TOOLS_BY_ROLE[role] || 'Read, Write, Edit, Bash';
  const results = await writeAgent({
    name,
    role,
    model,
    tools: resolvedTools,
    body,
    outputDir,
    target,
    description: description || undefined,
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
}

function normalizeFlags(options) {
  return {
    name: options.name,
    role: options.role || 'specialist',
    model: options.model || 'sonnet',
    scope: options.scope ? path.resolve(options.scope) : '',
    output: options.output ? path.resolve(options.output) : process.cwd(),
    target: options.target || 'all',
    tools: options.tools || '',
    yes: options.yes || false,
    specialists: options.specialists || '',
    repoCount: options.repoCount || 0,
    description: options.description || '',
    instructions: options.instructions || '',
  };
}

function formatSpecialistList(csv) {
  if (!csv) return '';
  const names = csv.split(',').map((n) => n.trim()).filter(Boolean);
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
  if (instructions.endsWith('.md') && await fs.pathExists(instructions)) {
    return await fs.readFile(instructions, 'utf8');
  }

  return `# ${name}\n\n${instructions}\n`;
}

module.exports = { runCreate };
