import React from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="table-wrapper">
      <table className={`table ${className}`}>{children}</table>
    </div>
  )
}

export function Th({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <th className={className} style={style}>{children}</th>
}

export function Td({ children, className = '', style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={className} style={style}>{children}</td>
}
