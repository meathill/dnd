import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrapLocalAgentWorkspace } from '../src/lib/local-agent/local-agent-runner.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..', '..', '..');

async function main(): Promise<void> {
  const result = await bootstrapLocalAgentWorkspace(workspaceRoot);
  console.log('本地 Agent 工作区已初始化：');
  console.log(`- prompt: ${result.promptFilePath}`);
  console.log(`- skills: ${result.skillFilePaths.length} files`);
  console.log(`- module: ${result.moduleFilePath}`);
  console.log(`- character: ${result.characterFilePath}`);
  console.log(`- report: ${result.reportFilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
