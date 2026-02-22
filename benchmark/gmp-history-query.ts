
import { db } from "../server/db";
import { ipos, gmpHistory } from "../shared/schema";
import { sql, eq, desc } from "drizzle-orm";

async function runBenchmark() {
  console.log("Setting up benchmark data...");
  const IPO_COUNT = 50;
  const HISTORY_PER_IPO = 1000;
  const RUNS = 100;

  // Cleanup old test data just in case
  await db.delete(gmpHistory).where(sql`ipo_id IN (SELECT id FROM ipos WHERE symbol LIKE 'BENCHMARK-%')`);
  await db.delete(ipos).where(sql`symbol LIKE 'BENCHMARK-%'`);

  // Create IPOs
  const ipoIds: number[] = [];
  for (let i = 0; i < IPO_COUNT; i++) {
    const [ipo] = await db.insert(ipos).values({
      symbol: `BENCHMARK-${i}`,
      companyName: `Benchmark Company ${i}`,
      priceRange: "100-200",
      status: "upcoming",
      gmp: 50
    }).returning();
    ipoIds.push(ipo.id);
  }

  // Create History
  console.log(`Inserting ${IPO_COUNT * HISTORY_PER_IPO} history records...`);
  const historyData: any[] = [];
  const now = new Date();
  for (const ipoId of ipoIds) {
    for (let j = 0; j < HISTORY_PER_IPO; j++) {
      historyData.push({
        ipoId,
        gmp: 50 + (j % 10),
        recordedAt: new Date(now.getTime() - j * 3600000) // 1 hour intervals
      });
    }
  }

  // Batch insert history to speed up setup
  const BATCH_SIZE = 500;
  for (let i = 0; i < historyData.length; i += BATCH_SIZE) {
    await db.insert(gmpHistory).values(historyData.slice(i, i + BATCH_SIZE));
  }

  console.log("Data setup complete. Starting benchmark...");

  let totalTime = 0;
  const start = performance.now();

  for (let i = 0; i < RUNS; i++) {
    const randomIpoId = ipoIds[Math.floor(Math.random() * ipoIds.length)];

    // Simulate the query used in api-v1.ts and storage.ts
    await db.select()
      .from(gmpHistory)
      .where(eq(gmpHistory.ipoId, randomIpoId))
      .orderBy(desc(gmpHistory.recordedAt));
  }

  const end = performance.now();
  totalTime = end - start;
  const avgTime = totalTime / RUNS;

  console.log(`\nBenchmark Results:`);
  console.log(`Total time for ${RUNS} queries: ${totalTime.toFixed(2)}ms`);
  console.log(`Average query time: ${avgTime.toFixed(2)}ms`);

  // Cleanup
  console.log("\nCleaning up...");
  await db.delete(gmpHistory).where(sql`ipo_id IN (SELECT id FROM ipos WHERE symbol LIKE 'BENCHMARK-%')`);
  await db.delete(ipos).where(sql`symbol LIKE 'BENCHMARK-%'`);
  console.log("Cleanup done.");
}

runBenchmark().catch(console.error);
