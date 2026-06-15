import { useState } from 'react'
import { Download, Zap, Trophy, Users, DollarSign } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader } from '../components/ui/Card'
import { Kpi } from '../components/ui/Kpi'
import { Button } from '../components/ui/Button'
import { useMetrics } from '../api/hooks'

const METHOD_COLORS: Record<string, string> = {
  yape:     '#7C3AED',
  plin:     '#3B82F6',
  bank:     '#F59E0B',
  bcp:      '#F59E0B',
  interbank: '#10B981',
  bbva:     '#EC4899',
}

const TOOLTIP_STYLE = {
  background: 'var(--ink-900)',
  border: '1px solid var(--ink-800)',
  borderRadius: 8,
  color: 'white',
  fontSize: 12,
  fontFamily: 'var(--mono)',
}

const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

export function Metrics() {
  const [range, setRange] = useState('7d')
  const days = RANGE_DAYS[range] ?? 7
  const { data, isLoading } = useMetrics(days)

  const dailyPrizes  = data?.dailyPrizes   ?? []
  const userGrowth   = data?.userGrowth    ?? []
  const byMethod     = data?.byMethod      ?? []
  const topWinners   = data?.topWinners    ?? []

  const totalPrize = data?.totalPrizesPaid ?? 0
  const totalUsers = data?.totalUsers      ?? 0
  const totalGames = data?.totalGames      ?? 0

  if (isLoading) {
    return (
      <div className="fade-in" style={{ padding: 40, color: 'var(--ink-400)', textAlign: 'center' }}>
        Cargando métricas…
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Métricas</h1>
          <p className="page-sub">Analytics de jugadores y rendimiento de juegos · Lima · GMT-5</p>
        </div>
        <div className="page-actions">
          <div className="seg-control">
            {['7d', '30d', '90d'].map((r) => (
              <button key={r} className={`seg-btn ${range === r ? 'seg-btn-active' : ''}`} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <Button kind="secondary" icon={Download}>Exportar</Button>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi label="Usuarios registrados" icon={Users} value={totalUsers.toLocaleString('es-PE')} sub="jugadores activos" trend="flat" />
        <Kpi label="Total juegos" icon={Zap} value={totalGames.toLocaleString('es-PE')} sub="todos los tiempos" trend="flat" />
        <Kpi label="Premios entregados" icon={Trophy} value={`S/ ${totalPrize.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`} sub="retiros completados" trend="flat" />
        <Kpi label="Retiros pendientes" icon={DollarSign} value={String(data?.pendingWithdrawals ?? 0)} sub="por aprobar" trend={data?.pendingWithdrawals ? 'down' : 'flat'} />
      </div>

      {/* Daily prizes + user growth */}
      <div className="metrics-grid-2" style={{ marginBottom: 20 }}>
        <Card noPad>
          <CardHeader title="Premios por día" sub={`Premios distribuidos en S/ — últimos ${days} días`} />
          <div style={{ padding: '8px 16px 20px' }}>
            {dailyPrizes.length === 0 ? (
              <div className="empty-state" style={{ height: 200 }}>Sin juegos con premios en este período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyPrizes}>
                  <defs>
                    <linearGradient id="prizeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-150)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--ink-500)', fontSize: 11, fontFamily: 'var(--mono)' }} />
                  <YAxis tick={{ fill: 'var(--ink-500)', fontSize: 11, fontFamily: 'var(--mono)' }} tickFormatter={(v) => `S/${(v/1000).toFixed(0)}K`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`S/ ${v.toLocaleString('es-PE')}`, 'Premio']} />
                  <Area type="monotone" dataKey="prize" stroke="var(--brand-600)" fill="url(#prizeGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card noPad>
          <CardHeader title="Nuevos registros por día" sub={`Usuarios nuevos — últimos ${days} días`} />
          <div style={{ padding: '8px 16px 20px' }}>
            {userGrowth.length === 0 ? (
              <div className="empty-state" style={{ height: 200 }}>Sin registros nuevos en este período.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-150)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--ink-500)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--ink-500)', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString('es-PE'), 'Nuevos usuarios']} />
                  <Line type="monotone" dataKey="count" stroke="var(--brand-500)" strokeWidth={2} dot={false} name="Nuevos" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Withdrawal by method + top winners */}
      <div className="metrics-grid-2" style={{ marginBottom: 20 }}>
        <Card noPad>
          <CardHeader title="Retiros completados por método" sub="Monto total en S/ — todos los tiempos" />
          <div style={{ padding: '8px 16px 20px' }}>
            {byMethod.length === 0 ? (
              <div className="empty-state" style={{ height: 200 }}>Sin retiros completados.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={byMethod} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="total">
                      {byMethod.map((_, i) => (
                        <Cell key={i} fill={METHOD_COLORS[_.method.toLowerCase()] ?? `hsl(${i * 60}, 70%, 55%)`} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`S/ ${v.toLocaleString('es-PE')}`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  {byMethod.map((item, i) => (
                    <div key={item.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: METHOD_COLORS[item.method.toLowerCase()] ?? `hsl(${i * 60}, 70%, 55%)`, flexShrink: 0 }} />
                        {item.method}
                        <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>({item.count})</span>
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--ink-800)' }}>
                        S/ {item.total.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card noPad>
          <CardHeader title="Juegos por día (períodos con premios)" sub={`Últimos ${days} días`} />
          <div style={{ padding: '8px 16px 20px' }}>
            {dailyPrizes.length === 0 ? (
              <div className="empty-state" style={{ height: 200 }}>Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyPrizes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ink-150)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--ink-500)', fontSize: 10, fontFamily: 'var(--mono)' }} />
                  <YAxis tick={{ fill: 'var(--ink-500)', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Juegos']} />
                  <Bar dataKey="games" fill="var(--brand-500)" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Top winners */}
      <Card noPad>
        <CardHeader title="Top ganadores" sub="Jugadores con más premios acumulados (todos los tiempos)" />
        {topWinners.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>Sin ganadores registrados.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Jugador</th>
                <th style={{ textAlign: 'right' }}>Victorias</th>
                <th style={{ textAlign: 'right' }}>Total ganado</th>
              </tr>
            </thead>
            <tbody>
              {topWinners.map((w, i) => (
                <tr key={w.userId}>
                  <td className="cell-mono">
                    <span style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#B45309' : 'var(--ink-500)', fontWeight: 700 }}>
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="cell-strong">{w.name}</div>
                    <div className="cell-meta">@{w.username}</div>
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 600 }}>{w.wins} 🏆</td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--brand-700)' }}>
                    S/ {(w.total ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
