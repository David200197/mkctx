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
    ignore: "mkctx.config.json, pnpm-lock.yaml, **/.titan/, mkctx/, node_modules/, .git/, dist/, build/, target/, .next/, out/, .cache, package-lock.json, README.md, *.log, temp/, tmp/, coverage/, .nyc_output, .env, .env.local, .env.development.local, .env.test.local, .env.production.local, npm-debug.log*, yarn-debug.log*, yarn-error.log*, .npm, .yarn-integrity, .parcel-cache, .vuepress/dist, .svelte-kit, **/*.rs.bk, .idea/, .vscode/, .DS_Store, Thumbs.db, *.swp, *.swo, .~lock.*, Cargo.lock, .cargo/registry/, .cargo/git/, .rustup/, *.pdb, *.dSYM/, *.so, *.dll, *.dylib, *.exe, *.lib, *.a, *.o, *.rlib, *.d, *.tmp, *.bak, *.orig, *.rej, *.pyc, *.pyo, *.class, *.jar, *.war, *.ear, *.zip, *.tar.gz, *.rar, *.7z, *.iso, *.img, *.dmg, *.pdf, *.doc, *.docx, *.xls, *.xlsx, *.ppt, *.pptx",
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
    '.env', '.env.example', '.env.local'
]);

// ============================================
// GLOBAL STATE
// ============================================

let generatedContext = null;
let contextFiles = [];
let contextStats = {};

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
    const systemIgnores = [
        '.git', '.DS_Store', 'Thumbs.db', 'node_modules',
        '.svn', '.hg', '__pycache__', '.pytest_cache',
        '.mypy_cache', '.vscode', '.idea'
    ];

    for (const ignore of systemIgnores) {
        if (fullPath.includes(path.sep + ignore + path.sep) ||
            fullPath.includes(ignore + path.sep) ||
            name === ignore) {
            return true;
        }
    }

    for (const pattern of patterns) {
        if (pattern.includes('*')) {
            if (matchWildcard(pattern, name)) return true;
            if (matchWildcard(pattern, relativePath)) return true;
        }

        if (pattern.endsWith('/')) {
            const dir = pattern.slice(0, -1);
            if (fullPath.includes(path.sep + dir + path.sep) ||
                fullPath.includes(dir + path.sep) ||
                name === dir) {
                return true;
            }
        }

        if (relativePath === pattern || name === pattern) {
            return true;
        }
    }

    return false;
}

function getFiles(srcPath, config) {
    const files = [];
    const ignorePatterns = parseIgnorePatterns(config.ignore);

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
                files.push({
                    fullPath,
                    relativePath,
                    name: entry.name,
                    ext: path.extname(entry.name).slice(1).toLowerCase()
                });
            }
        }
    }

    walk(srcPath);
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function buildContextContent(files, config, srcPath) {
    let content = '';
    let totalSize = 0;
    let totalLines = 0;
    const filesByExt = {};

    if (config.first_comment) {
        content += config.first_comment + '\n\n';
    }

    content += '## Project Structure\n\n```\n';
    const dirs = new Set();
    files.forEach(f => {
        const dir = path.dirname(f.relativePath);
        if (dir !== '.') dirs.add(dir);
    });
    dirs.forEach(d => content += `📁 ${d}/\n`);
    content += `\n${files.length} files total\n\`\`\`\n\n`;

    content += '## Source Files\n\n';

    for (const file of files) {
        let fileContent;
        try {
            fileContent = fs.readFileSync(file.fullPath, 'utf-8');
        } catch (err) {
            console.log(chalk.yellow(`⚠️  Could not read: ${file.relativePath}`));
            continue;
        }

        const lang = getLanguage(file.name);
        const lines = fileContent.split('\n').length;

        totalSize += Buffer.byteLength(fileContent, 'utf-8');
        totalLines += lines;
        filesByExt[file.ext || 'other'] = (filesByExt[file.ext || 'other'] || 0) + 1;

        content += `### ${file.relativePath}\n\n`;
        content += '```' + lang + '\n';
        content += fileContent;

        if (!fileContent.endsWith('\n')) {
            content += '\n';
        }

        content += '```\n\n';
    }

    if (config.last_comment) {
        content += config.last_comment;
    }

    contextStats = {
        files: files.length,
        totalSize,
        totalLines,
        filesByExt,
        estimatedTokens: estimateTokens(content)
    };

    return content;
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
    return generateContextFromConfig(config, srcPath);
}

async function generateContextFromConfigFile() {
    loadDependencies();
    
    const config = loadProjectConfig();
    if (!config) {
        console.log(chalk.yellow('\n⚠️  No config file found.'));
        return null;
    }

    return generateContextFromConfig(config, config.src);
}

function generateContextFromConfig(config, srcPath) {
    const spinner = ora(`Scanning ${srcPath}...`).start();

    if (!fs.existsSync(srcPath)) {
        spinner.fail(`Source path does not exist: ${srcPath}`);
        return null;
    }

    contextFiles = getFiles(srcPath, config);

    if (contextFiles.length === 0) {
        spinner.fail(`No files found in: ${srcPath}`);
        return null;
    }

    spinner.text = `Building context from ${contextFiles.length} files...`;
    generatedContext = buildContextContent(contextFiles, config, srcPath);

    spinner.succeed(`Context generated: ${chalk.yellow(contextFiles.length)} files, ${chalk.yellow(formatSize(contextStats.totalSize))}`);

    return {
        content: generatedContext,
        files: contextFiles,
        stats: contextStats,
        config
    };
}

// ============================================
// SAVE CONTEXT
// ============================================

async function saveContext(result) {
    loadDependencies();

    let outputPath;

    if (result.config.output) {
        outputPath = result.config.output;
    } else {
        const { savePath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'savePath',
                message: 'Enter output directory:',
                default: './mkctx'
            }
        ]);
        outputPath = savePath;
    }

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    const outputFile = path.join(outputPath, 'context.md');
    fs.writeFileSync(outputFile, result.content);

    console.log(chalk.green(`\n✅ Context saved to: ${chalk.yellow(outputFile)}`));
    console.log(chalk.gray(`   ${result.stats.files} files, ${formatSize(result.stats.totalSize)}\n`));

    return outputFile;
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

async function showPostGenerationMenu(result) {
    loadDependencies();

    console.log(chalk.cyan('\n📊 Context Summary:'));
    console.log(chalk.white(`   Files: ${result.stats.files}`));
    console.log(chalk.white(`   Lines: ${result.stats.totalLines.toLocaleString()}`));
    console.log(chalk.white(`   Size: ${formatSize(result.stats.totalSize)}`));
    console.log(chalk.white(`   Est. tokens: ~${result.stats.estimatedTokens.toLocaleString()}`));

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do with this context?',
            choices: [
                {
                    name: chalk.blue('💾 Save context to file'),
                    value: 'save'
                },
                new inquirer.Separator(),
                {
                    name: chalk.gray('🔙 Back to main menu'),
                    value: 'back'
                },
                {
                    name: chalk.red('❌ Exit'),
                    value: 'exit'
                }
            ]
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
                    let postAction = await showPostGenerationMenu(result);
                    
                    while (postAction !== 'back' && postAction !== 'exit') {
                        if (postAction === 'save') {
                            await saveContext(result);
                            postAction = await showPostGenerationMenu(result);
                        }
                    }
                    
                    if (postAction === 'exit') {
                        running = false;
                    }
                }
                break;
            }

            case 'dynamic': {
                const result = await generateContextDynamic();
                if (result) {
                    let postAction = await showPostGenerationMenu(result);
                    
                    while (postAction !== 'back' && postAction !== 'exit') {
                        if (postAction === 'save') {
                            await saveContext(result);
                            postAction = await showPostGenerationMenu(result);
                        }
                    }
                    
                    if (postAction === 'exit') {
                        running = false;
                    }
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

 ${chalk.yellow('Configuration (mkctx.config.json):')}
  src            Source directory to scan (default: ".")
  ignore         Comma-separated patterns to ignore
  output         Output directory (default: "./mkctx")
  first_comment  Comment at the beginning of context
  last_comment   Comment at the end of context

 ${chalk.gray('More info: https://github.com/pnkkzero/mkctx')}
`));
}

function showVersion() {
    try {
        const pkg = require('./package.json');
        console.log(`mkctx v${pkg.version}`);
    } catch {
        console.log('mkctx v3.0.0');
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