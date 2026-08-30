import { NextRequest, NextResponse } from "next/server";
import { isServiceKey } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { referralTagSchema } from "@/lib/schemas/payout";

/**
 * Inbound from BLACKGATE. Creates a ReferralTag only — never touches claim status.
 */
export async function POST(req: NextRequest) {
  if (!isServiceKey(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = referralTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid referral tag." }, { status: 400 });
  }

  const tag = await prisma.referralTag.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: tag.id });
}

export function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
