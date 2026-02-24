import { Role } from "@prisma/client";

export interface IRequestUser extends Request {
  user: {
    sub: string;
    role: Role;
  };
}
