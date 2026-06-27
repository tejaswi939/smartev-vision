import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string>();

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      const u = await register(form);
      nav(ROLE_HOME[u.role]);
    } catch (err) {
      setError((err as Error).message);
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
          <Field label="Email">
            <Input type="email" aria-label="Email" value={form.email} onChange={set("email")} required />
          </Field>
          <Field label="Password" error={error}>
            <Input type="password" aria-label="Password" value={form.password} onChange={set("password")} required />
          </Field>
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </form>
        <div className="text-sm text-slate-400">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </GlassCard>
    </div>
  );
}
