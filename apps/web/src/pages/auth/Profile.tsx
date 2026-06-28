import { useEffect, useState } from "react";
import type { Role } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";
import {
  Button,
  Field,
  Input,
  GlassCard,
  GradientText,
  Badge,
  type BadgeTone,
} from "../../components/ui/index.js";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Other"];
const ROLE_TONE: Record<Role, BadgeTone> = { ADMIN: "violet", ANALYST: "neon", CUSTOMER: "teal" };
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  ANALYST: "Analyst",
  CUSTOMER: "Customer",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return letters.toUpperCase() || "?";
}

export default function Profile() {
  const { user, refreshMe } = useAuth();
  const [form, setForm] = useState({ name: "", age: "", gender: "", avatarUrl: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string>();

  // Populate the form once the signed-in user is available (and after a save refreshes it).
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      age: user.age != null ? String(user.age) : "",
      gender: user.gender ?? "",
      avatarUrl: user.avatarUrl ?? "",
    });
  }, [user]);

  if (!user) return <div className="p-8 text-slate-400">Loading…</div>;

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setStatus("idle");
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setStatus("saving");
    // Send only what the API accepts; omit empties (PATCH leaves those fields unchanged).
    const payload: { name: string; age?: number; gender?: string; avatarUrl?: string } = {
      name: form.name,
    };
    if (form.age) payload.age = Number(form.age);
    if (form.gender) payload.gender = form.gender;
    if (form.avatarUrl) payload.avatarUrl = form.avatarUrl;
    try {
      await api.patch("/users/me", payload);
      await refreshMe();
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError((err as Error).message);
    }
  }

  const previewAvatar = form.avatarUrl || user.avatarUrl || "";
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;
  // Keep an existing gender value selectable even if it isn't one of the standard options.
  const genderOptions =
    user.gender && !GENDER_OPTIONS.includes(user.gender)
      ? [user.gender, ...GENDER_OPTIONS]
      : GENDER_OPTIONS;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="font-display text-3xl">
        <GradientText>Your profile</GradientText>
      </h1>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Summary */}
        <GlassCard className="space-y-4">
          <div className="flex flex-col items-center text-center gap-4">
            {previewAvatar ? (
              <img
                src={previewAvatar}
                alt={user.name}
                className="h-28 w-28 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div
                className="h-28 w-28 rounded-2xl grid place-items-center text-3xl font-display text-white
                           bg-gradient-to-br from-neon/30 to-violet/30 border border-white/10"
                aria-hidden="true"
              >
                {initials(user.name)}
              </div>
            )}
            <div className="space-y-2">
              <div className="font-display text-xl">{user.name}</div>
              <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>
          <dl className="space-y-2 text-sm pt-3 border-t border-white/10">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-200 truncate">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Age</dt>
              <dd className="text-slate-200">{user.age ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Gender</dt>
              <dd className="text-slate-200 capitalize">{user.gender ?? "—"}</dd>
            </div>
            {memberSince && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Member since</dt>
                <dd className="text-slate-200">{memberSince}</dd>
              </div>
            )}
          </dl>
        </GlassCard>

        {/* Edit */}
        <GlassCard className="space-y-4">
          <h2 className="font-display text-lg text-slate-200">Edit profile</h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name">
                <Input aria-label="Name" value={form.name} onChange={set("name")} required minLength={2} />
              </Field>
              <Field label="Age">
                <Input
                  type="number"
                  aria-label="Age"
                  min={13}
                  max={120}
                  value={form.age}
                  onChange={set("age")}
                />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Gender">
                <select
                  aria-label="Gender"
                  value={form.gender}
                  onChange={set("gender")}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-neon outline-none"
                >
                  <option value="" className="bg-surface">
                    Prefer not to say
                  </option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g} className="bg-surface capitalize">
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Avatar URL" hint="Link to a square image">
                <Input
                  type="url"
                  aria-label="Avatar URL"
                  placeholder="https://…"
                  value={form.avatarUrl}
                  onChange={set("avatarUrl")}
                />
              </Field>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving…" : "Save changes"}
              </Button>
              {status === "saved" && (
                <span className="text-teal text-sm" role="status">
                  Saved ✓
                </span>
              )}
              {error && (
                <span className="text-rose-400 text-sm" role="alert">
                  {error}
                </span>
              )}
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
