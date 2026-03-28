#!/usr/bin/env node

// Banksi MCP Server — launches via tsx from the monorepo root
// This is a thin wrapper for npx banksi-mcp usage

const { execSync } = require('child_process');
const path = require('path');

// Find the banksi project root (where src/mcp/server.ts lives)
const possiblePaths = [
  path.join(__dirname, '..', '..', '..'), // when inside packages/mcp/bin
  process.env.BANKSI_PROJECT_ROOT,
  process.cwd(),
];

let projectRoot = null;
const fs = require('fs');

for (const p of possiblePaths) {
  if (p && fs.existsSync(path.join(p, 'src', 'mcp', 'server.ts'))) {
    projectRoot = p;
    break;
  }
}

if (!projectRoot) {
  console.error('Error: Cannot find Banksi project root (src/mcp/server.ts).');
  console.error('Run this from the Banksi project directory, or set BANKSI_PROJECT_ROOT.');
  process.exit(1);
}

try {
  execSync('npx tsx src/mcp/server.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (e) {
  process.exit(e.status || 1);
}
