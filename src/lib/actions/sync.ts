"use server";

import { revalidatePath } from "next/cache";
import { canWriteFinance, requireSession, resolveSessionStaff } from "@/lib/auth";
import { logLedgerAudit } from "@/lib/actions/audit";
import { ingestSuiteClaims } from "@/lib/integrations/ingest-claims";

export type SyncResult =
  | { ok: true; dryRun: boolean; pulled: number; partners: number }
  | { ok: false; error: string };

export async function syncFromBlackboxAction(): Promise<SyncResult> {
  try {
    const session = await requireSession();
    const staff = await resolveSessionStaff(session);
    if (!staff || !canWriteFinance(staff.role)) {
      return { ok: false, error: "Sync requires ADMIN or FINANCE." };
    }

    const result = await ingestSuiteClaims();
    if (!result.ok) return result;

    await logLedgerAudit({
      actorId: staff.id,
      action: "BLACKBOX_SYNC",
      entityType: "ClaimSnapshot",
      summary: result.dryRun
        ? "BLACKBOX dry-run — local snapshots unchanged."
        : `Pulled ${result.pulled} claim snapshots from BLACKBOX (${result.source}).`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/claims");
    revalidatePath("/payouts");
    return {
      ok: true,
      dryRun: result.dryRun,
      pulled: result.pulled,
      partners: result.partners,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed.",
    };
  }
}
