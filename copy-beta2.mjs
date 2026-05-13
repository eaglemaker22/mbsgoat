import fs from "fs";
import path from "path";

const sourceHtmlFolder = path.resolve("dist/beta2");
const sourceAssetsFolder = path.resolve("dist/assets");

const targetBeta2Folder = path.resolve("beta2");
const targetAssetsFolder = path.resolve("beta2/assets");

if (!fs.existsSync(sourceHtmlFolder)) {
  console.error("Missing build output:", sourceHtmlFolder);
  process.exit(1);
}

fs.rmSync(targetBeta2Folder, { recursive: true, force: true });
fs.mkdirSync(targetBeta2Folder, { recursive: true });

// Copy built beta2/index.html into repo beta2/
fs.cpSync(sourceHtmlFolder, targetBeta2Folder, { recursive: true });

// Copy Vite-built CSS/JS assets into beta2/assets/
if (fs.existsSync(sourceAssetsFolder)) {
  fs.mkdirSync(targetAssetsFolder, { recursive: true });
  fs.cpSync(sourceAssetsFolder, targetAssetsFolder, { recursive: true });
} else {
  console.warn("No dist/assets folder found.");
}

console.log("Copied built beta2 app to /beta2");
console.log("Copied built assets to /beta2/assets");
