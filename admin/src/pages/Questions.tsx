import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, GripVertical, Search, RefreshCw } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button, IconButton } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from '../api/hooks'
import type { Question } from '../types'

function QuestionEditorModal({
  question,
  onSave,
  onCancel,
  isSaving,
}: {
  question: Question | null
  onSave: (q: Omit<Question, 'id' | 'createdAt'>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState({
    text: question?.text ?? '',
    options: question?.options ?? ['', '', ''],
    correct: question?.correct ?? 0,
    difficulty: question?.difficulty ?? 'media' as Question['difficulty'],
    category: question?.category ?? 'General',
  })
  const upd = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const updOpt = (i: number, v: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? v : o)) }))

  const LETTERS = ['A', 'B', 'C']
  const difficultyOptions = [
    { v: 'fácil', label: 'Fácil', tone: 'green' as const },
    { v: 'media', label: 'Media', tone: 'amber' as const },
    { v: 'difícil', label: 'Difícil', tone: 'red' as const },
  ]

  return (
    <Modal
      open
      onClose={onCancel}
      title={question ? 'Editar pregunta' : 'Nueva pregunta'}
      width={640}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button kind="ghost" onClick={onCancel}>Cancelar</Button>
          <Button kind="primary" onClick={() => onSave(form)} disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <Textarea
          label="Texto de la pregunta"
          placeholder="Ej. ¿Cuál es la capital del Perú?"
          value={form.text}
          onChange={(e) => upd('text', e.target.value)}
          rows={2}
          hint={`${form.text.length} / 180 caracteres · evita preguntas con respuestas ambiguas`}
        />

        <div>
          <label className="input-label">Opciones (4) · marca la correcta</label>
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className={`option-selector ${form.correct === i ? 'option-selector-correct' : ''}`}
                  onClick={() => upd('correct', i)}
                  type="button"
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

        <div className="form-grid-2">
          <div className="input-group">
            <label className="input-label">Dificultad</label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {difficultyOptions.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  className={`difficulty-btn ${form.difficulty === d.v ? `difficulty-btn-${d.tone}` : ''}`}
                  onClick={() => upd('difficulty', d.v as Question['difficulty'])}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Select
            label="Categoría"
            value={form.category}
            onChange={(e) => upd('category', e.target.value)}
          >
            <option>General</option>
            <option>Historia</option>
            <option>Geografía</option>
            <option>Cultura</option>
            <option>Gastronomía</option>
            <option>Deportes</option>
            <option>Arte</option>
            <option>Literatura</option>
            <option>Ciencia</option>
            <option>Lima</option>
            <option>Turismo</option>
            <option>Naturaleza</option>
          </Select>
        </div>

        {/* Live preview */}
        <div className="question-preview">
          <div className="question-preview-label">Vista previa</div>
          <div className="question-preview-text">{form.text || 'Texto de la pregunta'}</div>
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
        </div>
      </div>
    </Modal>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} style={{ opacity: 0.5 }}>
          <td style={{ width: 40 }}><div style={{ width: 14, height: 14, background: 'var(--ink-150)', borderRadius: 2 }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: '75%', marginBottom: 6 }} /><div style={{ height: 10, background: 'var(--ink-100)', borderRadius: 4, width: '50%' }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 70 }} /></td>
          <td><div style={{ height: 20, background: 'var(--ink-150)', borderRadius: 10, width: 55 }} /></td>
          <td style={{ textAlign: 'right' }}><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 30, marginLeft: 'auto' }} /></td>
          <td><div style={{ height: 13, background: 'var(--ink-150)', borderRadius: 4, width: 60 }} /></td>
          <td />
        </tr>
      ))}
    </>
  )
}

export function Questions() {
  const [editing, setEditing] = useState<Question | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('todos')
  const [page, setPage] = useState(1)
  const [mutError, setMutError] = useState('')
  const PER_PAGE = 10

  const dragIdx = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const difficultyToApi: Record<string, string> = { 'fácil': 'EASY', 'media': 'MEDIUM', 'difícil': 'HARD' }

  const queryParams = {
    search: search || undefined,
    difficulty: difficulty !== 'todos' ? (difficultyToApi[difficulty] ?? difficulty) : undefined,
    page,
    limit: PER_PAGE,
  }

  const { data, isLoading, isError, refetch } = useQuestions(queryParams)
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()
  const deleteQuestion = useDeleteQuestion()

  const questions: Question[] = data?.data ?? []
  const total = data?.total ?? questions.length

  const totalPages = Math.ceil(total / PER_PAGE)

  const isSaving = createQuestion.isPending || updateQuestion.isPending

  const difficultyEnumMap: Record<string, string> = { 'fácil': 'EASY', 'media': 'MEDIUM', 'difícil': 'HARD' }

  const buildPayload = (q: Omit<Question, 'id' | 'createdAt'>) => ({
    text: q.text,
    options: q.options,
    correctIndex: q.correct,
    category: q.category,
    difficulty: difficultyEnumMap[q.difficulty] ?? q.difficulty.toUpperCase(),
  })

  const handleSave = async (q: Omit<Question, 'id' | 'createdAt'>) => {
    setMutError('')
    try {
      const payload = buildPayload(q)
      if (editing === 'new') {
        await createQuestion.mutateAsync(payload as any)
      } else if (editing) {
        await updateQuestion.mutateAsync({ id: editing.id, data: payload as any })
      }
      setEditing(null)
    } catch (err: any) {
      const data = err?.response?.data
      const detail = data?.details?.map((d: any) => `${d.field}: ${d.message}`).join(', ')
      setMutError(detail ?? data?.error ?? data?.message ?? 'Error al guardar la pregunta.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return
    setMutError('')
    try {
      await deleteQuestion.mutateAsync(id)
    } catch (err: any) {
      setMutError(err?.response?.data?.message ?? 'Error al eliminar.')
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Preguntas</h1>
          <p className="page-sub">{total} preguntas en el banco</p>
        </div>
        <div className="page-actions">
          <Button kind="primary" icon={Plus} onClick={() => setEditing('new')}>Nueva pregunta</Button>
        </div>
      </div>

      {mutError && (
        <div className="alert alert-warn" style={{ marginBottom: 12 }}>
          {mutError}
          <button onClick={() => setMutError('')} style={{ marginLeft: 8, fontWeight: 700 }}>×</button>
        </div>
      )}

      {isError && (
        <div style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            API no disponible — no se pudieron cargar las preguntas.
          </div>
          <Button kind="secondary" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      <Card noPad>
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={14} />
            <input
              placeholder="Buscar pregunta…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="filter-tabs">
            {['todos', 'fácil', 'media', 'difícil'].map((d) => (
              <button
                key={d}
                className={`filter-tab ${difficulty === d ? 'filter-tab-active' : ''}`}
                onClick={() => { setDifficulty(d); setPage(1) }}
              >
                {d === 'todos' ? 'Todos' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <IconButton title="Recargar" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </IconButton>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Pregunta</th>
              <th>Categoría</th>
              <th>Dificultad</th>
              <th style={{ textAlign: 'right' }}>Tiempo</th>
              <th>Creada</th>
              <th style={{ width: 1 }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton />}
            {!isLoading && !isError && questions.map((q, i) => {
              const realIdx = (page - 1) * PER_PAGE + i
              const diffTone = q.difficulty === 'fácil' || q.difficulty === 'easy' ? 'green' : q.difficulty === 'media' || q.difficulty === 'medium' ? 'amber' : 'red'
              return (
                <tr
                  key={q.id}
                  draggable
                  style={{
                    opacity: draggingIdx === realIdx ? 0.45 : 1,
                    background: overIdx === realIdx && draggingIdx !== realIdx
                      ? 'var(--brand-50)' : undefined,
                  }}
                  onDragStart={() => { dragIdx.current = realIdx; setDraggingIdx(realIdx) }}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(realIdx) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    dragIdx.current = null; setOverIdx(null); setDraggingIdx(null)
                  }}
                  onDragEnd={() => { dragIdx.current = null; setOverIdx(null); setDraggingIdx(null) }}
                >
                  <td style={{ cursor: 'grab', color: 'var(--ink-400)' }}>
                    <GripVertical size={14} />
                  </td>
                  <td>
                    <div className="cell-strong" style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.text}
                    </div>
                    <div className="cell-meta">
                      {q.options.map((o, oi) => (
                        <span key={oi} className={`option-chip ${oi === q.correct ? 'option-chip-correct' : ''}`}>
                          {o}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Badge tone="brand">{q.category ?? 'General'}</Badge>
                  </td>
                  <td>
                    <Badge tone={diffTone}>{q.difficulty}</Badge>
                  </td>
                  <td className="cell-mono" style={{ textAlign: 'right' }}>{q.timeLimit}s</td>
                  <td className="cell-muted">{q.createdAt?.slice(0, 10) ?? '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <IconButton onClick={() => setEditing(q)} title="Editar">
                        <Pencil size={13} />
                      </IconButton>
<IconButton
                        title="Eliminar"
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="table-pagination">
          <span>
            {total > 0
              ? `Mostrando ${Math.min((page - 1) * PER_PAGE + 1, total)}–${Math.min(page * PER_PAGE, total)} de ${total}`
              : 'Sin resultados'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button kind="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button kind="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      {editing !== null && (
        <QuestionEditorModal
          question={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
