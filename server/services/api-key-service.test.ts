import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('API Key Service Integration', () => {
  let createApiKey: typeof import('./api-key-service').createApiKey;
  let testDb: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeAll(async () => {
    // 1. Setup in-memory database
    // We use better-sqlite3 in-memory database for fast, isolated integration tests.
    // The application uses SQLite in production (via better-sqlite3), so this setup mirrors the production environment closely.
    sqlite = new Database(':memory:');
    testDb = drizzle(sqlite, { schema });

    // 2. Create tables
    // Note: We are manually defining the schema here because:
    // a) The project does not currently have migration files generated (uses drizzle-kit push).
    // b) drizzle-orm does not support generating schema DDL at runtime for SQLite easily without drizzle-kit.
    // c) We want to avoid external dependencies like running 'drizzle-kit push' against the in-memory DB which is complex.
    // This SQL must be kept in sync with @shared/schema.ts manually.
    // We need users, subscriptions, and api_keys
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

      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id),
        tier TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        current_period_start INTEGER,
        current_period_end INTEGER,
        cancel_at_period_end INTEGER DEFAULT 0,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        tier TEXT NOT NULL DEFAULT 'free',
        is_active INTEGER DEFAULT 1,
        last_used_at INTEGER,
        expires_at INTEGER,
        created_at INTEGER,
        revoked_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER REFERENCES api_keys(id),
        user_id TEXT REFERENCES users(id),
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER,
        response_time_ms INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        request_body TEXT,
        error_message TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS daily_usage_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id),
        api_key_id INTEGER REFERENCES api_keys(id),
        date INTEGER NOT NULL,
        call_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        avg_response_time_ms REAL,
        created_at INTEGER
      );
    `);

    // 3. Mock the db module
    vi.doMock('../db', () => ({
      db: testDb,
    }));

    // 4. Import the service (which uses the mocked db)
    const module = await import('./api-key-service');
    createApiKey = module.createApiKey;
  });

  afterAll(() => {
    sqlite.close();
    vi.restoreAllMocks();
  });

  it('createApiKey should create a new API key for a user with default free tier', async () => {
    const userId = 'user-free';

    // Create user
    await testDb.insert(schema.users).values({
      id: userId,
      email: 'free@example.com',
    });

    // Call createApiKey (without subscription, should default to free)
    const { apiKey, plainKey } = await createApiKey(userId, 'Free Key');

    expect(apiKey).toBeDefined();
    expect(plainKey).toBeDefined();
    expect(apiKey.tier).toBe('free');
    expect(apiKey.userId).toBe(userId);
    expect(plainKey.startsWith(apiKey.keyPrefix)).toBe(true);

    // Verify in DB
    const [dbKey] = await testDb.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, apiKey.id));
    expect(dbKey).toBeDefined();
    expect(dbKey.keyHash).toBe(apiKey.keyHash);
  });

  it('createApiKey should create a new API key inheriting subscription tier', async () => {
    const userId = 'user-pro';

    // Create user
    await testDb.insert(schema.users).values({
      id: userId,
      email: 'pro@example.com',
    });

    // Create subscription
    await testDb.insert(schema.subscriptions).values({
      userId,
      tier: 'pro',
      status: 'active',
    });

    // Call createApiKey
    const { apiKey, plainKey } = await createApiKey(userId, 'Pro Key');

    expect(apiKey.tier).toBe('pro');
    expect(apiKey.userId).toBe(userId);

    // Verify in DB
    const [dbKey] = await testDb.select().from(schema.apiKeys).where(eq(schema.apiKeys.id, apiKey.id));
    expect(dbKey.tier).toBe('pro');
  });
});
