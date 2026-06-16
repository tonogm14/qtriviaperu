import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId, currentPlatform } from './deviceId';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? 'http://192.168.1.10:3002' : 'https://fztoapi.qtrivia.com');

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token and device fingerprint to all requests
api.interceptors.request.use(async (config) => {
  const [token, deviceId] = await Promise.all([
    AsyncStorage.getItem('qtrivia_token'),
    getDeviceId(),
  ]);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Device-ID'] = deviceId;
  config.headers['X-Platform'] = currentPlatform;
  return config;
});

// Log API errors in dev (skip analytics — those are fire-and-forget)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      const url = error?.config?.url ?? '?';
      if (!url.includes('/activity/batch')) {
        const status = error?.response?.status ?? '?';
        console.warn(`API Error [${status}] ${url}:`, error?.response?.data ?? error?.message);
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (name: string, email: string, username: string, password: string) =>
    api.post('/api/auth/register', { name, email, username, password }),
  check: (params: { email?: string; username?: string }) =>
    api.get<{ data: { emailTaken: boolean; usernameTaken: boolean } }>('/api/auth/check', { params }),
  recover: (email: string) =>
    api.post('/api/auth/recover', { email }),
  me: () =>
    api.get('/api/auth/me'),
  updateMe: (data: { name?: string; phone?: string }) =>
    api.put('/api/auth/me', data),
  registerPushToken: (token: string) =>
    api.post('/api/users/push-token', { token }),
  myStats: (userId: string) =>
    api.get(`/api/users/${userId}/stats`),
};

// Games
export const gamesApi = {
  list: (params?: { status?: string; limit?: number }) =>
    api.get('/api/games', { params }),
  get: (id: string) =>
    api.get(`/api/games/${id}`),
  join: (id: string) =>
    api.post(`/api/games/${id}/join`),
  getMyEntry: (id: string) =>
    api.get(`/api/games/${id}/my-entry`),
};

// Leaderboard
export const leaderboardApi = {
  get: (period: 'today' | 'week' | 'month' | 'all') =>
    api.get('/api/leaderboard', { params: { period } }),
};

// Notifications
export const notificationsApi = {
  list: () =>
    api.get('/api/notifications'),
  markRead: (id: string) =>
    api.put(`/api/notifications/${id}/read`),
  markAllRead: () =>
    api.put('/api/notifications/read-all'),
};

// Prizes — history of prizes delivered to the user (maps to withdrawals on the backend)
export const prizesApi = {
  list: () =>
    api.get<{ data: any[] }>('/api/withdrawals'),
};

// Config — public legal content
export const configApi = {
  getTerms: () =>
    api.get<{ data: { termsAndConditions: string } }>('/api/config/terms'),
  getPrivacy: () =>
    api.get<{ data: { privacyPolicy: string } }>('/api/config/privacy'),
};

