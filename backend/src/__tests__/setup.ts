/**
 * Runs once before each test file. Ensures test env has JWT_SECRET so auth and RBAC work.
 */
process.env.NODE_ENV = "test";
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-do-not-use-in-production";
}
