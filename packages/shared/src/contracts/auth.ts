import { z } from "zod";
import { RoleSchema } from "../roles.js";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  age: z.number().int().min(13).max(120).optional(),
  gender: z.string().max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(13).max(120).optional(),
  gender: z.string().max(40).optional(),
  avatarUrl: z.string().url().max(500).optional(),
});

export const updateRoleSchema = z.object({ role: RoleSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
