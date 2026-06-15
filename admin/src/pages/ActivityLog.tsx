import { useState, useMemo } from 'react'
import { useActivityLog, type ActivityLogEntry } from '../api/hooks'
import {
  Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
  LogIn, LogOut, Eye, MousePointer2, DollarSign,
  Gamepad2, Heart, Bell, Smartphone, Download,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  login:               { label: 'Login',         color: '#34D399', Icon: LogIn },
  logout:              { label: 'Logout',         color: '#6B7280', Icon: LogOut },
  page_view:           { label: 'Vista',          color: '#60A5FA', Icon: Eye },
  tap:                 { label: 'Tap',            color: '#A78BFA', Icon: MousePointer2 },
  withdrawal_request:  { label: 'Retiro',         color: '#FBBF24', Icon: DollarSign },
  join_game:           { label: 'Inscripción',    color: '#34D399', Icon: Gamepad2 },
  buy_lives:           { label: 'Compra vidas',   color: '#F472B6', Icon: Heart },
  push_open:           { label: 'Push abierto',   color: '#FB923C', Icon: Smartphone },
  notification_view:   { label: 'Notificación',   color: '#818CF8', Icon: Bell },
  unknown:             { label: 'Otro',            color: '#6B7280', Icon: Activity },
}

const ALL_TYPES = Object.keys(TYPE_CONFIG)

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.unknown
  const Icon = cfg.Icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
      backgroundColor: cfg.color + '22', color: cfg.color,
      border: `1px solid ${cfg.color}44`,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function UserCell({ user }: { user: ActivityLogEntry['user'] }) {
  const safeName = String(user?.name ?? '?')
  const initials = safeName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #A855F7, #EC4899)',
        display: 'grid', placeItems: 'center',
        color: 'white', fontWeight: 700, fontSize: 11,
      }}>
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="cell-strong" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.name ?? '—'}
        </div>
        <div className="cell-meta">@{user?.username ?? '—'}</div>
      </div>
    </div>
  )
}

function MetaPreview({ raw }: { raw: string | null }) {
  if (!raw) return <span className="cell-muted">—</span>
  try {
    const parsed = JSON.parse(raw)
    const keys = Object.keys(parsed).slice(0, 3)
    return (
      <span className="cell-mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
        {keys.map((k) => `${k}:${String(parsed[k]).slice(0, 20)}`).join(' · ')}
      </span>
    )
  } catch {
    return <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>{raw.slice(0, 60)}</span>
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)    return `hace ${s}s`
  if (s < 3600)  return `hace ${Math.floor(s / 60)}m`
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
  return `hace ${Math.floor(s / 86400)}d`
}

function absoluteTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' })
}

export function ActivityLog() {
  const [userSearch, setUserSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')
  const [page, setPage]             = useState(1)

  const LIMIT = 50

  const params = useMemo(() => ({
    type:  typeFilter || undefined,
    from:  fromDate   || undefined,
    to:    toDate     || undefined,
    page,
    limit: LIMIT,
  }), [typeFilter, fromDate, toDate, page])

  const { data, isLoading, isFetching, refetch } = useActivityLog(params)

  const logs: ActivityLogEntry[] = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const filtered = useMemo(() => {
    if (!userSearch.trim()) return logs
    const q = userSearch.toLowerCase()
    return logs.filter((l) =>
      l.user?.name?.toLowerCase().includes(q) ||
      l.user?.username?.toLowerCase().includes(q) ||
      l.user?.email?.toLowerCase().includes(q)
    )
  }, [logs, userSearch])

  const handleReset = () => {
    setUserSearch('')
    setTypeFilter('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const csvDownload = () => {
    const header = 'Fecha,Usuario,Email,Tipo,Pantalla,Acción,Meta,IP\n'
    const rows = filtered.map((l) =>
      [
        absoluteTime(l.createdAt),
        l.user?.name ?? '',
        l.user?.email ?? '',
        l.type,
        l.screen ?? '',
        l.action ?? '',
        (l.meta ?? '').replace(/,/g, ';'),
        l.ip ?? '',
      ].map((v) => `"${v}"`).join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { label: 'Total eventos',   value: total.toLocaleString(),                                   color: '#A855F7' },
    { label: 'Esta página',     value: filtered.length.toLocaleString(),                         color: '#60A5FA' },
    { label: 'Tipos distintos', value: new Set(filtered.map((l) => l.type)).size.toString(),     color: '#34D399' },
    { label: 'Usuarios únicos', value: new Set(filtered.map((l) => l.userId)).size.toString(),   color: '#FBBF24' },
  ]

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Log de Actividad</h1>
          <p className="page-sub">Registro completo de cada acción de los usuarios en la app.</p>
        </div>
        <div className="page-actions">
          <Button kind="ghost" icon={Download} onClick={csvDownload} disabled={filtered.length === 0}>
            Exportar CSV
          </Button>
          <IconButton title="Actualizar" onClick={() => refetch()}>
            <RefreshCw size={14} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
          </IconButton>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: '12px 16px' }}>
            <div className="cell-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 4 }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)', pointerEvents: 'none' }} />
            <input
              className="input"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Buscar usuario…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <select
            className="input"
            style={{ minWidth: 160 }}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos los tipos</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="input"
            style={{ minWidth: 180 }}
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          />
          <input
            type="datetime-local"
            className="input"
            style={{ minWidth: 180 }}
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          />

          <Button kind="ghost" size="sm" onClick={handleReset}>Limpiar</Button>
        </div>
      </Card>

      {/* Table */}
      <Card noPad>
        <table className="table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Usuario</th>
              <th>Tipo</th>
              <th>Pantalla</th>
              <th>Acción</th>
              <th>Detalles</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--ink-400)' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state" style={{ padding: 48 }}>
                  Sin eventos registrados con los filtros actuales.
                </td>
              </tr>
            )}
            {filtered.map((log) => (
              <tr key={log.id}>
                <td>
                  <div className="cell-strong">{relativeTime(log.createdAt)}</div>
                  <div className="cell-meta">{absoluteTime(log.createdAt)}</div>
                </td>
                <td>
                  <UserCell user={log.user} />
                </td>
                <td>
                  <TypeBadge type={log.type} />
                </td>
                <td className="cell-muted">{log.screen ?? '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--ink-700)' }}>{log.action ?? '—'}</td>
                <td style={{ maxWidth: 220 }}>
                  <MetaPreview raw={log.meta} />
                </td>
                <td className="cell-mono" style={{ fontSize: 11 }}>{log.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="table-pagination">
          <span>{total.toLocaleString()} eventos · página {page} de {totalPages}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button kind="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button kind="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
