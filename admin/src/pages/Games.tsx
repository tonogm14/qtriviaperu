import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Eye, Pencil, Trash2, Filter, Calendar, RefreshCw, Bell, Repeat2, Heart, Crown, Star, Play, XCircle, Archive } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useGames, useUpdateGame, useDeleteGame, useStartGame, useSendBroadcast, useScheduledNotifications, useDeleteScheduled } from '../api/hooks'
import type { ScheduledNotification } from '../api/hooks'
import type { Game } from '../types'

const TABS = [
  { value: 'programado', label: 'Programados', apiStatus: 'PENDING' },
  { value: 'envivo', label: 'En vivo', apiStatus: 'LIVE' },
  { value: 'proximo', label: 'Próximos', apiStatus: 'LOBBY' },
  { value: 'finalizado', label: 'Finalizados', apiStatus: 'FINISHED' },
  { value: 'cancelado', label: 'Cancelados / Archivados', apiStatus: 'CANCELLED' },
  { value: 'todos', label: 'Todos' },
]

/** Map API status to UI tab value */
function apiStatusToTab(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'programado',
    LOBBY: 'proximo',
    LIVE: 'envivo',
    FINISHED: 'finalizado',
    CANCELLED: 'cancelado',
    ARCHIVED: 'cancelado',
  }
  return map[status] ?? 'cancelado'
}

function gameTime(g: Game): string {
  if (g.time) return g.time
  if (g.scheduledAt) {
    return new Date(g.scheduledAt!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
  }
  return '—'
}

function gameDate(g: Game): string {
  if (g.date) return g.date
  if (g.scheduledAt) return new Date(g.scheduledAt!).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return '—'
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} style={{ opacity: 0.5 }}>
          <td><div style={{ height: 14, background: 'var(--ink-150)', borderRadius: 4, width: '70%', marginBottom: 6 }} /><div style={{ height: 11, background: 'var(--ink-100)', borderRadius: 4, width: '40%' }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: '60%' }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 70 }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: '80%', marginLeft: 'auto' }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 30, marginLeft: 'auto' }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 50, marginLeft: 'auto' }} /></td>
          <td />
        </tr>
      ))}
    </>
  )
}



type BroadcastTarget = 'all' | 'game' | 'user' | 'vip'
type BroadcastType = 'reminder' | 'bonus' | 'win' | 'rank' | 'life' | 'general'

// Today's date as YYYY-MM-DD in Lima timezone
function todayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}
function nowTime() {
  return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
}

function ScheduledList() {
  const { data: items = [], isLoading } = useScheduledNotifications()
  const deleteScheduled = useDeleteScheduled()

  if (isLoading) return <div style={{ fontSize: 13, color: 'var(--ink-400)' }}>Cargando programados…</div>
  if (items.length === 0) return <div style={{ fontSize: 13, color: 'var(--ink-400)' }}>No hay notificaciones programadas pendientes.</div>

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((n: ScheduledNotification) => {
        const fireAt = new Date(n.scheduledFor)
        return (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', border: '1px solid var(--ink-200)',
            borderRadius: 8, fontSize: 13,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
              <div style={{ color: 'var(--ink-500)', marginTop: 2 }}>
                {fireAt.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · '}{
                  n.target === 'game' ? 'Participantes del juego' :
                  n.target === 'vip'  ? 'Solo usuarios VIP' :
                  n.target === 'user' ? n.userEmail :
                  'Todos los usuarios'
                }
              </div>
            </div>
            <button
              onClick={() => deleteScheduled.mutate(n.id)}
              disabled={deleteScheduled.isPending}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: 4 }}
              title="Cancelar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function SendNotificationModal({
  open,
  onClose,
  preselectedGame,
}: {
  open: boolean
  onClose: () => void
  preselectedGame?: { id: string; title: string } | null
}) {
  const sendBroadcast = useSendBroadcast()
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'general' as BroadcastType,
    target: (preselectedGame ? 'game' : 'all') as BroadcastTarget,
    userEmail: '',
    sendMode: 'now' as 'now' | 'scheduled',
    schedDate: todayDate(),
    schedTime: nowTime(),
  })
  const [result, setResult] = useState<{ scheduled?: boolean; dbSaved?: number; pushSent?: number; scheduledFor?: string; message: string } | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'compose' | 'list'>('compose')

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSend = async () => {
    setError('')
    setResult(null)
    try {
      const scheduledFor = form.sendMode === 'scheduled'
        ? new Date(`${form.schedDate}T${form.schedTime}:00`).toISOString()
        : undefined
      const res = await sendBroadcast.mutateAsync({
        title: form.title,
        body: form.body,
        type: form.type,
        target: form.target,
        gameId: form.target === 'game' && preselectedGame ? preselectedGame.id : undefined,
        userEmail: form.target === 'user' ? form.userEmail : undefined,
        scheduledFor,
      })
      setResult(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al enviar la notificación.')
    }
  }

  const handleClose = () => {
    setForm({ title: '', body: '', type: 'general', target: preselectedGame ? 'game' : 'all', userEmail: '', sendMode: 'now', schedDate: todayDate(), schedTime: nowTime() })
    setResult(null)
    setError('')
    setTab('compose')
    onClose()
  }

  const sendLabel = form.sendMode === 'scheduled' ? 'Programar' : 'Enviar ahora'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Notificación push"
      width={540}
      footer={
        result ? (
          <Button kind="primary" onClick={handleClose}>Cerrar</Button>
        ) : tab === 'list' ? (
          <Button kind="ghost" onClick={handleClose}>Cerrar</Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" onClick={handleClose}>Cancelar</Button>
            <Button
              kind="primary"
              onClick={handleSend}
              disabled={
                sendBroadcast.isPending ||
                !form.title.trim() ||
                !form.body.trim() ||
                (form.target === 'user' && !form.userEmail.trim())
              }
            >
              {sendBroadcast.isPending ? 'Guardando…' : sendLabel}
            </Button>
          </div>
        )
      }
    >
      {/* Tab bar */}
      {!result && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--ink-150)', paddingBottom: 12 }}>
          {(['compose', 'list'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--brand-100, #ede9fe)' : 'transparent',
                color: tab === t ? 'var(--brand-700, #6d28d9)' : 'var(--ink-500)',
              }}
            >
              {t === 'compose' ? 'Nueva notificación' : 'Programadas'}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {result ? (
          <div className="alert alert-info" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{result.scheduled ? '🗓️' : '✅'}</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {result.scheduled ? 'Notificación programada' : 'Notificación enviada'}
            </div>
            {result.scheduled
              ? <div>Se enviará el {new Date(result.scheduledFor!).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              : <div>{result.dbSaved} registros en DB · {result.pushSent} push enviados</div>
            }
          </div>
        ) : tab === 'list' ? (
          <ScheduledList />
        ) : (
          <>
            {error && <div className="alert alert-warn">{error}</div>}

            {preselectedGame && (
              <div className="alert alert-info">
                <Bell size={14} style={{ display: 'inline', marginRight: 6 }} />
                Notificando participantes de: <strong>{preselectedGame.title}</strong>
              </div>
            )}

            <Input
              label="Título"
              placeholder="Ej. ¡Comienza en 10 minutos!"
              value={form.title}
              onChange={(e) => upd('title', e.target.value)}
            />
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-600)' }}>Mensaje</label>
              <textarea
                rows={3}
                placeholder="Texto de la notificación…"
                value={form.body}
                onChange={(e) => upd('body', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid var(--ink-200)',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="form-grid-2">
              <Select
                label="Tipo"
                value={form.type}
                onChange={(e) => upd('type', e.target.value as BroadcastType)}
              >
                <option value="general">General</option>
                <option value="reminder">Recordatorio</option>
                <option value="bonus">Bonus</option>
                <option value="win">Victoria</option>
                <option value="rank">Ranking</option>
                <option value="life">Vida</option>
              </Select>
              <Select
                label="Destinatarios"
                value={form.target}
                onChange={(e) => upd('target', e.target.value as BroadcastTarget)}
                disabled={!!preselectedGame}
              >
                <option value="all">Todos los usuarios</option>
                {preselectedGame && <option value="game">Solo participantes del juego</option>}
                {!preselectedGame && <option value="vip">Solo usuarios VIP</option>}
                {!preselectedGame && <option value="user">Usuario específico</option>}
              </Select>
            </div>

            {form.target === 'user' && (
              <Input
                label="Email del usuario"
                placeholder="correo@ejemplo.com"
                type="email"
                value={form.userEmail}
                onChange={(e) => upd('userEmail', e.target.value)}
                hint="Debe estar registrado en el sistema"
              />
            )}

            {/* Send mode toggle */}
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-600)' }}>Cuándo enviar</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['now', 'scheduled'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => upd('sendMode', mode)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      border: form.sendMode === mode ? '2px solid var(--brand-600, #7c3aed)' : '1.5px solid var(--ink-200)',
                      background: form.sendMode === mode ? 'var(--brand-50, #f5f3ff)' : 'transparent',
                      color: form.sendMode === mode ? 'var(--brand-700, #6d28d9)' : 'var(--ink-500)',
                    }}
                  >
                    {mode === 'now' ? '⚡ Enviar ahora' : '🗓️ Programar'}
                  </button>
                ))}
              </div>
              {form.sendMode === 'scheduled' && (
                <div className="form-grid-2">
                  <Input
                    label="Fecha (Lima · GMT-5)"
                    type="date"
                    value={form.schedDate}
                    onChange={(e) => upd('schedDate', e.target.value)}
                  />
                  <Input
                    label="Hora"
                    type="time"
                    value={form.schedTime}
                    onChange={(e) => upd('schedTime', e.target.value)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function StartGameModal({
  game,
  onClose,
}: {
  game: Game | null
  onClose: () => void
}) {
  const startGame = useStartGame()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!game) return
    setError('')
    try {
      await startGame.mutateAsync(game.id)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al iniciar el juego.')
    }
  }

  const handleClose = () => {
    setConfirm('')
    setError('')
    onClose()
  }

  const isReady = confirm === 'INICIAR'

  return (
    <Modal
      open={game !== null}
      onClose={handleClose}
      title="Iniciar juego ahora"
      width={460}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={handleClose}>Cancelar</Button>
          <Button
            kind="danger"
            onClick={handleStart}
            disabled={!isReady || startGame.isPending}
            icon={Play}
          >
            {startGame.isPending ? 'Iniciando…' : 'Iniciar juego'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="alert alert-warn">
          <strong>⚠️ Esta acción es irreversible.</strong> El juego pasará a estado <strong>EN VIVO</strong> de inmediato y todos los jugadores inscritos recibirán el inicio.
        </div>

        {game && (
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--ink-50)', border: '1px solid var(--ink-200)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{game.title}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              {gameDate(game).slice(5).replace('-', '/')} · {gameTime(game)} Lima
              {' · '}{game._count?.entries ?? game.players ?? 0} jugadores
              {' · '}S/ {game.prize.toLocaleString('es-PE')} en premios
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-600)' }}>
            Escribe <code style={{ background: 'var(--ink-100)', padding: '1px 5px', borderRadius: 4 }}>INICIAR</code> para confirmar
          </label>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.toUpperCase())}
            placeholder="INICIAR"
            autoFocus
            style={{
              padding: '10px 14px', border: `1.5px solid ${isReady ? 'var(--green-500, #22c55e)' : 'var(--ink-200)'}`,
              borderRadius: 8, fontSize: 14, outline: 'none', fontWeight: 600,
              color: isReady ? 'var(--green-700, #15803d)' : 'inherit',
              transition: 'border-color 0.15s',
            }}
          />
        </div>

        {error && <div className="alert alert-warn">{error}</div>}
      </div>
    </Modal>
  )
}

function GameTypeBadge({ type, isRecurring }: { type?: string; isRecurring?: boolean }) {
  if (type === 'FREE') return <Badge tone="green"><Heart size={10} style={{ display:'inline', marginRight:3 }} />Gratis</Badge>
  if (type === 'VIP') return <Badge tone="brand"><Crown size={10} style={{ display:'inline', marginRight:3 }} />VIP</Badge>
  if (type === 'SPECIAL') return <Badge tone="amber"><Star size={10} style={{ display:'inline', marginRight:3 }} />Especial</Badge>
  return null
}

export function Games() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('programado')

  const [deleteError, setDeleteError] = useState('')
  const [notifTarget, setNotifTarget] = useState<{ id: string; title: string } | null>(null)
  const [startTarget, setStartTarget] = useState<Game | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Game | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Game | null>(null)
  const [deleteRecurringTarget, setDeleteRecurringTarget] = useState<Game | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null) // "YYYY-MM"

  const { data: games = [], isLoading, isError, refetch } = useGames({ limit: 100 })
  const deleteGame = useDeleteGame()
  const updateGame = useUpdateGame()

  // Derive available months from loaded games
  const availableMonths = Array.from(new Set(
    games.map((g) => {
      const d = new Date(g.scheduledAt!)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  )).sort()

  const gamesByTab = tab === 'todos' ? games : games.filter((g) => apiStatusToTab(g.status) === tab)
  const filtered = selectedMonth
    ? gamesByTab.filter((g) => {
        const d = new Date(g.scheduledAt!)
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return m === selectedMonth
      })
    : gamesByTab

  const countFor = (tabValue: string) => {
    const base = games.filter((g) => apiStatusToTab(g.status) === tabValue)
    if (!selectedMonth) return base.length
    return base.filter((g) => {
      const d = new Date(g.scheduledAt!)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth
    }).length
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este juego?')) return
    setDeleteError('')
    try {
      await deleteGame.mutateAsync(id)
    } catch (err: any) {
      const d = err?.response?.data
      setDeleteError(d?.error ?? d?.message ?? 'Error al eliminar el juego.')
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await updateGame.mutateAsync({ id: cancelTarget.id, data: { status: 'CANCELLED' } })
      setCancelTarget(null)
    } catch (err: any) {
      const d = err?.response?.data
      setDeleteError(d?.error ?? d?.message ?? 'Error al cancelar el juego.')
      setCancelTarget(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await deleteGame.mutateAsync(archiveTarget.id)
      setArchiveTarget(null)
    } catch (err: any) {
      const d = err?.response?.data
      setDeleteError(d?.error ?? d?.message ?? 'Error al archivar el juego.')
      setArchiveTarget(null)
    }
  }

  const handleDeleteRecurring = async () => {
    if (!deleteRecurringTarget) return
    try {
      await updateGame.mutateAsync({ id: deleteRecurringTarget.id, data: { status: 'CANCELLED' } })
      setDeleteRecurringTarget(null)
    } catch (err: any) {
      const d = err?.response?.data
      setDeleteError(d?.error ?? d?.message ?? 'Error al archivar el juego.')
      setDeleteRecurringTarget(null)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Juegos</h1>
          <p className="page-sub">Programa, edita y monitorea todos los juegos de QTriviaPeru</p>
        </div>
        <div className="page-actions">
          <Button kind="secondary" icon={Download}>Exportar</Button>
          <Button kind="secondary" icon={Bell} onClick={() => setNotifTarget({ id: '', title: '' })}>Notificar todos</Button>
          <Button kind="primary" icon={Plus} onClick={() => navigate('/games/new')}>Crear juego</Button>
        </div>
      </div>

      {deleteError && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          {deleteError}
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`tab-btn ${tab === t.value ? 'tab-btn-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
            <span className="tab-count">
              {t.value === 'todos' ? games.length : countFor(t.value)}
            </span>
          </button>
        ))}
      </div>

      <Card noPad>
        <div className="table-toolbar">
          <Button kind="ghost" size="sm" icon={Filter}>Filtros</Button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={selectedMonth ?? ''}
              onChange={(e) => setSelectedMonth(e.target.value || null)}
              style={{
                appearance: 'none', cursor: 'pointer',
                paddingLeft: 28, paddingRight: 24, paddingTop: 6, paddingBottom: 6,
                border: selectedMonth ? '1.5px solid var(--brand-400,#a78bfa)' : '1.5px solid var(--ink-200)',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: selectedMonth ? 'var(--brand-50,#f5f3ff)' : 'var(--ink-0,#fff)',
                color: selectedMonth ? 'var(--brand-700,#6d28d9)' : 'var(--ink-600)',
              }}
            >
              <option value="">Todos los meses</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split('-')
                const label = new Date(Number(y), Number(m) - 1, 1)
                  .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
                return <option key={ym} value={ym}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
              })}
            </select>
            <Calendar size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: selectedMonth ? 'var(--brand-600,#7c3aed)' : 'var(--ink-400)' }} />
          </div>
          <span className="table-count">{filtered.length} juegos</span>
          <IconButton title="Recargar" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </IconButton>
        </div>

        {isError && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              API no disponible — no se pudieron cargar los juegos.
            </div>
            <Button kind="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
          </div>
        )}

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Juego</th>
                <th>Fecha · Hora</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Premio</th>
                <th style={{ textAlign: 'right' }}>Preguntas</th>
                <th style={{ textAlign: 'right' }}>Jugadores</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton />}
              {!isLoading && !isError && filtered.map((g) => {
                const uiStatus = apiStatusToTab(g.status)
                const date = gameDate(g)
                const time = gameTime(g)
                const players = g.players ?? g._count?.entries ?? 0
                const questions = g._count?.questions ?? g.maxQuestions ?? 0
                const isRecurring = g.isRecurring
                return (
                  <tr key={g.id}>
                    <td>
                      <div className="cell-strong" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {g.title}
                        {isRecurring && <Repeat2 size={12} style={{ color: 'var(--ink-400)', flexShrink: 0 }} />}
                      </div>
                      <div className="cell-meta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <GameTypeBadge type={g.type} isRecurring={isRecurring} />
                        <span>{g.category ?? '—'}</span>
                        {g.entryFee > 0 && <span>· Entrada S/{g.entryFee}</span>}
                      </div>
                    </td>
                    <td className="cell-mono">
                      {isRecurring
                        ? <div>
                            <div style={{ fontWeight: 600 }}>{g.recurringTime ?? time} Lima</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                              {date.slice(5).replace('-', '/')} próximo
                            </div>
                          </div>
                        : `${date.slice(5).replace('-', '/')} · ${time}`}
                    </td>
                    <td><StatusBadge status={uiStatus as any} /></td>
                    <td className="cell-mono" style={{ textAlign: 'right' }}>
                      S/ {g.prize.toLocaleString('es-PE')}
                    </td>
                    <td className="cell-mono" style={{ textAlign: 'right' }}>{questions}</td>
                    <td className="cell-mono" style={{ textAlign: 'right' }}>
                      {players > 0
                        ? players.toLocaleString('es-PE')
                        : <span className="cell-empty">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(g.status === 'PENDING' || g.status === 'LOBBY') && (
                          <IconButton
                            title="Iniciar juego ahora"
                            onClick={() => setStartTarget(g)}
                            style={{ color: 'var(--green-600, #16a34a)', background: 'var(--green-50, #f0fdf4)', borderColor: 'var(--green-200, #bbf7d0)' }}
                          >
                            <Play size={14} />
                          </IconButton>
                        )}
                        <IconButton title="Ver detalle" onClick={() => navigate(`/games/${g.id}`)}>
                          <Eye size={14} />
                        </IconButton>
                        <IconButton title="Editar" onClick={() => navigate(`/games/${g.id}/edit`)}>
                          <Pencil size={14} />
                        </IconButton>
                        <IconButton
                          title="Enviar notificación"
                          onClick={() => setNotifTarget({ id: g.id, title: g.title })}
                        >
                          <Bell size={14} />
                        </IconButton>
                        {(g.status === 'PENDING' || g.status === 'LOBBY' || g.status === 'LIVE') && (
                          <IconButton
                            title="Cancelar juego"
                            onClick={() => setCancelTarget(g)}
                            style={{ color: 'var(--amber-600,#d97706)', background: 'var(--amber-50,#fffbeb)', borderColor: 'var(--amber-200,#fde68a)' }}
                          >
                            <XCircle size={14} />
                          </IconButton>
                        )}
                        {g.status === 'CANCELLED' && !isRecurring && (
                          <IconButton
                            title="Archivar (eliminar)"
                            onClick={() => setArchiveTarget(g)}
                            style={{ color: 'var(--ink-500)', background: 'var(--ink-100)', borderColor: 'var(--ink-200)' }}
                          >
                            <Archive size={14} />
                          </IconButton>
                        )}
                        {!isRecurring && g.status !== 'CANCELLED' && (
                          <IconButton title="Eliminar" onClick={() => handleDelete(g.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                        {isRecurring && g.status === 'CANCELLED' && (
                          <IconButton
                            title="Reactivar juego"
                            onClick={async () => {
                              try { await updateGame.mutateAsync({ id: g.id, data: { status: 'PENDING' } }) }
                              catch (err: any) { setDeleteError(err?.response?.data?.message ?? 'Error al reactivar.') }
                            }}
                            style={{ color: '#16a34a', background: '#f0fdf4', borderColor: '#bbf7d0' }}
                          >
                            <Play size={14} />
                          </IconButton>
                        )}
                        {isRecurring && g.status !== 'CANCELLED' && (
                          <IconButton
                            title="Archivar juego recurrente"
                            onClick={() => setDeleteRecurringTarget(g)}
                            style={{ color: '#dc2626', background: '#fef2f2', borderColor: '#fecaca' }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <SendNotificationModal
        open={notifTarget !== null}
        onClose={() => setNotifTarget(null)}
        preselectedGame={notifTarget?.id ? notifTarget : null}
      />
      <StartGameModal
        game={startTarget}
        onClose={() => { setStartTarget(null); refetch() }}
      />

      {/* Cancel game modal */}
      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title="Cancelar juego"
        width={420}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button kind="ghost" onClick={() => setCancelTarget(null)}>Volver</Button>
            <Button
              kind="primary"
              onClick={handleCancel}
              disabled={updateGame.isPending}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              {updateGame.isPending ? 'Cancelando…' : 'Sí, cancelar juego'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-700)' }}>
          ¿Cancelar <strong>{cancelTarget?.title}</strong>? El juego pasará a estado <em>Cancelado</em> y los jugadores no podrán unirse. Luego podrás archivarlo para eliminarlo definitivamente.
        </p>
      </Modal>

      {/* Delete recurring game modal */}
      <Modal
        open={deleteRecurringTarget !== null}
        onClose={() => setDeleteRecurringTarget(null)}
        title="Archivar juego recurrente"
        width={440}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button kind="ghost" onClick={() => setDeleteRecurringTarget(null)}>Volver</Button>
            <Button
              kind="primary"
              onClick={handleDeleteRecurring}
              disabled={updateGame.isPending}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              {updateGame.isPending ? 'Archivando…' : 'Sí, archivar juego'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink-700)' }}>
          Vas a archivar <strong>{deleteRecurringTarget?.title}</strong> ({deleteRecurringTarget?.type}). El juego pasará a estado <em>Cancelado</em> y dejará de aparecer en los programados.
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>
          Los datos se conservan. Úsalo para archivar duplicados.
        </p>
      </Modal>

      {/* Archive game modal */}
      <Modal
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        title="Archivar juego"
        width={420}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button kind="ghost" onClick={() => setArchiveTarget(null)}>Volver</Button>
            <Button
              kind="primary"
              onClick={handleArchive}
              disabled={deleteGame.isPending}
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
            >
              {deleteGame.isPending ? 'Archivando…' : 'Sí, archivar y eliminar'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-700)' }}>
          ¿Archivar <strong>{archiveTarget?.title}</strong>? Esta acción <strong>eliminará el juego permanentemente</strong> junto con todos sus datos. No se puede deshacer.
        </p>
      </Modal>
    </div>
  )
}
