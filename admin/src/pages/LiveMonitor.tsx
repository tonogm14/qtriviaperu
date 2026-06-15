import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Lock, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { io, Socket } from 'socket.io-client'
import { useGames, useGame } from '../api/hooks'
import { gamesApi } from '../api/client'

function RingCountdown({ seconds, total, urgent, size = 120 }: { seconds: number; total: number; urgent: boolean; size?: number }) {
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? seconds / total : 0
  const off = c * (1 - pct)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" stroke="rgba(255,255,255,0.12)" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          stroke={urgent ? '#FCA5A5' : 'white'}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 200ms' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: size * 0.32, fontWeight: 700,
          color: urgent ? '#FCA5A5' : 'white', lineHeight: 1, letterSpacing: '-0.04em',
          transition: 'color 200ms',
        }}>
          {seconds.toString().padStart(2, '0')}
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          seg
        </div>
      </div>
    </div>
  )
}

function AnswerBar({ letter, text, pct, count, correct, locked }: {
  letter: string; text: string; pct: number; count: number; correct: boolean; locked: boolean
}) {
  return (
    <div className={`answer-bar ${locked && correct ? 'answer-bar-correct' : ''}`}>
      <div className={`answer-letter ${locked && correct ? 'answer-letter-correct' : ''}`}>{letter}</div>
      <div style={{ flex: 1 }}>
        <div className="answer-text">{text || '—'}</div>
        <div className="answer-meter">
          <div
            className={`answer-meter-fill ${locked && correct ? 'answer-meter-fill-correct' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="answer-pct">{pct}%</div>
      <div className="answer-count">{count.toLocaleString('es-PE')}</div>
    </div>
  )
}

function useSocketConnection(gameId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const liveQuestionRef = useRef<any>(null)
  const [connected, setConnected] = useState(false)
  const [socketLog, setSocketLog] = useState<Array<{ time: string; text: string; type: string }>>([])
  const [liveQuestion, setLiveQuestion] = useState<any>(null)
  const [lobbyData, setLobbyData] = useState<any>(null)
  const [waitingHost, setWaitingHost] = useState(false)
  const [readyToFinish, setReadyToFinish] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; user: string; text: string; time: string }>>([])
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Array<{ userId: string; username: string; question: number | string }>>([])
  const [alivePlayers, setAlivePlayers] = useState<Array<{ userId: string; username: string }>>([])
  const [lifeEvents, setLifeEvents] = useState<Array<{ userId: string; username: string; qIdx: number | null; livesLeft: number | null; time: string }>>([])

  const addLog = (text: string, type = 'info') => {
    const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    setSocketLog((prev) => [{ time, text, type }, ...prev].slice(0, 20))
  }

  useEffect(() => {
    if (!gameId) return

    setEliminatedPlayers([])
    setAlivePlayers([])
    setLifeEvents([])

    const socket = io('http://localhost:3002', { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      addLog('Conectado al servidor WebSocket', 'ok')
      socket.emit('join:lobby', { gameId, userId: 'admin' })
    })
    socket.on('disconnect', () => {
      setConnected(false)
      addLog('Desconectado del servidor', 'error')
    })
    socket.on('game:lobby', (data: any) => {
      setLobbyData(data)
      addLog(`Lobby actualizado — ${data?.playerCount ?? '?'} jugadores`, 'ok')
    })
    socket.on('game:question', (data: any) => {
      liveQuestionRef.current = data
      setLiveQuestion(data)
      setWaitingHost(false)
      addLog(`Pregunta ${data?.questionNumber ?? '?'} enviada`, 'q')
    })
    socket.on('game:roster', (data: any) => {
      if (Array.isArray(data?.aliveDetails)) {
        setAlivePlayers(data.aliveDetails)
      }
      if (Array.isArray(data?.eliminatedDetails)) {
        setEliminatedPlayers(
          data.eliminatedDetails.map((p: any) => ({
            userId: p.userId,
            username: p.username,
            question: p.eliminatedAtQ != null ? p.eliminatedAtQ + 1 : '?',
          }))
        )
      }
      if (Array.isArray(data?.lifeEvents)) {
        setLifeEvents(data.lifeEvents.map((ev: any) => ({
          userId: ev.userId ?? '',
          username: ev.username ?? '?',
          qIdx: ev.qIdx ?? null,
          livesLeft: ev.livesLeft ?? null,
          time: ev.createdAt
            ? new Date(ev.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
            : '—',
        })))
      }
      addLog(`Roster cargado — ${data?.aliveDetails?.length ?? 0} vivos, ${data?.eliminatedDetails?.length ?? 0} eliminados`, 'ok')
    })
    socket.on('game:life_used', (data: any) => {
      const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      setLifeEvents((prev) => [...prev, {
        userId: data?.userId ?? '',
        username: data?.username ?? '?',
        qIdx: data?.qIdx ?? null,
        livesLeft: data?.livesLeft ?? null,
        time,
      }])
      addLog(`💚 ${data?.username ?? '?'} usó una vida — le quedan ${data?.livesLeft ?? '?'}`, 'ok')
    })
    socket.on('game:reveal', (data: any) => {
      const qNum = liveQuestionRef.current?.questionNumber ?? '?'
      if (Array.isArray(data?.eliminatedDetails) && data.eliminatedDetails.length > 0) {
        setEliminatedPlayers((prev) => {
          const existing = new Set(prev.map((p) => p.userId))
          const newOnes = (data.eliminatedDetails as Array<{ userId: string; username: string; eliminatedAtQ?: number | null }>)
            .filter((p) => !existing.has(p.userId))
            .map((p) => ({
              userId: p.userId,
              username: p.username,
              question: p.eliminatedAtQ != null ? p.eliminatedAtQ + 1 : qNum,
            }))
          return [...prev, ...newOnes]
        })
      }
      if (Array.isArray(data?.aliveDetails)) {
        setAlivePlayers(data.aliveDetails)
      }
      addLog(`Respuesta revelada — ${data?.eliminatedDetails?.length ?? '?'} eliminados en Q${qNum}`, 'elim')
    })
    socket.on('game:waiting_next', () => {
      setWaitingHost(true)
      addLog('⏸ Esperando al host para continuar', 'info')
    })
    socket.on('game:ready_to_finish', (data: any) => {
      setReadyToFinish(true)
      const msg = data?.reason === 'all_eliminated'
        ? '💀 Todos eliminados — listo para finalizar'
        : '✅ Preguntas completadas — listo para finalizar'
      addLog(msg, 'ok')
    })
    socket.on('lobby:chat', (data: any) => {
      const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, user: data?.user ?? data?.username ?? '?', text: data?.message ?? data?.text ?? '', time },
      ].slice(-50))
      addLog(`Chat: ${data?.message?.slice(0, 40) ?? ''}`, 'chat')
    })
    socket.on('pot:update', (data: any) => {
      addLog(`Pozo actualizado — S/ ${data?.currentPot?.toLocaleString('es-PE') ?? '?'}`, 'ok')
    })
    socket.on('connect_error', () => {
      addLog('Error de conexión al servidor', 'error')
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [gameId])

  const emitNextQuestion = (gId: string) => {
    socketRef.current?.emit('host:next', { gameId: gId })
  }

  const emitEndGame = (gId: string) => {
    socketRef.current?.emit('host:end_game', { gameId: gId })
  }

  return { connected, socketLog, liveQuestion, lobbyData, waitingHost, readyToFinish, chatMessages, eliminatedPlayers, alivePlayers, lifeEvents, emitNextQuestion, emitEndGame }
}

function NoLiveGame() {
  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Monitor en vivo</h1>
          <p className="page-sub">Visualización en tiempo real del juego activo</p>
        </div>
      </div>
      <Card>
        <div className="empty-state" style={{ padding: 48 }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No hay ningún juego en vivo ahora mismo</p>
          <p style={{ color: 'var(--ink-500)' }}>
            El monitor se activará automáticamente cuando un juego pase a estado <strong>En vivo</strong>.
          </p>
        </div>
      </Card>
    </div>
  )
}

export function LiveMonitor() {
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState<'answering' | 'reveal'>('answering')
  const [running, setRunning] = useState(false)
  const [closingReg, setClosingReg] = useState(false)
  const [regClosed, setRegClosed] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: games } = useGames()
  const liveGame = games?.find((g) => g.status === 'LIVE' || g.status === 'envivo') ?? null

  const { data: gameDetail } = useGame(liveGame?.id ?? '')

  const { connected, socketLog, liveQuestion, lobbyData, waitingHost, readyToFinish, chatMessages, eliminatedPlayers, alivePlayers, lifeEvents, emitNextQuestion, emitEndGame } = useSocketConnection(liveGame?.id ?? null)

  const dbQuestions: any[] = (gameDetail as any)?.questions ?? []
  const currentQIdx: number = liveQuestion?.qIdx ?? liveQuestion?.questionIndex ?? -1

  // Sync timer from socket question data
  useEffect(() => {
    if (liveQuestion?.timeLimit) {
      setSeconds(liveQuestion.timeLimit)
      setPhase('answering')
      setRunning(true)
    }
  }, [liveQuestion])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!running || phase !== 'answering') return
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setPhase('reveal')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, phase])

  if (!liveGame) return <NoLiveGame />

  const connectedCount = lobbyData?.playerCount ?? 0
  const aliveCount = alivePlayers.length
  const totalPlayers = aliveCount + eliminatedPlayers.length
  const elimRate = totalPlayers > 0 ? Math.round((eliminatedPlayers.length / totalPlayers) * 100) : 0

  const currentQ = liveQuestion?.text ?? 'Esperando pregunta…'
  const questionNumber = liveQuestion?.questionNumber ?? '—'
  const totalQuestions = liveGame.maxQuestions ?? 12
  const options: string[] = liveQuestion?.options ?? []
  const correctIdx: number = liveQuestion?.correctIndex ?? -1
  const answered: number = liveQuestion?.answeredCount ?? 0
  const answerDist: number[] = liveQuestion?.distribution ?? options.map(() => 0)
  const answerTotal = answerDist.reduce((a, b) => a + b, 0)

  const gameTitle = liveGame.title
  const gamePrize = liveGame.prize
  const gameHost = liveGame.host ?? '—'
  const gameId = liveGame.id

  const registrationOpen = !regClosed && !lobbyData?.isRegistrationClosed && currentQIdx === -1

  async function handleCloseRegistration() {
    if (!gameId || closingReg) return
    setClosingReg(true)
    try {
      await gamesApi.closeRegistration(gameId)
      setRegClosed(true)
    } catch (e: any) {
      alert(e?.response?.data?.error ?? 'Error al cerrar registro')
    } finally {
      setClosingReg(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Badge tone="red" live>EN VIVO</Badge>
            <span className="live-game-id">
              {gameId.slice(0, 8)}… · {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: connected ? 'var(--green-600)' : 'var(--ink-400)' }}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {connected ? 'Socket conectado' : 'Socket desconectado'}
            </span>
          </div>
          <h1 className="page-title">{gameTitle}</h1>
          <p className="page-sub">
            Pregunta {questionNumber} de {totalQuestions} · Premio S/ {gamePrize.toLocaleString('es-PE')} · Host: {gameHost}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {registrationOpen && (
            <button
              onClick={handleCloseRegistration}
              disabled={closingReg}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 10, border: 'none', cursor: closingReg ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg,#EC4899,#A855F7)',
                color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                boxShadow: '0 4px 20px rgba(168,85,247,0.4)',
                opacity: closingReg ? 0.7 : 1,
              }}
            >
              <Lock size={15} />
              {closingReg ? 'Cerrando…' : 'Cerrar registro e iniciar preguntas'}
            </button>
          )}
          {!registrationOpen && currentQIdx === -1 && (
            <span style={{ fontSize: 12, color: 'var(--green-600)', fontWeight: 700 }}>✓ Registro cerrado</span>
          )}
        </div>
      </div>

      {/* Hero + Player roster (6/6) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="live-hero">
          <div className="live-hero-overlay" />
          <div className="live-hero-grid">
            <div>
              <div className="live-q-label">
                Pregunta actual · {String(questionNumber).padStart(2, '0')} / {totalQuestions}
              </div>
              <div className="live-q-text">{currentQ}</div>
              {answered > 0 && aliveCount > 0 && (
                <div className="live-progress-row">
                  <span className="live-progress-text">
                    Han respondido{' '}
                    <strong>{answered.toLocaleString('es-PE')}</strong> de{' '}
                    <strong>{aliveCount.toLocaleString('es-PE')}</strong>{' '}
                    ({Math.round((answered / Math.max(1, aliveCount)) * 100)}%)
                  </span>
                  <div className="live-progress-bar">
                    <div
                      className="live-progress-fill"
                      style={{ width: `${(answered / Math.max(1, aliveCount)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <RingCountdown seconds={seconds} total={liveQuestion?.timeLimit ?? 10} urgent={seconds <= 3 && phase === 'answering'} size={140} />
            </div>
          </div>
        </div>

        {/* Player roster */}
        <Card noPad style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CardHeader
            title="Jugadores"
            sub={`${aliveCount} vivos · ${eliminatedPlayers.length} eliminados`}
          />
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* Alive */}
            <div style={{ borderBottom: '1px solid var(--ink-100)', padding: '8px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green-600)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Vivos</span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  background: 'rgba(16,185,129,0.12)', color: 'var(--green-700)',
                  borderRadius: 4, padding: '1px 6px',
                }}>{aliveCount}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
                {alivePlayers.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Sin datos aún…</span>
                ) : (
                  alivePlayers.map((p) => (
                    <span key={p.userId} style={{
                      fontSize: 12, padding: '2px 8px',
                      background: 'rgba(16,185,129,0.1)', color: 'var(--green-700)',
                      borderRadius: 4, fontWeight: 600,
                    }}>{p.username}</span>
                  ))
                )}
              </div>
            </div>

            {/* Eliminated */}
            <div style={{ padding: '8px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red-600)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Eliminados</span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  background: 'rgba(239,68,68,0.1)', color: 'var(--red-600)',
                  borderRadius: 4, padding: '1px 6px',
                }}>{eliminatedPlayers.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {eliminatedPlayers.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>Ninguno eliminado aún…</span>
                ) : (
                  [...eliminatedPlayers].reverse().map((p) => (
                    <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10, color: 'var(--ink-400)', fontFamily: 'var(--mono)',
                        flexShrink: 0, background: 'var(--ink-100)', borderRadius: 3, padding: '1px 4px',
                      }}>Q{p.question}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-700)', fontWeight: 600 }}>{p.username}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Question list — read-only reference + advance button */}
      {dbQuestions.length > 0 && (
        <Card noPad style={{ marginBottom: 20 }}>
          <CardHeader
            title="Preguntas"
            sub={`${dbQuestions.length} preguntas · el juego avanza automáticamente al presionar el botón`}
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {currentQIdx >= 0 && <Badge tone="brand">Actual: {currentQIdx + 1}</Badge>}
                {waitingHost && (
                  <button
                    onClick={() => emitNextQuestion(gameId)}
                    style={{
                      padding: '6px 16px',
                      background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.35)', whiteSpace: 'nowrap',
                    }}
                  >
                    {currentQIdx < 0 ? '▶ Enviar 1ª pregunta' : `▶ Siguiente (${currentQIdx + 2})`}
                  </button>
                )}
              </div>
            }
          />
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {dbQuestions.map((gq: any, i: number) => {
              const q = gq.question ?? gq
              const isCurrent = i === currentQIdx
              const isPast = i < currentQIdx
              return (
                <div
                  key={i}
                  className={`activity-item ${i < dbQuestions.length - 1 ? 'activity-item-border' : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                    background: isCurrent ? 'rgba(124,58,237,0.06)' : isPast ? 'rgba(0,0,0,0.02)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: isCurrent ? 'var(--brand-600,#7c3aed)' : isPast ? 'var(--ink-200)' : 'var(--ink-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, fontFamily: 'var(--mono)',
                    color: isCurrent ? 'white' : 'var(--ink-500)',
                  }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: isCurrent ? 700 : 500,
                      color: isPast ? 'var(--ink-400)' : 'var(--ink-900)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {q.text}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                      {(q.options ?? []).join(' · ')}
                    </div>
                  </div>
                  {isCurrent && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', flexShrink: 0 }}>EN CURSO</span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Main grid */}
      <div className="live-main-grid" style={{ marginBottom: 20 }}>
        {/* Answers */}
        <Card noPad>
          <CardHeader
            title="Respuestas en tiempo real"
            sub={phase === 'reveal' && correctIdx >= 0 ? `La respuesta correcta es ${'ABCD'[correctIdx]} · ${options[correctIdx] ?? ''}` : 'Esperando datos del socket…'}
            action={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {phase === 'reveal' && <Badge tone="green"><CheckCircle size={11} strokeWidth={2.5} /> Revelado</Badge>}
                {answered > 0 && <span className="cell-mono">{answered.toLocaleString('es-PE')} resp.</span>}
              </div>
            }
          />
          <div style={{ padding: 20, display: 'grid', gap: 10 }}>
            {options.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                Esperando pregunta del socket…
              </div>
            ) : (
              options.map((text, i) => {
                const votes = answerDist[i] ?? 0
                const pct = answerTotal > 0 ? Math.round((votes / answerTotal) * 100) : 0
                return (
                  <AnswerBar
                    key={i}
                    letter={'ABCD'[i]}
                    text={text}
                    pct={pct}
                    count={votes}
                    correct={i === correctIdx}
                    locked={phase === 'reveal'}
                  />
                )
              })
            )}
          </div>
          <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="card-footer-text">
              {waitingHost
                ? '⏸ Esperando que el host avance'
                : phase === 'answering' && seconds > 0
                  ? `Cierra automáticamente en ${seconds}s`
                  : 'Revelando respuesta…'}
            </div>
            {waitingHost && (
              <button
                onClick={() => emitNextQuestion(gameId)}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                }}
              >
                ▶ Siguiente pregunta
              </button>
            )}
          </div>
        </Card>

        {/* Right stats */}
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card>
            <div className="kpi-label">Jugadores vivos</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div className="kpi-value">{aliveCount.toLocaleString('es-PE')}</div>
              {totalPlayers > 0 && aliveCount < totalPlayers && (
                <div style={{ fontSize: 13, color: 'var(--red-600)', fontWeight: 600 }}>
                  −{(totalPlayers - aliveCount).toLocaleString('es-PE')}
                </div>
              )}
            </div>
            {totalPlayers > 0 && (
              <>
                <div className="progress-bar" style={{ marginTop: 12 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${(aliveCount / totalPlayers) * 100}%`, background: 'linear-gradient(90deg, var(--brand-500), #EC4899)' }}
                  />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 8 }}>
                  Eliminación acumulada: <strong style={{ color: 'var(--ink-900)', fontFamily: 'var(--mono)' }}>{elimRate}%</strong>
                </div>
              </>
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card>
              <div className="kpi-label">Conectados</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--ink-900)' }}>
                {connectedCount.toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: 11, color: connected ? 'var(--green-600)' : 'var(--ink-500)', marginTop: 4, fontWeight: 600 }}>
                {connected ? '● WebSocket' : '○ Sin socket'}
              </div>
            </Card>
            <Card>
              <div className="kpi-label">Pozo actual</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, marginTop: 4, color: 'var(--ink-900)' }}>
                S/ {(liveGame.currentPot ?? 0).toLocaleString('es-PE')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>acumulado</div>
            </Card>
          </div>

          {/* System status */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className={`status-dot ${connected ? 'status-dot-green' : 'status-dot-amber'}`} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>Estado del sistema</span>
              <Badge tone={connected ? 'green' : 'amber'} dot>
                {connected ? 'Operativo' : 'Parcial'}
              </Badge>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { name: 'WebSocket', val: connected ? '● Conectado' : '○ Desconectado' },
                { name: 'Juego ID', val: gameId.slice(0, 12) + '…' },
                { name: 'Estado', val: liveGame.status },
              ].map((s) => (
                <div key={s.name} className="system-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      className={`status-dot ${s.name === 'WebSocket' ? (connected ? 'status-dot-green' : 'status-dot-amber') : 'status-dot-green'}`}
                      style={{ width: 6, height: 6 }}
                    />
                    {s.name}
                  </span>
                  <span className="cell-mono">{s.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Finalizar juego — admin must close manually */}
      {readyToFinish && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(236,72,153,0.08))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>🏁 Juego listo para cerrar</div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>
              Ciérralo cuando el host en vivo se haya despedido de los jugadores.
            </div>
          </div>
          <button
            onClick={() => setConfirmFinish(true)}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #EF4444, #EC4899)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
            }}
          >
            Finalizar juego
          </button>

          <Modal
            open={confirmFinish}
            onClose={() => setConfirmFinish(false)}
            title="¿Finalizar el juego?"
            width={420}
            footer={
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button kind="ghost" onClick={() => setConfirmFinish(false)}>Cancelar</Button>
                <Button
                  kind="primary"
                  onClick={() => { setConfirmFinish(false); emitEndGame(gameId) }}
                  style={{ background: 'linear-gradient(135deg, #EF4444, #EC4899)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
                >
                  Sí, finalizar
                </Button>
              </div>
            }
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-700)', lineHeight: 1.5 }}>
                Esta acción cerrará el juego, calculará los ganadores y notificará a todos los jugadores. <strong>No se puede deshacer.</strong>
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-500)' }}>
                Asegúrate de que el host en vivo ya se despidió antes de continuar.
              </p>
            </div>
          </Modal>
        </div>
      )}

      {/* Host control bar */}
      {waitingHost && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-900)' }}>⏸ Juego en pausa</div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>Esperando que el host avance a la siguiente pregunta</div>
          </div>
          <button
            onClick={() => emitNextQuestion(gameId)}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              letterSpacing: '-0.2px',
            }}
          >
            ▶ Siguiente pregunta
          </button>
        </div>
      )}

      {/* Life events log */}
      <Card noPad style={{ marginBottom: 20 }}>
        <CardHeader
          title="Uso de vidas"
          sub={lifeEvents.length === 0 ? 'Sin vidas usadas aún' : `${lifeEvents.length} vida${lifeEvents.length !== 1 ? 's' : ''} usada${lifeEvents.length !== 1 ? 's' : ''} en este juego`}
          action={
            lifeEvents.length > 0 ? (
              <span style={{ fontSize: 12, color: 'var(--ink-500)', fontFamily: 'var(--mono)' }}>
                {lifeEvents.length} 💚
              </span>
            ) : undefined
          }
        />
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {lifeEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>Ningún jugador ha usado vida aún…</div>
          ) : (
            [...lifeEvents].reverse().map((ev, i) => (
              <div key={i} className={`activity-item ${i < lifeEvents.length - 1 ? 'activity-item-border' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="activity-time-badge">{ev.time}</span>
                <span style={{ fontSize: 16 }}>💚</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green-700)', flexShrink: 0 }}>{ev.username}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
                  usó una vida
                  {ev.qIdx != null ? ` en pregunta ${ev.qIdx + 1}` : ''}
                  {ev.livesLeft != null ? ` · le quedan ${ev.livesLeft}` : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Bottom grid: chat + activity log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Chat */}
        <Card noPad>
          <CardHeader
            title="Chat en vivo"
            sub={`${chatMessages.length} mensaje${chatMessages.length !== 1 ? 's' : ''} recibido${chatMessages.length !== 1 ? 's' : ''}`}
          />
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 0' }}>
            {chatMessages.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                Sin mensajes aún…
              </div>
            ) : (
              [...chatMessages].reverse().map((msg) => (
                <div key={msg.id} className="activity-item activity-item-border" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span className="activity-time-badge">{msg.time}</span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-600)', fontSize: 13, flexShrink: 0 }}>{msg.user}</span>
                  <span className="activity-text" style={{ flex: 1 }}>{msg.text}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Activity log */}
        <Card noPad>
          <CardHeader
            title="Log de actividad"
            sub={connected ? 'Eventos en tiempo real (WebSocket)' : 'Sin conexión — esperando socket'}
            action={
              <Badge tone={connected ? 'green' : 'gray'} dot>
                {connected ? 'Socket activo' : 'Sin socket'}
              </Badge>
            }
          />
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {socketLog.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>
                Sin eventos aún. Conectando al socket…
              </div>
            ) : (
              socketLog.map((item, i) => (
                <div key={i} className={`activity-item ${i < socketLog.length - 1 ? 'activity-item-border' : ''}`}>
                  <span className="activity-time-badge">{item.time}</span>
                  <span className="activity-text">{item.text}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
