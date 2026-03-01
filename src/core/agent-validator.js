const yaml = require('js-yaml');

const VALID_MODELS = ['opus', 'sonnet', 'haiku', 'inherit'];
const VALID_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch', 'Task'];

const SECRET_PATTERNS = [
  /AIzaSy[\w-]{30,}/,
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /gho_[A-Za-z0-9]{36}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
  /api[_-]?key\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /token\s*[:=]\s*['"][^'"]{10,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{3,}['"]/i,
];

const ABSOLUTE_PATH_PATTERN = /(?:\/(?:Users|home|root|etc|var)\/|[A-Z]:\\)/;

class AgentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(code, message, metadata = {}) {
    this.errors.push({ level: 'error', code, message, metadata });
  }

  addWarning(code, message, metadata = {}) {
    this.warnings.push({ level: 'warning', code, message, metadata });
  }

  addInfo(code, message, metadata = {}) {
    this.info.push({ level: 'info', code, message, metadata });
  }

  isValid() {
    return this.errors.length === 0;
  }

  getScore() {
    const errorPenalty = this.errors.length * 25;
    const warningPenalty = this.warnings.length * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }

  getResults() {
    return {
      valid: this.isValid(),
      score: this.getScore(),
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      infoCount: this.info.length,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
    };
  }

  reset() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  validate(content, filename = '') {
    this.reset();

    if (!content || typeof content !== 'string') {
      this.addError('VAL_E001', 'Content is empty or not a string');
      return this.getResults();
    }

    const frontmatter = this.extractFrontmatter(content);

    if (frontmatter) {
      this.validateFrontmatter(frontmatter);
    } else {
      this.addInfo('VAL_I001', 'No YAML frontmatter found (Codex/plain format)');
    }

    this.checkSecrets(content);
    this.checkAbsolutePaths(content);

    if (filename && !this.isKebabCase(filename.replace(/\.md$/, ''))) {
      this.addWarning('VAL_W010', `Filename "${filename}" should use kebab-case`);
    }

    const bodyLength = this.extractBody(content).trim().length;
    if (bodyLength < 50) {
      this.addWarning('VAL_W011', `Agent body is very short (${bodyLength} chars)`);
    }

    return this.getResults();
  }

  extractFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      return yaml.load(match[1]);
    } catch (err) {
      this.addError('VAL_E002', `Invalid YAML frontmatter: ${err.message}`);
      return null;
    }
  }

  extractBody(content) {
    const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
    return match ? match[1] : content;
  }

  validateFrontmatter(fm) {
    if (!fm.name) {
      this.addError('VAL_E003', 'Missing required field: name');
    } else if (!this.isKebabCase(fm.name)) {
      this.addWarning('VAL_W001', `Agent name "${fm.name}" should use kebab-case`);
    }

    if (!fm.description) {
      this.addError('VAL_E004', 'Missing required field: description');
    } else if (fm.description.length < 10) {
      this.addWarning('VAL_W002', 'Description is too short');
    }

    if (!fm.model) {
      this.addWarning('VAL_W003', 'Missing field: model (will use default)');
    } else if (!VALID_MODELS.includes(fm.model)) {
      this.addWarning('VAL_W004', `Model "${fm.model}" is not a standard value: ${VALID_MODELS.join(', ')}`);
    }

    if (fm.tools) {
      const tools = typeof fm.tools === 'string' ? fm.tools.split(',').map((t) => t.trim()) : fm.tools;
      const invalid = tools.filter((t) => !VALID_TOOLS.includes(t));
      if (invalid.length > 0) {
        this.addWarning('VAL_W005', `Unknown tools: ${invalid.join(', ')}`);
      }
    }
  }

  checkSecrets(content) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        this.addError('VAL_E010', `Potential secret detected matching pattern: ${pattern.source.slice(0, 30)}...`);
      }
    }
  }

  checkAbsolutePaths(content) {
    if (ABSOLUTE_PATH_PATTERN.test(content)) {
      this.addWarning('VAL_W020', 'Content contains absolute paths; prefer relative paths or $CLAUDE_PROJECT_DIR');
    }
  }

  isKebabCase(str) {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
  }
}

module.exports = { AgentValidator, VALID_MODELS, VALID_TOOLS };
