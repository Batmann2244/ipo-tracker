
import { db } from "../server/db";
import { storage } from "../server/storage";
import { ipos, type InsertIpo } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

function generateMockIpos(count: number): InsertIpo[] {
  const result: InsertIpo[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      symbol: `TEST-${Math.random().toString(36).substring(7).toUpperCase()}-${i}`,
      companyName: `Test Company ${i}`,
      priceRange: "100-200",
      status: "upcoming",
      expectedDate: new Date().toISOString(),
      issueSize: "100 Cr",
      lotSize: 10,
      minInvestment: "15000",
      description: "Test description",
      sector: "Technology",
    });
  }
  return result;
}

async function measureIndividualUpserts(data: InsertIpo[]) {
  console.log(`Starting individual upserts for ${data.length} records...`);
  const start = performance.now();

  for (const ipo of data) {
    await db.insert(ipos).values(ipo).onConflictDoUpdate({
      target: ipos.symbol,
      set: {
        companyName: ipo.companyName,
        priceRange: ipo.priceRange,
        status: ipo.status,
        issueSize: ipo.issueSize,
        lotSize: ipo.lotSize,
        minInvestment: ipo.minInvestment,
        description: ipo.description,
        sector: ipo.sector,
        expectedDate: ipo.expectedDate,
        updatedAt: new Date()
      }
    });
  }

  const end = performance.now();
  console.log(`Individual upserts took: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function measureStorageBulkUpsert(data: InsertIpo[]) {
  console.log(`Starting storage.bulkUpsertIpos for ${data.length} records...`);
  const start = performance.now();

  await storage.bulkUpsertIpos(data);

  const end = performance.now();
  console.log(`storage.bulkUpsertIpos took: ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function runBenchmark() {
  const count = 100;
  console.log(`Generating ${count} mock records...`);
  const data1 = generateMockIpos(count);
  const data2 = generateMockIpos(count);

  try {
    const timeIndividual = await measureIndividualUpserts(data1);
    const timeStorage = await measureStorageBulkUpsert(data2);

    console.log(`\nResults:`);
    console.log(`Individual:   ${timeIndividual.toFixed(2)}ms`);
    console.log(`Storage Bulk: ${timeStorage.toFixed(2)}ms`);
    console.log(`Speedup:      ${(timeIndividual / timeStorage).toFixed(2)}x`);

    // Verification
    console.log("\nVerifying data integrity...");
    const sample = data2[0];
    const saved = await storage.getIpoBySymbol(sample.symbol);
    if (!saved) {
      throw new Error(`IPO ${sample.symbol} not found!`);
    }
    if (saved.companyName !== sample.companyName) {
      throw new Error(`IPO ${sample.symbol} company name mismatch! Expected ${sample.companyName}, got ${saved.companyName}`);
    }
    console.log("Verification passed.");

    console.log("\nVerifying partial update (regression check)...");
    // Insert a record with GMP using individual upsert (simulating prior state)
    const testSymbol = "TEST-REGRESSION";
    // Clean up first just in case
    await db.delete(ipos).where(eq(ipos.symbol, testSymbol));

    await db.insert(ipos).values({
        symbol: testSymbol,
        companyName: "Regression Test",
        priceRange: "10-20",
        status: "upcoming",
        gmp: 50 // Pre-existing GMP
    });

    // Now bulk upsert WITHOUT gmp field
    const partialUpdate = [{
        symbol: testSymbol,
        companyName: "Regression Test Updated", // Changed name
        priceRange: "10-20",
        status: "upcoming",
        // gmp is missing
    }];

    await storage.bulkUpsertIpos(partialUpdate as any);

    const check = await storage.getIpoBySymbol(testSymbol);
    if (!check) throw new Error("Regression test record not found");

    if (check.companyName !== "Regression Test Updated") {
         throw new Error("Partial update failed to update provided field");
    }
    if (check.gmp !== 50) {
         throw new Error(`Partial update wiped out existing field! Expected 50, got ${check.gmp}`);
    }
    console.log("Regression check passed: Existing GMP preserved.");

    // Cleanup regression test
    await db.delete(ipos).where(eq(ipos.symbol, testSymbol));

    // Cleanup
    console.log("\nCleaning up...");
    await db.delete(ipos).where(sql`symbol LIKE 'TEST-%'`);
    console.log("Cleanup done.");

    process.exit(0);
  } catch (err) {
    console.error("Benchmark/Verification failed:", err);
    process.exit(1);
  }
}

runBenchmark();
