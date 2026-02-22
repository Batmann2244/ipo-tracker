
import { db } from "../server/db";
import { users, apiKeys, apiUsageLogs } from "@shared/schema";
import { getTodayUsageCount, getTodayUsageCountsForKeys } from "../server/services/api-key-service";
import { eq, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";

const TEST_USER_ID = `bench_${randomBytes(4).toString('hex')}`;
const NUM_KEYS = 50;
const LOGS_PER_KEY = 100;

async function setup() {
  console.log(`Setting up benchmark data for user ${TEST_USER_ID}...`);

  // Create user
  await db.insert(users).values({
    id: TEST_USER_ID,
    email: `${TEST_USER_ID}@example.com`,
    name: "Benchmark User",
    picture: "https://example.com/pic.jpg",
    emailVerified: true,
  });

  // Create keys
  const keysToInsert = [];
  for (let i = 0; i < NUM_KEYS; i++) {
    keysToInsert.push({
      userId: TEST_USER_ID,
      name: `Bench Key ${i}`,
      keyPrefix: `bench_${i}`,
      keyHash: `hash_${i}`,
      tier: 'free',
      isActive: true,
    });
  }
  const keys = await db.insert(apiKeys).values(keysToInsert).returning();

  // Create usage logs
  const logsToInsert = [];
  const today = new Date();
  for (const key of keys) {
    for (let j = 0; j < LOGS_PER_KEY; j++) {
      logsToInsert.push({
        apiKeyId: key.id,
        userId: TEST_USER_ID,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTimeMs: 10 + Math.random() * 100,
        createdAt: today,
      });
    }
  }

  // Insert logs in chunks to avoid SQL variable limit
  const CHUNK_SIZE = 50;
  for (let i = 0; i < logsToInsert.length; i += CHUNK_SIZE) {
    const chunk = logsToInsert.slice(i, i + CHUNK_SIZE);
    await db.insert(apiUsageLogs).values(chunk);
  }

  console.log(`Created ${keys.length} keys and ${logsToInsert.length} logs.`);
  return keys;
}

async function measureBaseline(keys: any[]) {
  console.log("Measuring baseline (iterative queries)...");
  const start = performance.now();

  const results = await Promise.all(keys.map(async (key) => {
    const count = await getTodayUsageCount(key.id);
    return { id: key.id, count };
  }));

  const end = performance.now();
  console.log(`Baseline took: ${(end - start).toFixed(2)}ms`);

  // Basic validation
  const total = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`Total usage count: ${total} (Expected: ${NUM_KEYS * LOGS_PER_KEY})`);

  return end - start;
}

async function measureOptimized(keys: any[]) {
  console.log("Measuring optimized (single query)...");
  const start = performance.now();

  const counts = await getTodayUsageCountsForKeys(keys.map(k => k.id));
  const results = keys.map(key => ({
    id: key.id,
    count: counts[key.id] || 0
  }));

  const end = performance.now();
  console.log(`Optimized took: ${(end - start).toFixed(2)}ms`);

  const total = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`Total usage count: ${total} (Expected: ${NUM_KEYS * LOGS_PER_KEY})`);

  return end - start;
}

async function cleanup() {
  console.log("Cleaning up...");
  await db.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, TEST_USER_ID));
  await db.delete(apiKeys).where(eq(apiKeys.userId, TEST_USER_ID));
  await db.delete(users).where(eq(users.id, TEST_USER_ID));
  console.log("Cleanup done.");
}

async function run() {
  try {
    const keys = await setup();
    const t1 = await measureBaseline(keys);
    const t2 = await measureOptimized(keys);
    console.log(`Speedup: ${(t1 / t2).toFixed(2)}x`);
  } catch (err) {
    console.error("Benchmark failed:", err);
  } finally {
    await cleanup();
  }
}

run();
