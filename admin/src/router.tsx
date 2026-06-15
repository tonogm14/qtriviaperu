import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Games } from './pages/Games'
import { GameEdit } from './pages/GameEdit'
import { GameDetail } from './pages/GameDetail'
import { Questions } from './pages/Questions'
import { QuestionEdit } from './pages/QuestionEdit'
import { LiveMonitor } from './pages/LiveMonitor'
import { Users } from './pages/Users'
import { UserDetail } from './pages/UserDetail'
import { Withdrawals } from './pages/Withdrawals'
import { Metrics } from './pages/Metrics'
import { ActivityLog } from './pages/ActivityLog'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { ShopOrders } from './pages/ShopOrders'
import { ShopProducts } from './pages/ShopProducts'
import { Fraud } from './pages/Fraud'
import useAdminStore from './store/useAdminStore'
import { type Permission } from './types'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAdminStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequirePermission({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const hasPermission = useAdminStore((s) => s.hasPermission)
  if (!hasPermission(perm)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  )
}

function ProtectedLayout({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  return (
    <AppLayout>
      <RequirePermission perm={perm}>{children}</RequirePermission>
    </AppLayout>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout><Dashboard /></AppLayout>,
  },
  {
    path: '/live',
    element: <ProtectedLayout perm="live:read"><LiveMonitor /></ProtectedLayout>,
  },
  {
    path: '/games',
    element: <ProtectedLayout perm="games:read"><Games /></ProtectedLayout>,
  },
  {
    path: '/games/:id',
    element: <ProtectedLayout perm="games:read"><GameDetail /></ProtectedLayout>,
  },
  {
    path: '/games/new',
    element: <ProtectedLayout perm="games:write"><GameEdit /></ProtectedLayout>,
  },
  {
    path: '/games/:id/edit',
    element: <ProtectedLayout perm="games:write"><GameEdit /></ProtectedLayout>,
  },
  {
    path: '/questions',
    element: <ProtectedLayout perm="questions:read"><Questions /></ProtectedLayout>,
  },
  {
    path: '/questions/new',
    element: <ProtectedLayout perm="questions:write"><QuestionEdit /></ProtectedLayout>,
  },
  {
    path: '/questions/:id/edit',
    element: <ProtectedLayout perm="questions:write"><QuestionEdit /></ProtectedLayout>,
  },
  {
    path: '/users',
    element: <ProtectedLayout perm="users:read"><Users /></ProtectedLayout>,
  },
  {
    path: '/users/:id',
    element: <ProtectedLayout perm="users:read"><UserDetail /></ProtectedLayout>,
  },
  {
    path: '/withdrawals',
    element: <ProtectedLayout perm="withdrawals:read"><Withdrawals /></ProtectedLayout>,
  },
  {
    path: '/metrics',
    element: <ProtectedLayout perm="metrics:read"><Metrics /></ProtectedLayout>,
  },
  {
    path: '/activity',
    element: <ProtectedLayout perm="users:read"><ActivityLog /></ProtectedLayout>,
  },
  {
    path: '/profile',
    element: <AppLayout><Profile /></AppLayout>,
  },
  {
    path: '/settings',
    element: <AppLayout><Settings /></AppLayout>,
  },
  {
    path: '/shop/orders',
    element: <ProtectedLayout perm="shop:read"><ShopOrders /></ProtectedLayout>,
  },
  {
    path: '/shop/products',
    element: <ProtectedLayout perm="shop:write"><ShopProducts /></ProtectedLayout>,
  },
  {
    path: '/fraud',
    element: <ProtectedLayout perm="users:read"><Fraud /></ProtectedLayout>,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
