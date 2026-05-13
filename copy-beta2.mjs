import fs from "fs";
import path from "path";

const source = path.resolve("dist/beta2");
const target = path.resolve("beta2");

if (!fs.existsSync(source)) {
  console.error("Missing build output:", source);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

fs.cpSync(source, target, { recursive: true });

console.log("Copied built beta2 app to /beta2");
