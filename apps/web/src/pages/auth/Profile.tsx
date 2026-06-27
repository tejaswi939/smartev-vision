import { useState } from "react";
import { useAuth } from "../../auth/AuthContext.js";
import { api } from "../../lib/apiClient.js";
import { Button, Field, Input, GlassCard, GradientText } from "../../components/ui/index.js";

export default function Profile() {
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.patch("/users/me", { name });
    await refreshMe();
    setSaved(true);
  }

  return (
    <div className="p-8 max-w-lg">
      <GlassCard className="space-y-4">
        <h1 className="font-display text-2xl">
          <GradientText>Profile</GradientText>
        </h1>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit">Save</Button>
          {saved && <span className="ml-3 text-teal text-sm">Saved</span>}
        </form>
      </GlassCard>
    </div>
  );
}
