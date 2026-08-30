import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Read-only list of claim snapshots. */
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claims = await prisma.claimSnapshot.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ claims });
}

export function POST() {
  return NextResponse.json(
    { error: "Claim records are read-only. Use BLACKBOX to change claim status." },
    { status: 405 }
  );
}

export function PUT() {
  return POST();
}

export function PATCH() {
  return POST();
}

export function DELETE() {
  return POST();
}
