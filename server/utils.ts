
/**
 * Recursively sanitizes an object or array by replacing values of sensitive keys.
 *
 * @param data The data to sanitize (object, array, or primitive)
 * @returns The sanitized data
 */
export function sanitizeResponse(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = sanitizeResponse(value);
    }
  }

  return sanitized;
}

/**
 * Checks if a key is considered sensitive.
 *
 * @param key The key to check
 * @returns True if the key is sensitive, false otherwise
 */
function isSensitiveKey(key: string): boolean {
  const sensitiveKeys = [
    'plainKey',
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'clientSecret',
    'client_secret',
    'access_token',
    'refresh_token',
    'authorization',
    'cookie',
    'api_key'
  ];

  const lowerKey = key.toLowerCase();
  return sensitiveKeys.some(k => lowerKey.includes(k.toLowerCase()) && !lowerKey.includes('id'));
}
