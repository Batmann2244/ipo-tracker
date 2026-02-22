
import { describe, it, expect } from 'vitest';
import { sanitizeResponse } from './utils';

describe('sanitizeResponse', () => {
  it('should return null or undefined as is', () => {
    expect(sanitizeResponse(null)).toBe(null);
    expect(sanitizeResponse(undefined)).toBe(undefined);
  });

  it('should return primitive types as is', () => {
    expect(sanitizeResponse(123)).toBe(123);
    expect(sanitizeResponse('abc')).toBe('abc');
    expect(sanitizeResponse(true)).toBe(true);
  });

  it('should redact sensitive keys', () => {
    const input = {
      plainKey: 'secret-123',
      password: 'password123',
      token: 'jwt-token-val',
      api_key: 'xyz-api-key',
    };

    const output = sanitizeResponse(input);

    expect(output).toEqual({
      plainKey: '***REDACTED***',
      password: '***REDACTED***',
      token: '***REDACTED***',
      api_key: '***REDACTED***',
    });
  });

  it('should not redact non-sensitive keys', () => {
    const input = {
      id: 1,
      name: 'John Doe',
      role: 'admin',
      tokenId: '12345', // Should not be redacted due to 'id' exclusion
      userId: 'user-123', // Should not be redacted
    };

    const output = sanitizeResponse(input);

    expect(output).toEqual(input);
  });

  it('should recursively redact sensitive keys in nested objects', () => {
    const input = {
      user: {
        id: 1,
        apiKeys: {
          key: 'secret-key',
        },
        credentials: {
          password: 'pass',
        },
      },
    };

    const output = sanitizeResponse(input);

    expect(output.user.id).toBe(1);
    // 'apiKeys' matches 'apiKey', so the entire object is redacted
    expect(output.user.apiKeys).toBe('***REDACTED***');

    // 'credentials' does not match any sensitive key, so we recurse
    // Wait, does 'credentials' match? No.
    // 'password' matches.
    expect(output.user.credentials.password).toBe('***REDACTED***');
  });

  it('should handle arrays correctly', () => {
    const input = [
      { id: 1, token: 'secret' },
      { id: 2, token: 'secret2' },
    ];

    const output = sanitizeResponse(input);

    expect(output).toHaveLength(2);
    expect(output[0].token).toBe('***REDACTED***');
    expect(output[1].token).toBe('***REDACTED***');
  });

  it('should handle complex nested structures', () => {
    const input = {
      users: [
        {
          id: 1,
          profile: {
            secrets: {
              accessToken: 'abc',
            }
          }
        }
      ]
    };

    const output = sanitizeResponse(input);
    // 'secrets' matches 'secret', so it is redacted entirely
    expect(output.users[0].profile.secrets).toBe('***REDACTED***');
  });
});
