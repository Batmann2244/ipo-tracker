
import { describe, it, expect } from 'vitest';
import { BaseScraper, IpoData, SubscriptionData, GmpData, ScraperResult } from '../server/services/scrapers/base';

// Mock abstract methods
class TestScraper extends BaseScraper {
  constructor() {
    super('TestScraper');
  }

  public async runPuppeteer(url: string) {
    return this.fetchWithPuppeteer(url);
  }

  async getIpos(): Promise<ScraperResult<IpoData>> { throw new Error('Not implemented'); }
  async getSubscriptions(): Promise<ScraperResult<SubscriptionData>> { throw new Error('Not implemented'); }
  async getGmp(): Promise<ScraperResult<GmpData>> { throw new Error('Not implemented'); }
}

describe('Puppeteer Benchmark', () => {
  it('benchmarks puppeteer launch time', async () => {
    const scraper = new TestScraper();
    const url = 'data:text/html,<html><body><h1>Hello World</h1></body></html>';
    const iterations = 5;

    console.log('Starting benchmark...');
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = Date.now();
      try {
        await scraper.runPuppeteer(url);
        console.log(`Iteration ${i + 1}: ${Date.now() - iterStart}ms`);
      } catch (e) {
        console.error(`Iteration ${i + 1} failed:`, e);
        throw e;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`Total time for ${iterations} iterations: ${totalTime}ms`);
    console.log(`Average time per iteration: ${totalTime / iterations}ms`);
  }, 60000); // Increased timeout
});
