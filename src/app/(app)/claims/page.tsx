import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CLAIM_TYPE_LABELS, LOSS_TYPE_LABELS } from "@/lib/constants";
import { ClaimStatusBadge } from "@/components/status-badge";
import { refreshSuiteClaimsIfStale } from "@/lib/integrations/ingest-claims";
import type { ClaimType, LossType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await refreshSuiteClaimsIfStale();
  const requested = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const total = await prisma.claimSnapshot.count();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pageCount);
  const claims = await prisma.claimSnapshot.findMany({
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      claimNumber: true,
      primaryClaimant: true,
      lossType: true,
      isCatClaim: true,
      claimType: true,
      status: true,
      settlementAmount: true,
      demandAmount: true,
      estimatedValue: true,
      payouts: {
        where: { status: { not: "VOID" } },
        take: 1,
        select: { status: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">BLACKBOX overlay</p>
        <h1 className="mt-2 font-serif text-3xl text-brand-gold">Files</h1>
        <p className="mt-2 max-w-2xl text-sm text-brand-white/70">
          Read-only claim status from BLACKBOX. Open a file to apply fee math and
          manage the financial layer only.
        </p>
      </div>

      <div className="space-y-px bg-brand-white/10 xl:hidden">
        {claims.length === 0 ? (
          <p className="bg-brand-navy px-4 py-8 text-sm text-brand-slate">
            No BLACKBOX files yet. Opened claims in BLACKBOX appear here automatically.
          </p>
        ) : (
          claims.map((c) => (
            <Link
              key={c.id}
              href={`/claims/${c.id}`}
              className="flex items-start justify-between gap-3 bg-brand-navy px-4 py-4"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-brand-gold">{c.claimNumber}</p>
                <p className="mt-1 truncate text-sm text-brand-white/90">
                  {c.primaryClaimant}
                </p>
                <p className="mt-1 text-xs text-brand-slate">
                  {LOSS_TYPE_LABELS[c.lossType as LossType] ?? c.lossType}
                  {c.isCatClaim ? " · CAT" : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <ClaimStatusBadge status={c.status} />
                <p className="mt-2 font-mono text-xs text-brand-white">
                  {formatCurrency(
                    c.settlementAmount ?? c.demandAmount ?? c.estimatedValue
                  )}
                </p>
                <p className="mt-1 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-brand-slate">
                  {c.payouts[0]?.status ?? "No payout"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto border border-brand-gold/15 xl:block rounded-2xl">
        <table className="w-full text-left text-sm">
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
            {claims.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-sm text-brand-slate">
                  No BLACKBOX files yet. Opened claims in BLACKBOX appear here automatically.
                </td>
              </tr>
            ) : (
              claims.map((c) => (
              <tr key={c.id} className="border-b border-brand-white/5 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/claims/${c.id}`}
                    className="font-mono text-brand-gold hover:text-brand-white"
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
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-brand-slate">
            {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          {pageCount > 1 ? (
            <div className="flex gap-3 text-sm">
              {page > 1 ? (
                <Link href={page <= 2 ? "/claims" : `/claims?page=${page - 1}`} className="text-brand-gold">
                  Previous
                </Link>
              ) : (
                <span className="text-brand-slate">Previous</span>
              )}
              {page < pageCount ? (
                <Link href={`/claims?page=${page + 1}`} className="text-brand-gold">
                  Next
                </Link>
              ) : (
                <span className="text-brand-slate">Next</span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
