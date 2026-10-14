#!/usr/bin/env node

'use strict';

const fs   = require('fs');
const path = require('path');
const { promises: fsp } = fs;

// ============================================
// LAZY-LOADED DEPENDENCIES (ESM-only via dynamic import)
// ============================================
// chalk 5+, ora 6+, inquirer 9+ y archiver 8+ son ESM-only.
// Node.js permite consumirlas desde CJS con `await import()`.
// El proyecto sigue siendo CommonJS pero usa las versiones modernas.

let inquirer, chalk, ora, archiver;

async function loadCoreDeps() {
    if (chalk) return;
    const [chalkMod, oraMod] = await Promise.all([
        import('chalk'),
        import('ora'),
    ]);
    chalk = chalkMod.default;
    ora   = oraMod.default;
}

async function loadInquirer() {
    if (inquirer) return;
    const mod = await import('inquirer');
    inquirer = mod.default;
    if (!inquirer.Separator && mod.Separator) {
        inquirer.Separator = mod.Separator;
    }
}

async function loadArchiver() {
    if (archiver) return;
    const mod = await import('archiver');
    archiver = mod.default;
}

// ============================================
// CONSTANTS
// ============================================

const CONFIG_FILE = 'mkctx.config.json';

const DEFAULT_CONFIG = {
    src:           '.',
    ignore:        'mkctx.config.json, pnpm-lock.yaml, **/.titan/, mkctx/, node_modules/, .git/, dist/, build/, target/, .next/, out/, .cache, package-lock.json, *.log, temp/, tmp/, coverage/, .nyc_output, .env, .env.local, .env.development.local, .env.test.local, .env.production.local, npm-debug.log*, yarn-debug.log*, yarn-error.log*, .npm, .yarn-integrity, .parcel-cache, .vuepress/dist, .svelte-kit, **/*.rs.bk, .idea/, .vscode/, .DS_Store, Thumbs.db, *.swp, *.swo, .~lock.*, Cargo.lock, .cargo/registry/, .cargo/git/, .rustup/, *.pdb, *.dSYM/, *.so, *.dll, *.dylib, *.exe, *.lib, *.a, *.o, *.rlib, *.d, *.tmp, *.bak, *.orig, *.rej, *.pyc, *.pyo, *.class, *.jar, *.war, *.ear, *.zip, *.tar.gz, *.rar, *.7z, *.iso, *.img, *.dmg, *.pdf, *.doc, *.docx, *.xls, *.xlsx, *.ppt, *.pptx, *.rpyc, *.rpymc, *.rpa, *.rpi, saves/, game/cache/, game/saves/',
    extensions:    '',
    output:        './mkctx',
    first_comment: '/* Project Context */',
    last_comment:  '/* End of Context */',
};

const VALID_FORMATS = ['json', 'md', 'toon', 'xml', 'zip'];

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
    rpy: 'renpy',     rpym: 'renpy',
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
    '.rpy', '.rpym',
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

const EMPTY_SET = new Set();

// Set -> lookup O(1) en el hot path de recorrido
const SYSTEM_IGNORES = new Set([
    '.git', '.DS_Store', 'Thumbs.db', 'node_modules',
    '.svn', '.hg', '__pycache__', '.pytest_cache',
    '.mypy_cache', '.vscode', '.idea',
]);

// ============================================
// PERFORMANCE TUNING
// ============================================

const MAX_FILE_SIZE    = 10 * 1024 * 1024; // 10 MB: saltar archivos mayores
const READ_CONCURRENCY = 32;               // lecturas paralelas

// Flags que toman valor (no boolean)
const VALUE_FLAGS = new Set([
    'src', 'output', 'format', 'ignore', 'extensions', 'name', 'first-comment', 'last-comment',
    's', 'o', 'f', 'n',
]);

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

function resolveFlags(flags) {
    return {
        src:          flags.src    || flags.s,
        output:       flags.output || flags.o,
        format:       flags.format || flags.f,
        name:         flags.name   || flags.n,
        ignore:       flags.ignore,
        extensions:   flags.extensions,
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

async function loadConfig() {
    if (!configFileExists()) return null;
    try {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        return { ...DEFAULT_CONFIG, ...raw };
    } catch {
        await loadCoreDeps();
        console.log(chalk.yellow('⚠️  Error parsing config file, using defaults'));
        return { ...DEFAULT_CONFIG };
    }
}

async function buildConfig(cliFlags = {}) {
    const base = configFileExists() ? await loadConfig() : { ...DEFAULT_CONFIG };
    if (cliFlags.src)          base.src           = cliFlags.src;
    if (cliFlags.output)       base.output        = cliFlags.output;
    if (cliFlags.ignore)       base.ignore        = cliFlags.ignore;
    if (cliFlags.extensions)   base.extensions    = cliFlags.extensions;
    if (cliFlags.firstComment) base.first_comment = cliFlags.firstComment;
    if (cliFlags.lastComment)  base.last_comment  = cliFlags.lastComment;
    return base;
}

async function createConfigFile() {
    await loadCoreDeps();
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

// Conteo de líneas sin split() - solo indexOf sobre el string
function countLines(str) {
    if (str.length === 0) return 1;
    let count = 1;
    let idx = str.indexOf('\n');
    while (idx !== -1) {
        count++;
        idx = str.indexOf('\n', idx + 1);
    }
    return count;
}

// ============================================
// FILE FILTERING
// ============================================

function parseExtraExtensions(extensionsString) {
    if (!extensionsString) return EMPTY_SET;
    return new Set(
        extensionsString
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean)
            .map(e => (e.startsWith('.') ? e : `.${e}`))
    );
}

function isTextFile(filename, extraExtensions = EMPTY_SET) {
    const basename = path.basename(filename).toLowerCase();
    if (KNOWN_FILES.has(basename)) return true;
    const dot = filename.lastIndexOf('.');
    if (dot <= 0) return false;
    const ext = filename.slice(dot).toLowerCase();
    return TEXT_EXTENSIONS.has(ext) || extraExtensions.has(ext);
}

function getLanguage(filename) {
    const dot      = filename.lastIndexOf('.');
    const ext      = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
    const basename = filename.toLowerCase();
    if (basename === 'dockerfile')   return 'dockerfile';
    if (basename === 'makefile')     return 'makefile';
    if (basename.startsWith('.env')) return 'bash';
    return LANG_MAP[ext] || ext || 'text';
}

function parseIgnorePatterns(ignoreString) {
    if (!ignoreString) return [];
    return ignoreString.split(',').map(p => p.trim()).filter(Boolean);
}

// Escapa todos los caracteres especiales de regex, incluido '*'
// (se restaura después como wildcard)
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compila TODOS los patrones de ignore una sola vez.
// Retorna una función shouldIgnore(name, relativePath) de coste mínimo.
function compileIgnoreMatcher(ignoreString) {
    const patterns = parseIgnorePatterns(ignoreString);
    const exactNames   = new Set();
    const dirNames     = new Set();
    const wildcardSrcs = [];

    for (let i = 0; i < patterns.length; i++) {
        const p = patterns[i];

        if (p.indexOf('*') !== -1) {
            // Comodines: se combinan en un único regex con alternancia
            const src = escapeRegex(p)
                .replace(/\\\*\\\*/g, '.*')     // ** -> .*
                .replace(/\\\*/g,   '[^/]*');   // *  -> [^/]*
            wildcardSrcs.push(src);
        } else if (p.endsWith('/')) {
            dirNames.add(p.slice(0, -1));
        } else {
            exactNames.add(p);
        }
    }

    let wildcardRegex = null;
    if (wildcardSrcs.length > 0) {
        wildcardRegex = new RegExp('^(?:' + wildcardSrcs.join('|') + ')$', 'i');
    }

    return function shouldIgnore(name, relativePath) {
        // Set lookups O(1) primero (la mayoría de patrones caen aquí)
        if (SYSTEM_IGNORES.has(name)) return true;
        if (exactNames.has(name) || exactNames.has(relativePath)) return true;
        if (dirNames.has(name)) return true;

        // Un único test de regex contra la alternancia combinada
        if (wildcardRegex !== null) {
            if (wildcardRegex.test(name)) return true;
            if (wildcardRegex.test(relativePath)) return true;
        }
        return false;
    };
}

// ============================================
// FILE SCANNING
// ============================================

// Fase 1: recorrido síncrono (rápido), solo metadatos, sin leer contenido.
function collectFileInfos(srcPath, shouldIgnore, extraExts) {
    const out = [];

    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch { return; }

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const name  = entry.name;
            const fullPath = path.join(dir, name);
            const unixRel  = toUnixPath(path.relative(srcPath, fullPath));

            if (shouldIgnore(name, unixRel)) continue;

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }
            if (!entry.isFile()) continue;
            if (!isTextFile(name, extraExts)) continue;

            let stat;
            try { stat = fs.statSync(fullPath); }
            catch { continue; }
            if (stat.size > MAX_FILE_SIZE) continue;

            out.push({
                fullPath,
                relativePath: unixRel,
                name,
                extension: name.lastIndexOf('.') > 0
                    ? name.slice(name.lastIndexOf('.') + 1).toLowerCase()
                    : null,
                language: getLanguage(name),
                size: stat.size,
            });
        }
    }

    walk(srcPath);
    return out;
}

// Fase 2: lectura en paralelo con concurrencia limitada.
async function readFilesConcurrently(fileInfos) {
    const total = fileInfos.length;
    if (total === 0) return [];

    const results = new Array(total);
    let cursor = 0;

    const worker = async () => {
        while (true) {
            const i = cursor++;
            if (i >= total) return;
            const info = fileInfos[i];
            try {
                const content = await fsp.readFile(info.fullPath, 'utf-8');
                results[i] = {
                    path:      info.relativePath,
                    name:      info.name,
                    extension: info.extension,
                    language:  info.language,
                    lines:     countLines(content),
                    size:      info.size,
                    content,
                };
            } catch {
                results[i] = null;
            }
        }
    };

    const workers = [];
    const n = Math.min(READ_CONCURRENCY, total);
    for (let i = 0; i < n; i++) workers.push(worker());
    await Promise.all(workers);

    const files = [];
    for (let i = 0; i < total; i++) {
        if (results[i] !== null) files.push(results[i]);
    }
    return files;
}

async function scanFiles(srcPath, config) {
    const shouldIgnore = compileIgnoreMatcher(config.ignore);
    const extraExts    = parseExtraExtensions(config.extensions);

    const fileInfos = collectFileInfos(srcPath, shouldIgnore, extraExts);
    const files     = await readFilesConcurrently(fileInfos);

    // sort rápido, sin localeCompare
    files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

    const stats = { files: files.length, totalSize: 0, totalLines: 0, filesByExt: {} };
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        stats.totalSize  += f.size;
        stats.totalLines += f.lines;
        const key = f.extension || 'other';
        stats.filesByExt[key] = (stats.filesByExt[key] || 0) + 1;
    }

    return { files, stats };
}

// ============================================
// OUTPUT FORMATTERS
// ============================================

function toJson(files) {
    return JSON.stringify(files, null, 2);
}

function toMarkdown(files, config) {
    const dirSet = new Set();
    for (let i = 0; i < files.length; i++) {
        const p = files[i].path;
        const slash = p.lastIndexOf('/');
        if (slash > 0) dirSet.add(p.slice(0, slash));
    }
    const dirs = [...dirSet].sort();
    const structure = dirs.map(d => `📁 ${d}/`).join('\n');

    const parts = [];
    parts.push(config.first_comment, '', '## Project Structure', '', '```', structure, '',
               `${files.length} files total`, '```', '', '## Source Files', '');

    for (let i = 0; i < files.length; i++) {
        if (i > 0) parts.push('\n---\n');
        const f = files[i];
        const body = f.content.endsWith('\n') ? f.content : f.content + '\n';
        parts.push(`### ${f.path}\n<!-- ${f.lines} lines -->\n\n\`\`\`${f.language}\n${body}\`\`\`\n`);
    }
    parts.push(config.last_comment);
    return parts.join('\n');
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
    const str = String(value);
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
        `    <n>${escapeXml(f.name)}</n>`,
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

async function generateContext(config) {
    await loadCoreDeps();
    const spinner = ora(`Scanning ${config.src}...`).start();

    if (!fs.existsSync(config.src)) {
        spinner.fail(`Source path does not exist: ${config.src}`);
        return null;
    }

    const { files, stats } = await scanFiles(config.src, config);

    if (files.length === 0) {
        spinner.fail(`No files found in: ${config.src}`);
        return null;
    }

    spinner.succeed(`Context built: ${chalk.yellow(files.length)} files, ${chalk.yellow(formatSize(stats.totalSize))}`);
    return { files, stats, config };
}

async function printSummary(stats) {
    await loadCoreDeps();
    console.log(chalk.cyan('\n📊 Context Summary:'));
    console.log(chalk.white(`   Files: ${stats.files}`));
    console.log(chalk.white(`   Lines: ${stats.totalLines.toLocaleString()}`));
    console.log(chalk.white(`   Size:  ${formatSize(stats.totalSize)}`));
}

// ============================================
// SAVE AS ZIP
// ============================================

async function saveAsZip(result, fileName) {
    await loadArchiver();
    await loadCoreDeps();

    const outputDir = result.config.output || './mkctx';
    fs.mkdirSync(outputDir, { recursive: true });

    const zipPath = path.join(outputDir, `${fileName}.zip`);
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            const size = archive.pointer();
            console.log(chalk.green('\n✅ ZIP saved:\n'));
            console.log(chalk.white(`   ${chalk.cyan('ZIP ')} → ${chalk.yellow(zipPath)}`));
            console.log(chalk.gray(`         ${formatSize(size)} | ${result.files.length} files\n`));
            resolve({ format: 'zip', file: zipPath, size, tokens: 0 });
        });

        archive.on('warning', err => {
            if (err.code !== 'ENOENT') reject(err);
        });

        archive.on('error', reject);

        archive.pipe(output);

        for (const file of result.files) {
            archive.append(file.content, { name: file.path });
        }

        archive.finalize();
    });
}

// ============================================
// SAVE CONTEXT
// ============================================

async function saveContext(result, formats, fileName) {
    await loadCoreDeps();

    if (!fileName) {
        await loadInquirer();
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

    const zipRequested   = formats.includes('zip');
    const regularFormats = formats.filter(f => f !== 'zip');

    for (const format of regularFormats) {
        const { content, ext } = renderFormat(format, result.files, result.stats, result.config);
        const outputPath = path.join(outputDir, `${fileName}.${ext}`);
        await fsp.writeFile(outputPath, content);
        savedFiles.push({
            format,
            file:   outputPath,
            size:   Buffer.byteLength(content, 'utf-8'),
            tokens: estimateTokens(content),
        });
    }

    if (savedFiles.length > 0) {
        console.log(chalk.green('\n✅ Context saved:\n'));
        for (const { format, file, size, tokens } of savedFiles) {
            console.log(chalk.white(`   ${chalk.cyan(format.toUpperCase().padEnd(4))} → ${chalk.yellow(file)}`));
            console.log(chalk.gray(`         ${formatSize(size)} | ~${tokens.toLocaleString()} tokens\n`));
        }
    }

    if (zipRequested) {
        const zipEntry = await saveAsZip(result, fileName);
        savedFiles.push(zipEntry);
    }

    return savedFiles;
}

// ============================================
// INTERACTIVE PROMPTS
// ============================================

async function promptSrcPath() {
    await loadInquirer();
    const { srcPath } = await inquirer.prompt([{
        type: 'input', name: 'srcPath',
        message: 'Enter the source path to analyze:',
        default: '.',
        validate: input => fs.existsSync(input) || `Path does not exist: ${input}`,
    }]);
    return srcPath;
}

async function promptFormat() {
    await loadInquirer();
    await loadCoreDeps();
    const { format } = await inquirer.prompt([{
        type: 'list', name: 'format',
        message: 'Select output format:',
        default: 'all',
        choices: [
            { name: chalk.magenta('📦 All formats (MD, JSON, TOON, XML, ZIP)'), value: 'all'  },
            new inquirer.Separator(),
            { name: chalk.blue('📝 Markdown (.md)'),                            value: 'md'   },
            { name: chalk.green('🔧 JSON (.json) - Simple array'),               value: 'json' },
            { name: chalk.yellow('🎒 TOON (.toon) - Token-optimized'),           value: 'toon' },
            { name: chalk.red('📄 XML (.xml)'),                                  value: 'xml'  },
            { name: chalk.cyan('🗜️  ZIP (.zip) - Original files bundled'),       value: 'zip'  },
        ],
    }]);
    return resolveFormats(format);
}

async function promptMainMenu() {
    await loadInquirer();
    await loadCoreDeps();

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
    await loadCoreDeps();

    const cli      = resolveFlags(rawFlags);
    const config   = await buildConfig(cli);
    const formats  = resolveFormats(cli.format);
    const fileName = cli.name || 'context';

    if (!fs.existsSync(config.src)) {
        console.error(`❌ Source path does not exist: ${config.src}`);
        process.exit(1);
    }

    const result = await generateContext(config);
    if (!result) process.exit(1);

    await printSummary(result.stats);
    await saveContext(result, formats, fileName);
    console.log(chalk.yellow('👋 Done!\n'));
}

async function runInteractive() {
    await loadCoreDeps();
    await loadInquirer();

    let running = true;

    while (running) {
        const action = await promptMainMenu();

        switch (action) {
            case 'from-config': {
                const config = await loadConfig();
                if (!config) { console.log(chalk.yellow('\n⚠️  No config file found.')); break; }
                const result = await generateContext(config);
                if (!result) break;
                await printSummary(result.stats);
                const formats = await promptFormat();
                await saveContext(result, formats);
                console.log(chalk.yellow('👋 Done!\n'));
                running = false;
                break;
            }

            case 'dynamic': {
                const srcPath = await promptSrcPath();
                const config  = { ...DEFAULT_CONFIG, src: srcPath };
                const result  = await generateContext(config);
                if (!result) break;
                await printSummary(result.stats);
                const formats = await promptFormat();
                await saveContext(result, formats);
                console.log(chalk.yellow('👋 Done!\n'));
                running = false;
                break;
            }

            case 'config':
                if (configFileExists()) {
                    console.log(chalk.cyan('\n📄 Current configuration:\n'));
                    console.log(JSON.stringify(await loadConfig(), null, 2));
                    console.log(chalk.gray(`\n   Edit ${CONFIG_FILE} to modify settings.\n`));
                } else {
                    await createConfigFile();
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

async function showHelp() {
    await loadCoreDeps();
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
  --format   <fmt>              md, json, toon, xml, zip, all, or comma-separated
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
  mkctx --src ./app --format zip --name snapshot
  mkctx -s ./src -f toon -n snapshot

 ${chalk.yellow('Output Formats:')}
  ${chalk.green('JSON')}    Simple array of file objects
  ${chalk.blue('MD')}      Markdown with code blocks
  ${chalk.yellow('TOON')}    Token-Oriented Object Notation (LLM optimized)
  ${chalk.red('XML')}     XML with CDATA sections
  ${chalk.cyan('ZIP')}     Original files bundled, preserving directory structure

 ${chalk.gray('More info: https://github.com/pnkkzero/mkctx')}
`));
}

// FIX: resuelve el package.json con ruta absoluta (__dirname) en vez de require('./package.json')
function showVersion() {
    try {
        const pkgPath = path.join(__dirname, '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        console.log(`mkctx v${pkg.version}`);
    } catch (err) {
        if (process.env.DEBUG) console.error(err);
        console.log('mkctx v6.0.3');
    }
}

// ============================================
// ENTRY POINT
// ============================================

async function main() {
    const { command, flags } = parseArgs(process.argv);

    if (flags.help || flags.h || command === 'help')       { await showHelp();          return; }
    if (flags.version || flags.v || command === 'version') { showVersion();            return; }
    if (command === 'config')                              { await createConfigFile(); return; }

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