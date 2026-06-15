/**
 * Send a push notification to a single user by userId.
 * Silently skips if the user has no valid push token.
 */
export declare const sendPushToUser: (userId: string, title: string, body: string, data?: Record<string, unknown>) => Promise<import("expo-server-sdk").ExpoPushTicket[] | undefined>;
/**
 * Send a push notification to multiple users by userId list.
 * Invalid/missing tokens are filtered out automatically.
 */
export declare const sendPushToMany: (userIds: string[], title: string, body: string, data?: Record<string, unknown>) => Promise<void>;
/**
 * Send a push notification to ALL users that have a registered push token.
 * Optionally restrict to participants of a specific game.
 * Returns the number of tokens reached.
 */
export declare const sendBroadcast: (title: string, body: string, options?: {
    gameId?: string;
    data?: Record<string, unknown>;
}) => Promise<number>;
//# sourceMappingURL=pushNotifications.d.ts.map