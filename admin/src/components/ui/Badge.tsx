import React from 'react'

type BadgeTone = 'green' | 'amber' | 'red' | 'blue' | 'brand' | 'gray'

interface BadgeProps {
  tone?: BadgeTone
  live?: boolean
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  blue: 'badge-blue',
  brand: 'badge-brand',
  gray: 'badge-gray',
}

export function Badge({ tone = 'gray', live = false, dot = false, children, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${toneClasses[tone]} ${live ? 'badge-live' : ''} ${className}`}>
      {(dot || live) && <span className="badge-dot" />}
      {children}
    </span>
  )
}

type GameStatus = 'borrador' | 'programado' | 'proximo' | 'envivo' | 'finalizado' | 'cancelado'

interface StatusBadgeProps {
  status: GameStatus | string
}

const STATUS_MAP: Record<string, { tone: BadgeTone; label: string; live?: boolean }> = {
  proximo: { tone: 'amber', label: 'Próximo' },
  envivo: { tone: 'red', label: 'EN VIVO', live: true },
  finalizado: { tone: 'gray', label: 'Finalizado' },
  borrador: { tone: 'gray', label: 'Borrador' },
  programado: { tone: 'blue', label: 'Programado' },
  cancelado: { tone: 'red', label: 'Cancelado' },
  pendiente: { tone: 'amber', label: 'Pendiente' },
  procesando: { tone: 'blue', label: 'Procesando' },
  pagado: { tone: 'green', label: 'Pagado' },
  rechazado: { tone: 'red', label: 'Rechazado' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const m = STATUS_MAP[status] ?? STATUS_MAP.borrador
  return (
    <Badge tone={m.tone} live={m.live}>
      {m.label}
    </Badge>
  )
}
