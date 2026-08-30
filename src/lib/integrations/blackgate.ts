/**
 * BLACKGATE is the source of truth for referral / partner identity.
 * Used to calculate PartnerSplit. No write-back of intake status.
 */

export type BlackgatePartner = {
  slug: string;
  name: string;
  brand?: string | null;
  sourceSlug?: string | null;
  defaultSplitPercent?: number | null;
};

export async function pullBlackgatePartners(): Promise<
  | { ok: true; dryRun: true; partners: BlackgatePartner[] }
  | { ok: true; dryRun: false; partners: BlackgatePartner[] }
  | { ok: false; error: string }
> {
  if (!process.env.BLACKGATE_API_KEY || !process.env.BLACKGATE_API_URL) {
    return { ok: true, dryRun: true, partners: [] };
  }

  const base = process.env.BLACKGATE_API_URL.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/ledger/partners`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.BLACKGATE_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `BLACKGATE ${res.status}: ${text.slice(0, 240)}` };
    }
    const data = (await res.json()) as { partners?: BlackgatePartner[] };
    return { ok: true, dryRun: false, partners: data.partners ?? [] };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "BLACKGATE request failed.",
    };
  }
}
