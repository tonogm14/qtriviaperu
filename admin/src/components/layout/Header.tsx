import React, { useState } from 'react'
import { Search, Bell, Menu } from 'lucide-react'
import useAdminStore from '../../store/useAdminStore'

interface HeaderProps {
  title?: string
  crumbs?: React.ReactNode
  right?: React.ReactNode
  onMenuClick?: () => void
}

export function Header({ title, crumbs, right, onMenuClick }: HeaderProps) {
  const [_search, setSearch] = useState('')

  return (
    <header className="header">
      {onMenuClick && (
        <button className="icon-btn md-hide" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
      )}
      <div className="header-title-group">
        {title && <div className="header-title">{title}</div>}
        {crumbs && <div className="header-crumbs">{crumbs}</div>}
      </div>
      <div className="header-search">
        <Search size={15} className="header-search-icon" />
        <input
          placeholder="Buscar juegos, usuarios, preguntas…"
          value={_search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" style={{ position: 'relative' }} title="Notificaciones">
        <Bell size={17} />
        <span className="notification-dot" />
      </button>
      {right}
    </header>
  )
}
