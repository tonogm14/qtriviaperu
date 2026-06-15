import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import useAdminStore from '../../store/useAdminStore'

interface ShellProps {
  children: React.ReactNode
}

export function Shell({ children }: ShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { theme } = useAdminStore()

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark')
    document.body.classList.toggle('light', theme !== 'dark')
  }, [theme])

  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark' : 'light'}`}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div className="main-content">
        <Header onMenuClick={() => setMobileSidebarOpen((o) => !o)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
