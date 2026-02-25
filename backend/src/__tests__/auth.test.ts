/**
 * Unit tests for Auth API: /api/auth/register, /api/auth/login.
 * Prisma and argon2 are mocked; no real DB or hashing.
 */
import request from "supertest";
import {
  expectBaseResponse,
  createAuthToken,
  TEST_USER_AUTHOR,
  TEST_USER_READER,
} from "./helpers.js";

// Mock Prisma before any module under test is loaded
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
jest.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, create: mockUserCreate },
    article: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    readLog: { create: jest.fn() },
  },
}));

// Mock argon2 so we don't depend on real hashing
jest.mock("argon2", () => ({
  hash: jest.fn().mockResolvedValue("mock-hashed-password"),
  verify: jest.fn().mockResolvedValue(true),
}));

// Load app after mocks (app mounts routes that use prisma and argon2)
import app from "../app.js";

describe("Auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    const validBody = {
      name: "New User",
      email: "new@test.com",
      password: "Str0ngP@ssw0rd!",
      role: "AUTHOR",
    };

    it("returns 201 and BaseResponse with user object when registration succeeds", async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        id: TEST_USER_AUTHOR.id,
        name: validBody.name,
        email: validBody.email,
        role: validBody.role,
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send(validBody)
        .expect(201);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Message).toBe("Registered");
      expect(res.body.Errors).toBeNull();
      expect(res.body.Object).toMatchObject({
        id: TEST_USER_AUTHOR.id,
        name: validBody.name,
        email: validBody.email,
        role: "AUTHOR",
      });
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: validBody.name,
            email: validBody.email,
            role: "AUTHOR",
            password: "mock-hashed-password",
          }),
        })
      );
    });

    it("returns 409 when email already exists", async () => {
      mockUserFindUnique.mockResolvedValue({ id: "existing", email: validBody.email });

      const res = await request(app)
        .post("/api/auth/register")
        .send(validBody)
        .expect(409);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Conflict");
      expect(res.body.Errors).toContain("Email already exists");
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it("returns 400 and validation errors when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Only Name" })
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Validation failed");
      expect(Array.isArray(res.body.Errors)).toBe(true);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("returns 400 when password does not meet complexity", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          ...validBody,
          password: "weak",
        })
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Errors).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    const validLogin = { email: "author@test.com", password: "Str0ngP@ssw0rd!" };

    it("returns 200 and BaseResponse with token object when credentials are valid", async () => {
      mockUserFindUnique.mockResolvedValue({
        id: TEST_USER_AUTHOR.id,
        email: TEST_USER_AUTHOR.email,
        password: "mock-hashed",
        role: TEST_USER_AUTHOR.role,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send(validLogin)
        .expect(200);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(true);
      expect(res.body.Message).toBe("OK");
      expect(res.body.Errors).toBeNull();
      expect(res.body.Object).toHaveProperty("token");
      expect(typeof res.body.Object.token).toBe("string");
    });

    it("returns 401 when user does not exist", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send(validLogin)
        .expect(401);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Invalid credentials");
      expect(res.body.Object).toBeNull();
    });

    it("returns 401 when password is wrong", async () => {
      const argon2 = await import("argon2");
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);
      mockUserFindUnique.mockResolvedValue({
        id: TEST_USER_AUTHOR.id,
        email: TEST_USER_AUTHOR.email,
        password: "hashed",
        role: TEST_USER_AUTHOR.role,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send(validLogin)
        .expect(401);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Invalid credentials");
    });

    it("returns 400 when body is invalid (e.g. missing email)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "only" })
        .expect(400);

      expectBaseResponse(res.body);
      expect(res.body.Success).toBe(false);
      expect(res.body.Message).toBe("Validation failed");
    });
  });
});
