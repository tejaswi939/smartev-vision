import { useState } from "react";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/auth/forgot-password", { email });
    setSent(true);
  }

  return (
    <div className="min-h-full grid place-items-center p-6">
      <GlassCard className="w-full max-w-md space-y-4">
        <h1 className="font-display text-2xl">
          <GradientText>Forgot password</GradientText>
        </h1>
        {sent ? (
          <p className="text-slate-400">
            If that email exists, a reset link has been sent (check the server console in dev).
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <Input type="email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
