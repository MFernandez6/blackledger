import { NextResponse } from "next/server";
import { syncFromBlackboxAction } from "@/lib/actions/sync";

export async function POST() {
  const result = await syncFromBlackboxAction();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST to pull claim snapshots from BLACKBOX." },
    { status: 405 }
  );
}
