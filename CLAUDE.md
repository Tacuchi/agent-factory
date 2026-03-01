# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agent-factory is a Node.js CLI tool (`@tacuchi/agent-factory` v0.4.0) that generates AI agents for Claude Code, Codex, Gemini CLI, and other platforms. It analyzes repository tech stacks and auto-generates role-based agents with appropriate tools and instructions. Requires Node.js >= 16.

## Commands

```bash
# Run all tests (Node.js built-in test module, no external test framework)
npm test

# Run CLI locally
node bin/agent-factory.js <command>

# Dev shortcuts via Makefile
make test                  # npm test
make test-detect-bash      # detect on bash fixture
make test-detect-node-cli  # detect on this repo
make test-create-dry       # dry-run agent creation
make clean                 # rm /tmp/af-test-*
```

## Architecture

### Data Flow

**Detection**: `detect(repoPath)` → scans config files (package.json, pom.xml, go.mod, etc.) → returns `{ primaryTech, framework, verifyCommands, stackParts, stackCsv }`

**Generation**: `runCreate/runInit` → `detect()` → `renderFile(role.md.tmpl, context)` → `writeAgent()` → writes dual format + validates

**Validation**: Extracts YAML frontmatter → checks required fields, model, tools, kebab-case naming, secrets, absolute paths → returns score (0-100)

### Core Modules (`src/core/`)

- **stack-detector.js** — Detects 14+ tech stacks from config files in priority order (package.json → pom.xml → build.gradle → pyproject.toml → go.mod → Cargo.toml → pubspec.yaml → .csproj → Gemfile → .sh → Makefile). Includes `sanitize()` to strip dangerous patterns and `deriveAlias()` for repo name normalization.
- **agent-writer.js** — Generates agents in dual format: Claude Code (`.claude/agents/` with YAML frontmatter) and Codex/Gemini (`.agents/` plain markdown). Auto-appends `-agent` suffix to names. Assigns tools by role (specialists get Write/Edit, reviewers/architects get read-only).
- **template-engine.js** — Simple `{{variable}}` interpolation against templates in `templates/roles/`.
- **agent-validator.js** — Validates YAML frontmatter, detects secrets via regex, checks model/tools against known lists.

### Commands (`src/commands/`)

- **detect.js** — `agent-factory detect <path>` — stack detection, supports `--json` output
- **init.js** — `agent-factory init <path>` — auto-suggests and generates 2-3 agents based on stack complexity
- **create.js** — `agent-factory create` — interactive or flag-driven single agent creation, supports `--dry-run`
- **list.js** — `agent-factory list [path]` — lists and validates agents across `.claude/agents/`, `.agents/`, `.agents/skills/`

### Templates (`templates/roles/`)

Four role templates (specialist, coordinator, reviewer, architect) written in **Spanish**. Variables: `{{name}}`, `{{primary_tech}}`, `{{tech_label}}`, `{{framework}}`, `{{scope}}`, `{{stack_list}}`, `{{stack_csv}}`, `{{verify_cmds}}`, `{{specialist_list}}`, `{{N}}`, `{{repos_word}}`.

## Key Conventions

- Agent names are always kebab-case with auto-appended `-agent` suffix
- Agent templates and generated instructions are in **Spanish**
- Tools assigned per role: specialist (Read, Write, Edit, Bash), coordinator (Read, Glob, Grep, Task, Bash), reviewer/architect (Read, Grep, Glob, Bash)
- Valid models: `opus`, `sonnet`, `haiku`, `inherit`
- `-q` (quiet) flag suppresses all visual output for programmatic/SKILL-based usage
- Tests use `node:test` and `node:assert` — no external test framework
- CommonJS modules throughout (require/module.exports), chalk v4 and ora v5 for ESM compatibility
