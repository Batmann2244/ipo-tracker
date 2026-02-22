import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { DatabaseStorage } from './storage';
import { db } from './db';
import { ipos } from '@shared/schema';

// Mock the db module
vi.mock('./db', async () => {
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const Database = (await import('better-sqlite3')).default;
  const schema = await import('@shared/schema');

  const sqlite = new Database(':memory:');
  const testDb = drizzle(sqlite, { schema });

  return {
    db: testDb
  };
});

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeAll(() => {
    // Initialize schema directly on the sqlite instance
    // We access the underlying better-sqlite3 instance from the drizzle object
    const sqlite = (db as any).session.client;

    // Create users table (required by authStorage inheritance)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // Create ipos table matching shared/schema.ts
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        company_name TEXT NOT NULL,
        price_range TEXT NOT NULL,
        total_shares TEXT,
        expected_date TEXT,
        status TEXT NOT NULL,
        description TEXT,
        sector TEXT,
        revenue_growth REAL,
        ebitda_margin REAL,
        pat_margin REAL,
        roe REAL,
        roce REAL,
        debt_to_equity REAL,
        pe_ratio REAL,
        pb_ratio REAL,
        sector_pe_median REAL,
        issue_size TEXT,
        fresh_issue REAL,
        ofs_ratio REAL,
        lot_size INTEGER,
        min_investment TEXT,
        gmp INTEGER,
        subscription_qib REAL,
        subscription_hni REAL,
        subscription_retail REAL,
        subscription_nii REAL,
        investor_gain_id INTEGER,
        basis_of_allotment_date TEXT,
        refunds_initiation_date TEXT,
        credit_to_demat_date TEXT,
        promoter_holding REAL,
        post_ipo_promoter_holding REAL,
        fundamentals_score REAL,
        valuation_score REAL,
        governance_score REAL,
        overall_score REAL,
        risk_level TEXT,
        red_flags TEXT,
        pros TEXT,
        ai_summary TEXT,
        ai_recommendation TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // Create watchlist table (needed for full schema validity, though not testing watchlist methods yet)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id),
        ipo_id INTEGER NOT NULL REFERENCES ipos(id),
        created_at INTEGER
      );
    `);
  });

  beforeEach(async () => {
    // Clear data before each test
    await db.delete(ipos);
    // Initialize storage
    storage = new DatabaseStorage();
  });

  const sampleIpo = {
    symbol: 'TESTIPO',
    companyName: 'Test Company Ltd',
    priceRange: '100-120',
    status: 'upcoming',
    sector: 'Technology',
    issueSize: '500 Cr',
    lotSize: 100,
    gmp: 50,
    minInvestment: '15000'
  };

  it('should create and retrieve an IPO', async () => {
    const created = await storage.createIpo(sampleIpo);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.symbol).toBe(sampleIpo.symbol);

    const retrieved = await storage.getIpo(created.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
  });

  it('should get IPO by symbol', async () => {
    await storage.createIpo(sampleIpo);
    const retrieved = await storage.getIpoBySymbol(sampleIpo.symbol);
    expect(retrieved).toBeDefined();
    expect(retrieved?.symbol).toBe(sampleIpo.symbol);
  });

  it('should filter IPOs by status', async () => {
    await storage.createIpo({ ...sampleIpo, symbol: 'IPO1', status: 'upcoming' });
    await storage.createIpo({ ...sampleIpo, symbol: 'IPO2', status: 'listed' });

    const upcoming = await storage.getIpos('upcoming');
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].symbol).toBe('IPO1');
  });

  it('should filter IPOs by sector', async () => {
    await storage.createIpo({ ...sampleIpo, symbol: 'IPO1', sector: 'Tech' });
    await storage.createIpo({ ...sampleIpo, symbol: 'IPO2', sector: 'Finance' });

    const techIpos = await storage.getIpos(undefined, 'Tech');
    expect(techIpos).toHaveLength(1);
    expect(techIpos[0].symbol).toBe('IPO1');
  });

  it('should upsert IPO (insert)', async () => {
    const result = await storage.upsertIpo(sampleIpo);
    expect(result.id).toBeDefined();
    const count = await storage.getIpoCount();
    expect(count).toBe(1);
  });

  it('should upsert IPO (update)', async () => {
    await storage.createIpo(sampleIpo);

    const updateData = { ...sampleIpo, gmp: 200 };
    const result = await storage.upsertIpo(updateData);

    expect(result.gmp).toBe(200);
    const count = await storage.getIpoCount();
    expect(count).toBe(1); // Should still be 1
  });

  it('should bulk upsert IPOs', async () => {
    const iposToInsert = [
      { ...sampleIpo, symbol: 'IPO1' },
      { ...sampleIpo, symbol: 'IPO2' }
    ];

    const results = await storage.bulkUpsertIpos(iposToInsert);
    expect(results).toHaveLength(2);

    const count = await storage.getIpoCount();
    expect(count).toBe(2);
  });

  it('should handle updates in bulk upsert', async () => {
    await storage.createIpo({ ...sampleIpo, symbol: 'IPO1', gmp: 50 });

    const iposToUpsert = [
      { ...sampleIpo, symbol: 'IPO1', gmp: 100 }, // Should update
      { ...sampleIpo, symbol: 'IPO2', gmp: 100 }  // Should insert
    ];

    const results = await storage.bulkUpsertIpos(iposToUpsert);
    expect(results).toHaveLength(2);

    const ipo1 = await storage.getIpoBySymbol('IPO1');
    expect(ipo1?.gmp).toBe(100);

    const count = await storage.getIpoCount();
    expect(count).toBe(2);
  });

  it('should delete an IPO', async () => {
    const created = await storage.createIpo(sampleIpo);
    await storage.deleteIpo(created.id);
    const retrieved = await storage.getIpo(created.id);
    expect(retrieved).toBeUndefined();
  });
});
