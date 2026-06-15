import { PrismaClient } from '@prisma/client';
import { logActivity } from './activity.service';

const prisma = new PrismaClient();

export async function bindDevice(
  userId: string,
  deviceId: string,
  platform?: string
): Promise<void> {
  if (!deviceId || deviceId.length < 8) return;

  // Upsert device record for this user
  await prisma.userDevice.upsert({
    where: { deviceId_userId: { deviceId, userId } },
    update: { lastSeenAt: new Date(), ...(platform ? { platform } : {}) },
    create: { deviceId, userId, platform },
  });

  // Check if this device is already linked to other accounts
  const otherBindings = await prisma.userDevice.findMany({
    where: { deviceId, userId: { not: userId } },
    include: { user: { select: { id: true, username: true } } },
  });

  if (otherBindings.length === 0) return;

  const otherIds = otherBindings.map((b) => b.user.id);
  const otherNames = otherBindings.map((b) => b.user.username).join(', ');

  // Flag all involved accounts
  await prisma.user.updateMany({
    where: { id: { in: [userId, ...otherIds] }, isFlagged: false },
    data: {
      isFlagged: true,
      flagReason: `multi_account — device ${deviceId.slice(0, 8)}… shared with: ${otherNames}`,
    },
  });

  logActivity({
    userId,
    type: 'admin_action',
    action: `Multi-account detectado: dispositivo compartido con ${otherNames}`,
    meta: { deviceId: deviceId.slice(0, 8), otherAccounts: otherIds },
  });
}

export async function getSharedDevices(): Promise<
  Array<{ deviceId: string; accounts: Array<{ userId: string; username: string; email: string; isFlagged: boolean }> }>
> {
  // Find deviceIds linked to more than one user
  const grouped = await prisma.$queryRaw<{ deviceId: string; count: bigint }[]>`
    SELECT "deviceId", COUNT(DISTINCT "userId") as count
    FROM "UserDevice"
    GROUP BY "deviceId"
    HAVING COUNT(DISTINCT "userId") > 1
  `;

  const results = await Promise.all(
    grouped.map(async ({ deviceId }) => {
      const bindings = await prisma.userDevice.findMany({
        where: { deviceId },
        include: { user: { select: { id: true, username: true, email: true, isFlagged: true } } },
      });
      return {
        deviceId,
        accounts: bindings.map((b) => ({
          userId: b.user.id,
          username: b.user.username,
          email: b.user.email,
          isFlagged: b.user.isFlagged,
        })),
      };
    })
  );

  return results;
}
