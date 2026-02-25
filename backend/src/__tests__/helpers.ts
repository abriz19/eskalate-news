/**
 * Test helpers: JWT creation, response shape matchers, and shared constants.
 */
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";

/** Create a valid JWT for the given user; use in Authorization: Bearer <token>. */
export function createAuthToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "1h" });
}

/** Assert that a JSON body has the standard BaseResponse shape (Object and Errors may be null). */
export function expectBaseResponse(body: unknown): void {
  expect(body).toBeDefined();
  expect(body).toHaveProperty("Success");
  expect(body).toHaveProperty("Message");
  expect(body).toHaveProperty("Object");
  expect(body).toHaveProperty("Errors");
  expect(typeof (body as Record<string, unknown>).Success).toBe("boolean");
  expect(typeof (body as Record<string, unknown>).Message).toBe("string");
}

/** Assert that a JSON body has the PaginatedResponse shape (Success, Message, Object array, PageNumber, PageSize, TotalSize, Errors). */
export function expectPaginatedResponse(body: unknown): void {
  expect(body).toMatchObject({
    Success: true,
    Message: expect.any(String),
    Object: expect.any(Array),
    PageNumber: expect.any(Number),
    PageSize: expect.any(Number),
    TotalSize: expect.any(Number),
    Errors: null,
  });
}

export const TEST_USER_AUTHOR = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Author User",
  email: "author@test.com",
  role: "AUTHOR" as Role,
};
export const TEST_USER_READER = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Reader User",
  email: "reader@test.com",
  role: "READER" as Role,
};
/** RFC 4122 UUID (Zod 4 validates strictly). */
export const TEST_ARTICLE_ID = "550e8400-e29b-41d4-a716-446655440000";
