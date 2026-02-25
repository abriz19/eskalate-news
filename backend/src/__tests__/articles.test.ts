/**
 * Unit tests for Articles API: public feed, create, update, delete, get my articles, get by id.
 * Prisma is mocked; JWT auth and RBAC (AUTHOR vs READER) are tested.
 */
import request from "supertest";
import {
  expectBaseResponse,
  expectPaginatedResponse,
  createAuthToken,
  TEST_USER_AUTHOR,
  TEST_USER_READER,
  TEST_ARTICLE_ID,
} from "./helpers.js";
import { resetReadTrackingForTests } from "../modules/articles/readTracking.js";

const mockArticleFindFirst = jest.fn();
const mockArticleFindMany = jest.fn();
const mockArticleFindUnique = jest.fn();
const mockArticleCreate = jest.fn();
const mockArticleUpdate = jest.fn();
const mockArticleCount = jest.fn();
const mockReadLogCreate = jest.fn();

jest.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    article: {
      findFirst: mockArticleFindFirst,
      findMany: mockArticleFindMany,
      findUnique: mockArticleFindUnique,
      create: mockArticleCreate,
      update: mockArticleUpdate,
      count: mockArticleCount,
    },
    readLog: { create: mockReadLogCreate },
  },
}));

import app from "../app.js";

describe("Articles API", () => {
  const authorToken = createAuthToken(TEST_USER_AUTHOR.id, "AUTHOR");
  const readerToken = createAuthToken(TEST_USER_READER.id, "READER");

  beforeEach(() => {
    jest.clearAllMocks();
    resetReadTrackingForTests();
  });

  describe("GET /api/articles (public feed)", () => {
    it("returns 200 and PaginatedResponse with list of published articles", async () => {
      const list = [
        {
          id: TEST_ARTICLE_ID,
          title: "Public Article",
          content: "Content here.",
          category: "Tech",
          authorId: TEST_USER_AUTHOR.id,
          createdAt: new Date(),
          author: { name: "Author User" },
        },
      ];
      mockArticleFindMany.mockResolvedValue(list);
      mockArticleCount.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/articles")
        .query({ page: 1, size: 10 })
        .expect(200);

      expectPaginatedResponse(res.body);
      expect(res.body.Object).toHaveLength(1);
      expect(res.body.PageNumber).toBe(1);
      expect(res.body.PageSize).toBe(10);
      expect(res.body.TotalSize).toBe(1);
    });

    it("returns 400 when query params are invalid", async () => {
      const res = await request(app)
        .get("/api/articles")
        .query({ page: -1, size: 999 })
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
    });
  });

  describe("POST /api/articles (create)", () => {
    const validBody = {
      title: "New Article",
      content: "This is at least fifty characters of content for the article body here.",
      category: "Tech",
    };

    it("returns 201 and BaseResponse with article when AUTHOR creates", async () => {
      const created = {
        id: TEST_ARTICLE_ID,
        ...validBody,
        status: "DRAFT",
        authorId: TEST_USER_AUTHOR.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockArticleCreate.mockResolvedValue(created);

      const res = await request(app)
        .post("/api/articles")
        .set("Authorization", `Bearer ${authorToken}`)
        .send(validBody)
        .expect(201);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Message).toBe("Created");
      expect(res.body.Object).toMatchObject({
        id: TEST_ARTICLE_ID,
        title: validBody.title,
        category: validBody.category,
        status: "DRAFT",
        authorId: TEST_USER_AUTHOR.id,
      });
    });

    it("returns 401 when no token is sent", async () => {
      const res = await request(app)
        .post("/api/articles")
        .send(validBody)
        .expect(401);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Unauthorized");
    });

    it("returns 403 when READER tries to create", async () => {
      const res = await request(app)
        .post("/api/articles")
        .set("Authorization", `Bearer ${readerToken}`)
        .send(validBody)
        .expect(403);

      expectBaseResponse(res.body);
      expect(res.body.Errors).toContain("Forbidden");
    });

    it("returns 401 when token is invalid", async () => {
      const res = await request(app)
        .post("/api/articles")
        .set("Authorization", "Bearer invalid-jwt")
        .send(validBody)
        .expect(401);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
    });

    it("returns 400 when body fails validation (e.g. short content)", async () => {
      const res = await request(app)
        .post("/api/articles")
        .set("Authorization", `Bearer ${authorToken}`)
        .send({ title: "Short", content: "tiny", category: "X" })
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Validation failed");
    });
  });

  describe("GET /api/articles/me", () => {
    it("returns 200 and PaginatedResponse for AUTHOR", async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/articles/me")
        .set("Authorization", `Bearer ${authorToken}`)
        .expect(200);

      expectPaginatedResponse(res.body);
      expect(res.body.Object).toEqual([]);
    });

    it("returns 403 for READER", async () => {
      const res = await request(app)
        .get("/api/articles/me")
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(403);

      expectBaseResponse(res.body);
      expect(res.body.Errors).toContain("Forbidden");
    });

    it("returns 401 when no token", async () => {
      await request(app).get("/api/articles/me").expect(401);
    });
  });

  describe("GET /api/articles/:id (single article with read tracking)", () => {
    // Use same UUID as in path so param validation passes (Zod 4 strict UUID).
    const article = {
      id: TEST_ARTICLE_ID,
      title: "One Article",
      content: "Enough content here for validation.",
      category: "News",
      status: "PUBLISHED" as const,
      authorId: TEST_USER_AUTHOR.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { name: "Author User" },
    };

    it("returns 200 and BaseResponse when article exists and is not deleted", async () => {
      mockArticleFindFirst.mockResolvedValue(article);
      mockReadLogCreate.mockResolvedValue({});

      const res = await request(app)
        .get(`/api/articles/${TEST_ARTICLE_ID}`)
        .expect(200);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Object).toMatchObject({
        id: TEST_ARTICLE_ID,
        title: article.title,
        status: "PUBLISHED",
      });
      // Read log may be created async; allow it to have been called
      await new Promise((r) => setImmediate(r));
      expect(mockReadLogCreate).toHaveBeenCalledWith({
        data: { articleId: TEST_ARTICLE_ID, readerId: null },
      });
    });

    it("returns 404 when article does not exist", async () => {
      mockArticleFindFirst.mockResolvedValue(null);
      mockArticleFindUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/articles/${TEST_ARTICLE_ID}`)
        .expect(404);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Not found");
    });

    it("returns 410 when article is soft-deleted", async () => {
      mockArticleFindFirst.mockResolvedValue(null);
      mockArticleFindUnique.mockResolvedValue({
        id: TEST_ARTICLE_ID,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .get(`/api/articles/${TEST_ARTICLE_ID}`)
        .expect(410);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("News article no longer available");
    });

    it("returns 400 when id is not a valid UUID", async () => {
      const res = await request(app)
        .get("/api/articles/not-a-uuid")
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
    });

    it("does not create duplicate ReadLog for same article within 10s (cooldown)", async () => {
      mockArticleFindFirst.mockResolvedValue(article);
      mockReadLogCreate.mockResolvedValue({});

      // First request: allowed to log (guest)
      await request(app).get(`/api/articles/${TEST_ARTICLE_ID}`).expect(200);
      await new Promise((r) => setImmediate(r));

      // Second request within cooldown (same guest, same article): should not log again
      await request(app).get(`/api/articles/${TEST_ARTICLE_ID}`).expect(200);
      await new Promise((r) => setImmediate(r));

      expect(mockReadLogCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT /api/articles/:id", () => {
    const updateBody = { title: "Updated Title", status: "PUBLISHED" as const };

    it("returns 200 and updated article when AUTHOR owns the article", async () => {
      mockArticleFindFirst.mockResolvedValue({ id: TEST_ARTICLE_ID });
      mockArticleUpdate.mockResolvedValue({
        id: TEST_ARTICLE_ID,
        title: "Updated Title",
        content: "Original content.",
        category: "Tech",
        status: "PUBLISHED",
        authorId: TEST_USER_AUTHOR.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send(updateBody)
        .expect(200);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Object).toMatchObject({ title: "Updated Title", status: "PUBLISHED" });
    });

    it("returns 403 when READER tries to update", async () => {
      const res = await request(app)
        .put(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .send(updateBody)
        .expect(403);

      expectBaseResponse(res.body);
      expect(res.body.Errors).toContain("Forbidden");
    });

    it("returns 404 when article does not exist or is soft-deleted", async () => {
      mockArticleFindFirst.mockResolvedValue(null);
      mockArticleFindUnique.mockResolvedValue({
        authorId: TEST_USER_AUTHOR.id,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .put(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .send(updateBody)
        .expect(404);

      expectBaseResponse(res.body);
      expect(res.body.Message).toBe("Not found");
    });
  });

  describe("DELETE /api/articles/:id (soft delete)", () => {
    it("returns 200 and BaseResponse when AUTHOR deletes own article", async () => {
      mockArticleFindFirst.mockResolvedValue({
        id: TEST_ARTICLE_ID,
        authorId: TEST_USER_AUTHOR.id,
      });
      mockArticleUpdate.mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .expect(200);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Message).toBe("Deleted");
      expect(res.body.Object).toBeNull();
    });

    it("returns 403 when READER tries to delete", async () => {
      const res = await request(app)
        .delete(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${readerToken}`)
        .expect(403);

      expectBaseResponse(res.body);
      expect(res.body.Errors).toContain("Forbidden");
    });

    it("returns 404 when article not found", async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/articles/${TEST_ARTICLE_ID}`)
        .set("Authorization", `Bearer ${authorToken}`)
        .expect(404);

      expectBaseResponse(res.body);
      expect(res.body.Message).toBe("Not found");
    });
  });
});
