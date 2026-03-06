const inquirer = require('inquirer');
const path = require('path');

const ROLES = [
  { name: 'specialist — Dedicated to a single repo/stack', value: 'specialist' },
  { name: 'coordinator — Orchestrates across repos', value: 'coordinator' },
  { name: 'reviewer — Code review and quality analysis', value: 'reviewer' },
  { name: 'architect — System design and technical decisions', value: 'architect' },
  { name: 'custom — Free-form agent with custom instructions', value: 'custom' },
];

const MODELS = [
  { name: 'sonnet (balanced)', value: 'sonnet' },
  { name: 'opus (most capable)', value: 'opus' },
  { name: 'haiku (fastest)', value: 'haiku' },
];

const TARGETS = [
  { name: 'claude — Only .claude/agents/', value: 'claude' },
  { name: 'codex — Only .agents/', value: 'codex' },
];

async function askCreateOptions() {
  const baseQuestions = [
    {
      type: 'input',
      name: 'name',
      message: 'Agent name (kebab-case):',
      validate: (v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || 'Use kebab-case (e.g., my-agent)',
    },
    {
      type: 'list',
      name: 'role',
      message: 'Agent role:',
      choices: ROLES,
    },
    {
      type: 'list',
      name: 'model',
      message: 'Model:',
      choices: MODELS,
    },
  ];

  const answers = await inquirer.prompt(baseQuestions);

  if (answers.role === 'custom') {
    const customAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Short description for the agent:',
        validate: (v) => v.length >= 5 || 'Description must be at least 5 characters',
      },
      {
        type: 'editor',
        name: 'instructions',
        message: 'Agent instructions (opens editor):',
      },
    ]);
    Object.assign(answers, customAnswers);
  } else {
    const scopeAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'scope',
        message: 'Repository path (for stack detection, optional):',
        default: '',
        filter: (v) => (v ? path.resolve(v) : ''),
      },
    ]);
    Object.assign(answers, scopeAnswers);
  }

  const outputAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'target',
      message: 'Output target:',
      choices: TARGETS,
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output directory:',
      default: process.cwd(),
      filter: (v) => path.resolve(v),
    },
  ]);

  return { ...answers, ...outputAnswers };
}

async function confirmGeneration(agentName, files) {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Generate agent "${agentName}" to ${files.join(', ')}?`,
      default: true,
    },
  ]);
  return confirm;
}

async function askInitAgents(suggestions) {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Select agents to generate:',
      choices: suggestions.map((s) => ({
        name: `${s.name} (${s.role})`,
        value: s,
        checked: true,
      })),
    },
  ]);
  return selected;
}

module.exports = { askCreateOptions, confirmGeneration, askInitAgents, ROLES, MODELS, TARGETS };
