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
  rank: number;

  // Navigation active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;

  // Leaderboard
  leaderboard: Array<{ rank: number; name: string; username: string; score: number; isMe: boolean }>;
  setLeaderboard: (leaderboard: AppStore['leaderboard']) => void;

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
        set({ token, user, authState: 'authenticated', rank: user.rank ?? 0 });
      },

      logout: async () => {
        await AsyncStorage.removeItem('qtrivia_token');
        set({ token: null, user: null, authState: 'unauthenticated', notifications: [], chatMessages: [], leaderboard: [] });
      },

      register: async (name: string, email: string, username: string, password: string) => {
        const res = await authApi.register(name, email, username, password);
        const { token, user } = res.data.data;
        await AsyncStorage.setItem('qtrivia_token', token);
        set({ token, user, authState: 'authenticated', rank: user.rank ?? 0 });
      },

      loadUser: async () => {
        try {
          const res = await authApi.me();
          const user = res.data.data;
          set({ user, rank: user.rank ?? get().rank });
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
      rank: 0,

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

      // Chat
      chatMessages: [],
      addChatMessage: (msg) =>
        set((s) => ({
          chatMessages: [...s.chatMessages.slice(-99), msg],
        })),

      // Leaderboard
      leaderboard: [],
      setLeaderboard: (leaderboard) => set({ leaderboard }),

    }),
    {
      name: 'qtrivia-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth state — everything else refreshes from API
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        authState: state.authState,
        rank: state.rank,
      }),
    }
  )
);
