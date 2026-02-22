import { expect, test, describe } from 'vitest'
import { getScoreBadgeColor } from './scoring'

describe('getScoreBadgeColor', () => {
  test('returns emerald for scores >= 7.5', () => {
    expect(getScoreBadgeColor(7.5)).toBe('emerald')
    expect(getScoreBadgeColor(8)).toBe('emerald')
    expect(getScoreBadgeColor(10)).toBe('emerald')
  })

  test('returns blue for scores >= 6 and < 7.5', () => {
    expect(getScoreBadgeColor(6)).toBe('blue')
    expect(getScoreBadgeColor(7)).toBe('blue')
    expect(getScoreBadgeColor(7.4)).toBe('blue')
  })

  test('returns amber for scores >= 4 and < 6', () => {
    expect(getScoreBadgeColor(4)).toBe('amber')
    expect(getScoreBadgeColor(5)).toBe('amber')
    expect(getScoreBadgeColor(5.9)).toBe('amber')
  })

  test('returns red for scores < 4', () => {
    expect(getScoreBadgeColor(3.9)).toBe('red')
    expect(getScoreBadgeColor(3)).toBe('red')
    expect(getScoreBadgeColor(0)).toBe('red')
    expect(getScoreBadgeColor(-1)).toBe('red')
  })
})
