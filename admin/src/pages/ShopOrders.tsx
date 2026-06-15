import { useState, useMemo } from 'react'
import { RefreshCw, PackageCheck, Truck, Clock, CheckCircle2, ShoppingBag, Eye, Download, X } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import {
  useShopOrders, useUpdateOrderStatus, useLifeOrders, useVipEntries,
  type ShopOrder, type CartGroupItem, type OrderSummaryEntry, type LifeOrder, type VipEntry,
} from '../api/hooks'
import { shopApi } from '../api/client'

// ─── Status helpers ───────────────────────────────────────────────────────────

function fmtOrderNum(n: number | null | undefined): string {
  if (!n) return '—'
  return `B01-${n.toString().padStart(7, '0')}`
}

const ORDER_STATUSES: { value: ShopOrder['status']; label: string; tone: 'amber' | 'brand' | 'blue' | 'green' | 'red' | 'gray' }[] = [
  { value: 'PENDING',   label: 'Pendiente',  tone: 'amber' },
  { value: 'CONFIRMED', label: 'Confirmado', tone: 'brand' },
  { value: 'SHIPPED',   label: 'Enviado',    tone: 'blue'  },
  { value: 'DELIVERED', label: 'Entregado',  tone: 'green' },
  { value: 'CANCELLED', label: 'Cancelado',  tone: 'red'   },
]
const statusLabel = (s: string) => ORDER_STATUSES.find(o => o.value === s)?.label ?? s
const statusTone  = (s: string) => ORDER_STATUSES.find(o => o.value === s)?.tone ?? 'gray'

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  merch: { label: '🛒 Merch',       bg: '#7C3AED18', border: '#7C3AED44', color: '#7C3AED' },
  lives: { label: '❤️ Vidas',       bg: '#EC489918', border: '#EC489944', color: '#EC4899' },
  vip:   { label: '🎮 Entrada VIP', bg: '#F59E0B18', border: '#F59E0B44', color: '#D97706' },
}

function TypeBadge({ type }: { type: 'merch' | 'lives' | 'vip' }) {
  const cfg = TYPE_CONFIG[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

// ─── Merch order detail modal ─────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: ShopOrder; onClose: () => void }) {
  const updateStatus = useUpdateOrderStatus()
  const [status, setStatus] = useState<ShopOrder['status']>(order.status)
  const [notes, setNotes]   = useState(order.notes ?? '')
  const [saved, setSaved]   = useState(false)

  const title = order.items.length === 1
    ? `${order.items[0].emoji} ${order.items[0].name}`
    : `${order.items.length} productos`

  const handleSave = async () => {
    await updateStatus.mutateAsync({ id: order.id, status, notes: notes || undefined })
    setSaved(true)
    setTimeout(onClose, 600)
  }

  return (
    <Modal open onClose={onClose} title={`${fmtOrderNum(order.orderNumber)} · ${title}`} width={520}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={onClose}>Cerrar</Button>
          <Button kind="primary" onClick={handleSave} disabled={updateStatus.isPending}>
            {updateStatus.isPending ? 'Guardando…' : saved ? '✓ Guardado' : 'Actualizar estado'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {/* Customer */}
        <div style={{ padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 10, display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {order.user.name} <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>@{order.user.username}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{order.user.email}</div>
          {order.user.phone && <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{order.user.phone}</div>}
        </div>

        {/* Items list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--ink-400)', marginBottom: 8 }}>
            Productos ({order.items.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--ink-150)' }}>
                <th style={{ textAlign: 'left', paddingBottom: 6, fontWeight: 700, color: 'var(--ink-500)', fontSize: 11 }}>Producto</th>
                <th style={{ textAlign: 'center', paddingBottom: 6, fontWeight: 700, color: 'var(--ink-500)', fontSize: 11 }}>Cant.</th>
                <th style={{ textAlign: 'right', paddingBottom: 6, fontWeight: 700, color: 'var(--ink-500)', fontSize: 11 }}>P. unit.</th>
                <th style={{ textAlign: 'right', paddingBottom: 6, fontWeight: 700, color: 'var(--ink-500)', fontSize: 11 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: CartGroupItem) => (
                <tr key={item.orderId} style={{ borderBottom: '1px solid var(--ink-100)' }}>
                  <td style={{ padding: '8px 0' }}>{item.emoji} {item.name}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}>S/ {item.unitPrice.toFixed(2)}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>S/ {item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ paddingTop: 10, fontWeight: 700, color: 'var(--ink-500)' }}>Total</td>
                <td style={{ paddingTop: 10, textAlign: 'right', fontWeight: 900, fontSize: 15, color: 'var(--green-700)' }}>
                  S/ {order.totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Order meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
          <div><span style={{ color: 'var(--ink-400)' }}>Método pago</span><br /><strong>{order.method.toUpperCase()}</strong></div>
          <div>
            <span style={{ color: 'var(--ink-400)' }}>Fecha pedido</span><br />
            <strong>{new Date(order.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
          {order.recipientName && <div><span style={{ color: 'var(--ink-400)' }}>Destinatario</span><br /><strong>{order.recipientName}</strong></div>}
          {order.dni && <div><span style={{ color: 'var(--ink-400)' }}>DNI</span><br /><strong>{order.dni}</strong></div>}
          {order.phone && <div><span style={{ color: 'var(--ink-400)' }}>Teléfono</span><br /><strong>{order.phone}</strong></div>}
          {order.address && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--ink-400)' }}>Dirección</span><br /><strong>{order.address}</strong></div>}
        </div>

        {/* Status (applies to all items in group) */}
        <div>
          <label className="input-label">
            Estado del pedido {order.items.length > 1 && <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>(aplica a todos los productos)</span>}
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {ORDER_STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12,
                  background: status === s.value ? 'var(--brand-600,#7c3aed)' : 'var(--ink-100)',
                  color: status === s.value ? 'white' : 'var(--ink-600)',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="input-label">Notas internas</label>
          <textarea
            rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Enviado por Shalom, tracking #XYZ..."
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginTop: 6 }}
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── Export date range modal ──────────────────────────────────────────────────

function ExportModal({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = today.slice(0, 8) + '01'
  const [from, setFrom] = useState(firstOfMonth)
  const [to,   setTo]   = useState(today)
  const [type, setType] = useState<'all' | 'merch' | 'lives' | 'vip'>('all')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const token = (() => {
        try { return JSON.parse(localStorage.getItem('qtrivia-admin') ?? '{}')?.state?.token ?? '' } catch { return '' }
      })()
      const url = `http://localhost:3002${shopApi.exportUrl(type, from || undefined, to || undefined)}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const dateLabel = from && to ? `_${from}_${to}` : ''
      a.download = `qtrivia_ventas_${type}${dateLabel}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Exportar ventas CSV" width={380}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" icon={Download} onClick={handleExport} disabled={loading}>
            {loading ? 'Generando…' : 'Descargar CSV'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <label className="input-label">Tipo de ventas</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {([['all', 'Todas'], ['merch', '🛒 Merch'], ['lives', '❤️ Vidas'], ['vip', '🎮 Entradas VIP']] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setType(v)}
                style={{
                  padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 12,
                  background: type === v ? 'var(--brand-600,#7c3aed)' : 'var(--ink-100)',
                  color: type === v ? 'white' : 'var(--ink-600)',
                }}
              >{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="input-label">Desde</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginTop: 4 }}
            />
          </div>
          <div>
            <label className="input-label">Hasta</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginTop: 4 }}
            />
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0 }}>
          Deja las fechas en blanco para exportar todo el historial.
        </p>
      </div>
    </Modal>
  )
}

// ─── Unified entry type ───────────────────────────────────────────────────────

type UnifiedEntry =
  | { kind: 'merch'; data: ShopOrder;  date: Date; amount: number }
  | { kind: 'lives'; data: LifeOrder;  date: Date; amount: number }
  | { kind: 'vip';   data: VipEntry;   date: Date; amount: number }

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ShopOrders() {
  const [typeFilter, setTypeFilter]     = useState<'all' | 'merch' | 'lives' | 'vip'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch]             = useState('')
  const [viewMerch, setViewMerch]       = useState<ShopOrder | null>(null)
  const [showExport, setShowExport]     = useState(false)

  const { data: ordersData, isLoading: lo, refetch: refetchOrders } = useShopOrders()
  const { data: lifeOrders = [],  isLoading: ll, refetch: refetchLives  } = useLifeOrders()
  const { data: vipEntries = [],  isLoading: lv, refetch: refetchVip    } = useVipEntries()
  const isLoading = lo || ll || lv

  const orders: ShopOrder[]          = ordersData?.data ?? []
  const summary: OrderSummaryEntry[] = ordersData?.summary ?? []

  const refetchAll = () => { refetchOrders(); refetchLives(); refetchVip() }

  // Merge & sort
  const unified = useMemo<UnifiedEntry[]>(() => {
    const list: UnifiedEntry[] = [
      ...orders.map(o    => ({ kind: 'merch' as const, data: o,  date: new Date(o.createdAt),  amount: o.totalAmount })),
      ...lifeOrders.map(o => ({ kind: 'lives' as const, data: o,  date: new Date(o.createdAt),  amount: o.price })),
      ...vipEntries.map(e  => ({ kind: 'vip'   as const, data: e,  date: new Date(e.joinedAt),   amount: e.game.entryFee })),
    ]
    return list.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [orders, lifeOrders, vipEntries])

  // KPIs
  const totalRevenue = unified.reduce((s, e) => {
    if (e.kind === 'merch' && (e.data as ShopOrder).status === 'CANCELLED') return s
    return s + e.amount
  }, 0)
  const summaryMap     = Object.fromEntries(summary.map((s: OrderSummaryEntry) => [s.status, s]))
  const pendingCount   = summaryMap['PENDING']?._count?.id ?? 0
  const confirmedCount = summaryMap['CONFIRMED']?._count?.id ?? 0

  // Filter
  const filtered = unified.filter(e => {
    if (typeFilter !== 'all' && e.kind !== typeFilter) return false
    if (statusFilter !== 'all' && e.kind === 'merch') {
      if ((e.data as ShopOrder).status !== statusFilter) return false
    }
    if (statusFilter !== 'all' && e.kind !== 'merch') return false
    const q = search.toLowerCase()
    if (!q) return true
    const user = e.data.user
    if (user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.username.toLowerCase().includes(q)) return true
    if (e.kind === 'merch') return (e.data as ShopOrder).items.some((i: CartGroupItem) => i.name.toLowerCase().includes(q))
    if (e.kind === 'lives') return (e.data as LifeOrder).packLabel.toLowerCase().includes(q)
    if (e.kind === 'vip')   return (e.data as VipEntry).game.title.toLowerCase().includes(q)
    return false
  })

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ventas & Contabilidad</h1>
          <p className="page-sub">
            {isLoading ? 'Cargando…' : `${unified.length} transacciones · S/ ${totalRevenue.toFixed(2)} facturado`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconButton title="Recargar" onClick={refetchAll}>
            <RefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </IconButton>
          <Button kind="secondary" icon={Download} onClick={() => setShowExport(true)}>Exportar CSV</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Merch pendiente',  value: pendingCount,                      color: '#D97706', icon: <Clock size={14} /> },
          { label: 'Merch confirmado', value: confirmedCount,                    color: '#7C3AED', icon: <PackageCheck size={14} /> },
          { label: 'Entradas VIP',     value: vipEntries.length,                 color: '#F59E0B', icon: <ShoppingBag size={14} /> },
          { label: 'Compras de vidas', value: lifeOrders.length,                 color: '#EC4899', icon: <CheckCircle2 size={14} /> },
          { label: 'Total facturado',  value: `S/ ${totalRevenue.toFixed(2)}`,   color: 'var(--ink-600)', icon: <Truck size={14} /> },
        ].map(kpi => (
          <div key={kpi.label}
            style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: `1.5px solid var(--ink-150)`, background: 'var(--surface)' }}
          >
            <div style={{ color: kpi.color, marginBottom: 6 }}>{kpi.icon}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <Card noPad>
        <div className="table-toolbar">
          <div className="search-bar">
            <input
              placeholder="Buscar por usuario, email, producto…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="tabs inline-tabs">
            {([
              ['all',   'Todas'],
              ['merch', '🛒 Merch'],
              ['lives', '❤️ Vidas'],
              ['vip',   '🎮 VIP'],
            ] as const).map(([v, l]) => (
              <button key={v} className={`tab-btn ${typeFilter === v ? 'tab-btn-active' : ''}`}
                onClick={() => { setTypeFilter(v); setStatusFilter('all') }}
              >{l}</button>
            ))}
          </div>

          {/* Status sub-filter (only when merch) */}
          {typeFilter === 'merch' && (
            <div className="tabs inline-tabs">
              {[{ v: 'all', l: 'Todos' }, ...ORDER_STATUSES.map(s => ({ v: s.value, l: s.label }))].map(t => (
                <button key={t.v} className={`tab-btn ${statusFilter === t.v ? 'tab-btn-active' : ''}`}
                  onClick={() => setStatusFilter(t.v)}
                >{t.l}</button>
              ))}
            </div>
          )}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Usuario</th>
              <th>Método</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)' }}>Cargando…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><p>Sin transacciones.</p></div></td></tr>
            )}
            {!isLoading && filtered.map(entry => {
              const dateStr = entry.date.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })

              if (entry.kind === 'merch') {
                const o = entry.data as ShopOrder
                const itemSummary = o.items.map((i: CartGroupItem) => `${i.emoji} ${i.name}`).join(', ')
                return (
                  <tr key={`m-${o.id}`} style={{ cursor: 'pointer' }} onClick={() => setViewMerch(o)}>
                    <td><TypeBadge type="merch" /></td>
                    <td>
                      <div className="cell-strong" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>
                        {fmtOrderNum(o.orderNumber)}
                      </div>
                      <div className="cell-strong">{itemSummary}</div>
                      <div className="cell-meta">
                        {o.items.length} {o.items.length === 1 ? 'producto' : 'productos'}
                        {o.recipientName ? ` · ${o.recipientName}` : o.address ? ` · ${o.address}` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="cell-strong">{o.user.name}</div>
                      <div className="cell-meta">@{o.user.username}</div>
                    </td>
                    <td><Badge tone="gray">{o.method.toUpperCase()}</Badge></td>
                    <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 700 }}>S/ {o.totalAmount.toFixed(2)}</td>
                    <td className="cell-muted" style={{ fontSize: 12 }}>{dateStr}</td>
                    <td><Badge tone={statusTone(o.status) as any}>{statusLabel(o.status)}</Badge></td>
                    <td onClick={e => e.stopPropagation()}>
                      <IconButton title="Ver / actualizar" onClick={() => setViewMerch(o)}>
                        <Eye size={13} />
                      </IconButton>
                    </td>
                  </tr>
                )
              }

              if (entry.kind === 'lives') {
                const o = entry.data as LifeOrder
                return (
                  <tr key={`l-${o.id}`}>
                    <td><TypeBadge type="lives" /></td>
                    <td>
                      <div className="cell-strong" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>{fmtOrderNum(o.orderNumber)}</div>
                      <div className="cell-strong">❤️ {o.packLabel}</div>
                      <div className="cell-meta">{o.lives * o.quantity} vidas · x{o.quantity} pack</div>
                    </td>
                    <td>
                      <div className="cell-strong">{o.user.name}</div>
                      <div className="cell-meta">@{o.user.username}</div>
                    </td>
                    <td><Badge tone="gray">{o.method.toUpperCase()}</Badge></td>
                    <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 700 }}>S/ {o.price.toFixed(2)}</td>
                    <td className="cell-muted" style={{ fontSize: 12 }}>{dateStr}</td>
                    <td><Badge tone="green">Acreditado</Badge></td>
                    <td />
                  </tr>
                )
              }

              // vip
              const e = entry.data as VipEntry
              return (
                <tr key={`v-${e.id}`}>
                  <td><TypeBadge type="vip" /></td>
                  <td>
                    <div className="cell-strong" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-400)', marginBottom: 2 }}>{fmtOrderNum(e.orderNumber)}</div>
                    <div className="cell-strong">🎮 {e.game.title}</div>
                    <div className="cell-meta">
                      {new Date(e.game.scheduledAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </td>
                  <td>
                    <div className="cell-strong">{e.user.name}</div>
                    <div className="cell-meta">@{e.user.username}</div>
                  </td>
                  <td><Badge tone="gray">EXTERNO</Badge></td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 700 }}>S/ {e.game.entryFee.toFixed(2)}</td>
                  <td className="cell-muted" style={{ fontSize: 12 }}>{dateStr}</td>
                  <td><Badge tone="brand">Confirmado</Badge></td>
                  <td />
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {viewMerch && (
        <OrderDetailModal order={viewMerch} onClose={() => { setViewMerch(null); refetchOrders() }} />
      )}
      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}
    </div>
  )
}
