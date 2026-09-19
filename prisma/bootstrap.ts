/**
 * Non-destructive production bootstrap: staff logins + statutory fee schedules.
 *
 *   npx tsx prisma/bootstrap.ts
 *
 * Does not delete payouts, snapshots, or partners.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { FL_PA_CAP_CAT, FL_PA_CAP_STANDARD, STATUTE_CITE } from "../src/lib/constants";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Password123!";

const STAFF = [
  {
    name: "Miguel Fernandez",
    email: "miguel@blacklinepa.com",
    role: "ADMIN",
  },
  {
    name: "Finance Desk",
    email: "finance@blacklinepa.com",
    role: "FINANCE",
  },
  {
    name: "Read Only",
    email: "viewer@blacklinepa.com",
    role: "VIEWER",
  },
] as const;

const SCHEDULES = [
  {
    code: "PROPERTY",
    claimType: "PROPERTY",
    isCatClaim: false,
    label: "Property — standard",
    contingencyPercent: 20,
    statutoryCapPercent: FL_PA_CAP_STANDARD,
    notes:
      "Default Blackline contingency on non-emergency property files. Cap is the Florida public-adjuster ceiling.",
  },
  {
    code: "PROPERTY_CAT",
    claimType: "PROPERTY",
    isCatClaim: true,
    label: "Property — declared emergency (CAT)",
    contingencyPercent: 10,
    statutoryCapPercent: FL_PA_CAP_CAT,
    notes:
      "Mandatory 10% ceiling when the loss is the subject of a Governor-declared state of emergency.",
  },
  {
    code: "PIP",
    claimType: "PIP",
    isCatClaim: false,
    label: "PIP / auto no-fault",
    contingencyPercent: 20,
    statutoryCapPercent: FL_PA_CAP_STANDARD,
    notes: "PIP matters use the general (non-emergency) statutory cap.",
  },
  {
    code: "DENIED_CLAIM",
    claimType: "DENIED_CLAIM",
    isCatClaim: false,
    label: "Reopened denied claim",
    contingencyPercent: 20,
    statutoryCapPercent: FL_PA_CAP_STANDARD,
    notes: "Denied-claim reopenings remain under the 20% general cap unless the loss is CAT.",
  },
];

async function main() {
  const passwordHash = await hash(SEED_PASSWORD, 10);

  for (const person of STAFF) {
    await prisma.staff.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        passwordHash,
        role: person.role,
        isActive: true,
      },
      create: {
        name: person.name,
        email: person.email,
        passwordHash,
        role: person.role,
      },
    });
  }

  for (const s of SCHEDULES) {
    await prisma.feeSchedule.upsert({
      where: { code: s.code },
      update: {
        claimType: s.claimType,
        isCatClaim: s.isCatClaim,
        label: s.label,
        contingencyPercent: s.contingencyPercent,
        statutoryCapPercent: s.statutoryCapPercent,
        statuteCite: STATUTE_CITE,
        notes: s.notes,
        isActive: true,
      },
      create: { ...s, statuteCite: STATUTE_CITE },
    });
  }

  console.log("BLACKLEDGER bootstrap complete (staff + fee schedules).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
