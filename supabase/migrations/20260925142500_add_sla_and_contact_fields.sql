-- Migration: Add customer contact, daop/station, and SLA submission timestamp to Complaint table
ALTER TABLE "Complaint" 
ADD COLUMN IF NOT EXISTS "customerContact" TEXT,
ADD COLUMN IF NOT EXISTS "daopOrStation" TEXT,
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
