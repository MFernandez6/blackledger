# BLACKLEDGER™

Financial and payout tracking for **Blackline Public Adjusters LLC**.  
Contingency fee math, payout reconciliation, and cash-flow visibility across active BLACKLINE claims.

Runs beside [BLACKBOX](../blackbox) (`:3000`), [BLACKMIRROR](../blackmirror) (`:3001`), and [BLACKGATE](../blackgate) (`:3002`) on **port 3003**.

## Boundary

BLACKBOX is the source of truth for claim status. BLACKLEDGER overlays a financial layer only.

- Claim snapshots are **read-only** except when pulled from BLACKBOX.
- `GET /api/claims` and `GET /api/claims/:id` return snapshots.
- `POST|PUT|PATCH|DELETE /api/claims` and **every method** on `/api/claims/:id/status` return **405**.
- Payout create/update actions reject any payload that includes `status` / `claimStatus` as a claim-status field.

## Screens

| Surface | Route | Purpose |
|---|---|---|
| Firm ledger | `/dashboard` | Pipeline, realized YTD, receivables aging, ticker chart |
| Files | `/claims` | Read-only BLACKBOX overlay |
| Claim financials | `/claims/[id]` | Fee math + payout overlay |
| Reconciliation | `/payouts` | Mark disbursed, attach settlement docs |
| Partners | `/partners` | White-label / attorney fee-share |
| Schedules | `/schedules` | Contingency % by claim type, FL PA caps |
| Print / PDF | `/reports/print` | Accounting handoff |

## Fee schedules (Fla. Stat. § 626.854(11))

| Code | Cap |
|---|---|
| `PROPERTY` | 20% |
| `PROPERTY_CAT` | 10% (Governor-declared emergency) |
| `PIP` | 20% |
| `DENIED_CLAIM` | 20% |

The application will not persist a contracted rate above the statutory cap.

## Local setup

```bash
cp .env.example .env
cp .env.example .env.local
npm install
npx prisma db push
ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

| Role | Email | Password |
|---|---|---|
| Admin | `miguel@blacklinepa.com` | `Password123!` |
| Finance | `finance@blacklinepa.com` | `Password123!` |
| Viewer | `viewer@blacklinepa.com` | `Password123!` |

SQLite (`prisma/dev.db`) is the local default.

## Integrations

| Direction | Endpoint | Notes |
|---|---|---|
| Inbound | `POST /api/referral-tags` | BLACKGATE fee-bearing sources. Header `Authorization: Bearer $BLACKLEDGER_API_KEY` |
| Outbound | BLACKBOX `GET /api/ledger/claims` | Read-only claim / settlement pull |
| Outbound | BLACKGATE `GET /api/ledger/partners` | Partner / referral identity for splits |
| Export | `GET /api/export/payouts` | CSV |
| Export | `GET /api/export/partners` | CSV |
| Export | `GET /api/export/cash-flow` | CSV |

When `BLACKBOX_DRY_RUN=1` or no BLACKBOX API key is set, Pull BLACKBOX is a no-op and the seeded snapshots remain.

### Example BLACKGATE referral tag

```bash
curl -X POST http://localhost:3003/api/referral-tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-ledger-key" \
  -d '{
    "intakeNumber": "BG-26-0042",
    "claimNumber": "BL-26-0016",
    "partnerName": "Rivera Law",
    "referringContact": "Ana Rivera, Esq.",
    "feeTerms": "10% of PA fee on recovery",
    "feePercent": 10
  }'
```

## Roles

| Role | Access |
|---|---|
| ADMIN | Fee schedules + payout writes + sync |
| FINANCE | Payouts, documents, partner splits — no schedule edits |
| VIEWER | Read-only |

## Visual language

Matches the forensic BLACKLINE palette:

- Background `#0F1C2E`, text `#F4F4F4`, hairlines `#2A2A2A`
- Border radius `0`
- Accent is desaturated forest `#5C7A68` — financial, not money-green
- JetBrains Mono for figures / claim numbers; Inter for body; Cinzel for display
# blackledger
