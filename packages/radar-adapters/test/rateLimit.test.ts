import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryRateLimitStore,
  createRateLimiter,
  createRedisRateLimitStore,
  readUpstashRestCredentials,
  type RateLimitRedis,
  type RateLimitRule,
  type RateLimitStore,
} from '../src/rateLimit.js';

const RULE: RateLimitRule = { name: 'test-rule', limit: 3, windowMs: 60_000 };

/**
 * A Lua-free stand-in for Redis that keeps the same sorted-set semantics the
 * scripts rely on, so the store's reply parsing and window arithmetic are
 * exercised without a live server.
 */
function createFakeRedis(): RateLimitRedis & { keys(): string[]; failNext(error: Error): void } {
  const sets = new Map<string, number[]>();
  let pending: Error | undefined;

  function reply(key: string, cutoff: number): [number, string] {
    const scores = (sets.get(key) ?? []).filter((score) => score > cutoff).sort((a, b) => a - b);
    if (scores.length) sets.set(key, scores);
    else sets.delete(key);
    return [scores.length, scores.length ? String(scores[0]!) : ''];
  }

  return {
    keys: () => [...sets.keys()],
    failNext(error) {
      pending = error;
    },
    async eval(script, keys, args) {
      if (pending) {
        const error = pending;
        pending = undefined;
        throw error;
      }
      const key = keys[0]!;
      const cutoff = Number(args[0]);
      if (script.includes("if count >= tonumber(ARGV[5])")) {
        const [count] = reply(key, cutoff);
        if (count >= Number(args[4])) return [0, ...reply(key, cutoff)];
        sets.set(key, [...(sets.get(key) ?? []), Number(args[1])]);
        return [1, ...reply(key, cutoff)];
      }
      if (script.includes("redis.call('ZADD'")) {
        sets.set(key, [...(sets.get(key) ?? []), Number(args[1])]);
        return reply(key, cutoff);
      }
      return reply(key, cutoff);
    },
    async del(key) {
      return sets.delete(key) ? 1 : 0;
    },
  };
}

const stores: Array<[string, () => RateLimitStore]> = [
  ['memory', createMemoryRateLimitStore],
  ['redis', () => createRedisRateLimitStore(createFakeRedis())],
];

for (const [label, build] of stores) {
  test(`${label} store allows up to the limit and then reports a wait`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    const start = 1_000_000;

    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      const decision = await limiter.consume(RULE, 'subject', start + attempt);
      assert.equal(decision.allowed, true, `attempt ${attempt} should be allowed`);
      assert.equal(decision.retryAfterSeconds, 0);
      assert.equal(decision.remaining, RULE.limit - attempt - 1);
    }

    const blocked = await limiter.consume(RULE, 'subject', start + RULE.limit);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfterSeconds, 60);
  });

  test(`${label} store forgets attempts once the window slides past them`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    const start = 1_000_000;
    for (let attempt = 0; attempt < RULE.limit; attempt += 1) await limiter.consume(RULE, 'subject', start + attempt);

    assert.equal((await limiter.consume(RULE, 'subject', start + RULE.windowMs - 1)).allowed, false);
    assert.equal((await limiter.consume(RULE, 'subject', start + RULE.windowMs)).allowed, true);
  });

  test(`${label} store keeps subjects independent`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    for (let attempt = 0; attempt < RULE.limit; attempt += 1) await limiter.consume(RULE, 'first', 1_000 + attempt);

    assert.equal((await limiter.consume(RULE, 'first', 2_000)).allowed, false);
    assert.equal((await limiter.consume(RULE, 'second', 2_000)).allowed, true);
  });

  test(`${label} store separates rules that share a subject`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    const other: RateLimitRule = { name: 'other-rule', limit: 1, windowMs: 60_000 };
    await limiter.consume(other, 'subject', 1_000);

    assert.equal((await limiter.consume(other, 'subject', 1_100)).allowed, false);
    assert.equal((await limiter.consume(RULE, 'subject', 1_100)).allowed, true);
  });

  test(`${label} store checks without spending an attempt`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await limiter.check(RULE, 'subject', 1_000)).allowed, true);
    }
    assert.equal((await limiter.check(RULE, 'subject', 1_000)).remaining, RULE.limit);
  });

  test(`${label} store records failures past the limit and clears on reset`, async () => {
    const limiter = createRateLimiter({ shared: build() });
    for (let attempt = 0; attempt < RULE.limit; attempt += 1) await limiter.record(RULE, 'subject', 1_000 + attempt);

    assert.equal((await limiter.check(RULE, 'subject', 1_100)).allowed, false);
    const overspent = await limiter.record(RULE, 'subject', 1_100);
    assert.equal(overspent.allowed, false);

    await limiter.reset(RULE, 'subject');
    assert.equal((await limiter.check(RULE, 'subject', 1_100)).allowed, true);
  });
}

test('retry-after rounds up to the next whole second and never reports zero', async () => {
  const rule: RateLimitRule = { name: 'rounding', limit: 1, windowMs: 1_500 };
  const limiter = createRateLimiter({ shared: createMemoryRateLimitStore() });
  await limiter.consume(rule, 'subject', 0);

  assert.equal((await limiter.consume(rule, 'subject', 100)).retryAfterSeconds, 2);
  assert.equal((await limiter.consume(rule, 'subject', 1_499)).retryAfterSeconds, 1);
});

test('subjects are hashed so the shared store never holds a readable identifier', async () => {
  const redis = createFakeRedis();
  const limiter = createRateLimiter({ shared: createRedisRateLimitStore(redis) });
  await limiter.consume(RULE, 'person@example.com', 1_000);

  const [key] = redis.keys();
  assert.ok(key?.startsWith('missa:rl:test-rule:'), 'key should be namespaced by rule');
  assert.equal(key?.includes('person@example.com'), false);
  assert.equal(key?.includes('example'), false);
});

test('a shared store outage degrades to the local window instead of failing the request', async () => {
  const redis = createFakeRedis();
  const degraded: string[] = [];
  const limiter = createRateLimiter({
    shared: createRedisRateLimitStore(redis),
    onDegraded: (rule) => degraded.push(rule.name),
  });

  const healthy = await limiter.consume(RULE, 'subject', 1_000);
  assert.equal(healthy.store, 'shared');

  redis.failNext(new Error('upstash unreachable'));
  const fallback = await limiter.consume(RULE, 'subject', 1_100);
  assert.equal(fallback.allowed, true);
  assert.equal(fallback.store, 'memory');
  assert.deepEqual(degraded, [RULE.name]);
});

test('the local window still bounds a subject while the shared store is down', async () => {
  const redis = createFakeRedis();
  const limiter = createRateLimiter({ shared: createRedisRateLimitStore(redis) });

  for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
    redis.failNext(new Error('upstash unreachable'));
    assert.equal((await limiter.consume(RULE, 'subject', 1_000 + attempt)).allowed, true);
  }
  redis.failNext(new Error('upstash unreachable'));
  const blocked = await limiter.consume(RULE, 'subject', 1_100);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.store, 'memory');
});

test('a limiter with no shared store runs memory-only and says so', async () => {
  const limiter = createRateLimiter();
  const decision = await limiter.consume(RULE, 'subject', 1_000);
  assert.equal(decision.allowed, true);
  assert.equal(decision.store, 'memory');
});

test('REST credentials are read only when both halves are present', () => {
  assert.deepEqual(
    readUpstashRestCredentials({ UPSTASH_REDIS_REST_URL: ' https://db.upstash.io ', UPSTASH_REDIS_REST_TOKEN: ' token ' }),
    { url: 'https://db.upstash.io', token: 'token' },
  );
  assert.equal(readUpstashRestCredentials({ UPSTASH_REDIS_REST_URL: 'https://db.upstash.io' }), undefined);
  assert.equal(readUpstashRestCredentials({ UPSTASH_REDIS_REST_TOKEN: 'token' }), undefined);
  assert.equal(readUpstashRestCredentials({}), undefined);
});
