import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSkillsToProject, resolveDefaultInstallTarget } from '../src/lib/local-agent/install-skills.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(__dirname, '..', '..', '..');

function parseArgs(argv: string[]): { targetRoot: string; overwrite: boolean } {
  let targetRoot = resolveDefaultInstallTarget(sourceRoot);
  let overwrite = false;

  for (const arg of argv) {
    if (arg === '--overwrite') {
      overwrite = true;
      continue;
    }
    targetRoot = resolve(arg);
  }

  return { targetRoot, overwrite };
}

async function main(): Promise<void> {
  const { targetRoot, overwrite } = parseArgs(process.argv.slice(2));
  const result = await installSkillsToProject({ sourceRoot, targetRoot, overwrite });

  console.log('外部 Agent Skills 已安装：');
  console.log(`- target: ${result.targetRoot}`);
  console.log(`- installed: ${result.installed.length} items`);
  console.log(`- summary: ${result.summaryFilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
