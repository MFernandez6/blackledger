/**
 * BLACKBOX is the source of truth for claim status and settlement figures.
 * BLACKLEDGER only reads. There is no write-back of claim status.
 *
 * Prefer the shared Postgres `Claim` table (same Supabase project as BLACKBOX).
 * HTTP GET /api/ledger/claims remains available when an API key is configured.
 */

import { prisma } from "@/lib/prisma";
import type { ClaimType } from "@/lib/types";

export type BlackboxClaimRecord = {
  id: string;
  claimNumber: string;
  status: string;
  lossType: string;
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
  intakeNumber?: string | null;
};

export type BlackboxPull =
  | { ok: true; dryRun: false; source: "database" | "http"; claims: BlackboxClaimRecord[] }
  | { ok: true; dryRun: true; source: "dry-run"; claims: BlackboxClaimRecord[] }
  | { ok: false; error: string };

type ClaimRow = {
  id: string;
  claimNumber: string;
  status: string;
  lossType: string;
  isCatClaim: boolean;
  dateOfLoss: Date | string;
  propertyAddress: string;
  county: string;
  zipCode: string;
  carrierName: string | null;
  policyNumber: string | null;
  estimatedValue: number | null;
  demandAmount: number | null;
  settlementAmount: number | null;
  settlementDate: Date | string | null;
  contingencyFeePercent: number | null;
  assignedAdjuster: string | null;
  primaryClaimant: string | null;
};

export function claimTypeFromLoss(lossType: string, denied: boolean): ClaimType {
  if (denied) return "DENIED_CLAIM";
  if (lossType === "OTHER") return "PROPERTY";
  return "PROPERTY";
}

function isoDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapRow(row: ClaimRow): BlackboxClaimRecord {
  return {
    id: row.id,
    claimNumber: row.claimNumber,
    status: row.status,
    lossType: row.lossType,
    isCatClaim: Boolean(row.isCatClaim),
    dateOfLoss: isoDate(row.dateOfLoss) ?? new Date().toISOString(),
    propertyAddress: row.propertyAddress,
    county: row.county,
    zipCode: row.zipCode,
    carrierName: row.carrierName,
    policyNumber: row.policyNumber,
    estimatedValue: row.estimatedValue,
    demandAmount: row.demandAmount,
    settlementAmount: row.settlementAmount,
    settlementDate: isoDate(row.settlementDate),
    contingencyFeePercent: row.contingencyFeePercent ?? 20,
    assignedAdjuster: row.assignedAdjuster,
    primaryClaimant: row.primaryClaimant?.trim() || "—",
  };
}

async function pullFromSharedDatabase(): Promise<BlackboxPull> {
  try {
    const rows = await prisma.$queryRaw<ClaimRow[]>`
      SELECT
        c.id,
        c."claimNumber",
        c.status::text AS status,
        c."lossType"::text AS "lossType",
        c."isCatClaim",
        c."dateOfLoss",
        c."propertyAddress",
        c.county,
        c."zipCode",
        c."carrierName",
        c."policyNumber",
        c."estimatedValue"::float8 AS "estimatedValue",
        c."demandAmount"::float8 AS "demandAmount",
        c."settlementAmount"::float8 AS "settlementAmount",
        c."settlementDate",
        c."contingencyFeePercent"::float8 AS "contingencyFeePercent",
        a.name AS "assignedAdjuster",
        COALESCE(
          NULLIF(TRIM(CONCAT(p."firstName", ' ', p."lastName")), ''),
          NULLIF(TRIM(CONCAT(f."firstName", ' ', f."lastName")), ''),
          '—'
        ) AS "primaryClaimant"
      FROM "Claim" c
      LEFT JOIN "Adjuster" a ON a.id = c."assignedAdjusterId"
      LEFT JOIN LATERAL (
        SELECT "firstName", "lastName"
        FROM "Claimant"
        WHERE "claimId" = c.id AND "isPrimaryContact" = true
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT "firstName", "lastName"
        FROM "Claimant"
        WHERE "claimId" = c.id
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) f ON true
      WHERE c."isArchived" = false
      ORDER BY c."updatedAt" DESC
    `;
    return {
      ok: true,
      dryRun: false,
      source: "database",
      claims: rows.map(mapRow),
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Shared BLACKBOX tables: ${err.message}`
          : "Could not read BLACKBOX Claim table.",
    };
  }
}

async function pullViaHttp(): Promise<BlackboxPull> {
  const base = process.env.BLACKBOX_API_URL?.replace(/\/$/, "");
  const key = process.env.BLACKBOX_API_KEY;
  if (!base || !key) {
    return { ok: false, error: "BLACKBOX HTTP pull is not configured." };
  }

  try {
    const res = await fetch(`${base}/api/ledger/claims`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `BLACKBOX ${res.status}: ${text.slice(0, 240)}` };
    }
    const data = (await res.json()) as { claims?: BlackboxClaimRecord[] };
    return {
      ok: true,
      dryRun: false,
      source: "http",
      claims: data.claims ?? [],
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "BLACKBOX request failed.",
    };
  }
}

export async function pullBlackboxClaims(): Promise<BlackboxPull> {
  const forceDry = process.env.BLACKBOX_DRY_RUN === "1";
  const allowHttp = Boolean(
    !forceDry && process.env.BLACKBOX_API_URL && process.env.BLACKBOX_API_KEY
  );

  if (allowHttp) {
    const http = await pullViaHttp();
    if (http.ok && !http.dryRun) return http;
  }

  const db = await pullFromSharedDatabase();
  if (db.ok) return db;

  if (forceDry) {
    return { ok: true, dryRun: true, source: "dry-run", claims: [] };
  }

  return db;
}
