-- AddColumn: permissions array on User (for granular admin staff roles)
ALTER TABLE "User" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
