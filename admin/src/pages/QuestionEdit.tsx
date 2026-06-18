import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, RefreshCw } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useQuestion, useCreateQuestion, useUpdateQuestion } from '../api/hooks'
import type { Question } from '../types'

const LETTERS = ['A', 'B', 'C']

export function QuestionEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === undefined || id === 'new'

  const { data: existing, isLoading, isError } = useQuestion(isNew ? '' : id!)
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()

  const [form, setForm] = useState({
    text: '',
    options: ['', '', ''],
    correct: 0,
    difficulty: 'media' as Question['difficulty'],
    category: 'General',
    suddenDeath: false,
  })
  const [formReady, setFormReady] = useState(isNew)
  const [saveError, setSaveError] = useState('')

  const difficultyFromApi: Record<string, Question['difficulty']> = {
    EASY: 'fácil', MEDIUM: 'media', HARD: 'difícil',
    easy: 'fácil', medium: 'media', hard: 'difícil',
  }

  useEffect(() => {
    if (existing && !formReady) {
      setForm({
        text: existing.text ?? '',
        options: (existing.options ?? ['', '', '']).slice(0, 3),
        correct: (existing as any).correctIndex ?? existing.correct ?? 0,
        difficulty: difficultyFromApi[existing.difficulty] ?? existing.difficulty ?? 'media',
        category: existing.category ?? 'General',
        suddenDeath: (existing as any).suddenDeath ?? false,
      })
      setFormReady(true)
    }
  }, [existing, formReady])

  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const updOpt = (i: number, v: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }))

  const isSaving = createQuestion.isPending || updateQuestion.isPending

  const difficultyToApi: Record<string, string> = {
    'fácil': 'EASY', 'media': 'MEDIUM', 'difícil': 'HARD',
  }

  const buildPayload = () => ({
    text: form.text,
    options: form.options,
    correctIndex: form.correct,
    category: form.category,
    difficulty: difficultyToApi[form.difficulty] ?? form.difficulty.toUpperCase(),
    suddenDeath: form.suddenDeath,
  })

  const handleSave = async () => {
    setSaveError('')
    try {
      const payload = buildPayload()
      if (isNew) {
        await createQuestion.mutateAsync(payload as any)
      } else {
        await updateQuestion.mutateAsync({ id: id!, data: payload as any })
      }
      navigate('/questions')
    } catch (err: any) {
      const data = err?.response?.data
      const detail = data?.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ')
      setSaveError(detail ?? data?.error ?? data?.message ?? 'Error al guardar la pregunta.')
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="fade-in">
        <div className="page-head">
          <h1 className="page-title">Cargando pregunta…</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 32, color: 'var(--ink-500)' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando datos…
        </div>
      </div>
    )
  }

  if (!isNew && isError) {
    return (
      <div className="fade-in">
        <div className="page-head">
          <h1 className="page-title">Error</h1>
          <Button kind="ghost" icon={X} onClick={() => navigate('/questions')}>Volver</Button>
        </div>
        <div className="alert alert-warn">
          API no disponible — no se pudo cargar la pregunta.
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">{isNew ? 'Nueva pregunta' : 'Editar pregunta'}</h1>
          <p className="page-sub">{isNew ? 'Crea una nueva pregunta para el banco' : `Editando ${id}`}</p>
        </div>
        <div className="page-actions">
          <Button kind="ghost" icon={X} onClick={() => navigate('/questions')}>Cancelar</Button>
          <Button kind="primary" icon={Save} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar pregunta'}
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
        <div style={{ display: 'grid', gap: 20 }}>
          <Card>
            <h3 className="section-title">Pregunta y opciones</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <Textarea
                label="Texto de la pregunta"
                placeholder="Ej. ¿Cuál es la capital del Perú?"
                value={form.text}
                onChange={(e) => upd('text', e.target.value)}
                rows={3}
                hint={`${form.text.length} / 180 caracteres`}
              />
              <div>
                <label className="input-label">Opciones (4) · haz clic en la letra para marcar la correcta</label>
                <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                  {form.options.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        type="button"
                        className={`option-selector ${form.correct === i ? 'option-selector-correct' : ''}`}
                        onClick={() => upd('correct', i)}
                      >
                        {LETTERS[i]}
                      </button>
                      <input
                        className={`input ${form.correct === i ? 'input-correct' : ''}`}
                        placeholder={`Opción ${LETTERS[i]}`}
                        value={opt}
                        onChange={(e) => updOpt(i, e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="section-title">Clasificación</h3>
            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Dificultad</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {(['fácil', 'media', 'difícil'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`difficulty-btn ${form.difficulty === d ? `difficulty-btn-${d === 'fácil' ? 'green' : d === 'media' ? 'amber' : 'red'}` : ''}`}
                      onClick={() => upd('difficulty', d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <Select
                label="Categoría"
                value={form.category}
                onChange={(e) => upd('category', e.target.value)}
              >
                {['General', 'Historia', 'Geografía', 'Cultura', 'Gastronomía', 'Deportes', 'Arte', 'Literatura', 'Ciencia', 'Lima', 'Turismo', 'Naturaleza'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </Card>

          <Card>
            <h3 className="section-title">Modalidad</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.suddenDeath ? 'rgba(239,68,68,0.06)' : 'var(--ink-50)', borderRadius: 10, border: `1.5px solid ${form.suddenDeath ? '#ef4444' : 'var(--ink-150)'}`, cursor: 'pointer', transition: 'all .15s' }} onClick={() => upd('suddenDeath', !form.suddenDeath)}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: form.suddenDeath ? '#ef4444' : 'var(--ink-700)' }}>⚡ Muerte súbita</div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>El jugador no puede cambiar su respuesta una vez seleccionada</div>
              </div>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: form.suddenDeath ? '#ef4444' : 'var(--ink-200)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                <div style={{ position: 'absolute', top: 2, left: form.suddenDeath ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: 'white', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card style={{ position: 'sticky', top: 80 }}>
            <h3 className="section-title">Vista previa</h3>
            <div className="question-preview">
              {form.suddenDeath && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                  <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, padding: '3px 10px', borderRadius: 999 }}>⚡ MUERTE SÚBITA</span>
                </div>
              )}
              <div className="question-preview-text">{form.text || 'Texto de la pregunta aparecerá aquí'}</div>
              <div className="question-preview-options">
                {form.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`question-preview-option ${form.correct === i ? 'question-preview-option-correct' : ''}`}
                  >
                    <span className="preview-letter">{LETTERS[i]}</span>
                    <span>{opt || `Opción ${LETTERS[i]}`}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <span className={`badge ${form.difficulty === 'fácil' ? 'badge-green' : form.difficulty === 'media' ? 'badge-amber' : 'badge-red'}`}>
                  {form.difficulty}
                </span>
                <span className="badge badge-brand">{form.category}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
