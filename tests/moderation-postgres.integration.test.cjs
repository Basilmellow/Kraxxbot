const { test } = module.require('node:test');
const assert = module.require('node:assert/strict');
const { randomUUID } = module.require('node:crypto');
module.require('ts-node/register/transpile-only');
let url;
try {
  url = new URL(process.env.DATABASE_URL);
} catch {}
if (
  !url ||
  !['127.0.0.1', 'localhost', '::1'].includes(url.hostname) ||
  !/^kraxxbot_gate_[a-z0-9_]+$/i.test(url.pathname.slice(1))
) {
  test(
    'moderation integration requires a disposable loopback gate database',
    { skip: true },
    () => {}
  );
} else {
  const { PrismaClient } = module.require('@prisma/client');
  const { runModeration } = module.require('../src/services/moderation.service.ts');
  const { DiscordApiError } = module.require('../src/services/discord-transport.ts');
  const { PolicyError } = module.require('../src/security/policy.ts');
  const db = new PrismaClient();
  let serial = BigInt('600000000000000000') + BigInt(Date.now()) * 100n;
  const id = () => String(++serial);
  const guild = id(),
    other = id(),
    actor = id();
  const input = (action = 'WARN', targetId = id()) => ({
    guildId: guild,
    targetId,
    action,
    requestKey: randomUUID(),
    reason: 'integration',
    durationSeconds: 60,
  });
  const adapter = (overrides = {}) => ({
    authorize: async () => ({}),
    prepare: async () => ({ details: {}, perform: async () => {} }),
    ...overrides,
  });
  const run = (body, ad = adapter(), database = db) =>
    runModeration(database, ad, body, actor, 'BOT');
  test('canonical moderation persistence and failure consistency', async t => {
    await db.guild.createMany({
      data: [
        { id: guild, name: 'moderation tests', ownerId: actor },
        { id: other, name: 'other tenant', ownerId: actor },
      ],
    });
    t.after(async () => {
      await db.guild.deleteMany({ where: { id: { in: [guild, other] } } });
      await db.$disconnect();
    });
    await t.test('concurrent retries dispatch exactly once for a request key', async () => {
      let dispatched = 0;
      const body = input('BAN');
      const ad = adapter({
        prepare: async () => ({
          details: {},
          perform: async () => {
            dispatched++;
          },
        }),
      });
      const rows = await Promise.all(Array.from({ length: 8 }, () => run(body, ad)));
      assert(rows.every(r => r.id === rows[0].id));
      assert.equal(dispatched, 1);
      const saved = await run(body, ad);
      assert.equal(saved.status, 'SUCCESS');
      assert.equal(dispatched, 1);
      await assert.rejects(run({ ...body, reason: 'different' }, ad));
    });
    await t.test('case success and canonical audit commit atomically', async () => {
      const row = await run(input());
      assert.equal(row.status, 'SUCCESS');
      const audit = await db.auditLog.findFirstOrThrow({
        where: { guildId: guild, action: 'MODERATION_WARN', targetId: row.targetId },
      });
      const details = JSON.parse(audit.details);
      assert.equal(details.outcome, 'SUCCESS');
      assert.equal(details.data.caseNumber, row.caseNumber);
      assert.equal(audit.executorId, actor);
    });
    for (const action of [
      'TIMEOUT',
      'KICK',
      'BAN',
      'UNBAN',
      'PURGE',
      'SLOWMODE',
      'LOCK',
      'UNLOCK',
    ]) {
      for (const status of [403, 404, 429, 408, 502])
        await t.test(
          `${action} Discord ${status} records no successful case or audit`,
          async () => {
            const body = input(action);
            const ad = adapter({
              prepare: async () => ({
                details: {},
                perform: async () => {
                  throw new DiscordApiError(status);
                },
              }),
            });
            const row = await run(body, ad);
            assert.equal(row.status, [408, 502].includes(status) ? 'UNKNOWN' : 'FAILURE');
            assert.equal(row.active, false);
            const audits = await db.auditLog.findMany({
              where: { guildId: guild, targetId: body.targetId, action: `MODERATION_${action}` },
            });
            assert.equal(audits.length, 1);
            assert.equal(JSON.parse(audits[0].details).outcome, 'FAILURE');
            if (row.status === 'UNKNOWN')
              await assert.rejects(run({ ...body, requestKey: randomUUID() }), /RECONCILIATION/);
          }
        );
    }
    await t.test(
      'unauthorized or cross-guild target failure creates audit but no case or mutation',
      async () => {
        for (const action of [
          'WARN',
          'TIMEOUT',
          'KICK',
          'BAN',
          'UNBAN',
          'PURGE',
          'SLOWMODE',
          'LOCK',
          'UNLOCK',
        ]) {
          const body = input(action);
          let prepared = false;
          await assert.rejects(
            run(
              body,
              adapter({
                authorize: async () => {
                  throw new PolicyError();
                },
                prepare: async () => {
                  prepared = true;
                },
              })
            )
          );
          assert.equal(prepared, false);
          assert.equal(
            await db.moderationCase.count({ where: { guildId: guild, targetId: body.targetId } }),
            0
          );
          assert.equal(
            await db.auditLog.count({ where: { guildId: guild, targetId: body.targetId } }),
            1
          );
        }
      }
    );
    await t.test(
      'escalation advances WARN to TIMEOUT to BAN and consumes each source once',
      async () => {
        const warning = await run(input());
        const dispatched = [];
        const ad = adapter({
          prepare: async i => ({
            details: {},
            perform: async () => {
              dispatched.push(i.action);
            },
          }),
        });
        const escalation = {
          ...input('ESCALATE', warning.targetId),
          sourceCaseNumber: warning.caseNumber,
        };
        const timeout = await run(escalation, ad);
        assert.equal(timeout.action, 'TIMEOUT');
        await assert.rejects(run({ ...escalation, requestKey: randomUUID() }, ad));
        const ban = await run(
          { ...input('ESCALATE', warning.targetId), sourceCaseNumber: timeout.caseNumber },
          ad
        );
        assert.equal(ban.action, 'BAN');
        assert.deepEqual(dispatched, ['TIMEOUT', 'BAN']);
        assert.equal(
          (await db.moderationCase.findUniqueOrThrow({ where: { id: warning.id } })).active,
          false
        );
      }
    );
    await t.test(
      'escalation rejects foreign case, mismatched target and unauthorized actor',
      async () => {
        const warning = await run(input());
        await assert.rejects(run({ ...input('ESCALATE'), sourceCaseNumber: warning.caseNumber }));
        await assert.rejects(
          run({
            ...input('ESCALATE', warning.targetId),
            guildId: other,
            sourceCaseNumber: warning.caseNumber,
          })
        );
        await assert.rejects(
          run(
            { ...input('ESCALATE', warning.targetId), sourceCaseNumber: warning.caseNumber },
            adapter({
              authorize: async () => {
                throw new PolicyError();
              },
            })
          )
        );
        assert.equal(
          (await db.moderationCase.findUniqueOrThrow({ where: { id: warning.id } })).active,
          true
        );
      }
    );
    await t.test(
      'failed escalation leaves source active and stores downstream failure',
      async () => {
        const warning = await run(input());
        const row = await run(
          { ...input('ESCALATE', warning.targetId), sourceCaseNumber: warning.caseNumber },
          adapter({
            prepare: async () => ({
              details: {},
              perform: async () => {
                throw new DiscordApiError(403);
              },
            }),
          })
        );
        assert.equal(row.status, 'FAILURE');
        assert.equal(
          (await db.moderationCase.findUniqueOrThrow({ where: { id: warning.id } })).active,
          true
        );
      }
    );
    await t.test('timeout removal invalidates escalation of previous timeouts', async () => {
      const timeout = await run(input('TIMEOUT'));
      const removed = await run({ ...input('TIMEOUT', timeout.targetId), durationSeconds: 0 });
      assert.equal(removed.active, false);
      await assert.rejects(
        run({ ...input('ESCALATE', timeout.targetId), sourceCaseNumber: timeout.caseNumber })
      );
    });
    await t.test(
      'lock baseline survives fresh service calls and unlock closes the tracked lock',
      async () => {
        const target = id();
        const seen = [];
        const ad = adapter({
          prepare: async (i, _snapshot, previous) => {
            seen.push(previous);
            return {
              details:
                i.action === 'LOCK'
                  ? (previous ?? { previousAllow: '2048', previousDeny: '0' })
                  : {},
              perform: async () => {},
            };
          },
        });
        await run(input('LOCK', target), ad);
        await run(input('LOCK', target), ad);
        await run(input('UNLOCK', target), ad);
        await run(input('UNLOCK', target), ad);
        assert.equal(seen[0], null);
        assert.equal(seen[1].previousAllow, '2048');
        assert.equal(seen[2].previousAllow, '2048');
        assert.equal(seen[3], null);
      }
    );
    function failAuditOnTransaction(numbers) {
      let n = 0;
      return new Proxy(db, {
        get(target, key) {
          if (key === '$transaction')
            return callback =>
              target.$transaction(tx => {
                n++;
                const wrapped = numbers.includes(n)
                  ? new Proxy(tx, {
                      get(t, k) {
                        if (k === 'auditLog')
                          return {
                            create: async () => {
                              throw new Error('forced audit failure');
                            },
                          };
                        return Reflect.get(t, k);
                      },
                    })
                  : tx;
                return callback(wrapped);
              });
          const v = Reflect.get(target, key);
          return typeof v === 'function' ? v.bind(target) : v;
        },
      });
    }
    await t.test(
      'attempt audit failure rolls back case reservation and prevents Discord call',
      async () => {
        let dispatched = false;
        const body = input('KICK');
        await assert.rejects(
          run(
            body,
            adapter({
              prepare: async () => {
                dispatched = true;
              },
            }),
            failAuditOnTransaction([1])
          )
        );
        assert.equal(dispatched, false);
        assert.equal(
          await db.moderationCase.count({ where: { guildId: guild, targetId: body.targetId } }),
          0
        );
      }
    );
    await t.test(
      'final audit failure rolls back SUCCESS and retains UNKNOWN without replay',
      async () => {
        let calls = 0;
        const body = input('BAN');
        const ad = adapter({
          prepare: async () => ({
            details: {},
            perform: async () => {
              calls++;
            },
          }),
        });
        await assert.rejects(run(body, ad, failAuditOnTransaction([2])), /VERIFY_BEFORE_RETRY/);
        const row = await run(body, ad);
        assert.equal(row.status, 'UNKNOWN');
        assert.equal(row.active, false);
        assert.equal(calls, 1);
        const audits = await db.auditLog.findMany({
          where: { guildId: guild, targetId: body.targetId, action: 'MODERATION_BAN' },
        });
        assert(audits.every(a => JSON.parse(a.details).outcome === 'FAILURE'));
      }
    );
    await t.test(
      'persistent audit outage leaves durable pending attempt and blocks target',
      async () => {
        const body = input('TIMEOUT');
        await assert.rejects(run(body, adapter(), failAuditOnTransaction([2, 3])));
        const row = await run(body);
        assert.equal(row.status, 'PENDING');
        await assert.rejects(run({ ...body, requestKey: randomUUID() }), /RECONCILIATION/);
      }
    );
    await t.test('purge preflight and case/audit failures never record false success', async () => {
      const preflight = await run(
        input('PURGE'),
        adapter({
          prepare: async () => {
            throw new DiscordApiError(404);
          },
        })
      );
      assert.equal(preflight.status, 'FAILURE');
      let dispatched = 0;
      const ad = adapter({
        prepare: async () => ({
          details: { deletedCount: 2 },
          perform: async () => {
            dispatched++;
          },
        }),
      });
      await assert.rejects(run(input('PURGE'), ad, failAuditOnTransaction([1])));
      assert.equal(dispatched, 0);
      const body = input('PURGE');
      await assert.rejects(run(body, ad, failAuditOnTransaction([2])));
      const row = await run(body, ad);
      assert.equal(row.status, 'UNKNOWN');
      assert.equal(dispatched, 1);
    });
    await t.test('escalation final audit failure rolls back source consumption', async () => {
      const warning = await run(input());
      const body = { ...input('ESCALATE', warning.targetId), sourceCaseNumber: warning.caseNumber };
      await assert.rejects(run(body, adapter(), failAuditOnTransaction([2])));
      assert.equal(
        (await db.moderationCase.findUniqueOrThrow({ where: { id: warning.id } })).active,
        true
      );
      assert.equal((await run(body)).status, 'UNKNOWN');
    });
    await t.test(
      'concurrent different requests for one target cannot dispatch two punishments',
      async () => {
        let signal, release;
        const started = new Promise(resolve => {
          signal = resolve;
        });
        const held = new Promise(resolve => {
          release = resolve;
        });
        const body = input('BAN');
        const first = run(
          body,
          adapter({
            prepare: async () => ({
              details: {},
              perform: async () => {
                signal();
                await held;
              },
            }),
          })
        );
        await started;
        try {
          await assert.rejects(run({ ...body, requestKey: randomUUID() }), /RECONCILIATION/);
        } finally {
          release();
          await first;
        }
        assert.equal(
          await db.moderationCase.count({ where: { guildId: guild, targetId: body.targetId } }),
          1
        );
      }
    );
  });
}
