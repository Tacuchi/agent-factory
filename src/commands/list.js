const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const { AgentValidator } = require('../core/agent-validator');
const { log, chalk } = require('../utils/logger');

async function runList(dirPath, options = {}) {
  const abs = path.resolve(dirPath);
  const agents = [];

  const claudeDir = path.join(abs, '.claude', 'agents');
  const codexDir = path.join(abs, '.agents');
  const geminiDir = path.join(abs, '.gemini', 'agents');

  if (await fs.pathExists(claudeDir)) {
    const files = (await fs.readdir(claudeDir)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = await fs.readFile(path.join(claudeDir, file), 'utf8');
      agents.push({ file, source: '.claude/agents', content, format: 'claude' });
    }
  }

  if (await fs.pathExists(codexDir)) {
    const files = (await fs.readdir(codexDir)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const existing = agents.find((a) => a.file === file);
      if (existing) {
        existing.codexToo = true;
        continue;
      }
      const content = await fs.readFile(path.join(codexDir, file), 'utf8');
      agents.push({ file, source: '.agents', content, format: 'codex' });
    }
  }

  if (await fs.pathExists(geminiDir)) {
    const files = (await fs.readdir(geminiDir)).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const existing = agents.find((a) => a.file === file);
      if (existing) {
        existing.geminiToo = true;
        continue;
      }
      const content = await fs.readFile(path.join(geminiDir, file), 'utf8');
      agents.push({ file, source: '.gemini/agents', content, format: 'gemini' });
    }
  }

  const skillsDir = path.join(abs, '.agents', 'skills');
  if (await fs.pathExists(skillsDir)) {
    const skillDirs = (await fs.readdir(skillsDir, { withFileTypes: true })).filter((d) => d.isDirectory());
    for (const dir of skillDirs) {
      const skillFile = path.join(skillsDir, dir.name, 'SKILL.md');
      if (await fs.pathExists(skillFile)) {
        const file = `${dir.name}.md`;
        const existing = agents.find((a) => a.file === file);
        if (existing) {
          existing.skillsToo = true;
          continue;
        }
        const content = await fs.readFile(skillFile, 'utf8');
        agents.push({ file, source: '.agents/skills', content, format: 'skills' });
      }
    }
  }

  if (agents.length === 0) {
    if (options.json) {
      console.log(JSON.stringify([]));
      return;
    }
    log.warn(`No agents found in ${abs}`);
    log.muted('  Run "agent-factory init <path>" or "agent-factory create" to generate agents.');
    return;
  }

  const validator = new AgentValidator();

  if (options.json) {
    const jsonResult = agents.map((agent) => {
      const fm = extractFrontmatter(agent.content);
      const validation = validator.validate(agent.content, agent.file);
      return {
        name: fm?.name || agent.file.replace('.md', ''),
        model: fm?.model || null,
        source: resolveSource(agent),
        score: validation.score,
        valid: validation.valid,
      };
    });
    console.log(JSON.stringify(jsonResult));
    return;
  }

  console.log('');
  log.info(`${agents.length} agent(s) found in ${chalk.white(abs)}`);
  console.log('');

  const header = padRow('Name', 'Model', 'Source', 'Score');
  console.log(chalk.gray(header));
  console.log(chalk.gray('─'.repeat(header.length)));

  for (const agent of agents) {
    const fm = extractFrontmatter(agent.content);
    const name = fm?.name || agent.file.replace('.md', '');
    const model = fm?.model || '—';
    const source = resolveSource(agent);

    const validation = validator.validate(agent.content, agent.file);
    const scoreStr = `${validation.score}/100`;
    const scoreColor = validation.score >= 90 ? '#10B981' : validation.score >= 70 ? '#F59E0B' : '#EF4444';

    console.log(padRow(chalk.white(name), chalk.gray(model), chalk.gray(source), chalk.hex(scoreColor)(scoreStr)));

    if (options.verbose) {
      if (validation.errorCount > 0) {
        validation.errors.forEach((e) => console.log(chalk.red(`    ✗ ${e.message}`)));
      }
      if (validation.warningCount > 0) {
        validation.warnings.forEach((w) => console.log(chalk.yellow(`    ⚠ ${w.message}`)));
      }
    }
  }

  console.log('');
}

function resolveSource(agent) {
  const parts = [];
  if (agent.source === '.claude/agents') parts.push('claude');
  if (agent.source === '.agents' || agent.codexToo) parts.push('codex');
  if (agent.source === '.gemini/agents' || agent.geminiToo) parts.push('gemini');
  if (agent.source === '.agents/skills' || agent.skillsToo) parts.push('skills');
  if (parts.length >= 4) return 'all';
  if (parts.length === 0) return agent.source;
  return [...new Set(parts)].join('+');
}

function padRow(name, model, source, score) {
  return `  ${name.padEnd(30)} ${model.padEnd(10)} ${source.padEnd(18)} ${score}`;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

module.exports = { runList };
