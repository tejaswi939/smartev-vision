import type { Role } from "../roles.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  age?: number | null;
  gender?: string | null;
  avatarUrl?: string | null;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
