/**
 * BLACKLEDGER seed — fee schedules, staff, claim snapshots, payouts, splits.
 *
 *   ALLOW_DESTRUCTIVE_SEED=1 npx prisma db seed
 *
 * Default password for all seeded staff: Password123!
 * NEVER run against production.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { startOfDay, subDays, subHours } from "date-fns";
import { applyFeeSchedule, partnerSplitAmount } from "../src/lib/fee-math";
import { FL_PA_CAP_CAT, FL_PA_CAP_STANDARD, STATUTE_CITE } from "../src/lib/constants";

const prisma = new PrismaClient();

if (process.env.ALLOW_DESTRUCTIVE_SEED !== "1") {
  console.error(
    "Refusing to seed: set ALLOW_DESTRUCTIVE_SEED=1. Never use on production."
  );
  process.exit(1);
}

const SEED_PASSWORD = "Password123!";

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

type ClaimSeed = {
  n: string;
  year: 25 | 26;
  status: string;
  lossType: string;
  claimType: string;
  isCatClaim: boolean;
  dolDaysAgo: number;
  address: string;
  county: string;
  zip: string;
  carrier: string;
  policy: string;
  estimate?: number;
  demand?: number;
  settlement?: number;
  settledDaysAgo?: number;
  adjuster: string;
  claimant: string;
  intake?: string;
};

const CLAIMS: ClaimSeed[] = [
  { n: "0001", year: 25, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 520, address: "1842 SW 22nd St, Miami", county: "Miami-Dade", zip: "33145", carrier: "Citizens", policy: "CIT-88412", estimate: 42000, demand: 48000, settlement: 44500, settledDaysAgo: 480, adjuster: "Miguel Fernandez", claimant: "Elena Vargas", intake: "BG-25-0102" },
  { n: "0004", year: 25, status: "CLOSED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 500, address: "901 Ocean Dr, Key Biscayne", county: "Miami-Dade", zip: "33149", carrier: "Universal", policy: "UNI-22019", estimate: 186000, demand: 210000, settlement: 198400, settledDaysAgo: 430, adjuster: "Diana Reyes", claimant: "Robert Hale", intake: "BG-25-0144" },
  { n: "0008", year: 25, status: "CLOSED", lossType: "FIRE", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 470, address: "55 NE 3rd Ave, Fort Lauderdale", county: "Broward", zip: "33301", carrier: "State Farm", policy: "SF-99102", estimate: 310000, demand: 340000, settlement: 326000, settledDaysAgo: 390, adjuster: "Marcus Chen", claimant: "Priya Nair" },
  { n: "0012", year: 25, status: "CLOSED", lossType: "HAIL", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 440, address: "2200 N Federal Hwy, Boca Raton", county: "Palm Beach", zip: "33431", carrier: "Heritage", policy: "HER-4410", estimate: 27500, demand: 31000, settlement: 29800, settledDaysAgo: 360, adjuster: "Frankie Diaz", claimant: "Tomás Ruiz" },
  { n: "0018", year: 25, status: "CLOSED", lossType: "WATER", claimType: "DENIED_CLAIM", isCatClaim: false, dolDaysAgo: 410, address: "7801 NW 36th St, Doral", county: "Miami-Dade", zip: "33166", carrier: "Citizens", policy: "CIT-10933", estimate: 54000, demand: 62000, settlement: 51000, settledDaysAgo: 300, adjuster: "Diana Reyes", claimant: "Ava Mendez", intake: "BG-25-0310" },
  { n: "0022", year: 25, status: "CLOSED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 380, address: "14 Lighthouse Ct, Jupiter", county: "Palm Beach", zip: "33469", carrier: "Florida Peninsula", policy: "FP-7761", estimate: 92000, demand: 105000, settlement: 98800, settledDaysAgo: 250, adjuster: "Miguel Fernandez", claimant: "James Okonkwo" },
  { n: "0029", year: 25, status: "CLOSED", lossType: "OTHER", claimType: "PIP", isCatClaim: false, dolDaysAgo: 340, address: "I-95 / Ives Dairy, Aventura", county: "Miami-Dade", zip: "33180", carrier: "GEICO", policy: "GE-FL-100", estimate: 12500, demand: 14000, settlement: 13200, settledDaysAgo: 210, adjuster: "Sofia Alvarez", claimant: "Camila Ortiz", intake: "BG-25-0441" },
  { n: "0034", year: 25, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 300, address: "410 Coral Way, Coral Gables", county: "Miami-Dade", zip: "33134", carrier: "Citizens", policy: "CIT-55201", estimate: 68000, demand: 74000, settlement: 71000, settledDaysAgo: 170, adjuster: "Marcus Chen", claimant: "Daniel Cho" },
  { n: "0003", year: 26, status: "CLOSED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 220, address: "1880 West Ave, Miami Beach", county: "Miami-Dade", zip: "33139", carrier: "Universal", policy: "UNI-33012", estimate: 145000, demand: 162000, settlement: 154200, settledDaysAgo: 140, adjuster: "Diana Reyes", claimant: "Nadia Solis", intake: "BG-26-0008" },
  { n: "0007", year: 26, status: "CLOSED", lossType: "FIRE", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 190, address: "3300 S University Dr, Davie", county: "Broward", zip: "33328", carrier: "State Farm", policy: "SF-22881", estimate: 88000, demand: 96000, settlement: 91200, settledDaysAgo: 110, adjuster: "Frankie Diaz", claimant: "Luis Herrera" },
  { n: "0011", year: 26, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 160, address: "9 Via Capri, Palm Beach", county: "Palm Beach", zip: "33480", carrier: "Chubb", policy: "CH-9011", estimate: 210000, demand: 235000, settlement: 224000, settledDaysAgo: 78, adjuster: "Miguel Fernandez", claimant: "Helen Park" },
  { n: "0014", year: 26, status: "CLOSED", lossType: "HAIL", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 130, address: "6700 W Sample Rd, Coral Springs", county: "Broward", zip: "33067", carrier: "Heritage", policy: "HER-8821", estimate: 19800, demand: 22000, settlement: 20500, settledDaysAgo: 55, adjuster: "Sofia Alvarez", claimant: "Owen Blake" },
  { n: "0016", year: 26, status: "SETTLED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 100, address: "2400 Bayshore Dr, Coconut Grove", county: "Miami-Dade", zip: "33133", carrier: "Citizens", policy: "CIT-77120", estimate: 260000, demand: 285000, settlement: 271000, settledDaysAgo: 21, adjuster: "Diana Reyes", claimant: "Isabel Romero", intake: "BG-26-0042" },
  { n: "0019", year: 26, status: "SETTLED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 85, address: "1120 Alton Rd, Miami Beach", county: "Miami-Dade", zip: "33139", carrier: "Universal", policy: "UNI-44190", estimate: 36000, demand: 41000, settlement: 38750, settledDaysAgo: 12, adjuster: "Marcus Chen", claimant: "Grace Lin" },
  { n: "0021", year: 26, status: "SETTLED", lossType: "FIRE", claimType: "DENIED_CLAIM", isCatClaim: false, dolDaysAgo: 74, address: "501 E Las Olas, Fort Lauderdale", county: "Broward", zip: "33301", carrier: "State Farm", policy: "SF-11029", estimate: 175000, demand: 198000, settlement: 166000, settledDaysAgo: 8, adjuster: "Miguel Fernandez", claimant: "Andre Baptiste", intake: "BG-26-0061" },
  { n: "0024", year: 26, status: "SETTLED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 60, address: "88 Royal Palm Way, Boca Raton", county: "Palm Beach", zip: "33432", carrier: "Heritage", policy: "HER-2290", estimate: 54000, demand: 59000, settlement: 56100, settledDaysAgo: 4, adjuster: "Frankie Diaz", claimant: "Nora Klein" },
  { n: "0026", year: 26, status: "SETTLED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 48, address: "3 Harbor Dr, Key Largo", county: "Monroe", zip: "33037", carrier: "Florida Peninsula", policy: "FP-3308", estimate: 118000, demand: 132000, settlement: 124500, settledDaysAgo: 1, adjuster: "Diana Reyes", claimant: "Marco Vidal", intake: "BG-26-0077" },
  { n: "0028", year: 26, status: "NEGOTIATING", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 42, address: "1550 SW 8th St, Miami", county: "Miami-Dade", zip: "33135", carrier: "Citizens", policy: "CIT-66110", estimate: 47500, demand: 52000, adjuster: "Marcus Chen", claimant: "Yara Haddad" },
  { n: "0030", year: 26, status: "NEGOTIATING", lossType: "WIND", claimType: "PROPERTY", isCatClaim: true, dolDaysAgo: 38, address: "7200 Collins Ave, Miami Beach", county: "Miami-Dade", zip: "33141", carrier: "Universal", policy: "UNI-55221", estimate: 198000, demand: 220000, adjuster: "Miguel Fernandez", claimant: "Seth Cohen", intake: "BG-26-0088" },
  { n: "0031", year: 26, status: "FILED", lossType: "HAIL", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 30, address: "4400 N Ocean Dr, Lauderdale-by-the-Sea", county: "Broward", zip: "33308", carrier: "Heritage", policy: "HER-9102", estimate: 16200, adjuster: "Sofia Alvarez", claimant: "Riley Chen" },
  { n: "0033", year: 26, status: "INVESTIGATION", lossType: "FIRE", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 22, address: "2100 Ponce de Leon, Coral Gables", county: "Miami-Dade", zip: "33134", carrier: "Chubb", policy: "CH-4402", estimate: 340000, adjuster: "Diana Reyes", claimant: "Amelia Cruz" },
  { n: "0035", year: 26, status: "UNDER_REVIEW", lossType: "WATER", claimType: "DENIED_CLAIM", isCatClaim: false, dolDaysAgo: 16, address: "900 N Miami Ave, Miami", county: "Miami-Dade", zip: "33136", carrier: "Citizens", policy: "CIT-22890", estimate: 29000, adjuster: "Frankie Diaz", claimant: "Jonah Reed", intake: "BG-26-0101" },
  { n: "0036", year: 26, status: "INTAKE", lossType: "OTHER", claimType: "PIP", isCatClaim: false, dolDaysAgo: 9, address: "US-1 / Kendall Dr, Miami", county: "Miami-Dade", zip: "33156", carrier: "GEICO", policy: "GE-FL-441", estimate: 9800, adjuster: "Sofia Alvarez", claimant: "Lina Farouk", intake: "BG-26-0114" },
  { n: "0038", year: 26, status: "FILED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 14, address: "18 Seagrape Dr, Delray Beach", county: "Palm Beach", zip: "33483", carrier: "Florida Peninsula", policy: "FP-1190", estimate: 64000, demand: 70000, adjuster: "Marcus Chen", claimant: "Peter Walsh" },
];

function atDaysAgo(now: Date, days: number, hour = 11): Date {
  const d = startOfDay(subDays(now, days));
  d.setHours(hour, 12, 0, 0);
  return d;
}

async function main() {
  await prisma.ledgerAuditEvent.deleteMany();
  await prisma.payoutDocument.deleteMany();
  await prisma.partnerSplit.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.referralTag.deleteMany();
  await prisma.claimSnapshot.deleteMany();
  await prisma.cashFlowSnapshot.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.feeSchedule.deleteMany();
  await prisma.staff.deleteMany();

  const passwordHash = await hash(SEED_PASSWORD, 10);

  const [admin, finance] = await Promise.all([
    prisma.staff.create({
      data: {
        name: "Miguel Fernandez",
        email: "miguel@blacklinepa.com",
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.staff.create({
      data: {
        name: "Finance Desk",
        email: "finance@blacklinepa.com",
        passwordHash,
        role: "FINANCE",
      },
    }),
    prisma.staff.create({
      data: {
        name: "Read Only",
        email: "viewer@blacklinepa.com",
        passwordHash,
        role: "VIEWER",
      },
    }),
  ]);

  for (const s of SCHEDULES) {
    await prisma.feeSchedule.create({
      data: { ...s, statuteCite: STATUTE_CITE },
    });
  }

  const schedules = await prisma.feeSchedule.findMany();
  const scheduleMap = Object.fromEntries(schedules.map((s) => [s.code, s]));

  const rivera = await prisma.partner.create({
    data: {
      slug: "rivera-law",
      name: "Rivera Law",
      brand: "Rivera",
      sourceSlug: "referral_attorney",
      defaultSplitPercent: 10,
    },
  });
  const claimsaver = await prisma.partner.create({
    data: {
      slug: "claimsaver",
      name: "ClaimSaver+",
      brand: "ClaimSaver+",
      sourceSlug: "referral_claimsaver",
      defaultSplitPercent: 0,
    },
  });
  const policyline = await prisma.partner.create({
    data: {
      slug: "policyline",
      name: "thePolicyLine",
      brand: "thePolicyLine",
      sourceSlug: "referral_policyline",
      defaultSplitPercent: 0,
    },
  });
  void claimsaver;
  void policyline;

  const now = new Date();

  const snapshotByNumber = new Map<string, { id: string; seed: ClaimSeed }>();

  for (const c of CLAIMS) {
    const claimNumber = `BL-${c.year}-${c.n}`;
    const code = c.isCatClaim && c.claimType === "PROPERTY" ? "PROPERTY_CAT" : c.claimType;
    const schedule = scheduleMap[code] ?? scheduleMap.PROPERTY;
    const snap = await prisma.claimSnapshot.create({
      data: {
        blackboxClaimId: `bb-${claimNumber}`,
        claimNumber,
        status: c.status,
        lossType: c.lossType,
        claimType: c.claimType,
        isCatClaim: c.isCatClaim,
        dateOfLoss: atDaysAgo(now, c.dolDaysAgo, 8),
        propertyAddress: c.address,
        county: c.county,
        zipCode: c.zip,
        carrierName: c.carrier,
        policyNumber: c.policy,
        estimatedValue: c.estimate ?? null,
        demandAmount: c.demand ?? null,
        settlementAmount: c.settlement ?? null,
        settlementDate:
          c.settledDaysAgo !== undefined ? atDaysAgo(now, c.settledDaysAgo, 15) : null,
        contingencyFeePercent: schedule.contingencyPercent,
        assignedAdjuster: c.adjuster,
        primaryClaimant: c.claimant,
        intakeNumber: c.intake ?? null,
        syncedAt: now,
      },
    });
    snapshotByNumber.set(claimNumber, { id: snap.id, seed: c });
  }

  await prisma.referralTag.createMany({
    data: [
      { intakeNumber: "BG-25-0144", claimNumber: "BL-25-0004", partnerName: "Rivera Law", referringContact: "Ana Rivera, Esq.", feeTerms: "10% of PA fee on recovery", feePercent: 10 },
      { intakeNumber: "BG-26-0008", claimNumber: "BL-26-0003", partnerName: "Rivera Law", referringContact: "Ana Rivera, Esq.", feeTerms: "10% of PA fee on recovery", feePercent: 10 },
      { intakeNumber: "BG-26-0042", claimNumber: "BL-26-0016", partnerName: "Rivera Law", referringContact: "Ana Rivera, Esq.", feeTerms: "10% of PA fee on recovery", feePercent: 10 },
      { intakeNumber: "BG-26-0061", claimNumber: "BL-26-0021", partnerName: "Rivera Law", referringContact: "Ana Rivera, Esq.", feeTerms: "12% of PA fee — denied reopen", feePercent: 12 },
      { intakeNumber: "BG-26-0077", claimNumber: "BL-26-0026", partnerName: "Rivera Law", referringContact: "Ana Rivera, Esq.", feeTerms: "10% of PA fee on recovery", feePercent: 10 },
      { intakeNumber: "BG-25-0441", claimNumber: "BL-25-0029", partnerName: "ClaimSaver+", referringContact: "ClaimSaver intake", feeTerms: "No fee share", feePercent: 0 },
    ],
  });

  type PayoutPlan = {
    claimNumber: string;
    status: string;
    daysAgo?: number;
    hoursAgo?: number;
    hour?: number;
    notes?: string;
    hold?: boolean;
  };

  const payoutPlans: PayoutPlan[] = [
    { claimNumber: "BL-25-0001", status: "DISBURSED", daysAgo: 478, hour: 10 },
    { claimNumber: "BL-25-0004", status: "DISBURSED", daysAgo: 428, hour: 14 },
    { claimNumber: "BL-25-0008", status: "DISBURSED", daysAgo: 388, hour: 11 },
    { claimNumber: "BL-25-0012", status: "DISBURSED", daysAgo: 355, hour: 16 },
    { claimNumber: "BL-25-0018", status: "DISBURSED", daysAgo: 296, hour: 9 },
    { claimNumber: "BL-25-0022", status: "DISBURSED", daysAgo: 246, hour: 13 },
    { claimNumber: "BL-25-0029", status: "DISBURSED", daysAgo: 205, hour: 15 },
    { claimNumber: "BL-25-0034", status: "DISBURSED", daysAgo: 166, hour: 10 },
    { claimNumber: "BL-26-0003", status: "DISBURSED", daysAgo: 136, hour: 12 },
    { claimNumber: "BL-26-0007", status: "DISBURSED", daysAgo: 104, hour: 11 },
    { claimNumber: "BL-26-0011", status: "DISBURSED", daysAgo: 72, hour: 14 },
    { claimNumber: "BL-26-0014", status: "DISBURSED", daysAgo: 18, hour: 9 },
    { claimNumber: "BL-26-0016", status: "APPROVED", daysAgo: 21, notes: "Settlement check cleared. Awaiting disbursement." },
    { claimNumber: "BL-26-0019", status: "PENDING", daysAgo: 12, notes: "Need executed release and mortgagee endorsement." },
    { claimNumber: "BL-26-0021", status: "HELD", daysAgo: 8, notes: "Denied-reopen — attorney split docs incomplete.", hold: true },
    { claimNumber: "BL-26-0024", status: "PENDING", daysAgo: 4, notes: "Check received. Reconcile against demand worksheet." },
    { claimNumber: "BL-26-0026", status: "DISBURSED", hoursAgo: 3, notes: "Disbursed this session." },
  ];

  // Extra disbursed points in the last week / today for the ticker (synthetic fee-only rows
  // against already-closed files would violate one-open-payout. Instead we timestamp
  // additional CLOSED files' disbursements across the week by using unique claims only.
  // Add a few more CLOSED snapshots just for recent ticker texture.
  const extraRecent: ClaimSeed[] = [
    { n: "0040", year: 26, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 40, address: "600 Brickell Ave, Miami", county: "Miami-Dade", zip: "33131", carrier: "Citizens", policy: "CIT-80440", estimate: 22000, demand: 25000, settlement: 23800, settledDaysAgo: 6, adjuster: "Marcus Chen", claimant: "Ivy Stone" },
    { n: "0041", year: 26, status: "CLOSED", lossType: "HAIL", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 35, address: "1900 N Andrews, Fort Lauderdale", county: "Broward", zip: "33311", carrier: "Heritage", policy: "HER-4401", estimate: 14200, demand: 16000, settlement: 15100, settledDaysAgo: 3, adjuster: "Sofia Alvarez", claimant: "Ben Ortiz" },
    { n: "0042", year: 26, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 28, address: "77 Royal Poinciana, Palm Beach", county: "Palm Beach", zip: "33480", carrier: "Chubb", policy: "CH-2201", estimate: 41000, demand: 45000, settlement: 43200, settledDaysAgo: 2, adjuster: "Diana Reyes", claimant: "Claire Ng" },
    { n: "0043", year: 26, status: "CLOSED", lossType: "WIND", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 20, address: "2500 Bird Rd, Miami", county: "Miami-Dade", zip: "33133", carrier: "Universal", policy: "UNI-9088", estimate: 33000, demand: 36000, settlement: 34800, settledDaysAgo: 0, adjuster: "Frankie Diaz", claimant: "Sam Patel" },
    { n: "0044", year: 26, status: "CLOSED", lossType: "WATER", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 18, address: "1200 Lincoln Rd, Miami Beach", county: "Miami-Dade", zip: "33139", carrier: "Citizens", policy: "CIT-33120", estimate: 19500, demand: 21000, settlement: 20200, settledDaysAgo: 0, adjuster: "Marcus Chen", claimant: "Eva Morales" },
    { n: "0045", year: 26, status: "CLOSED", lossType: "FIRE", claimType: "PROPERTY", isCatClaim: false, dolDaysAgo: 26, address: "45 Las Olas Isles, Fort Lauderdale", county: "Broward", zip: "33301", carrier: "State Farm", policy: "SF-44011", estimate: 78000, demand: 84000, settlement: 80500, settledDaysAgo: 5, adjuster: "Miguel Fernandez", claimant: "Noah Kim" },
  ];

  for (const c of extraRecent) {
    const claimNumber = `BL-${c.year}-${c.n}`;
    const code = c.isCatClaim && c.claimType === "PROPERTY" ? "PROPERTY_CAT" : c.claimType;
    const schedule = scheduleMap[code] ?? scheduleMap.PROPERTY;
    const snap = await prisma.claimSnapshot.create({
      data: {
        blackboxClaimId: `bb-${claimNumber}`,
        claimNumber,
        status: c.status,
        lossType: c.lossType,
        claimType: c.claimType,
        isCatClaim: c.isCatClaim,
        dateOfLoss: atDaysAgo(now, c.dolDaysAgo, 8),
        propertyAddress: c.address,
        county: c.county,
        zipCode: c.zip,
        carrierName: c.carrier,
        policyNumber: c.policy,
        estimatedValue: c.estimate ?? null,
        demandAmount: c.demand ?? null,
        settlementAmount: c.settlement ?? null,
        settlementDate:
          c.settledDaysAgo !== undefined ? atDaysAgo(now, c.settledDaysAgo, 15) : null,
        contingencyFeePercent: schedule.contingencyPercent,
        assignedAdjuster: c.adjuster,
        primaryClaimant: c.claimant,
        syncedAt: now,
      },
    });
    snapshotByNumber.set(claimNumber, { id: snap.id, seed: c });
  }

  payoutPlans.push(
    { claimNumber: "BL-26-0040", status: "DISBURSED", daysAgo: 5, hour: 11 },
    { claimNumber: "BL-26-0041", status: "DISBURSED", daysAgo: 3, hour: 16 },
    { claimNumber: "BL-26-0042", status: "DISBURSED", daysAgo: 2, hour: 10 },
    { claimNumber: "BL-26-0045", status: "DISBURSED", daysAgo: 4, hour: 13 },
    { claimNumber: "BL-26-0043", status: "DISBURSED", hoursAgo: 6 },
    { claimNumber: "BL-26-0044", status: "DISBURSED", hoursAgo: 1 },
  );

  const attorneyClaims = new Set([
    "BL-25-0004",
    "BL-26-0003",
    "BL-26-0016",
    "BL-26-0021",
    "BL-26-0026",
  ]);

  for (const plan of payoutPlans) {
    const row = snapshotByNumber.get(plan.claimNumber);
    if (!row || !row.seed.settlement) continue;
    const code =
      row.seed.isCatClaim && row.seed.claimType === "PROPERTY"
        ? "PROPERTY_CAT"
        : row.seed.claimType;
    const schedule = scheduleMap[code] ?? scheduleMap.PROPERTY;
    const fee = applyFeeSchedule({
      settlementAmount: row.seed.settlement,
      demandAmount: row.seed.demand,
      estimatedValue: row.seed.estimate,
      schedule,
    });

    let when: Date;
    if (plan.hoursAgo !== undefined) {
      when = subHours(now, plan.hoursAgo);
    } else {
      when = atDaysAgo(now, plan.daysAgo ?? 0, plan.hour ?? 11);
    }

    const payout = await prisma.payout.create({
      data: {
        claimSnapshotId: row.id,
        claimNumber: plan.claimNumber,
        settlementAmount: row.seed.settlement,
        feePercentApplied: fee.percentApplied,
        feeEarned: fee.feeEarned,
        statutoryCapPercent: fee.statutoryCapPercent,
        capApplied: fee.capApplied,
        status: plan.status,
        disbursementDate: plan.status === "DISBURSED" ? when : null,
        notes: plan.notes,
        recordedById: plan.status === "DISBURSED" ? admin.id : finance.id,
        createdAt: plan.status === "DISBURSED" ? when : atDaysAgo(now, plan.daysAgo ?? 0, 9),
      },
    });

    if (attorneyClaims.has(plan.claimNumber) && plan.status !== "VOID") {
      const tag = await prisma.referralTag.findFirst({
        where: { claimNumber: plan.claimNumber },
      });
      const pct = tag?.feePercent ?? 10;
      await prisma.partnerSplit.create({
        data: {
          payoutId: payout.id,
          partnerId: rivera.id,
          intakeNumber: tag?.intakeNumber,
          referralSource: "referral_attorney",
          referringContact: tag?.referringContact,
          splitPercent: pct,
          splitAmount: partnerSplitAmount(fee.feeEarned, pct),
          status:
            plan.status === "DISBURSED" ? "PAID" : plan.status === "HELD" ? "ACCRUED" : "DUE",
          paidAt: plan.status === "DISBURSED" ? when : null,
          notes: tag?.feeTerms,
        },
      });
    }
  }

  // A couple of extra historical months so Year / All-time have texture
  // without new claims: we already have 2025 files spanning the year.

  const { persistCashFlowSnapshot } = await import("../src/lib/actions/snapshots");
  await persistCashFlowSnapshot();

  await prisma.ledgerAuditEvent.create({
    data: {
      actorId: admin.id,
      action: "SEED",
      entityType: "Ledger",
      summary: "Destructive seed loaded fee schedules, snapshots, payouts, and partner splits.",
    },
  });

  console.log("BLACKLEDGER seed complete.");
  console.log("  Admin    miguel@blacklinepa.com / Password123!");
  console.log("  Finance  finance@blacklinepa.com / Password123!");
  console.log("  Viewer   viewer@blacklinepa.com / Password123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
