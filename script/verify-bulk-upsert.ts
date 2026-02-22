import { storage } from "../server/storage";
import { db } from "../server/db";
import { ipos, type InsertIpo } from "@shared/schema";
import { sql } from "drizzle-orm";

async function verify() {
  console.log("Verifying bulkUpsertIpos...");
  const prefix = "VERIFY_TEST_";

  // Clean up existing
  await db.delete(ipos).where(sql`symbol LIKE ${prefix + '%'}`);

  // 1. Initial Insert
  const batch1: InsertIpo[] = [
    {
      symbol: prefix + "A",
      companyName: "Company A",
      status: "upcoming",
      priceRange: "100-200",
      // minimal required fields from schema
      // companyName, symbol, status, priceRange are not null
    },
    {
      symbol: prefix + "B",
      companyName: "Company B",
      status: "upcoming",
      priceRange: "100-200",
    }
  ];

  console.log("Inserting batch 1...");
  await storage.bulkUpsertIpos(batch1);

  const afterBatch1 = await storage.getIpos();
  const testIpos1 = afterBatch1.filter(i => i.symbol.startsWith(prefix));
  if (testIpos1.length !== 2) throw new Error(`Expected 2 IPOs, got ${testIpos1.length}`);

  // 2. Update and Insert (Upsert)
  const batch2: InsertIpo[] = [
    {
      symbol: prefix + "A", // Existing, should update name
      companyName: "Company A Updated",
      status: "upcoming",
      priceRange: "100-200",
    },
    {
      symbol: prefix + "C", // New
      companyName: "Company C",
      status: "upcoming",
      priceRange: "100-200",
    }
  ];

  console.log("Upserting batch 2...");
  await storage.bulkUpsertIpos(batch2);

  const afterBatch2 = await storage.getIpos();
  const testIpos2 = afterBatch2.filter(i => i.symbol.startsWith(prefix));

  if (testIpos2.length !== 3) throw new Error(`Expected 3 IPOs, got ${testIpos2.length}`);

  const companyA = testIpos2.find(i => i.symbol === prefix + "A");
  if (companyA?.companyName !== "Company A Updated") {
      throw new Error(`Expected Company A to be updated, got ${companyA?.companyName}`);
  }

  const companyC = testIpos2.find(i => i.symbol === prefix + "C");
  if (!companyC) {
      throw new Error(`Expected Company C to be inserted`);
  }

  console.log("✅ Verification successful!");

  // Clean up
  await db.delete(ipos).where(sql`symbol LIKE ${prefix + '%'}`);
  process.exit(0);
}

verify().catch((e) => {
    console.error(e);
    process.exit(1);
});
