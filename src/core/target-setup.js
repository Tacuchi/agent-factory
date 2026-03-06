const fs = require('fs-extra');
const path = require('path');
const { resolveProfile, TARGETS } = require('./target-profiles');

const CONTEXT_FILES = {
    claude: 'CLAUDE.md',
    codex: null,
    gemini: 'GEMINI.md',
    crush: null,
    warp: null,
};

const SKILLS_SYMLINK_DIR = {
    claude: '.claude/skills',
    codex: '.codex/skills',
    gemini: '.gemini/skills',
    crush: null,
    warp: null,
};

async function copyContextFile(repoPath, target) {
    const contextFileName = CONTEXT_FILES[target];
    if (!contextFileName) return null;

    const agentsMdPath = path.join(repoPath, 'AGENTS.md');
    if (!await fs.pathExists(agentsMdPath)) return null;

    const destPath = path.join(repoPath, contextFileName);
    await fs.copy(agentsMdPath, destPath);
    return destPath;
}

async function createSkillsSymlink(repoPath, target) {
    const symlinkDir = SKILLS_SYMLINK_DIR[target];
    if (!symlinkDir) return null;

    const skillsSource = path.join(repoPath, 'skills');
    if (!await fs.pathExists(skillsSource)) return null;

    const symlinkPath = path.join(repoPath, symlinkDir);
    const parentDir = path.dirname(symlinkPath);
    await fs.ensureDir(parentDir);

    if (await fs.pathExists(symlinkPath)) {
        const stat = await fs.lstat(symlinkPath);
        if (stat.isSymbolicLink()) {
            await fs.remove(symlinkPath);
        } else {
            return null;
        }
    }

    const relativeTarget = path.relative(parentDir, skillsSource);
    await fs.symlink(relativeTarget, symlinkPath);
    return symlinkPath;
}

module.exports = { copyContextFile, createSkillsSymlink, CONTEXT_FILES, SKILLS_SYMLINK_DIR };
