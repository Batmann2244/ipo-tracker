import { db } from "../db";
import { scraperLogs } from "@shared/schema";
import { desc, eq, and, gte } from "drizzle-orm";
import { logger, getSourceLogger } from "../logger";

export type ScraperSource = 'chittorgarh' | 'groww' | 'nse' | 'nsetools' | 'investorgain' | 'ipoalerts' | 'aggregator';
export type ScraperOperation = 'ipos' | 'gmp' | 'subscription' | 'sync';
export type ScraperStatus = 'success' | 'error' | 'timeout';

export interface LogEntry {
  source: ScraperSource;
  operation: ScraperOperation;
  status: ScraperStatus;
  recordsCount?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface ScraperStats {
  source: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastSuccess: Date | null;
  lastError: Date | null;
  successRate: number;
}

class ScraperLogger {
  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date().toISOString();
    const statusIcon = entry.status === 'success' ? '✓' : entry.status === 'error' ? '✗' : '⏱';
    const timeInfo = entry.responseTimeMs ? ` (${entry.responseTimeMs}ms)` : '';
    const recordInfo = entry.recordsCount !== undefined ? ` - ${entry.recordsCount} records` : '';
    
    return `[${timestamp}] [${entry.source.toUpperCase()}] ${statusIcon} ${entry.operation}${timeInfo}${recordInfo}`;
  }

  async log(entry: LogEntry): Promise<void> {
    const message = this.formatMessage(entry);
    const meta = {
      source: entry.source,
      operation: entry.operation,
      recordsCount: entry.recordsCount,
      responseTimeMs: entry.responseTimeMs,
      metadata: entry.metadata,
      errorMessage: entry.errorMessage,
    };
    
    const sourceLogger = getSourceLogger(entry.source);

    if (entry.status === 'success') {
      sourceLogger.info(message, meta);
    } else if (entry.status === 'error') {
      sourceLogger.error(message, meta);
    } else {
      sourceLogger.warn(message, meta);
    }

    try {
      await db.insert(scraperLogs).values({
        source: entry.source,
        operation: entry.operation,
        status: entry.status,
        recordsCount: entry.recordsCount || 0,
        responseTimeMs: entry.responseTimeMs,
        errorMessage: entry.errorMessage,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      });
    } catch (err) {
      logger.error("[ScraperLogger] Failed to save log to database", { err });
    }
  }

  async logSuccess(source: ScraperSource, operation: ScraperOperation, recordsCount: number, responseTimeMs: number, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      source,
      operation,
      status: 'success',
      recordsCount,
      responseTimeMs,
      metadata,
    });
  }

  async logError(source: ScraperSource, operation: ScraperOperation, errorMessage: string, responseTimeMs?: number): Promise<void> {
    await this.log({
      source,
      operation,
      status: 'error',
      errorMessage,
      responseTimeMs,
    });
  }

  async logTimeout(source: ScraperSource, operation: ScraperOperation, responseTimeMs: number): Promise<void> {
    await this.log({
      source,
      operation,
      status: 'timeout',
      responseTimeMs,
      errorMessage: 'Request timed out',
    });
  }

  async getRecentLogs(limit: number = 50): Promise<typeof scraperLogs.$inferSelect[]> {
    return db
      .select()
      .from(scraperLogs)
      .orderBy(desc(scraperLogs.createdAt))
      .limit(limit);
  }

  async getLogsBySource(source: ScraperSource, limit: number = 20): Promise<typeof scraperLogs.$inferSelect[]> {
    return db
      .select()
      .from(scraperLogs)
      .where(eq(scraperLogs.source, source))
      .orderBy(desc(scraperLogs.createdAt))
      .limit(limit);
  }

  async getSourceStats(hoursBack: number = 24): Promise<ScraperStats[]> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const logs = await db
      .select()
      .from(scraperLogs)
      .where(gte(scraperLogs.createdAt, since))
      .orderBy(desc(scraperLogs.createdAt));

    const statsBySource: Record<string, {
      totalCalls: number;
      successCount: number;
      errorCount: number;
      totalResponseTime: number;
      lastSuccess: Date | null;
      lastError: Date | null;
    }> = {};

    for (const log of logs) {
      if (!statsBySource[log.source]) {
        statsBySource[log.source] = {
          totalCalls: 0,
          successCount: 0,
          errorCount: 0,
          totalResponseTime: 0,
          lastSuccess: null,
          lastError: null,
        };
      }

      const stats = statsBySource[log.source];
      stats.totalCalls++;
      
      if (log.status === 'success') {
        stats.successCount++;
        if (!stats.lastSuccess) stats.lastSuccess = log.createdAt;
      } else {
        stats.errorCount++;
        if (!stats.lastError) stats.lastError = log.createdAt;
      }
      
      if (log.responseTimeMs) {
        stats.totalResponseTime += log.responseTimeMs;
      }
    }

    return Object.entries(statsBySource).map(([source, stats]) => ({
      source,
      totalCalls: stats.totalCalls,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      avgResponseTime: stats.totalCalls > 0 ? Math.round(stats.totalResponseTime / stats.totalCalls) : 0,
      lastSuccess: stats.lastSuccess,
      lastError: stats.lastError,
      successRate: stats.totalCalls > 0 ? Math.round((stats.successCount / stats.totalCalls) * 100) : 0,
    }));
  }

  async getHealthStatus(): Promise<{
    sources: { name: string; status: 'healthy' | 'degraded' | 'down'; lastCheck: Date | null }[];
    overallHealth: 'healthy' | 'degraded' | 'down';
  }> {
    const stats = await this.getSourceStats(1);
    
    const sources = ['chittorgarh', 'groww', 'nse', 'nsetools', 'investorgain', 'ipoalerts'].map(name => {
      const sourceStats = stats.find(s => s.source === name);
      
      if (!sourceStats || sourceStats.totalCalls === 0) {
        return { name, status: 'down' as const, lastCheck: null };
      }
      
      const status: 'healthy' | 'degraded' | 'down' = 
        sourceStats.successRate >= 80 ? 'healthy' :
        sourceStats.successRate >= 50 ? 'degraded' : 'down';
      
      return {
        name,
        status,
        lastCheck: sourceStats.lastSuccess || sourceStats.lastError,
      };
    });

    const healthyCounts = sources.filter(s => s.status === 'healthy').length;
    const overallHealth: 'healthy' | 'degraded' | 'down' = 
      healthyCounts >= 3 ? 'healthy' :
      healthyCounts >= 1 ? 'degraded' : 'down';

    return { sources, overallHealth };
  }
}

export const scraperLogger = new ScraperLogger();
