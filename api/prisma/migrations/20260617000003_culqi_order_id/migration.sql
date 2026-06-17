-- Add culqiOrderId to Order for Culqi payment tracking
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "culqiOrderId" TEXT;
