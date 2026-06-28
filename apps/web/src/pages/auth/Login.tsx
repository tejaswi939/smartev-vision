import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ROLE_HOME } from "@sev/shared";
import { useAuth } from "../../auth/AuthContext.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      const u = await login(email, password);
      nav(ROLE_HOME[u.role]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl">
          <GradientText>Welcome back</GradientText>
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <Input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" error={error}>
            <Input type="password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
        <div className="text-sm text-slate-400 flex justify-between">
          <Link to="/forgot">Forgot password?</Link>
          <Link to="/register">Create account</Link>
        </div>
      </GlassCard>
    </div>
  );
}
