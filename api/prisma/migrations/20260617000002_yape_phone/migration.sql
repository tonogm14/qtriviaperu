-- Add yapePhone to AppConfig
ALTER TABLE "AppConfig" ADD COLUMN IF NOT EXISTS "yapePhone" TEXT NOT NULL DEFAULT '';
