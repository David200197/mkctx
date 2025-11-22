const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function install() {
  const binaryName = process.platform === "win32" ? "mkctx.exe" : "mkctx";
  const sourceBinary = process.platform === "win32" ? "mkctx.exe" : "mkctx";
  const sourcePath = path.join(__dirname, sourceBinary);

  // Rename the binary if necessary (from mkctx to mkctx.exe on Windows)
  if (
    process.platform === "win32" &&
    fs.existsSync("mkctx") &&
    !fs.existsSync("mkctx.exe")
  ) {
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
    const npmGlobalBin = execSync("npm bin -g").toString().trim();
    const installPath = path.join(npmGlobalBin, binaryName);

    console.log(`📦 Installing mkctx at: ${installPath}`);

    // Copy the binary
    fs.copyFileSync(sourcePath, installPath);

    // Set execution permissions (Unix only)
    if (process.platform !== "win32") {
      fs.chmodSync(installPath, 0o755);
    }

    console.log("✅ mkctx installed successfully via npm");
    return;
  } catch (error) {
    console.log("⚠️  npm method failed, trying alternative method...");
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
        if (process.platform !== "win32") {
          fs.chmodSync(altInstallPath, 0o755);
        }

        console.log(`✅ mkctx installed at: ${altInstallPath}`);
        return;
      }
    } catch (e) {
      console.log(`   ❌ Installation failed at ${altPath}: ${e.message}`);
      // Continue to next path
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

function getAlternativePaths() {
  const paths = [];

  if (process.platform === "win32") {
    // Windows
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
    // Add common Windows PATH directories
    paths.push("C:\\Program Files\\nodejs");
    paths.push("C:\\Program Files (x86)\\nodejs");
  } else {
    // Unix/Linux/macOS
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

install();
