import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Pencil, Check, TrendingUp, TrendingDown,
  LogIn, LogOut, Eye, MousePointer2, DollarSign,
  Gamepad2, Heart, Bell, Smartphone, Activity,
  UserX, Power, RefreshCw,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import {
  useUser,
  useUpdateUser,
  useUserLedger,
  useActivityLog,
  useUserShopOrders,
  useUserLifeOrders,
} from '../api/hooks'
import type { User } from '../types'
import type { ShopOrder, LifeOrder } from '../api/client'

// ─── Avatar ───────────────────────────────────────────────────────────────────

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

// ─── Ledger type labels ───────────────────────────────────────────────────────

const LEDGER_TYPE_LABELS: Record<string, string> = {
  PRIZE_WIN:          'Premio ganado',
  ENTRY_FEE:          'Entrada a juego',
  WITHDRAWAL_REQUEST: 'Retiro solicitado',
  WITHDRAWAL_REFUND:  'Reembolso de retiro',
  BONUS:              'Bonificación',
  ADJUSTMENT:         'Ajuste manual',
}

// ─── Activity type config ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  login:              { label: 'Login',        color: '#34D399', Icon: LogIn },
  logout:             { label: 'Logout',       color: '#6B7280', Icon: LogOut },
  page_view:          { label: 'Vista',        color: '#60A5FA', Icon: Eye },
  tap:                { label: 'Tap',          color: '#A78BFA', Icon: MousePointer2 },
  withdrawal_request: { label: 'Retiro',       color: '#FBBF24', Icon: DollarSign },
  join_game:          { label: 'Inscripción',  color: '#34D399', Icon: Gamepad2 },
  buy_lives:          { label: 'Compra vidas', color: '#F472B6', Icon: Heart },
  push_open:          { label: 'Push abierto', color: '#FB923C', Icon: Smartphone },
  notification_view:  { label: 'Notificación', color: '#818CF8', Icon: Bell },
  unknown:            { label: 'Otro',         color: '#6B7280', Icon: Activity },
}

const ACTIVITY_FILTER_CHIPS = [
  { value: 'todos',              label: 'Todos' },
  { value: 'login',              label: 'Login' },
  { value: 'join_game',          label: 'Inscripción' },
  { value: 'withdrawal_request', label: 'Retiro' },
  { value: 'buy_lives',          label: 'Compra vidas' },
  { value: 'push_open',          label: 'Push abierto' },
]

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65))
}

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.unknown
  const Icon = cfg.Icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
      backgroundColor: cfg.color + '22', color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ─── Edit user modal ──────────────────────────────────────────────────────────

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
    setForm((f) => ({ ...f, [k]: v }))

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
    <Modal
      open
      onClose={onClose}
      title={`Editar: ${displayName}`}
      width={480}
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
          onChange={(e) => upd('name', e.target.value)}
        />
        <Input
          label="Teléfono"
          placeholder="+51 999 999 999"
          value={form.phone}
          onChange={(e) => upd('phone', e.target.value)}
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

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      width={400}
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

// ─── Order status badge ───────────────────────────────────────────────────────

const ORDER_STATUS_MAP: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'gray' }> = {
  PENDING:   { label: 'Pendiente',   tone: 'amber' },
  CONFIRMED: { label: 'Confirmado',  tone: 'blue' },
  SHIPPED:   { label: 'Enviado',     tone: 'blue' },
  DELIVERED: { label: 'Entregado',   tone: 'green' },
  CANCELLED: { label: 'Cancelado',   tone: 'red' },
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userId = id ?? null

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useUser(userId ?? '')

  // Activity state
  const [typeFilter, setTypeFilter] = useState('todos')
  const [activityPage, setActivityPage] = useState(1)
  const ACTIVITY_LIMIT = 20

  const { data: activityData, isLoading: activityLoading } = useActivityLog({
    userId: userId ?? undefined,
    type: typeFilter !== 'todos' ? typeFilter : undefined,
    page: activityPage,
    limit: ACTIVITY_LIMIT,
  })
  const activityLogs = activityData?.logs ?? []
  const activityTotal = activityData?.total ?? 0
  const activityPages = Math.max(1, Math.ceil(activityTotal / ACTIVITY_LIMIT))

  // Ledger state
  const [ledgerPage, setLedgerPage] = useState(1)
  const { data: ledgerData, isLoading: ledgerLoading } = useUserLedger(userId, ledgerPage)
  const ledgerEntries = ledgerData?.entries ?? []
  const ledgerTotal   = ledgerData?.total ?? 0
  const ledgerPages   = Math.ceil(ledgerTotal / 30) || 1

  // Shop orders
  const { data: shopOrders = [] } = useUserShopOrders(userId)
  const { data: lifeOrders = [] } = useUserLifeOrders(userId)

  // Modals
  const [showEdit, setShowEdit]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const updateUser = useUpdateUser()

  if (userLoading) {
    return (
      <div className="fade-in" style={{ padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-400)' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando usuario…
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="fade-in" style={{ padding: 32 }}>
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>Usuario no encontrado.</div>
        <Button kind="ghost" onClick={() => navigate('/users')}>← Volver a usuarios</Button>
      </div>
    )
  }

  const displayName = user.name ?? user.username ?? user.email ?? user.id
  const handle      = user.handle ?? (user.username ? `@${user.username}` : '—')
  const isActive    = user.isActive !== false
  const isArchived  = user.isArchived === true

  const statusTone  = isArchived ? 'gray' : isActive ? 'green' : 'red'
  const statusLabel = isArchived ? 'Archivado' : isActive ? 'Activo' : 'Deshabilitado'

  const handleToggle = async () => {
    setShowConfirm(false)
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { isActive: !isActive } as any,
      })
      refetchUser()
    } catch { /* ignore */ }
  }

  // Combine shop + life orders sorted by date
  type CombinedOrder =
    | { kind: 'merch'; data: ShopOrder }
    | { kind: 'life';  data: LifeOrder }

  const combined: CombinedOrder[] = [
    ...shopOrders.map((o) => ({ kind: 'merch' as const, data: o })),
    ...lifeOrders.map((o) => ({ kind: 'life'  as const, data: o })),
  ].sort((a, b) =>
    new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
  )

  return (
    <div className="fade-in">
      {/* Back link */}
      <button
        onClick={() => navigate('/users')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: 'var(--ink-500)', fontSize: 13, background: 'none',
          border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 20,
        }}
      >
        <ChevronLeft size={15} />
        Usuarios
      </button>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── Column 1: Profile ── */}
        <div style={{ display: 'grid', gap: 12 }}>

          {/* Card 1: Profile header */}
          <Card>
            <div style={{ position: 'relative' }}>
              {/* Top action row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <button
                  onClick={() => navigate('/users')}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                  title="Volver"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setShowEdit(true)}
                  style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
              </div>

              {/* Avatar + name */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                <Avatar name={displayName} size={64} faded={!isActive || isArchived} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)', lineHeight: 1.2 }}>{displayName}</div>
                  <div className="cell-mono" style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{handle}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 1, fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.id}</div>
                </div>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Badge tone={statusTone} dot>{statusLabel}</Badge>
                {user.vip && <Badge tone="amber">VIP</Badge>}
                {user.dni && (
                  <Badge tone="green">
                    <Check size={11} strokeWidth={3} /> DNI
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Stats 2x2 */}
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {[
                { label: 'Juegos jugados',  value: user.played ?? 0,   color: undefined },
                { label: 'Premios ganados', value: user.won ?? 0,       color: (user.won ?? 0) > 0 ? 'var(--amber-600)' : undefined },
                { label: 'Saldo',           value: `S/ ${(user.balance ?? 0).toLocaleString('es-PE')}`, color: (user.balance ?? 0) > 0 ? 'var(--green-600)' : undefined },
                { label: 'Vidas',           value: user.lives ?? 0,     color: (user.lives ?? 0) > 0 ? '#F472B6' : undefined },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: '10px 12px',
                  background: i % 2 === 0 ? 'var(--ink-50)' : 'transparent',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: stat.color ?? 'var(--ink-900)' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 3: Account info */}
          <Card>
            <div className="section-label" style={{ marginBottom: 10 }}>Cuenta</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                { label: 'Email',     value: user.email },
                { label: 'Usuario',   value: user.username ? `@${user.username}` : '—' },
                { label: 'Ciudad',    value: (user as any).city ?? user.city ?? '—' },
                { label: 'DNI',       value: user.dni ? <Check size={13} style={{ color: 'var(--green-600)' }} /> : '—' },
                { label: 'Registrado', value: user.joined ?? user.createdAt?.slice(0, 10) ?? '—' },
                { label: 'Última actividad', value: user.lastActive ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="info-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-400)', flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'var(--ink-800)', fontWeight: 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Card 4: Actions */}
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button kind="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowEdit(true)}>
                Editar usuario
              </Button>
              {!isArchived && (
                <Button
                  kind="ghost"
                  style={{ width: '100%', justifyContent: 'center', color: isActive ? 'var(--red-500)' : 'var(--green-600)' }}
                  onClick={() => setShowConfirm(true)}
                >
                  {isActive
                    ? <><UserX size={14} /> Deshabilitar</>
                    : <><Power size={14} /> Habilitar</>}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* ── Column 2: Activity log ── */}
        <div>
          <Card noPad>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--ink-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-900)' }}>
                  Actividad
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--ink-400)' }}>
                    {activityTotal.toLocaleString()} eventos
                  </span>
                </div>
              </div>
              {/* Filter chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ACTIVITY_FILTER_CHIPS.map((chip) => {
                  const isActive = typeFilter === chip.value
                  const cfg = chip.value !== 'todos' ? TYPE_CONFIG[chip.value] : null
                  return (
                    <button
                      key={chip.value}
                      onClick={() => { setTypeFilter(chip.value); setActivityPage(1) }}
                      style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', border: '1px solid',
                        borderColor: isActive ? (cfg ? cfg.color : 'var(--brand-500)') : 'var(--ink-150)',
                        background: isActive ? (cfg ? cfg.color + '22' : 'var(--brand-50)') : 'transparent',
                        color: isActive ? (cfg ? cfg.color : 'var(--brand-500)') : 'var(--ink-500)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* List */}
            <div style={{ minHeight: 200 }}>
              {activityLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }} />
                  Cargando…
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>Sin actividad registrada.</div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10, alignItems: 'center',
                    padding: '10px 20px', borderBottom: '1px solid var(--ink-100)',
                  }}>
                    <TypeBadge type={log.type} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.action ?? '—'}
                      </div>
                      {log.screen && (
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--mono)' }}>{log.screen}</div>
                      )}
                      {log.ip && (
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                          {log.ip}
                          {log.country && (
                            <span style={{ marginLeft: 5, fontFamily: 'inherit' }} title={log.country}>
                              {countryFlag(log.country)} {log.country}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                      <br />
                      {new Date(log.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ink-100)' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                Pág. {activityPage} de {activityPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button kind="ghost" size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage((p) => p - 1)}>← Anterior</Button>
                <Button kind="ghost" size="sm" disabled={activityPage >= activityPages} onClick={() => setActivityPage((p) => p + 1)}>Siguiente →</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Column 3: Ledger + Purchases ── */}
        <div style={{ display: 'grid', gap: 12 }}>

          {/* Card A: Ledger */}
          <Card noPad>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--ink-100)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>
                Saldo
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--ink-400)' }}>
                  {ledgerTotal} mov.
                </span>
              </div>
            </div>

            <div style={{ minHeight: 80 }}>
              {ledgerLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>Cargando…</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>Sin movimientos.</div>
              ) : (
                ledgerEntries.map((e) => {
                  const isCredit = e.amount > 0
                  return (
                    <div key={e.id} style={{
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center',
                      padding: '8px 16px', borderBottom: '1px solid var(--ink-50)',
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: isCredit ? 'var(--green-50,#f0fdf4)' : 'var(--red-50,#fff1f2)',
                        display: 'grid', placeItems: 'center',
                      }}>
                        {isCredit
                          ? <TrendingUp size={12} style={{ color: 'var(--green-600)' }} />
                          : <TrendingDown size={12} style={{ color: 'var(--red-500)' }} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {LEDGER_TYPE_LABELS[e.type] ?? e.type}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isCredit ? 'var(--green-600)' : 'var(--red-500)', whiteSpace: 'nowrap' }}>
                          {isCredit ? '+' : ''}S/ {e.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-400)', whiteSpace: 'nowrap' }}>
                          {new Date(e.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Ledger pagination */}
            {ledgerPages > 1 && (
              <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ink-100)' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>{ledgerPage} / {ledgerPages}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button kind="ghost" size="sm" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => p - 1)}>←</Button>
                  <Button kind="ghost" size="sm" disabled={ledgerPage >= ledgerPages} onClick={() => setLedgerPage((p) => p + 1)}>→</Button>
                </div>
              </div>
            )}
          </Card>

          {/* Card B: Purchases */}
          <Card noPad>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--ink-100)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>
                Compras
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--ink-400)' }}>
                  {combined.length} pedidos
                </span>
              </div>
            </div>

            <div style={{ minHeight: 60 }}>
              {combined.length === 0 ? (
                <div className="empty-state" style={{ padding: 20 }}>Sin compras.</div>
              ) : (
                combined.map((item, idx) => {
                  if (item.kind === 'merch') {
                    const o = item.data as ShopOrder
                    const statusInfo = ORDER_STATUS_MAP[o.status] ?? { label: o.status, tone: 'gray' as const }
                    return (
                      <div key={o.id + idx} style={{
                        padding: '10px 16px', borderBottom: '1px solid var(--ink-50)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>
                            {o.items.map((i) => `${i.emoji} ${i.name}`).join(', ')}
                          </div>
                          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>S/ {o.totalAmount.toFixed(2)}</span>
                          <span>{new Date(o.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    )
                  } else {
                    const o = item.data as LifeOrder
                    return (
                      <div key={o.id + idx} style={{
                        padding: '10px 16px', borderBottom: '1px solid var(--ink-50)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-800)' }}>
                            <Heart size={11} style={{ color: '#F472B6', marginRight: 4 }} />
                            {o.packLabel}
                            <span style={{ fontWeight: 400, color: 'var(--ink-500)', marginLeft: 4 }}>
                              ({o.lives * o.quantity} vidas)
                            </span>
                          </div>
                          <Badge tone="green">Acreditado</Badge>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-400)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>S/ {o.price.toFixed(2)}</span>
                          <span>{new Date(o.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    )
                  }
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <EditUserModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={() => refetchUser()}
        />
      )}

      {showConfirm && (
        <ConfirmModal
          title={isActive ? 'Deshabilitar usuario' : 'Habilitar usuario'}
          body={isActive
            ? `${displayName} no podrá iniciar sesión ni jugar hasta que lo habilites nuevamente.`
            : `${displayName} volverá a poder iniciar sesión y jugar.`}
          confirmLabel={isActive ? 'Deshabilitar' : 'Habilitar'}
          danger={isActive}
          onConfirm={handleToggle}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
