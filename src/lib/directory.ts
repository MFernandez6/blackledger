import { prisma } from "@/lib/prisma";
import type { StaffRole } from "@/lib/types";

type DirectoryRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
};

function mapAdjusterRole(role: string): StaffRole {
  if (role === "ADMIN") return "ADMIN";
  if (role === "VIEWER") return "VIEWER";
  // Adjusters see fee / payout overlays with write where FINANCE is required.
  return "FINANCE";
}

async function findAdjuster(email: string): Promise<DirectoryRow | null> {
  try {
    const rows = await prisma.$queryRaw<DirectoryRow[]>`
      SELECT id, name, email, "passwordHash", role, "isActive"
      FROM public."Adjuster"
      WHERE lower(email) = ${email}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve an employee for BLACKLEDGER sign-in.
 * Prefer the shared BLACKBOX Adjuster directory, then local ledger_staff.
 */
export async function resolveStaffForLogin(email: string) {
  const normalized = email.toLowerCase();
  const adjuster = await findAdjuster(normalized);

  if (adjuster?.isActive) {
    const role = mapAdjusterRole(adjuster.role);
    try {
      const staff = await prisma.staff.upsert({
        where: { email: normalized },
        create: {
          name: adjuster.name,
          email: normalized,
          passwordHash: adjuster.passwordHash,
          role,
          isActive: true,
        },
        update: {
          name: adjuster.name,
          passwordHash: adjuster.passwordHash,
          role,
          isActive: true,
        },
      });
      return {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role as StaffRole,
        passwordHash: adjuster.passwordHash,
      };
    } catch (err) {
      console.error("[BLACKLEDGER] staff upsert failed; using Adjuster identity", err);
      return {
        id: adjuster.id,
        email: adjuster.email,
        name: adjuster.name,
        role,
        passwordHash: adjuster.passwordHash,
      };
    }
  }

  let staff = null;
  try {
    staff = await prisma.staff.findUnique({
      where: { email: normalized },
    });
  } catch (err) {
    console.error("[BLACKLEDGER] staff lookup failed", err);
    return null;
  }
  if (!staff || !staff.isActive) return null;

  return {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role as StaffRole,
    passwordHash: staff.passwordHash,
  };
}
