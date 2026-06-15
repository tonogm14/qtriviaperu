import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminStore, AdminUser, Permission } from '../types'

const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      user: null,
      token: null,
      sidebarOpen: true,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setUser: (user: AdminUser, token: string) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      hasPermission: (perm: Permission) => {
        const user = get().user
        if (!user) return false
        const perms = user.permissions ?? []
        // Empty permissions = superadmin (full access)
        if (perms.length === 0) return true
        return perms.includes(perm)
      },
    }),
    {
      name: 'qtrivia-admin',
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

export default useAdminStore
