import type { Request } from "express";
import type { Role } from "@prisma/client";

export interface IRequestUser extends Request {
  user: {
    sub: string;
    role: Role;
  };
}
