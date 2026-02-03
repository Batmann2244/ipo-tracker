export function castIntFloatStringValuesToIntFloat(data: any, roundDigits = 2): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => castIntFloatStringValuesToIntFloat(item, roundDigits));
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = castIntFloatStringValuesToIntFloat(value, roundDigits);
    }
    return result;
  }

  if (typeof data === 'string') {
    const trimmed = data.trim();
    
    if (trimmed !== '' && !isNaN(Number(trimmed))) {
      const num = Number(trimmed);
      
      if (Number.isInteger(num)) {
        return num;
      }
      
      return Math.round(num * Math.pow(10, roundDigits)) / Math.pow(10, roundDigits);
    }
  }

  return data;
}

export function parseValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => parseValues(item));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '' && !isNaN(Number(trimmed))) {
        result[key] = Number(trimmed);
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object') {
      result[key] = parseValues(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function formatUrl(url: string, ...args: any[]): string {
  let result = url;
  for (const arg of args) {
    result = result.replace('%s', encodeURIComponent(arg));
  }
  return result;
}

export function getNestedValue(obj: any, path: string, defaultValue: any = null): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const cloned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as object)) {
    cloned[key] = deepClone(value);
  }

  return cloned as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}
