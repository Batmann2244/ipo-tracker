import { describe, it, expect } from 'vitest';
import { insertAlertPreferencesSchema } from './schema';

describe('insertAlertPreferencesSchema', () => {
  it('should validate with only required fields (userId)', () => {
    const data = {
      userId: 'user-123',
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expect.objectContaining({ userId: 'user-123' }));
    }
  });

  it('should validate with all fields provided', () => {
    const data = {
      userId: 'user-123',
      emailEnabled: true,
      email: 'test@example.com',
      telegramEnabled: true,
      telegramChatId: 'chat-123',
      alertOnNewIpo: false,
      alertOnGmpChange: false,
      alertOnOpenDate: false,
      alertOnWatchlistOnly: true,
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(data);
    }
  });

  it('should fail validation when userId is missing', () => {
    const data = {
      email: 'test@example.com',
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
        const userIdError = result.error.issues.find(i => i.path.includes('userId'));
        expect(userIdError).toBeDefined();
    }
  });

  it('should fail validation with invalid data types', () => {
    const data = {
      userId: 'user-123',
      emailEnabled: 'invalid-boolean', // Should be boolean
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
        const emailEnabledError = result.error.issues.find(i => i.path.includes('emailEnabled'));
        expect(emailEnabledError).toBeDefined();
    }
  });

  it('should strip unknown fields', () => {
    const data = {
      userId: 'user-123',
      unknownField: 'something',
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).unknownField).toBeUndefined();
    }
  });

  it('should ignore omitted fields (id, createdAt, updatedAt)', () => {
    const data = {
      userId: 'user-123',
      id: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = insertAlertPreferencesSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).id).toBeUndefined();
      expect((result.data as any).createdAt).toBeUndefined();
      expect((result.data as any).updatedAt).toBeUndefined();
    }
  });
});
