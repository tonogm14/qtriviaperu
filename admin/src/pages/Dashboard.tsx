import { useNavigate } from 'react-router-dom'
import { Users, Trophy, Calendar, Plus, RefreshCw, Eye, Play, Activity, LogIn, LogOut, MousePointer2, DollarSign, Gamepad2, Heart, Smartphone, Bell, DollarSign as WalletIcon } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Kpi } from '../components/ui/Kpi'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { useGames, useUserStats, useWithdrawals, useActivityLog } from '../api/hooks'

const TYPE_ICON: Record<string, { Icon: React.ElementType; tone: string }> = {
  login:              { Icon: LogIn,         tone: 'green'  },
  logout:             { Icon: LogOut,        tone: 'gray'   },
  page_view:          { Icon: Eye,           tone: 'gray'   },
  tap:                { Icon: MousePointer2, tone: 'brand'  },
  withdrawal_request: { Icon: DollarSign,    tone: 'amber'  },
  join_game:          { Icon: Gamepad2,      tone: 'green'  },
  buy_lives:          { Icon: Heart,         tone: 'brand'  },
  push_open:          { Icon: Smartphone,    tone: 'amber'  },
  notification_view:  { Icon: Bell,          tone: 'gray'   },
}

function relTime(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `hace ${s}s`
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`
  return `hace ${Math.floor(s / 3600)}h`
}

function ActivityFeed() {
  const navigate = useNavigate()
  const { data, isFetching, refetch } = useActivityLog({ limit: 8, page: 1 })
  const logs = data?.logs ?? []

  return (
    <Card noPad>
      <CardHeader
        title="Actividad reciente"
        sub={`${data?.total?.toLocaleString() ?? '…'} eventos en total`}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            <IconButton title="Actualizar" onClick={() => refetch()}>
              <RefreshCw size={15} style={isFetching ? { animation: 'spin 1s linear infinite' } : {}} />
            </IconButton>
            <Button size="sm" onClick={() => navigate('/activity')}>Ver todo →</Button>
          </div>
        }
      />
      <div>
        {logs.length === 0 && !isFetching && (
          <div className="activity-item">
            <div className="activity-content">
              <div className="activity-text" style={{ color: 'var(--ink-400)' }}>Sin eventos recientes</div>
            </div>
          </div>
        )}
        {logs.map((log, i) => {
          const cfg = TYPE_ICON[log.type] ?? { Icon: Activity, tone: 'gray' }
          const text = [log.user?.name, log.screen, log.action].filter(Boolean).join(' · ')
          return (
            <div key={log.id} className={`activity-item ${i < logs.length - 1 ? 'activity-item-border' : ''}`}>
              <div className={`activity-icon activity-icon-${cfg.tone}`}>
                <cfg.Icon size={14} strokeWidth={2} />
              </div>
              <div className="activity-content">
                <div className="activity-text">{text || log.type}</div>
                <div className="activity-time">{relTime(log.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function GameRowSkeleton() {
  return (
    <div className="game-row" style={{ opacity: 0.5 }}>
      <div className="game-row-thumb" style={{ background: 'var(--ink-150)' }} />
      <div className="game-row-info">
        <div style={{ height: 14, background: 'var(--ink-150)', borderRadius: 4, width: '60%', marginBottom: 8 }} />
        <div style={{ height: 11, background: 'var(--ink-100)', borderRadius: 4, width: '40%' }} />
      </div>
    </div>
  )
}

function gameTime(g: any): string {
  if (g.time) return g.time
  if (g.scheduledAt) {
    const d = new Date(g.scheduledAt)
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return '—'
}

function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'programado', LOBBY: 'proximo', LIVE: 'envivo',
    FINISHED: 'finalizado', CANCELLED: 'cancelado',
  }
  return map[status] ?? status
}

export function Dashboard() {
  const navigate = useNavigate()

  const { data: gamesData, isLoading: gamesLoading, isError: gamesError, refetch } = useGames()
  const { data: userStats, isLoading: usersLoading } = useUserStats()
  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useWithdrawals()

  const pendingWithdrawals = (withdrawalsData?.data ?? []).filter((w: any) => {
    const s = w.status?.toLowerCase()
    return s === 'pending' || s === 'pendiente'
  }).length
  const liveGames = gamesData?.filter((g) => g.status === 'LIVE' || g.status === 'envivo').length ?? 0

  const displayGames = gamesData
    ? [...gamesData]
        .sort((a, b) => {
          const priority: Record<string, number> = { LIVE: 0, envivo: 0, LOBBY: 1, proximo: 1, PENDING: 2, programado: 2 }
          return (priority[a.status] ?? 9) - (priority[b.status] ?? 9)
        })
        .slice(0, 5)
    : []

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-sub">QTriviaPeru · Administración</p>
        </div>
        <div className="page-actions">
          <Button kind="secondary" icon={Calendar}>Hoy</Button>
          <Button kind="primary" icon={Plus} onClick={() => navigate('/games/new')}>Crear juego</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {/* Users card — split by role + new today */}
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Users size={15} style={{ color: 'var(--ink-400)' }} />
            <span className="kpi-label">Usuarios</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1 }}>
                {usersLoading ? '…' : (userStats?.totalUsers ?? 0).toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>Jugadores (USER)</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 900, color: 'var(--brand-600)', lineHeight: 1 }}>
                {usersLoading ? '…' : (userStats?.totalAdmins ?? 0).toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>Administradores (ADMIN)</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 900, color: 'var(--green-600)', lineHeight: 1 }}>
                {usersLoading ? '…' : `+${(userStats?.newToday ?? 0).toLocaleString('es-PE')}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4 }}>Nuevos hoy</div>
            </div>
          </div>
        </Card>

        <Kpi
          label="Juegos programados"
          icon={Trophy}
          value={gamesLoading ? '…' : (gamesData?.length ?? 0).toString()}
          delta={gamesLoading ? '' : `${liveGames} en vivo`}
          trend={liveGames > 0 ? 'up' : 'flat'}
          sub="en total"
        />
        <Kpi
          label="Retiros pendientes"
          icon={WalletIcon}
          value={withdrawalsLoading ? '…' : pendingWithdrawals.toString()}
          delta={pendingWithdrawals > 0 ? 'Requieren acción' : 'Al día'}
          trend={pendingWithdrawals > 0 ? 'down' : 'flat'}
          sub="por aprobar"
        />
      </div>

      {/* Juegos */}
      <Card noPad style={{ marginBottom: 20 }}>
        <CardHeader
          title="Juegos recientes"
          sub="Últimos juegos del sistema"
          action={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <IconButton title="Recargar" onClick={() => refetch()}>
                <RefreshCw size={14} />
              </IconButton>
            </div>
          }
        />

        {gamesLoading && (
          <>
            <GameRowSkeleton />
            <GameRowSkeleton />
            <GameRowSkeleton />
          </>
        )}

        {gamesError && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              API no disponible — no se pudieron cargar los juegos.
            </div>
            <Button kind="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
          </div>
        )}

        {!gamesLoading && !gamesError && displayGames.length === 0 && (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>No hay juegos. <button className="link-btn" onClick={() => navigate('/games/new')}>Crear el primero →</button></p>
          </div>
        )}

        {!gamesLoading && !gamesError && displayGames.map((g) => {
          const uiStatus = normalizeStatus(g.status)
          const isLive = uiStatus === 'envivo'
          const isFinished = uiStatus === 'finalizado'
          const time = gameTime(g)
          const players = g._count?.entries ?? 0
          const questions = g.maxQuestions ?? 0
          return (
            <div key={g.id} className="game-row">
              <div
                className="game-row-thumb"
                style={{
                  background: isLive
                    ? 'linear-gradient(135deg, #DC2626 0%, #7C3AED 100%)'
                    : isFinished
                    ? 'var(--ink-100)'
                    : 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                  color: isFinished ? 'var(--ink-500)' : 'white',
                }}
              >
                {time.split(':')[0]}
              </div>
              <div className="game-row-info">
                <div className="game-row-title-row">
                  <span className="game-row-title">{g.title}</span>
                  <StatusBadge status={uiStatus as any} />
                </div>
                <div className="game-row-meta">
                  {questions} preguntas · Premio S/ {g.prize.toLocaleString('es-PE')} · {g.host ?? '—'}
                </div>
              </div>
              <div className="game-row-players">
                <div className="game-row-players-count">{players.toLocaleString('es-PE')}</div>
                <div className="game-row-players-label">
                  {isLive ? 'jugadores' : isFinished ? 'finalistas' : 'inscritos'}
                </div>
              </div>
              <div className="game-row-actions">
                {isLive ? (
                  <Button kind="danger" size="sm" icon={Play} onClick={() => navigate('/live')}>Monitorear</Button>
                ) : uiStatus === 'proximo' ? (
                  <Button kind="primary" size="sm" icon={Play}>Iniciar</Button>
                ) : (
                  <Button kind="secondary" size="sm" icon={Eye} onClick={() => navigate(`/games/${g.id}`)}>Ver</Button>
                )}
              </div>
            </div>
          )
        })}
      </Card>

      {/* Bottom */}
      <ActivityFeed />
    </div>
  )
}
