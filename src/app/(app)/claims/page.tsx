import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CLAIM_TYPE_LABELS, LOSS_TYPE_LABELS } from "@/lib/constants";
import { ClaimStatusBadge } from "@/components/status-badge";
import type { ClaimType, LossType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const claims = await prisma.claimSnapshot.findMany({
    orderBy: { updatedAt: "desc" },
    include: { payouts: { where: { status: { not: "VOID" } }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">BLACKBOX overlay</p>
        <h1 className="mt-2 font-serif text-2xl tracking-[0.12em] text-brand-white">
          Files
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-white/70">
          Read-only claim status from BLACKBOX. Open a file to apply fee math and
          manage the financial layer only.
        </p>
      </div>

      <div className="overflow-x-auto border border-brand-white/10">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-white/10">
              <th className="eyebrow px-4 py-3 font-normal">Claim</th>
              <th className="eyebrow px-4 py-3 font-normal">Claimant</th>
              <th className="eyebrow px-4 py-3 font-normal">Type</th>
              <th className="eyebrow px-4 py-3 font-normal">Status</th>
              <th className="eyebrow px-4 py-3 text-right font-normal">Settlement</th>
              <th className="eyebrow px-4 py-3 font-normal">Payout</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-b border-brand-white/5 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/claims/${c.id}`}
                    className="font-mono text-brand-green-soft hover:text-brand-white"
                  >
                    {c.claimNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-brand-white/90">{c.primaryClaimant}</td>
                <td className="px-4 py-3 text-brand-slate">
                  {LOSS_TYPE_LABELS[c.lossType as LossType] ?? c.lossType}
                  {c.isCatClaim ? " · CAT" : ""}
                  <span className="ml-1 text-brand-white/40">
                    {CLAIM_TYPE_LABELS[c.claimType as ClaimType] ?? ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ClaimStatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatCurrency(c.settlementAmount ?? c.demandAmount ?? c.estimatedValue)}
                </td>
                <td className="px-4 py-3 uppercase tracking-[0.12em] text-brand-slate">
                  {c.payouts[0]?.status ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
