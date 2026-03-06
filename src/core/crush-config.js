const CRUSH_SCHEMA_URL = 'https://charm.land/crush.json';
const DEFAULT_SKILLS_PATH = '.agents/skills';

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function mergeCrushConfig(existing = {}) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  if (!base.$schema) {
    base.$schema = CRUSH_SCHEMA_URL;
  }

  const options = base.options && typeof base.options === 'object' ? { ...base.options } : {};
  options.initialize_as = 'AGENTS.md';

  const paths = Array.isArray(options.skills_paths) ? options.skills_paths.slice() : [];
  options.skills_paths = unique([...paths, DEFAULT_SKILLS_PATH]);

  base.options = options;
  return base;
}

module.exports = {
  CRUSH_SCHEMA_URL,
  DEFAULT_SKILLS_PATH,
  mergeCrushConfig,
};
