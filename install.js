const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function install() {
  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "mkctx.exe" : "mkctx";
  const sourceBinary = isWindows ? "mkctx.exe" : "mkctx";
  const sourcePath = path.join(__dirname, sourceBinary);

  // Rename the binary if necessary (from mkctx to mkctx.exe on Windows)
  if (isWindows && fs.existsSync("mkctx") && !fs.existsSync("mkctx.exe")) {
    fs.renameSync("mkctx", "mkctx.exe");
    console.log("✅ Binary renamed for Windows: mkctx -> mkctx.exe");
  }

  // Check if the binary exists
  if (!fs.existsSync(sourcePath)) {
    console.log("❌ Compiled binary not found at:", sourcePath);
    console.log("📋 Files in directory:");
    try {
      const files = fs.readdirSync(__dirname);
      files.forEach((file) => console.log("   -", file));
    } catch (e) {
      console.log("   Could not read directory");
    }
    return;
  }

  try {
    // Method 1: Use npm to get the global bin directory
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

    // Copy the binary
    fs.copyFileSync(sourcePath, installPath);

    // Set execution permissions (Unix only)
    if (!isWindows) {
      fs.chmodSync(installPath, 0o755);
    }

    console.log("✅ mkctx installed successfully via npm");

    // Create a .cmd wrapper for Windows
    if (isWindows) {
      createWindowsWrapper(npmGlobalBin);
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

        fs.copyFileSync(sourcePath, altInstallPath);

        // Set execution permissions (Unix only)
        if (!isWindows) {
          fs.chmodSync(altInstallPath, 0o755);
        }

        // Create Windows wrapper if needed
        if (isWindows) {
          createWindowsWrapper(altPath);
        }

        console.log(`✅ mkctx installed at: ${altInstallPath}`);
        return;
      }
    } catch (e) {
      console.log(`   ❌ Installation failed at ${altPath}: ${e.message}`);
    }
  }

  // If we get here, all methods failed
  console.log("❌ Could not install automatically");
  console.log("📋 Manual installation required:");
  console.log(`   1. Copy the file '${sourcePath}' to a folder in your PATH`);
  console.log(`   2. Make sure the file has execution permissions`);

  // Show current PATH to help the user
  console.log("\n📁 Your PATH includes these folders:");
  const pathDirs = process.env.PATH
    ? process.env.PATH.split(path.delimiter)
    : [];
  pathDirs.forEach((dir) => console.log("   -", dir));
}

function createWindowsWrapper(installDir) {
  const wrapperPath = path.join(installDir, "mkctx.cmd");
  const wrapperContent = `@echo off
"${path.join(installDir, "mkctx.exe")}" %*
`;
  fs.writeFileSync(wrapperPath, wrapperContent);
  console.log(`✅ Created Windows wrapper: ${wrapperPath}`);
}

function getAlternativePaths() {
  const paths = [];
  const isWindows = process.platform === "win32";

  if (isWindows) {
    // Windows paths
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
    // Common Node.js installation paths
    paths.push("C:\\Program Files\\nodejs");
    paths.push("C:\\Program Files (x86)\\nodejs");

    // User's local bin
    if (process.env.USERPROFILE) {
      paths.push(
        path.join(process.env.USERPROFILE, "AppData", "Roaming", "npm")
      );
    }
  } else {
    // Unix/Linux/macOS paths
    paths.push("/usr/local/bin");
    paths.push("/usr/bin");
    paths.push("/opt/local/bin");

    // User bin directory
    if (process.env.HOME) {
      paths.push(path.join(process.env.HOME, "bin"));
      paths.push(path.join(process.env.HOME, ".local", "bin"));
    }

    // Common directories on macOS
    if (process.platform === "darwin") {
      paths.push("/opt/homebrew/bin");
      paths.push("/usr/local/opt/bin");
    }
  }

  return paths.filter((p) => p !== null && p !== undefined);
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.log("❌ Installation failed:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("❌ Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

install();
