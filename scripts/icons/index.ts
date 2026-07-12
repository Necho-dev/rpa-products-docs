/**
 * Shared Icons CLI
 *
 * Groups:
 *   platform  Platform favicon (host + CODE, auto-parse/refresh)
 *   shared    Shared icons (name → file, SVG preferred)
 */
import { platformIconsDir, platformManifestPath, runPlatformCli } from './platform';
import { runSharedCli, sharedIconsDir, sharedManifestPath } from './shared';

function printRootHelp(): void {
  console.log(`
Shared Icons CLI

Groups:
  platform   平台 favicon
    - manifest: ${platformManifestPath}
    - path: ${platformIconsDir}/

  shared     自建图标
    - manifest: ${sharedManifestPath}
    - path: ${sharedIconsDir}/

Usage:
  npm run icons -- <group> <subcommand> [args...]
  npm run icons:platform -- <subcommand> [args...]
  npm run icons:shared -- <subcommand> [args...]

Examples:
  npm run icons -- platform list
  npm run icons -- shared list
  npm run icons:platform -- add https://myseller.taobao.com/ QIANNIU
  npm run icons:shared -- add MyBrand ./assets/brand.svg

Subcommand:
  npm run icons -- platform --help
  npm run icons -- shared --help
`.trim());
}

async function main(): Promise<void> {
  const [group, ...rest] = process.argv.slice(2);

  switch (group) {
    case 'platform':
      return runPlatformCli(rest);
    case 'shared':
      return runSharedCli(rest);
    case '--help':
    case '-h':
    case undefined:
      printRootHelp();
      break;
    default:
      console.error(`Unknown group: ${group} (available: platform, shared)\n`);
      printRootHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
