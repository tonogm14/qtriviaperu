import { useState } from 'react'
import { Download, Eye, Check, X, Clock, RefreshCw } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Kpi } from '../components/ui/Kpi'
import { Modal } from '../components/ui/Modal'
import { useWithdrawals, useUpdateWithdrawalStatus } from '../api/hooks'
import type { Withdrawal } from '../types'

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const safeName = String(name ?? '?')
  const initials = safeName.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const hue = (safeName.charCodeAt(0) * 37) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.55 0.18 ${hue + 30}))`,
      display: 'grid', placeItems: 'center', color: 'white',
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function PayModal({
  wd,
  onClose,
  onApprove,
  onReject,
  isProcessing,
}: {
  wd: Withdrawal
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  isProcessing: boolean
}) {
  const [step, setStep] = useState<'review' | 'confirm' | 'success'>('review')
  const [otp, setOtp] = useState('')
  const fee = Math.round(wd.amount * 0.05)
  const net = wd.amount - fee
  const displayName = wd.user ?? 'Usuario'
  const handle = wd.handle ?? '—'

  if (step === 'success') {
    return (
      <Modal
        open
        onClose={onClose}
        title="Pago confirmado"
        width={460}
        footer={<Button kind="primary" onClick={onClose}>Cerrar</Button>}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div className="success-icon-wrap">
            <Check size={32} strokeWidth={3} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>
            S/ {net.toLocaleString('es-PE')} enviados
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>
            A {displayName} · {wd.method} {wd.account}
          </div>
          <div style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--ink-400)', marginTop: 8 }}>
            REF: {wd.id.toUpperCase()}-{Date.now().toString(36).toUpperCase()}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Pagar retiro ${wd.id}`}
      width={520}
      footer={
        step === 'review' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" onClick={onClose}>Cancelar</Button>
            <Button kind="danger" icon={X} onClick={onReject} disabled={isProcessing}>
              {isProcessing ? 'Procesando…' : 'Rechazar'}
            </Button>
            <Button kind="primary" icon={Check} onClick={() => setStep('confirm')} disabled={isProcessing}>
              Continuar al pago
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="ghost" onClick={() => setStep('review')}>Atrás</Button>
            <Button
              kind="success"
              icon={Check}
              disabled={otp.length !== 6 || isProcessing}
              onClick={async () => {
                await onApprove()
                setStep('success')
              }}
            >
              {isProcessing ? 'Procesando…' : `Confirmar S/ ${net.toLocaleString('es-PE')}`}
            </Button>
          </div>
        )
      }
    >
      {step === 'review' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="user-summary-row">
            <Avatar name={displayName} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>{displayName}</div>
              <div className="cell-meta">{handle} {wd.dni ? `· DNI ${wd.dni}` : ''}</div>
            </div>
            {wd.dni && <Badge tone="green"><Check size={11} strokeWidth={3} /> Verificado</Badge>}
          </div>

          <div>
            <div className="section-label">Destino del pago</div>
            <div className="info-card">
              <div className="info-row"><span>Método</span><span style={{ fontWeight: 600 }}>{wd.method}</span></div>
              {wd.bank && wd.bank !== '—' && <div className="info-row"><span>Banco</span><span>{wd.bank}</span></div>}
              {wd.account && (
                <div className="info-row">
                  <span>{['BCP', 'Interbank', 'BBVA'].includes(wd.method) ? 'Cuenta' : 'Celular'}</span>
                  <span className="cell-mono" style={{ fontWeight: 600 }}>{wd.account}</span>
                </div>
              )}
              {wd.dni && <div className="info-row"><span>DNI titular</span><span className="cell-mono">{wd.dni}</span></div>}
            </div>
          </div>

          <div>
            <div className="section-label">Resumen</div>
            <div className="info-card">
              <div className="info-row">
                <span>Monto solicitado</span>
                <span className="cell-mono">S/ {wd.amount.toLocaleString('es-PE')}.00</span>
              </div>
              <div className="info-row">
                <span>Comisión plataforma (5%)</span>
                <span className="cell-mono" style={{ color: 'var(--ink-500)' }}>− S/ {fee.toLocaleString('es-PE')}.00</span>
              </div>
              <div className="info-divider" />
              <div className="info-row">
                <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>Recibirá</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--brand-700)' }}>S/ {net.toLocaleString('es-PE')}.00</span>
              </div>
            </div>
          </div>

          <div className="alert alert-warn">
            Verifica que el nombre del titular coincida con el DNI. Esta acción es <strong>irreversible</strong>.
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="confirm-icon-wrap">
              <ShieldIcon size={24} className="shield-icon" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)', marginBottom: 4 }}>Confirma con tu código 2FA</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>Ingresa el código de 6 dígitos de tu app autenticadora</div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <input
                key={i}
                maxLength={1}
                value={otp[i] || ''}
                className="otp-input"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  setOtp((prev) => prev.substring(0, i) + v + prev.substring(i + 1))
                  if (v) {
                    const next = e.currentTarget.nextSibling as HTMLInputElement | null
                    next?.focus()
                  }
                }}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Button kind="ghost" size="sm" onClick={() => setOtp('123456')}>Demo: usar 123456</Button>
          </div>
          <div className="confirm-summary">
            Vas a pagar <strong style={{ fontFamily: 'var(--mono)' }}>S/ {net.toLocaleString('es-PE')}.00</strong> a <strong>{displayName}</strong> vía {wd.method}
          </div>
        </div>
      )}
    </Modal>
  )
}

function ShieldIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} style={{ opacity: 0.5 }}>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 60 }} /></td>
          <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink-150)' }} /><div><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 90, marginBottom: 5 }} /><div style={{ height: 10, background: 'var(--ink-100)', borderRadius: 4, width: 55 }} /></div></div></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 50 }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 90 }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 50, marginLeft: 'auto' }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 50, marginLeft: 'auto' }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 55 }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 60 }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 28, background: 'var(--ink-150)', borderRadius: 6, width: 60, marginLeft: 'auto' }} /></td>
        </tr>
      ))}
    </>
  )
}

function normalizeWdStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING:    'pendiente',
    PROCESSING: 'procesando',
    DONE:       'pagado',
    FAILED:     'rechazado',
  }
  return map[status] ?? 'pendiente'
}

function DetailModal({ wd, onClose }: { wd: Withdrawal; onClose: () => void }) {
  const fee = Math.round(wd.amount * 0.05)
  const net = wd.amount - fee
  const displayName = wd.user ?? 'Usuario'
  const statusLabels: Record<string, string> = {
    pendiente: 'Pendiente', procesando: 'Procesando', pagado: 'Pagado', rechazado: 'Rechazado',
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Retiro ${wd.id}`}
      width={480}
      footer={<Button kind="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="user-summary-row">
          <Avatar name={displayName} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>{displayName}</div>
            <div className="cell-meta">{wd.handle ?? '—'}{wd.dni ? ` · DNI ${wd.dni}` : ''}</div>
          </div>
          {wd.dni && <Badge tone="green"><Check size={11} strokeWidth={3} /> Verificado</Badge>}
        </div>

        <div>
          <div className="section-label">Destino del pago</div>
          <div className="info-card">
            <div className="info-row"><span>Método</span><span style={{ fontWeight: 600 }}>{wd.method}</span></div>
            {wd.bank && wd.bank !== '—' && <div className="info-row"><span>Banco</span><span>{wd.bank}</span></div>}
            {wd.account && (
              <div className="info-row">
                <span>{['BCP', 'Interbank', 'BBVA'].includes(wd.method) ? 'Cuenta' : 'Celular'}</span>
                <span className="cell-mono" style={{ fontWeight: 600 }}>{wd.account}</span>
              </div>
            )}
            {wd.dni && <div className="info-row"><span>DNI titular</span><span className="cell-mono">{wd.dni}</span></div>}
          </div>
        </div>

        <div>
          <div className="section-label">Resumen financiero</div>
          <div className="info-card">
            <div className="info-row">
              <span>Monto solicitado</span>
              <span className="cell-mono">S/ {wd.amount.toLocaleString('es-PE')}.00</span>
            </div>
            <div className="info-row">
              <span>Comisión plataforma (5%)</span>
              <span className="cell-mono" style={{ color: 'var(--ink-500)' }}>− S/ {fee.toLocaleString('es-PE')}.00</span>
            </div>
            <div className="info-divider" />
            <div className="info-row">
              <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>Neto transferido</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--brand-700)' }}>S/ {net.toLocaleString('es-PE')}.00</span>
            </div>
          </div>
        </div>

        <div>
          <div className="section-label">Estado y fechas</div>
          <div className="info-card">
            <div className="info-row">
              <span>Estado</span>
              <span style={{ fontWeight: 600 }}>{statusLabels[wd.status] ?? wd.status}</span>
            </div>
            <div className="info-row">
              <span>Solicitado</span>
              <span className="cell-mono">{wd.requested ?? wd.createdAt?.slice(0, 10) ?? '—'}</span>
            </div>
            <div className="info-row">
              <span>ID de retiro</span>
              <span className="cell-mono" style={{ fontSize: 11 }}>{wd.id}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function Withdrawals() {
  const [tab, setTab] = useState('pendiente')
  const [paying, setPaying] = useState<Withdrawal | null>(null)
  const [viewing, setViewing] = useState<Withdrawal | null>(null)
  const [mutError, setMutError] = useState('')

  const { data, isLoading, isError, refetch } = useWithdrawals()
  const updateStatus = useUpdateWithdrawalStatus()

  const withdrawals: Withdrawal[] = (data?.data ?? []).map((w) => {
    const userObj = typeof w.user === 'object' && w.user !== null ? (w.user as any) : null
    return {
      ...w,
      status: normalizeWdStatus(w.status) as any,
      user: userObj ? (userObj.name ?? userObj.username ?? 'Usuario') : (w.user ?? 'Usuario'),
      handle: w.handle ?? (userObj ? `@${userObj.username}` : undefined),
      account: w.account ?? (w as any).accountRef ?? '—',
    }
  })

  const filtered = tab === 'todos' ? withdrawals : withdrawals.filter((w) => w.status === tab)
  const totalPending = withdrawals.filter((w) => w.status === 'pendiente').reduce((a, w) => a + w.amount, 0)

  const methodColor = (m: string): 'green' | 'blue' | 'amber' | 'brand' => {
    if (m === 'Yape') return 'brand'
    if (m === 'Plin') return 'blue'
    if (m === 'BCP') return 'amber'
    return 'green'
  }

  const TABS = [
    { value: 'pendiente', label: 'Pendientes', count: withdrawals.filter((w) => w.status === 'pendiente').length },
    { value: 'procesando', label: 'Procesando', count: withdrawals.filter((w) => w.status === 'procesando').length },
    { value: 'pagado', label: 'Pagados', count: withdrawals.filter((w) => w.status === 'pagado').length },
    { value: 'rechazado', label: 'Rechazados', count: withdrawals.filter((w) => w.status === 'rechazado').length },
    { value: 'todos', label: 'Todos', count: withdrawals.length },
  ]

  const handleApprove = async (wd: Withdrawal) => {
    setMutError('')
    try {
      await updateStatus.mutateAsync({ id: wd.id, status: 'DONE' })
      setPaying(null)
    } catch (err: any) {
      setMutError(err?.response?.data?.message ?? 'Error al aprobar el retiro.')
    }
  }

  const handleReject = async (wd: Withdrawal) => {
    setMutError('')
    try {
      await updateStatus.mutateAsync({ id: wd.id, status: 'FAILED' })
      setPaying(null)
    } catch (err: any) {
      setMutError(err?.response?.data?.message ?? 'Error al rechazar el retiro.')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Retiros</h1>
          <p className="page-sub">Aprueba y paga los retiros solicitados por los ganadores</p>
        </div>
        <div className="page-actions">
          <Button kind="secondary" icon={Download}>Exportar reporte</Button>
          <IconButton title="Recargar" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </IconButton>
        </div>
      </div>

      {mutError && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          {mutError}
          <button onClick={() => setMutError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi
          label="Pendientes"
          icon={Clock}
          value={isLoading ? '…' : withdrawals.filter((w) => w.status === 'pendiente').length}
          delta={isLoading ? '' : `S/ ${totalPending.toLocaleString('es-PE')}`}
          trend="flat"
          sub="por pagar"
        />
        <Kpi
          label="Pagados hoy"
          icon={Check}
          value={isLoading ? '…' : withdrawals.filter((w) => w.status === 'pagado').length}
          delta=""
          trend="up"
        />
        <Kpi
          label="Tiempo medio aprobación"
          value="42 min"
          delta="-12 min"
          trend="up"
        />
        <Kpi
          label="Rechazados (mes)"
          value={isLoading ? '…' : withdrawals.filter((w) => w.status === 'rechazado').length}
          delta=""
          trend="flat"
        />
      </div>

      {isError && (
        <div style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            API no disponible — no se pudieron cargar los retiros.
          </div>
          <Button kind="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      <Card noPad>
        <div className="table-toolbar">
          <div className="tabs inline-tabs" style={{ borderBottom: 0 }}>
            {TABS.map((t) => (
              <button
                key={t.value}
                className={`tab-btn ${tab === t.value ? 'tab-btn-active' : ''}`}
                onClick={() => setTab(t.value)}
              >
                {t.label}
                <span className="tab-count">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Solicitud</th>
              <th>Usuario</th>
              <th>Método</th>
              <th>Cuenta</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th style={{ textAlign: 'right' }}>Neto (−5%)</th>
              <th>Solicitado</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right', width: 1 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton />}
            {!isLoading && !isError && filtered.map((w) => {
              const net = w.amount - Math.round(w.amount * 0.05)
              const displayName = w.user ?? 'Usuario'
              const handle = w.handle ?? '—'
              const requested = w.requested ?? w.createdAt?.slice(0, 10) ?? '—'
              return (
                <tr key={w.id}>
                  <td className="cell-mono">{w.id}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={displayName} size={28} />
                      <div>
                        <div className="cell-strong">{displayName}</div>
                        <div className="cell-meta">{handle}</div>
                      </div>
                    </div>
                  </td>
                  <td><Badge tone={methodColor(w.method)}>{w.method}</Badge></td>
                  <td className="cell-mono">{w.account ?? '—'}</td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink-900)' }}>
                    S/ {w.amount.toLocaleString('es-PE')}
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right', color: 'var(--brand-700)', fontWeight: 600 }}>
                    S/ {net.toLocaleString('es-PE')}
                  </td>
                  <td className="cell-muted">{requested}</td>
                  <td><StatusBadge status={w.status as any} /></td>
                  <td style={{ textAlign: 'right' }}>
                    {w.status === 'pendiente' ? (
                      <Button kind="success" size="sm" icon={Check} onClick={() => setPaying(w)}>Pagar</Button>
                    ) : (
                      <IconButton title="Ver detalle" onClick={() => setViewing(w)}><Eye size={14} /></IconButton>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {paying && (
        <PayModal
          wd={paying}
          onClose={() => setPaying(null)}
          onApprove={() => handleApprove(paying)}
          onReject={() => handleReject(paying)}
          isProcessing={updateStatus.isPending}
        />
      )}

      {viewing && (
        <DetailModal wd={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
