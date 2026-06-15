import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Heart, ShoppingBag, PackageCheck, Truck, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Input'
import {
  useShopPacks, useShopMerch,
  useCreatePack, useUpdatePack, useDeletePack,
  useCreateMerch, useUpdateMerch, useDeleteMerch,
  useShopOrders, useUpdateOrderStatus,
  type LifePack, type MerchItem, type ShopOrder, type OrderSummaryEntry,
} from '../api/hooks'

// ─── Pack modal ───────────────────────────────────────────────────────────────

function PackModal({ pack, onClose }: { pack: LifePack | null; onClose: () => void }) {
  const createPack = useCreatePack()
  const updatePack = useUpdatePack()
  const isNew = !pack

  const [form, setForm] = useState({
    id:        pack?.id ?? '',
    label:     pack?.label ?? '',
    lives:     pack?.lives ?? 1,
    price:     pack?.price ?? 1,
    tag:       pack?.tag ?? '',
    active:    pack?.active ?? true,
    sortOrder: pack?.sortOrder ?? 0,
  })
  const [error, setError] = useState('')
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = createPack.isPending || updatePack.isPending

  const handleSave = async () => {
    setError('')
    try {
      const payload = { ...form, tag: form.tag || null }
      if (isNew) {
        await createPack.mutateAsync(payload)
      } else {
        await updatePack.mutateAsync({ id: pack!.id, data: payload })
      }
      onClose()
    } catch (err: any) {
      const d = err?.response?.data
      setError(d?.error ?? d?.message ?? 'Error al guardar.')
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Nuevo pack de vidas' : 'Editar pack'} width={420}
      footer={<div style={{ display: 'flex', gap: 8 }}>
        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button kind="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
      </div>}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {error && <div className="alert alert-warn">{error}</div>}
        {isNew && <Input label="ID único" value={form.id} onChange={e => upd('id', e.target.value)} placeholder="ej: pack10" hint="No puede cambiarse después" />}
        <Input label="Nombre" value={form.label} onChange={e => upd('label', e.target.value)} placeholder="ej: Pack 10 vidas" />
        <div className="form-grid-2">
          <Input label="Vidas" type="number" min={1} value={form.lives} onChange={e => upd('lives', Number(e.target.value))} />
          <Input label="Precio (S/)" type="number" min={0.1} step={0.01} value={form.price} onChange={e => upd('price', Number(e.target.value))} />
        </div>
        <Input label="Etiqueta (opcional)" value={form.tag} onChange={e => upd('tag', e.target.value)} placeholder="ej: POPULAR, MEJOR VALOR" />
        <div className="form-grid-2">
          <Input label="Orden" type="number" min={0} value={form.sortOrder} onChange={e => upd('sortOrder', Number(e.target.value))} />
          <div className="input-group">
            <label className="input-label">Estado</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button"
                  className={`difficulty-btn ${form.active === v ? (v ? 'difficulty-btn-green' : 'difficulty-btn-red') : ''}`}
                  onClick={() => upd('active', v)}
                >
                  {v ? 'Activo' : 'Inactivo'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Merch modal ──────────────────────────────────────────────────────────────

function MerchModal({ item, onClose }: { item: MerchItem | null; onClose: () => void }) {
  const createMerch = useCreateMerch()
  const updateMerch = useUpdateMerch()
  const isNew = !item

  const [form, setForm] = useState({
    id:        item?.id ?? '',
    emoji:     item?.emoji ?? '🛍️',
    name:      item?.name ?? '',
    desc:      item?.desc ?? '',
    price:     item?.price ?? 10,
    stock:     item?.stock ?? -1,
    active:    item?.active ?? true,
    sortOrder: item?.sortOrder ?? 0,
  })
  const [error, setError] = useState('')
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))
  const isSaving = createMerch.isPending || updateMerch.isPending

  const handleSave = async () => {
    setError('')
    try {
      if (isNew) {
        await createMerch.mutateAsync(form)
      } else {
        await updateMerch.mutateAsync({ id: item!.id, data: form })
      }
      onClose()
    } catch (err: any) {
      const d = err?.response?.data
      setError(d?.error ?? d?.message ?? 'Error al guardar.')
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Nuevo producto' : 'Editar producto'} width={440}
      footer={<div style={{ display: 'flex', gap: 8 }}>
        <Button kind="ghost" onClick={onClose}>Cancelar</Button>
        <Button kind="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
      </div>}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {error && <div className="alert alert-warn">{error}</div>}
        {isNew && <Input label="ID único" value={form.id} onChange={e => upd('id', e.target.value)} placeholder="ej: mug" hint="No puede cambiarse después" />}
        <div className="form-grid-2">
          <Input label="Emoji" value={form.emoji} onChange={e => upd('emoji', e.target.value)} placeholder="🛍️" />
          <Input label="Precio (S/)" type="number" min={1} value={form.price} onChange={e => upd('price', Number(e.target.value))} />
        </div>
        <Input label="Nombre" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="ej: Taza QTrivia" />
        <Input label="Descripción corta" value={form.desc} onChange={e => upd('desc', e.target.value)} placeholder="ej: Cerámica · 350ml" />
        <div className="form-grid-2">
          <Input label="Stock (-1 = ilimitado)" type="number" min={-1} value={form.stock} onChange={e => upd('stock', Number(e.target.value))} hint="-1 = sin límite" />
          <Input label="Orden" type="number" min={0} value={form.sortOrder} onChange={e => upd('sortOrder', Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label className="input-label">Estado</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[true, false].map(v => (
              <button key={String(v)} type="button"
                className={`difficulty-btn ${form.active === v ? (v ? 'difficulty-btn-green' : 'difficulty-btn-red') : ''}`}
                onClick={() => upd('active', v)}
              >
                {v ? 'Activo' : 'Inactivo'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Order status helpers ─────────────────────────────────────────────────────

const ORDER_STATUSES: { value: ShopOrder['status']; label: string; tone: 'amber' | 'brand' | 'blue' | 'green' | 'red' | 'gray' }[] = [
  { value: 'PENDING',   label: 'Pendiente',  tone: 'amber' },
  { value: 'CONFIRMED', label: 'Confirmado', tone: 'brand' },
  { value: 'SHIPPED',   label: 'Enviado',    tone: 'blue'  },
  { value: 'DELIVERED', label: 'Entregado',  tone: 'green' },
  { value: 'CANCELLED', label: 'Cancelado',  tone: 'red'   },
]
const statusLabel = (s: string) => ORDER_STATUSES.find(o => o.value === s)?.label ?? s
const statusTone  = (s: string) => ORDER_STATUSES.find(o => o.value === s)?.tone ?? 'gray'

function OrderDetailModal({ order, onClose }: { order: ShopOrder; onClose: () => void }) {
  const updateStatus = useUpdateOrderStatus()
  const [status, setStatus] = useState<ShopOrder['status']>(order.status)
  const [notes, setNotes] = useState(order.notes ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await updateStatus.mutateAsync({ id: order.id, status, notes: notes || undefined })
    setSaved(true)
    setTimeout(onClose, 600)
  }

  return (
    <Modal open onClose={onClose} title={`Pedido · ${order.item.emoji} ${order.item.name}`} width={480}
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
        {/* User */}
        <div style={{ padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 10, display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{order.user.name} <span style={{ color: 'var(--ink-400)', fontWeight: 400 }}>@{order.user.username}</span></div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{order.user.email}</div>
          {order.user.phone && <div style={{ fontSize: 13, color: 'var(--ink-500)' }}>{order.user.phone}</div>}
        </div>
        {/* Order detail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
          <div><span style={{ color: 'var(--ink-400)' }}>Producto</span><br /><strong>{order.item.emoji} {order.item.name}</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Cantidad</span><br /><strong>{order.quantity} und.</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Total pagado</span><br /><strong style={{ color: 'var(--green-700)' }}>S/ {order.total.toFixed(2)}</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Método pago</span><br /><strong>{order.method.toUpperCase()}</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Fecha pedido</span><br /><strong>{new Date(order.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></div>
          {order.address && <div><span style={{ color: 'var(--ink-400)' }}>Dirección</span><br /><strong>{order.address}</strong></div>}
        </div>
        {/* Status */}
        <div>
          <label className="input-label">Estado del pedido</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {ORDER_STATUSES.map(s => (
              <button key={s.value} type="button"
                onClick={() => setStatus(s.value)}
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
        {/* Notes */}
        <div>
          <label className="input-label">Notas internas</label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ej: Enviado por Shalom, tracking #XYZ..."
            style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginTop: 6 }}
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Shop() {
  const { data: packs = [], isLoading: packsLoading, refetch: refetchPacks } = useShopPacks()
  const { data: merch = [], isLoading: merchLoading, refetch: refetchMerch } = useShopMerch()
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useShopOrders()
  const orders: ShopOrder[] = ordersData?.data ?? []
  const summary: OrderSummaryEntry[] = ordersData?.summary ?? []
  const deletePack = useDeletePack()
  const deleteMerch = useDeleteMerch()

  const [editPack, setEditPack] = useState<LifePack | null | 'new'>(null)
  const [editMerch, setEditMerch] = useState<MerchItem | null | 'new'>(null)
  const [viewOrder, setViewOrder] = useState<ShopOrder | null>(null)
  const [orderFilter, setOrderFilter] = useState<string>('all')
  const [mutError, setMutError] = useState('')

  const handleDeletePack = async (id: string) => {
    if (!confirm('¿Eliminar este pack?')) return
    try { await deletePack.mutateAsync(id) } catch (err: any) { setMutError(err?.response?.data?.message ?? 'Error') }
  }
  const handleDeleteMerch = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    try { await deleteMerch.mutateAsync(id) } catch (err: any) { setMutError(err?.response?.data?.message ?? 'Error') }
  }

  const summaryMap = Object.fromEntries(summary.map(s => [s.status, s]))
  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)

  const pendingCount   = summaryMap['PENDING']?._count?.id ?? 0
  const confirmedCount = summaryMap['CONFIRMED']?._count?.id ?? 0
  const shippedCount   = summaryMap['SHIPPED']?._count?.id ?? 0
  const deliveredCount = summaryMap['DELIVERED']?._count?.id ?? 0
  const totalRevenue   = orders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tienda</h1>
          <p className="page-sub">Packs de vidas, productos físicos y gestión de pedidos</p>
        </div>
      </div>

      {mutError && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          {mutError}<button onClick={() => setMutError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* ── Orders dashboard ───────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-700)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={16} /> Pedidos de merch
          </h2>
          <IconButton title="Recargar" onClick={() => refetchOrders()}>
            <RefreshCw size={14} style={ordersLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </IconButton>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Pendientes', value: pendingCount, icon: <Clock size={14} />, color: '#D97706', filter: 'PENDING' },
            { label: 'Confirmados', value: confirmedCount, icon: <PackageCheck size={14} />, color: '#7C3AED', filter: 'CONFIRMED' },
            { label: 'Enviados', value: shippedCount, icon: <Truck size={14} />, color: '#2563EB', filter: 'SHIPPED' },
            { label: 'Entregados', value: deliveredCount, icon: <CheckCircle2 size={14} />, color: '#059669', filter: 'DELIVERED' },
            { label: 'Total cobrado', value: `S/ ${totalRevenue.toFixed(2)}`, icon: <ShoppingBag size={14} />, color: 'var(--ink-600)', filter: 'all' },
          ].map(kpi => (
            <button key={kpi.filter} onClick={() => setOrderFilter(kpi.filter)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1.5px solid',
                borderColor: orderFilter === kpi.filter ? kpi.color : 'var(--ink-150)',
                background: orderFilter === kpi.filter ? `${kpi.color}10` : 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: kpi.color, marginBottom: 6 }}>{kpi.icon}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: 'var(--ink-900)', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{kpi.label}</div>
            </button>
          ))}
        </div>

        {/* Orders table */}
        <Card noPad>
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Método</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Estado</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)' }}>Cargando…</td></tr>}
              {!ordersLoading && filteredOrders.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)' }}>Sin pedidos{orderFilter !== 'all' ? ` con estado "${statusLabel(orderFilter)}"` : ''}.</td></tr>
              )}
              {!ordersLoading && filteredOrders.map(o => (
                <tr key={o.id}>
                  <td>
                    <div className="cell-strong">{o.item.emoji} {o.item.name}</div>
                    <div className="cell-meta">{o.quantity} und. · {new Date(o.createdAt).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                  </td>
                  <td>
                    <div className="cell-strong">{o.user.name}</div>
                    <div className="cell-meta">@{o.user.username}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                    <div>{o.user.email}</div>
                    {o.user.phone && <div>{o.user.phone}</div>}
                    {o.address && <div style={{ color: 'var(--ink-400)' }}>{o.address}</div>}
                  </td>
                  <td><Badge tone="gray">{o.method.toUpperCase()}</Badge></td>
                  <td className="cell-mono" style={{ textAlign: 'right', fontWeight: 700 }}>S/ {o.total.toFixed(2)}</td>
                  <td><Badge tone={statusTone(o.status) as any}>{statusLabel(o.status)}</Badge></td>
                  <td>
                    <IconButton title="Ver / actualizar" onClick={() => setViewOrder(o)}>
                      <Eye size={13} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Life Packs ─────────────────────────────────────────────── */}
      <Card noPad style={{ marginBottom: 20 }}>
        <CardHeader
          title="Packs de vidas"
          sub={`${packs.length} packs · ${packs.filter(p => p.active).length} activos`}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <IconButton title="Recargar" onClick={() => refetchPacks()}>
                <RefreshCw size={14} style={packsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              </IconButton>
              <Button kind="primary" size="sm" icon={Plus} onClick={() => setEditPack('new')}>Nuevo pack</Button>
            </div>
          }
        />
        <table className="table">
          <thead>
            <tr>
              <th>Pack</th><th>Vidas</th><th>Precio</th><th>Etiqueta</th><th>Orden</th><th>Estado</th><th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {packsLoading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)' }}>Cargando…</td></tr>}
            {!packsLoading && packs.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="cell-strong"><Heart size={12} style={{ display: 'inline', color: '#EC4899', marginRight: 6 }} />{p.label}</div>
                  <div className="cell-meta">{p.id}</div>
                </td>
                <td className="cell-mono">{p.lives}</td>
                <td className="cell-mono" style={{ fontWeight: 600 }}>S/ {p.price.toFixed(2)}</td>
                <td>{p.tag ? <Badge tone="brand">{p.tag}</Badge> : <span className="cell-muted">—</span>}</td>
                <td className="cell-mono">{p.sortOrder}</td>
                <td><Badge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Activo' : 'Inactivo'}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <IconButton title="Editar" onClick={() => setEditPack(p)}><Pencil size={13} /></IconButton>
                    <IconButton title="Eliminar" onClick={() => handleDeletePack(p.id)}><Trash2 size={13} /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ── Merch ──────────────────────────────────────────────────── */}
      <Card noPad>
        <CardHeader
          title="Productos físicos (merch)"
          sub={`${merch.length} productos · ${merch.filter(m => m.active).length} activos`}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <IconButton title="Recargar" onClick={() => refetchMerch()}>
                <RefreshCw size={14} style={merchLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              </IconButton>
              <Button kind="primary" size="sm" icon={Plus} onClick={() => setEditMerch('new')}>Nuevo producto</Button>
            </div>
          }
        />
        <table className="table">
          <thead>
            <tr>
              <th>Producto</th><th>Precio</th><th>Stock</th><th>Orden</th><th>Estado</th><th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {merchLoading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--ink-400)' }}>Cargando…</td></tr>}
            {!merchLoading && merch.map(m => (
              <tr key={m.id}>
                <td>
                  <div className="cell-strong"><span style={{ marginRight: 8 }}>{m.emoji}</span>{m.name}</div>
                  <div className="cell-meta">{m.desc}</div>
                </td>
                <td className="cell-mono" style={{ fontWeight: 600 }}>S/ {m.price.toFixed(2)}</td>
                <td>
                  {m.stock === -1 ? <Badge tone="green">Ilimitado</Badge>
                    : m.stock === 0 ? <Badge tone="red">Agotado</Badge>
                    : <span className="cell-mono">{m.stock} uds.</span>}
                </td>
                <td className="cell-mono">{m.sortOrder}</td>
                <td><Badge tone={m.active ? 'green' : 'gray'}>{m.active ? 'Activo' : 'Inactivo'}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <IconButton title="Editar" onClick={() => setEditMerch(m)}><Pencil size={13} /></IconButton>
                    <IconButton title="Eliminar" onClick={() => handleDeleteMerch(m.id)}><Trash2 size={13} /></IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editPack !== null && (
        <PackModal pack={editPack === 'new' ? null : editPack} onClose={() => { setEditPack(null); refetchPacks() }} />
      )}
      {editMerch !== null && (
        <MerchModal item={editMerch === 'new' ? null : editMerch} onClose={() => { setEditMerch(null); refetchMerch() }} />
      )}
      {viewOrder !== null && (
        <OrderDetailModal order={viewOrder} onClose={() => { setViewOrder(null); refetchOrders() }} />
      )}
    </div>
  )
}
