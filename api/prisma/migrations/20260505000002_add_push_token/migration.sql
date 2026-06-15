-- AlterTable: add pushToken column to User for Expo push notifications
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushToken" TEXT;
