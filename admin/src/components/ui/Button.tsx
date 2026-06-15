import React from 'react'
import { LucideIcon } from 'lucide-react'

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: ButtonKind
  size?: ButtonSize
  icon?: LucideIcon
  iconRight?: LucideIcon
  children?: React.ReactNode
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  success: 'btn-success',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

export function Button({ kind = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`btn ${kindClasses[kind]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 13 : 15} strokeWidth={2} />}
    </button>
  )
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number
  children: React.ReactNode
}

export function IconButton({ children, className = '', ...rest }: IconButtonProps) {
  return (
    <button className={`icon-btn ${className}`} {...rest}>
      {children}
    </button>
  )
}
