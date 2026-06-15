import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  noPad?: boolean
}

export function Card({ children, className = '', style, noPad = false }: CardProps) {
  return (
    <div className={`card ${noPad ? '' : 'card-pad'} ${className}`} style={style}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  sub?: string
  action?: React.ReactNode
}

export function CardHeader({ title, sub, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
