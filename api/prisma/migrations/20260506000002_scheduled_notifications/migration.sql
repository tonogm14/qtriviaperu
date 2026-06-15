-- Create ScheduledNotification table
CREATE TABLE "ScheduledNotification" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "type"         TEXT NOT NULL DEFAULT 'general',
  "target"       TEXT NOT NULL DEFAULT 'all',
  "gameId"       TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt"       TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduledNotification_scheduledFor_sentAt_idx"
  ON "ScheduledNotification"("scheduledFor", "sentAt");
