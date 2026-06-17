-- Add recurringMode and requiresCode to Game
ALTER TABLE "Game" ADD COLUMN "recurringMode" TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE "Game" ADD COLUMN "requiresCode" BOOLEAN NOT NULL DEFAULT false;

-- Create GameInviteCode table
CREATE TABLE "GameInviteCode" (
  "id"        TEXT NOT NULL,
  "gameId"    TEXT NOT NULL,
  "code"      TEXT NOT NULL,
  "label"     TEXT,
  "usedById"  TEXT,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameInviteCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameInviteCode_code_key" ON "GameInviteCode"("code");
CREATE INDEX "GameInviteCode_gameId_idx" ON "GameInviteCode"("gameId");

ALTER TABLE "GameInviteCode"
  ADD CONSTRAINT "GameInviteCode_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
