
import { db } from "../server/db";
import { users, apiKeys, apiUsageLogs } from "@shared/schema";
import { getTodayUsageCount, getTodayUsageCountsForKeys } from "../server/services/api-key-service";
import { sql, eq } from "drizzle-orm";

async function runBenchmark() {
  const userId = `bench-user-${Date.now()}`;

  console.log("Setting up benchmark data...");

  // 1. Setup User
  await db.insert(users).values({
    id: userId,
    email: `bench-${Date.now()}@example.com`,
    firstName: "Bench",
    lastName: "Mark"
  });

  // 2. Setup API Keys
  const keyCount = 50;
  const logsPerKey = 50;
  const apiKeyIds: number[] = [];

  // console.log(`Creating ${keyCount} API keys...`);
  for (let i = 0; i < keyCount; i++) {
    const [key] = await db.insert(apiKeys).values({
      userId,
      name: `Bench Key ${i}`,
      keyPrefix: `bench_${i}`,
      keyHash: `hash_${i}_${Date.now()}`,
      tier: "free",
      isActive: true
    }).returning();
    apiKeyIds.push(key.id);
  }

  // 3. Setup Usage Logs
  // console.log(`Creating ${logsPerKey} logs per key...`);
  const logsToInsert: any[] = [];
  const today = new Date();

  for (const keyId of apiKeyIds) {
    for (let j = 0; j < logsPerKey; j++) {
      logsToInsert.push({
        apiKeyId: keyId,
        userId,
        endpoint: "/api/test",
        method: "GET",
        statusCode: 200,
        responseTimeMs: 10,
        createdAt: today
      });
    }
  }

  // Batch insert logs
  const chunkSize = 100;
  for (let i = 0; i < logsToInsert.length; i += chunkSize) {
    await db.insert(apiUsageLogs).values(logsToInsert.slice(i, i + chunkSize));
  }

  console.log(`Setup complete. User ID: ${userId}, Keys: ${keyCount}, Total Logs: ${logsToInsert.length}`);

  // 4. Measure Baseline (N+1)
  console.log("Running baseline (N+1 queries)...");
  const start = performance.now();

  const resultsBaseline = await Promise.all(apiKeyIds.map(async (id) => {
    const count = await getTodayUsageCount(id);
    return { id, count };
  }));

  const end = performance.now();
  const baselineTime = end - start;
  console.log(`Baseline time: ${baselineTime.toFixed(2)}ms`);

  // 5. Measure Optimized
  console.log("Running optimized (1 query)...");
  const startOpt = performance.now();

  const resultsOpt = await getTodayUsageCountsForKeys(apiKeyIds);

  const endOpt = performance.now();
  const optTime = endOpt - startOpt;
  console.log(`Optimized time: ${optTime.toFixed(2)}ms`);
  console.log(`Speedup: ${(baselineTime / optTime).toFixed(2)}x`);

  // Verify counts
  console.log("Verifying results...");
  let mismatch = false;
  resultsBaseline.forEach(item => {
    const optCount = resultsOpt[item.id];
    if (optCount !== item.count) {
      console.error(`Mismatch for key ${item.id}: Baseline=${item.count}, Opt=${optCount}`);
      mismatch = true;
    }
  });

  if (!mismatch) {
    console.log("✅ Verification successful! Both methods returned identical counts.");
  } else {
    console.error("❌ Verification failed!");
  }

  // Cleanup
  console.log("Cleaning up...");
  await db.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, userId));
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

runBenchmark().catch(console.error);
