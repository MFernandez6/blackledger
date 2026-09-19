-- Enable RLS on ledger tables in the shared public schema.
-- Prisma connects as the postgres role (bypasses RLS). No policies are
-- created, so anon / authenticated Data API access sees zero rows.

ALTER TABLE "ledger_staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_fee_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_claim_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_payout_document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_partner_split" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_referral_tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_cash_flow_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ledger_audit_event" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "ledger_staff" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_fee_schedule" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_claim_snapshot" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_payout" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_payout_document" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_partner" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_partner_split" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_referral_tag" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_cash_flow_snapshot" FROM anon, authenticated;
REVOKE ALL ON TABLE "ledger_audit_event" FROM anon, authenticated;
