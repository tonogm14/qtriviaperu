import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, Search, RefreshCw, Repeat2, Heart, Crown, Star, ChevronDown, ChevronUp, Radio, Copy, Tv2, GripVertical, Zap, Key, Trash } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { useGame, useCreateGame, useUpdateGame, useQuestions, useSetGameQuestions, useCreateQuestion, useGameStream, useCreateStream, useDeleteStream, useInviteCodes, useGenerateInviteCodes, useDeleteInviteCode } from '../api/hooks'
import type { InviteCode } from '../api/client'
import type { Question, GameType, WinnerMode, PrizeSlot, PrizeMode } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIFF_FROM_API: Record<string, string> = {
  EASY: 'fácil', MEDIUM: 'media', HARD: 'difícil',
  easy: 'fácil', medium: 'media', hard: 'difícil',
  fácil: 'fácil', media: 'media', difícil: 'difícil',
}
const DIFF_TO_API: Record<string, string> = { fácil: 'EASY', media: 'MEDIUM', difícil: 'HARD' }
const DIFF_TONE = (d: string) => d === 'fácil' ? 'green' : d === 'media' ? 'amber' : 'red'
const LETTERS = ['A', 'B', 'C']

function normalizeQ(raw: any): Question {
  return {
    id: raw.id,
    text: raw.text,
    options: raw.options ?? ['', '', ''],
    correct: raw.correctIndex ?? raw.correct ?? 0,
    difficulty: (DIFF_FROM_API[raw.difficulty] ?? 'media') as Question['difficulty'],
    category: raw.category,
  }
}

function gameTime(scheduledAt?: string, fallback = '21:00'): string {
  if (!scheduledAt) return fallback
  return new Date(scheduledAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
}
function gameDate(scheduledAt?: string): string {
  if (!scheduledAt) return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  return new Date(scheduledAt).toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}

const GAME_TYPES: { value: GameType; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
  { value: 'FREE',    icon: <Heart size={14} />,  label: 'Gratis',   desc: 'Sin costo — cualquier usuario puede unirse libre', color: '#10B981' },
  { value: 'VIP',     icon: <Crown size={14} />,  label: 'VIP',      desc: 'Con precio de entrada — solo quienes paguen participan',       color: '#7C3AED' },
  { value: 'SPECIAL', icon: <Star size={14} />,   label: 'Especial', desc: 'Patrocinado, de temporada o evento único',                     color: '#D97706' },
]

// ─── Inline new-question modal ────────────────────────────────────────────────

function NewQuestionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (q: Question) => void
}) {
  const createQuestion = useCreateQuestion()
  const [form, setForm] = useState({
    text: '',
    options: ['', '', ''],
    correct: 0,
    difficulty: 'media' as Question['difficulty'],
    category: 'General',
  })
  const [error, setError] = useState('')

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))
  const updOpt = (i: number, v: string) =>
    setForm(f => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }))

  const reset = () => {
    setForm({ text: '', options: ['', '', ''], correct: 0, difficulty: 'media', category: 'General' })
    setError('')
  }

  const handleSave = async () => {
    setError('')
    if (!form.text.trim()) { setError('Escribe el texto de la pregunta.'); return }
    if (form.options.some(o => !o.trim())) { setError('Completa las 3 opciones.'); return }
    try {
      const res = await createQuestion.mutateAsync({
        text: form.text,
        options: form.options,
        correct: form.correct,
        difficulty: DIFF_TO_API[form.difficulty] as any,
        category: form.category,
      } as any)
      const created = normalizeQ((res as any).data ?? res)
      onCreated(created)
      reset()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Error al guardar.')
    }
  }

  const diffOpts = [
    { v: 'fácil', label: 'Fácil', tone: 'green' as const },
    { v: 'media', label: 'Media', tone: 'amber' as const },
    { v: 'difícil', label: 'Difícil', tone: 'red' as const },
  ]

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nueva pregunta" width={560}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button kind="primary" onClick={handleSave} disabled={createQuestion.isPending}>
            {createQuestion.isPending ? 'Guardando…' : 'Guardar y agregar'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {error && <div className="alert alert-warn">{error}</div>}

        <Textarea
          label="Texto de la pregunta"
          placeholder="¿Cuál es la capital del Perú?"
          value={form.text}
          onChange={e => upd('text', e.target.value)}
          rows={3}
        />

        <div style={{ display: 'grid', gap: 8 }}>
          <label className="input-label">Opciones — marca la correcta</label>
          {form.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => upd('correct', i)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  border: form.correct === i ? '2px solid #10B981' : '2px solid var(--ink-200)',
                  background: form.correct === i ? '#10B981' : 'transparent',
                  color: form.correct === i ? 'white' : 'var(--ink-500)',
                  fontWeight: 700, fontSize: 12,
                }}
              >
                {LETTERS[i]}
              </button>
              <input
                className="input-field"
                style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 14 }}
                placeholder={`Opción ${LETTERS[i]}`}
                value={opt}
                onChange={e => updOpt(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="form-grid-2">
          <div>
            <label className="input-label">Dificultad</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {diffOpts.map(d => (
                <button key={d.v} type="button"
                  className={`difficulty-btn ${form.difficulty === d.v ? `difficulty-btn-${d.tone === 'green' ? 'green' : d.tone === 'amber' ? 'yellow' : 'red'}` : ''}`}
                  onClick={() => upd('difficulty', d.v as Question['difficulty'])}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Select label="Categoría" value={form.category} onChange={e => upd('category', e.target.value)}>
            <option>General</option><option>Historia</option><option>Gastronomía</option>
            <option>Geografía</option><option>Deportes</option><option>Ciencia</option>
            <option>Arte</option><option>Lima</option><option>Cultura</option>
          </Select>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function GameEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === undefined || id === 'new'

  const { data: existing, isLoading, isError } = useGame(isNew ? '' : id!)
  const createGame = useCreateGame()
  const updateGame = useUpdateGame()
  const setGameQuestions = useSetGameQuestions()
  const { data: streamData, refetch: refetchStream } = useGameStream(isNew ? '' : id!)
  const createStream = useCreateStream()
  const deleteStream = useDeleteStream()
  const { data: inviteCodes = [], refetch: refetchCodes } = useInviteCodes(isNew ? '' : id!)
  const generateCodes = useGenerateInviteCodes()
  const deleteCode = useDeleteInviteCode()
  const [copiedKey, setCopiedKey] = useState<'key' | 'rtmp' | 'url' | null>(null)

  const copyToClipboard = (text: string, field: 'key' | 'rtmp' | 'url') => {
    navigator.clipboard.writeText(text)
    setCopiedKey(field)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const [showArchived, setShowArchived] = useState(false)
  const { data: questionsData, refetch: refetchBank, isLoading: bankLoading } = useQuestions({ limit: 300, archived: showArchived || undefined })
  const bankRaw: any[] = (questionsData as any)?.data ?? []
  const bankQuestions: Question[] = bankRaw.map(normalizeQ)

  const [form, setForm] = useState({
    title: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }),
    time: '21:00',
    recurringTime: '18:00',
    category: 'Mixta',
    prize: 5000,
    questions: 12,
    timePerQuestion: 10,
    host: '',
    entryFee: 0,
    status: 'PENDING',
    streamUrl: '',
  })
  const [winnerMode, setWinnerMode] = useState<WinnerMode>('SINGLE')
  const [prizeSlots, setPrizeSlots] = useState<PrizeSlot[]>([{ place: 1, percent: 100 }])
  const [prizeMode, setPrizeMode] = useState<'FIXED' | 'POT' | 'POT_PERCENT'>('FIXED')
  const [potPercent, setPotPercent] = useState(100)
  const [formReady, setFormReady] = useState(isNew)
  const [saveError, setSaveError] = useState('')
  const [savedOk, setSavedOk] = useState(false)

  const [prizeType, setPrizeType] = useState<'MONETARY' | 'PHYSICAL'>('MONETARY')
  const [prizeTitle, setPrizeTitle] = useState('')
  const [prizeDescription, setPrizeDescription] = useState('')
  const [prizeImage, setPrizeImage] = useState<string | null>(null)
  const [prizeImageFile, setPrizeImageFile] = useState<File | null>(null)
  const [prizeImageUploading, setPrizeImageUploading] = useState(false)
  const [gameTypeState, setGameTypeState] = useState<GameType>('SPECIAL')
  const [emissionMode, setEmissionMode] = useState<'ONCE' | 'DAILY'>('ONCE')
  const gameType = gameTypeState
  const isDaily = emissionMode === 'DAILY'

  const [requiresCode, setRequiresCode] = useState(false)
  const [newCodeLabel, setNewCodeLabel] = useState('')
  const [newCodeEmail, setNewCodeEmail] = useState('')
  const [codeGenError, setCodeGenError] = useState('')

  const [warmUpQuestionId, setWarmUpQuestionId] = useState<string | null>(null)
  const [warmUpQuestion, setWarmUpQuestion] = useState<Question | null>(null)
  const [assignedQuestions, setAssignedQuestions] = useState<Question[]>([])
  const [qSearch, setQSearch] = useState('')
  const [qCategory, setQCategory] = useState('todas')
  const [newQOpen, setNewQOpen] = useState(false)
  const [bankExpanded, setBankExpanded] = useState(true)

  useEffect(() => {
    if (existing && !formReady) {
      setForm({
        title: existing.title ?? '',
        date: gameDate(existing.scheduledAt),
        time: gameTime(existing.scheduledAt),
        recurringTime: existing.recurringTime ?? gameTime(existing.scheduledAt),
        category: existing.category ?? 'Mixta',
        prize: existing.prize ?? 5000,
        questions: existing.maxQuestions ?? 12,
        timePerQuestion: existing.timePerQuestion ?? 10,
        host: existing.host ?? '',
        entryFee: existing.entryFee ?? 0,
        status: existing.status ?? 'PENDING',
        streamUrl: (existing as any).streamUrl ?? '',
      })
      if (existing.questions && existing.questions.length > 0) {
        setAssignedQuestions(existing.questions.map((gq: any) => normalizeQ(gq.question ?? gq)))
      }
      if ((existing as any).warmUpQuestionId) {
        setWarmUpQuestionId((existing as any).warmUpQuestionId)
        const wq = bankRaw.find((q: any) => q.id === (existing as any).warmUpQuestionId)
        if (wq) setWarmUpQuestion(normalizeQ(wq))
      }
      if (existing.winnerMode) setWinnerMode(existing.winnerMode as WinnerMode)
      if (existing.prizeSlots && Array.isArray(existing.prizeSlots)) {
        setPrizeSlots(existing.prizeSlots as PrizeSlot[])
      }
      if (existing.prizeMode) setPrizeMode(existing.prizeMode as 'FIXED' | 'POT' | 'POT_PERCENT')
      if (existing.potPercent != null) setPotPercent(existing.potPercent)
      if ((existing as any).prizeType) setPrizeType((existing as any).prizeType)
      if ((existing as any).prizeTitle) setPrizeTitle((existing as any).prizeTitle)
      if ((existing as any).prizeDescription) setPrizeDescription((existing as any).prizeDescription)
      if ((existing as any).prizeImage) setPrizeImage((existing as any).prizeImage)
      setGameTypeState(existing.type ?? 'SPECIAL')
      const rm = (existing as any).recurringMode
      setEmissionMode(rm === 'DAILY' || rm === 'CONTINUOUS' ? 'DAILY' : 'ONCE')
      setRequiresCode(!!(existing as any).requiresCode)
      setFormReady(true)
    }
  }, [existing, formReady])

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const assignedIds = new Set(assignedQuestions.map(q => q.id))
  const availableQuestions = bankQuestions.filter(q =>
    !assignedIds.has(q.id) &&
    (qCategory === 'todas' || q.category === qCategory) &&
    (qSearch === '' || q.text.toLowerCase().includes(qSearch.toLowerCase()))
  )

  const bankCategories = ['todas', ...Array.from(new Set(bankQuestions.map(q => q.category ?? 'General'))).sort()]

  const addQuestion = (q: Question) => setAssignedQuestions(prev => [...prev, q])
  const removeQuestion = (id: string) => setAssignedQuestions(prev => prev.filter(q => q.id !== id))
  const addAll = () => setAssignedQuestions(prev => [...prev, ...availableQuestions.slice(0, form.questions - prev.length)])

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleDragStart = (i: number) => setDragIdx(i)
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i) }
  const handleDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) return
    setAssignedQuestions(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null) }

  const handleSave = async () => {
    setSaveError('')
    setSavedOk(false)
    if (winnerMode === 'RANKED_SLOTS') {
      const total = prizeSlots.reduce((s, p) => s + p.percent, 0)
      if (Math.abs(total - 100) >= 0.01) {
        setSaveError(`Los porcentajes de plazas deben sumar 100% (actualmente: ${total.toFixed(0)}%).`)
        return
      }
    }
    const payload: any = {
      title: form.title,
      prize: form.prize,
      maxQuestions: form.questions,
      timePerQuestion: form.timePerQuestion,
      host: form.host,
      category: form.category,
      status: form.status,
      winnerMode,
      prizeSlots: winnerMode === 'RANKED_SLOTS' ? prizeSlots : null,
      prizeMode,
      potPercent: prizeMode === 'POT_PERCENT' ? potPercent : 100,
      warmUpQuestionId: warmUpQuestionId ?? null,
      prizeType,
      prizeTitle: prizeType === 'PHYSICAL' ? (prizeTitle.trim() || null) : null,
      prizeDescription: prizeType === 'PHYSICAL' ? (prizeDescription.trim() || null) : null,
      requiresCode,
      type: gameTypeState,
      entryFee: gameType === 'FREE' ? 0 : form.entryFee,
    }
    if (isDaily) {
      payload.recurringMode = 'DAILY'
      payload.recurringTime = form.recurringTime
      payload.scheduledAt = `${form.date}T${form.recurringTime}:00-05:00`
    } else {
      payload.scheduledAt = `${form.date}T${form.time}:00-05:00`
    }
    try {
      let savedId = id!
      if (isNew) {
        const res = await createGame.mutateAsync({ ...payload })
        savedId = (res as any).data?.data?.id ?? (res as any).data?.id ?? savedId
      } else {
        await updateGame.mutateAsync({ id: id!, data: payload })
      }
      if (assignedQuestions.length > 0) {
        await setGameQuestions.mutateAsync({ id: savedId, questionIds: assignedQuestions.map(q => q.id) })
      }
      if (prizeImageFile) {
        setPrizeImageUploading(true)
        const fd = new FormData()
        fd.append('image', prizeImageFile)
        const apiUrl = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3002'
        const token = localStorage.getItem('qtrivia_admin_token')
        const imgRes = await fetch(`${apiUrl}/api/games/${savedId}/prize-image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        const imgData = await imgRes.json()
        if (imgData?.data?.prizeImage) setPrizeImage(imgData.data.prizeImage)
        setPrizeImageFile(null)
        setPrizeImageUploading(false)
      }
      setSavedOk(true)
      setTimeout(() => navigate('/games'), 800)
    } catch (err: any) {
      const data = err?.response?.data
      const detail = data?.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ')
      setSaveError(detail ?? data?.error ?? data?.message ?? 'Error al guardar.')
    }
  }

  const isSaving = createGame.isPending || updateGame.isPending || setGameQuestions.isPending

  if (!isNew && isLoading) {
    return (
      <div className="fade-in">
        <div className="page-head"><div><h1 className="page-title">Cargando juego…</h1></div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 32, color: 'var(--ink-500)' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando datos…
        </div>
      </div>
    )
  }
  if (!isNew && isError) {
    return (
      <div className="fade-in">
        <div className="page-head">
          <div><h1 className="page-title">Error</h1></div>
          <Button kind="ghost" icon={X} onClick={() => navigate('/games')}>Volver</Button>
        </div>
        <div className="alert alert-warn">API no disponible — no se pudo cargar el juego.</div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">{isNew ? 'Crear juego' : `Editar: ${existing?.title ?? ''}`}</h1>
          <p className="page-sub">{isNew ? 'Configura todos los detalles del juego antes de publicarlo' : `ID: ${id}`}</p>
        </div>
        <div className="page-actions">
          <Button kind="ghost" icon={X} onClick={() => navigate('/games')}>Cancelar</Button>
          <Button kind="primary" icon={Save} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando…' : savedOk ? '✓ Guardado' : 'Guardar cambios'}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          {saveError}
          <button onClick={() => setSaveError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

      <div className="edit-layout">
        {/* ── Left column ── */}
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Info */}
          <Card>
            <h3 className="section-title">Tipo de juego</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 4 }}>
              {GAME_TYPES.map(gt => (
                <button key={gt.value} type="button" onClick={() => setGameTypeState(gt.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${gameType === gt.value ? gt.color : 'var(--ink-200)'}`,
                    background: gameType === gt.value ? `${gt.color}10` : 'transparent',
                    transition: 'all .12s',
                  }}
                >
                  <span style={{ color: gt.color }}>{gt.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: gameType === gt.value ? gt.color : 'var(--ink-700)' }}>{gt.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-400)', lineHeight: 1.3 }}>{gt.desc}</span>
                </button>
              ))}
            </div>

            <h3 className="section-title" style={{ marginTop: 20 }}>Información general</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <Input label="Título" placeholder="Ej. Trivia Gratis · 6PM" value={form.title}
                onChange={e => upd('title', e.target.value)} hint="Visible en la app móvil" />

              {/* Emission mode — visible for all game types */}
              <div>
                <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>¿Con qué frecuencia se emite?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { value: 'ONCE' as const,  icon: '🎯', label: 'Una sola vez',   desc: 'Juego puntual en fecha y hora específica' },
                    { value: 'DAILY' as const, icon: '🔄', label: 'Todos los días', desc: 'Se repite automáticamente cada día a la misma hora' },
                  ]).map(m => (
                    <button key={m.value} type="button" onClick={() => setEmissionMode(m.value)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${emissionMode === m.value ? 'var(--brand-500)' : 'var(--ink-200)'}`,
                        background: emissionMode === m.value ? 'var(--brand-50)' : 'transparent',
                        transition: 'all .12s',
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: emissionMode === m.value ? 'var(--brand-700)' : 'var(--ink-700)' }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2, lineHeight: 1.3 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {isDaily ? (
                <div className="form-grid-2">
                  <Input label="Fecha próxima sesión" type="date" value={form.date}
                    onChange={e => upd('date', e.target.value)} hint="El scheduler la actualiza automáticamente cada día" />
                  <Input label="Hora diaria (Lima · GMT-5)" type="time" value={form.recurringTime}
                    onChange={e => upd('recurringTime', e.target.value)} hint="Se emite cada día a esta hora" />
                </div>
              ) : (
                <div className="form-grid-2">
                  <Input label="Fecha" type="date" value={form.date} onChange={e => upd('date', e.target.value)} />
                  <Input label="Hora (Lima · GMT-5)" type="time" value={form.time} onChange={e => upd('time', e.target.value)} />
                </div>
              )}
              <div className="form-grid-2">
                <Select label="Categoría" value={form.category} onChange={e => upd('category', e.target.value)}>
                  <option>Mixta</option><option>Pop</option><option>Historia</option>
                  <option>Gastronomía</option><option>Geografía</option><option>Deportes</option>
                  <option>Ciencia</option><option>Arte</option>
                </Select>
                <Input label="Host / Presentador" value={form.host} onChange={e => upd('host', e.target.value)} />
              </div>
              {/* Stream en vivo (Mux) — solo visible en juegos existentes */}
              {!isNew && (
                <div style={{ border: '1px solid var(--ink-150)', borderRadius: 12, padding: 16, background: 'var(--ink-50)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Tv2 size={15} style={{ color: 'var(--brand-500)' }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-800)' }}>Stream en vivo (Mux)</span>
                    {streamData && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                        ● Activo
                      </span>
                    )}
                  </div>

                  {streamData ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: 0 }}>
                        Abre <strong>Larix Broadcaster</strong> en tu móvil y configura con estos datos:
                      </p>
                      {/* RTMP server */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', marginBottom: 4, letterSpacing: 0.5 }}>SERVIDOR RTMP</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input readOnly value={streamData.rtmpServer} className="input" style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', background: 'var(--ink-100)' }} />
                          <button type="button" className="btn btn-secondary" style={{ flexShrink: 0, gap: 4, display: 'flex', alignItems: 'center', fontSize: 12 }}
                            onClick={() => copyToClipboard(streamData.rtmpServer, 'rtmp')}>
                            <Copy size={12} />{copiedKey === 'rtmp' ? '✓' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                      {/* Stream Key */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', marginBottom: 4, letterSpacing: 0.5 }}>STREAM KEY</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input readOnly value={streamData.streamKey ?? ''} className="input" style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', background: 'var(--ink-100)' }} />
                          <button type="button" className="btn btn-secondary" style={{ flexShrink: 0, gap: 4, display: 'flex', alignItems: 'center', fontSize: 12 }}
                            onClick={() => copyToClipboard(streamData.streamKey ?? '', 'key')}>
                            <Copy size={12} />{copiedKey === 'key' ? '✓' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                      {/* HLS playback URL */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-500)', marginBottom: 4, letterSpacing: 0.5 }}>URL DE REPRODUCCIÓN (HLS — solo lectura)</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input readOnly
                            value={streamData.streamUrl?.startsWith('/') ? `${window.location.origin.replace('5173','3002')}${streamData.streamUrl}` : (streamData.streamUrl ?? '')}
                            className="input" style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', background: 'var(--ink-100)' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>La app móvil la usa automáticamente vía la API.</div>
                      </div>
                      <Button kind="ghost" size="sm"
                        onClick={async () => { await deleteStream.mutateAsync(id!); refetchStream() }}
                        disabled={deleteStream.isPending}>
                        {deleteStream.isPending ? 'Eliminando…' : 'Eliminar stream'}
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: 0 }}>
                        Crea un stream en Mux con un clic. Luego abre <strong>Larix Broadcaster</strong> en tu móvil y pega el servidor RTMP y el stream key que aparecerán aquí.
                      </p>
                      <Button
                        kind="primary"
                        icon={Radio}
                        onClick={async () => {
                          await createStream.mutateAsync(id!)
                          refetchStream()
                        }}
                        disabled={createStream.isPending}
                      >
                        {createStream.isPending ? 'Creando stream…' : 'Crear stream en Mux'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <Select label="Estado" value={form.status} onChange={e => upd('status', e.target.value)}>
                <option value="PENDING">Pendiente</option>
                <option value="LOBBY">Próximo (lobby abierto)</option>
                <option value="LIVE">En vivo</option>
                <option value="FINISHED">Finalizado</option>
                <option value="CANCELLED">Cancelado</option>
              </Select>
            </div>
          </Card>

          {/* Config */}
          <Card>
            <h3 className="section-title">Configuración</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="form-grid-3">
                <Input
                  label="Precio entrada (S/)" type="number"
                  value={gameType === 'FREE' ? 0 : form.entryFee}
                  onChange={e => upd('entryFee', Number(e.target.value))}
                  disabled={gameType === 'FREE'}
                  hint={gameType === 'FREE' ? 'Gratis — fijo' : '0 = acceso libre'}
                />
                <Input label="Seg/pregunta" type="number" min={5} max={60} value={form.timePerQuestion}
                  onChange={e => upd('timePerQuestion', Number(e.target.value))} />
              </div>
              <Input label="Máximo de preguntas" type="number" value={form.questions}
                onChange={e => upd('questions', Number(e.target.value))} />
            </div>
          </Card>

          {/* Winner mode */}
          <Card>
            <h3 className="section-title">Premio y ganadores</h3>
            <div style={{ display: 'grid', gap: 16 }}>

              {/* ── Tipo de premio ── */}
              <div>
                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Tipo de premio</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { value: 'MONETARY' as const, icon: '💰', label: 'Monetario', desc: 'Efectivo o depósito (S/)' },
                    { value: 'PHYSICAL' as const, icon: '🎁', label: 'Premio físico', desc: 'Objeto, producto o experiencia' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPrizeType(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${prizeType === opt.value ? 'var(--brand-500,#7C3AED)' : 'var(--ink-200)'}`,
                        background: prizeType === opt.value ? 'var(--brand-50,#f5f3ff)' : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-800)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Premio físico: detalle ── */}
              {prizeType === 'PHYSICAL' && (
                <div style={{ display: 'grid', gap: 12, padding: 14, borderRadius: 12, background: 'var(--brand-50,#f5f3ff)', border: '1.5px solid var(--brand-200,#ddd6fe)' }}>
                  <Input
                    label="Título del premio *"
                    placeholder='Ej: "iPhone 16 Pro 128 GB"'
                    value={prizeTitle}
                    onChange={e => setPrizeTitle(e.target.value)}
                  />
                  <Textarea
                    label="Descripción"
                    placeholder='Ej: "Color Titanio Natural, desbloqueado, incluye cargador…"'
                    value={prizeDescription}
                    onChange={e => setPrizeDescription(e.target.value)}
                    rows={3}
                  />
                  <div>
                    <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>Imagen del premio</label>
                    {(prizeImage || prizeImageFile) && (
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
                        <img
                          src={prizeImageFile ? URL.createObjectURL(prizeImageFile) : `${(import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3002'}${prizeImage}`}
                          alt="Premio"
                          style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12, border: '1.5px solid var(--ink-200)' }}
                        />
                        <button
                          type="button"
                          onClick={() => { setPrizeImage(null); setPrizeImageFile(null) }}
                          style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    )}
                    <label style={{ display: 'inline-block', cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={e => { const file = e.target.files?.[0]; if (file) setPrizeImageFile(file) }}
                      />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px dashed var(--ink-300)', fontSize: 13, color: 'var(--ink-600)', cursor: 'pointer' }}>
                        📷 {prizeImageFile ? prizeImageFile.name : 'Seleccionar imagen'}
                      </span>
                    </label>
                    <p style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 6 }}>JPEG, PNG, WebP o GIF · máx. 5 MB · Se sube al guardar</p>
                    {prizeImageUploading && <p style={{ fontSize: 12, color: 'var(--brand-500)', marginTop: 6 }}>⏳ Subiendo imagen…</p>}
                  </div>
                </div>
              )}

              {/* ── Fuente del premio (solo monetario) ── */}
              {prizeType === 'MONETARY' && <div>
                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Fuente del premio</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {([
                    { value: 'FIXED' as const, label: 'Monto fijo', desc: 'El premio es el valor ingresado en el campo "Premio (S/)" y no depende de cuántos jugadores participen.', vipOnly: false },
                    { value: 'POT' as const, label: 'Bote (100% de las entradas)', desc: 'El premio es todo lo recaudado con las entradas de los jugadores VIP. Solo aplica a juegos VIP con entrada paga.', vipOnly: true },
                    { value: 'POT_PERCENT' as const, label: '% del bote', desc: 'Un porcentaje del bote recaudado se convierte en el premio. Solo aplica a juegos VIP con entrada paga.', vipOnly: true },
                  ]).map(opt => {
                    const disabled = opt.vipOnly && form.entryFee === 0
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setPrizeMode(opt.value as PrizeMode)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '12px 14px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                          opacity: disabled ? 0.4 : 1,
                          border: `2px solid ${prizeMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'var(--ink-200)'}`,
                          background: prizeMode === opt.value ? 'var(--brand-50,#f5f3ff)' : 'transparent',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                          border: `2px solid ${prizeMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'var(--ink-300)'}`,
                          background: prizeMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'transparent',
                        }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-800)' }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>{opt.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {prizeMode === 'POT_PERCENT' && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label className="input-label" style={{ minWidth: 140 }}>% del bote al premio</label>
                    <input
                      type="number" min={1} max={100} step={1}
                      value={potPercent}
                      onChange={e => setPotPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                      style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--ink-200)', fontSize: 14, fontWeight: 600, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 13, color: 'var(--ink-500)' }}>%</span>
                  </div>
                )}
                {prizeMode === 'FIXED' && (
                  <div style={{ marginTop: 12 }}>
                    <Input label="Premio fijo (S/)" type="number" value={form.prize} onChange={e => upd('prize', Number(e.target.value))} />
                  </div>
                )}
              </div>}

              <div>
                <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Tipo de ganadores</label>
                <div style={{ display: 'grid', gap: 8 }}>
                  {([
                    { value: 'SINGLE', label: 'Un solo ganador', desc: 'El jugador con mayor puntaje (y menor tiempo en caso de empate) gana el premio completo.' },
                    { value: 'ALL_CORRECT', label: 'Todos los que completen ganan', desc: 'Todos los jugadores que respondan correctamente todas las preguntas se reparten el premio en partes iguales.' },
                    { value: 'RANKED_SLOTS', label: 'Por plazas con ranking de tiempo', desc: 'Los jugadores que completen todas las preguntas se ranquean por velocidad. Cada plaza recibe un % del premio.' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setWinnerMode(opt.value)
                        if (opt.value === 'RANKED_SLOTS' && prizeSlots.length === 0) {
                          setPrizeSlots([{ place: 1, percent: 60 }, { place: 2, percent: 30 }, { place: 3, percent: 10 }])
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${winnerMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'var(--ink-200)'}`,
                        background: winnerMode === opt.value ? 'var(--brand-50,#f5f3ff)' : 'transparent',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        border: `2px solid ${winnerMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'var(--ink-300)'}`,
                        background: winnerMode === opt.value ? 'var(--brand-500,#7C3AED)' : 'transparent',
                      }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-800)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {winnerMode === 'RANKED_SLOTS' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label className="input-label">Distribución de plazas</label>
                    {(() => {
                      const total = prizeSlots.reduce((s, p) => s + p.percent, 0)
                      return (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: Math.abs(total - 100) < 0.01 ? 'var(--green-600,#16a34a)' : 'var(--red-600,#dc2626)',
                        }}>
                          Total: {total.toFixed(0)}%
                        </span>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {prizeSlots.map((slot, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: i === 0 ? '#F59E0B' : i === 1 ? 'var(--ink-300)' : i === 2 ? '#CD7F32' : 'var(--ink-200)',
                          color: 'white', fontWeight: 700, fontSize: 12,
                          display: 'grid', placeItems: 'center',
                        }}>
                          {slot.place}
                        </div>
                        <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-600)', fontWeight: 500 }}>
                          {slot.place === 1 ? '1er lugar' : slot.place === 2 ? '2do lugar' : slot.place === 3 ? '3er lugar' : `${slot.place}to lugar`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={slot.percent}
                            onChange={e => {
                              const v = Math.max(0, Math.min(100, Number(e.target.value)))
                              setPrizeSlots(prev => prev.map((s, idx) => idx === i ? { ...s, percent: v } : s))
                            }}
                            style={{
                              width: 70, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--ink-200)',
                              fontSize: 14, fontWeight: 600, textAlign: 'right',
                            }}
                          />
                          <span style={{ fontSize: 13, color: 'var(--ink-500)', width: 14 }}>%</span>
                        </div>
                        {prizeSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPrizeSlots(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, place: idx + 1 })))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrizeSlots(prev => [...prev, { place: prev.length + 1, percent: 0 }])}
                    style={{
                      marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                      background: 'none', border: '1.5px dashed var(--ink-300)', borderRadius: 8,
                      padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--ink-500)', width: '100%',
                    }}
                  >
                    <Plus size={13} /> Agregar plaza
                  </button>
                  {(() => {
                    const total = prizeSlots.reduce((s, p) => s + p.percent, 0)
                    if (Math.abs(total - 100) >= 0.01) {
                      return (
                        <div className="alert alert-warn" style={{ marginTop: 10, fontSize: 12 }}>
                          Los porcentajes deben sumar exactamente 100%. Actualmente suman {total.toFixed(0)}%.
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
          </Card>

          {/* Warmup question */}
          <Card>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🧪 Pregunta de prueba
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-400)', background: 'var(--ink-100)', padding: '2px 8px', borderRadius: 999 }}>
                no elimina · solo feedback
              </span>
            </h3>
            <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: '0 0 12px' }}>
              Se envía antes de las preguntas reales para verificar presencia. Los jugadores ven verde/rojo pero nadie es eliminado.
            </p>
            {warmUpQuestion ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--ink-50)', borderRadius: 10, border: '1.5px solid var(--brand-200, #ddd6fe)' }}>
                <span style={{ fontSize: 18 }}>🧪</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink-800)' }}>{warmUpQuestion.text}</span>
                <Badge tone={DIFF_TONE(warmUpQuestion.difficulty ?? 'media') as any}>{warmUpQuestion.difficulty}</Badge>
                <button className="icon-btn" title="Quitar pregunta de prueba" onClick={() => { setWarmUpQuestionId(null); setWarmUpQuestion(null) }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {bankQuestions.slice(0, 20).map(q => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => { setWarmUpQuestionId(q.id); setWarmUpQuestion(q) }}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--ink-200)',
                      background: 'var(--ink-50)', cursor: 'pointer', fontSize: 12,
                      color: 'var(--ink-700)', textAlign: 'left', maxWidth: 300,
                    }}
                  >
                    {q.text.slice(0, 60)}{q.text.length > 60 ? '…' : ''}
                  </button>
                ))}
                {bankQuestions.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0 }}>Agrega preguntas al banco para poder seleccionar una de prueba.</p>
                )}
              </div>
            )}
          </Card>

          {/* Assigned questions */}
          <Card noPad>
            <CardHeader
              title="Preguntas asignadas"
              sub={`${assignedQuestions.length} / ${form.questions}`}
              action={
                <Badge tone={assignedQuestions.length >= form.questions ? 'green' : 'amber'}>
                  {assignedQuestions.length >= form.questions ? 'Listo' : `Faltan ${form.questions - assignedQuestions.length}`}
                </Badge>
              }
            />
            <div style={{ padding: 16, display: 'grid', gap: 8 }}>
              {assignedQuestions.length === 0 && (
                <div className="empty-state"><p>Sin preguntas asignadas. Agrégalas desde el banco o crea una nueva.</p></div>
              )}
              {assignedQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="assigned-question-row"
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  style={{
                    opacity: dragIdx === i ? 0.4 : 1,
                    borderTop: dragOverIdx === i && dragIdx !== i ? '2px solid var(--brand-500, #7C3AED)' : undefined,
                    cursor: 'grab',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <GripVertical size={13} style={{ color: 'var(--ink-300)', flexShrink: 0, cursor: 'grab' }} />
                  <span className="q-number">{String(i + 1).padStart(2, '0')}</span>
                  <span className="q-text">{q.text}</span>
                  <Badge tone={DIFF_TONE(q.difficulty ?? 'media') as any}>{q.difficulty}</Badge>
                  <button className="icon-btn" onClick={() => removeQuestion(q.id)} title="Quitar">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Invite codes ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Key size={15} style={{ color: 'var(--brand-500)' }} />
              <h3 className="section-title" style={{ margin: 0 }}>Acceso por código</h3>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>Requerir código</span>
                <button type="button" onClick={() => setRequiresCode(v => !v)} style={{
                  width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: requiresCode ? 'var(--brand-500)' : 'var(--ink-200)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <span style={{
                    position: 'absolute', top: 3, left: requiresCode ? 20 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>

            {requiresCode ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--ink-500)', margin: 0 }}>
                  Genera un código único por invitado. Solo quienes tengan un código válido podrán unirse a este juego.
                </p>

                {/* Generate form */}
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Nombre del invitado (opcional)"
                      value={newCodeLabel}
                      onChange={e => setNewCodeLabel(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13 }}
                    />
                    <input
                      className="input"
                      placeholder="Email del comprador (auto-acceso)"
                      value={newCodeEmail}
                      onChange={e => { setNewCodeEmail(e.target.value); setCodeGenError('') }}
                      style={{ flex: 1.2, padding: '8px 12px', border: '1.5px solid var(--ink-200)', borderRadius: 8, fontSize: 13 }}
                      type="email"
                    />
                    <Button kind="primary" size="sm" icon={Plus}
                      disabled={isNew || generateCodes.isPending}
                      onClick={async () => {
                        if (!id) return
                        setCodeGenError('')
                        try {
                          await generateCodes.mutateAsync({
                            id,
                            data: {
                              count: 1,
                              label: newCodeLabel.trim() || undefined,
                              userEmail: newCodeEmail.trim() || undefined,
                            },
                          })
                          setNewCodeLabel('')
                          setNewCodeEmail('')
                        } catch (e: any) {
                          setCodeGenError(e?.response?.data?.error ?? 'Error al generar código.')
                        }
                      }}
                    >
                      {isNew ? 'Guarda primero' : 'Generar código'}
                    </Button>
                  </div>
                  {newCodeEmail.trim() && (
                    <p style={{ fontSize: 11, color: 'var(--brand-600)', margin: 0 }}>
                      ⚡ Con email: el usuario será inscrito automáticamente al juego sin necesidad de ingresar el código.
                    </p>
                  )}
                  {codeGenError && <p style={{ fontSize: 12, color: 'var(--red-500,#ef4444)', margin: 0 }}>{codeGenError}</p>}
                </div>

                {/* Codes list */}
                {(inviteCodes as InviteCode[]).length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--ink-400)', textAlign: 'center', padding: '12px 0' }}>
                    No hay códigos generados aún.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {(inviteCodes as InviteCode[]).map(c => (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                        background: c.usedById ? 'var(--ink-50)' : 'white',
                        border: '1.5px solid', borderRadius: 8,
                        borderColor: c.usedById ? 'var(--ink-150)' : 'var(--brand-200)',
                      }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, letterSpacing: 1, color: c.usedById ? 'var(--ink-400)' : 'var(--ink-800)' }}>
                          {c.code}
                        </span>
                        {c.label && <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>· {c.label}</span>}
                        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                          color: c.usedById ? '#10B981' : 'var(--ink-400)',
                          background: c.usedById ? 'rgba(16,185,129,0.08)' : 'transparent',
                          padding: c.usedById ? '2px 8px' : '0', borderRadius: 999,
                        }}>
                          {c.usedById ? `✓ usado por @${c.usedByUsername ?? c.usedById}` : 'disponible'}
                        </span>
                        <button type="button"
                          disabled={!!c.usedById || deleteCode.isPending}
                          onClick={() => id && deleteCode.mutate({ gameId: id, codeId: c.id })}
                          style={{ background: 'none', border: 'none', cursor: c.usedById ? 'default' : 'pointer', color: c.usedById ? 'var(--ink-200)' : 'var(--red-500,#ef4444)', padding: 4 }}
                          title={c.usedById ? 'No se puede eliminar (ya fue usado)' : 'Eliminar código'}
                        >
                          <Trash size={13} />
                        </button>
                        <button type="button"
                          onClick={() => navigator.clipboard.writeText(c.code)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: 4 }}
                          title="Copiar código"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--ink-400)', margin: 0 }}>
                Acceso libre — cualquier usuario puede unirse sin código. Activa la opción para habilitar códigos de invitación individuales.
              </p>
            )}
          </Card>
        </div>

        {/* ── Right column: bank ── */}
        <div>
          <Card noPad style={{ position: 'sticky', top: 80 }}>
            {/* Bank header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ink-150)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-800)' }}>Banco de preguntas</div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
                  {bankQuestions.length} preguntas disponibles
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchived(v => !v)}
                title={showArchived ? 'Ver activas' : 'Ver archivadas'}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--ink-200)',
                  background: showArchived ? 'var(--amber-50,#fffbeb)' : 'transparent',
                  color: showArchived ? 'var(--amber-600,#d97706)' : 'var(--ink-400)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {showArchived ? '📦 Archivadas' : '📦'}
              </button>
              <Button kind="primary" size="sm" icon={Plus} onClick={() => setNewQOpen(true)}>Nueva</Button>
              <button className="icon-btn" onClick={() => setBankExpanded(v => !v)} title="Colapsar">
                {bankExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {bankExpanded && (
              <>
                {/* Search + filter */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--ink-150)', display: 'grid', gap: 8 }}>
                  <div className="search-bar">
                    <Search size={14} />
                    <input placeholder="Buscar…" value={qSearch} onChange={e => setQSearch(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {bankCategories.map(cat => (
                      <button key={cat} onClick={() => setQCategory(cat)}
                        style={{
                          padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          background: qCategory === cat ? 'var(--brand-100,#ede9fe)' : 'var(--ink-100)',
                          color: qCategory === cat ? 'var(--brand-700,#6d28d9)' : 'var(--ink-500)',
                        }}
                      >
                        {cat === 'todas' ? 'Todas' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 420, overflowY: 'auto', padding: 10, display: 'grid', gap: 6 }}>
                  {bankLoading && (
                    <div className="empty-state">
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginBottom: 6 }} />
                      <p>Cargando preguntas…</p>
                    </div>
                  )}
                  {!bankLoading && availableQuestions.length === 0 && (
                    <div className="empty-state">
                      <p>{bankQuestions.length === 0 ? 'No hay preguntas en el banco. Crea la primera.' : 'No hay preguntas con ese filtro.'}</p>
                    </div>
                  )}
                  {!bankLoading && availableQuestions.slice(0, 30).map(q => (
                    <div key={q.id} className="bank-question-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bank-question-text">{q.text}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>{q.category}</div>
                      </div>
                      <div className="bank-question-meta">
                        <Badge tone={DIFF_TONE(q.difficulty ?? 'media') as any}>{q.difficulty}</Badge>
                        <button className="icon-btn" onClick={() => addQuestion(q)} title="Agregar">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                {availableQuestions.length > 0 && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--ink-150)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{availableQuestions.length} disponibles</span>
                    <Button kind="ghost" size="sm" onClick={addAll} disabled={assignedQuestions.length >= form.questions}>
                      Agregar todas
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <NewQuestionModal
        open={newQOpen}
        onClose={() => setNewQOpen(false)}
        onCreated={(q) => {
          refetchBank()
          addQuestion(q)
        }}
      />
    </div>
  )
}
