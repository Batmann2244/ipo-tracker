import { describe, it, expect, vi } from "vitest";
import { batchProcess, batchProcessWithSSE, isRateLimitError } from "./utils";

describe("Batch Processing Utilities", () => {
  describe("isRateLimitError", () => {
    it("should identify 429 errors", () => {
      expect(isRateLimitError(new Error("Request failed with status code 429"))).toBe(true);
    });

    it("should identify RATELIMIT_EXCEEDED errors", () => {
      expect(isRateLimitError(new Error("RATELIMIT_EXCEEDED"))).toBe(true);
    });

    it("should identify quota errors", () => {
      expect(isRateLimitError(new Error("Quota exceeded"))).toBe(true);
    });

    it("should identify rate limit errors", () => {
      expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
    });

    it("should handle non-Error objects", () => {
      expect(isRateLimitError("Error: 429 Too Many Requests")).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isRateLimitError(new Error("Internal Server Error"))).toBe(false);
      expect(isRateLimitError(new Error("Not Found"))).toBe(false);
    });
  });

  describe("batchProcess", () => {
    it("should process all items correctly (Happy Path)", async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (item) => item * 2);
      const onProgress = vi.fn();

      const results = await batchProcess(items, processor, { onProgress });

      expect(results).toEqual([2, 4, 6]);
      expect(processor).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenLastCalledWith(3, 3, 3);
    });

    it("should respect concurrency limits", async () => {
      const items = [1, 2, 3, 4, 5];
      let active = 0;
      let maxActive = 0;

      const processor = async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 50));
        active--;
        return true;
      };

      await batchProcess(items, processor, { concurrency: 2 });

      expect(maxActive).toBeLessThanOrEqual(2);
    });

    it("should retry on rate limit errors", async () => {
      const processor = vi.fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValueOnce("success");

      const results = await batchProcess(["item"], processor, { retries: 3, minTimeout: 10 });

      expect(results).toEqual(["success"]);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it("should stop retrying after max retries", async () => {
      const processor = vi.fn().mockRejectedValue(new Error("429 Too Many Requests"));

      await expect(batchProcess(["item"], processor, { retries: 2, minTimeout: 1 })).rejects.toThrow("429 Too Many Requests");

      // Initial call + 2 retries = 3 calls
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it("should fail fast on non-rate-limit errors", async () => {
      const processor = vi.fn().mockRejectedValue(new Error("Generic Error"));

      await expect(batchProcess(["item"], processor, { retries: 3 })).rejects.toThrow("Generic Error");

      expect(processor).toHaveBeenCalledTimes(1);
    });

    it("should reject if any item fails", async () => {
      const items = [1, 2];
      const processor = vi.fn(async (item) => {
          if (item === 2) throw new Error("Fail");
          return item;
      });

      await expect(batchProcess(items, processor)).rejects.toThrow("Fail");
    });
  });

  describe("batchProcessWithSSE", () => {
    it("should process items sequentially and send SSE events (Happy Path)", async () => {
      const items = [1, 2];
      const processor = vi.fn(async (item) => item * 2);
      const sendEvent = vi.fn();

      const results = await batchProcessWithSSE(items, processor, sendEvent);

      expect(results).toEqual([2, 4]);
      expect(processor).toHaveBeenCalledTimes(2);

      // Check events
      // 1. started
      expect(sendEvent).toHaveBeenNthCalledWith(1, { type: "started", total: 2 });

      // 2. processing item 1
      expect(sendEvent).toHaveBeenNthCalledWith(2, { type: "processing", index: 0, item: 1 });

      // 3. progress item 1
      expect(sendEvent).toHaveBeenNthCalledWith(3, { type: "progress", index: 0, result: 2 });

      // 4. processing item 2
      expect(sendEvent).toHaveBeenNthCalledWith(4, { type: "processing", index: 1, item: 2 });

      // 5. progress item 2
      expect(sendEvent).toHaveBeenNthCalledWith(5, { type: "progress", index: 1, result: 4 });

      // 6. complete
      expect(sendEvent).toHaveBeenNthCalledWith(6, { type: "complete", processed: 2, errors: 0 });
    });

    it("should handle failures for individual items without stopping", async () => {
      const items = [1, 2, 3];
      const processor = vi.fn(async (item: number) => {
        if (item === 2) throw new Error("Fail");
        return item * 2;
      });
      const sendEvent = vi.fn();

      const results = await batchProcessWithSSE(items, processor, sendEvent, { retries: 0 });

      expect(results).toEqual([2, undefined, 6]);

      // Check error event for item 2
      const errorCall = sendEvent.mock.calls.find(call => call[0].type === "progress" && call[0].error);
      expect(errorCall).toBeDefined();
      expect(errorCall![0]).toEqual({
        type: "progress",
        index: 1,
        error: "Fail"
      });

      // Check complete event
      expect(sendEvent).toHaveBeenLastCalledWith({ type: "complete", processed: 3, errors: 1 });
    });

    it("should retry on rate limit errors in SSE mode", async () => {
      const processor = vi.fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests"))
        .mockResolvedValueOnce("success");
      const sendEvent = vi.fn();

      const results = await batchProcessWithSSE(["item"], processor, sendEvent, { retries: 3, minTimeout: 10 });

      expect(results).toEqual(["success"]);
      expect(processor).toHaveBeenCalledTimes(2);

      // Check events
      // 1. started
      expect(sendEvent).toHaveBeenNthCalledWith(1, { type: "started", total: 1 });
      // 2. processing
      expect(sendEvent).toHaveBeenNthCalledWith(2, { type: "processing", index: 0, item: "item" });
      // 3. progress success
      expect(sendEvent).toHaveBeenNthCalledWith(3, { type: "progress", index: 0, result: "success" });
      // 4. complete
      expect(sendEvent).toHaveBeenNthCalledWith(4, { type: "complete", processed: 1, errors: 0 });
    });
  });
});
