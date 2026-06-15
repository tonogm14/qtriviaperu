// API status values from the backend
export type GameStatus =
  | 'PENDING'
  | 'LOBBY'
  | 'LIVE'
  | 'FINISHED'
  | 'CANCELLED'
  // Legacy frontend-only statuses (kept for UI badge mapping)
  | 'borrador'
  | 'programado'
  | 'proximo'
  | 'envivo'
  | 'finalizado'
  | 'cancelado'

export type GameType = 'FREE' | 'VIP' | 'SPECIAL'

export type WinnerMode = 'SINGLE' | 'ALL_CORRECT' | 'RANKED_SLOTS'
export type PrizeMode = 'FIXED' | 'POT' | 'POT_PERCENT'
export interface PrizeSlot { place: number; percent: number }

export interface Game {
  id: string
  title: string
  type?: GameType
  isRecurring?: boolean
  recurringTime?: string | null  // "HH:MM" Lima time
  // API fields
  scheduledAt?: string // ISO date from API — for recurring games this is the next occurrence
  status: GameStatus
  prize: number
  entryFee: number
  maxQuestions?: number
  timePerQuestion: number
  host: string | null
  category?: string
  currentPot?: number
  winnerMode?: WinnerMode
  prizeSlots?: PrizeSlot[] | null
  prizeMode?: PrizeMode
  potPercent?: number
  _count?: { entries: number; questions?: number }
  questions?: any[]   // GameQuestion[] from API include — use maxQuestions for the count
  // Legacy / computed UI fields
  date?: string
  time?: string
  players?: number
}

export type QuestionDifficulty = 'fácil' | 'media' | 'difícil' | 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  text: string
  options: string[]
  correct: number
  difficulty: QuestionDifficulty
  timeLimit?: number
  category?: string
  createdAt?: string
}

export type UserStatus = 'activo' | 'inactivo' | 'baneado' | 'active' | 'inactive' | 'banned'

export interface User {
  id: string
  name: string
  handle?: string
  email: string
  city?: string
  status: UserStatus
  played?: number
  won?: number
  balance?: number
  lives?: number
  vip?: boolean
  joined?: string
  lastActive?: string
  dni?: boolean
  // API may also return these fields
  username?: string
  createdAt?: string
  isActive?: boolean
  isArchived?: boolean
}

export type WithdrawalStatus = 'pendiente' | 'procesando' | 'pagado' | 'rechazado' | 'pending' | 'processing' | 'paid' | 'rejected'
export type WithdrawalMethod = 'Yape' | 'Plin' | 'BCP' | 'Interbank' | 'BBVA'

export interface Withdrawal {
  id: string
  user: string
  handle?: string
  dni?: string
  amount: number
  method: WithdrawalMethod | string
  account?: string
  bank?: string
  requested?: string
  status: WithdrawalStatus
  // API may also return
  userId?: string
  createdAt?: string
}

export interface AdminStore {
  theme: 'dark' | 'light'
  user: AdminUser | null
  token: string | null
  sidebarOpen: boolean
  toggleTheme: () => void
  setUser: (user: AdminUser, token: string) => void
  logout: () => void
  setSidebarOpen: (open: boolean) => void
  hasPermission: (perm: Permission) => boolean
}

export interface AdminUser {
  name: string
  email: string
  role: string
  initials: string
  permissions: string[] // empty = superadmin (all access)
}

export const PERMISSIONS = {
  DASHBOARD_READ:          'dashboard:read',
  METRICS_READ:            'metrics:read',
  LIVE_READ:               'live:read',
  GAMES_READ:              'games:read',
  GAMES_WRITE:             'games:write',
  GAMES_NOTIFY:            'games:notify',
  QUESTIONS_READ:          'questions:read',
  QUESTIONS_WRITE:         'questions:write',
  USERS_READ:              'users:read',
  USERS_WRITE:             'users:write',
  WITHDRAWALS_READ:        'withdrawals:read',
  WITHDRAWALS_APPROVE:     'withdrawals:approve',
  NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
  ACTIVITY_READ:           'activity:read',
  SHOP_READ:               'shop:read',
  SHOP_WRITE:              'shop:write',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
