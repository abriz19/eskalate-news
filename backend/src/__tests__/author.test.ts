import request from "supertest";
import {
  expectBaseResponse,
  expectPaginatedResponse,
  createAuthToken,
  TEST_USER_AUTHOR,
  TEST_USER_READER,
  TEST_ARTICLE_ID,
} from "./helpers.js";

const mockArticleFindMany = jest.fn();
const mockArticleCount = jest.fn();

jest.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    article: {
      findFirst: jest.fn(),
      findMany: mockArticleFindMany,
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: mockArticleCount,
    },
    readLog: { create: jest.fn() },
  },
}));

import app from "../app.js";

describe("Author Dashboard API", () => {
  const authorToken = createAuthToken(TEST_USER_AUTHOR.id, "AUTHOR");
  const readerToken = createAuthToken(TEST_USER_READER.id, "READER");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and PaginatedResponse with dashboard items for AUTHOR", async () => {
    mockArticleFindMany.mockResolvedValue([
      {
        id: TEST_ARTICLE_ID,
        title: "My Article",
        createdAt: new Date("2026-02-25T10:00:00Z"),
        analytics: [{ viewCount: 10 }, { viewCount: 5 }],
      },
    ]);
    mockArticleCount.mockResolvedValue(1);

    const res = await request(app)
      .get("/api/author/dashboard")
      .set("Authorization", `Bearer ${authorToken}`)
      .query({ page: 1, size: 10 })
      .expect(200);

    expectPaginatedResponse(res.body);
    expect(res.body.Object).toHaveLength(1);
    expect(res.body.Object[0]).toMatchObject({
      id: TEST_ARTICLE_ID,
      title: "My Article",
      TotalViews: 15,
    });
    expect(res.body.PageNumber).toBe(1);
    expect(res.body.PageSize).toBe(10);
    expect(res.body.TotalSize).toBe(1);
  });

  it("returns 403 when READER calls dashboard", async () => {
    const res = await request(app)
      .get("/api/author/dashboard")
      .set("Authorization", `Bearer ${readerToken}`)
      .expect(403);

    expectBaseResponse(res.body);
    expect(res.body.Success).toBe(false);
    expect(res.body.Errors).toContain("Forbidden");
    expect(mockArticleFindMany).not.toHaveBeenCalled();
  });

  it("returns 401 when no token is sent", async () => {
    const res = await request(app)
      .get("/api/author/dashboard")
      .expect(401);

    expectBaseResponse(res.body);
    expect(res.body.Success).toBe(false);
  });

  it("returns 400 when query params are invalid", async () => {
    const res = await request(app)
      .get("/api/author/dashboard")
      .set("Authorization", `Bearer ${authorToken}`)
      .query({ page: 0, size: 100 })
      .expect(400);

    expectBaseResponse(res.body);
    expect(res.body.Success).toBe(false);
  });
});
