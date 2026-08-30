"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFeeScheduleAction } from "@/lib/actions/schedules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPercent } from "@/lib/utils";

export type ScheduleRow = {
  id: string;
  code: string;
  label: string;
  claimType: string;
  isCatClaim: boolean;
  contingencyPercent: number;
  statutoryCapPercent: number;
  statuteCite: string;
  notes: string | null;
};

export function ScheduleTable({
  rows,
  canEdit,
}: {
  rows: ScheduleRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(row: ScheduleRow) {
    const raw = drafts[row.id] ?? String(row.contingencyPercent);
    const n = Number(raw);
    setBusy(row.id);
    const res = await updateFeeScheduleAction({
      id: row.id,
      contingencyPercent: n,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${row.code} updated.`);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto border border-brand-white/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-brand-white/10">
            <th className="eyebrow px-4 py-3 font-normal">Schedule</th>
            <th className="eyebrow px-4 py-3 font-normal">Contingency</th>
            <th className="eyebrow px-4 py-3 font-normal">Statutory cap</th>
            <th className="eyebrow px-4 py-3 font-normal">Cite</th>
            {canEdit ? <th className="eyebrow px-4 py-3 font-normal"> </th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brand-white/5 last:border-0 align-top">
              <td className="px-4 py-4">
                <p className="font-mono text-brand-green-soft">{row.code}</p>
                <p className="mt-1 text-brand-white">{row.label}</p>
                {row.notes ? (
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-brand-slate">
                    {row.notes}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-4">
                {canEdit ? (
                  <Input
                    className="w-24 font-mono"
                    inputMode="decimal"
                    value={drafts[row.id] ?? String(row.contingencyPercent)}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                    }
                  />
                ) : (
                  <span className="font-mono">{formatPercent(row.contingencyPercent)}</span>
                )}
              </td>
              <td className="px-4 py-4 font-mono text-brand-white/80">
                {formatPercent(row.statutoryCapPercent)}
              </td>
              <td className="px-4 py-4 font-mono text-xs text-brand-slate">
                {row.statuteCite}
              </td>
              {canEdit ? (
                <td className="px-4 py-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() => save(row)}
                  >
                    Save
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
