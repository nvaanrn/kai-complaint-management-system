-- ==============================================================================
-- Migration: initial_schema
-- Project: SPKP (Sistem Pengaduan Keluhan Pelanggan - PT KAI)
-- Description: Baseline schema definition, foreign key indexes, and RLS policies
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'PIC', 'VERIFIKATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ComplaintStatus" AS ENUM ('BELUM_DITANGANI', 'DALAM_PENANGANAN', 'MENUNGGU_VERIFIKASI', 'TERVERIFIKASI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VerificationResult" AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- Table: User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Table: Document
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "managementRep" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- Table: Complaint
CREATE TABLE IF NOT EXISTS "Complaint" (
    "id" TEXT NOT NULL,
    "complaintNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'BELUM_DITANGANI',
    "picId" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "notes" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- Table: Verification
CREATE TABLE IF NOT EXISTS "Verification" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "result" "VerificationResult" NOT NULL,
    "feedback" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- 3. UNIQUE INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Complaint_complaintNumber_key" ON "Complaint"("complaintNumber");

-- 4. FOREIGN KEY CONSTRAINTS
DO $$ BEGIN
    ALTER TABLE "Document" 
        ADD CONSTRAINT "Document_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Complaint" 
        ADD CONSTRAINT "Complaint_picId_fkey" 
        FOREIGN KEY ("picId") REFERENCES "User"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Complaint" 
        ADD CONSTRAINT "Complaint_documentId_fkey" 
        FOREIGN KEY ("documentId") REFERENCES "Document"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Verification" 
        ADD CONSTRAINT "Verification_complaintId_fkey" 
        FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Verification" 
        ADD CONSTRAINT "Verification_verifierId_fkey" 
        FOREIGN KEY ("verifierId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS "Document_createdById_idx" ON "Document"("createdById");
CREATE INDEX IF NOT EXISTS "Complaint_picId_idx" ON "Complaint"("picId");
CREATE INDEX IF NOT EXISTS "Complaint_documentId_idx" ON "Complaint"("documentId");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX IF NOT EXISTS "Complaint_date_idx" ON "Complaint"("date" DESC);
CREATE INDEX IF NOT EXISTS "Verification_complaintId_idx" ON "Verification"("complaintId");
CREATE INDEX IF NOT EXISTS "Verification_verifierId_idx" ON "Verification"("verifierId");

-- 6. SECURITY & ROW LEVEL SECURITY (RLS)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;

-- Default Policies for authenticated & service_role access
DO $$ BEGIN
    CREATE POLICY "Allow service_role full access to User" ON "User"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role full access to Document" ON "Document"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role full access to Complaint" ON "Complaint"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service_role full access to Verification" ON "Verification"
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Authenticated read policies
DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on User" ON "User"
        FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on Document" ON "Document"
        FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on Complaint" ON "Complaint"
        FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Allow authenticated read on Verification" ON "Verification"
        FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
