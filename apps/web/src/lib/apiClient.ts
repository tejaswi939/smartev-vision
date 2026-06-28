const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const json = { "Content-Type": "application/json" };

export const api = {
  get: (p: string) => fetch(`${BASE}${p}`, { credentials: "include" }).then(handle),
  post: (p: string, body?: unknown) =>
    fetch(`${BASE}${p}`, {
      method: "POST", credentials: "include", headers: json,
      body: body ? JSON.stringify(body) : undefined,
    }).then(handle),
  patch: (p: string, body?: unknown) =>
    fetch(`${BASE}${p}`, {
      method: "PATCH", credentials: "include", headers: json,
      body: body ? JSON.stringify(body) : undefined,
    }).then(handle),
};
