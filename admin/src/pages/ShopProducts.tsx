import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Heart } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import {
  useShopPacks, useShopMerch,
  useCreatePack, useUpdatePack, useDeletePack,
  useCreateMerch, useUpdateMerch, useDeleteMerch,
  type LifePack, type MerchItem,
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
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      }
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
              {([true, false] as const).map(v => (
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
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      }
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
            {([true, false] as const).map(v => (
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ShopProducts() {
  const { data: packs = [], isLoading: packsLoading, refetch: refetchPacks } = useShopPacks()
  const { data: merch = [], isLoading: merchLoading, refetch: refetchMerch } = useShopMerch()
  const deletePack  = useDeletePack()
  const deleteMerch = useDeleteMerch()

  const [editPack,  setEditPack]  = useState<LifePack | null | 'new'>(null)
  const [editMerch, setEditMerch] = useState<MerchItem | null | 'new'>(null)
  const [mutError,  setMutError]  = useState('')

  const handleDeletePack = async (id: string) => {
    if (!confirm('¿Eliminar este pack?')) return
    try { await deletePack.mutateAsync(id) } catch (err: any) { setMutError(err?.response?.data?.message ?? 'Error') }
  }
  const handleDeleteMerch = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    try { await deleteMerch.mutateAsync(id) } catch (err: any) { setMutError(err?.response?.data?.message ?? 'Error') }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-sub">Packs de vidas y productos físicos que aparecen en la app móvil</p>
        </div>
      </div>

      {mutError && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          {mutError}
          <button onClick={() => setMutError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

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
            {!packsLoading && packs.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><p>Sin packs. Crea el primero.</p></div></td></tr>
            )}
            {!packsLoading && packs.map(p => (
              <tr key={p.id}>
                <td>
                  <div className="cell-strong">
                    <Heart size={12} style={{ display: 'inline', color: '#EC4899', marginRight: 6 }} />
                    {p.label}
                  </div>
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
            {!merchLoading && merch.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><p>Sin productos. Agrega el primero.</p></div></td></tr>
            )}
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
    </div>
  )
}
