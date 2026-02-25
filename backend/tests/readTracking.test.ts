import {
  canLogRead,
  pruneReadTracking,
  resetReadTrackingForTests,
  READ_COOLDOWN_MS,
} from "../src/modules/articles/readTracking.js";

describe("Read tracking cooldown", () => {
  const articleId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const readerId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const guest = null;

  beforeEach(() => {
    resetReadTrackingForTests();
  });

  describe("canLogRead", () => {
    it("returns true on first read for (article, user)", () => {
      expect(canLogRead(articleId, readerId)).toBe(true);
    });

    it("returns false when same user reads same article again within 10s", () => {
      expect(canLogRead(articleId, readerId)).toBe(true);
      expect(canLogRead(articleId, readerId)).toBe(false);
    });

    it("returns true for same article by different user (different key)", () => {
      expect(canLogRead(articleId, readerId)).toBe(true);
      const otherUser = "cccccccc-cccc-cccc-cccc-cccccccccccc";
      expect(canLogRead(articleId, otherUser)).toBe(true);
    });

    it("returns true for same user reading different article", () => {
      expect(canLogRead(articleId, readerId)).toBe(true);
      const otherArticle = "dddddddd-dddd-dddd-dddd-dddddddddddd";
      expect(canLogRead(otherArticle, readerId)).toBe(true);
    });

    it("treats guest (null readerId) as distinct key: one log per article per guest within 10s", () => {
      expect(canLogRead(articleId, guest)).toBe(true);
      expect(canLogRead(articleId, guest)).toBe(false);
    });

    it("returns true again after cooldown window (simulated via reset)", () => {
      expect(canLogRead(articleId, readerId)).toBe(true);
      expect(canLogRead(articleId, readerId)).toBe(false);
      resetReadTrackingForTests();
      expect(canLogRead(articleId, readerId)).toBe(true);
    });
  });

  describe("cooldown window duration", () => {
    it("uses READ_COOLDOWN_MS of 10 seconds", () => {
      expect(READ_COOLDOWN_MS).toBe(10_000);
    });

    it("allows a new log after READ_COOLDOWN_MS has passed (time mock)", () => {
      const now = 1000;
      jest.useFakeTimers({ now });
      resetReadTrackingForTests();

      expect(canLogRead(articleId, readerId)).toBe(true);
      expect(canLogRead(articleId, readerId)).toBe(false);

      jest.advanceTimersByTime(READ_COOLDOWN_MS);
      expect(canLogRead(articleId, readerId)).toBe(true);

      jest.useRealTimers();
    });
  });

  describe("pruneReadTracking", () => {
    it("removes entries older than READ_COOLDOWN_MS so the same key can log again", () => {
      const now = 1000;
      jest.useFakeTimers({ now });
      resetReadTrackingForTests();

      expect(canLogRead(articleId, readerId)).toBe(true);
      expect(canLogRead(articleId, readerId)).toBe(false);

      jest.advanceTimersByTime(READ_COOLDOWN_MS + 1);
      pruneReadTracking();
      expect(canLogRead(articleId, readerId)).toBe(true);

      jest.useRealTimers();
    });
  });

  describe("resetReadTrackingForTests", () => {
    it("clears state so tests do not affect each other", () => {
      canLogRead(articleId, readerId);
      expect(canLogRead(articleId, readerId)).toBe(false);
      resetReadTrackingForTests();
      expect(canLogRead(articleId, readerId)).toBe(true);
    });
  });
});
