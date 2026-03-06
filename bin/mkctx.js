#!/usr/bin/env node

'use strict';

const fs   = require('fs');
const path = require('path');

// ============================================
// LAZY-LOADED DEPENDENCIES
// ============================================

let inquirer, chalk, ora;

function loadDependencies() {
    if (inquirer) return;
    inquirer = require('inquirer');
    chalk    = require('chalk');
    ora      = require('ora');
}

// ============================================
// CONSTANTS
// ============================================

const CONFIG_FILE = 'mkctx.config.json';

const DEFAULT_CONFIG = {
    src:           '.',
    ignore:        'mkctx.config.json, pnpm-lock.yaml, **/.titan/, mkctx/, node_modules/, .git/, dist/, build/, target/, .next/, out/, .cache, package-lock.json, *.log, temp/, tmp/, coverage/, .nyc_output, .env, .env.local, .env.development.local, .env.test.local, .env.production.local, npm-debug.log*, yarn-debug.log*, yarn-error.log*, .npm, .yarn-integrity, .parcel-cache, .vuepress/dist, .svelte-kit, **/*.rs.bk, .idea/, .vscode/, .DS_Store, Thumbs.db, *.swp, *.swo, .~lock.*, Cargo.lock, .cargo/registry/, .cargo/git/, .rustup/, *.pdb, *.dSYM/, *.so, *.dll, *.dylib, *.exe, *.lib, *.a, *.o, *.rlib, *.d, *.tmp, *.bak, *.orig, *.rej, *.pyc, *.pyo, *.class, *.jar, *.war, *.ear, *.zip, *.tar.gz, *.rar, *.7z, *.iso, *.img, *.dmg, *.pdf, *.doc, *.docx, *.xls, *.xlsx, *.ppt, *.pptx',
    output:        './mkctx',
    first_comment: '/* Project Context */',
    last_comment:  '/* End of Context */',
};

const VALID_FORMATS = ['json', 'md', 'toon', 'xml'];

const LANG_MAP = {
    js: 'javascript', ts: 'typescript', jsx: 'jsx',    tsx: 'tsx',
    py: 'python',     rb: 'ruby',       go: 'go',      rs: 'rust',
    java: 'java',     kt: 'kotlin',     cs: 'csharp',  cpp: 'cpp',
    c: 'c',           h: 'c',           hpp: 'cpp',    php: 'php',
    sh: 'bash',       bash: 'bash',     zsh: 'bash',   ps1: 'powershell',
    sql: 'sql',       html: 'html',     css: 'css',    scss: 'scss',
    sass: 'sass',     less: 'less',     json: 'json',  xml: 'xml',
    yaml: 'yaml',     yml: 'yaml',      md: 'markdown', vue: 'vue',
    svelte: 'svelte', dockerfile: 'dockerfile', makefile: 'makefile',
    toml: 'toml',     ini: 'ini',       cfg: 'ini',    env: 'bash',
};

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
    '.astro', '.prisma', '.sol',
]);

const KNOWN_FILES = new Set([
    'dockerfile', 'makefile', 'gemfile', 'rakefile',
    'procfile', 'vagrantfile', 'jenkinsfile',
    '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc',
    '.env', '.env.example', '.env.local',
    'readme.md', 'readme.txt', 'readme',
    'license', 'license.md', 'license.txt',
]);

const SYSTEM_IGNORES = [
    '.git', '.DS_Store', 'Thumbs.db', 'node_modules',
    '.svn', '.hg', '__pycache__', '.pytest_cache',
    '.mypy_cache', '.vscode', '.idea',
];

// Flags that take a value (not boolean)
const VALUE_FLAGS = new Set([
    'src', 'output', 'format', 'ignore', 'name', 'first-comment', 'last-comment',
    's', 'o', 'f', 'n',
]);

// Flags that trigger non-interactive mode
const NON_INTERACTIVE_FLAGS = new Set([
    'src', 's', 'output', 'o', 'format', 'f',
    'ignore', 'name', 'n', 'first-comment', 'last-comment',
]);

// ============================================
// CLI ARGUMENT PARSING
// ============================================

function parseArgs(argv) {
    const args  = argv.slice(2);
    const flags = {};
    let command = null;

    if (args.length > 0 && !args[0].startsWith('-')) {
        command = args[0];
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--') && arg.includes('=')) {
            const eq = arg.indexOf('=');
            flags[arg.slice(2, eq)] = arg.slice(eq + 1);
            continue;
        }

        if (arg.startsWith('-') && !arg.startsWith('--') && arg.includes('=')) {
            const eq = arg.indexOf('=');
            flags[arg.slice(1, eq)] = arg.slice(eq + 1);
            continue;
        }

        if (arg.startsWith('--')) {
            const key  = arg.slice(2);
            const next = args[i + 1];
            if (VALUE_FLAGS.has(key) && next !== undefined && !isFlagToken(next)) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
            continue;
        }

        if (arg.startsWith('-') && arg.length === 2) {
            const key  = arg.slice(1);
            const next = args[i + 1];
            if (VALUE_FLAGS.has(key) && next !== undefined && !isFlagToken(next)) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        }
    }

    return { command, flags };
}

function isFlagToken(str) {
    return /^--[a-zA-Z]/.test(str) || /^-[a-zA-Z]/.test(str);
}

function isNonInteractiveMode(flags) {
    return Object.keys(flags).some(f => NON_INTERACTIVE_FLAGS.has(f));
}

// Resolve short aliases to canonical names
function resolveFlags(flags) {
    return {
        src:          flags.src    || flags.s,
        output:       flags.output || flags.o,
        format:       flags.format || flags.f,
        name:         flags.name   || flags.n,
        ignore:       flags.ignore,
        firstComment: flags['first-comment'],
        lastComment:  flags['last-comment'],
    };
}

// ============================================
// CONFIG MANAGEMENT
// ============================================

function configFileExists() {
    return fs.existsSync(CONFIG_FILE);
}

function loadConfig() {
    if (!configFileExists()) return null;
    try {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...raw };
    } catch {
        console.log(chalk.yellow('⚠️  Error parsing config file, using defaults'));
        return { ...DEFAULT_CONFIG };
    }
}

function buildConfig(cliFlags = {}) {
    const base = configFileExists() ? loadConfig() : { ...DEFAULT_CONFIG };
    if (cliFlags.src)          base.src           = cliFlags.src;
    if (cliFlags.output)       base.output        = cliFlags.output;
    if (cliFlags.ignore)       base.ignore        = cliFlags.ignore;
    if (cliFlags.firstComment) base.first_comment = cliFlags.firstComment;
    if (cliFlags.lastComment)  base.last_comment  = cliFlags.lastComment;
    return base;
}

function createConfigFile() {
    loadDependencies();
    fs.mkdirSync('mkctx', { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    appendToGitignore();
    console.log(chalk.green('\n✅ Configuration created:'));
    console.log(chalk.white('   - mkctx.config.json'));
    console.log(chalk.white('   - mkctx/ folder'));
    console.log(chalk.white('   - Entry in .gitignore\n'));
}

function appendToGitignore() {
    const gitignorePath = '.gitignore';
    const current = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf-8')
        : '';
    if (!current.includes('mkctx/')) {
        fs.writeFileSync(gitignorePath, current + '\n# mkctx - generated context\nmkctx/\n');
    }
}

// ============================================
// FORMAT RESOLUTION
// ============================================

function resolveFormats(formatArg) {
    if (!formatArg)            return ['md'];
    if (formatArg === 'all')   return [...VALID_FORMATS];

    const requested = formatArg.split(',').map(f => f.trim().toLowerCase());
    const invalid   = requested.filter(f => !VALID_FORMATS.includes(f));

    if (invalid.length > 0) {
        console.error(`❌ Invalid format(s): ${invalid.join(', ')}. Valid: ${VALID_FORMATS.join(', ')}, all`);
        process.exit(1);
    }

    return requested;
}

// ============================================
// UTILITY HELPERS
// ============================================

function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}

function toUnixPath(filePath) {
    return filePath.replace(/\\/g, '/');
}

// ============================================
// FILE FILTERING
// ============================================

function isTextFile(filename) {
    const ext      = path.extname(filename).toLowerCase();
    const basename = path.basename(filename).toLowerCase();
    return KNOWN_FILES.has(basename) || (!!ext && TEXT_EXTENSIONS.has(ext));
}

function getLanguage(filename) {
    const ext      = path.extname(filename).slice(1).toLowerCase();
    const basename = path.basename(filename).toLowerCase();
    if (basename === 'dockerfile')      return 'dockerfile';
    if (basename === 'makefile')        return 'makefile';
    if (basename.startsWith('.env'))    return 'bash';
    return LANG_MAP[ext] || ext || 'text';
}

function parseIgnorePatterns(ignoreString) {
    if (!ignoreString) return [];
    return ignoreString.split(',').map(p => p.trim()).filter(Boolean);
}

function matchWildcard(pattern, subject) {
    const regex = new RegExp(
        '^' + pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*') + '$',
        'i'
    );
    return regex.test(subject);
}

function shouldIgnore(fullPath, name, relativePath, patterns) {
    const normFull     = toUnixPath(fullPath);
    const normRelative = toUnixPath(relativePath);

    const inSystemIgnore = SYSTEM_IGNORES.some(ig =>
        normFull.includes(`/${ig}/`) ||
        normFull.includes(`/${ig}`)  ||
        normFull.endsWith(`/${ig}`)  ||
        name === ig
    );
    if (inSystemIgnore) return true;

    return patterns.some(pattern => {
        if (pattern.includes('*')) {
            return matchWildcard(pattern, name) || matchWildcard(pattern, normRelative);
        }
        if (pattern.endsWith('/')) {
            const dir = pattern.slice(0, -1);
            return normFull.includes(`/${dir}/`) ||
                   normFull.endsWith(`/${dir}`)  ||
                   name === dir;
        }
        return normRelative === pattern || name === pattern;
    });
}

// ============================================
// FILE SCANNING
// ============================================

function scanFiles(srcPath, config) {
    const ignorePatterns = parseIgnorePatterns(config.ignore);
    const files          = [];
    const stats          = { files: 0, totalSize: 0, totalLines: 0, filesByExt: {} };

    function walk(dir) {
        if (!fs.existsSync(dir)) return;

        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch { return; }

        for (const entry of entries) {
            const fullPath     = path.join(dir, entry.name);
            const relativePath = path.relative(srcPath, fullPath);

            if (shouldIgnore(fullPath, entry.name, relativePath, ignorePatterns)) continue;

            if (entry.isDirectory()) { walk(fullPath); continue; }
            if (!entry.isFile() || !isTextFile(entry.name)) continue;

            let content;
            try { content = fs.readFileSync(fullPath, 'utf-8'); }
            catch { continue; }

            const ext      = path.extname(entry.name).slice(1).toLowerCase() || null;
            const lines    = content.split('\n').length;
            const size     = Buffer.byteLength(content, 'utf-8');
            const language = getLanguage(entry.name);

            stats.totalSize  += size;
            stats.totalLines += lines;
            stats.filesByExt[ext || 'other'] = (stats.filesByExt[ext || 'other'] || 0) + 1;

            files.push({ path: toUnixPath(relativePath), name: entry.name, extension: ext, language, lines, size, content });
        }
    }

    walk(srcPath);
    files.sort((a, b) => a.path.localeCompare(b.path));
    stats.files = files.length;

    return { files, stats };
}

// ============================================
// OUTPUT FORMATTERS
// ============================================

function toJson(files) {
    return JSON.stringify(files, null, 2);
}

function toMarkdown(files, config) {
    const dirs = [...new Set(
        files.map(f => path.dirname(f.path)).filter(d => d !== '.')
    )].sort();

    const structure = dirs.map(d => `📁 ${d}/`).join('\n');

    const sources = files.map(file => {
        const body = file.content.endsWith('\n') ? file.content : file.content + '\n';
        return `### ${file.path}\n<!-- ${file.lines} lines -->\n\n\`\`\`${file.language}\n${body}\`\`\`\n`;
    }).join('\n---\n');

    return [
        config.first_comment,
        '',
        '## Project Structure',
        '',
        '```',
        structure,
        '',
        `${files.length} files total`,
        '```',
        '',
        '## Source Files',
        '',
        sources,
        config.last_comment,
    ].join('\n');
}

function toToon(files, stats) {
    const header = [
        '# Project Context',
        `# Generated: ${new Date().toISOString()}`,
        `# Files: ${files.length}`,
        `# Lines: ${stats.totalLines}`,
        `# Size: ${stats.totalSize} bytes`,
        '',
        `files[${files.length}]{path,name,extension,language,lines,size}:`,
        ...files.map(f =>
            `  ${escapeToon(f.path)},${escapeToon(f.name)},${f.extension || ''},${f.language},${f.lines},${f.size}`
        ),
        '',
    ].join('\n');

    const bodies = files.map((f, i) => [
        '---',
        `[${i}] ${f.path}`,
        `language: ${f.language}`,
        'content:',
        ...f.content.split('\n').map(l => `  ${l}`),
    ].join('\n')).join('\n');

    return header + bodies;
}

function escapeToon(value) {
    if (value == null) return '';
    const str         = String(value);
    const needsQuotes = str.includes(',') || str.includes('\n') || str.includes('"')
        || str.startsWith(' ') || str.endsWith(' ');
    return needsQuotes
        ? `"${str.replace(/"/g, '""').replace(/\n/g, '\\n')}"`
        : str;
}

function toXml(files) {
    const fileEntries = files.map(f => [
        '  <file>',
        `    <path>${escapeXml(f.path)}</path>`,
        `    <name>${escapeXml(f.name)}</name>`,
        `    <extension>${escapeXml(f.extension || '')}</extension>`,
        `    <language>${escapeXml(f.language)}</language>`,
        `    <lines>${f.lines}</lines>`,
        `    <size>${f.size}</size>`,
        `    <content><![CDATA[\n${f.content}${f.content.endsWith('\n') ? '' : '\n'}]]></content>`,
        '  </file>',
    ].join('\n')).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<context>\n${fileEntries}\n</context>\n`;
}

function escapeXml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function renderFormat(format, files, stats, config) {
    switch (format) {
        case 'json': return { content: toJson(files),             ext: 'json' };
        case 'md':   return { content: toMarkdown(files, config), ext: 'md'   };
        case 'toon': return { content: toToon(files, stats),      ext: 'toon' };
        case 'xml':  return { content: toXml(files),              ext: 'xml'  };
    }
}

// ============================================
// CONTEXT GENERATION
// ============================================

function generateContext(config) {
    const spinner = ora(`Scanning ${config.src}...`).start();

    if (!fs.existsSync(config.src)) {
        spinner.fail(`Source path does not exist: ${config.src}`);
        return null;
    }

    const { files, stats } = scanFiles(config.src, config);

    if (files.length === 0) {
        spinner.fail(`No files found in: ${config.src}`);
        return null;
    }

    spinner.succeed(`Context built: ${chalk.yellow(files.length)} files, ${chalk.yellow(formatSize(stats.totalSize))}`);
    return { files, stats, config };
}

function printSummary(stats) {
    console.log(chalk.cyan('\n📊 Context Summary:'));
    console.log(chalk.white(`   Files: ${stats.files}`));
    console.log(chalk.white(`   Lines: ${stats.totalLines.toLocaleString()}`));
    console.log(chalk.white(`   Size:  ${formatSize(stats.totalSize)}`));
}

// ============================================
// SAVE CONTEXT
// ============================================

async function saveContext(result, formats, fileName) {
    loadDependencies();

    if (!fileName) {
        const answer = await inquirer.prompt([{
            type: 'input', name: 'fileName',
            message: 'Enter a name for the output files:',
            default: 'context',
        }]);
        fileName = answer.fileName;
    }

    const outputDir = result.config.output || './mkctx';
    fs.mkdirSync(outputDir, { recursive: true });

    const savedFiles = [];

    for (const format of formats) {
        const { content, ext } = renderFormat(format, result.files, result.stats, result.config);
        const outputPath = path.join(outputDir, `${fileName}.${ext}`);
        fs.writeFileSync(outputPath, content);
        savedFiles.push({
            format,
            file:   outputPath,
            size:   Buffer.byteLength(content, 'utf-8'),
            tokens: estimateTokens(content),
        });
    }

    console.log(chalk.green('\n✅ Context saved:\n'));
    for (const { format, file, size, tokens } of savedFiles) {
        console.log(chalk.white(`   ${chalk.cyan(format.toUpperCase().padEnd(4))} → ${chalk.yellow(file)}`));
        console.log(chalk.gray(`         ${formatSize(size)} | ~${tokens.toLocaleString()} tokens\n`));
    }

    return savedFiles;
}

// ============================================
// INTERACTIVE PROMPTS
// ============================================

async function promptSrcPath() {
    const { srcPath } = await inquirer.prompt([{
        type: 'input', name: 'srcPath',
        message: 'Enter the source path to analyze:',
        default: '.',
        validate: input => fs.existsSync(input) || `Path does not exist: ${input}`,
    }]);
    return srcPath;
}

async function promptFormat() {
    const { format } = await inquirer.prompt([{
        type: 'list', name: 'format',
        message: 'Select output format:',
        default: 'all',
        choices: [
            { name: chalk.magenta('📦 All formats (MD, JSON, TOON, XML)'), value: 'all'  },
            new inquirer.Separator(),
            { name: chalk.blue('📝 Markdown (.md)'),                       value: 'md'   },
            { name: chalk.green('🔧 JSON (.json) - Simple array'),          value: 'json' },
            { name: chalk.yellow('🎒 TOON (.toon) - Token-optimized'),      value: 'toon' },
            { name: chalk.red('📄 XML (.xml)'),                             value: 'xml'  },
        ],
    }]);
    return resolveFormats(format);
}

async function promptMainMenu() {
    const hasConfig = configFileExists();

    console.log(chalk.cyan('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan('║') + chalk.cyan.bold('     📄 mkctx - Make Context            ') + chalk.cyan('║'));
    console.log(chalk.cyan('╚════════════════════════════════════════╝\n'));

    const choices = [];

    if (hasConfig) {
        choices.push({ name: chalk.green('📁 Generate from config file'), value: 'from-config' });
    }

    choices.push(
        { name: chalk.blue('🔍 Generate dynamically (choose path)'), value: 'dynamic' },
        new inquirer.Separator(),
        {
            name:  hasConfig ? chalk.gray('⚙️  View configuration') : chalk.yellow('⚙️  Create configuration file'),
            value: 'config',
        },
        new inquirer.Separator(),
        { name: chalk.red('❌ Exit'), value: 'exit' },
    );

    const { action } = await inquirer.prompt([{
        type: 'list', name: 'action',
        message: 'What would you like to do?',
        choices,
    }]);

    return action;
}

// ============================================
// EXECUTION FLOWS
// ============================================

async function runNonInteractive(rawFlags) {
    loadDependencies();

    const cli     = resolveFlags(rawFlags);
    const config  = buildConfig(cli);
    const formats = resolveFormats(cli.format);
    const fileName = cli.name || 'context';

    if (!fs.existsSync(config.src)) {
        console.error(`❌ Source path does not exist: ${config.src}`);
        process.exit(1);
    }

    const result = generateContext(config);
    if (!result) process.exit(1);

    printSummary(result.stats);
    await saveContext(result, formats, fileName);
    console.log(chalk.yellow('👋 Done!\n'));
}

async function runInteractive() {
    loadDependencies();

    let running = true;

    while (running) {
        const action = await promptMainMenu();

        switch (action) {
            case 'from-config': {
                const config = loadConfig();
                if (!config) { console.log(chalk.yellow('\n⚠️  No config file found.')); break; }
                const result = generateContext(config);
                if (!result) break;
                printSummary(result.stats);
                const formats = await promptFormat();
                await saveContext(result, formats);
                console.log(chalk.yellow('👋 Done!\n'));
                running = false;
                break;
            }

            case 'dynamic': {
                const srcPath = await promptSrcPath();
                const config  = { ...DEFAULT_CONFIG, src: srcPath };
                const result  = generateContext(config);
                if (!result) break;
                printSummary(result.stats);
                const formats = await promptFormat();
                await saveContext(result, formats);
                console.log(chalk.yellow('👋 Done!\n'));
                running = false;
                break;
            }

            case 'config':
                if (configFileExists()) {
                    console.log(chalk.cyan('\n📄 Current configuration:\n'));
                    console.log(JSON.stringify(loadConfig(), null, 2));
                    console.log(chalk.gray(`\n   Edit ${CONFIG_FILE} to modify settings.\n`));
                } else {
                    createConfigFile();
                }
                break;

            case 'exit':
                running = false;
                console.log(chalk.yellow('\n👋 Goodbye!\n'));
                break;
        }
    }
}

// ============================================
// HELP & VERSION
// ============================================

function showHelp() {
    loadDependencies();
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════╗
║  📄 mkctx - Make Context for AI Code Analysis              ║
╚════════════════════════════════════════════════════════════╝

 ${chalk.white('Generate context files from your codebase for AI analysis.')}

 ${chalk.yellow('Usage:')}
  mkctx                         Interactive mode
  mkctx config                  Create configuration file
  mkctx help / --help           Show this help message
  mkctx version / --version     Show version

 ${chalk.yellow('Non-interactive flags (skip all prompts):')}
  --src      <path>             Source directory              (default: .)
  --output   <path>             Output directory              (default: ./mkctx)
  --format   <fmt>              md, json, toon, xml, all, or comma-separated
  --name     <filename>         Output file base name         (default: context)
  --ignore   <patterns>         Comma-separated ignore patterns
  --first-comment <text>        Override first comment header
  --last-comment  <text>        Override last comment footer

 ${chalk.yellow('Short aliases:')}
  -s  --src     -o  --output     -f  --format     -n  --name

 ${chalk.yellow('Examples:')}
  mkctx --src ./src
  mkctx --src . --format all --name my-project --output ./docs
  mkctx --src ./app --format md,json --ignore "*.test.ts,__tests__/"
  mkctx -s ./src -f toon -n snapshot

 ${chalk.yellow('Output Formats:')}
  ${chalk.green('JSON')}    Simple array of file objects
  ${chalk.blue('MD')}      Markdown with code blocks
  ${chalk.yellow('TOON')}    Token-Oriented Object Notation (LLM optimized)
  ${chalk.red('XML')}     XML with CDATA sections

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
// ENTRY POINT
// ============================================

async function main() {
    const { command, flags } = parseArgs(process.argv);

    if (flags.help || flags.h || command === 'help')       return showHelp();
    if (flags.version || flags.v || command === 'version') return showVersion();
    if (command === 'config') { loadDependencies(); return createConfigFile(); }

    if (isNonInteractiveMode(flags)) {
        await runNonInteractive(flags);
    } else {
        await runInteractive();
    }
}

main().catch(err => {
    console.error(`\n❌ Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
});