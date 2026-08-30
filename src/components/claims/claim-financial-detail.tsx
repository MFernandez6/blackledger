"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPayoutAction, updatePayoutAction } from "@/lib/actions/payouts";
import { ClaimStatusBadge, PayoutStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CLAIM_TYPE_LABELS, LOSS_TYPE_LABELS, STATUTE_CITE } from "@/lib/constants";
import type { FeeComputation } from "@/lib/fee-math";
import type { ClaimType, LossType } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { format } from "date-fns";
import { SettlementUpload } from "@/components/payouts/settlement-upload";

export type DetailClaim = {
  id: string;
  blackboxClaimId: string;
  claimNumber: string;
  status: string;
  lossType: string;
  claimType: string;
  isCatClaim: boolean;
  dateOfLoss: string;
  propertyAddress: string;
  county: string;
  zipCode: string;
  carrierName: string | null;
  policyNumber: string | null;
  estimatedValue: number | null;
  demandAmount: number | null;
  settlementAmount: number | null;
  settlementDate: string | null;
  contingencyFeePercent: number;
  assignedAdjuster: string | null;
  primaryClaimant: string;
  intakeNumber: string | null;
  syncedAt: string;
};

export type DetailPayout = {
  id: string;
  status: string;
  feeEarned: number;
  feePercentApplied: number;
  statutoryCapPercent: number;
  capApplied: boolean;
  settlementAmount: number;
  disbursementDate: string | null;
  notes: string | null;
  documents: Array<{ id: string; fileName: string; fileUrl: string }>;
  splits: Array<{
    id: string;
    partnerName: string;
    splitPercent: number;
    splitAmount: number;
    status: string;
  }>;
};

export function ClaimFinancialDetail({
  claim,
  fee,
  payouts,
  canWrite,
}: {
  claim: DetailClaim;
  fee: FeeComputation;
  payouts: DetailPayout[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const openPayout = payouts.find((p) => p.status !== "VOID");

  async function openPayoutRecord() {
    setBusy(true);
    const res = await createPayoutAction({
      claimSnapshotId: claim.id,
      notes: notes || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Payout opened on the financial layer.");
    router.refresh();
  }

  async function markDisbursed(id: string) {
    setBusy(true);
    const res = await updatePayoutAction({ payoutId: id, status: "DISBURSED" });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Marked disbursed.");
    router.refresh();
  }

  const loss = LOSS_TYPE_LABELS[claim.lossType as LossType] ?? claim.lossType;
  const type = CLAIM_TYPE_LABELS[claim.claimType as ClaimType] ?? claim.claimType;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Claim-level financials</p>
          <h1 className="mt-2 font-mono text-2xl tracking-tight text-brand-white">
            {claim.claimNumber}
          </h1>
          <p className="mt-1 text-sm text-brand-white/75">{claim.primaryClaimant}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClaimStatusBadge status={claim.status} />
          {claim.isCatClaim ? (
            <span className="border border-brand-green/40 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-brand-green-soft">
              CAT · 10% cap
            </span>
          ) : null}
        </div>
      </div>

      <p className="border border-brand-white/10 bg-brand-navy-deep/40 px-4 py-3 text-xs leading-relaxed text-brand-slate">
        Status is mirrored from BLACKBOX and is read-only in this product. You may open a
        payout, attach settlement documents, and mark disbursement — you cannot change the
        file status from BLACKLEDGER.
      </p>

      <div className="grid gap-px bg-brand-white/10 lg:grid-cols-3">
        <div className="bg-brand-navy px-5 py-5 lg:col-span-2">
          <p className="eyebrow">BLACKBOX file</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Loss" value={`${loss} · ${type}`} />
            <Field
              label="Date of loss"
              value={format(new Date(claim.dateOfLoss), "MMM d, yyyy")}
            />
            <Field label="Property" value={`${claim.propertyAddress}`} />
            <Field label="Venue" value={`${claim.county} · ${claim.zipCode}`} />
            <Field label="Carrier" value={claim.carrierName} />
            <Field label="Policy" value={claim.policyNumber} />
            <Field label="Adjuster" value={claim.assignedAdjuster} />
            <Field label="Intake" value={claim.intakeNumber} />
          </dl>
        </div>
        <div className="bg-brand-navy px-5 py-5">
          <p className="eyebrow">Fee math</p>
          <p className="mt-4 font-mono text-3xl text-brand-green-soft">
            {formatCurrency(fee.feeEarned, { cents: true })}
          </p>
          <p className="mt-2 text-xs text-brand-slate">
            {formatPercent(fee.percentApplied)} of {fee.basis ?? "n/a"}{" "}
            {fee.basisAmount !== null
              ? formatCurrency(fee.basisAmount, { cents: true })
              : ""}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-brand-white/70">
            Contracted {formatPercent(fee.percentContracted)} · statutory cap{" "}
            {formatPercent(fee.statutoryCapPercent)}
            {fee.capApplied ? " · cap applied" : ""}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-brand-slate">
            {STATUTE_CITE}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-brand-white/10 sm:grid-cols-3">
        <Money label="Estimate" value={claim.estimatedValue} />
        <Money label="Demand" value={claim.demandAmount} />
        <Money label="Settlement" value={claim.settlementAmount} />
      </div>

      <section>
        <p className="eyebrow mb-3">Payouts</p>
        {payouts.length === 0 ? (
          <p className="mb-4 text-sm text-brand-slate">
            No financial overlay yet. Opening a payout does not change BLACKBOX status.
          </p>
        ) : (
          <div className="mb-4 space-y-3">
            {payouts.map((p) => (
              <div key={p.id} className="border border-brand-white/10 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PayoutStatusBadge status={p.status} />
                    <span className="font-mono text-brand-white">
                      {formatCurrency(p.feeEarned, { cents: true })}
                    </span>
                  </div>
                  {canWrite && p.status !== "DISBURSED" && p.status !== "VOID" ? (
                    <Button
                      size="sm"
                      variant="solid"
                      disabled={busy}
                      onClick={() => markDisbursed(p.id)}
                    >
                      Mark disbursed
                    </Button>
                  ) : null}
                </div>
                {p.notes ? (
                  <p className="mt-2 text-sm text-brand-white/70">{p.notes}</p>
                ) : null}
                {p.splits.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-brand-slate">
                    {p.splits.map((s) => (
                      <li key={s.id}>
                        {s.partnerName} · {formatPercent(s.splitPercent)} ·{" "}
                        {formatCurrency(s.splitAmount, { cents: true })} · {s.status}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.documents.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs">
                    {p.documents.map((d) => (
                      <li key={d.id}>
                        <a
                          href={d.fileUrl}
                          className="text-brand-green-soft hover:text-brand-white"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {canWrite && p.status !== "VOID" ? (
                  <SettlementUpload payoutId={p.id} />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canWrite && !openPayout && claim.settlementAmount ? (
          <div className="border border-brand-white/10 px-4 py-4">
            <Label htmlFor="payout-notes">Open payout</Label>
            <Textarea
              id="payout-notes"
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reconciliation note (optional)"
            />
            <Button
              className="mt-3"
              type="button"
              disabled={busy}
              onClick={openPayoutRecord}
            >
              Create payout record
            </Button>
          </div>
        ) : null}
      </section>

      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-slate">
        Snapshot synced {format(new Date(claim.syncedAt), "MMM d, yyyy · h:mm a")} · BLACKBOX id{" "}
        {claim.blackboxClaimId}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1 text-sm text-brand-white/90">{value || "—"}</dd>
    </div>
  );
}

function Money({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-brand-navy px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-mono text-xl text-brand-white">
        {formatCurrency(value, { cents: true })}
      </p>
    </div>
  );
}
