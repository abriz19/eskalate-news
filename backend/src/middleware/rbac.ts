import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { baseResponse } from "../types/response.js";
import type { IRequestUser } from "../types/types.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!JWT_SECRET) {
    res
      .status(500)
      .json(
        baseResponse(false, "Configuration error", null, [
          "Configuration error",
        ]),
      );
    return;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res
      .status(401)
      .json(
        baseResponse(false, "Unauthorized", null, ["Missing or invalid token"]),
      );
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: Role;
    };
    (req as unknown as IRequestUser).user = {
      sub: payload.sub,
      role: payload.role,
    };
    next();
  } catch {
    res
      .status(401)
      .json(
        baseResponse(false, "Unauthorized", null, ["Invalid or expired token"]),
      );
  }
};

export const optionalAuth: RequestHandler = (req, res, next) => {
  if (!JWT_SECRET) {
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }

  const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: Role };
  (req as unknown as IRequestUser).user = {
    sub: payload.sub,
    role: payload.role,
  };

  next();
};

export function requireRole(role: Role): RequestHandler {
  return (req, res, next) => {
    const r = req as unknown as IRequestUser;
    if (!r.user) {
      res
        .status(401)
        .json(baseResponse(false, "Unauthorized", null, ["Unauthorized"]));
      return;
    }
    if (r.user.role !== role) {
      res
        .status(403)
        .json(baseResponse(false, "Forbidden", null, ["Forbidden"]));
      return;
    }
    next();
  };
}
