import { describe, it, expect } from 'vitest';
import { getRiskBadgeColor } from './scoring';

describe('getRiskBadgeColor', () => {
  it('should return "emerald" for "conservative" risk', () => {
    expect(getRiskBadgeColor('conservative')).toBe('emerald');
  });

  it('should return "amber" for "moderate" risk', () => {
    expect(getRiskBadgeColor('moderate')).toBe('amber');
  });

  it('should return "red" for "aggressive" risk', () => {
    expect(getRiskBadgeColor('aggressive')).toBe('red');
  });

  it('should return "gray" for unknown risk levels', () => {
    expect(getRiskBadgeColor('unknown')).toBe('gray');
    expect(getRiskBadgeColor('')).toBe('gray');
    expect(getRiskBadgeColor('very aggressive')).toBe('gray');
  });
});
