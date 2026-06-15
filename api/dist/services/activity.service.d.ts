export type ActivityType = 'login' | 'logout' | 'register' | 'profile_update' | 'password_change' | 'page_view' | 'tap' | 'join_game' | 'withdrawal_request' | 'buy_lives' | 'order_merch' | 'push_open' | 'notification_view' | 'admin_login' | 'admin_action' | 'unknown';
export declare function logActivity(opts: {
    userId: string;
    type: ActivityType;
    screen?: string;
    action?: string;
    meta?: Record<string, unknown>;
    ip?: string;
}): Promise<void>;
//# sourceMappingURL=activity.service.d.ts.map