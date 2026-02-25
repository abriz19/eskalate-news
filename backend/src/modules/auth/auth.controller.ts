import type { RequestHandler } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { baseResponse } from "../../types/response.js";
import { prisma } from "../../lib/prisma.js";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#^()[\]{}\-_=+|\\:;"'<>,/`~]).+$/;
const JWT_EXPIRES_IN = "24h";

export const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(
      PASSWORD_REGEX,
      "Password must include uppercase, lowercase, number and special character",
    ),
  role: z.enum(["AUTHOR", "READER"]),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const register: RequestHandler = async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (parsed.error as { issues: Array<{ message: string }> }).issues.map(
          (e) => e.message,
        ),
      ),
    );
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res
      .status(409)
      .json(baseResponse(false, "Conflict", null, ["Email already exists"]));
    return;
  }

  const hashedPassword = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role },
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(201).json(baseResponse(true, "Registered", user, null));
};

export const login: RequestHandler = async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      baseResponse(
        false,
        "Validation failed",
        null,
        (parsed.error as { issues: Array<{ message: string }> }).issues.map(
          (e) => e.message,
        ),
      ),
    );
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res
      .status(401)
      .json(
        baseResponse(false, "Invalid credentials", null, [
          "Invalid credentials",
        ]),
      );
    return;
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) {
    res
      .status(401)
      .json(
        baseResponse(false, "Invalid credentials", null, [
          "Invalid credentials",
        ]),
      );
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res
      .status(500)
      .json(baseResponse(false, "Server error", null, ["Configuration error"]));
    return;
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  });
  res.json(baseResponse(true, "OK", { token }, null));
};
