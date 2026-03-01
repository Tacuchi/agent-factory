const path = require('path');
const fs = require('fs-extra');
const { detect, deriveAlias } = require('../core/stack-detector');
const { log, spinner, chalk } = require('../utils/logger');

async function runDetect(repoPath, options = {}) {
  const abs = path.resolve(repoPath);

  if (!(await fs.pathExists(abs))) {
    if (options.json) {
      console.log(JSON.stringify({ error: `Path does not exist: ${abs}` }));
      process.exit(1);
    }
    log.error(`Path does not exist: ${abs}`);
    process.exit(1);
  }

  const spin = spinner('Detecting stack...').start();
  const result = await detect(abs);
  spin.succeed('Detection complete');

  if (options.json) {
    console.log(JSON.stringify({ alias: deriveAlias(abs), ...result }));
    return result;
  }

  console.log('');
  log.label('  Path', abs);
  log.label('  Alias', deriveAlias(abs));
  log.label('  Primary', result.primaryTech);

  if (result.framework) {
    log.label('  Framework', result.framework);
  }

  if (result.stackParts.length > 0) {
    log.label('  Stack', result.stackCsv);
  }

  if (result.verifyCommands) {
    log.label('  Verify', result.verifyCommands);
  }

  if (options.verbose && result.stackParts.length > 0) {
    console.log('');
    log.muted('  Stack parts:');
    result.stackParts.forEach((part) => {
      console.log(chalk.gray('    •'), part);
    });
  }

  console.log('');
  return result;
}

module.exports = { runDetect };
