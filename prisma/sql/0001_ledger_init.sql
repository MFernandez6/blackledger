-- CreateTable
CREATE TABLE "ledger_staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FINANCE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_fee_schedule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "isCatClaim" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT NOT NULL,
    "contingencyPercent" DOUBLE PRECISION NOT NULL,
    "statutoryCapPercent" DOUBLE PRECISION NOT NULL,
    "statuteCite" TEXT NOT NULL DEFAULT 'Fla. Stat. § 626.854(11)',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_fee_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_claim_snapshot" (
    "id" TEXT NOT NULL,
    "blackboxClaimId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lossType" TEXT NOT NULL,
    "claimType" TEXT NOT NULL DEFAULT 'PROPERTY',
    "isCatClaim" BOOLEAN NOT NULL DEFAULT false,
    "dateOfLoss" TIMESTAMP(3) NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "carrierName" TEXT,
    "policyNumber" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "demandAmount" DOUBLE PRECISION,
    "settlementAmount" DOUBLE PRECISION,
    "settlementDate" TIMESTAMP(3),
    "contingencyFeePercent" DOUBLE PRECISION NOT NULL,
    "assignedAdjuster" TEXT,
    "primaryClaimant" TEXT NOT NULL,
    "intakeNumber" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_claim_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_payout" (
    "id" TEXT NOT NULL,
    "claimSnapshotId" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "settlementAmount" DOUBLE PRECISION NOT NULL,
    "feePercentApplied" DOUBLE PRECISION NOT NULL,
    "feeEarned" DOUBLE PRECISION NOT NULL,
    "statutoryCapPercent" DOUBLE PRECISION NOT NULL,
    "capApplied" BOOLEAN NOT NULL DEFAULT false,
    "disbursementDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_payout_document" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_payout_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_partner" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "sourceSlug" TEXT,
    "defaultSplitPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_partner_split" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "intakeNumber" TEXT,
    "referralSource" TEXT,
    "referringContact" TEXT,
    "splitPercent" DOUBLE PRECISION NOT NULL,
    "splitAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACCRUED',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_partner_split_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_referral_tag" (
    "id" TEXT NOT NULL,
    "intakeNumber" TEXT NOT NULL,
    "claimNumber" TEXT,
    "partnerName" TEXT,
    "referringContact" TEXT,
    "feeTerms" TEXT,
    "feePercent" DOUBLE PRECISION,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_referral_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_cash_flow_snapshot" (
    "id" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivables" DOUBLE PRECISION NOT NULL,
    "pipelineValue" DOUBLE PRECISION NOT NULL,
    "realizedRevenue" DOUBLE PRECISION NOT NULL,
    "realizedYtd" DOUBLE PRECISION NOT NULL,
    "aging030" DOUBLE PRECISION NOT NULL,
    "aging3160" DOUBLE PRECISION NOT NULL,
    "aging6190" DOUBLE PRECISION NOT NULL,
    "aging90plus" DOUBLE PRECISION NOT NULL,
    "claimCountActive" INTEGER NOT NULL,
    "payoutCountOpen" INTEGER NOT NULL,

    CONSTRAINT "ledger_cash_flow_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_audit_event" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_staff_email_key" ON "ledger_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_fee_schedule_code_key" ON "ledger_fee_schedule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_claim_snapshot_blackboxClaimId_key" ON "ledger_claim_snapshot"("blackboxClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_claim_snapshot_claimNumber_key" ON "ledger_claim_snapshot"("claimNumber");

-- CreateIndex
CREATE INDEX "ledger_claim_snapshot_status_idx" ON "ledger_claim_snapshot"("status");

-- CreateIndex
CREATE INDEX "ledger_claim_snapshot_claimType_isCatClaim_idx" ON "ledger_claim_snapshot"("claimType", "isCatClaim");

-- CreateIndex
CREATE INDEX "ledger_claim_snapshot_settlementDate_idx" ON "ledger_claim_snapshot"("settlementDate");

-- CreateIndex
CREATE INDEX "ledger_payout_claimSnapshotId_idx" ON "ledger_payout"("claimSnapshotId");

-- CreateIndex
CREATE INDEX "ledger_payout_status_disbursementDate_idx" ON "ledger_payout"("status", "disbursementDate");

-- CreateIndex
CREATE INDEX "ledger_payout_claimNumber_idx" ON "ledger_payout"("claimNumber");

-- CreateIndex
CREATE INDEX "ledger_payout_document_payoutId_idx" ON "ledger_payout_document"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_partner_slug_key" ON "ledger_partner"("slug");

-- CreateIndex
CREATE INDEX "ledger_partner_isActive_idx" ON "ledger_partner"("isActive");

-- CreateIndex
CREATE INDEX "ledger_partner_split_partnerId_status_idx" ON "ledger_partner_split"("partnerId", "status");

-- CreateIndex
CREATE INDEX "ledger_partner_split_payoutId_idx" ON "ledger_partner_split"("payoutId");

-- CreateIndex
CREATE INDEX "ledger_referral_tag_intakeNumber_idx" ON "ledger_referral_tag"("intakeNumber");

-- CreateIndex
CREATE INDEX "ledger_referral_tag_claimNumber_idx" ON "ledger_referral_tag"("claimNumber");

-- CreateIndex
CREATE INDEX "ledger_audit_event_createdAt_idx" ON "ledger_audit_event"("createdAt");

-- CreateIndex
CREATE INDEX "ledger_audit_event_actorId_idx" ON "ledger_audit_event"("actorId");

-- AddForeignKey
ALTER TABLE "ledger_payout" ADD CONSTRAINT "ledger_payout_claimSnapshotId_fkey" FOREIGN KEY ("claimSnapshotId") REFERENCES "ledger_claim_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_payout" ADD CONSTRAINT "ledger_payout_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "ledger_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_payout_document" ADD CONSTRAINT "ledger_payout_document_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "ledger_payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_payout_document" ADD CONSTRAINT "ledger_payout_document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "ledger_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_partner_split" ADD CONSTRAINT "ledger_partner_split_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "ledger_payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_partner_split" ADD CONSTRAINT "ledger_partner_split_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ledger_partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_audit_event" ADD CONSTRAINT "ledger_audit_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "ledger_staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

