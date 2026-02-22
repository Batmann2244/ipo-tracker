
import { db } from "../server/db";
import { ipos, type InsertIpo } from "@shared/schema";
import { sql } from "drizzle-orm";

async function runBenchmark() {
  const count = 100;
  const testData: InsertIpo[] = [];

  for (let i = 0; i < count; i++) {
    testData.push({
      symbol: `BENCHMARK_${i}`,
      companyName: `Benchmark Company ${i}`,
      status: "upcoming",
      priceRange: "100-200",
      issueSize: "1000",
      totalShares: "100000",
      expectedDate: new Date().toISOString(),
      description: "Benchmark Test",
      sector: "Tech",
      updatedAt: new Date(),
    });
  }

  console.log(`Benchmarking upsert for ${count} records...`);

  // Clean up before start
  await db.delete(ipos).where(sql`symbol LIKE 'BENCHMARK_%'`);

  // Measure Individual Upserts
  const startIndividual = performance.now();
  for (const ipo of testData) {
    await db.insert(ipos).values(ipo).onConflictDoUpdate({
        target: ipos.symbol,
        set: {
            companyName: ipo.companyName,
            updatedAt: new Date()
        }
    });
  }
  const endIndividual = performance.now();
  console.log(`Individual Upserts: ${(endIndividual - startIndividual).toFixed(2)}ms`);

  // Clean up
  await db.delete(ipos).where(sql`symbol LIKE 'BENCHMARK_%'`);

  // Measure Bulk Upsert
  const startBulk = performance.now();

  await db.insert(ipos).values(testData).onConflictDoUpdate({
      target: ipos.symbol,
      set: {
          companyName: sql`excluded.company_name`,
          updatedAt: new Date()
      }
  });

  const endBulk = performance.now();
  console.log(`Bulk Upserts: ${(endBulk - startBulk).toFixed(2)}ms`);

  // Clean up
  await db.delete(ipos).where(sql`symbol LIKE 'BENCHMARK_%'`);
  process.exit(0);
}

runBenchmark().catch(console.error);
