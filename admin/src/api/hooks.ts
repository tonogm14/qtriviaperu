import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gamesApi, questionsApi, usersApi, withdrawalsApi, leaderboardApi, notificationsApi, activityApi, configApi, shopApi, metricsApi, badWordsApi, type GameEntry } from './client'
export type { ScheduledNotification, ActivityLogEntry, LifePack, MerchItem, ShopOrder, CartGroupItem, OrderSummaryEntry, LifeOrder, VipEntry, GameEvent, GameLogEntry } from './client'

// ─── SHOP ─────────────────────────────────────────────────────────────────────

export const useShopPacks = () =>
  useQuery({ queryKey: ['shop', 'packs'], queryFn: () => shopApi.listPacks().then(r => r.data.data) })

export const useShopMerch = () =>
  useQuery({ queryKey: ['shop', 'merch'], queryFn: () => shopApi.listMerch().then(r => r.data.data) })

export const useCreatePack = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: shopApi.createPack, onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'packs'] }) })
}
export const useUpdatePack = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof shopApi.updatePack>[1] }) => shopApi.updatePack(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'packs'] }) })
}
export const useDeletePack = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: shopApi.deletePack, onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'packs'] }) })
}
export const useCreateMerch = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: shopApi.createMerch, onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'merch'] }) })
}
export const useUpdateMerch = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof shopApi.updateMerch>[1] }) => shopApi.updateMerch(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'merch'] }) })
}
export const useDeleteMerch = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: shopApi.deleteMerch, onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'merch'] }) })
}

export const useShopOrders = (status?: string) =>
  useQuery({
    queryKey: ['shop', 'orders', status ?? 'all'],
    queryFn: () => shopApi.listOrders(status).then(r => r.data),
  })

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      shopApi.updateOrderStatus(id, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'orders'] }),
  })
}

export const useLifeOrders = () =>
  useQuery({ queryKey: ['shop', 'life-orders'], queryFn: () => shopApi.listLifeOrders().then(r => r.data.data) })

export const useVipEntries = () =>
  useQuery({ queryKey: ['shop', 'vip-entries'], queryFn: () => shopApi.listVipEntries().then(r => r.data.data) })

// ─── APP CONFIG ───────────────────────────────────────────────────────────────

export const useAppConfig = () =>
  useQuery({
    queryKey: ['config'],
    queryFn: () => configApi.get().then((r) => r.data.data),
  })

export const useUpdateConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof configApi.update>[0]) => configApi.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  })
}

// ─── GAMES ────────────────────────────────────────────────────────────────────

export const useGames = (params?: Parameters<typeof gamesApi.list>[0]) =>
  useQuery({
    queryKey: ['games', params],
    queryFn: () => gamesApi.list(params).then((r) => r.data.data),
  })

export const useGame = (id: string) =>
  useQuery({
    queryKey: ['games', id],
    queryFn: () => gamesApi.get(id).then((r) => r.data.data),
    enabled: !!id && id !== 'new',
  })

export const useCreateGame = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gamesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  })
}

export const useUpdateGame = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof gamesApi.update>[1] }) =>
      gamesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  })
}

export const useDeleteGame = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gamesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  })
}

export const useStartGame = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gamesApi.start,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  })
}

export const useGameStream = (id: string) =>
  useQuery({
    queryKey: ['game-stream', id],
    queryFn: () => gamesApi.getStream(id).then((r) => r.data.data),
    enabled: !!id,
    retry: false,
  })

export const useCreateStream = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      gamesApi.createStream(id).then((r) => r.data.data),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ['game-stream', id] }),
  })
}

export const useDeleteStream = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => gamesApi.deleteStream(id),
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ['game-stream', id] }),
  })
}

export const useSetGameQuestions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, questionIds }: { id: string; questionIds: string[] }) =>
      gamesApi.setQuestions(id, questionIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['games'] }),
  })
}

export const useGameEntries = (gameId: string, search?: string) =>
  useQuery({
    queryKey: ['game-entries', gameId, search ?? ''],
    queryFn: () => gamesApi.entries(gameId, search).then((r) => r.data),
    enabled: !!gameId,
  })

export const useGameLog = (gameId: string) =>
  useQuery({
    queryKey: ['game-log', gameId],
    queryFn: () => gamesApi.log(gameId).then((r) => r.data.data),
    enabled: !!gameId,
  })

export type { GameEntry }

// ─── QUESTIONS ────────────────────────────────────────────────────────────────

export const useQuestions = (params?: Parameters<typeof questionsApi.list>[0]) =>
  useQuery({
    queryKey: ['questions', params],
    queryFn: () => questionsApi.list(params).then((r) => r.data),
  })

export const useQuestion = (id: string) =>
  useQuery({
    queryKey: ['questions', id],
    queryFn: () => questionsApi.get(id).then((r) => r.data.data),
    enabled: !!id && id !== 'new',
  })

export const useCreateQuestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: questionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export const useUpdateQuestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof questionsApi.update>[1] }) =>
      questionsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export const useDeleteQuestion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: questionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export const useUserStats = () =>
  useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => usersApi.stats().then((r) => r.data.data),
  })

export const useUsers = (params?: Parameters<typeof usersApi.list>[0]) =>
  useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.list(params).then((r) => r.data),
  })

export const useUser = (id: string) =>
  useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof usersApi.create>[0]) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUserLedger = (userId: string | null, page = 1) =>
  useQuery({
    queryKey: ['ledger', userId, page],
    queryFn: () => usersApi.ledger(userId!, { page, limit: 30 }).then((r) => r.data.data),
    enabled: !!userId,
  })

export const useUserShopOrders = (userId: string | null) =>
  useQuery({
    queryKey: ['shop', 'orders', 'user', userId],
    queryFn: () => shopApi.listOrders(undefined, userId!).then((r) => r.data.data),
    enabled: !!userId,
  })

export const useUserLifeOrders = (userId: string | null) =>
  useQuery({
    queryKey: ['shop', 'life-orders', 'user', userId],
    queryFn: () => shopApi.listLifeOrders(userId!).then((r) => r.data.data),
    enabled: !!userId,
  })

// ─── WITHDRAWALS ──────────────────────────────────────────────────────────────

export const useWithdrawals = (params?: { status?: string }) =>
  useQuery({
    queryKey: ['withdrawals', params],
    queryFn: () => withdrawalsApi.list(params).then((r) => r.data),
  })

export const useUpdateWithdrawalStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      withdrawalsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['withdrawals'] }),
  })
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export const useLeaderboard = (period: 'today' | 'week' | 'month' | 'all') =>
  useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => leaderboardApi.get(period).then((r) => r.data.data),
  })

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const useSendBroadcast = () =>
  useMutation({
    mutationFn: notificationsApi.broadcast,
  })

export const useScheduledNotifications = () =>
  useQuery({
    queryKey: ['notifications', 'scheduled'],
    queryFn: () => notificationsApi.listScheduled().then((r) => r.data.data),
  })

export const useDeleteScheduled = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.deleteScheduled,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', 'scheduled'] }),
  })
}

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────

export const useActivityLog = (params?: Parameters<typeof activityApi.list>[0]) =>
  useQuery({
    queryKey: ['activity', params],
    queryFn: () => activityApi.list(params).then((r) => r.data.data),
    refetchInterval: 30_000,
  })

// ─── METRICS ──────────────────────────────────────────────────────────────────

export const useMetrics = (days = 7) =>
  useQuery({
    queryKey: ['metrics', days],
    queryFn: () => metricsApi.summary(days).then((r) => r.data.data),
  })

// ─── BAD WORDS ────────────────────────────────────────────────────────────────

export const useBadWords = () =>
  useQuery({ queryKey: ['badwords'], queryFn: () => badWordsApi.list().then((r) => r.data.data) })

export const useAddBadWord = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (word: string) => badWordsApi.add(word),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badwords'] }),
  })
}

export const useDeleteBadWord = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => badWordsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['badwords'] }),
  })
}
