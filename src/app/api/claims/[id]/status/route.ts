import { NextResponse } from "next/server";

/**
 * Explicit rejection surface. Claim status is owned by BLACKBOX.
 * Any method on this path is refused so the boundary is visible at the API.
 */
function reject() {
  return NextResponse.json(
    {
      error: "Claim status is owned by BLACKBOX and cannot be written from BLACKLEDGER.",
    },
    { status: 405 }
  );
}

export function GET() {
  return reject();
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
