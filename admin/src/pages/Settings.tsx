import { useState, useEffect } from 'react'
import { Save, Plus, RefreshCw, Check, Eye, EyeOff, Trash2, ShieldAlert } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useUsers, useCreateUser, useAppConfig, useUpdateConfig, useBadWords, useAddBadWord, useDeleteBadWord } from '../api/hooks'
import { PERMISSIONS } from '../types'

function SettingRow({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-title">{title}</div>
        {sub && <div className="setting-sub">{sub}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch-label">
      <div className={`switch ${checked ? 'switch-on' : ''}`} onClick={() => onChange(!checked)}>
        <div className="switch-thumb" />
      </div>
    </label>
  )
}

const PERMISSION_MODULES = [
  {
    label: 'Dashboard',
    perms: [{ key: PERMISSIONS.DASHBOARD_READ, label: 'Ver dashboard' }],
  },
  {
    label: 'Monitor en vivo',
    perms: [{ key: PERMISSIONS.LIVE_READ, label: 'Ver monitor en vivo' }],
  },
  {
    label: 'Juegos',
    perms: [
      { key: PERMISSIONS.GAMES_READ,   label: 'Ver juegos' },
      { key: PERMISSIONS.GAMES_WRITE,  label: 'Crear / editar juegos' },
      { key: PERMISSIONS.GAMES_NOTIFY, label: 'Enviar notificaciones de juego' },
    ],
  },
  {
    label: 'Preguntas',
    perms: [
      { key: PERMISSIONS.QUESTIONS_READ,  label: 'Ver preguntas' },
      { key: PERMISSIONS.QUESTIONS_WRITE, label: 'Crear / editar preguntas' },
    ],
  },
  {
    label: 'Usuarios',
    perms: [
      { key: PERMISSIONS.USERS_READ,  label: 'Ver usuarios' },
      { key: PERMISSIONS.USERS_WRITE, label: 'Editar / crear usuarios admin' },
    ],
  },
  {
    label: 'Retiros',
    perms: [
      { key: PERMISSIONS.WITHDRAWALS_READ,    label: 'Ver retiros' },
      { key: PERMISSIONS.WITHDRAWALS_APPROVE, label: 'Aprobar / rechazar retiros' },
    ],
  },
  {
    label: 'Log Actividad',
    perms: [{ key: PERMISSIONS.ACTIVITY_READ, label: 'Ver log de actividad' }],
  },
  {
    label: 'Notificaciones',
    perms: [{ key: PERMISSIONS.NOTIFICATIONS_BROADCAST, label: 'Enviar notificaciones masivas' }],
  },
  {
    label: 'Métricas',
    perms: [{ key: PERMISSIONS.METRICS_READ, label: 'Ver métricas' }],
  },
  {
    label: 'Tienda',
    perms: [
      { key: PERMISSIONS.SHOP_READ,  label: 'Ver órdenes y productos' },
      { key: PERMISSIONS.SHOP_WRITE, label: 'Gestionar productos y órdenes' },
    ],
  },
]

function NewUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const createUser = useCreateUser()
  const [form, setForm] = useState({
    name: '', email: '', username: '', password: '',
    isSuperAdmin: false,
  })
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const togglePerm = (perm: string) =>
    setSelectedPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )

  const toggleModule = (perms: string[]) => {
    const allSelected = perms.every(p => selectedPerms.includes(p))
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !perms.includes(p)))
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...perms])])
    }
  }

  const handleCreate = async () => {
    setError('')
    if (!form.name.trim())     { setError('El nombre es obligatorio.'); return }
    if (!form.email.trim())    { setError('El email es obligatorio.'); return }
    if (!form.username.trim()) { setError('El usuario es obligatorio.'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    try {
      await createUser.mutateAsync({
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        username:    form.username.trim(),
        password:    form.password,
        role:        'ADMIN',
        permissions: form.isSuperAdmin ? [] : selectedPerms,
      })
      onCreated()
      onClose()
    } catch (err: any) {
      const d = err?.response?.data
      const detail = d?.details?.map((x: any) => x.message).join(', ')
      setError(detail ?? d?.error ?? d?.message ?? 'Error al crear usuario.')
    }
  }

  return (
    <Modal open onClose={onClose} title="Nuevo miembro del equipo" width={560}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button kind="ghost" onClick={onClose}>Cancelar</Button>
          <Button kind="primary" onClick={handleCreate} disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando…' : 'Crear usuario'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        {error && <div className="alert alert-warn">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Nombre completo" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Ej: María López" />
          <Input label="Usuario (@)" value={form.username} onChange={e => upd('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="ej: maria_l" />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="maria@empresa.com" />

        <div style={{ position: 'relative' }}>
          <Input
            label="Contraseña temporal"
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={e => upd('password', e.target.value)}
            placeholder="Mínimo 8 caracteres"
            hint="El usuario podrá cambiarla desde Mi perfil"
          />
          <button type="button" onClick={() => setShowPw(v => !v)}
            style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)' }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--ink-50)', borderRadius: 10, border: '1px solid var(--ink-150)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-800)' }}>Superadmin (acceso total)</div>
            <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>Sin restricciones — ve y edita todo el panel</div>
          </div>
          <button type="button" onClick={() => upd('isSuperAdmin', !form.isSuperAdmin)}
            style={{
              width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: form.isSuperAdmin ? 'var(--brand-500)' : 'var(--ink-200)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
            <span style={{
              position: 'absolute', top: 3, left: form.isSuperAdmin ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {!form.isSuperAdmin && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-700)', marginBottom: 10 }}>
              Permisos por módulo
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {PERMISSION_MODULES.map(mod => {
                const modPerms = mod.perms.map(p => p.key)
                const allSelected = modPerms.every(p => selectedPerms.includes(p))
                const someSelected = modPerms.some(p => selectedPerms.includes(p))
                return (
                  <div key={mod.label} style={{ border: '1px solid var(--ink-150)', borderRadius: 10, overflow: 'hidden' }}>
                    <button type="button" onClick={() => toggleModule(modPerms)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', background: allSelected ? 'var(--brand-50,#f5f3ff)' : 'var(--ink-50)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: '2px solid',
                        borderColor: allSelected ? 'var(--brand-500)' : someSelected ? 'var(--brand-300)' : 'var(--ink-300)',
                        background: allSelected ? 'var(--brand-500)' : someSelected ? 'var(--brand-100)' : 'transparent',
                        display: 'grid', placeItems: 'center',
                      }}>
                        {allSelected && <Check size={11} strokeWidth={3} style={{ color: 'white' }} />}
                        {someSelected && !allSelected && <div style={{ width: 8, height: 2, background: 'var(--brand-500)', borderRadius: 1 }} />}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-800)' }}>{mod.label}</span>
                    </button>
                    {mod.perms.map(p => (
                      <label key={p.key} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px 7px 32px', cursor: 'pointer',
                        background: selectedPerms.includes(p.key) ? 'var(--brand-50,#f5f3ff)' : 'transparent',
                        borderTop: '1px solid var(--ink-100)',
                      }}>
                        <input
                          type="checkbox"
                          checked={selectedPerms.includes(p.key)}
                          onChange={() => togglePerm(p.key)}
                          style={{ width: 15, height: 15, accentColor: 'var(--brand-500)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--ink-700)' }}>{p.label}</span>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
            {selectedPerms.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--amber-600)' }}>
                ⚠ Sin permisos seleccionados — el usuario no podrá acceder al panel.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function Settings() {
  const [tab, setTab] = useState('general')
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const [showNewUser, setShowNewUser] = useState(false)

  const { data: config, isLoading: configLoading } = useAppConfig()
  const updateConfig = useUpdateConfig()

  // Bad words
  const { data: badWords = [], isLoading: badWordsLoading } = useBadWords()
  const addBadWord = useAddBadWord()
  const deleteBadWord = useDeleteBadWord()
  const [newWord, setNewWord] = useState('')
  const [wordError, setWordError] = useState('')

  const handleAddWord = async () => {
    const w = newWord.trim().toLowerCase()
    if (!w) return
    setWordError('')
    try {
      await addBadWord.mutateAsync(w)
      setNewWord('')
    } catch (err: any) {
      setWordError(err?.response?.data?.error ?? 'Ya existe o error al guardar')
    }
  }

  // General
  const [currency, setCurrency] = useState('PEN')

  // Game defaults
  const [defaultPrize, setDefaultPrize] = useState(5000)
  const [defaultQuestions, setDefaultQuestions] = useState(12)
  const [defaultTime, setDefaultTime] = useState(10)
  const [pushBefore, setPushBefore] = useState(10)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [autoCloseRegistration, setAutoCloseRegistration] = useState(true)
  const [chatModeration, setChatModeration] = useState(true)

  // Withdrawals
  const [minWithdraw, setMinWithdraw] = useState(100)

  // Legal
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [feeYape, setFeeYape] = useState(0)
  const [feePlin, setFeePlin] = useState(0)
  const [feeBCP, setFeeBCP] = useState(5)
  const [feeInterbank, setFeeInterbank] = useState(5)
  const [yapePhone, setYapePhone] = useState('')

  // Populate form when config loads from DB
  useEffect(() => {
    if (!config) return
    setCurrency(config.currency)
    setDefaultPrize(config.defaultPrize)
    setDefaultQuestions(config.defaultQuestions)
    setDefaultTime(config.defaultTime)
    setPushBefore(config.pushBefore)
    setAutoAdvance(config.autoAdvance)
    setAutoCloseRegistration((config as any).autoCloseRegistration ?? true)
    setChatModeration(config.chatModeration)
    setMinWithdraw(config.minWithdraw)
    setTermsAndConditions(config.termsAndConditions ?? '')
    setPrivacyPolicy((config as any).privacyPolicy ?? '')
    setFeeYape(config.feeYape)
    setFeePlin(config.feePlin)
    setFeeBCP(config.feeBCP)
    setFeeInterbank(config.feeInterbank)
    setYapePhone(config.yapePhone ?? '')
  }, [config])

  // Team
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers({ limit: 100 })
  const adminUsers = (usersData?.data ?? []).filter((u) => (u as any).role === 'ADMIN')

  const handleSave = async () => {
    setSaveMsg(''); setSaveErr('')
    try {
      await updateConfig.mutateAsync({
        currency,
        defaultPrize, defaultQuestions, defaultTime, pushBefore, autoAdvance, chatModeration,
        autoCloseRegistration,
        minWithdraw, feeYape, feePlin, feeBCP, feeInterbank,
        yapePhone,
        termsAndConditions,
        privacyPolicy,
      } as any)
      setSaveMsg('✓ Guardado en la base de datos')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err: any) {
      const data = err?.response?.data
      setSaveErr(data?.error ?? data?.message ?? 'Error al guardar.')
    }
  }

  const TABS = [
    { value: 'general', label: 'General' },
    { value: 'games', label: 'Juegos' },
    { value: 'withdrawals', label: 'Retiros' },
    { value: 'moderation', label: 'Moderación' },
    { value: 'legal', label: 'Legal' },
    { value: 'team', label: 'Equipo' },
  ]

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-sub">Parámetros del sistema, juegos, vidas y retiros</p>
        </div>
        <div className="page-actions">
          {saveErr && <span style={{ color: 'var(--red-600)', fontSize: 13 }}>{saveErr}</span>}
          {saveMsg && <span className="save-feedback">{saveMsg}</span>}
          {tab !== 'team' && (
            <Button kind="primary" icon={Save} onClick={handleSave} disabled={updateConfig.isPending || configLoading}>
              {updateConfig.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`tab-btn ${tab === t.value ? 'tab-btn-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <Card>
          <h3 className="section-title">Información general</h3>
          <div style={{ display: 'grid', gap: 0 }}>
            <SettingRow title="Moneda principal" sub="Usada en premios, retiros y cuentas">
              <select className="select" style={{ width: 180 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="PEN">Sol peruano (S/)</option>
                <option value="USD">Dólar (USD)</option>
              </select>
            </SettingRow>
            <SettingRow title="Zona horaria del servidor" sub="Todos los juegos se programan en esta zona">
              <input className="input" style={{ width: 240 }} value="América/Lima (GMT-5)" disabled />
            </SettingRow>
            <SettingRow title="Idioma de la plataforma">
              <select className="select" style={{ width: 180 }}>
                <option>Español (Perú)</option>
              </select>
            </SettingRow>
          </div>
        </Card>
      )}

      {tab === 'games' && (
        <Card>
          <h3 className="section-title">Parámetros por defecto para nuevos juegos</h3>
          <div style={{ display: 'grid', gap: 0 }}>
            <SettingRow title="Premio por defecto" sub="En soles (S/) — puede editarse por juego">
              <input className="input" type="number" style={{ width: 120 }} value={defaultPrize} onChange={(e) => setDefaultPrize(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Número de preguntas" sub="Preguntas por juego — recomendado: 12">
              <input className="input" type="number" style={{ width: 100 }} value={defaultQuestions} onChange={(e) => setDefaultQuestions(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Tiempo por pregunta (segundos)" sub="El jugador tiene este tiempo para responder">
              <input className="input" type="number" style={{ width: 100 }} value={defaultTime} onChange={(e) => setDefaultTime(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Notificación previa (minutos)" sub="Push al jugador antes del inicio del juego">
              <input className="input" type="number" style={{ width: 100 }} value={pushBefore} onChange={(e) => setPushBefore(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Auto-avanzar preguntas" sub="El juego avanza automáticamente sin confirmación del host">
              <Switch checked={autoAdvance} onChange={setAutoAdvance} />
            </SettingRow>
            <SettingRow
              title="Cierre de registro automático"
              sub="Al iniciar el juego, el registro se cierra y las preguntas comienzan inmediatamente. Desactívalo para cerrar el registro manualmente desde el Monitor en vivo."
            >
              <Switch checked={autoCloseRegistration} onChange={setAutoCloseRegistration} />
            </SettingRow>
          </div>
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card>
          <h3 className="section-title">Configuración de retiros</h3>
          <div style={{ display: 'grid', gap: 0 }}>
            <SettingRow title="Número Yape / Plin" sub="Número de teléfono que aparece en la pantalla de pago de la app">
              <input className="input" type="tel" style={{ width: 160 }} placeholder="9XXXXXXXX" value={yapePhone} onChange={(e) => setYapePhone(e.target.value)} />
            </SettingRow>
            <SettingRow title="Retiro mínimo (S/)" sub="Monto mínimo para solicitar retiro">
              <input className="input" type="number" style={{ width: 120 }} value={minWithdraw} onChange={(e) => setMinWithdraw(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Comisión Yape (%)" sub="Porcentaje descontado al pagar vía Yape">
              <input className="input" type="number" style={{ width: 100 }} value={feeYape} onChange={(e) => setFeeYape(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Comisión Plin (%)" sub="Porcentaje descontado al pagar vía Plin">
              <input className="input" type="number" style={{ width: 100 }} value={feePlin} onChange={(e) => setFeePlin(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Comisión BCP (%)" sub="Porcentaje descontado al pagar vía BCP">
              <input className="input" type="number" style={{ width: 100 }} value={feeBCP} onChange={(e) => setFeeBCP(Number(e.target.value))} />
            </SettingRow>
            <SettingRow title="Comisión Interbank (%)" sub="Porcentaje descontado al pagar vía Interbank">
              <input className="input" type="number" style={{ width: 100 }} value={feeInterbank} onChange={(e) => setFeeInterbank(Number(e.target.value))} />
            </SettingRow>
          </div>
        </Card>
      )}

      {tab === 'moderation' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <h3 className="section-title">Moderación de chat</h3>
            <div style={{ display: 'grid', gap: 0 }}>
              <SettingRow title="Activar moderación" sub="Bloquea mensajes que contengan palabras prohibidas">
                <Switch checked={chatModeration} onChange={setChatModeration} />
              </SettingRow>
            </div>
            {(chatModeration !== config?.chatModeration) && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button kind="primary" icon={Save} onClick={handleSave} disabled={updateConfig.isPending}>
                  {updateConfig.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ShieldAlert size={18} style={{ color: 'var(--red-500)' }} />
              <h3 className="section-title" style={{ margin: 0 }}>Palabras prohibidas</h3>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-400)' }}>
                {badWords.length} {badWords.length === 1 ? 'palabra' : 'palabras'}
              </span>
            </div>

            {/* Add word */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="Agregar palabra prohibida…"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
              <Button kind="primary" icon={Plus} onClick={handleAddWord} disabled={addBadWord.isPending || !newWord.trim()}>
                Agregar
              </Button>
            </div>
            {wordError && <div className="alert alert-warn" style={{ marginBottom: 12 }}>{wordError}</div>}

            {/* Word list */}
            {badWordsLoading ? (
              <div style={{ fontSize: 13, color: 'var(--ink-400)', padding: '12px 0' }}>Cargando…</div>
            ) : badWords.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>No hay palabras prohibidas configuradas.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {badWords.map((w) => (
                  <div key={w.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px 4px 12px', borderRadius: 999,
                    background: 'var(--red-50, #fff1f2)',
                    border: '1px solid var(--red-200, #fecdd3)',
                    fontSize: 13, fontWeight: 600, color: 'var(--red-700, #b91c1c)',
                  }}>
                    {w.word}
                    <button
                      onClick={() => deleteBadWord.mutate(w.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--red-400, #f87171)', padding: 0, display: 'flex',
                        opacity: deleteBadWord.isPending ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'legal' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <h3 className="section-title">Términos y condiciones</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16 }}>
              Este texto se muestra en la app móvil durante el registro. El usuario debe confirmar que es mayor de edad y acepta los términos para continuar.
            </p>
            <label className="input-label">Contenido de los términos y condiciones</label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 300, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'vertical', marginTop: 6 }}
              placeholder="Escribe aquí los términos y condiciones completos de la plataforma..."
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
            <span className="input-hint">Markdown es compatible en la app móvil. Guarda los cambios para que la app los lea.</span>
          </Card>
          <Card>
            <h3 className="section-title">Políticas de privacidad</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-500)', marginBottom: 16 }}>
              Este texto se muestra en la app móvil durante el registro, junto a los términos y condiciones.
            </p>
            <label className="input-label">Contenido de las políticas de privacidad</label>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 300, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'vertical', marginTop: 6 }}
              placeholder="Escribe aquí las políticas de privacidad completas de la plataforma..."
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
            />
            <span className="input-hint">Markdown es compatible en la app móvil. Guarda los cambios para que la app los lea.</span>
          </Card>
        </div>
      )}

      {tab === 'team' && (
        <Card noPad={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Equipo administrador</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button kind="ghost" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw size={13} style={usersLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              </Button>
              <Button kind="primary" size="sm" icon={Plus} onClick={() => setShowNewUser(true)}>
                Nuevo usuario
              </Button>
            </div>
          </div>
          {usersLoading ? (
            <div style={{ color: 'var(--ink-400)', fontSize: 13, padding: '12px 0' }}>Cargando…</div>
          ) : adminUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>No hay usuarios admin.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {adminUsers.map((m) => {
                const safeName = String(m.name ?? '?')
                const initials = safeName.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'
                const hue = (safeName.charCodeAt(0) * 37) % 360
                return (
                  <div key={m.email} className="team-row">
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `linear-gradient(135deg, oklch(0.72 0.14 ${hue}), oklch(0.55 0.18 ${hue + 30}))`,
                      display: 'grid', placeItems: 'center', color: 'white',
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>{m.email} · @{(m as any).username}</div>
                    </div>
                    <span className="badge badge-brand">{(m as any).role ?? 'ADMIN'}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>
                      {(m as any).createdAt?.slice(0, 10) ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {showNewUser && <NewUserModal onClose={() => setShowNewUser(false)} onCreated={() => { setShowNewUser(false); refetchUsers() }} />}
    </div>
  )
}
