import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Download, Shield, MoreHorizontal, Check, RefreshCw, UserX, Archive, RotateCcw, Power, Pencil, BookOpen, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Kpi } from '../components/ui/Kpi'
import { Modal } from '../components/ui/Modal'
import { Users as UsersIcon, Zap, Trophy } from 'lucide-react'
import { useUsers, useUpdateUser, useUserLedger } from '../api/hooks'
import type { User } from '../types'

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 32, faded }: { name: string; size?: number; faded?: boolean }) {
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name.charCodeAt(0) * 37) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: faded
        ? 'var(--ink-200)'
        : `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.55 0.18 ${hue + 30}))`,
      display: 'grid', placeItems: 'center',
      color: faded ? 'var(--ink-400)' : 'white', fontWeight: 700,
      fontSize: size * 0.38, flexShrink: 0, opacity: faded ? 0.6 : 1,
    }}>
      {initials}
    </div>
  )
}

// ─── Row action dropdown ──────────────────────────────────────────────────────

function ActionMenu({ user, onAction }: {
  user: User
  onAction: (action: 'edit' | 'toggle' | 'archive' | 'restore' | 'ledger') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isActive   = user.isActive !== false
  const isArchived = user.isArchived === true

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <IconButton onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}>
        <MoreHorizontal size={14} />
      </IconButton>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--ink-150)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          minWidth: 190, overflow: 'hidden',
        }}>
          <button
            className="action-menu-item"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onAction('edit') }}
          >
            <Pencil size={14} /> Editar usuario
          </button>
          <button
            className="action-menu-item"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onAction('ledger') }}
          >
            <BookOpen size={14} /> Historial de saldo
          </button>
          <div style={{ height: 1, background: 'var(--ink-100)', margin: '2px 0' }} />
          {!isArchived && (
            <button
              className="action-menu-item"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction('toggle') }}
              style={{ color: isActive ? 'var(--red-600)' : 'var(--green-600)' }}
            >
              {isActive
                ? <><UserX size={14} /> Deshabilitar</>
                : <><Power size={14} /> Habilitar</>}
            </button>
          )}
          {!isArchived && (
            <button
              className="action-menu-item"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction('archive') }}
              style={{ color: 'var(--ink-600)' }}
            >
              <Archive size={14} /> Archivar
            </button>
          )}
          {isArchived && (
            <button
              className="action-menu-item"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onAction('restore') }}
              style={{ color: 'var(--green-600)' }}
            >
              <RotateCcw size={14} /> Restaurar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }: {
  user: User
  onClose: () => void
  onSaved: () => void
}) {
  const updateUser = useUpdateUser()
  const [form, setForm] = useState({
    name:  user.name ?? '',
    phone: (user as any).phone ?? '',
    isVip: user.vip ?? false,
  })
  const [error, setError] = useState('')

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          name:  form.name.trim(),
          phone: form.phone.trim() || undefined,
          isVip: form.isVip,
        } as any,
      })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Error al guardar.')
    }
  }

  const displayName = user.name ?? user.username ?? user.email ?? user.id

  return (
    <Modal open onClose={onClose} title={`Editar: ${displayName}`} width={480}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {error && <div className="alert alert-warn">{error}</div>}

        <Input
          label="Nombre completo"
          value={form.name}
          onChange={e => upd('name', e.target.value)}
        />
        <Input
          label="Teléfono"
          placeholder="+51 999 999 999"
          value={form.phone}
          onChange={e => upd('phone', e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 10, border: '1px solid var(--ink-150)' }}>
          <label style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink-700)', cursor: 'pointer' }} htmlFor="edit-vip-toggle">
            Usuario VIP
            <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-400)', marginTop: 2 }}>Accede a juegos VIP y beneficios exclusivos</div>
          </label>
          <button
            id="edit-vip-toggle"
            type="button"
            onClick={() => upd('isVip', !form.isVip)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: form.isVip ? 'var(--brand-500)' : 'var(--ink-200)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: form.isVip ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left 0.2s',
            }} />
          </button>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--ink-50)', borderRadius: 10, border: '1px solid var(--ink-150)', fontSize: 12, color: 'var(--ink-500)' }}>
          <span style={{ fontWeight: 600 }}>Email:</span> {user.email}
          {user.username && <> · <span style={{ fontWeight: 600 }}>@</span>{user.username}</>}
          {user.createdAt && <> · Registrado {user.createdAt.slice(0, 10)}</>}
        </div>
      </div>
    </Modal>
  )
}

// ─── Ledger modal ─────────────────────────────────────────────────────────────

const LEDGER_TYPE_LABELS: Record<string, string> = {
  PRIZE_WIN:            'Premio ganado',
  ENTRY_FEE:            'Entrada a juego',
  WITHDRAWAL_REQUEST:   'Retiro solicitado',
  WITHDRAWAL_REFUND:    'Reembolso de retiro',
  BONUS:                'Bonificación',
  ADJUSTMENT:           'Ajuste manual',
}

function LedgerModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useUserLedger(user.id, page)
  const entries = data?.entries ?? []
  const total   = data?.total ?? 0
  const pages   = Math.ceil(total / 30) || 1

  return (
    <Modal open onClose={onClose} title={`Historial de saldo — ${user.name}`} width={640}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{total} movimiento{total !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</Button>
            <span style={{ fontSize: 13, color: 'var(--ink-500)', alignSelf: 'center' }}>{page} / {pages}</span>
            <Button kind="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente →</Button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>Cargando…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ padding: 24 }}>Sin movimientos de saldo registrados.</div>
      ) : (
        <div style={{ display: 'grid', gap: 1 }}>
          {entries.map((e) => {
            const isCredit = e.amount > 0
            return (
              <div key={e.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center',
                padding: '10px 4px', borderBottom: '1px solid var(--ink-100)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: isCredit ? 'var(--green-50,#f0fdf4)' : 'var(--red-50,#fff1f2)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    {isCredit
                      ? <TrendingUp size={14} style={{ color: 'var(--green-600)' }} />
                      : <TrendingDown size={14} style={{ color: 'var(--red-500)' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-800)' }}>
                      {LEDGER_TYPE_LABELS[e.type] ?? e.type}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>{e.description}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isCredit ? 'var(--green-600)' : 'var(--red-500)' }}>
                    {isCredit ? '+' : ''}S/ {e.amount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                    Haber: S/ {e.balanceAfter.toFixed(2)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', textAlign: 'right', minWidth: 70 }}>
                  {new Date(e.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  <br />
                  {new Date(e.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal open onClose={onClose} title={title} width={400}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }
    >
      <p style={{ color: 'var(--ink-600)', lineHeight: 1.6 }}>{body}</p>
    </Modal>
  )
}

// ─── User detail modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const displayName = user.name ?? user.username ?? user.email ?? user.id
  const handle = user.handle ?? (user.username ? `@${user.username}` : '—')
  const isActive   = user.isActive !== false
  const isArchived = user.isArchived === true

  const statusTone = isArchived ? 'gray' : isActive ? 'green' : 'red'
  const statusLabel = isArchived ? 'Archivado' : isActive ? 'Activo' : 'Deshabilitado'

  return (
    <Modal open onClose={onClose} title={`Perfil de ${displayName}`} width={580}>
      <div style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: 'var(--ink-50)', borderRadius: 12, border: '1px solid var(--ink-150)' }}>
          <Avatar name={displayName} size={56} faded={!isActive || isArchived} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>{displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)', fontFamily: 'var(--mono)' }}>
              {handle} · {user.id}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge tone={statusTone} dot>{statusLabel}</Badge>
              {user.vip && <Badge tone="amber">VIP</Badge>}
              {user.dni && <Badge tone="green"><Check size={11} strokeWidth={3} /> DNI</Badge>}
            </div>
          </div>
        </div>

        <div className="user-stats-grid">
          <div className="user-stat">
            <div className="user-stat-label">Juegos jugados</div>
            <div className="user-stat-value">{user.played ?? 0}</div>
          </div>
          <div className="user-stat">
            <div className="user-stat-label">Premios ganados</div>
            <div className="user-stat-value">{user.won ?? 0}</div>
          </div>
          <div className="user-stat">
            <div className="user-stat-label">Saldo disponible</div>
            <div className="user-stat-value">S/ {(user.balance ?? 0).toLocaleString('es-PE')}</div>
          </div>
          <div className="user-stat">
            <div className="user-stat-label">Vidas restantes</div>
            <div className="user-stat-value">{user.lives ?? 0}</div>
          </div>
        </div>

        <div>
          <div className="section-label">Información de cuenta</div>
          <div className="info-grid">
            <div className="info-row"><span>Email</span><span className="cell-mono">{user.email}</span></div>
            {user.city && <div className="info-row"><span>Ciudad</span><span>{user.city}</span></div>}
            <div className="info-row">
              <span>Registrado</span>
              <span>{user.joined ?? user.createdAt?.slice(0, 10) ?? '—'}</span>
            </div>
            {user.lastActive && <div className="info-row"><span>Última actividad</span><span>{user.lastActive}</span></div>}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} style={{ opacity: 0.5 }}>
          <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ink-150)' }} /><div><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 100, marginBottom: 5 }} /><div style={{ height: 10, background: 'var(--ink-100)', borderRadius: 4, width: 70 }} /></div></div></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 60 }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 60 }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 25, marginLeft: 'auto' }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 20, marginLeft: 'auto' }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 50, marginLeft: 'auto' }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 55 }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 45 }} /></td>
          <td />
        </tr>
      ))}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'disabled' | 'archived'

export function Users() {
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage]               = useState(1)
  const [confirm, setConfirm]         = useState<{
    user: User; action: 'toggle' | 'archive' | 'restore'
  } | null>(null)
  const [editUser, setEditUser]     = useState<User | null>(null)
  const [ledgerUser, setLedgerUser] = useState<User | null>(null)

  const PER_PAGE = 20
  const updateUser = useUpdateUser()

  const apiStatus = statusFilter === 'all' ? undefined : statusFilter as 'active' | 'disabled' | 'archived'

  const { data, isLoading, isError, refetch } = useUsers({
    search: search || undefined,
    status: apiStatus,
    page,
    limit: PER_PAGE,
  })

  const users: User[] = data?.data ?? []
  const total = data?.total ?? 0

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const handleAction = (user: User, action: 'edit' | 'toggle' | 'archive' | 'restore' | 'ledger') => {
    if (action === 'edit')   { setEditUser(user);   return }
    if (action === 'ledger') { setLedgerUser(user); return }
    setConfirm({ user, action: action as 'toggle' | 'archive' | 'restore' })
  }

  const handleConfirm = async () => {
    if (!confirm) return
    const { user, action } = confirm
    setConfirm(null)
    try {
      if (action === 'toggle') {
        await updateUser.mutateAsync({ id: user.id, data: { isActive: !user.isActive } as any })
      } else if (action === 'archive') {
        await updateUser.mutateAsync({ id: user.id, data: { isArchived: true, isActive: false } as any })
      } else {
        await updateUser.mutateAsync({ id: user.id, data: { isArchived: false, isActive: true } as any })
      }
      refetch()
    } catch { /* ignore */ }
  }

  const TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',      label: 'Todos' },
    { value: 'active',   label: 'Activos' },
    { value: 'disabled', label: 'Deshabilitados' },
    { value: 'archived', label: 'Archivados' },
  ]

  const confirmCopy = confirm ? {
    toggle: {
      title: confirm.user.isActive !== false ? 'Deshabilitar usuario' : 'Habilitar usuario',
      body: confirm.user.isActive !== false
        ? `${confirm.user.name ?? confirm.user.email} no podrá iniciar sesión ni jugar hasta que lo habilites nuevamente.`
        : `${confirm.user.name ?? confirm.user.email} volverá a poder iniciar sesión y jugar.`,
      label: confirm.user.isActive !== false ? 'Deshabilitar' : 'Habilitar',
      danger: confirm.user.isActive !== false,
    },
    archive: {
      title: 'Archivar usuario',
      body: `${confirm.user.name ?? confirm.user.email} quedará deshabilitado y oculto de la lista principal. Podrás restaurarlo desde el filtro "Archivados".`,
      label: 'Archivar',
      danger: true,
    },
    restore: {
      title: 'Restaurar usuario',
      body: `${confirm.user.name ?? confirm.user.email} volverá a estar activo y visible en la lista principal.`,
      label: 'Restaurar',
      danger: false,
    },
  }[confirm.action] : null

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">
            {isLoading ? 'Cargando…' : `${total.toLocaleString('es-PE')} jugadores encontrados`}
          </p>
        </div>
        <div className="page-actions">
          <Button kind="secondary" icon={Download}>Exportar CSV</Button>
          <Button kind="secondary" icon={Shield}>Lista de baneados</Button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi
          label="Total registrados"
          icon={UsersIcon}
          value={isLoading ? '…' : total.toLocaleString('es-PE')}
          delta="" trend="up" sub="en total"
          sparkData={[120, 124, 128, 131, 135, 138, 142]}
          sparkFill="var(--brand-500)"
        />
        <Kpi
          label="Activos (página)"
          icon={Zap}
          value={isLoading ? '…' : users.filter(u => u.isActive !== false && !u.isArchived).length.toString()}
          delta="" trend="up"
          sparkData={[42, 43, 44, 45, 47, 48, 49]}
          sparkColor="var(--green-500)"
          sparkFill="var(--green-500)"
        />
        <Kpi
          label="Con DNI verificado"
          value={isLoading ? '…' : users.filter(u => u.dni).length.toString()}
          delta="" trend="up" sub="en esta página"
        />
        <Kpi
          label="VIP"
          icon={Trophy}
          value={isLoading ? '…' : users.filter(u => u.vip).length.toString()}
          delta="" trend="flat"
        />
      </div>

      {isError && (
        <div style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            API no disponible — no se pudieron cargar los usuarios.
          </div>
          <Button kind="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      <Card noPad>
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="search-bar">
            <Search size={14} />
            <input
              placeholder="Buscar por nombre, @usuario o email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button kind="ghost" size="sm" onClick={handleSearch}>Buscar</Button>
          <div className="tabs inline-tabs">
            {TABS.map((t) => (
              <button
                key={t.value}
                className={`tab-btn ${statusFilter === t.value ? 'tab-btn-active' : ''}`}
                onClick={() => { setStatusFilter(t.value); setPage(1) }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <IconButton title="Recargar" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </IconButton>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Ciudad</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Juegos</th>
              <th style={{ textAlign: 'right' }}>Premios</th>
              <th style={{ textAlign: 'right' }}>Saldo</th>
              <th>Última actividad</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton />}
            {!isLoading && !isError && users.map((u) => {
              const displayName = u.name ?? u.username ?? u.email ?? u.id
              const handle = u.handle ?? (u.username ? `@${u.username}` : '—')
              const isActive   = u.isActive !== false
              const isArchived = u.isArchived === true

              const statusTone  = isArchived ? 'gray'  : isActive ? 'green' : 'red'
              const statusLabel = isArchived ? 'Archivado' : isActive ? 'Activo' : 'Deshabilitado'

              return (
                <tr
                  key={u.id}
                  style={{ cursor: 'pointer', opacity: isArchived ? 0.55 : 1 }}
                  onClick={() => navigate(`/users/${u.id}`)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={displayName} size={32} faded={!isActive || isArchived} />
                      <div>
                        <div className="cell-strong">{displayName}</div>
                        <div className="cell-meta">{handle}</div>
                      </div>
                      {u.vip && <Badge tone="amber">VIP</Badge>}
                    </div>
                  </td>
                  <td className="cell-muted">{u.city ?? '—'}</td>
                  <td>
                    <Badge tone={statusTone} dot>{statusLabel}</Badge>
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right' }}>{u.played ?? 0}</td>
                  <td className="cell-mono" style={{ textAlign: 'right' }}>
                    {(u.won ?? 0) > 0
                      ? <span style={{ color: 'var(--amber-600)', fontWeight: 600 }}>{u.won}</span>
                      : '—'}
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right' }}>
                    {(u.balance ?? 0) > 0 ? `S/ ${(u.balance ?? 0).toLocaleString('es-PE')}` : '—'}
                  </td>
                  <td className="cell-muted">{u.lastActive ?? '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu user={u} onAction={(action) => handleAction(u, action)} />
                  </td>
                </tr>
              )
            })}
            {!isLoading && !isError && users.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <p>No hay usuarios con este filtro.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>
            {isLoading ? 'Cargando…' : `${users.length} de ${total.toLocaleString('es-PE')}`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button kind="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button kind="secondary" size="sm" disabled={users.length < PER_PAGE} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        </div>
      </Card>

      {confirm && confirmCopy && (
        <ConfirmModal
          title={confirmCopy.title}
          body={confirmCopy.body}
          confirmLabel={confirmCopy.label}
          danger={confirmCopy.danger}
          onConfirm={handleConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => refetch()}
        />
      )}

      {ledgerUser && (
        <LedgerModal user={ledgerUser} onClose={() => setLedgerUser(null)} />
      )}

    </div>
  )
}
