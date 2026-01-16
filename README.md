<h1 align="center">mkctx - Make Context</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./black-favicon.svg">
    <source media="(prefers-color-scheme: light)" srcset="./white-favicon.svg">
    <img src="./black-favicon.svg" alt="mkcommit logo" width="150">
  </picture>
</p>

<p align="center">
  A powerful command-line tool that generates comprehensive markdown context files from your project code, perfect for use with AI assistants like ChatGPT, Claude, and others.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mkctx"><img src="https://img.shields.io/npm/v/mkctx.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/mkctx"><img src="https://img.shields.io/npm/dm/mkctx.svg" alt="npm downloads"></a>
  <a href="https://github.com/yourusername/mkctx/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/mkctx.svg" alt="license"></a>
</p>

## Features

- 🚀 **Multi-platform** - Works on Windows, macOS, and Linux
- 📝 **Smart Ignoring** - Respects custom ignore patterns and common system files
- ⚙️ **Configurable** - Customize source directories, output locations, and comments
- 🎯 **AI-Friendly** - Outputs code in markdown format ideal for AI prompts
- 🔧 **Zero Dependencies** - Pure Node.js, no external dependencies
- 🎨 **Syntax Highlighting** - Proper language detection for code blocks
- 🔄 **Dynamic Mode** - Interactive path selection when needed

## Installation

```bash
npm install -g mkctx
```

## Quick Start

### Generate context for your project

```bash
mkctx
```

### Create configuration file

```bash
mkctx config
```

### Show help

```bash
mkctx help
```

## Usage

### Basic Usage

Run `mkctx` in your project root to generate a `context.md` file containing all your project code:

```bash
cd your-project/
mkctx
```

### Dynamic Mode

If no configuration file exists, or if `dynamic: true` is set, mkctx will prompt you for the source path:

```
🔍 Dynamic mode enabled
   Current directory: /home/user/my-project
   Enter path (or press Enter for './src'): app/components
```

### Configuration

Create a configuration file to customize behavior:

```bash
mkctx config
```

This creates:

- `mkctx.config.json` - Configuration file
- `mkctx/` directory - Output folder (added to .gitignore)

## Configuration Options

The `mkctx.config.json` file supports the following options:

```json
{
  "src": "./src",
  "ignore": "*.log, temp/, node_modules/, .git/, dist/, build/",
  "output": "./mkctx",
  "first_comment": "/* Project Context */",
  "last_comment": "/* End of Context */",
  "dynamic": false
}
```

| Option          | Description                                   | Default                                |
| --------------- | --------------------------------------------- | -------------------------------------- |
| `src`           | Source directory to scan                      | `"./src"`                              |
| `ignore`        | Comma-separated patterns to ignore            | `"*.log, temp/, node_modules/, .git/"` |
| `output`        | Output directory for context file             | `"./mkctx"`                            |
| `first_comment` | Comment added at the beginning of the context | `"/* Project Context */"`              |
| `last_comment`  | Comment added at the end of the context       | `"/* End of Context */"`               |
| `dynamic`       | Prompt for path on each run                   | `false`                                |

## Ignore Patterns

mkctx supports several pattern types:

- **Wildcards**: `*.log`, `*.test.js`, `*.spec.ts`
- **Directories**: `temp/`, `dist/`, `build/`
- **Exact match**: `config.local.json`

### Default System Ignores

These are always ignored automatically:

- `.git`, `.svn`, `.hg`
- `node_modules`
- `.DS_Store`, `Thumbs.db`
- `__pycache__`, `.pytest_cache`
- `.vscode`, `.idea`

## Output Format

The generated `context.md` file contains your project code in this format:

````markdown
/_ Project Context _/

```javascript
// src/index.js
console.log("Hello World!");
```

```typescript
// src/utils/helpers.ts
export function helper() {
  return true;
}
```

/_ End of Context _/
````

## Examples

### Include only specific directories

```json
{
  "src": "./src",
  "ignore": "*.test.js, __tests__/, *.spec.ts",
  "output": "./docs",
  "first_comment": "/* My App Codebase */"
}
```

### Generate context for documentation

```json
{
  "src": ".",
  "ignore": "node_modules/, .git/, *.md, package-lock.json, yarn.lock",
  "first_comment": "## Project Overview\n\nThis is the complete codebase.",
  "last_comment": "## End of Codebase"
}
```

### Always prompt for path

```json
{
  "src": "./src",
  "dynamic": true
}
```

## Supported Languages

mkctx automatically detects and applies proper syntax highlighting for:

- **JavaScript/TypeScript**: `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs`
- **Python**: `.py`
- **Go**: `.go`
- **Rust**: `.rs`
- **Java/Kotlin**: `.java`, `.kt`
- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **PHP**: `.php`
- **Ruby**: `.rb`
- **Shell**: `.sh`, `.bash`, `.zsh`, `.ps1`
- **Web**: `.html`, `.css`, `.scss`, `.vue`, `.svelte`
- **Data**: `.json`, `.yaml`, `.yml`, `.xml`, `.toml`
- **And many more...**

## Use Cases

- **AI Pair Programming** - Provide complete context to AI assistants
- **Code Reviews** - Share project overview with reviewers
- **Documentation** - Create living documentation of your codebase
- **Onboarding** - Help new developers understand the project structure
- **Backup** - Generate searchable archives of your code

## Platform Support

- ✅ **Windows** - Full support
- ✅ **macOS** - Full support
- ✅ **Linux** - Full support

## Requirements

- **Node.js** 14.0+
- **npm** (for installation)

## Troubleshooting

### Command not found

If `mkctx` is not found after installation:

1. Make sure npm global bin is in your PATH
2. Try: `npm bin -g` to see where global packages are installed
3. Restart your terminal

### Permission errors (Unix)

```bash
sudo npm install -g mkctx
```

Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

## Changelog

### v2.0.0

- Complete rewrite in Node.js (no more Go binaries)
- Added dynamic mode for interactive path selection
- Improved language detection
- Better ignore pattern handling
- Zero external dependencies

### v1.x

- Initial Go-based implementation

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - see [LICENSE](LICENSE) file for details.
