const chalk = require('chalk');
const ora = require('ora');

let _quiet = false;

const COLORS = {
  primary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  muted: '#6B7280',
};

const NOOP = () => {};

const log = {
  info: (msg) => !_quiet && console.log(chalk.hex(COLORS.info)('ℹ'), msg),
  success: (msg) => !_quiet && console.log(chalk.hex(COLORS.success)('✓'), msg),
  warn: (msg) => !_quiet && console.log(chalk.hex(COLORS.warning)('⚠'), msg),
  error: (msg) => !_quiet && console.log(chalk.hex(COLORS.error)('✗'), msg),
  muted: (msg) => !_quiet && console.log(chalk.hex(COLORS.muted)(msg)),
  label: (label, value) =>
    !_quiet && console.log(chalk.hex(COLORS.muted)(label + ':'), chalk.white(value)),
};

const SPINNER_STUB = {
  start() { return this; },
  succeed() { return this; },
  fail() { return this; },
  stop() { return this; },
};

function spinner(text) {
  if (_quiet) return SPINNER_STUB;
  return ora({ text, color: 'magenta' });
}

function banner(version) {
  if (_quiet) return;
  const title = 'agent-factory';
  const colored = title
    .split('')
    .map((c, i) => chalk.hex(i < 6 ? '#7C3AED' : '#A78BFA')(c))
    .join('');
  console.log(`\n  🏭 ${colored} ${chalk.gray(`v${version}`)}\n`);
}

function setQuiet(value) {
  _quiet = !!value;
}

function isQuiet() {
  return _quiet;
}

module.exports = { log, spinner, banner, setQuiet, isQuiet, COLORS, chalk };
