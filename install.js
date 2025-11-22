const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function install() {
  const platform = process.platform;
  const arch = process.arch;
  const isWindows = platform === "win32";

  const binaryName = isWindows ? "mkctx.exe" : "mkctx";

  // Determinar la ruta del binario precompilado
  let binaryPath;

  if (platform === "win32") {
    binaryPath = path.join(__dirname, "bin", "win32", arch, "mkctx.exe");
  } else if (platform === "darwin") {
    binaryPath = path.join(__dirname, "bin", "darwin", arch, "mkctx");
  } else if (platform === "linux") {
    binaryPath = path.join(__dirname, "bin", "linux", arch, "mkctx");
  } else {
    console.log("❌ Unsupported platform:", platform);
    return;
  }

  // Verificar que el binario precompilado existe
  if (!fs.existsSync(binaryPath)) {
    console.log(
      "❌ Precompiled binary not found for your platform:",
      binaryPath
    );
    console.log("📋 Available platforms: win32, darwin, linux");
    console.log("📋 Available architectures: x64, arm64");
    return;
  }

  try {
    // Método 1: Usar npm para obtener el directorio global de bins
    let npmGlobalBin;
    try {
      npmGlobalBin = execSync("npm bin -g").toString().trim();
    } catch (error) {
      // Alternative method to get global bin directory
      npmGlobalBin = execSync("npm root -g").toString().trim();
      npmGlobalBin = path.join(npmGlobalBin, ".bin");
    }

    const installPath = path.join(npmGlobalBin, binaryName);

    console.log(`📦 Installing mkctx at: ${installPath}`);

    // Ensure the directory exists
    if (!fs.existsSync(npmGlobalBin)) {
      fs.mkdirSync(npmGlobalBin, { recursive: true });
    }

    // Copy the precompiled binary
    fs.copyFileSync(binaryPath, installPath);

    // Set execution permissions (Unix only)
    if (!isWindows) {
      fs.chmodSync(installPath, 0o755);
    }

    console.log("✅ mkctx installed successfully");

    // Create a .cmd wrapper for Windows
    if (isWindows) {
      createWindowsWrapper(npmGlobalBin, installPath);
    }

    return;
  } catch (error) {
    console.log(
      "⚠️  npm method failed, trying alternative method...",
      error.message
    );
  }

  // Alternative method: Search common PATH directories
  const alternativePaths = getAlternativePaths();

  for (const altPath of alternativePaths) {
    try {
      if (fs.existsSync(altPath)) {
        const altInstallPath = path.join(altPath, binaryName);
        console.log(`🔄 Trying to install at: ${altInstallPath}`);

        fs.copyFileSync(binaryPath, altInstallPath);

        // Set execution permissions (Unix only)
        if (!isWindows) {
          fs.chmodSync(altInstallPath, 0o755);
        }

        // Create Windows wrapper if needed
        if (isWindows) {
          createWindowsWrapper(altPath, altInstallPath);
        }

        console.log(`✅ mkctx installed at: ${altInstallPath}`);
        return;
      }
    } catch (e) {
      console.log(`   ❌ Installation failed at ${altPath}: ${e.message}`);
    }
  }

  console.log("❌ Could not install automatically");
  console.log("📋 Manual installation required:");
  console.log(`   1. Copy the file '${binaryPath}' to a folder in your PATH`);
}

function createWindowsWrapper(installDir, binaryPath) {
  const wrapperPath = path.join(installDir, "mkctx.cmd");
  const wrapperContent = `@echo off
"${binaryPath}" %*
`;
  fs.writeFileSync(wrapperPath, wrapperContent);
  console.log(`✅ Created Windows wrapper: ${wrapperPath}`);
}

function getAlternativePaths() {
  const paths = [];
  const isWindows = process.platform === "win32";

  if (isWindows) {
    if (process.env.APPDATA) {
      paths.push(path.join(process.env.APPDATA, "npm"));
    }
    if (process.env.LOCALAPPDATA) {
      paths.push(
        path.join(process.env.LOCALAPPDATA, "Microsoft", "WindowsApps")
      );
    }
    if (process.env.ProgramFiles) {
      paths.push(path.join(process.env.ProgramFiles, "nodejs"));
    }
    paths.push("C:\\Program Files\\nodejs");
    paths.push("C:\\Program Files (x86)\\nodejs");

    if (process.env.USERPROFILE) {
      paths.push(
        path.join(process.env.USERPROFILE, "AppData", "Roaming", "npm")
      );
    }
  } else {
    paths.push("/usr/local/bin");
    paths.push("/usr/bin");
    paths.push("/opt/local/bin");

    if (process.env.HOME) {
      paths.push(path.join(process.env.HOME, "bin"));
      paths.push(path.join(process.env.HOME, ".local", "bin"));
    }

    if (process.platform === "darwin") {
      paths.push("/opt/homebrew/bin");
      paths.push("/usr/local/opt/bin");
    }
  }

  return paths.filter((p) => p !== null && p !== undefined);
}

install();
