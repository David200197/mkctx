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
- 🧩 **Extensible File Types** — Add any extension the built-in whitelist doesn't cover (`--extensions`)
- ✏️ **Custom Naming** — Specify custom filenames for your outputs or use the default `context`
- 🎯 **AI-Friendly** — Outputs code in markdown format ideal for AI prompts
- 🎨 **Syntax Highlighting** — Proper language detection for code blocks
- 🔄 **Dual Mode** — Interactive menu or fully non-interactive via CLI flags
- 📊 **Context Statistics** — Token estimation and file analysis
- 🗜️ **ZIP Export** — Bundle original files preserving the full directory structure

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
  ❯ 📦 All formats (MD, JSON, TOON, XML, ZIP)
    📝 Markdown (.md)
    🔧 JSON (.json) - Simple array
    🎒 TOON (.toon) - Token-optimized
    📄 XML (.xml)
    🗜️  ZIP (.zip) - Original files bundled

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
| `--extensions <exts>`    |       | Extra file extensions to include  |           |
| `--first-comment <text>` |       | Override the first comment header |           |
| `--last-comment <text>`  |       | Override the last comment footer  |           |

**Format values:** `md`, `json`, `toon`, `xml`, `zip`, `all`, or comma-separated combinations.

```bash
# Single format
mkctx --src ./src --format md

# Multiple formats
mkctx --src . --format md,json --name snapshot

# All formats with custom output directory
mkctx --src . --format all --name my-project --output ./docs

# ZIP only — bundle original files
mkctx --src ./app --format zip --name snapshot

# ZIP combined with markdown
mkctx --src . --format md,zip --name my-project

# Using short aliases
mkctx -s ./src -f toon -n snapshot

# With extra ignore patterns
mkctx --src ./app --format md --ignore "*.test.ts,__tests__/"

# Include file types not in the built-in whitelist
mkctx --src ./game --format md --extensions "rpy,rpym"

# Using = syntax
mkctx --src=./src --format=md,json --name=snapshot
```

## Configuration file

Run `mkctx config` to create a `mkctx.config.json` in the current directory:

```json
{
  "src": ".",
  "ignore": "*.log, temp/, node_modules/, .git/, dist/, build/",
  "extensions": "",
  "output": "./mkctx",
  "first_comment": "/* Project Context */",
  "last_comment": "/* End of Context */"
}
```

| Option          | Description                            | Default                   |
| --------------- | -------------------------------------- | ------------------------- |
| `src`           | Source directory to scan               | `"."`                     |
| `ignore`        | Comma-separated patterns to ignore     | See defaults              |
| `extensions`    | Extra file extensions to treat as text | `""`                      |
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

The following directories are always ignored automatically, regardless of configuration: `.git`, `.svn`, `.hg`, `node_modules`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.vscode`, `.idea`, plus `.DS_Store` and `Thumbs.db`.

> **Note:** binary files, images, and archives are not excluded by ignore patterns — they simply never match the file-type whitelist described below. Ignore patterns only narrow what the whitelist already accepted.

## File type detection

mkctx does **not** read every file it finds. A file is included only if it matches one of:

1. A known extension (see [Supported languages](#supported-languages))
2. A known filename with no extension (`Dockerfile`, `Makefile`, `Gemfile`, `LICENSE`, …)
3. An extension listed in `extensions` / `--extensions`

Anything else is skipped silently — which is why binaries, images, fonts, and archives never end up in the output.

### Extending detection

If your stack uses a file type mkctx doesn't know, add it instead of forking:

```bash
# Ren'Py visual novel scripts
mkctx --src ./game --format md --extensions "rpy,rpym"

# Multiple custom types (leading dot is optional)
mkctx --src . --format md --extensions ".hbs,.liquid,cshtml"
```

Or persist it in `mkctx.config.json`:

```json
{
  "src": "./game",
  "extensions": "rpy, rpym"
}
```

The list is **additive** — it extends the built-in whitelist, never replaces it. Extensions are matched case-insensitively.

> ⚠️ Only add text formats. Adding a binary extension (`.rpyc`, `.pyc`, `.class`) will pull unreadable bytes into your context and inflate token counts for nothing. Pair `--extensions` with `--ignore` when a format has a compiled sibling.

### Ren'Py projects

`.rpy` and `.rpym` are supported out of the box as of v6.1.0, and the default ignore list excludes `*.rpyc`, `*.rpymc`, `*.rpa`, `*.rpi`, `saves/`, `game/cache/` and `game/saves/`.

```bash
mkctx --src ./game --format md --name vn-context
```

Point `--src` at `game/`, not the project root: a root launched from the Ren'Py SDK may contain the `renpy/` and `lib/` engine trees, which would add thousands of irrelevant `.py` files. If you don't need translations, add `game/tl/` to your ignore patterns.

## Output formats

| Format | Extension | Description                                             |
| ------ | --------- | ------------------------------------------------------- |
| `md`   | `.md`     | Markdown with fenced code blocks and project structure  |
| `json` | `.json`   | Simple JSON array of file objects                       |
| `toon` | `.toon`   | Token-Oriented Object Notation — compact, LLM-optimized |
| `xml`  | `.xml`    | XML with CDATA sections                                 |
| `zip`  | `.zip`    | Original files bundled, preserving directory structure  |

### Markdown output example

````markdown
/* Project Context */

## Project Structure

```
📁 src/
📁 src/components/

42 files total
```

## Source Files

### src/index.ts

```typescript
import { App } from './app';
const app = new App();
app.start();
```

/* End of Context */
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

### ZIP output

The `zip` format bundles every scanned file into a `.zip` archive, preserving the full relative directory structure. This is useful for sharing a clean snapshot of your project or feeding files directly to tools that accept archives.

```
context.zip
├── src/
│   ├── index.ts
│   └── components/
│       └── App.tsx
├── package.json
└── README.md
```

The ZIP format can be combined freely with other formats in the same run:

```bash
mkctx --src . --format md,zip --name my-project
# Outputs: my-project.md + my-project.zip
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
| Ren'Py                  | `.rpy`, `.rpym`                                 |
| Other                   | `.sql`, `.graphql`, `.proto`, `.prisma`, `.sol` |

Not listed? Use `--extensions` — see [Extending detection](#extending-detection).

## Use cases

- **AI code analysis** — Feed your codebase to ChatGPT, Claude, or other AI tools
- **Code reviews** — Share a full project snapshot with reviewers
- **Onboarding** — Help new developers get oriented quickly
- **Documentation** — Generate a versioned snapshot of your codebase
- **CI/CD pipelines** — Use non-interactive flags to automate context generation
- **Project sharing** — Use the `zip` format to hand off a clean copy of your source files

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

### v6.1.0

- 🧩 Added `extensions` config option and `--extensions` CLI flag to include file types outside the built-in whitelist
- 🎮 Added native Ren'Py support: `.rpy` and `.rpym` are now scanned, with `renpy` language tagging
- 🚫 Default ignore list now excludes Ren'Py build artifacts: `*.rpyc`, `*.rpymc`, `*.rpa`, `*.rpi`, `saves/`, `game/cache/`, `game/saves/`
- 📖 Documented the file-type whitelist, which previously caused unknown extensions to be dropped without warning

### v6.0.0

- 🗜️ Added `zip` output format — bundles original files preserving directory structure
- 📦 `--format all` now includes `zip`
- ➕ New dependency: [`archiver`](https://www.npmjs.com/package/archiver) (pure JS, OS-agnostic)

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