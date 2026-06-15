import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import useAdminStore from '../store/useAdminStore'
import { adminAuthApi } from '../api/client'

export function Login() {
  const navigate = useNavigate()
  const { setUser, theme } = useAdminStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Ingresa tu email y contraseña.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await adminAuthApi.login(email, password)
      const { token, user } = res.data.data
      const name = user?.name ?? email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      setUser(
        {
          name,
          email: user?.email ?? email,
          role: user?.role ?? 'Admin',
          initials: name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase(),
          permissions: user?.permissions ?? [],
        },
        token
      )
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Error al iniciar sesión.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-page ${theme === 'dark' ? 'dark' : 'light'}`}>
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, borderRadius: 12 }}>Q</div>
          <div>
            <div className="brand-name" style={{ fontSize: 18 }}>QTriviaPeru</div>
            <div className="brand-sub">Panel de administración</div>
          </div>
        </div>

        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-sub">Accede al panel de control de QTriviaPeru</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="tu@qtriviaperu.pe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="icon-btn"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32 }}
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-warn">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" />
                Entrando…
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LogIn size={16} />
                Ingresar
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Background decorations */}
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
    </div>
  )
}
