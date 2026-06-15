import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className = '', ...rest }: InputProps) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input className={`input ${error ? 'input-error' : ''} ${className}`} {...rest} />
      {hint && !error && <span className="input-hint">{hint}</span>}
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, className = '', ...rest }: TextareaProps) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <textarea className={`textarea ${className}`} {...rest} />
      {hint && <span className="input-hint">{hint}</span>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  children: React.ReactNode
}

export function Select({ label, hint, className = '', children, ...rest }: SelectProps) {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <select className={`select ${className}`} {...rest}>
        {children}
      </select>
      {hint && <span className="input-hint">{hint}</span>}
    </div>
  )
}
