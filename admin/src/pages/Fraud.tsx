import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, AlertTriangle, Smartphone, RefreshCw, Ban, CheckCircle2 } from 'lucide-react'
import { fraudApi, type FlaggedUser, type SharedDevice } from '../api/client'
import { Card } from '../components/ui/Card'
import { Button, IconButton } from '../components/ui/Button'

function FlagReasonBadge({ reason }: { reason: string | null }) {
  if (!reason) return <span style={{ color: 'var(--text-3)' }}>—</span>
  const isMulti = reason.includes('multi_account')
  const isBan = reason.includes('banned')
  const color = isBan ? '#EF4444' : '#FBBF24'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 600,
      backgroundColor: color + '22', color, border: `1px solid ${color}44`,
      maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title={reason}>
      {isMulti ? 'Multi-cuenta' : isBan ? 'Baneado' : reason}
    </span>
  )
}

function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #EF4444, #F97316)',
      display: 'grid', placeItems: 'center',
      color: 'white', fontWeight: 700, fontSize: 12,
    }}>{initials}</div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('es-PE', {
    dateStyle: 'short', timeStyle: 'short',
  })
}

export function Fraud() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'flagged' | 'devices'>('flagged')

  const flaggedQ = useQuery({
    queryKey: ['fraud', 'flagged'],
    queryFn: () => fraudApi.flagged().then((r) => r.data.data),
  })

  const devicesQ = useQuery({
    queryKey: ['fraud', 'shared-devices'],
    queryFn: () => fraudApi.sharedDevices().then((r) => r.data.data),
  })

  const unflagMut = useMutation({
    mutationFn: (id: string) => fraudApi.unflag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud'] }),
  })

  const banMut = useMutation({
    mutationFn: (id: string) => fraudApi.ban(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fraud'] }),
  })

  const flagged: FlaggedUser[] = flaggedQ.data ?? []
  const devices: SharedDevice[] = devicesQ.data ?? []

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Shield size={22} style={{ marginRight: 8, color: '#EF4444' }} />
            Antifraude
          </h1>
          <p className="page-subtitle">
            Cuentas marcadas y dispositivos compartidos
          </p>
        </div>
        <IconButton
          title="Recargar"
          onClick={() => qc.invalidateQueries({ queryKey: ['fraud'] })}
        >
          <RefreshCw size={16} />
        </IconButton>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['flagged', 'devices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13,
              border: 'none', cursor: 'pointer',
              background: tab === t ? '#EF4444' : 'var(--bg-2)',
              color: tab === t ? 'white' : 'var(--text-2)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'flagged'
              ? `Cuentas marcadas (${flagged.length})`
              : `Dispositivos compartidos (${devices.length})`}
          </button>
        ))}
      </div>

      {/* Flagged users tab */}
      {tab === 'flagged' && (
        <Card>
          {flaggedQ.isLoading ? (
            <div className="empty-state"><RefreshCw size={28} className="spin" /></div>
          ) : flagged.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} color="#34D399" style={{ marginBottom: 10 }} />
              <p style={{ color: 'var(--text-2)' }}>No hay cuentas marcadas</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Dispositivos</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar name={u.name} />
                        <div>
                          <div className="cell-strong">{u.name}</div>
                          <div className="cell-meta">@{u.username} · {u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><FlagReasonBadge reason={u.flagReason} /></td>
                    <td>
                      {!u.isActive ? (
                        <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 12 }}>BANEADO</span>
                      ) : u.isArchived ? (
                        <span style={{ color: '#6B7280', fontSize: 12 }}>Archivado</span>
                      ) : (
                        <span style={{ color: '#34D399', fontSize: 12 }}>Activo</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {u.devices.map((d) => (
                          <div key={d.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Smartphone size={12} color="var(--text-3)" />
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>
                              {d.deviceId.slice(0, 12)}…
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.platform}</span>
                          </div>
                        ))}
                        {u.devices.length === 0 && <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td className="cell-meta">{formatDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          kind="ghost"
                          size="sm"
                          icon={CheckCircle2}
                          onClick={() => unflagMut.mutate(u.id)}
                          disabled={unflagMut.isPending || !u.isFlagged}
                          title="Quitar marca"
                        >
                          Limpiar
                        </Button>
                        {u.isActive && (
                          <Button
                            kind="danger"
                            size="sm"
                            icon={Ban}
                            onClick={() => {
                              if (confirm(`¿Banear a @${u.username}?`)) banMut.mutate(u.id)
                            }}
                            disabled={banMut.isPending}
                          >
                            Banear
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Shared devices tab */}
      {tab === 'devices' && (
        <Card>
          {devicesQ.isLoading ? (
            <div className="empty-state"><RefreshCw size={28} className="spin" /></div>
          ) : devices.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={36} color="#34D399" style={{ marginBottom: 10 }} />
              <p style={{ color: 'var(--text-2)' }}>No hay dispositivos compartidos</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Cuentas vinculadas</th>
                  <th>Marcadas</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.deviceId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={14} color="#FBBF24" />
                        <code style={{ fontSize: 12, color: 'var(--text-1)' }}>
                          {d.deviceId}
                        </code>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {d.accounts.map((a) => (
                          <div key={a.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="cell-strong">@{a.username}</span>
                            <span className="cell-meta">{a.email}</span>
                            {a.isFlagged && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: '#FBBF24',
                                backgroundColor: '#FBBF2422', borderRadius: 4, padding: '1px 5px',
                              }}>MARCADO</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#EF4444' }}>
                        {d.accounts.filter((a) => a.isFlagged).length} / {d.accounts.length}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  )
}
