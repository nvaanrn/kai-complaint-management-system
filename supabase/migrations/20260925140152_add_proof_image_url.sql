-- Migration: add_proof_image_url
-- Description: Add proofImageUrl column to Complaint table for field execution evidence

ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT;
