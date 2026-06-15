-- Add scheduled notification flags to Game
ALTER TABLE "Game"
  ADD COLUMN "notified1h"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notified5m"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifiedStart" BOOLEAN NOT NULL DEFAULT false;
