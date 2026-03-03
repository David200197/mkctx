# mkctx - Make Context

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./black-favicon.svg">
    <source media="(prefers-color-scheme: light)" srcset="./white-favicon.svg">
    <img src="./black-favicon.svg" alt="mkctx logo" width="150">
  </picture>
</p>

A powerful command-line tool that generates comprehensive context files from your project code, perfect for AI prompts and code analysis.

[![npm version](https://img.shields.io/npm/v/mkctx.svg)](https://www.npmjs.com/package/mkctx)
[![npm downloads](https://img.shields.io/npm/dm/mkctx.svg)](https://www.npmjs.com/package/mkctx)
[![license](https://img.shields.io/npm/l/mkctx.svg)](https://github.com/pnkkzero/mkctx/blob/main/LICENSE)

## Features

- 🚀 **Multi-platform** — Works on Windows, macOS, and Linux
- 📝 **Smart Ignoring** — Respects custom ignore patterns and common system files
- ⚙️ **Configurable** — Customize source directories, output locations, and comments
- ✏️ **Custom Naming** — Specify custom filenames for your outputs or use the default `context`
- 🎯 **AI-Friendly** — Outputs code in markdown format ideal for AI prompts
- 🎨 **Syntax Highlighting** — Proper language detection for code blocks
- 🔄 **Dual Mode** — Interactive menu or fully non-interactive via CLI flags
- 📊 **Context Statistics** — Token estimation and file analysis

## Installation

```bash
npm install -g mkctx
```

**Requirements:** Node.js 18.0+

## Quick Start

### Interactive mode

```bash
mkctx
```

Opens a menu where you can generate context, choose output formats, and save with a custom name.

### Non-interactive mode (no prompts)

```bash
mkctx --src ./src --format md --name my-project
```

Pass flags directly and the tool runs to completion without asking anything.

## Usage

### Interactive menu

```
╔════════════════════════════════════════╗
║     📄 mkctx - Make Context            ║
╚════════════════════════════════════════╝

? What would you like to do?
  ❯ 📁 Generate from config file
    🔍 Generate dynamically (choose path)
    ⚙️  View configuration
    ❌ Exit
```

After scanning, you choose a format and optionally a filename:

```
📊 Context Summary:
   Files: 42
   Lines: 3,847
   Size:  156.23 KB

? Select output format:
  ❯ 📦 All formats (MD, JSON, TOON, XML)
    📝 Markdown (.md)
    🔧 JSON (.json) - Simple array
    🎒 TOON (.toon) - Token-optimized
    📄 XML (.xml)

? Enter a name for the output files: (context)
```

### CLI flags (non-interactive)

When any of the following flags are passed, mkctx skips all prompts and runs directly.

| Flag                     | Alias | Description                       | Default   |
| ------------------------ | ----- | --------------------------------- | --------- |
| `--src <path>`           | `-s`  | Source directory to scan          | `.`       |
| `--output <path>`        | `-o`  | Output directory                  | `./mkctx` |
| `--format <fmt>`         | `-f`  | Output format (see below)         | `md`      |
| `--name <filename>`      | `-n`  | Base name for output files        | `context` |
| `--ignore <patterns>`    |       | Comma-separated ignore patterns   |           |
| `--first-comment <text>` |       | Override the first comment header |           |
| `--last-comment <text>`  |       | Override the last comment footer  |           |

**Format values:** `md`, `json`, `toon`, `xml`, `all`, or comma-separated combinations.

```bash
# Single format
mkctx --src ./src --format md

# Multiple formats
mkctx --src . --format md,json --name snapshot

# All formats with custom output directory
mkctx --src . --format all --name my-project --output ./docs

# Using short aliases
mkctx -s ./src -f toon -n snapshot

# With extra ignore patterns
mkctx --src ./app --format md --ignore "*.test.ts,__tests__/"

# Using = syntax
mkctx --src=./src --format=md,json --name=snapshot
```

## Configuration file

Run `mkctx config` to create a `mkctx.config.json` in the current directory:

```json
{
  "src": ".",
  "ignore": "*.log, temp/, node_modules/, .git/, dist/, build/",
  "output": "./mkctx",
  "first_comment": "/* Project Context */",
  "last_comment": "/* End of Context */"
}
```

| Option          | Description                            | Default                   |
| --------------- | -------------------------------------- | ------------------------- |
| `src`           | Source directory to scan               | `"."`                     |
| `ignore`        | Comma-separated patterns to ignore     | See defaults              |
| `output`        | Output directory for context files     | `"./mkctx"`               |
| `first_comment` | Comment at the beginning of the output | `"/* Project Context */"` |
| `last_comment`  | Comment at the end of the output       | `"/* End of Context */"`  |

When a config file is present and CLI flags are also passed, the flags take priority over the file values.

## Ignore patterns

Supported pattern types:

- **Wildcards:** `*.log`, `*.test.js`, `*.spec.ts`
- **Directories:** `temp/`, `dist/`, `build/`
- **Glob patterns:** `**/.cache/`, `**/node_modules/`
- **Exact match:** `config.local.json`

The following are always ignored automatically: `.git`, `.svn`, `.hg`, `node_modules`, `__pycache__`, `.DS_Store`, `Thumbs.db`, `.vscode`, `.idea`, binary files, images, and archives.

## Output formats

| Format | Extension | Description                                             |
| ------ | --------- | ------------------------------------------------------- |
| `md`   | `.md`     | Markdown with fenced code blocks and project structure  |
| `json` | `.json`   | Simple JSON array of file objects                       |
| `toon` | `.toon`   | Token-Oriented Object Notation — compact, LLM-optimized |
| `xml`  | `.xml`    | XML with CDATA sections                                 |

### Markdown output example

````markdown
/_ Project Context _/

## Project Structure

\```
📁 src/
📁 src/components/

42 files total
\```

## Source Files

### src/index.ts

\```typescript
import { App } from './app';
const app = new App();
app.start();
\```

/_ End of Context _/
````

### JSON output example

```json
[
  {
    "path": "src/index.ts",
    "name": "index.ts",
    "extension": "ts",
    "language": "typescript",
    "lines": 150,
    "size": 4096,
    "content": "..."
  }
]
```

## Supported languages

| Category                | Extensions                                      |
| ----------------------- | ----------------------------------------------- |
| JavaScript / TypeScript | `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`    |
| Python                  | `.py`, `.pyw`                                   |
| Go                      | `.go`                                           |
| Rust                    | `.rs`                                           |
| Java / Kotlin           | `.java`, `.kt`, `.scala`                        |
| C / C++                 | `.c`, `.cpp`, `.h`, `.hpp`                      |
| PHP                     | `.php`                                          |
| Ruby                    | `.rb`, `.rake`                                  |
| Shell                   | `.sh`, `.bash`, `.zsh`, `.ps1`                  |
| Web                     | `.html`, `.css`, `.scss`, `.vue`, `.svelte`     |
| Data                    | `.json`, `.yaml`, `.yml`, `.xml`, `.toml`       |
| Other                   | `.sql`, `.graphql`, `.proto`, `.prisma`, `.sol` |

## Use cases

- **AI code analysis** — Feed your codebase to ChatGPT, Claude, or other AI tools
- **Code reviews** — Share a full project snapshot with reviewers
- **Onboarding** — Help new developers get oriented quickly
- **Documentation** — Generate a versioned snapshot of your codebase
- **CI/CD pipelines** — Use non-interactive flags to automate context generation

## Platform support

| Platform | Status          |
| -------- | --------------- |
| macOS    | ✅ Full support |
| Linux    | ✅ Full support |
| Windows  | ✅ Full support |

## Troubleshooting

**Command not found after installation**

1. Make sure the npm global bin directory is in your PATH
2. Run `npm bin -g` to check where global packages are installed
3. Restart your terminal

**Permission errors on Unix**

```bash
sudo npm install -g mkctx
```

Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

## Changelog

### v5.0.0

- ✨ Added non-interactive CLI flags (`--src`, `--format`, `--output`, `--name`, `--ignore`, etc.)
- 🔤 Added short aliases (`-s`, `-o`, `-f`, `-n`)
- 🔧 Support for `--key=value` syntax
- ♻️ Internal refactor with clean code structure

### v4.0.0

- ✏️ Added interactive filename selection when saving (defaults to `context`)
- 🎨 Improved UI/UX for the file saving workflow

### v3.0.0

- 🎯 Simplified to focus on context generation
- 🗑️ Removed Ollama chat integration
- ⚡ Faster startup and smaller footprint

### v2.x

- Ollama AI chat integration (removed in v3)

### v1.x

- Initial Go-based implementation

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License — see [LICENSE](LICENSE) for details.
