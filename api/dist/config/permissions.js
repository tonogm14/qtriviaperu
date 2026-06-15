"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = void 0;
exports.isSuperAdmin = isSuperAdmin;
exports.hasPermission = hasPermission;
exports.PERMISSIONS = {
    DASHBOARD_READ: 'dashboard:read',
    METRICS_READ: 'metrics:read',
    LIVE_READ: 'live:read',
    GAMES_READ: 'games:read',
    GAMES_WRITE: 'games:write',
    GAMES_NOTIFY: 'games:notify',
    QUESTIONS_READ: 'questions:read',
    QUESTIONS_WRITE: 'questions:write',
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    WITHDRAWALS_READ: 'withdrawals:read',
    WITHDRAWALS_APPROVE: 'withdrawals:approve',
    NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
    ACTIVITY_READ: 'activity:read',
    SHOP_READ: 'shop:read',
    SHOP_WRITE: 'shop:write',
};
// Empty permissions array = superadmin (full access)
function isSuperAdmin(permissions) {
    return permissions.length === 0;
}
function hasPermission(permissions, perm) {
    return isSuperAdmin(permissions) || permissions.includes(perm);
}
//# sourceMappingURL=permissions.js.map