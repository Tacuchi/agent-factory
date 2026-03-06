# 🏭 agent-factory

CLI to create AI agents for **Claude Code**, **Codex**, **Gemini CLI**, **OpenCode (legacy)**, **Crush**, and **Warp-compatible skills**.

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
agent-factory detect ./my-project --json
```

### `init <path>`

Analyze a repository and generate suggested agents automatically.

```bash
agent-factory init ./my-project --target all -y
agent-factory init ./my-project --target claude -y
agent-factory init ./my-project --target gemini --output ./workspace -y
```

### `create`

Create a single agent interactively or with flags.

```bash
agent-factory create
agent-factory create -n api-expert -r specialist -s ./my-project -t all -y
agent-factory create -n reviewer -r reviewer -t codex -y
```

### `list [path]`

List existing agents in a directory.

```bash
agent-factory list
agent-factory list ./my-project --json
```

## Global flags

| Flag | Description |
|------|-------------|
| `-q, --quiet` | Suppress all visual output (banners, spinners, logs). Useful for programmatic/SKILL usage. |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Target matrix

Supported `--target` values:

- `claude` - writes `.claude/agents/*.md`
- `codex` - writes `.agents/*.md` and `.agents/skills/*/SKILL.md`
- `gemini` - writes `.gemini/agents/*.md`
- `opencode` - writes `.agents/*.md`, `.agents/skills/*/SKILL.md`, and `.opencode.json`
- `crush` - writes `.agents/*.md`, `.agents/skills/*/SKILL.md`, and `.crush.json`
- `warp` - writes `.agents/skills/*/SKILL.md` and `docs/warp-oz/environment-example.md`
- `all` - writes all outputs above in one run

## Supported stacks

**Languages & frameworks:** JavaScript/TypeScript (Angular, React, Vue, Next.js, Svelte, Nuxt, Node.js), Java (Spring Boot - Maven & Gradle), Kotlin, Python (Django, FastAPI, Flask), Go, Rust, Dart/Flutter, .NET, Ruby on Rails.

**Supplementary:** Docker, SCSS, Tailwind CSS, Bootstrap, Angular Material.

## Agent roles

| Role | Purpose |
|------|---------|
| **specialist** | Deep knowledge of the detected stack, implements features and fixes |
| **coordinator** | Orchestrates tasks across repositories, delegates to specialists |
| **reviewer** | Code review focused on quality, patterns and best practices |
| **architect** | System design, architecture decisions and technical strategy |
| **custom** | Free-form instructions for specific workflows |

## Output examples

With `--target all`, agent-factory can generate:

- `.claude/agents/<name>.md`
- `.agents/<name>.md`
- `.agents/skills/<name>/SKILL.md`
- `.gemini/agents/<name>.md`
- `.crush.json`
- `.opencode.json`
- `docs/warp-oz/environment-example.md`

## Programmatic usage (SKILL-friendly)

Designed to be invoked by AI agents via skills:

```bash
# Silent detection, JSON output
agent-factory detect ./repo --json

# Silent generation for full compatibility
agent-factory -q create --name repo-backend --role specialist --scope ./repo --target all -y

# List generated agents as JSON
agent-factory list ./workspace --json
```

## Project structure

```text
agent-factory/
├── bin/agent-factory.js
├── src/
│   ├── commands/
│   ├── core/
│   └── utils/
├── templates/
└── tests/
```

## License

[MIT](LICENSE)
