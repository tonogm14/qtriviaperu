import axios from 'axios'
import type { Game, Question, User, Withdrawal } from '../types'

export interface LedgerEntry {
  id: string
  userId: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  referenceId?: string
  referenceType?: string
  createdAt: string
}

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3002',
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qtrivia-admin')
  if (token) {
    try {
      const parsed = JSON.parse(token)
      if (parsed?.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url: string = error.config?.url ?? ''
    // 401 anywhere, or 404 on the /me endpoint = stale/invalid session → force re-login
    if (status === 401 || (status === 404 && url.includes('/api/auth/me'))) {
      localStorage.removeItem('qtrivia-admin')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── GAMES API ────────────────────────────────────────────────────────────────

export const gamesApi = {
  list: (params?: { status?: string; date?: string; limit?: number }) =>
    api.get<{ data: Game[] }>('/api/games', { params }),
  get: (id: string) =>
    api.get<{ data: Game }>(`/api/games/${id}`),
  create: (data: Partial<Game>) =>
    api.post<{ data: Game }>('/api/games', data),
  update: (id: string, data: Partial<Game>) =>
    api.put<{ data: Game }>(`/api/games/${id}`, data),
  setQuestions: (id: string, questionIds: string[]) =>
    api.put<{ data: Game }>(`/api/games/${id}/questions`, { questionIds }),
  delete: (id: string) =>
    api.delete(`/api/games/${id}`),
  start: (id: string) =>
    api.post(`/api/games/${id}/start`),
  closeRegistration: (id: string) =>
    api.post(`/api/games/${id}/close-registration`),
  getStream: (id: string) =>
    api.get<{ data: { streamUrl: string; streamKey: string; rtmpServer: string; rtmpUrl: string } | null }>(`/api/games/${id}/stream`),
  createStream: (id: string) =>
    api.post<{ data: { streamUrl: string; streamKey: string; rtmpServer: string; rtmpUrl: string } }>(`/api/games/${id}/stream`),
  deleteStream: (id: string) =>
    api.delete(`/api/games/${id}/stream`),
  entries: (id: string, search?: string) =>
    api.get<{ data: GameEntry[]; total: number }>(`/api/games/${id}/entries`, { params: search ? { search } : undefined }),
  log: (id: string) =>
    api.get<{ data: { game: any; events: GameEvent[]; entries: GameLogEntry[] } }>(`/api/games/${id}/log`),
  listInviteCodes: (id: string) =>
    api.get<{ data: InviteCode[] }>(`/api/games/${id}/invite-codes`),
  generateInviteCodes: (id: string, data: { count?: number; label?: string; userEmail?: string }) =>
    api.post<{ data: InviteCode[] }>(`/api/games/${id}/invite-codes/generate`, data),
  deleteInviteCode: (gameId: string, codeId: string) =>
    api.delete(`/api/games/${gameId}/invite-codes/${codeId}`),
}

export interface GameEntry {
  rank: number
  userId: string
  username: string
  name: string
  email: string
  isVip: boolean
  score: number
  isAlive: boolean
  prize?: number | null
  joinedAt: string
}

export interface InviteCode {
  id: string
  gameId: string
  code: string
  label: string | null
  usedById: string | null
  usedByUsername: string | null
  usedAt: string | null
  createdAt: string
}

// ─── QUESTIONS API ────────────────────────────────────────────────────────────

export const questionsApi = {
  list: (params?: { category?: string; difficulty?: string; search?: string; page?: number; limit?: number; archived?: boolean }) =>
    api.get<{ data: Question[]; total: number }>('/api/questions', { params }),
  get: (id: string) =>
    api.get<{ data: Question }>(`/api/questions/${id}`),
  create: (data: Partial<Question>) =>
    api.post<{ data: Question }>('/api/questions', data),
  update: (id: string, data: Partial<Question> & { isArchived?: boolean }) =>
    api.put<{ data: Question }>(`/api/questions/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/questions/${id}`),
}

// ─── USERS API ────────────────────────────────────────────────────────────────

export const usersApi = {
  stats: () =>
    api.get<{ data: { totalAdmins: number; totalUsers: number; newToday: number } }>('/api/users/stats'),
  list: (params?: { search?: string; status?: 'active' | 'disabled' | 'archived'; page?: number; limit?: number }) =>
    api.get<{ data: User[]; total: number }>('/api/users', { params }),
  get: (id: string) =>
    api.get<{ data: User }>(`/api/users/${id}`),
  create: (data: { name: string; email: string; username: string; password: string; role?: string; permissions?: string[] }) =>
    api.post<{ data: User }>('/api/users', data),
  update: (id: string, data: Partial<User>) =>
    api.put<{ data: User }>(`/api/users/${id}`, data),
  ledger: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: { entries: LedgerEntry[]; total: number; page: number; limit: number } }>(`/api/users/${id}/ledger`, { params }),
}

// ─── WITHDRAWALS API ──────────────────────────────────────────────────────────

export const withdrawalsApi = {
  list: (params?: { status?: string }) =>
    api.get<{ data: Withdrawal[]; total: number }>('/api/withdrawals', { params }),
  updateStatus: (id: string, status: string) =>
    api.put(`/api/withdrawals/${id}/status`, { status }),
}

// ─── LEADERBOARD API ──────────────────────────────────────────────────────────

export const leaderboardApi = {
  get: (period: 'today' | 'week' | 'month' | 'all') =>
    api.get<{ data: any[] }>('/api/leaderboard', { params: { period } }),
}

// ─── METRICS API ──────────────────────────────────────────────────────────────

export interface MetricsSummary {
  totalUsers: number
  totalGames: number
  totalPrizesPaid: number
  pendingWithdrawals: number
  dailyPrizes: { day: string; prize: number; games: number }[]
  userGrowth: { day: string; count: number }[]
  byMethod: { method: string; total: number; count: number }[]
  topWinners: { userId: string; username: string; name: string; wins: number; total: number }[]
}

export const metricsApi = {
  summary: (days?: number) => api.get<{ data: MetricsSummary }>('/api/metrics', { params: days ? { days } : undefined }),
}

// ─── NOTIFICATIONS API ────────────────────────────────────────────────────────

export interface ScheduledNotification {
  id: string
  title: string
  body: string
  type: string
  target: string
  gameId?: string
  userEmail?: string
  scheduledFor: string
  sentAt?: string
  createdAt: string
}

export const notificationsApi = {
  broadcast: (data: {
    title: string
    body: string
    type: 'reminder' | 'bonus' | 'win' | 'rank' | 'life' | 'general'
    target: 'all' | 'game' | 'user' | 'vip'
    gameId?: string
    userEmail?: string
    scheduledFor?: string
  }) => api.post<{ data: { scheduled?: boolean; dbSaved?: number; pushSent?: number; scheduledFor?: string; message: string } }>('/api/notifications/broadcast', data),

  listScheduled: () =>
    api.get<{ data: ScheduledNotification[] }>('/api/notifications/scheduled'),

  deleteScheduled: (id: string) =>
    api.delete(`/api/notifications/scheduled/${id}`),
}

// ─── ACTIVITY LOG API ─────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string
  userId: string
  type: string
  screen: string | null
  action: string | null
  meta: string | null
  ip: string | null
  country: string | null
  createdAt: string
  user: { id: string; name: string; username: string; email: string }
}

export const activityApi = {
  list: (params?: {
    userId?: string
    type?: string
    screen?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  }) =>
    api.get<{ data: { logs: ActivityLogEntry[]; total: number; page: number; limit: number } }>(
      '/api/activity',
      { params }
    ),
}

// ─── GAME LOG API ─────────────────────────────────────────────────────────────

export interface GameEvent {
  id: string
  gameId: string
  type: string  // GAME_STARTED | PLAYER_ELIMINATED | GAME_ENDED | WINNER_DECLARED
  userId: string | null
  data: Record<string, any> | null
  createdAt: string
}

export interface GameLogEntry {
  id: string; userId: string; username: string; name: string; email: string
  score: number; isAlive: boolean; eliminatedAtQ: number | null; prize: number | null
  joinedAt: string; finishedAt: string | null
  answerLog: Array<{ qIdx: number; receivedAt: string }> | null
}

// ─── AUTH API ─────────────────────────────────────────────────────────────────

export const adminAuthApi = {
  login: (email: string, password: string) =>
    api.post<{ data: { token: string; user: any } }>('/api/auth/admin-login', { email, password }),
  me: () =>
    api.get<{ data: any }>('/api/auth/me'),
  updateMe: (data: { name?: string; phone?: string; password?: string }) =>
    api.put<{ data: any }>('/api/auth/me', data),
}

// ─── SHOP API ────────────────────────────────────────────────────────────────

export interface LifePack {
  id: string; lives: number; price: number; label: string; tag?: string | null
  active: boolean; sortOrder: number
}
export interface MerchItem {
  id: string; emoji: string; name: string; desc: string; price: number
  stock: number; active: boolean; sortOrder: number; gradient?: string
}

export interface CartGroupItem {
  orderId: string
  name: string
  emoji: string
  unitPrice: number
  quantity: number
  total: number
}

export interface ShopOrder {
  id: string           // cartRef or individual order id
  orderNumber: number | null
  cartRef: string | null
  items: CartGroupItem[]
  totalAmount: number
  method: string
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  address: string | null
  phone: string | null
  recipientName: string | null
  dni: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; username: string; email: string; phone: string | null }
}

export interface OrderSummaryEntry {
  status: ShopOrder['status']
  _count: { id: number }
  _sum: { total: number | null }
}

export interface LifeOrder {
  id: string
  orderNumber: number | null
  userId: string
  packId: string
  packLabel: string
  lives: number
  quantity: number
  price: number
  method: string
  createdAt: string
  user: { id: string; name: string; username: string; email: string }
}

export interface VipEntry {
  id: string
  orderNumber: number | null
  userId: string
  gameId: string
  joinedAt: string
  user: { id: string; name: string; username: string; email: string }
  game: { id: string; title: string; entryFee: number; scheduledAt: string }
}

export const shopApi = {
  listPacks: () => api.get<{ data: LifePack[] }>('/api/shop/admin/packs'),
  createPack: (data: Omit<LifePack, 'id'> & { id?: string }) => api.post<{ data: LifePack }>('/api/shop/admin/packs', data),
  updatePack: (id: string, data: Partial<LifePack>) => api.put<{ data: LifePack }>(`/api/shop/admin/packs/${id}`, data),
  deletePack: (id: string) => api.delete(`/api/shop/admin/packs/${id}`),
  listMerch: () => api.get<{ data: MerchItem[] }>('/api/shop/admin/merch'),
  createMerch: (data: Omit<MerchItem, 'id'> & { id?: string }) => api.post<{ data: MerchItem }>('/api/shop/admin/merch', data),
  updateMerch: (id: string, data: Partial<MerchItem>) => api.put<{ data: MerchItem }>(`/api/shop/admin/merch/${id}`, data),
  deleteMerch: (id: string) => api.delete(`/api/shop/admin/merch/${id}`),
  listOrders: (status?: string, userId?: string) => api.get<{ data: ShopOrder[]; summary: OrderSummaryEntry[] }>('/api/shop/admin/orders', { params: { ...(status ? { status } : {}), ...(userId ? { userId } : {}) } }),
  updateOrderStatus: (id: string, status: string, notes?: string) => api.put<{ data: ShopOrder }>(`/api/shop/admin/orders/${id}/status`, { status, notes }),
  listLifeOrders: (userId?: string) => api.get<{ data: LifeOrder[] }>('/api/shop/admin/life-orders', { params: userId ? { userId } : {} }),
  listVipEntries: () => api.get<{ data: VipEntry[] }>('/api/shop/admin/vip-entries'),
  exportUrl: (type: 'all' | 'merch' | 'lives' | 'vip' = 'all', from?: string, to?: string) => {
    const params = new URLSearchParams({ type })
    if (from) params.set('from', from)
    if (to)   params.set('to',   to)
    return `/api/shop/admin/export?${params.toString()}`
  },
}

// ─── APP CONFIG API ───────────────────────────────────────────────────────────

export interface AppConfig {
  currency: string
  defaultPrize: number
  defaultQuestions: number
  defaultTime: number
  pushBefore: number
  autoAdvance: boolean
  chatModeration: boolean
  minWithdraw: number
  feeYape: number
  feePlin: number
  feeBCP: number
  feeInterbank: number
  termsAndConditions: string
  yapePhone: string
}

export const configApi = {
  get: () => api.get<{ data: AppConfig }>('/api/config'),
  update: (data: Partial<AppConfig>) => api.put<{ data: AppConfig }>('/api/config', data),
}

// ─── FRAUD API ────────────────────────────────────────────────────────────────

export interface FlaggedUser {
  id: string
  username: string
  name: string
  email: string
  isFlagged: boolean
  flagReason: string | null
  isActive: boolean
  isArchived: boolean
  createdAt: string
  devices: Array<{ deviceId: string; platform: string | null; firstSeenAt: string; lastSeenAt: string }>
}

export interface SharedDevice {
  deviceId: string
  accounts: Array<{ userId: string; username: string; email: string; isFlagged: boolean }>
}

export const fraudApi = {
  flagged: () => api.get<{ data: FlaggedUser[] }>('/api/fraud/flagged'),
  sharedDevices: () => api.get<{ data: SharedDevice[] }>('/api/fraud/shared-devices'),
  userDevices: (id: string) => api.get<{ data: any[] }>(`/api/fraud/users/${id}/devices`),
  unflag: (id: string) => api.put<{ data: any }>(`/api/fraud/users/${id}/unflag`),
  ban: (id: string) => api.put<{ data: any }>(`/api/fraud/users/${id}/ban`),
}

// ─── BAD WORDS API ────────────────────────────────────────────────────────────

export interface BadWord {
  id: string
  word: string
  createdAt: string
}

export const badWordsApi = {
  list: () => api.get<{ data: BadWord[] }>('/api/badwords'),
  add:  (word: string) => api.post<{ data: BadWord }>('/api/badwords', { word }),
  remove: (id: string) => api.delete(`/api/badwords/${id}`),
}

export default api
