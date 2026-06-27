import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

export default function Reset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const token = params.get("token") ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await api.post("/auth/reset-password", { token, password });
      nav("/login");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl">
          <GradientText>Reset password</GradientText>
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="New password" error={error}>
            <Input type="password" aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full">
            Update password
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
