#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_FILE = 'mkctx.config.json';

const defaultConfig = {
  src: './src',
  ignore: '*.log, temp/, node_modules/, .git/, dist/, build/',
  output: './mkctx',
  first_comment: '/* Project Context */',
  last_comment: '/* End of Context */',
  dynamic: false
};

// Mapeo de extensiones a lenguajes para mejor resaltado de sintaxis
const langMap = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  sql: 'sql',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  vue: 'vue',
  svelte: 'svelte',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  env: 'bash'
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'config':
      createConfig();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      showVersion();
      break;
    default:
      await generateContext();
  }
}

function showHelp() {
  console.log(`
📄 mkctx - Make Context

Generate markdown context files from your project code for AI assistants.

Usage:
  mkctx              Generate context (interactive if dynamic mode enabled)
  mkctx config       Create configuration file
  mkctx help         Show this help message
  mkctx version      Show version

Configuration (mkctx.config.json):
  src            Source directory to scan (default: "./src")
  ignore         Comma-separated patterns to ignore
  output         Output directory (default: "./mkctx")
  first_comment  Comment at the beginning of context
  last_comment   Comment at the end of context
  dynamic        If true, prompts for path on each run

Examples:
  mkctx                    # Generate context
  mkctx config             # Create config file
  
More info: https://github.com/yourusername/mkctx
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`mkctx v${pkg.version}`);
}

function createConfig() {
  // Crear directorio mkctx
  if (!fs.existsSync('mkctx')) {
    fs.mkdirSync('mkctx', { recursive: true });
  }

  // Escribir configuración
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));

  // Actualizar .gitignore
  updateGitignore();

  console.log('✅ Configuration created:');
  console.log('   - mkctx.config.json');
  console.log('   - mkctx/ folder');
  console.log('   - Entry in .gitignore');
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

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return { ...defaultConfig, ...config };
    } catch (err) {
      console.log('⚠️  Error parsing config file, using defaults');
      return { ...defaultConfig, dynamic: true };
    }
  }
  // Sin config, activar dynamic por defecto
  return { ...defaultConfig, dynamic: true };
}

async function askForPath(defaultPath) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🔍 Dynamic mode enabled');
    console.log(`   Current directory: ${process.cwd()}`);

    rl.question(`   Enter path (or press Enter for '${defaultPath}'): `, (answer) => {
      rl.close();
      const input = answer.trim();

      if (!input) {
        resolve(defaultPath);
        return;
      }

      if (!fs.existsSync(input)) {
        console.log(`⚠️  Path '${input}' does not exist. Using default: ${defaultPath}`);
        resolve(defaultPath);
        return;
      }

      resolve(input);
    });
  });
}

async function generateContext() {
  const config = loadConfig();

  let srcPath = config.src || '.';

  // Determinar si usar modo dinámico
  if (config.dynamic) {
    srcPath = await askForPath(srcPath);
  } else if (config.src === '.' || config.src === '') {
    srcPath = await askForPath('.');
  }

  // Verificar que la ruta existe
  if (!fs.existsSync(srcPath)) {
    console.log(`❌ Source path does not exist: ${srcPath}`);
    process.exit(1);
  }

  const files = getFiles(srcPath, config);

  if (files.length === 0) {
    console.log(`⚠️  No files found in: ${srcPath}`);
    return;
  }

  const content = buildContent(files, config);

  const outputPath = config.output || '.';
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const outputFile = path.join(outputPath, 'context.md');
  fs.writeFileSync(outputFile, content);

  console.log(`✅ Context generated at: ${outputFile}`);
  console.log(`   📁 Source: ${srcPath}`);
  console.log(`   📄 Files included: ${files.length}`);
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
      // Sin permisos para leer el directorio
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
      } else if (entry.isFile()) {
        // Verificar que es un archivo de texto (no binario)
        if (isTextFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(srcPath);
  return files.sort(); // Ordenar alfabéticamente
}

function parseIgnorePatterns(ignoreString) {
  if (!ignoreString) return [];
  return ignoreString
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
}

function shouldIgnore(fullPath, name, relativePath, patterns) {
  // Ignorar archivos y carpetas del sistema
  const systemIgnores = [
    '.git',
    '.DS_Store',
    'Thumbs.db',
    'node_modules',
    '.svn',
    '.hg',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.vscode',
    '.idea',
    '*.pyc',
    '*.pyo',
    '.env.local',
    '.env.*.local'
  ];

  for (const ignore of systemIgnores) {
    if (ignore.includes('*')) {
      if (matchWildcard(ignore, name)) return true;
    } else {
      if (fullPath.includes(ignore) || name === ignore) return true;
    }
  }

  // Aplicar patrones de configuración
  for (const pattern of patterns) {
    // Wildcard (*.log, *.test.js)
    if (pattern.includes('*')) {
      if (matchWildcard(pattern, name)) return true;
    }

    // Directorio (temp/, dist/)
    if (pattern.endsWith('/')) {
      const dir = pattern.slice(0, -1);
      if (fullPath.includes(path.sep + dir + path.sep) || 
          fullPath.includes(dir + path.sep) ||
          name === dir) {
        return true;
      }
    }

    // Coincidencia exacta o parcial
    if (relativePath.includes(pattern) || name === pattern) {
      return true;
    }
  }

  return false;
}

function matchWildcard(pattern, filename) {
  // Convertir patrón glob simple a regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(filename);
}

function isTextFile(filename) {
  // Extensiones de archivos de texto conocidos
  const textExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw',
    '.rb', '.rake',
    '.go',
    '.rs',
    '.java', '.kt', '.kts', '.scala',
    '.cs', '.fs', '.vb',
    '.cpp', '.c', '.h', '.hpp', '.cc', '.cxx',
    '.php', '.phtml',
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.sql',
    '.html', '.htm', '.xhtml',
    '.css', '.scss', '.sass', '.less', '.styl',
    '.json', '.json5',
    '.xml', '.xsl', '.xslt',
    '.yaml', '.yml',
    '.md', '.markdown', '.mdx',
    '.txt', '.text',
    '.vue', '.svelte',
    '.dockerfile', '.makefile',
    '.toml', '.ini', '.cfg', '.conf',
    '.env', '.env.example',
    '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc',
    '.graphql', '.gql',
    '.proto',
    '.tf', '.tfvars',
    '.lua',
    '.r', '.R',
    '.swift',
    '.m', '.mm',
    '.ex', '.exs',
    '.erl', '.hrl',
    '.clj', '.cljs', '.cljc',
    '.hs', '.lhs',
    '.elm',
    '.pug', '.jade',
    '.ejs', '.hbs', '.handlebars',
    '.twig', '.blade.php',
    '.astro',
    '.prisma',
    '.sol'
  ];

  const ext = path.extname(filename).toLowerCase();
  const basename = path.basename(filename).toLowerCase();

  // Archivos sin extensión pero conocidos
  const knownFiles = [
    'dockerfile', 'makefile', 'gemfile', 'rakefile',
    'procfile', 'vagrantfile', 'jenkinsfile',
    '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc',
    '.env', '.env.example', '.env.local'
  ];

  if (knownFiles.includes(basename)) return true;
  if (ext && textExtensions.includes(ext)) return true;

  return false;
}

function getLanguage(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  const basename = path.basename(filename).toLowerCase();

  // Archivos especiales
  if (basename === 'dockerfile') return 'dockerfile';
  if (basename === 'makefile') return 'makefile';
  if (basename.startsWith('.env')) return 'bash';

  return langMap[ext] || ext || 'text';
}

function buildContent(files, config) {
  let content = '';

  if (config.first_comment) {
    content += config.first_comment + '\n\n';
  }

  for (const file of files) {
    let fileContent;
    try {
      fileContent = fs.readFileSync(file, 'utf-8');
    } catch (err) {
      console.log(`⚠️  Could not read: ${file}`);
      continue;
    }

    const lang = getLanguage(file);
    const relativePath = file; // Mantener ruta relativa

    content += '```' + lang + '\n';
    content += '// ' + relativePath + '\n';
    content += fileContent;
    
    // Asegurar que termina con newline
    if (!fileContent.endsWith('\n')) {
      content += '\n';
    }
    
    content += '```\n\n';
  }

  if (config.last_comment) {
    content += config.last_comment;
  }

  return content;
}

// Ejecutar
main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
