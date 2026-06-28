import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

const MIN_PASSWORD = 8;

type Errors = { email?: string; password?: string; confirm?: string; form?: string };

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validate on the client so users get clear, immediate feedback instead of a terse 400.
    const next: Errors = {};
    if (form.password.length < MIN_PASSWORD) {
      next.password = `Password must be at least ${MIN_PASSWORD} characters.`;
    }
    if (form.confirm !== form.password) {
      next.confirm = "Passwords don't match.";
    }
    setErrors(next);
    if (next.password || next.confirm) return;

    setSubmitting(true);
    try {
      // `confirm` is a UI-only safeguard — only the chosen password reaches the API.
      const u = await register({ name: form.name, email: form.email, password: form.password });
      nav(ROLE_HOME[u.role]);
    } catch (err) {
      const msg = (err as Error).message;
      if (/already registered/i.test(msg)) {
        setErrors({ email: "That email is already registered — log in instead." });
      } else {
        setErrors({ form: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl">
          <GradientText>Create account</GradientText>
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input aria-label="Name" value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" aria-label="Email" value={form.email} onChange={set("email")} required />
          </Field>
          <Field label="Password" hint={`At least ${MIN_PASSWORD} characters`} error={errors.password}>
            <Input
              type={showPassword ? "text" : "password"}
              aria-label="Password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              required
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <Input
              type={showPassword ? "text" : "password"}
              aria-label="Confirm password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-400 select-none">
            <input
              type="checkbox"
              aria-label="Show password"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="accent-neon"
            />
            Show password
          </label>
          {errors.form && (
            <p className="text-sm text-rose-400" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>
        <div className="text-sm text-slate-400">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </GlassCard>
    </div>
  );
}
