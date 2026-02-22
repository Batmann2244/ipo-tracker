import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAlertThresholds, AggregatedSubscriptionData, GmpData } from './multi-source-scraper';

describe('checkAlertThresholds', () => {
  const mockDate = new Date('2024-01-01T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockSubscription = (
    total: number | null,
    delta: number | null = null,
    symbol = 'TEST'
  ): AggregatedSubscriptionData => ({
    symbol,
    companyName: 'Test Company',
    qib: 10,
    hni: 10,
    retail: 10,
    total,
    sources: ['test'],
    confidence: 'high',
    timestamp: new Date(),
    previousTotal: delta && total ? total - delta : null,
    delta,
  });

  const createMockGmp = (
    gmp: number,
    symbol = 'TEST'
  ): GmpData => ({
    symbol,
    companyName: 'Test Company',
    gmp,
    expectedListing: null,
    trend: 'stable',
    source: 'test',
    timestamp: new Date(),
  });

  describe('Subscription Thresholds', () => {
    it('should not trigger alert for total subscription < 10', () => {
      const subData = [createMockSubscription(9.9)];
      const alerts = checkAlertThresholds(subData, [], new Map());
      expect(alerts).toHaveLength(0);
    });

    it('should trigger HIGH DEMAND warning for total subscription = 10', () => {
      const subData = [createMockSubscription(10)];
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'subscription_threshold',
        severity: 'warning',
        message: expect.stringContaining('HIGH DEMAND'),
        timestamp: mockDate,
      });
    });

    it('should trigger HIGH DEMAND warning for total subscription between 10 and 20', () => {
      const subData = [createMockSubscription(19.9)];
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
      expect(alerts[0].message).toContain('HIGH DEMAND');
    });

    it('should trigger EXTREME DEMAND critical alert for total subscription = 20', () => {
      const subData = [createMockSubscription(20)];
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'subscription_threshold',
        severity: 'critical',
        message: expect.stringContaining('EXTREME DEMAND'),
      });
    });

    it('should trigger EXTREME DEMAND critical alert for total subscription > 20', () => {
      const subData = [createMockSubscription(50)];
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toContain('EXTREME DEMAND');
    });

    it('should not trigger alert when total is null', () => {
      const subData = [createMockSubscription(null)];
      const alerts = checkAlertThresholds(subData, [], new Map());
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Momentum Alerts', () => {
    it('should not trigger momentum alert for delta < 5', () => {
      const subData = [createMockSubscription(10, 4.9)];
      // Note: total=10 will trigger HIGH DEMAND, but we check specifically that no MOMENTUM alert is added
      const alerts = checkAlertThresholds(subData, [], new Map());

      const momentumAlerts = alerts.filter(a => a.message.includes('MOMENTUM'));
      expect(momentumAlerts).toHaveLength(0);
    });

    it('should trigger MOMENTUM warning for delta = 5', () => {
      const subData = [createMockSubscription(8, 5)]; // total=8 (<10) so only momentum alert
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'subscription_threshold',
        severity: 'warning',
        message: expect.stringContaining('MOMENTUM'),
      });
    });

    it('should trigger MOMENTUM warning for delta > 5', () => {
      const subData = [createMockSubscription(8, 10)];
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('MOMENTUM');
    });

    it('should generate both demand and momentum alerts simultaneously', () => {
      const subData = [createMockSubscription(25, 6)]; // total=25 (>20) AND delta=6 (>5)
      const alerts = checkAlertThresholds(subData, [], new Map());

      expect(alerts).toHaveLength(2);
      expect(alerts.some(a => a.message.includes('EXTREME DEMAND'))).toBe(true);
      expect(alerts.some(a => a.message.includes('MOMENTUM'))).toBe(true);
    });
  });

  describe('GMP Alerts', () => {
    it('should not trigger alert if no previous GMP exists', () => {
      const gmpData = [createMockGmp(50)];
      const previousGmpMap = new Map<string, number>();

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);
      expect(alerts).toHaveLength(0);
    });

    it('should not trigger alert for stable GMP (change < 10%)', () => {
      const gmpData = [createMockGmp(105)]; // 5% increase from 100
      const previousGmpMap = new Map([['TEST', 100]]);

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);
      expect(alerts).toHaveLength(0);
    });

    it('should trigger info alert for GMP SPIKE (positive change >= 10%)', () => {
      const gmpData = [createMockGmp(110)]; // 10% increase from 100
      const previousGmpMap = new Map([['TEST', 100]]);

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'gmp_spike',
        severity: 'info',
        message: expect.stringContaining('GMP SPIKE'),
      });
    });

    it('should trigger warning alert for GMP DROP (negative change >= 10%)', () => {
      const gmpData = [createMockGmp(90)]; // 10% decrease from 100
      const previousGmpMap = new Map([['TEST', 100]]);

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: 'gmp_spike',
        severity: 'warning',
        message: expect.stringContaining('GMP DROP'),
      });
    });

    it('should not trigger alert if previous GMP was 0 (avoid division by zero)', () => {
      const gmpData = [createMockGmp(50)]; // Huge increase from 0
      const previousGmpMap = new Map([['TEST', 0]]);

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);
      expect(alerts).toHaveLength(0);
    });

    it('should correctly calculate change percent for negative GMPs', () => {
      // Previous: -10, Current: -20 (Change: -10).
      // changePercent = (-10 / abs(-10)) * 100 = -100%. Should trigger DROP.
      const gmpData = [createMockGmp(-20)];
      const previousGmpMap = new Map([['TEST', -10]]);

      const alerts = checkAlertThresholds([], gmpData, previousGmpMap);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('GMP DROP');
      expect(alerts[0].data.changePercent).toBe(-100);
    });
  });
});
