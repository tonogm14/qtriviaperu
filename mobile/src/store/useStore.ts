import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';

export type AuthState = 'unauthenticated' | 'authenticated';
export type GameState = 'idle' | 'lobby' | 'live' | 'finished';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isVip: boolean;
  role?: 'USER' | 'ADMIN';
  balance?: number;
  lives?: number;
  rank?: number;
}

export interface Notification {
  id: string;
  type: 'win' | 'reminder' | 'life' | 'rank' | 'bonus';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface CartItem {
  id: string;        // itemId
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  maxStock: number;  // -1 = unlimited
}

export interface WithdrawalRecord {
  id: string;
  method: 'Yape' | 'Plin' | 'BCP';
  date: string;
  amount: number;
  status: 'completado' | 'pendiente' | 'rechazado';
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  avatarColor: string;
}

interface AppStore {
  // Auth
  authState: AuthState;
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, username: string, password: string) => Promise<void>;
  loadUser: () => Promise<void>;

  // Game
  gameState: GameState;
  connectedCount: number;
  vipPot: number;
  hasLiveGame: boolean;
  setGameState: (state: GameState) => void;
  setVipPot: (value: number) => void;
  incrementVipPot: (amount: number) => void;
  setHasLiveGame: (v: boolean) => void;

  // Profile
  balance: number;
  rank: number;
  lives: number;

  // Navigation active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Withdrawals
  withdrawals: WithdrawalRecord[];
  setWithdrawals: (withdrawals: WithdrawalRecord[]) => void;
  addWithdrawal: (record: WithdrawalRecord) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;

  // Leaderboard
  leaderboard: Array<{ rank: number; name: string; username: string; score: number; isMe: boolean }>;
  setLeaderboard: (leaderboard: AppStore['leaderboard']) => void;

  // Cart (merch only — not persisted)
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQty: (id: string, qty: number) => void;
  clearCart: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth
      authState: 'unauthenticated',
      token: null,
      user: null,

      login: async (email: string, password: string) => {
        const res = await authApi.login(email, password);
        const { token, user } = res.data.data;
        await AsyncStorage.setItem('qtrivia_token', token);
        set({
          token,
          user,
          authState: 'authenticated',
          balance: user.balance ?? 0,
          lives: user.lives ?? 3,
          rank: user.rank ?? 0,
        });
      },

      logout: async () => {
        await AsyncStorage.removeItem('qtrivia_token');
        set({
          token: null,
          user: null,
          authState: 'unauthenticated',
          notifications: [],
          withdrawals: [],
          chatMessages: [],
          leaderboard: [],
        });
      },

      register: async (name: string, email: string, username: string, password: string) => {
        const res = await authApi.register(name, email, username, password);
        const { token, user } = res.data.data;
        await AsyncStorage.setItem('qtrivia_token', token);
        set({
          token,
          user,
          authState: 'authenticated',
          balance: user.balance ?? 0,
          lives: user.lives ?? 3,
          rank: user.rank ?? 0,
        });
      },

      loadUser: async () => {
        try {
          const res = await authApi.me();
          const user = res.data.data;
          set({
            user,
            balance: user.balance ?? get().balance,
            lives: user.lives ?? get().lives,
            rank: user.rank ?? get().rank,
          });
        } catch (e: any) {
          if (e?.response?.status === 401) {
            await AsyncStorage.removeItem('qtrivia_token');
            set({ token: null, user: null, authState: 'unauthenticated' });
          }
        }
      },

      // Game
      gameState: 'idle',
      connectedCount: 0,
      vipPot: 0,
      hasLiveGame: false,
      setGameState: (state) => set({ gameState: state }),
      setVipPot: (value) => set({ vipPot: value }),
      incrementVipPot: (amount) => set((s) => ({ vipPot: s.vipPot + amount })),
      setHasLiveGame: (v) => set({ hasLiveGame: v }),

      // Profile
      balance: 0,
      rank: 0,
      lives: 3,

      activeTab: 'home',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      // Withdrawals
      withdrawals: [],
      setWithdrawals: (withdrawals) => set({ withdrawals }),
      addWithdrawal: (record) =>
        set((s) => ({ withdrawals: [record, ...s.withdrawals] })),

      // Chat
      chatMessages: [],
      addChatMessage: (msg) =>
        set((s) => ({
          chatMessages: [...s.chatMessages.slice(-99), msg],
        })),

      // Leaderboard
      leaderboard: [],
      setLeaderboard: (leaderboard) => set({ leaderboard }),

      // Cart
      cart: [],
      addToCart: (item) =>
        set((s) => {
          const existing = s.cart.find((c) => c.id === item.id);
          if (existing) {
            const max = item.maxStock === -1 ? 10 : item.maxStock;
            return {
              cart: s.cart.map((c) =>
                c.id === item.id ? { ...c, quantity: Math.min(c.quantity + item.quantity, max) } : c
              ),
            };
          }
          return { cart: [...s.cart, { ...item }] };
        }),
      removeFromCart: (id) => set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
      updateCartQty: (id, qty) =>
        set((s) => ({
          cart: qty <= 0
            ? s.cart.filter((c) => c.id !== id)
            : s.cart.map((c) => (c.id === id ? { ...c, quantity: qty } : c)),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'qtrivia-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth state — everything else refreshes from API
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        authState: state.authState,
        balance: state.balance,
        lives: state.lives,
        rank: state.rank,
        // vipPot excluded — purely cosmetic, resets from API each session
      }),
    }
  )
);
