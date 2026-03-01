#!/usr/bin/env node

const { program } = require('commander');
const { banner, setQuiet } = require('../src/utils/logger');
const pkg = require('../package.json');

program
  .name('agent-factory')
  .description('CLI to create AI agents for Claude Code, Codex, Gemini CLI and more')
  .version(pkg.version)
  .option('-q, --quiet', 'Suppress banner and visual output (for programmatic use)')
  .hook('preAction', (thisCommand, actionCommand) => {
    const globalOpts = thisCommand.opts();
    const subOpts = actionCommand.opts();
    if (globalOpts.quiet || subOpts.json) {
      setQuiet(true);
    } else {
      banner(pkg.version);
    }
  });

program
  .command('detect <path>')
  .description('Detect technology stack of a repository')
  .option('-v, --verbose', 'Show detailed detection info')
  .option('--json', 'Output as JSON (implies --quiet)')
  .action(async (repoPath, options) => {
    const { runDetect } = require('../src/commands/detect');
    await runDetect(repoPath, options);
  });

program
  .command('create')
  .description('Create an AI agent (interactive or with flags)')
  .option('-n, --name <name>', 'Agent name (kebab-case)')
  .option('-r, --role <role>', 'Agent role: specialist, coordinator, reviewer, architect')
  .option('-m, --model <model>', 'Model: opus, sonnet, haiku', 'sonnet')
  .option('-s, --scope <path>', 'Repository path (for stack detection)')
  .option('-o, --output <path>', 'Output directory (default: current dir)')
  .option('-t, --target <target>', 'Target: claude, codex, all', 'all')
  .option('--stack <csv>', 'Override detected stack (comma-separated)')
  .option('--dry-run', 'Preview generated agent without writing files')
  .option('--tools <tools>', 'Comma-separated tools: Read,Write,Edit,Bash')
  .option('--specialists <list>', 'CSV list of specialist agent names (for coordinator role)')
  .option('--repo-count <n>', 'Number of repos in workspace (for coordinator role)', parseInt)
  .option('--description <text>', 'Short description for the agent (for custom role)')
  .option('--instructions <text>', 'Agent body: inline text or path to .md file (for custom role)')
  .option('-y, --yes', 'Skip confirmations')
  .action(async (options) => {
    const { runCreate } = require('../src/commands/create');
    await runCreate(options);
  });

program
  .command('init <path>')
  .description('Analyze repository and suggest agents')
  .option('-o, --output <path>', 'Output directory (default: same as repo path)')
  .option('-t, --target <target>', 'Target: claude, codex, all', 'all')
  .option('-m, --model <model>', 'Model for generated agents', 'sonnet')
  .option('-y, --yes', 'Skip confirmations')
  .action(async (repoPath, options) => {
    const { runInit } = require('../src/commands/init');
    await runInit(repoPath, options);
  });

program
  .command('list [path]')
  .description('List existing agents in a directory')
  .option('-v, --verbose', 'Show validation details')
  .option('--json', 'Output as JSON (implies --quiet)')
  .action(async (dirPath, options) => {
    const { runList } = require('../src/commands/list');
    await runList(dirPath || process.cwd(), options);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
});
