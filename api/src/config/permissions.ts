export const PERMISSIONS = {
  DASHBOARD_READ:       'dashboard:read',
  METRICS_READ:         'metrics:read',
  LIVE_READ:            'live:read',
  GAMES_READ:           'games:read',
  GAMES_WRITE:          'games:write',
  GAMES_NOTIFY:         'games:notify',
  QUESTIONS_READ:       'questions:read',
  QUESTIONS_WRITE:      'questions:write',
  USERS_READ:           'users:read',
  USERS_WRITE:          'users:write',
  WITHDRAWALS_READ:     'withdrawals:read',
  WITHDRAWALS_APPROVE:  'withdrawals:approve',
  NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
  ACTIVITY_READ:           'activity:read',
  SHOP_READ:               'shop:read',
  SHOP_WRITE:              'shop:write',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Empty permissions array = superadmin (full access)
export function isSuperAdmin(permissions: string[]): boolean {
  return permissions.length === 0;
}

export function hasPermission(permissions: string[], perm: Permission): boolean {
  return isSuperAdmin(permissions) || permissions.includes(perm);
}
