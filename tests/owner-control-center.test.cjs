/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(file, mocks = {}) {
  const filename = path.resolve(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const localRequire = id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${id}.ts`)), mocks);
    throw new Error(`Unmocked dependency ${id}`);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

test('owner identity allowlist permits only the configured signed Discord identity', () => {
  const auth = load('dashboard/src/lib/owner-auth.ts', { 'server-only': {}, 'next-auth': { getServerSession: async () => null }, './auth': { authOptions: {} } });
  assert.equal(auth.authorizeKraxxBotOwner('1133639998470623272', '1133639998470623272').authorized, true);
  assert.deepEqual(auth.authorizeKraxxBotOwner('2233639998470623272', '1133639998470623272'), { authorized: false, status: 403, error: 'Forbidden.' });
  assert.equal(auth.authorizeKraxxBotOwner('1133639998470623272', undefined).authorized, false);
  assert.equal(auth.authorizeKraxxBotOwner(undefined, '1133639998470623272').status, 401);
});

test('owner identity never comes from request body or browser state', () => {
  const source = fs.readFileSync(path.join(root, 'dashboard/src/lib/owner-auth.ts'), 'utf8');
  assert.match(source, /getServerSession\(authOptions\)/);
  assert.match(source, /session\?\.user\?\.discordId/);
  assert.doesNotMatch(source, /localStorage|searchParams|request\.json|cookies\(/);
});

test('all owner APIs independently apply the owner authorization gate', () => {
  const directory = path.join(root, 'dashboard/src/app/api/owner');
  const files = [];
  const visit = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) visit(p); else if (entry.name === 'route.ts') files.push(p); } };
  visit(directory);
  assert.ok(files.length >= 8);
  for (const file of files) assert.match(fs.readFileSync(file, 'utf8'), /ownerApiGate\(\)/, `${path.relative(root, file)} must guard its handler`);
});

test('owner route layout denies unconfigured and non-owner sessions before rendering its area', () => {
  const source = fs.readFileSync(path.join(root, 'dashboard/src/app/dashboard/owner/layout.tsx'), 'utf8');
  assert.match(source, /requireKraxxBotOwner\(\)/);
  assert.match(source, /access\.status === 403/);
  assert.match(source, /KRAXXBOT_OWNER_DISCORD_ID/);
});

test('owner server API validates guild IDs and never returns unfiltered config data', () => {
  const source = fs.readFileSync(path.join(root, 'dashboard/src/app/api/owner/server/route.ts'), 'utf8');
  assert.match(source, /ownerApiGate\(\)/);
  assert.match(source, /\^\\d\{17,20\}\$/);
  const data = fs.readFileSync(path.join(root, 'dashboard/src/lib/owner-data.ts'), 'utf8');
  assert.match(data, /allowedChannelCount/);
  assert.doesNotMatch(data, /promptText|responseText|GEMINI_API_KEY/);
});

test('owner navigation visibility is only a UI convenience; route authorization remains server-side', () => {
  const sidebar = fs.readFileSync(path.join(root, 'dashboard/src/components/layout/Sidebar.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'dashboard/src/app/dashboard/owner/layout.tsx'), 'utf8');
  assert.match(sidebar, /isOwner &&/);
  assert.match(layout, /requireKraxxBotOwner\(\)/);
});

test('commands overview marks Discord deployment state as unverified rather than inventing a timestamp', () => {
  const source = fs.readFileSync(path.join(root, 'dashboard/src/app/api/owner/commands/route.ts'), 'utf8');
  assert.match(source, /deploymentStatus: 'NOT_VERIFIED'/);
  assert.match(source, /lastDeploymentAt: null/);
  assert.match(source, /ownerApiGate\(\)/);
});

test('owner command catalog contains the current 24 root command names', () => {
  const catalog = load('dashboard/src/lib/owner-commands.ts', {});
  const deploy = fs.readFileSync(path.join(root, 'scripts/deploy-commands.ts'), 'utf8');
  assert.equal(catalog.OWNER_COMMANDS.length, 24);
  assert.equal((deploy.match(/\.data\.toJSON\(\)/g) || []).length, 24);
  const listedNames = catalog.OWNER_COMMANDS.map(command => command.name).sort();
  assert.deepEqual(listedNames, ['announce', 'ask', 'client', 'config', 'custom', 'event', 'info', 'meeting', 'moderate', 'ping', 'project', 'remind', 'role', 'say', 'sayedit', 'sayembed', 'saykeep', 'sayreply', 'selfrole', 'setup', 'task', 'template', 'ticket', 'verify'].sort());
});
