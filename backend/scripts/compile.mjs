// Compile LEVIUM contracts with solc-js, resolving OpenZeppelin from node_modules.
// Usage: node backend/scripts/compile.mjs  -> writes contracts/out/*.json (abi + bytecode)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import solc from "solc";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractsDir = path.join(root, "contracts");
const outDir = path.join(contractsDir, "out");

function findImports(importPath) {
  try {
    const resolved = importPath.startsWith("@")
      ? path.join(root, "node_modules", importPath)
      : path.join(contractsDir, importPath);
    return { contents: fs.readFileSync(resolved, "utf8") };
  } catch (e) {
    return { error: "unresolved: " + importPath };
  }
}

const sources = {};
for (const f of fs.readdirSync(contractsDir)) {
  if (f.endsWith(".sol")) sources[f] = { content: fs.readFileSync(path.join(contractsDir, f), "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } }, optimizer: { enabled: true, runs: 200 } },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors || []).filter((e) => e.severity === "error");
for (const e of output.errors || []) console.log(`[${e.severity}] ${e.formattedMessage.split("\n").slice(0, 3).join(" ")}`);
if (errors.length > 0) {
  console.log(`COMPILE_FAILED:${errors.length}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    if (name.startsWith("Levium")) {
      fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }));
      console.log(`WROTE:${name}.json (${c.evm.bytecode.object.length / 2} bytes)`);
    }
  }
}
console.log("COMPILE_OK");
