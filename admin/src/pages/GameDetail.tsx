import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Users, HelpCircle, Search, RefreshCw, Crown, ScrollText } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Kpi } from '../components/ui/Kpi'
import { useGame, useGameEntries, useGameLog, type GameEvent, type GameLogEntry } from '../api/hooks'
import type { Game } from '../types'

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pendiente',
  LOBBY:     'Lobby',
  LIVE:      'En vivo',
  FINISHED:  'Finalizado',
  CANCELLED: 'Cancelado',
  ARCHIVED:  'Archivado',
}
const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
  PENDING:   'amber',
  LOBBY:     'blue',
  LIVE:      'green',
  FINISHED:  'gray',
  CANCELLED: 'red',
  ARCHIVED:  'gray',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'medium', timeStyle: 'short',
  })
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q, index }: { q: any; index: number }) {
  const question = q.question ?? q
  return (
    <div style={{
      border: '1px solid var(--ink-150)', borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-100)',
          color: 'var(--brand-700)', fontWeight: 700, fontSize: 13,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10 }}>
            {question.text}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {(question.options ?? []).map((opt: string, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8, fontSize: 13,
                background: i === question.correctIndex ? 'var(--green-50,#f0fdf4)' : 'var(--ink-50)',
                border: `1px solid ${i === question.correctIndex ? 'var(--green-300,#86efac)' : 'var(--ink-150)'}`,
                color: i === question.correctIndex ? 'var(--green-700,#15803d)' : 'var(--ink-700)',
                fontWeight: i === question.correctIndex ? 600 : 400,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: i === question.correctIndex ? 'var(--green-100)' : 'var(--ink-100)',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {i === question.correctIndex && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green-600)' }}>✓ Correcta</span>
                )}
              </div>
            ))}
          </div>
          {question.category && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className="badge badge-secondary" style={{ fontSize: 11 }}>{question.category}</span>
              {question.difficulty && (
                <span className="badge badge-secondary" style={{ fontSize: 11 }}>{question.difficulty}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Event type helpers ───────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  GAME_STARTED:      { icon: '🚀', label: 'Juego iniciado',     color: '#7C3AED' },
  PLAYER_ELIMINATED: { icon: '💀', label: 'Jugador eliminado',  color: '#EF4444' },
  LIFE_USED:         { icon: '💚', label: 'Vida usada',         color: '#10B981' },
  GAME_ENDED:        { icon: '🏁', label: 'Juego finalizado',   color: '#6B7280' },
  WINNER_DECLARED:   { icon: '🏆', label: 'Ganador declarado',  color: '#F59E0B' },
}

function GameLogTab({ gameId }: { gameId: string }) {
  const { data, isLoading } = useGameLog(gameId)
  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-400)' }}>Cargando log…</div>
  if (!data) return null

  const { events, entries } = data

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Participants result table */}
      <Card noPad>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ink-100)', fontWeight: 700, fontSize: 13 }}>
          Participantes · resultados finales
        </div>
        {entries.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>Sin participantes registrados.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Jugador</th>
                <th style={{ textAlign: 'center' }}>Puntaje</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th style={{ textAlign: 'right' }}>Premio</th>
                <th>Inscrito</th>
                <th>Terminó</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: GameLogEntry, idx: number) => (
                <tr key={e.id}>
                  <td className="cell-mono" style={{ color: idx === 0 ? '#F59E0B' : 'var(--ink-400)', fontWeight: idx < 3 ? 700 : 400 }}>
                    {idx + 1}
                  </td>
                  <td>
                    <div className="cell-strong">{e.name}</div>
                    <div className="cell-meta">@{e.username}</div>
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'center' }}>{e.score}</td>
                  <td style={{ textAlign: 'center' }}>
                    {e.isAlive ? <Badge tone="green">Vivo</Badge> : <Badge tone="red">Eliminado</Badge>}
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right', color: e.prize ? 'var(--brand-700)' : 'var(--ink-300)', fontWeight: e.prize ? 700 : 400 }}>
                    {e.prize ? `S/ ${e.prize.toFixed(2)}` : '—'}
                  </td>
                  <td className="cell-muted" style={{ fontSize: 11 }}>
                    {new Date(e.joinedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="cell-muted" style={{ fontSize: 11 }}>
                    {e.finishedAt ? new Date(e.finishedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Player roster — alive vs eliminated */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vivos al final</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 4, padding: '1px 6px' }}>
              {entries.filter((e: GameLogEntry) => e.isAlive).length}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entries.filter((e: GameLogEntry) => e.isAlive).length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Ninguno</span>
            ) : (
              entries.filter((e: GameLogEntry) => e.isAlive).map((e: GameLogEntry) => (
                <span key={e.id} style={{ fontSize: 12, padding: '2px 10px', background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 4, fontWeight: 600 }}>
                  {e.username}
                </span>
              ))
            )}
          </div>
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#EF4444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Eliminados</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 4, padding: '1px 6px' }}>
              {entries.filter((e: GameLogEntry) => !e.isAlive).length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {entries.filter((e: GameLogEntry) => !e.isAlive).length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Ninguno</span>
            ) : (
              entries.filter((e: GameLogEntry) => !e.isAlive).map((e: GameLogEntry) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--mono)', background: 'var(--ink-100)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                    Q{e.eliminatedAtQ != null ? e.eliminatedAtQ + 1 : '?'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-700)', fontWeight: 600 }}>{e.username}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Life usage summary */}
      {(() => {
        const lifeUsedEvents = events.filter((ev: GameEvent) => ev.type === 'LIFE_USED')
        if (lifeUsedEvents.length === 0) return null
        return (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>💚 Vidas usadas</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 4, padding: '1px 6px' }}>
                {lifeUsedEvents.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lifeUsedEvents.map((ev: GameEvent) => {
                const d = ev.data ?? {}
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-400)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                      {new Date(ev.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>{(d.username as string) ?? ev.userId}</span>
                    <span style={{ color: 'var(--ink-500)' }}>
                      usó una vida{d.qIdx != null ? ` en pregunta ${(d.qIdx as number) + 1}` : ''}
                      {d.livesLeft != null ? ` · le quedan ${d.livesLeft}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })()}

      {/* Event timeline */}
      <Card>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Línea de tiempo del juego</div>
        {events.length === 0 ? (
          <div style={{ color: 'var(--ink-400)', fontSize: 13 }}>Sin eventos registrados. Los eventos se generan a partir de la próxima partida.</div>
        ) : (
          <div style={{ display: 'grid', gap: 0 }}>
            {events.map((ev: GameEvent, idx: number) => {
              const cfg = EVENT_CONFIG[ev.type] ?? { icon: '•', label: ev.type, color: 'var(--ink-400)' }
              const d = ev.data ?? {}
              return (
                <div key={ev.id} style={{ display: 'flex', gap: 14, paddingBottom: idx < events.length - 1 ? 16 : 0 }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', fontSize: 16,
                      display: 'grid', placeItems: 'center',
                      background: cfg.color + '15', border: `1.5px solid ${cfg.color}44`,
                    }}>{cfg.icon}</div>
                    {idx < events.length - 1 && (
                      <div style={{ width: 1, flex: 1, minHeight: 12, background: 'var(--ink-150)', marginTop: 4 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingTop: 4, paddingBottom: idx < events.length - 1 ? 16 : 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 1 }}>
                      {new Date(ev.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    {ev.type === 'GAME_STARTED' && d.totalPlayers !== undefined && (
                      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 4 }}>{d.totalPlayers as number} participantes inscritos</div>
                    )}
                    {ev.type === 'PLAYER_ELIMINATED' && (
                      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 4 }}>
                        {ev.userId && <span style={{ fontWeight: 600 }}>@{(d.username as string) ?? ev.userId} — eliminado en pregunta {((d.qIdx as number) ?? 0) + 1}</span>}
                        {' · puntaje: '}{(d.score as number) ?? 0}
                      </div>
                    )}
                    {ev.type === 'LIFE_USED' && (
                      <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                        @{(d.username as string) ?? ev.userId}
                        {d.qIdx != null ? ` · pregunta ${(d.qIdx as number) + 1}` : ''}
                        {d.livesLeft != null ? ` · vidas restantes: ${d.livesLeft}` : ''}
                      </div>
                    )}
                    {ev.type === 'WINNER_DECLARED' && (
                      <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600, marginTop: 4 }}>
                        🏆 @{d.username as string} · S/ {(d.prize as number)?.toFixed(2)} · {d.score as number} aciertos
                      </div>
                    )}
                    {ev.type === 'GAME_ENDED' && (
                      <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 4 }}>
                        {d.totalPlayers as number} jugadores · {d.survivors as number} sobrevivientes · bote S/ {(d.totalPrize as number)?.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [entrySearch, setEntrySearch] = useState('')
  const [activeTab, setActiveTab] = useState<'questions' | 'players' | 'log'>('players')

  const { data: game, isLoading: gameLoading } = useGame(id ?? '')
  const {
    data: entriesData,
    isLoading: entriesLoading,
    refetch: refetchEntries,
  } = useGameEntries(id ?? '', entrySearch || undefined)

  const entries = entriesData?.data ?? []
  const totalEntries = entriesData?.total ?? 0
  const questions: any[] = (game as any)?.questions ?? []

  if (gameLoading) {
    return <div className="fade-in" style={{ padding: 40, color: 'var(--ink-400)', textAlign: 'center' }}>Cargando…</div>
  }

  if (!game) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <p>Juego no encontrado.</p>
        <Button kind="ghost" onClick={() => navigate('/games')}>← Volver a juegos</Button>
      </div>
    )
  }

  const statusTone = STATUS_TONE[game.status] ?? 'default'
  const totalPrize = entries.reduce((acc, e) => acc + (e.prize ?? 0), 0)

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton onClick={() => navigate('/games')}>
            <ArrowLeft size={16} />
          </IconButton>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="page-title" style={{ margin: 0 }}>{game.title}</h1>
              <Badge tone={statusTone}>{STATUS_LABEL[game.status] ?? game.status}</Badge>
              {(game as any).type === 'VIP' && <span className="badge badge-brand">VIP</span>}
            </div>
            <p className="page-sub" style={{ margin: '2px 0 0' }}>
              {formatDate(game.scheduledAt)} · {game.host ?? 'Sin host'}
            </p>
          </div>
        </div>
        <div className="page-actions">
          <Button kind="secondary" icon={Pencil} onClick={() => navigate(`/games/${id}/edit`)}>
            Editar juego
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi label="Inscritos" icon={Users} value={String((game._count as any)?.entries ?? totalEntries)} trend="flat" />
        <Kpi label="Preguntas" icon={HelpCircle} value={String((game._count as any)?.questions ?? questions.length)} trend="flat" />
        <Kpi label="Premio" value={`S/ ${(game.prize ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} trend="flat" />
        {(game.status === 'FINISHED' || game.status === 'ARCHIVED' || game.status === 'ARCHIVED') && (
          <Kpi label="Premio distribuido" icon={Crown} value={`S/ ${totalPrize.toFixed(2)}`} trend="flat" />
        )}
        {(game as any).entryFee > 0 && (
          <Kpi label="Entrada" value={`S/ ${(game as any).entryFee.toFixed(2)}`} sub="por jugador" trend="flat" />
        )}
      </div>

      {/* Info card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Categoría</div>
            <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>{(game as any).category ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tiempo por pregunta</div>
            <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>{game.timePerQuestion}s</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Max. preguntas</div>
            <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>{game.maxQuestions ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipo</div>
            <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>{(game as any).type ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Modo ganadores</div>
            <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>
              {(game as any).winnerMode === 'ALL_CORRECT' ? 'Todos los que completan'
                : (game as any).winnerMode === 'RANKED_SLOTS' ? 'Por plazas (ranking)'
                : 'Un solo ganador'}
            </div>
          </div>
          {(game as any).isRecurring && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Recurrente</div>
              <div style={{ fontSize: 14, color: 'var(--ink-800)', marginTop: 3 }}>{(game as any).recurringTime ?? '—'} (Lima)</div>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${activeTab === 'players' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('players')}>
          Inscritos ({totalEntries})
        </button>
        <button className={`tab-btn ${activeTab === 'questions' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('questions')}>
          Preguntas ({questions.length})
        </button>
        <button className={`tab-btn ${activeTab === 'log' ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab('log')}>
          <ScrollText size={12} style={{ display: 'inline', marginRight: 4 }} />
          Historial / Log
        </button>
      </div>

      {/* Players tab */}
      {activeTab === 'players' && (
        <Card noPad>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--ink-100)' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-400)' }} />
              <input
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Buscar por nombre, usuario o email…"
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
              />
            </div>
            <IconButton onClick={() => refetchEntries()} title="Actualizar">
              <RefreshCw size={14} className={entriesLoading ? 'spin' : ''} />
            </IconButton>
          </div>
          {entriesLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-400)', fontSize: 13 }}>Cargando inscritos…</div>
          ) : entries.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              {entrySearch ? 'Sin resultados para esa búsqueda.' : 'No hay inscritos en este juego.'}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Jugador</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Puntaje</th>
                  <th style={{ textAlign: 'right' }}>Estado</th>
                  {(game as any).winnerMode === 'RANKED_SLOTS' && <th style={{ textAlign: 'right' }}>Tiempo</th>}
                  {game.status === 'FINISHED' || game.status === 'ARCHIVED' && <th style={{ textAlign: 'right' }}>Premio</th>}
                  <th>Inscrito</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.userId}>
                    <td className="cell-mono" style={{ color: idx === 0 && game.status === 'FINISHED' || game.status === 'ARCHIVED' ? '#F59E0B' : 'var(--ink-500)', fontWeight: idx < 3 ? 700 : 400 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="cell-strong">{e.name}</div>
                        {e.isVip && <span className="badge badge-brand" style={{ fontSize: 10 }}>VIP</span>}
                      </div>
                      <div className="cell-meta">@{e.username}</div>
                    </td>
                    <td className="cell-muted" style={{ fontSize: 12 }}>{e.email}</td>
                    <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {e.score > 0 ? e.score : <span className="cell-empty">—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {e.isAlive
                        ? <Badge tone="green">Vivo</Badge>
                        : <Badge tone="gray">Eliminado</Badge>}
                    </td>
                    {(game as any).winnerMode === 'RANKED_SLOTS' && (
                      <td className="cell-mono" style={{ textAlign: 'right', fontSize: 12, color: (e as any).finishedAt ? 'var(--ink-700)' : 'var(--ink-300)' }}>
                        {(e as any).finishedAt
                          ? new Date((e as any).finishedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '—'}
                      </td>
                    )}
                    {game.status === 'FINISHED' || game.status === 'ARCHIVED' && (
                      <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 600, color: e.prize ? 'var(--brand-700)' : 'var(--ink-400)' }}>
                        {e.prize ? `S/ ${e.prize.toFixed(2)}` : '—'}
                      </td>
                    )}
                    <td className="cell-muted" style={{ fontSize: 12 }}>
                      {new Date(e.joinedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Log tab */}
      {activeTab === 'log' && id && <GameLogTab gameId={id} />}

      {/* Questions tab */}
      {activeTab === 'questions' && (
        <div>
          {questions.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              No hay preguntas asignadas a este juego.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {questions.map((q: any, i: number) => (
                <QuestionCard key={q.id ?? i} q={q} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
