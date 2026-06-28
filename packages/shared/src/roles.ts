import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "ANALYST", "CUSTOMER"]);
export type Role = z.infer<typeof RoleSchema>;

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  ANALYST: "/insights",
  CUSTOMER: "/app",
};
