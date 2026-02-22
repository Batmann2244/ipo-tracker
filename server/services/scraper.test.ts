import { describe, it, expect, vi } from "vitest";

// Mock axios to prevent network calls from Nse instantiation
vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => ({
        get: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
      get: vi.fn(),
      head: vi.fn(),
    },
  };
});

// Mock Nse client
vi.mock("./scrapers/nse-client", () => {
  return {
    Nse: class {
      getUpcomingIpos = vi.fn();
      getCurrentIpos = vi.fn();
      getIpoList = vi.fn();
    },
  };
});

// Import after mocks
import { generateTimelineEvents } from "./scraper";

describe("generateTimelineEvents", () => {
  it("should generate events based on provided expectedDate", () => {
    const ipoId = 1;
    const expectedDate = "2023-10-25";
    const events = generateTimelineEvents(ipoId, expectedDate);

    expect(events).toHaveLength(7);

    // Check open date (offset 0)
    const openEvent = events.find(e => e.eventType === "open_date");
    expect(openEvent).toBeDefined();
    expect(openEvent?.eventDate).toBe("2023-10-25");

    // Check listing date (offset 10)
    const listingEvent = events.find(e => e.eventType === "listing");
    expect(listingEvent).toBeDefined();
    // 2023-10-25 + 10 days = 2023-11-04
    expect(listingEvent?.eventDate).toBe("2023-11-04");
  });

  it("should generate events based on fallback date when expectedDate is null", () => {
    const ipoId = 1;

    // Mock Date.now to ensure deterministic fallback date
    // 2023-01-01
    const mockNow = new Date("2023-01-01T00:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    const events = generateTimelineEvents(ipoId, null);

    // Fallback is +30 days from now = 2023-01-31
    const expectedBaseDate = new Date(mockNow + 30 * 24 * 60 * 60 * 1000);
    const expectedBaseDateStr = expectedBaseDate.toISOString().split('T')[0];

    const openEvent = events.find(e => e.eventType === "open_date");
    expect(openEvent?.eventDate).toBe(expectedBaseDateStr);

    vi.useRealTimers();
  });

  it("should set isConfirmed correctly when expectedDate is provided", () => {
    const ipoId = 1;
    const futureDate = "2099-01-01";

    const events = generateTimelineEvents(ipoId, futureDate);

    const drhpEvent = events.find(e => e.eventType === "drhp_filing"); // offset -30
    expect(drhpEvent?.isConfirmed).toBe(true);

    const openEvent = events.find(e => e.eventType === "open_date"); // offset 0
    expect(openEvent?.isConfirmed).toBe(true);

    const listingEvent = events.find(e => e.eventType === "listing"); // offset 10
    expect(listingEvent?.isConfirmed).toBe(false);
  });

  it("should set isConfirmed to false for all events when expectedDate is null", () => {
    const ipoId = 1;
    const events = generateTimelineEvents(ipoId, null);

    events.forEach(event => {
      expect(event.isConfirmed).toBe(false);
    });
  });
});
