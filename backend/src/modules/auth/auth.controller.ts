import type { RequestHandler } from "express";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";

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

export const register: RequestHandler = async (req, res) => {
  try {
    const { name, email, password, role } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await argon2.hash(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    res.json({ token });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
