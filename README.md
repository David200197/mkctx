# mkctx - Make Context

A powerful command-line tool that generates comprehensive markdown context files from your project code, perfect for use with AI assistants and documentation.

## Features

- 🚀 **Multi-platform** - Works on Windows, macOS, and Linux
- 📝 **Smart Ignoring** - Respects gitignore patterns and custom ignore rules
- ⚙️ **Configurable** - Customize source directories, output locations, and comments
- 🎯 **AI-Friendly** - Outputs code in markdown format ideal for AI prompts
- 🔧 **Easy Installation** - Install globally via npm

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

## Usage

### Basic Usage
Run `mkctx` in your project root to generate a `context.md` file containing all your project code:

```bash
cd your-project/
mkctx
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
  "ignore": "*.log, temp/, node_modules/, .git/",
  "output": "./mkctx",
  "first_comment": "/* Project Context */",
  "last_comment": "/* End of Context */"
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `src` | Source directory to scan | `"."` (current directory) |
| `ignore` | Comma-separated patterns to ignore | `"*.log, temp/, node_modules/, .git/"` |
| `output` | Output directory for context file | `"."` (current directory) |
| `first_comment` | Comment added at the beginning of the context | `"/* Project Context */"` |
| `last_comment` | Comment added at the end of the context | `"/* End of Context */"` |

## Output Format

The generated `context.md` file contains your project code in this format:

````markdown
/* Project Context */

```javascript
// src/main.js
console.log("Hello World!");
```

```css
// styles/main.css
body { margin: 0; }
```

/* End of Context */
````

## Examples

### Include only specific directories
```json
{
  "src": "./src",
  "ignore": "*.test.js, __tests__/, dist/",
  "output": "./docs",
  "first_comment": "/* My App Codebase */"
}
```

### Generate context for documentation
```json
{
  "src": ".",
  "ignore": "node_modules/, .git/, *.md, package-lock.json",
  "first_comment": "## Project Overview\n\nThis is the complete codebase for my application.",
  "last_comment": "## End of Codebase\n\nThis context file was generated using mkctx."
}
```

## Platform Support

- ✅ **Windows** - Full support with automatic .exe handling
- ✅ **macOS** - Native support with proper permissions
- ✅ **Linux** - Complete compatibility

## Requirements

- **Go** 1.16+ (for building from source)
- **Node.js** 14.0+ (for npm installation)
- **npm** or **yarn** (for package management)

## How It Works

1. **Scan**: Recursively scans your source directory
2. **Filter**: Applies ignore patterns from config and .gitignore
3. **Format**: Converts each file to markdown code blocks with file paths
4. **Output**: Generates a comprehensive context.md file

## Use Cases

- **AI Pair Programming** - Provide complete context to AI assistants
- **Code Reviews** - Share project overview with reviewers
- **Documentation** - Create living documentation of your codebase
- **Onboarding** - Help new developers understand the project structure
- **Backup** - Generate searchable archives of your code

## Troubleshooting

### Installation Issues
If installation fails, try manual installation:
1. Build the binary: `go build -o mkctx main.go`
2. Copy to a directory in your PATH
3. Ensure execution permissions: `chmod +x mkctx`

### Permission Errors
On Unix systems, you might need to use `sudo`:
```bash
sudo npm install -g mkctx
```

### Binary Not Found
If `mkctx` command is not found after installation:
1. Check if the installation directory is in your PATH
2. Restart your terminal
3. Try reinstalling: `npm uninstall -g mkctx && npm install -g mkctx`

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - see LICENSE file for details.

## Support

If you encounter any problems or have questions:
1. Check this README for solutions
2. Open an issue on GitHub
3. Check the generated configuration for guidance