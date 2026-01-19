#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ============================================
// LAZY LOAD DEPENDENCIES (for faster startup)
// ============================================

let inquirer, chalk, ora;

function loadDependencies() {
    if (!inquirer) {
        inquirer = require('inquirer');
        chalk = require('chalk');
        ora = require('ora');
    }
}

// ============================================
// CONSTANTS
// ============================================

const CONFIG_FILE = 'mkctx.config.json';

const DEFAULT_PROJECT_CONFIG = {
    src: ".",
    ignore: "mkctx.config.json, pnpm-lock.yaml, **/.titan/, mkctx/, node_modules/, .git/, dist/, build/, target/, .next/, out/, .cache, package-lock.json, *.log, temp/, tmp/, coverage/, .nyc_output, .env, .env.local, .env.development.local, .env.test.local, .env.production.local, npm-debug.log*, yarn-debug.log*, yarn-error.log*, .npm, .yarn-integrity, .parcel-cache, .vuepress/dist, .svelte-kit, **/*.rs.bk, .idea/, .vscode/, .DS_Store, Thumbs.db, *.swp, *.swo, .~lock.*, Cargo.lock, .cargo/registry/, .cargo/git/, .rustup/, *.pdb, *.dSYM/, *.so, *.dll, *.dylib, *.exe, *.lib, *.a, *.o, *.rlib, *.d, *.tmp, *.bak, *.orig, *.rej, *.pyc, *.pyo, *.class, *.jar, *.war, *.ear, *.zip, *.tar.gz, *.rar, *.7z, *.iso, *.img, *.dmg, *.pdf, *.doc, *.docx, *.xls, *.xlsx, *.ppt, *.pptx",
    output: "./mkctx",
    first_comment: "/* Project Context */",
    last_comment: "/* End of Context */"
};

// Language mapping for syntax highlighting
const LANG_MAP = {
    js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin', cs: 'csharp', cpp: 'cpp',
    c: 'c', h: 'c', hpp: 'cpp', php: 'php',
    sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell',
    sql: 'sql', html: 'html', css: 'css', scss: 'scss',
    sass: 'sass', less: 'less', json: 'json', xml: 'xml',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', vue: 'vue',
    svelte: 'svelte', dockerfile: 'dockerfile', makefile: 'makefile',
    toml: 'toml', ini: 'ini', cfg: 'ini', env: 'bash'
};

// Text file extensions
const TEXT_EXTENSIONS = new Set([
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw', '.rb', '.rake', '.go', '.rs',
    '.java', '.kt', '.kts', '.scala', '.cs', '.fs', '.vb',
    '.cpp', '.c', '.h', '.hpp', '.cc', '.cxx',
    '.php', '.phtml', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.sql', '.html', '.htm', '.xhtml',
    '.css', '.scss', '.sass', '.less', '.styl',
    '.json', '.json5', '.xml', '.xsl', '.xslt',
    '.yaml', '.yml', '.md', '.markdown', '.mdx',
    '.txt', '.text', '.vue', '.svelte',
    '.dockerfile', '.makefile', '.toml', '.ini', '.cfg', '.conf',
    '.env', '.env.example', '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc',
    '.graphql', '.gql', '.proto', '.tf', '.tfvars',
    '.lua', '.r', '.R', '.swift', '.m', '.mm',
    '.ex', '.exs', '.erl', '.hrl', '.clj', '.cljs', '.cljc',
    '.hs', '.lhs', '.elm', '.pug', '.jade',
    '.ejs', '.hbs', '.handlebars', '.twig', '.blade.php',
    '.astro', '.prisma', '.sol'
]);

const KNOWN_FILES = new Set([
    'dockerfile', 'makefile', 'gemfile', 'rakefile',
    'procfile', 'vagrantfile', 'jenkinsfile',
    '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc',
    '.env', '.env.example', '.env.local',
    'readme.md', 'readme.txt', 'readme',
    'license', 'license.md', 'license.txt'
]);

// ============================================
// CONFIGURATION MANAGEMENT
// ============================================

function loadProjectConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            return { ...DEFAULT_PROJECT_CONFIG, ...config };
        } catch (err) {
            console.log(chalk.yellow('⚠️  Error parsing config file, using defaults'));
            return { ...DEFAULT_PROJECT_CONFIG };
        }
    }
    return null;
}

function hasProjectConfig() {
    return fs.existsSync(CONFIG_FILE);
}

function createProjectConfig() {
    loadDependencies();

    if (!fs.existsSync('mkctx')) {
        fs.mkdirSync('mkctx', { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_PROJECT_CONFIG, null, 2));
    updateGitignore();

    console.log(chalk.green('\n✅ Configuration created:'));
    console.log(chalk.white('   - mkctx.config.json'));
    console.log(chalk.white('   - mkctx/ folder'));
    console.log(chalk.white('   - Entry in .gitignore\n'));
}

function updateGitignore() {
    const gitignorePath = '.gitignore';
    let content = '';

    if (fs.existsSync(gitignorePath)) {
        content = fs.readFileSync(gitignorePath, 'utf-8');
    }

    if (!content.includes('mkctx/')) {
        const entry = '\n# mkctx - generated context\nmkctx/\n';
        content += entry;
        fs.writeFileSync(gitignorePath, content);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

// Normalize path to always use forward slashes
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

// ============================================
// FILE OPERATIONS
// ============================================

function isTextFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename).toLowerCase();

    if (KNOWN_FILES.has(basename)) return true;
    if (ext && TEXT_EXTENSIONS.has(ext)) return true;

    return false;
}

function getLanguage(filename) {
    const ext = path.extname(filename).slice(1).toLowerCase();
    const basename = path.basename(filename).toLowerCase();

    if (basename === 'dockerfile') return 'dockerfile';
    if (basename === 'makefile') return 'makefile';
    if (basename.startsWith('.env')) return 'bash';

    return LANG_MAP[ext] || ext || 'text';
}

function parseIgnorePatterns(ignoreString) {
    if (!ignoreString) return [];
    return ignoreString
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
}

function matchWildcard(pattern, filename) {
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(filename);
}

function shouldIgnore(fullPath, name, relativePath, patterns) {
    // Normalize paths for comparison
    const normalizedFull = normalizePath(fullPath);
    const normalizedRelative = normalizePath(relativePath);

    const systemIgnores = [
        '.git', '.DS_Store', 'Thumbs.db', 'node_modules',
        '.svn', '.hg', '__pycache__', '.pytest_cache',
        '.mypy_cache', '.vscode', '.idea'
    ];

    for (const ignore of systemIgnores) {
        if (normalizedFull.includes('/' + ignore + '/') ||
            normalizedFull.includes('/' + ignore) ||
            normalizedFull.endsWith('/' + ignore) ||
            name === ignore) {
            return true;
        }
    }

    for (const pattern of patterns) {
        if (pattern.includes('*')) {
            if (matchWildcard(pattern, name)) return true;
            if (matchWildcard(pattern, normalizedRelative)) return true;
        }

        if (pattern.endsWith('/')) {
            const dir = pattern.slice(0, -1);
            if (normalizedFull.includes('/' + dir + '/') ||
                normalizedFull.endsWith('/' + dir) ||
                name === dir) {
                return true;
            }
        }

        if (normalizedRelative === pattern || name === pattern) {
            return true;
        }
    }

    return false;
}

// ============================================
// SCAN AND BUILD JSON IN ONE PASS
// ============================================

function scanAndBuildJson(srcPath, config) {
    const jsonArray = [];
    const ignorePatterns = parseIgnorePatterns(config.ignore);
    let totalSize = 0;
    let totalLines = 0;
    const filesByExt = {};

    function walk(dir) {
        if (!fs.existsSync(dir)) return;

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (err) {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(srcPath, fullPath);

            if (shouldIgnore(fullPath, entry.name, relativePath, ignorePatterns)) {
                continue;
            }

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile() && isTextFile(entry.name)) {
                // Read file immediately when found
                let content;
                try {
                    content = fs.readFileSync(fullPath, 'utf-8');
                } catch (err) {
                    // Skip files that can't be read
                    continue;
                }

                const ext = path.extname(entry.name).slice(1).toLowerCase() || null;
                const lines = content.split('\n').length;
                const size = Buffer.byteLength(content, 'utf-8');
                const language = getLanguage(entry.name);

                // Update stats
                totalSize += size;
                totalLines += lines;
                filesByExt[ext || 'other'] = (filesByExt[ext || 'other'] || 0) + 1;

                // Add to JSON array immediately
                jsonArray.push({
                    path: normalizePath(relativePath),
                    name: entry.name,
                    extension: ext,
                    language: language,
                    lines: lines,
                    size: size,
                    content: content
                });
            }
        }
    }

    walk(srcPath);

    // Sort by path for consistency
    jsonArray.sort((a, b) => a.path.localeCompare(b.path));

    const stats = {
        files: jsonArray.length,
        totalSize,
        totalLines,
        filesByExt
    };

    return { jsonArray, stats };
}

// ============================================
// FORMAT CONVERTERS (from base JSON)
// ============================================

function toJson(baseJson) {
    return JSON.stringify(baseJson, null, 2);
}

function toMarkdown(baseJson, config) {
    let content = '';

    if (config.first_comment) {
        content += config.first_comment + '\n\n';
    }

    // Project structure
    content += '## Project Structure\n\n```\n';
    const dirs = new Set();
    baseJson.forEach(f => {
        const dir = path.dirname(f.path);
        if (dir !== '.') dirs.add(dir);
    });
    Array.from(dirs).sort().forEach(d => content += `📁 ${d}/\n`);
    content += `\n${baseJson.length} files total\n\`\`\`\n\n`;

    // Source files
    content += '## Source Files\n\n';

    for (const file of baseJson) {
        content += `### ${file.path}\n\n`;
        content += '```' + file.language + '\n';
        content += file.content;
        if (!file.content.endsWith('\n')) {
            content += '\n';
        }
        content += '```\n\n';
    }

    if (config.last_comment) {
        content += config.last_comment;
    }

    return content;
}

function toToon(baseJson, stats) {
    let content = '';

    // Meta header
    content += `# Project Context\n`;
    content += `# Generated: ${new Date().toISOString()}\n`;
    content += `# Files: ${baseJson.length}\n`;
    content += `# Lines: ${stats.totalLines}\n`;
    content += `# Size: ${stats.totalSize} bytes\n\n`;

    // Files table (compact tabular format - TOON's strength)
    content += `files[${baseJson.length}]{path,name,extension,language,lines,size}:\n`;
    for (const file of baseJson) {
        const ext = file.extension || '';
        content += `  ${escapeToonValue(file.path)},${escapeToonValue(file.name)},${ext},${file.language},${file.lines},${file.size}\n`;
    }

    content += '\n';

    // File contents
    for (let i = 0; i < baseJson.length; i++) {
        const file = baseJson[i];
        content += `---\n`;
        content += `[${i}] ${file.path}\n`;
        content += `language: ${file.language}\n`;
        content += `content:\n`;
        // Indent each line with 2 spaces
        const lines = file.content.split('\n');
        for (const line of lines) {
            content += `  ${line}\n`;
        }
    }

    return content;
}

function escapeToonValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"') ||
        str.startsWith(' ') || str.endsWith(' ')) {
        return '"' + str.replace(/"/g, '""').replace(/\n/g, '\\n') + '"';
    }
    return str;
}

function toXml(baseJson) {
    let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
    content += '<context>\n';

    for (const file of baseJson) {
        content += `  <file>\n`;
        content += `    <path>${escapeXml(file.path)}</path>\n`;
        content += `    <name>${escapeXml(file.name)}</name>\n`;
        content += `    <extension>${escapeXml(file.extension || '')}</extension>\n`;
        content += `    <language>${escapeXml(file.language)}</language>\n`;
        content += `    <lines>${file.lines}</lines>\n`;
        content += `    <size>${file.size}</size>\n`;
        content += `    <content><![CDATA[\n${file.content}${file.content.endsWith('\n') ? '' : '\n'}]]></content>\n`;
        content += `  </file>\n`;
    }

    content += '</context>\n';
    return content;
}

function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ============================================
// CONTEXT GENERATION
// ============================================

async function generateContextDynamic() {
    loadDependencies();

    const { srcPath } = await inquirer.prompt([
        {
            type: 'input',
            name: 'srcPath',
            message: 'Enter the source path to analyze:',
            default: '.',
            validate: (input) => {
                if (!fs.existsSync(input)) {
                    return `Path does not exist: ${input}`;
                }
                return true;
            }
        }
    ]);

    const config = { ...DEFAULT_PROJECT_CONFIG, src: srcPath };
    return generateContext(config, srcPath);
}

async function generateContextFromConfigFile() {
    loadDependencies();

    const config = loadProjectConfig();
    if (!config) {
        console.log(chalk.yellow('\n⚠️  No config file found.'));
        return null;
    }

    return generateContext(config, config.src);
}

function generateContext(config, srcPath) {
    const spinner = ora(`Scanning and reading files from ${srcPath}...`).start();

    if (!fs.existsSync(srcPath)) {
        spinner.fail(`Source path does not exist: ${srcPath}`);
        return null;
    }

    // Single pass: scan AND build JSON at the same time
    const { jsonArray, stats } = scanAndBuildJson(srcPath, config);

    if (jsonArray.length === 0) {
        spinner.fail(`No files found in: ${srcPath}`);
        return null;
    }

    spinner.succeed(`Context built: ${chalk.yellow(jsonArray.length)} files, ${chalk.yellow(formatSize(stats.totalSize))}`);

    return {
        baseJson: jsonArray,
        stats: stats,
        config
    };
}

// ============================================
// SAVE CONTEXT
// ============================================

// ============================================
// SAVE CONTEXT
// ============================================

async function saveContext(result, formats) {
    loadDependencies();

    const { fileName } = await inquirer.prompt([
        {
            type: 'input',
            name: 'fileName',
            message: 'Enter a name for the output files:',
            default: 'context'
        }
    ]);

    let outputPath = result.config.output || './mkctx';

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const savedFiles = [];

    for (const format of formats) {
        let content;
        let filename;

        switch (format) {
            case 'json':
                content = toJson(result.baseJson);
                filename = `${fileName}.json`;
                break;
            case 'md':
                content = toMarkdown(result.baseJson, result.config);
                filename = `${fileName}.md`;
                break;
            case 'toon':
                content = toToon(result.baseJson, result.stats);
                filename = `${fileName}.toon`;
                break;
            case 'xml':
                content = toXml(result.baseJson);
                filename = `${fileName}.xml`;
                break;
        }

        const outputFile = path.join(outputPath, filename);
        fs.writeFileSync(outputFile, content);
        const size = Buffer.byteLength(content, 'utf-8');
        const tokens = estimateTokens(content);
        savedFiles.push({ format, file: outputFile, size, tokens });
    }

    console.log(chalk.green('\n✅ Context saved:\n'));
    for (const { format, file, size, tokens } of savedFiles) {
        console.log(chalk.white(`   ${chalk.cyan(format.toUpperCase().padEnd(4))} → ${chalk.yellow(file)}`));
        console.log(chalk.gray(`         ${formatSize(size)} | ~${tokens.toLocaleString()} tokens\n`));
    }

    return savedFiles;
}

// ============================================
// FORMAT SELECTION
// ============================================

async function selectFormat() {
    loadDependencies();

    const { format } = await inquirer.prompt([
        {
            type: 'list',
            name: 'format',
            message: 'Select output format:',
            default: 'all',
            choices: [
                {
                    name: chalk.magenta('📦 All formats (MD, JSON, TOON, XML)'),
                    value: 'all'
                },
                new inquirer.Separator(),
                {
                    name: chalk.blue('📝 Markdown (.md)'),
                    value: 'md'
                },
                {
                    name: chalk.green('🔧 JSON (.json) - Simple array'),
                    value: 'json'
                },
                {
                    name: chalk.yellow('🎒 TOON (.toon) - Token-optimized'),
                    value: 'toon'
                },
                {
                    name: chalk.red('📄 XML (.xml)'),
                    value: 'xml'
                }
            ]
        }
    ]);

    if (format === 'all') {
        return ['json', 'md', 'toon', 'xml'];
    }

    return [format];
}

// ============================================
// MAIN MENU
// ============================================

async function showMainMenu() {
    loadDependencies();

    const hasConfig = hasProjectConfig();

    console.log(chalk.cyan('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.cyan.bold('     📄 mkctx - Make Context            ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚════════════════════════════════════════╝\n'));

    const choices = [];

    if (hasConfig) {
        choices.push({
            name: chalk.green('📁 Generate from config file'),
            value: 'from-config'
        });
    }

    choices.push(
        {
            name: chalk.blue('🔍 Generate dynamically (choose path)'),
            value: 'dynamic'
        },
        new inquirer.Separator(),
        {
            name: hasConfig
                ? chalk.gray('⚙️  View configuration')
                : chalk.yellow('⚙️  Create configuration file'),
            value: 'config'
        },
        new inquirer.Separator(),
        {
            name: chalk.red('❌ Exit'),
            value: 'exit'
        }
    );

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices
        }
    ]);

    return action;
}

// ============================================
// MAIN APPLICATION
// ============================================

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
        showHelp();
        return;
    }

    if (args.includes('--version') || args.includes('-v') || args[0] === 'version') {
        showVersion();
        return;
    }

    if (args[0] === 'config') {
        loadDependencies();
        createProjectConfig();
        return;
    }

    loadDependencies();

    let running = true;

    while (running) {
        const action = await showMainMenu();

        switch (action) {
            case 'from-config': {
                const result = await generateContextFromConfigFile();
                if (result) {
                    console.log(chalk.cyan('\n📊 Context Summary:'));
                    console.log(chalk.white(`   Files: ${result.stats.files}`));
                    console.log(chalk.white(`   Lines: ${result.stats.totalLines.toLocaleString()}`));
                    console.log(chalk.white(`   Size: ${formatSize(result.stats.totalSize)}`));

                    const formats = await selectFormat();
                    await saveContext(result, formats);

                    console.log(chalk.yellow('👋 Done!\n'));
                    running = false;
                }
                break;
            }

            case 'dynamic': {
                const result = await generateContextDynamic();
                if (result) {
                    console.log(chalk.cyan('\n📊 Context Summary:'));
                    console.log(chalk.white(`   Files: ${result.stats.files}`));
                    console.log(chalk.white(`   Lines: ${result.stats.totalLines.toLocaleString()}`));
                    console.log(chalk.white(`   Size: ${formatSize(result.stats.totalSize)}`));

                    const formats = await selectFormat();
                    await saveContext(result, formats);

                    console.log(chalk.yellow('👋 Done!\n'));
                    running = false;
                }
                break;
            }

            case 'config':
                if (hasProjectConfig()) {
                    console.log(chalk.cyan('\n📄 Current configuration:\n'));
                    const config = loadProjectConfig();
                    console.log(JSON.stringify(config, null, 2));
                    console.log(chalk.gray(`\n   Edit ${CONFIG_FILE} to modify settings.\n`));
                } else {
                    createProjectConfig();
                }
                break;

            case 'exit':
                running = false;
                console.log(chalk.yellow('\n👋 Goodbye!\n'));
                break;
        }
    }
}

function showHelp() {
    loadDependencies();

    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════╗
║  📄 mkctx - Make Context for AI Code Analysis              ║
╚════════════════════════════════════════════════════════════╝

 ${chalk.white('Generate context files from your codebase for AI analysis.')}

 ${chalk.yellow('Usage:')}
  mkctx                    Interactive mode (recommended)
  mkctx config             Create configuration file
  mkctx help               Show this help message
  mkctx version            Show version

 ${chalk.yellow('Output Formats:')}
  ${chalk.green('JSON')}    Simple array of file objects (base format)
  ${chalk.blue('MD')}      Markdown with code blocks
  ${chalk.yellow('TOON')}    Token-Oriented Object Notation (LLM optimized)
  ${chalk.red('XML')}     XML with CDATA sections

 ${chalk.yellow('JSON Structure:')}
  [{
    "path": "src/index.ts",
    "name": "index.ts", 
    "extension": "ts",
    "language": "typescript",
    "lines": 150,
    "size": 4096,
    "content": "..."
  }]

 ${chalk.gray('More info: https://github.com/pnkkzero/mkctx')}
`));
}

function showVersion() {
    try {
        const pkg = require('./package.json');
        console.log(`mkctx v${pkg.version}`);
    } catch {
        console.log('mkctx v4.0.0');
    }
}

// ============================================
// RUN
// ============================================

main().catch((err) => {
    console.error(`\n❌ Error: ${err.message}`);
    if (process.env.DEBUG) {
        console.error(err.stack);
    }
    process.exit(1);
});