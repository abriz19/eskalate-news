import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { baseResponse } from "../types/response.js";

export function errorFormatter(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    const issues = "issues" in err ? (err as { issues: Array<{ message: string }> }).issues : (err as { errors: Array<{ message: string }> }).errors;
    const messages = issues.map((e: { message: string }) => e.message).filter(Boolean);
    res.status(400).json(
      baseResponse(false, "Validation failed", null, messages.length > 0 ? messages : ["Invalid input"])
    );
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json(baseResponse(false, "Internal server error", null, [message]));
}
