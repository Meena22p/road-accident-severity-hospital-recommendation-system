import { useState } from 'react'
import axios from 'axios'
import { AlertTriangle, Lock, User, Eye, EyeOff } from 'lucide-react'

const API = 'http://127.0.0.1:8000'

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // FastAPI Form() requires application/x-www-form-urlencoded OR multipart/form-data
      // Using URLSearchParams ensures correct Content-Type header automatically
      const params = new URLSearchParams()
      params.append('username', form.username.trim())
      params.append('password', form.password.trim())

      const res = await axios.post(`${API}/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      if (res.data.ok) {
        onLogin(res.data.username)
      }
    } catch (e) {
      if (e.code === 'ERR_NETWORK' || !e.response) {
        setError('Cannot reach server. Make sure backend is running on port 8000.')
      } else {
        setError(e.response?.data?.detail || 'Login failed. Check credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      zIndex: 1,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="glass" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56,
            background: 'rgba(255,59,59,0.12)',
            border: '1px solid rgba(255,59,59,0.25)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertTriangle size={26} color="#ff3b3b" />
          </div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 26, letterSpacing: '-0.03em', marginBottom: 6 }}>
            AccidentAI
          </h1>
          <p style={{ color: '#6b7585', fontSize: 13 }}>
            Road Severity Prediction & Hospital Recommendation
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7585', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#6b7585" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="field"
                style={{ paddingLeft: 38 }}
                placeholder="admin"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#6b7585', display: 'block', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#6b7585" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="field"
                style={{ paddingLeft: 38, paddingRight: 42 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7585' }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff3b3b' }}>
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ marginTop: 4, width: '100%', padding: '13px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#6b7585', fontSize: 12, marginTop: 24 }}>
          Default credentials: <span style={{ fontFamily: 'JetBrains Mono', color: '#3b82f6' }}>admin / admin123</span>
        </p>
      </div>
    </div>
  )
}
