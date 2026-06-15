import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Radio, Gamepad2, HelpCircle,
  Users, Download, BarChart3, Shield, Settings,
  Sun, Moon, LogOut, Activity, ShoppingBag, PackageCheck, AlertTriangle,
} from 'lucide-react'
import { JuvQLogo } from '../JuvQLogo'
import useAdminStore from '../../store/useAdminStore'
import { PERMISSIONS, type Permission } from '../../types'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  exact?: boolean
  badge?: string
  permission?: Permission
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    group: 'OPERACIÓN',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, permission: PERMISSIONS.DASHBOARD_READ },
      { to: '/live', label: 'Monitor en vivo', icon: Radio, badge: 'LIVE', permission: PERMISSIONS.LIVE_READ },
      { to: '/games', label: 'Juegos', icon: Gamepad2, permission: PERMISSIONS.GAMES_READ },
      { to: '/questions', label: 'Preguntas', icon: HelpCircle, permission: PERMISSIONS.QUESTIONS_READ },
    ],
  },
  {
    group: 'COMUNIDAD',
    items: [
      { to: '/users', label: 'Usuarios', icon: Users, permission: PERMISSIONS.USERS_READ },
      { to: '/fraud', label: 'Antifraude', icon: AlertTriangle, permission: PERMISSIONS.USERS_READ },
      { to: '/withdrawals', label: 'Retiros', icon: Download, permission: PERMISSIONS.WITHDRAWALS_READ },
      { to: '/activity', label: 'Log Actividad', icon: Activity, permission: PERMISSIONS.ACTIVITY_READ },
      { to: '/metrics', label: 'Métricas', icon: BarChart3, permission: PERMISSIONS.METRICS_READ },
    ],
  },
  {
    group: 'TIENDA',
    items: [
      { to: '/shop/orders',   label: 'Órdenes',   icon: PackageCheck, permission: PERMISSIONS.SHOP_READ },
      { to: '/shop/products', label: 'Productos',  icon: ShoppingBag,  permission: PERMISSIONS.SHOP_WRITE },
    ],
  },
  {
    group: 'SISTEMA',
    items: [
      { to: '/profile', label: 'Mi perfil', icon: Shield },
      { to: '/settings', label: 'Configuración', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const { theme, toggleTheme, user, logout, hasPermission } = useAdminStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <JuvQLogo size={36} animated />
        </div>
        <div>
          <div className="brand-name">QTriviaPeru</div>
          <div className="brand-sub">Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={group.group}>
              <div className="nav-group-title">{group.group}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                >
                  <item.icon size={17} strokeWidth={1.8} className="nav-icon" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-spacer" />

      {/* Theme toggle */}
      <button className="nav-item" onClick={toggleTheme}>
        {theme === 'dark'
          ? <Sun size={17} strokeWidth={1.8} className="nav-icon" />
          : <Moon size={17} strokeWidth={1.8} className="nav-icon" />}
        <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>

      {/* User card */}
      <div className="sidebar-user-card">
        <div className="user-avatar">
          {user?.initials ?? 'CR'}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.name ?? 'Carla Ruiz'}</div>
          <div className="user-role">{user?.role ?? 'Productora · Lima'}</div>
        </div>
        <button className="icon-btn" title="Cerrar sesión" onClick={handleLogout}>
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
