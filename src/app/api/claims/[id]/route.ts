import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claim = await prisma.claimSnapshot.findUnique({
    where: { id: params.id },
    include: { payouts: true },
  });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ claim });
}

function reject() {
  return NextResponse.json(
    { error: "Claim records are read-only. BLACKLEDGER cannot change claim status." },
    { status: 405 }
  );
}

export function POST() {
  return reject();
}
export function PUT() {
  return reject();
}
export function PATCH() {
  return reject();
}
export function DELETE() {
  return reject();
}
