import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const expo = new Expo();
const prisma = new PrismaClient();

/**
 * Send a push notification to a single user by userId.
 * Silently skips if the user has no valid push token.
 */
export const sendPushToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) return;

  const message: ExpoPushMessage = {
    to: user.pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    return tickets;
  } catch (error) {
    console.error('Push notification error:', error);
  }
};

/**
 * Send a push notification to multiple users by userId list.
 * Invalid/missing tokens are filtered out automatically.
 */
export const sendPushToMany = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) => {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { pushToken: true },
  });

  const validTokens = users
    .map((u) => u.pushToken!)
    .filter((t) => Expo.isExpoPushToken(t));

  if (validTokens.length === 0) return;

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error('Push error:', error);
    }
  }
};

/**
 * Send a push notification to ALL users that have a registered push token.
 * Optionally restrict to participants of a specific game.
 * Returns the number of tokens reached.
 */
export const sendBroadcast = async (
  title: string,
  body: string,
  options: {
    gameId?: string;
    data?: Record<string, unknown>;
  } = {}
): Promise<number> => {
  let tokens: string[];

  if (options.gameId) {
    // Only users enrolled in this specific game
    const entries = await prisma.gameEntry.findMany({
      where: { gameId: options.gameId },
      include: { user: { select: { pushToken: true } } },
    });
    tokens = entries
      .map((e) => e.user.pushToken ?? '')
      .filter((t) => t && Expo.isExpoPushToken(t));
  } else {
    // All users with a valid push token
    const users = await prisma.user.findMany({
      where: { pushToken: { not: null } },
      select: { pushToken: true },
    });
    tokens = users
      .map((u) => u.pushToken ?? '')
      .filter((t) => t && Expo.isExpoPushToken(t));
  }

  if (tokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: options.data,
    priority: 'high',
  }));

  let sent = 0;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      sent += chunk.length;
    } catch (error) {
      console.error('Broadcast push error:', error);
    }
  }

  return sent;
};
