const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

function extractFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    try {
        return yaml.load(match[1]) || {};
    } catch {
        return {};
    }
}

async function scanSkills(skillsDir) {
    if (!await fs.pathExists(skillsDir)) return [];

    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (!await fs.pathExists(skillPath)) continue;

        const content = await fs.readFile(skillPath, 'utf8');
        const fm = extractFrontmatter(content);
        if (!fm.name) continue;

        skills.push({
            name: fm.name,
            description: (fm.description || '').replace(/\n/g, ' ').trim(),
            scope: fm.metadata?.scope || [],
            autoInvoke: fm.metadata?.auto_invoke || null,
            path: `skills/${entry.name}/SKILL.md`,
        });
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function buildSkillsReference(skills) {
    if (skills.length === 0) return '';
    return skills
        .map((s) => `> - [\`${s.name}\`](${s.path}) - ${s.description}`)
        .join('\n');
}

function buildAutoInvokeRows(skills) {
    const rows = [];
    for (const skill of skills) {
        if (!skill.autoInvoke) continue;
        const actions = Array.isArray(skill.autoInvoke)
            ? skill.autoInvoke
            : [skill.autoInvoke];
        for (const action of actions) {
            rows.push({ action: action.trim(), skill: skill.name });
        }
    }
    rows.sort((a, b) => a.action.localeCompare(b.action));
    return rows.map((r) => `| ${r.action} | \`${r.skill}\` |`).join('\n');
}

function buildSkillsTable(skills) {
    return skills
        .map((s) => `| \`${s.name}\` | ${s.description} |`)
        .join('\n');
}

async function generateAgentsMd(repoPath, options = {}) {
    const { alias = '', stackResult = {}, agents = [] } = options;

    const skillsDir = path.join(repoPath, 'skills');
    const skills = await scanSkills(skillsDir);

    const stackList = stackResult.stackParts?.length > 0
        ? stackResult.stackParts.map((p) => `- ${p}`).join('\n')
        : `- ${stackResult.primaryTech || 'Generic'}`;

    const verifyCmds = stackResult.verifyCommands || 'npm test';

    const templatePath = path.join(TEMPLATES_DIR, 'agents-md.md.tmpl');
    let template;
    if (await fs.pathExists(templatePath)) {
        template = await fs.readFile(templatePath, 'utf8');
    } else {
        template = buildFallbackTemplate();
    }

    const content = template
        .replace(/\{\{alias\}\}/g, alias || 'project')
        .replace(/\{\{skills_reference\}\}/g, buildSkillsReference(skills))
        .replace(/\{\{auto_invoke_rows\}\}/g, buildAutoInvokeRows(skills))
        .replace(/\{\{stack_list\}\}/g, stackList)
        .replace(/\{\{verify_cmds\}\}/g, verifyCmds);

    const outputPath = path.join(repoPath, 'AGENTS.md');
    await fs.writeFile(outputPath, content, 'utf8');
    return outputPath;
}

function buildFallbackTemplate() {
    return `# {{alias}} — AI Agent Guide

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action | Skill |
|--------|-------|
{{auto_invoke_rows}}

---

## Project Overview

**Stack:** {{stack_list}}

## Commands

\`\`\`bash
{{verify_cmds}}
\`\`\`
`;
}

module.exports = {
    generateAgentsMd, scanSkills, extractFrontmatter,
    buildSkillsReference, buildAutoInvokeRows, buildSkillsTable,
};
