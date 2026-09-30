/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Transpile production modules in memory and inject only external boundaries.
// No environment, database or Discord connection is loaded by this harness.
function load(file, mocks = {}) {
  const filename = path.resolve(root, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = id => {
    if (id in mocks) return mocks[id];
    if (id === 'server-only') return {};
    if (id === 'zod') return require('../dashboard/node_modules/zod');
    if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), id + '.ts')), mocks);
    throw new Error('Unmocked boundary: ' + id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename })(localRequire, module, module.exports);
  return module.exports;
}
const policy = load('src/security/policy.ts');
const role = {
  guildId: 'A', roleId: 'role', managed: false, position: 3, permissions: policy.permission(11),
  actorPermissions: policy.permission(28), botPermissions: policy.permission(28),
  actorPosition: 5, botPosition: 10, owner: false,
};
test('guild A cannot accept a resource from guild B', () => assert.throws(() => policy.assertTenant('A', 'B')));
test('ordinary role assignment is allowed', () => policy.assertRolePolicy(role));
test('unauthorized executor cannot assign a role', () => assert.throws(() => policy.assertRolePolicy({ ...role, actorPermissions: BigInt(0) })));
test('executor hierarchy is enforced', () => assert.throws(() => policy.assertRolePolicy({ ...role, actorPosition: 3 })));
test('bot hierarchy is enforced even for owner', () => assert.throws(() => policy.assertRolePolicy({ ...role, owner: true, botPosition: 3 })));
test('managed and everyone roles are rejected', () => {
  assert.throws(() => policy.assertRolePolicy({ ...role, managed: true }));
  assert.throws(() => policy.assertRolePolicy({ ...role, roleId: 'A' }));
});
test('privileged and unknown permission bits cannot be exposed as self roles', () => {
  for (const bit of [1,2,3,4,5,13,28,29,40,60]) assert.throws(() => policy.assertRolePolicy({ ...role, permissions: policy.permission(bit) }, true));
  policy.assertRolePolicy(role, true);
});
test('settings reject arbitrary tenant, relation and internal fields', () => {
  const { settingsContract } = load('dashboard/src/lib/settings-contract.ts');
  for (const key of ['guildId', 'guild', 'id', 'setupCompleted', 'updatedAt', 'verifiedRoleId', 'unknown'])
    assert.equal(settingsContract.safeParse({ [key]: 'anything' }).success, false);
  assert.equal(settingsContract.safeParse({ prefix: '!', supportRoleId: '123456789012345678' }).success, true);
});
test('ticket panel deletion includes tenant in the database predicate', async () => {
  let where;
  const { TicketRepository } = load('src/database/repositories/ticket.repository.ts', {
    '../client': { prisma: { $transaction: async (operation) => operation({
      ticketPanel: {
        findFirst: async (input) => { where = input.where; return input.where.guildId === 'B' ? { id: 'panel-B', guildId: 'B' } : null; },
        deleteMany: async () => ({ count: 1 }),
      }, auditLog: { create: async () => ({}) },
    }) } },
    '@prisma/client': {},
  });
  assert.equal(await TicketRepository.deletePanel('panel-B', 'A', 'actor-A'), false);
  assert.deepEqual(where, { id: 'panel-B', guildId: 'A' });
});
test('reminder and scheduled announcement destinations reject another guild before sending', async () => {
  const { validateChannel, validateReminderDestination } = load('dashboard/src/lib/destinations.ts', {
    './discord': { fetchChannel: async () => ({id:'channel-B',guild_id:'B',type:0}), fetchBotRoleContext: async () => ({}), fetchGuildMember: async () => ({}) },
    './capabilities': { memberPermissions: () => BigInt(8) },
  });
  await assert.rejects(validateChannel('A', 'channel-B'));
  await assert.rejects(validateReminderDestination('A', 'actor', 'CHANNEL', 'channel-B'));
  await assert.rejects(validateReminderDestination('A', 'actor', 'USER', 'other'));
});
test('worker revalidates destination guild at delivery', async () => {
  const { workerDestination } = load('src/security/destination.ts', { 'discord.js': { PermissionFlagsBits: {} } });
  const client = { guilds: { fetch: async () => ({ channels: { fetch: async () => ({ guild: { id: 'B' } }) } }) } };
  await assert.rejects(workerDestination(client, 'A', 'channel-B'));
});
test('audit rejects missing tenant and records outcomes in canonical table', async () => {
  const records = [];
  const { logDashboardAction } = load('dashboard/src/lib/audit.ts', { './prisma': { prisma: {
    auditLog: { create: async ({ data }) => records.push(data) }, dashboardAuditLog: { create: async () => {} },
  } } });
  await assert.rejects(logDashboardAction({ executorId: 'actor', action: 'CHANGE' }));
  for (const outcome of ['SUCCESS', 'FAILURE']) await logDashboardAction({ guildId: 'A', executorId: 'actor', action: 'CHANGE', targetId: 'item', outcome });
  assert.equal(records.length, 2);
  assert.ok(records.every(r => r.guildId === 'A'));
  assert.deepEqual(records.map(r => JSON.parse(r.details).outcome), ['SUCCESS', 'FAILURE']);
});
test('mutation origin and local quota fail closed', () => {
  const { validMutationOrigin, MutationLimiter } = load('dashboard/src/lib/mutation-policy.ts');
  assert.equal(validMutationOrigin('https://evil.example', 'app.example', 'https://app.example'), false);
  assert.equal(validMutationOrigin(null, 'app.example', 'https://app.example'), false);
  assert.equal(validMutationOrigin('https://app.example', 'app.example', 'https://app.example'), true);
  const limiter = new MutationLimiter();
  for (let i = 0; i < 30; i++) assert.equal(limiter.allow('actor', 100), true);
  assert.equal(limiter.allow('actor', 100), false);
  assert.equal(limiter.allow('actor', 60101), true);
});
test('worker health never substitutes REST credentials for heartbeat', () => {
  const { workerHealth } = load('dashboard/src/lib/health.ts');
  assert.equal(workerHealth(null).worker, 'UNKNOWN');
  assert.equal(workerHealth({ status: 'OFFLINE', gatewayStatus: 'DISCONNECTED', lastHeartbeat: new Date(), schedulerStatus: 'RUNNING' }).worker, 'OFFLINE');
  assert.equal(workerHealth({ status: 'ONLINE', gatewayStatus: 'CONNECTED', lastHeartbeat: new Date(), schedulerStatus: 'RUNNING' }).scheduler, 'UNKNOWN');
});
test('transport respects explicit 429 retry and redacts upstream errors', async () => {
  const original = global.fetch;
  try {
    let calls = 0;
    global.fetch = async () => ++calls === 1 ? new Response('{"retry_after":0}', { status: 429 }) : new Response('{}');
    const { discordRequest, DiscordApiError } = load('dashboard/src/lib/discord-transport.ts');
    assert.equal((await discordRequest('https://discord.invalid', {})).status, 200);
    assert.equal(calls, 2);
    global.fetch = async () => new Response('sensitive upstream text', { status: 403 });
    await assert.rejects(discordRequest('https://discord.invalid', {}), e => e instanceof DiscordApiError && !e.message.includes('sensitive'));
  } finally { global.fetch = original; }
});

test('guild authorization denies B without querying B tenant data', async () => {
  let queried = false;
  const { requireGuildAccess } = load('dashboard/src/lib/permissions.ts', {
    'next-auth': { getServerSession: async () => ({user:{discordId:'actor'}}) }, './auth': {authOptions:{}},
    '@/lib/server-session': {getDiscordAccessToken:async()=> 'test-only'},
    './discord': {fetchUserGuilds:async()=>[{id:'A'}],isBotInstalledInGuild:async()=>true},
    './prisma': {prisma:{guild:{findUnique:async()=>{queried=true;return {botInstalled:true}}}}},
    './constants': {},
  });
  assert.equal((await requireGuildAccess('B')).authorized,false);
  assert.equal(queried,false);
});

test('mutation wrapper denies conflicting tenants and audits handler success and failure', async () => {
  const {NextRequest,NextResponse}=require('../dashboard/node_modules/next/server');
  const records=[];let mutations=0,capabilityAllowed=false;
  const {withMutation}=load('dashboard/src/lib/mutation.ts',{
    'next/server':{NextRequest,NextResponse},
    './permissions':{requireAuth:async()=>({authorized:true,session:{user:{discordId:'actor'}}}),requireGuildAccess:async()=>({authorized:true})},
    './capabilities':{requireGuildCapability:async(_guildId,_actor,capability)=>{assert.equal(capability,'MANAGE_SETTINGS');if(!capabilityAllowed)throw new policy.PolicyError();}},
    './audit':{logDashboardAction:async e=>records.push(e)},
    '../../../src/security/policy':policy,
  });
  const old=process.env.NEXTAUTH_URL;process.env.NEXTAUTH_URL='https://app.example';
  const req=(body)=>new NextRequest('https://app.example/api/settings?guildId=111111111111111111',{
    method:'POST',headers:{origin:'https://app.example',host:'app.example','content-type':'application/json'},body:JSON.stringify(body),
  });
  try {
    const handler=withMutation('MANAGE_SETTINGS',async()=>{mutations++;return NextResponse.json({success:true})});
    assert.equal((await handler(req({guildId:'222222222222222222'}))).status,400);
    assert.equal(mutations,0);
    assert.equal((await handler(req({}))).status,403);
    assert.equal(mutations,0);
    capabilityAllowed=true;
    assert.equal((await handler(req({}))).status,200);
    const failing=withMutation('MANAGE_SETTINGS',async()=>{throw new Error('private upstream detail')});
    const response=await failing(req({}));assert.equal(response.status,500);
    assert.ok(!(await response.text()).includes('private'));
    assert.deepEqual(records.map(r=>r.outcome),['FAILURE','SUCCESS','FAILURE']);
    assert.ok(records.every(r=>r.guildId==='111111111111111111'&&r.executorId==='actor'));
  } finally {if(old===undefined)delete process.env.NEXTAUTH_URL;else process.env.NEXTAUTH_URL=old;}
});

test('moderation service does not dispatch when authorization lookup fails', async () => {
  let dispatched=false;
  const {createModerationAdapter}=load('src/services/moderation-discord.ts',{
    './discord-transport':{discordRequest:async(_url, options)=>{ if(options.method !== 'GET') dispatched=true; throw new Error('target missing'); }},
  });
  await assert.rejects(createModerationAdapter('test-only').authorize({guildId:'A',actorId:'actor',targetId:'target',action:'BAN'}));
  assert.equal(dispatched,false);
});

test('all moderation endpoint actions reject unauthenticated and foreign-guild actors before domain dispatch', async () => {
  const {NextRequest,NextResponse}=require('../dashboard/node_modules/next/server');
  let authenticated=true,dispatched=0;
  const G='111111111111111111',B='222222222222222222',actor='333333333333333333';
  const mocks={
    'next/server':{NextRequest,NextResponse},
    './permissions':{requireAuth:async()=>({authorized:authenticated,session:{user:{discordId:actor}}}),requireGuildAccess:async id=>({authorized:id===G,status:403,error:'denied'})},
    './capabilities':{requireGuildCapability:async()=>{}},
    './audit':{logDashboardAction:async()=>{}},
    '../../../src/security/policy':policy,
  };
  const {withMutation}=load('dashboard/src/lib/mutation.ts',mocks);
  const {POST}=load('dashboard/src/app/api/moderation/route.ts',{
    'next/server':{NextRequest,NextResponse},'next-auth':{getServerSession:async()=>({user:{discordId:actor}})},
    '@/lib/auth':{authOptions:{}},'@/lib/mutation':{withMutation},'@/lib/permissions':{requireGuildAccess:async()=>({authorized:true})},
    '@/lib/prisma':{prisma:{}},'@/lib/discord-transport':load('src/services/discord-transport.ts'),
    '../../../../../src/services/moderation.service':{runModeration:async()=>{dispatched++;},moderationFailureCode:()=> 'ERROR'},
    '../../../../../src/services/moderation-discord':{createModerationAdapter:()=>({})},
  });
  const old=process.env.NEXTAUTH_URL;process.env.NEXTAUTH_URL='https://app.example';
  const request=(action,guildId)=>new NextRequest('https://app.example/api/moderation',{method:'POST',
    headers:{origin:'https://app.example',host:'app.example','content-type':'application/json'},
    body:JSON.stringify({guildId,action,targetId:B,requestKey:'endpoint-test-0001'})});
  try {
    for(const action of ['WARN','TIMEOUT','KICK','BAN','UNBAN','PURGE','SLOWMODE','LOCK','UNLOCK','ESCALATE']){
      authenticated=false;assert.equal((await POST(request(action,G))).status,401);
      authenticated=true;assert.equal((await POST(request(action,B))).status,403);
    }
    assert.equal(dispatched,0);
  } finally {if(old===undefined)delete process.env.NEXTAUTH_URL;else process.env.NEXTAUTH_URL=old;}
});

test('welcome endpoint rejects unauthenticated, conflicting-tenant and cross-guild destinations before saving', async () => {
  const {NextRequest,NextResponse}=require('../dashboard/node_modules/next/server');
  const G='111111111111111111',B='222222222222222222',actor='333333333333333333';
  let authenticated=true,saved=0,accessGuild=G;
  const roleChecks=[],channelChecks=[];
  const policyError=new policy.PolicyError();
  const access=async guildId=>({authorized:guildId===accessGuild,status:403,error:'denied',session:{user:{discordId:actor}}});
  const mocks={
    'next/server':{NextRequest,NextResponse},
    './permissions':{requireAuth:async()=>({authorized:authenticated,session:{user:{discordId:actor}}}),requireGuildAccess:access},
    './capabilities':{requireGuildCapability:async()=>{},authorizeRole:async(...args)=>roleChecks.push(args)},
    './audit':{logDashboardAction:async()=>{}},
    '../../../src/security/policy':policy,
  };
  const {withMutation}=load('dashboard/src/lib/mutation.ts',mocks);
  const contract=load('src/services/welcome-contract.ts');
  const transport=load('src/services/discord-transport.ts');
  const {POST}=load('dashboard/src/app/api/welcome/route.ts',{
    'next/server':{NextRequest,NextResponse},
    '@/lib/capabilities':{authorizeRole:async(...args)=>roleChecks.push(args)},
    '@/lib/destinations':{validateChannel:async(guildId,channelId)=>{channelChecks.push([guildId,channelId]);if(channelId.startsWith('999'))throw policyError;}},
    '@/lib/mutation':{withMutation},
    '@/lib/permissions':{requireGuildAccess:access},
    '@/lib/prisma':{prisma:{}},
    '../../../../../src/security/policy':policy,
    '../../../../../src/services/welcome-config.service':{saveWelcomeConfig:async(_db,input)=>{saved++;return input;}},
    '../../../../../src/services/welcome-contract':contract,
    '@/lib/discord-transport':transport,
  });
  const old=process.env.NEXTAUTH_URL;process.env.NEXTAUTH_URL='https://app.example';
  const request=(guildId,bodyGuildId=guildId,extra={})=>new NextRequest(`https://app.example/api/welcome?guildId=${guildId}`,{
    method:'POST',headers:{origin:'https://app.example',host:'app.example','content-type':'application/json'},
    body:JSON.stringify({guildId:bodyGuildId,enabled:true,dmEnabled:false,...extra}),
  });
  try {
    authenticated=false;assert.equal((await POST(request(G))).status,401);
    authenticated=true;accessGuild=G;
    assert.equal((await POST(request(G,B))).status,400);
    accessGuild=G;assert.equal((await POST(request(B))).status,403);
    accessGuild=G;assert.equal((await POST(request(G,G,{channelId:'999999999999999999'}))).status,403);
    assert.equal(saved,0);
    assert.equal((await POST(request(G,G,{channelId:'444444444444444444',roleId:'555555555555555555'}))).status,200);
    assert.equal(saved,1);
    assert.deepEqual(channelChecks,[[G,'999999999999999999'],[G,'444444444444444444']]);
    assert.deepEqual(roleChecks,[[G,actor,'555555555555555555',true]]);
  } finally {if(old===undefined)delete process.env.NEXTAUTH_URL;else process.env.NEXTAUTH_URL=old;}
});

test('OAuth session serialization excludes credentials', async () => {
  const {authOptions}=load('dashboard/src/lib/auth.ts',{'next-auth/providers/discord':()=>({})});
  const session=await authOptions.callbacks.session({session:{user:{}},token:{discordId:'actor',accessToken:'test-only-secret'}});
  assert.equal(JSON.stringify(session).includes('test-only-secret'),false);
  assert.equal(session.user.discordId,'actor');
});

test('server credential helper decodes the actual encrypted NextAuth cookie', async () => {
  const jwt=require('../dashboard/node_modules/next-auth/jwt');
  const {NextRequest}=require('../dashboard/node_modules/next/server');
  const oldSecret=process.env.NEXTAUTH_SECRET,oldUrl=process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_SECRET='test-only-not-a-production-secret';process.env.NEXTAUTH_URL='http://localhost:3000';
  try {
    const token=await jwt.encode({secret:process.env.NEXTAUTH_SECRET,token:{accessToken:'server-only-value',accessTokenExpires:Date.now()+60000}});
    const {getDiscordAccessToken}=load('dashboard/src/lib/server-session.ts',{
      'next/server':{NextRequest},'next-auth/jwt':jwt,'next/headers':{headers:async()=>new Headers({cookie:'next-auth.session-token='+token})},
    });
    assert.equal(await getDiscordAccessToken(),'server-only-value');
  } finally {
    if(oldSecret===undefined)delete process.env.NEXTAUTH_SECRET;else process.env.NEXTAUTH_SECRET=oldSecret;
    if(oldUrl===undefined)delete process.env.NEXTAUTH_URL;else process.env.NEXTAUTH_URL=oldUrl;
  }
});

test('Phase 0.5 uses one module catalog and reports implemented automation runtime', () => {
  const modules = load('src/config/modules.ts');
  assert.equal(modules.getModuleDefinition('tickets').runtimeImplemented, true);
  assert.equal(modules.getModuleState('tickets', true), 'ENABLED');
  assert.equal(modules.getModuleState('automation', true), 'ENABLED');
  assert.equal(modules.getModuleState('automation', false), 'DISABLED');
  assert.throws(() => modules.assertModuleKey('invented-module'));
});

test('dashboard and bot settings use the same strict shared contract', () => {
  const shared = load('src/config/settings.ts');
  const dashboard = load('dashboard/src/lib/settings-contract.ts');
  const valid = { prefix: '!', timezone: 'UTC', supportRoleId: '123456789012345678' };
  assert.equal(shared.settingsContract.safeParse(valid).success, true);
  assert.equal(dashboard.settingsContract.safeParse(valid).success, true);
  assert.equal(shared.settingsContract.safeParse({ guildId: 'B' }).success, false);
});

test('canonical ticket transitions always retain the requested guild predicate', async () => {
  const calls = [];
  const { TicketDomainService } = load('src/services/ticket-domain.service.ts', {
    '@prisma/client': {},
    '../database/repositories/ticket.repository': {
      TicketRepository: {
        findById: async (id, guildId) => id === 'ticket-A' && guildId === 'A' ? { id, channelId: 'channel-A', reason: null } : null,
        findByChannelId: async () => null,
        findManyByGuild: async () => [],
        transitionTicket: async (input) => { calls.push(input); return { id: 'ticket-A', channelId: input.channelId, ...input.data }; },
      },
    },
  });
  await TicketDomainService.transition('A', 'ticket-A', { id: 'actor-A', authorized: true }, 'CLOSE', 'done');
  assert.deepEqual(calls[0], { guildId: 'A', channelId: 'channel-A', actorId: 'actor-A', action: 'CLOSE', whereStatus: ['OPEN', 'CLAIMED'], data: { status: 'CLOSED', closedById: 'actor-A', closedAt: calls[0].data.closedAt, reason: 'done' }, delete: false, source: undefined });
  assert.equal(await TicketDomainService.transition('B', 'ticket-A', { id: 'actor-B', authorized: true }, 'CLOSE'), null);
  await assert.rejects(TicketDomainService.transition('A', 'ticket-A', { id: 'member-A', authorized: false }, 'CLOSE'));
});

test('scheduler retry policy is bounded and stores only safe error identifiers', () => {
  const { retryDecision, deliveryFailurePolicy, safeDeliveryError } = load('src/services/scheduler-policy.ts');
  const now = new Date('2026-01-01T00:00:00.000Z');
  const retry = retryDecision(1, 5, 'ACTIVE', now);
  assert.equal(retry.status, 'ACTIVE');
  assert.equal(retry.nextAttemptAt.toISOString(), '2026-01-01T00:00:30.000Z');
  assert.equal(retryDecision(5, 5, 'ACTIVE', now).status, 'FAILED');
  assert.equal(retryDecision(1, 5, 'ACTIVE', now, deliveryFailurePolicy({ status: 403 })).status, 'FAILED');
  assert.equal(retryDecision(1, 5, 'ACTIVE', now, deliveryFailurePolicy({ status: 429, retryAfter: 90000 })).nextAttemptAt.toISOString(), '2026-01-01T00:01:30.000Z');
  assert.equal(safeDeliveryError(new Error('token=private-value')), 'Error');
  assert.equal(safeDeliveryError('upstream-private-detail'), 'UnknownError');
});

test('scheduler claims are tenant-scoped and completion is fenced by lease token', async () => {
  const calls = [];
  const prisma = { reminder: { updateMany: async input => { calls.push(input); return { count: 1 }; } } };
  const { SchedulerRepository } = load('src/database/repositories/scheduler.repository.ts', { '../client': { prisma } });
  const now = new Date('2026-01-01T00:00:00.000Z');
  const until = new Date(now.getTime() + 300000);
  assert.deepEqual(await SchedulerRepository.claimReminder({ id: 'reminder-A', guildId: 'guild-A', maxAttempts: 5 }, now, 'lease-A', until), { count: 1 });
  assert.equal(calls[0].where.guildId, 'guild-A');
  assert.equal(calls[0].where.id, 'reminder-A');
  assert.deepEqual(calls[0].data.attempts, { increment: 1 });
  assert.equal(calls[0].data.leaseToken, 'lease-A');
  await SchedulerRepository.completeReminder('reminder-A', 'guild-A', 'lease-A');
  assert.deepEqual(calls[1].where, { id: 'reminder-A', guildId: 'guild-A', status: 'PROCESSING', leaseToken: 'lease-A' });
});
