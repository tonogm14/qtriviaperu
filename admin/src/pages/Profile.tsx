import { useState } from 'react'
import { Save, Lock } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useMutation } from '@tanstack/react-query'
import { adminAuthApi } from '../api/client'
import useAdminStore from '../store/useAdminStore'

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const safeName = String(name ?? '?')
  const initials = safeName.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
  const hue = (safeName.charCodeAt(0) * 37) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.55 0.18 ${hue + 30}))`,
      display: 'grid', placeItems: 'center', color: 'white',
      fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export function Profile() {
  const { user, setUser, token } = useAdminStore()
  const [form, setForm] = useState({ name: user?.name ?? '', phone: '' })
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')

  const updateMe = useMutation({
    mutationFn: (data: { name?: string; phone?: string; password?: string }) => adminAuthApi.updateMe(data),
  })

  const parseApiError = (err: any): string => {
    const data = err?.response?.data
    if (data?.details?.length) {
      return data.details.map((d: any) => d.message).join(', ')
    }
    return data?.error ?? data?.message ?? 'Error al guardar.'
  }

  const handleSave = async () => {
    setSaveMsg(''); setSaveErr('')
    const name = form.name.trim()
    if (name.length < 2) { setSaveErr('El nombre debe tener al menos 2 caracteres.'); return }
    try {
      const payload: { name: string; phone?: string } = { name }
      if (form.phone.trim()) payload.phone = form.phone.trim()
      const res = await updateMe.mutateAsync(payload)
      const updated = res.data.data
      if (user && token) {
        setUser({
          ...user,
          name: updated.name,
          initials: updated.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase(),
        }, token)
      }
      setSaveMsg('✓ Guardado')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch (err: any) {
      setSaveErr(parseApiError(err))
    }
  }

  const handlePwSave = async () => {
    setPwMsg(''); setPwErr('')
    if (!pwForm.next) { setPwErr('Escribe la nueva contraseña.'); return }
    if (pwForm.next.length < 8) { setPwErr('La contraseña debe tener al menos 8 caracteres.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwErr('Las contraseñas no coinciden.'); return }
    try {
      await updateMe.mutateAsync({ password: pwForm.next })
      setPwForm({ next: '', confirm: '' })
      setPwMsg('✓ Contraseña actualizada')
      setTimeout(() => setPwMsg(''), 2500)
    } catch (err: any) {
      setPwErr(parseApiError(err))
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mi perfil</h1>
          <p className="page-sub">Gestiona tu información personal y seguridad</p>
        </div>
      </div>

      <div className="profile-layout">
        {/* Avatar + quick info */}
        <div>
          <Card style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Avatar name={form.name || user?.name || '?'} size={80} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>{form.name || user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-500)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-brand">{user?.role ?? 'ADMIN'}</span>
            </div>
          </Card>
        </div>

        {/* Forms */}
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <h3 className="section-title">Información personal</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <Input
                label="Nombre completo"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Teléfono (opcional)"
                placeholder="+51 999 999 999"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              <div className="input-group">
                <label className="input-label">Email</label>
                <input className="input" value={user?.email ?? ''} disabled />
                <span className="input-hint">El email no puede cambiarse desde aquí</span>
              </div>
              <div className="input-group">
                <label className="input-label">Rol</label>
                <input className="input" value={user?.role ?? 'ADMIN'} disabled />
              </div>
              <div className="input-group">
                <label className="input-label">Zona horaria</label>
                <input className="input" value="América/Lima (GMT-5)" disabled />
              </div>
              {saveErr && <div className="alert alert-warn">{saveErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                {saveMsg && <span className="save-feedback">{saveMsg}</span>}
                <Button kind="primary" icon={Save} onClick={handleSave} disabled={updateMe.isPending}>
                  {updateMe.isPending ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="section-title">
              <Lock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              Cambiar contraseña
            </h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <Input
                label="Nueva contraseña"
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="Mínimo 8 caracteres"
              />
              <Input
                label="Confirmar nueva contraseña"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Repite la nueva contraseña"
              />
              {pwErr && <div className="alert alert-warn">{pwErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                {pwMsg && <span className="save-feedback">{pwMsg}</span>}
                <Button
                  kind="primary"
                  icon={Lock}
                  disabled={!pwForm.next || pwForm.next.length < 8 || updateMe.isPending}
                  onClick={handlePwSave}
                >
                  {updateMe.isPending ? 'Guardando…' : 'Actualizar contraseña'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
