/* eslint @typescript-eslint/no-require-imports: off -- this file runs directly under Node's built-in test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Compile isolated presentation components with the project's installed runtime.
// No environment files, sessions, database clients, HTTP requests or Discord calls.
const src = path.resolve(__dirname, '../src');
const cache = new Map();
function load(relative) {
  const file = path.join(src, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = module.paths;
  cache.set(file, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = name => {
    if (name === 'next/link') return { __esModule: true, default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(src, name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved = ['.tsx', '.ts'].map(ext => base + ext).find(fs.existsSync);
      if (resolved) return load(path.relative(src, resolved));
    }
    return originalRequire(name);
  };
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } });
  mod._compile(output.outputText, file);
  return mod.exports;
}
const html = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));

test('buttons retain disabled/loading semantics and explicit icon names', () => {
  const { Button, IconButton } = load('components/ui/Button.tsx');
  const busy = html(Button, { isLoading: true }, 'Save');
  assert.match(busy, /disabled=""/);
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /Processing/);
  assert.match(html(IconButton, { label: 'Refresh members' }, 'R'), /aria-label="Refresh members"/);
});

test('custom command request bodies must be JSON objects', () => {
  const { isJsonObject } = load('lib/json-body.ts');
  assert.equal(isJsonObject({ guildId: '12345678901234567' }), true);
  for (const value of [null, 'string', 123, true, []]) assert.equal(isJsonObject(value), false);
});

test('forms forward values, names, validation relationships and labels', () => {
  const { Input, Select, Textarea, Checkbox, Switch, SearchField } = load('components/ui/Form.tsx');
  assert.match(html(Input, { 'aria-label': 'Name', 'aria-invalid': true, 'aria-describedby': 'name-error', defaultValue: 'Test' }), /aria-describedby="name-error"/);
  assert.match(html(Select, { 'aria-label': 'Status' }, React.createElement('option', null, 'Open')), /kraxx-select/);
  assert.match(html(Textarea, { 'aria-label': 'Response', defaultValue: 'Hello' }), />Hello<\/textarea>/);
  assert.match(html(Checkbox, { 'aria-label': 'Enable', defaultChecked: true }), /type="checkbox"/);
  assert.match(html(Switch, { label: 'Enable tickets', checked: false }), /aria-checked="false"/);
  assert.match(html(SearchField, { label: 'Search members' }), /type="search"/);
});

test('page headers supply one semantic title and retain actions', () => {
  const { PageHeader } = load('components/ui/Page.tsx');
  const result = html(PageHeader, { title: 'Members', description: 'Manage server members.', actions: React.createElement('button', null, 'Refresh') });
  assert.equal((result.match(/<h1/g) || []).length, 1);
  assert.match(result, /Manage server members/);
  assert.match(result, /Refresh/);
});

test('cards do not reintroduce glass or glow through legacy flags', () => {
  const { Card } = load('components/ui/Card.tsx');
  const result = html(Card, { glass: true, glow: true }, 'Content');
  assert.match(result, /kraxx-card/);
  assert.doesNotMatch(result, /backdrop|shadow|glow|glass/);
});

test('stat cards do not fabricate health, charts, or trends', () => {
  const { StatCard } = load('components/dashboard/StatCard.tsx');
  const icon = () => React.createElement('svg');
  const plain = html(StatCard, { title: 'Tickets', value: 0, icon });
  assert.doesNotMatch(plain, /Operational|polyline|STEADY/);
  const actual = html(StatCard, { title: 'Tickets', value: 3, icon, sparklineData: [1, 2, 3] });
  assert.match(actual, /polyline/);
  assert.doesNotMatch(actual, /NaN|Infinity/);
  assert.doesNotMatch(html(StatCard, { title: 'Tickets', value: 1, icon, sparklineData: [1] }), /polyline/);
});

test('unknown status is communicated without relying on color', () => {
  const { StatusDot } = load('components/ui/StatusDot.tsx');
  assert.match(html(StatusDot, { status: 'unknown' }), /unknown<\/span>/);
});

test('loading, empty, and error states stay distinct', () => {
  assert.match(html(load('components/ui/Skeleton.tsx').LoadingState, { label: 'Loading members' }), /role="status"/);
  assert.match(html(load('components/ui/EmptyState.tsx').EmptyState, { title: 'No members' }), /No members/);
  assert.match(html(load('components/ui/ErrorState.tsx').ErrorState, { message: 'Could not load members' }), /role="alert"/);
});

test('filter controls and pagination expose state and disable boundary actions', () => {
  const { Tabs } = load('components/ui/Tabs.tsx');
  const tabs = html(Tabs, { label: 'Status', items: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }], value: 'open', onChange() {} });
  assert.match(tabs, /aria-pressed="true"/);
  assert.match(tabs, /aria-pressed="false"/);
  const { Pagination } = load('components/ui/Pagination.tsx');
  assert.equal((html(Pagination, { page: 1, pageCount: 1, onChange() {} }).match(/disabled=""/g) || []).length, 2);
});

test('sidebar catalog points only to existing canonical tenant pages', () => {
  const { DASHBOARD_MODULES } = load('lib/constants.ts');
  for (const item of DASHBOARD_MODULES) {
    const route = item.id === 'select-server' ? 'app/dashboard/select-server/page.tsx' : `app/dashboard/[guildId]${item.href}/page.tsx`;
    assert.ok(fs.existsSync(path.join(src, route)), route);
  }
  assert.equal(DASHBOARD_MODULES.find(item => item.id === 'custom-commands').category, 'ENGAGEMENT');
});

test('server tenant layout retains authorization and keyed tenant reset', () => {
  const layout = fs.readFileSync(path.join(src, 'app/dashboard/[guildId]/layout.tsx'), 'utf8');
  assert.match(layout, /await requireGuildPageAccess\(guildId\)/);
  assert.match(layout, /if \(!access.authorized\) notFound\(\)/);
  assert.match(layout, /Fragment key=\{guildId\}/);
  assert.doesNotMatch(layout, /use client/);
});

test('AI channel picker preserves all-channel defaults, search, selection, and clear-visible behavior', () => {
  const picker = load('components/discord/ChannelMultiSelect.tsx');
  const channels = [
    { id: 'general-id', name: 'general', category: 'Community', type: 0 },
    { id: 'announcements-id', name: 'news', category: 'Community', type: 5 },
    { id: 'staff-id', name: 'staff-room', category: 'Operations', type: 0 },
  ];
  const empty = html(picker.ChannelMultiSelect, { channels, selectedIds: [], onChange() {} });
  assert.match(empty, /All text channels/);
  assert.match(empty, /No selections means all text channels/);
  assert.deepEqual(picker.filterChannelChoices(channels, 'STAFF'), [channels[2]]);
  assert.deepEqual(picker.filterChannelChoices(channels, 'community'), channels.slice(0, 2));
  assert.deepEqual(picker.toggleChannelChoice([], channels[0].id), [channels[0].id]);
  assert.deepEqual(picker.toggleChannelChoice([channels[0].id], channels[0].id), []);
  assert.deepEqual(picker.toggleVisibleChannelChoices([channels[2].id], channels.slice(0, 2).map(channel => channel.id)), [channels[2].id, channels[0].id, channels[1].id]);
  assert.deepEqual(picker.toggleVisibleChannelChoices([channels[2].id, channels[0].id, channels[1].id], channels.slice(0, 2).map(channel => channel.id)), [channels[2].id]);
});

test('meeting announcement nonce keys differ by stage and retries remain stable', () => {
  const { meetingAnnouncementIdempotencyKey, meetingCreateIdempotencyKey } = load('lib/meeting-announcements.ts');
  const meetingId = '123e4567-e89b-42d3-a456-426614174000';
  const nonces = ['SCHEDULED', 'STARTED', 'CONCLUDED'].map(stage => meetingAnnouncementIdempotencyKey(stage, meetingId).slice(0, 25));
  assert.equal(new Set(nonces).size, 3);
  const otherMeetingId = '523e4567-e89b-42d3-a456-426614174000';
  assert.notEqual(meetingAnnouncementIdempotencyKey('SCHEDULED', otherMeetingId).slice(0, 25), meetingAnnouncementIdempotencyKey('SCHEDULED', meetingId).slice(0, 25));
  const retryKey = meetingCreateIdempotencyKey('123e4567-e89b-42d3-a456-426614174000', '1539255587970486293', '1539255587970486294');
  assert.equal(meetingCreateIdempotencyKey('123e4567-e89b-42d3-a456-426614174000', '1539255587970486293', '1539255587970486294'), retryKey);
  assert.notEqual(meetingCreateIdempotencyKey('223e4567-e89b-42d3-a456-426614174000', '1539255587970486293', '1539255587970486294').slice(0, 25), retryKey.slice(0, 25));
});
