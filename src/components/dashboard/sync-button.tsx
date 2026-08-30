"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncFromBlackboxAction } from "@/lib/actions/sync";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSync() {
    setPending(true);
    const res = await syncFromBlackboxAction();
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.dryRun) {
      toast.message("BLACKBOX dry-run — local snapshots unchanged.");
    } else {
      toast.success(`Pulled ${res.pulled} claim snapshots.`);
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onSync}>
      {pending ? "Pulling…" : "Pull BLACKBOX"}
    </Button>
  );
}
