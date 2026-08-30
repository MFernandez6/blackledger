"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SettlementUpload({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("payoutId", payoutId);
    setBusy(true);
    const res = await fetch("/api/upload", { method: "POST", body: data });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Upload failed.");
      return;
    }
    toast.success("Settlement document attached.");
    form.reset();
    router.refresh();
  }

  return (
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
      <div>
        <Label htmlFor={`doc-${payoutId}`}>Settlement document</Label>
        <input
          id={`doc-${payoutId}`}
          name="file"
          type="file"
          required
          className="mt-2 block text-xs text-brand-white/80"
        />
      </div>
      <Button size="sm" type="submit" variant="outline" disabled={busy}>
        {busy ? "Attaching…" : "Attach"}
      </Button>
    </form>
  );
}
