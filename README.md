<h1 align="center">mkctx - Make Context</h1>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./black-favicon.svg">
    <source media="(prefers-color-scheme: light)" srcset="./white-favicon.svg">
    <img src="./black-favicon.svg" alt="mkctx logo" width="150">
  </picture>
</p>

<p align="center">
  A powerful command-line tool that generates comprehensive markdown context files from your project code, perfect for AI prompts and code analysis.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mkctx"><img src="https://img.shields.io/npm/v/mkctx.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/mkctx"><img src="https://img.shields.io/npm/dm/mkctx.svg" alt="npm downloads"></a>
  <a href="https://github.com/pnkkzero/mkctx/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/mkctx.svg" alt="license"></a>
</p>

## ✨ Features

- 🚀 **Multi-platform** - Works on Windows, macOS, and Linux
- 📝 **Smart Ignoring** - Respects custom ignore patterns and common system files
- ⚙️ **Configurable** - Customize source directories, output locations, and comments
- 🎯 **AI-Friendly** - Outputs code in markdown format ideal for AI prompts
- 🎨 **Syntax Highlighting** - Proper language detection for code blocks
- 🔄 **Dynamic Mode** - Interactive path selection when needed
- 📊 **Context Statistics** - Token estimation and file analysis

## 📦 Installation

```bash
npm install -g mkctx
```

### Requirements

- **Node.js** 18.0+

## 🚀 Quick Start

### Interactive Mode (Recommended)

```bash
mkctx
```

This opens an interactive menu where you can:
1. Generate context from config file or dynamically
2. View context statistics
3. Save the context to a file

### Create Configuration File

```bash
mkctx config
```

### Show Help

```bash
mkctx help
```

## 📋 Usage

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

After generating context:

```
📊 Context Summary:
   Files: 42
   Lines: 3,847
   Size: 156.23 KB
   Est. tokens: ~39,058

? What would you like to do with this context?
  ❯ 💾 Save context to file
    🔙 Back to main menu
    ❌ Exit
```

## ⚙️ Configuration

### Project Configuration (`mkctx.config.json`)

```json
{
  "src": "./src",
  "ignore": "*.log, temp/, node_modules/, .git/, dist/, build/",
  "output": "./mkctx",
  "first_comment": "/* Project Context */",
  "last_comment": "/* End of Context */"
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `src` | Source directory to scan | `"."` |
| `ignore` | Comma-separated patterns to ignore | See defaults |
| `output` | Output directory for context file | `"./mkctx"` |
| `first_comment` | Comment at the beginning | `"/* Project Context */"` |
| `last_comment` | Comment at the end | `"/* End of Context */"` |

## 🔧 CLI Options

```bash
mkctx                    # Interactive mode (recommended)
mkctx config             # Create configuration file
mkctx help               # Show help message
mkctx version            # Show version
```

## 📂 Ignore Patterns

mkctx supports several pattern types:

- **Wildcards**: `*.log`, `*.test.js`, `*.spec.ts`
- **Directories**: `temp/`, `dist/`, `build/`
- **Glob patterns**: `**/.cache/`, `**/node_modules/`
- **Exact match**: `config.local.json`

### Default System Ignores

These are always ignored automatically:

- `.git`, `.svn`, `.hg`
- `node_modules`, `__pycache__`
- `.DS_Store`, `Thumbs.db`
- `.vscode`, `.idea`
- Binary files, images, archives

## 📄 Output Format

The generated `context.md` file contains your project code:

````markdown
/* Project Context */

## Project Structure

```
📁 src/
📁 src/components/
📁 src/utils/

42 files total
```

## Source Files

### src/index.ts

```typescript
import { App } from './app';

const app = new App();
app.start();
```

### src/utils/helpers.ts

```typescript
export function helper() {
  return true;
}
```

/* End of Context */
````

## 🎨 Supported Languages

mkctx automatically detects and applies proper syntax highlighting for:

| Category | Extensions |
|----------|------------|
| **JavaScript/TypeScript** | `.js`, `.ts`, `.jsx`, `.tsx`, `.mjs`, `.cjs` |
| **Python** | `.py`, `.pyw` |
| **Go** | `.go` |
| **Rust** | `.rs` |
| **Java/Kotlin** | `.java`, `.kt`, `.scala` |
| **C/C++** | `.c`, `.cpp`, `.h`, `.hpp` |
| **PHP** | `.php` |
| **Ruby** | `.rb`, `.rake` |
| **Shell** | `.sh`, `.bash`, `.zsh`, `.ps1` |
| **Web** | `.html`, `.css`, `.scss`, `.vue`, `.svelte` |
| **Data** | `.json`, `.yaml`, `.yml`, `.xml`, `.toml` |
| **And many more...** | `.sql`, `.graphql`, `.proto`, `.prisma`, `.sol` |

## 💡 Use Cases

- **🤖 AI Code Analysis** - Feed your codebase to ChatGPT, Claude, or other AI tools
- **📚 Code Understanding** - Share project overview for quick understanding
- **👥 Code Reviews** - Share project overview with reviewers
- **🎓 Onboarding** - Help new developers understand the project
- **📝 Documentation** - Generate a snapshot of your codebase

## 🖥️ Platform Support

| Platform | Status |
|----------|--------|
| **macOS** | ✅ Full support |
| **Linux** | ✅ Full support |
| **Windows** | ✅ Full support |

## 🔧 Troubleshooting

### Command Not Found

If `mkctx` is not found after installation:

1. Make sure npm global bin is in your PATH
2. Try: `npm bin -g` to see where global packages are installed
3. Restart your terminal

### Permission Errors (Unix)

```bash
sudo npm install -g mkctx
```

Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

## 📋 Changelog

### v3.0.0

- 🎯 Simplified to focus on context generation
- 🗑️ Removed Ollama chat integration
- ⚡ Faster startup and smaller footprint
- 🧹 Cleaner codebase

### v2.x

- Ollama AI chat integration (removed in v3)
- Interactive chat interface

### v1.x

- Initial Go-based implementation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for developers who love AI-assisted coding
</p>