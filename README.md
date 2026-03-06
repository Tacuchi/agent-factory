# 🏭 agent-factory

CLI to create AI agents for **Claude Code**, **Codex**, **Gemini CLI** and more.

Analyzes your repository's tech stack and generates role-based agents ready to use.

## Install

```bash
npm install -g agent-factory
```

Or run directly:

```bash
npx agent-factory <command>
```

## Commands

### `detect <path>`

Detect the technology stack of a repository.

```bash
agent-factory detect ./my-project
agent-factory detect ./my-project --json    # Pure JSON output
```

### `init <target> [path]`

Initialize a single-repo agent setup. Generates skills, AGENTS.md with auto-invoke tables, and role-based agents — all inside the repo.

```bash
agent-factory init claude              # Current directory, Claude target
agent-factory init codex ./my-project  # Specific path, Codex target
agent-factory init gemini -y           # Skip confirmations
```

Generates:
```
repo/
├── AGENTS.md                    # Universal context + auto-invoke tables
├── CLAUDE.md                    # Context file for target
├── skills/
│   ├── README.md
│   └── {alias}-dev/SKILL.md     # Project skill with auto-invoke metadata
├── .claude/agents/              # Agent files for target
│   ├── {alias}-specialist-agent.md
│   ├── {alias}-reviewer-agent.md
│   └── {alias}-architect-agent.md
└── .claude/skills -> skills/    # Symlink to skills
```

### `create`

Create a single agent interactively or with flags.

```bash
agent-factory create
agent-factory create -n api-expert -r specialist -s ./my-project -y
```

### `list [path]`

List existing agents in a directory.

```bash
agent-factory list
agent-factory list ./my-project --json   # JSON output
```

## Global flags

| Flag | Description |
|------|-------------|
| `-q, --quiet` | Suppress all visual output (banners, spinners, logs). Useful for programmatic/SKILL usage. |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Supported stacks

**Languages & frameworks:** JavaScript/TypeScript (Angular, React, Vue, Next.js, Svelte, Nuxt, Node.js), Java (Spring Boot — Maven & Gradle), Kotlin, Python (Django, FastAPI, Flask), Go, Rust, Dart/Flutter, .NET, Ruby on Rails.

**Supplementary:** Docker, SCSS, Tailwind CSS, Bootstrap, Angular Material.

## Agent roles

| Role | Purpose |
|------|---------|
| **specialist** | Deep knowledge of the detected stack, implements features and fixes |
| **coordinator** | Orchestrates tasks across the project, manages cross-cutting concerns |
| **reviewer** | Code review focused on quality, patterns and best practices |
| **architect** | System design, architecture decisions and technical strategy |

## Output

Agents are written in dual format:

- `.claude/agents/<name>.md` — YAML frontmatter format for Claude Code
- `.agents/<name>.md` — Plain markdown, compatible with other AI tools

## Programmatic usage (SKILL-friendly)

Designed to be invoked by AI agents via SKILLs:

```bash
# Silent detection, JSON output
agent-factory detect ./repo --json

# Silent init
agent-factory -q init claude ./repo -y

# List agents as JSON
agent-factory list ./workspace --json
```

## Project structure

```
agent-factory/
├── bin/agent-factory.js        # CLI entry point
├── src/
│   ├── commands/
│   │   ├── detect.js           # Stack detection command
│   │   ├── create.js           # Interactive agent creation
│   │   ├── init.js             # Single-repo setup (skills, AGENTS.md, agents)
│   │   └── list.js             # List and validate existing agents
│   ├── core/
│   │   ├── stack-detector.js   # Technology stack analysis
│   │   ├── template-engine.js  # Template rendering with {{variable}} syntax
│   │   ├── agent-writer.js     # Writes agents to target-specific formats
│   │   ├── agent-validator.js  # Validates agent file structure
│   │   ├── agents-md-generator.js  # Generates AGENTS.md with auto-invoke
│   │   ├── target-setup.js     # Skills symlinks and context file copy
│   │   ├── target-profiles.js  # Target platform definitions
│   │   └── tool-mapping.js     # Canonical → native tool mapping
│   └── utils/
│       ├── logger.js           # Colored output, spinners, quiet mode
│       └── prompts.js          # Inquirer prompt builders
└── templates/
    ├── roles/                  # Agent role templates
    │   ├── specialist.md.tmpl
    │   ├── coordinator.md.tmpl
    │   ├── reviewer.md.tmpl
    │   └── architect.md.tmpl
    ├── agents-md.md.tmpl       # AGENTS.md template
    ├── project-skill.md.tmpl   # Project skill template
    └── skills-readme.md.tmpl   # Skills README template
```

## Inspiration & acknowledgments

This project was built from scratch as an original work. The concept and architecture were inspired in part by [claude-code-templates](https://github.com/davila7/claude-code-templates) by Daniel Ávila, from which the following ideas were studied as reference:

- Stack detection patterns
- YAML frontmatter format for Claude Code agents
- CLI tooling choices (commander, inquirer, chalk, ora)

No source code was copied. All implementation is original.

## License

[MIT](LICENSE)
