-- Add missing enum values
ALTER TYPE "GameStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Add missing enums
DO $$ BEGIN
  CREATE TYPE "GameType" AS ENUM ('FREE', 'VIP', 'SPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing columns to User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isActive"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isArchived"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isFlagged"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "flagReason"  TEXT;

-- Add missing columns to Game
ALTER TABLE "Game"
  ADD COLUMN IF NOT EXISTS "type"             "GameType" NOT NULL DEFAULT 'SPECIAL',
  ADD COLUMN IF NOT EXISTS "isRecurring"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recurringTime"    TEXT,
  ADD COLUMN IF NOT EXISTS "category"         TEXT NOT NULL DEFAULT 'Mixta',
  ADD COLUMN IF NOT EXISTS "winnerMode"       TEXT NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN IF NOT EXISTS "prizeSlots"       JSONB,
  ADD COLUMN IF NOT EXISTS "prizeMode"        TEXT NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS "potPercent"       DOUBLE PRECISION NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "sourceGameId"     TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "muxStreamId"      TEXT,
  ADD COLUMN IF NOT EXISTS "muxStreamKey"     TEXT,
  ADD COLUMN IF NOT EXISTS "warmUpQuestionId" TEXT;

UPDATE "Game" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Game" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Add missing columns to Question
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- Add missing columns to GameEntry
ALTER TABLE "GameEntry"
  ADD COLUMN IF NOT EXISTS "orderNumber"  INTEGER,
  ADD COLUMN IF NOT EXISTS "finishedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "answerLog"    JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "GameEntry_orderNumber_key" ON "GameEntry"("orderNumber");

-- Create OrderSeq
CREATE TABLE IF NOT EXISTS "OrderSeq" (
  "id"        SERIAL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderSeq_pkey" PRIMARY KEY ("id")
);

-- Create LifePack
CREATE TABLE IF NOT EXISTS "LifePack" (
  "id"        TEXT NOT NULL,
  "lives"     INTEGER NOT NULL,
  "price"     DOUBLE PRECISION NOT NULL,
  "label"     TEXT NOT NULL,
  "tag"       TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LifePack_pkey" PRIMARY KEY ("id")
);

-- Create LifeOrder
CREATE TABLE IF NOT EXISTS "LifeOrder" (
  "id"          TEXT NOT NULL,
  "orderNumber" INTEGER,
  "userId"      TEXT NOT NULL,
  "packId"      TEXT NOT NULL,
  "packLabel"   TEXT NOT NULL,
  "lives"       INTEGER NOT NULL,
  "quantity"    INTEGER NOT NULL,
  "price"       DOUBLE PRECISION NOT NULL,
  "method"      TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifeOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LifeOrder_orderNumber_key" ON "LifeOrder"("orderNumber");
CREATE INDEX IF NOT EXISTS "LifeOrder_userId_idx" ON "LifeOrder"("userId");
CREATE INDEX IF NOT EXISTS "LifeOrder_createdAt_idx" ON "LifeOrder"("createdAt");

ALTER TABLE "LifeOrder" ADD CONSTRAINT "LifeOrder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create MerchItem
CREATE TABLE IF NOT EXISTS "MerchItem" (
  "id"        TEXT NOT NULL,
  "emoji"     TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "desc"      TEXT NOT NULL,
  "price"     DOUBLE PRECISION NOT NULL,
  "stock"     INTEGER NOT NULL DEFAULT -1,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "gradient"  TEXT NOT NULL DEFAULT '["#6366F1","#4338CA"]',
  CONSTRAINT "MerchItem_pkey" PRIMARY KEY ("id")
);

-- Create Order
CREATE TABLE IF NOT EXISTS "Order" (
  "id"            TEXT NOT NULL,
  "orderNumber"   INTEGER,
  "userId"        TEXT NOT NULL,
  "itemId"        TEXT NOT NULL,
  "quantity"      INTEGER NOT NULL,
  "total"         DOUBLE PRECISION NOT NULL,
  "method"        TEXT NOT NULL,
  "status"        "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "address"       TEXT,
  "phone"         TEXT,
  "recipientName" TEXT,
  "dni"           TEXT,
  "notes"         TEXT,
  "cartRef"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");

ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "MerchItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create GameEvent
CREATE TABLE IF NOT EXISTS "GameEvent" (
  "id"        TEXT NOT NULL,
  "gameId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "userId"    TEXT,
  "data"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GameEvent_gameId_idx" ON "GameEvent"("gameId");
CREATE INDEX IF NOT EXISTS "GameEvent_createdAt_idx" ON "GameEvent"("createdAt");

ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create UserDevice
CREATE TABLE IF NOT EXISTS "UserDevice" (
  "id"          TEXT NOT NULL,
  "deviceId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "platform"    TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_deviceId_userId_key" ON "UserDevice"("deviceId", "userId");
CREATE INDEX IF NOT EXISTS "UserDevice_deviceId_idx" ON "UserDevice"("deviceId");

ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ActivityLog
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "screen"    TEXT,
  "action"    TEXT,
  "meta"      TEXT,
  "ip"        TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_type_idx" ON "ActivityLog"("type");

ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create BadWord
CREATE TABLE IF NOT EXISTS "BadWord" (
  "id"        TEXT NOT NULL,
  "word"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BadWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BadWord_word_key" ON "BadWord"("word");

-- Create BalanceLedger
CREATE TABLE IF NOT EXISTS "BalanceLedger" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "type"          TEXT NOT NULL,
  "amount"        DOUBLE PRECISION NOT NULL,
  "balanceAfter"  DOUBLE PRECISION NOT NULL,
  "description"   TEXT NOT NULL,
  "referenceId"   TEXT,
  "referenceType" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BalanceLedger_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BalanceLedger" ADD CONSTRAINT "BalanceLedger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
