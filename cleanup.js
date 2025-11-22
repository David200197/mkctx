const fs = require("fs");
const path = require("path");

function cleanup() {
  const filesToRemove = ["mkctx", "mkctx.exe"];
  let removedCount = 0;

  filesToRemove.forEach((file) => {
    const filePath = path.join(__dirname, file);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Cleaning up: ${file}`);
        removedCount++;
      }
    } catch (error) {
      console.log(`⚠️  Could not delete ${file}: ${error.message}`);
    }
  });

  if (removedCount > 0) {
    console.log(`✅ Cleaned up ${removedCount} temporary files`);
  } else {
    console.log(`ℹ️  No temporary files found to clean up`);
  }
}

cleanup();
