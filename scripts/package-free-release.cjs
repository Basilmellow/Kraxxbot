const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const target = path.join(root, '.release', 'free');
if (fs.existsSync(target)) throw new Error('Release directory already exists; use a clean checkout.');
if (!fs.existsSync(path.join(root, 'dist', 'index.js'))) throw new Error('Run npm run build first.');
fs.mkdirSync(target, { recursive: true });
for (const name of ['dist', 'prisma']) fs.cpSync(path.join(root, name), path.join(target, name), { recursive: true });
const source = require(path.join(root, 'package.json'));
const lock = require(path.join(root, 'package-lock.json'));
const runtime = {
  name: source.name, version: source.version, private: true,
  description: 'Precompiled KRAXXBot release for Bot-Hosting Free',
  main: 'dist/index.js',
  scripts: {
    start: 'node --max-old-space-size=128 dist/index.js',
    // The host may retain its previous npm run build startup step. Never invoke tsc here.
    build: 'prisma generate',
    'db:generate': 'prisma generate',
  },
  dependencies: { ...source.dependencies, prisma: lock.packages['node_modules/prisma'].version },
};
fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(runtime, null, 2) + '\n');
fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(target, 'package-lock.json'));
execSync('npm install --package-lock-only --ignore-scripts --no-audit --no-fund', { cwd: target, stdio: 'inherit' });
fs.writeFileSync(path.join(target, 'index.js'), "// Compatibility with the host's default entry file.\nrequire('./dist/index.js');\n");
fs.writeFileSync(path.join(target, '.npmrc'), 'omit=dev\nignore-scripts=true\naudit=false\nfund=false\n');
const sha = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(target, 'RELEASE.json'), JSON.stringify({ sourceCommit: sha, nodeMajor: 24 }, null, 2) + '\n');
fs.writeFileSync(path.join(target, 'README.md'), `# KRAXXBot Free hosting release\n\nGenerated from source commit ${sha}. Contains compiled JavaScript, no credentials.\n\nSet startup to:\n\n\`\`\`sh\nnpm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm run db:generate && exec node --max-old-space-size=128 dist/index.js\n\`\`\`\n\nDo not run TypeScript compilation on the hosting container. Keep existing environment variables. Database migrations are a separate administrative operation, never automatic at boot.\n`);
console.log(`Precompiled release: ${target}`);
