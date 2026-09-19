import Link from "next/link";
import { canWriteFinance, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerReport } from "@/components/partners/partner-report";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const session = await getSession();
  const splits = await prisma.partnerSplit.findMany({
    include: {
      partner: true,
      payout: { select: { claimNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">WHITE-LABEL / REFERRAL</p>
          <h1 className="mt-2 font-serif text-3xl text-brand-gold">
            Partner payouts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-white/70">
            Fee-sharing obligations tagged from BLACKGATE. Source of referral stays
            on the gate; the split lives here.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/api/export/partners">Export CSV</Link>
        </Button>
      </div>

      <PartnerReport
        canWrite={session ? canWriteFinance(session.user.role) : false}
        rows={splits.map((s) => ({
          id: s.id,
          partnerName: s.partner.name,
          claimNumber: s.payout.claimNumber,
          intakeNumber: s.intakeNumber,
          referralSource: s.referralSource,
          splitPercent: s.splitPercent,
          splitAmount: s.splitAmount,
          status: s.status,
        }))}
      />
    </div>
  );
}
