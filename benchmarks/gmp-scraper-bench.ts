
import { performance } from 'perf_hooks';

interface GmpData {
  symbol: string;
  companyName: string;
  gmp: number;
  expectedListing: number | null;
  trend: "rising" | "falling" | "stable";
  source: string;
  timestamp: Date;
}

function generateMockData(count: number): GmpData[] {
  const data: GmpData[] = [];
  for (let i = 0; i < count; i++) {
    // Generate duplicates by using modulo
    const id = i % (count / 2);
    data.push({
      symbol: `SYM${id}`,
      companyName: `Company ${id}`,
      gmp: Math.random() * 100,
      expectedListing: Math.random() * 200,
      trend: "stable",
      source: "source1",
      timestamp: new Date(),
    });
  }
  return data;
}

function runOriginal(items: GmpData[]) {
  const allGmpData: GmpData[] = [];
  const start = performance.now();

  for (const item of items) {
    const symbol = item.symbol;
    if (symbol && symbol.length >= 3) {
      const existing = allGmpData.find(g => g.symbol === symbol);
      if (!existing) {
        allGmpData.push(item);
      }
    }
  }

  const end = performance.now();
  return { time: end - start, count: allGmpData.length };
}

function runOptimized(items: GmpData[]) {
  const allGmpMap = new Map<string, GmpData>();
  const start = performance.now();

  for (const item of items) {
    const symbol = item.symbol;
    if (symbol && symbol.length >= 3) {
        if (!allGmpMap.has(symbol)) {
            allGmpMap.set(symbol, item);
        }
    }
  }
  const allGmpData = Array.from(allGmpMap.values());

  const end = performance.now();
  return { time: end - start, count: allGmpData.length };
}

function main() {
  const N = 20000;
  console.log(`Generating ${N} items with duplicates...`);
  const items = generateMockData(N);

  console.log('Running Original Implementation...');
  const res1 = runOriginal(items);
  console.log(`Original: ${res1.time.toFixed(2)}ms, items: ${res1.count}`);

  console.log('Running Optimized Implementation...');
  const res2 = runOptimized(items);
  console.log(`Optimized: ${res2.time.toFixed(2)}ms, items: ${res2.count}`);

  console.log(`Speedup: ${(res1.time / res2.time).toFixed(2)}x`);
}

main();
