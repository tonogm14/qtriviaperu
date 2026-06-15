export declare const PERMISSIONS: {
    readonly DASHBOARD_READ: "dashboard:read";
    readonly METRICS_READ: "metrics:read";
    readonly LIVE_READ: "live:read";
    readonly GAMES_READ: "games:read";
    readonly GAMES_WRITE: "games:write";
    readonly GAMES_NOTIFY: "games:notify";
    readonly QUESTIONS_READ: "questions:read";
    readonly QUESTIONS_WRITE: "questions:write";
    readonly USERS_READ: "users:read";
    readonly USERS_WRITE: "users:write";
    readonly WITHDRAWALS_READ: "withdrawals:read";
    readonly WITHDRAWALS_APPROVE: "withdrawals:approve";
    readonly NOTIFICATIONS_BROADCAST: "notifications:broadcast";
    readonly ACTIVITY_READ: "activity:read";
    readonly SHOP_READ: "shop:read";
    readonly SHOP_WRITE: "shop:write";
};
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export declare function isSuperAdmin(permissions: string[]): boolean;
export declare function hasPermission(permissions: string[], perm: Permission): boolean;
//# sourceMappingURL=permissions.d.ts.map