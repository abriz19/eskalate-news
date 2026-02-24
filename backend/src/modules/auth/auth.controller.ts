import argon2 from "argon2";
import type { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Za-z ]+$/, "Name must contain only letters and spaces"),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#^()[\]{}\-_=+|\\:;"'<>,/`~]).+$/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  role: z.enum(["AUTHOR", "READER"], "Role must be either AUTHOR or READER"),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    return res.json({ token });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};
