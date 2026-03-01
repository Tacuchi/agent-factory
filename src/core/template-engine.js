const fs = require('fs-extra');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'roles');

function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in data) {
      return data[key] ?? '';
    }
    return match;
  });
}

async function renderFile(templateName, data) {
  const filePath = path.join(TEMPLATES_DIR, templateName);
  const template = await fs.readFile(filePath, 'utf8');
  return render(template, data);
}

function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.md.tmpl'))
    .map((f) => f.replace('.md.tmpl', ''));
}

module.exports = { render, renderFile, listTemplates, TEMPLATES_DIR };
