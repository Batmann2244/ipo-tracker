import { db } from "../server/db";
import { ipos, gmpHistory, type InsertIpo, type InsertGmpHistory } from "../shared/schema";
import { sql, eq, desc, inArray } from "drizzle-orm";

async function setupMockData(count: number, historyCount: number) {
  console.log(`Setting up ${count} mock IPOs with ${historyCount} history records each...`);

  const ipoIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const symbol = `BENCHMARK-${Math.random().toString(36).substring(7).toUpperCase()}-${i}`;
    const [insertedIpo] = await db.insert(ipos).values({
      symbol,
      companyName: `Benchmark Company ${i}`,
      priceRange: "100-200",
      status: "open",
      gmp: 10, // Base GMP
      expectedDate: new Date().toISOString(),
      issueSize: "100 Cr",
      lotSize: 10,
      minInvestment: "15000",
      description: "Benchmark description",
      sector: "Technology",
    }).returning({ id: ipos.id });

    ipoIds.push(insertedIpo.id);

    // Insert history
    const historyEntries: InsertGmpHistory[] = [];
    for (let j = 0; j < historyCount; j++) {
      const recordedAt = new Date();
      recordedAt.setDate(recordedAt.getDate() - j); // Decreasing dates

      historyEntries.push({
        ipoId: insertedIpo.id,
        gmp: 10 + j,
        gmpPercentage: (10 + j) / 100 * 100,
        recordedAt: recordedAt,
      });
    }

    // Batch insert history (Drizzle supports batch insert)
    await db.insert(gmpHistory).values(historyEntries);
  }

  return ipoIds;
}

async function cleanup(ipoIds: number[]) {
  console.log("Cleaning up mock data...");
  if (ipoIds.length > 0) {
    await db.delete(gmpHistory).where(inArray(gmpHistory.ipoId, ipoIds));
    await db.delete(ipos).where(inArray(ipos.id, ipoIds));
  }
  console.log("Cleanup complete.");
}

async function measureNPlusOne(ipoIds: number[]) {
  console.log("Measuring N+1 approach...");
  const start = performance.now();

  // Replicate the logic from server/routes/api-v1.ts
  const allIpos = await db.select({
    id: ipos.id,
    symbol: ipos.symbol,
    companyName: ipos.companyName,
    status: ipos.status,
    gmp: ipos.gmp,
    priceRange: ipos.priceRange,
  })
  .from(ipos)
  .where(inArray(ipos.id, ipoIds)); // Limit to our benchmark IPOs

  const gmpData = await Promise.all(allIpos.map(async (ipo) => {
    const [latestGmp] = await db.select()
      .from(gmpHistory)
      .where(eq(gmpHistory.ipoId, ipo.id))
      .orderBy(desc(gmpHistory.recordedAt))
      .limit(1);

    return {
      symbol: ipo.symbol,
      companyName: ipo.companyName,
      gmp: latestGmp?.gmp || ipo.gmp || 0,
      gmpPercentage: latestGmp?.gmpPercentage,
      priceRange: ipo.priceRange,
      updatedAt: latestGmp?.recordedAt,
    };
  }));

  const end = performance.now();
  console.log(`N+1 approach took: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function measureOptimized(ipoIds: number[]) {
  console.log("Measuring optimized approach...");
  const start = performance.now();

  // Optimized query logic
  // Fetch all relevant IPOs first
  const allIpos = await db.select({
    id: ipos.id,
    symbol: ipos.symbol,
    companyName: ipos.companyName,
    status: ipos.status,
    gmp: ipos.gmp,
    priceRange: ipos.priceRange,
  })
  .from(ipos)
  .where(inArray(ipos.id, ipoIds));

  // Fetch the latest GMP for all these IPOs in one go
  // Using a subquery approach with SQLite compatible syntax
  // Ideally, we want: SELECT * FROM gmp_history WHERE (ipo_id, recorded_at) IN (SELECT ipo_id, MAX(recorded_at) FROM gmp_history GROUP BY ipo_id)

  // Alternative: Fetch all history for these IPOs ordered by date desc, then process in memory if dataset is small enough.
  // But strictly speaking, we want to optimize the query.

  // Let's simulate fetching the MAX date for each IPO first, then joining.
  // Or just fetch all latest records if we can construct that query.

  // Strategy:
  // 1. Get latest dates per IPO
  // 2. Join back to get details

  // Using a raw SQL or careful construction with Drizzle
  // Since Drizzle's query builder might be verbose for this specific join, let's try a 2-step approach which is still O(1) in terms of query count (2 queries vs N+1).

  const latestDatesSq = db.select({
    ipoId: gmpHistory.ipoId,
    maxDate: sql<Date>`MAX(${gmpHistory.recordedAt})`.as('max_date'),
  })
  .from(gmpHistory)
  .where(inArray(gmpHistory.ipoId, ipoIds))
  .groupBy(gmpHistory.ipoId)
  .as('latest_dates');

  const latestGmps = await db.select({
    ipoId: gmpHistory.ipoId,
    gmp: gmpHistory.gmp,
    gmpPercentage: gmpHistory.gmpPercentage,
    recordedAt: gmpHistory.recordedAt,
  })
  .from(gmpHistory)
  .innerJoin(latestDatesSq,
    sql`${gmpHistory.ipoId} = ${latestDatesSq.ipoId} AND ${gmpHistory.recordedAt} = ${latestDatesSq.maxDate}`
  );

  // Map back to IPOs in memory
  const gmpMap = new Map(latestGmps.map(g => [g.ipoId, g]));

  const gmpData = allIpos.map(ipo => {
    const latestGmp = gmpMap.get(ipo.id);
    return {
      symbol: ipo.symbol,
      companyName: ipo.companyName,
      gmp: latestGmp?.gmp || ipo.gmp || 0,
      gmpPercentage: latestGmp?.gmpPercentage,
      priceRange: ipo.priceRange,
      updatedAt: latestGmp?.recordedAt,
    };
  });

  const end = performance.now();
  console.log(`Optimized approach took: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function runBenchmark() {
  const ipoCount = 50;
  const historyPerIpo = 50;
  let ipoIds: number[] = [];

  try {
    ipoIds = await setupMockData(ipoCount, historyPerIpo);

    // Warmup? Maybe not needed for this simple DB benchmark.

    const timeNPlusOne = await measureNPlusOne(ipoIds);
    const timeOptimized = await measureOptimized(ipoIds); // This implementation is a placeholder for what I intend to do

    console.log(`\nResults:`);
    console.log(`N+1 Query:    ${timeNPlusOne.toFixed(2)}ms`);
    console.log(`Optimized:    ${timeOptimized.toFixed(2)}ms`);
    console.log(`Improvement:  ${(timeNPlusOne / timeOptimized).toFixed(2)}x`);

  } catch (error) {
    console.error("Benchmark failed:", error);
  } finally {
    await cleanup(ipoIds);
    process.exit(0);
  }
}

runBenchmark();
