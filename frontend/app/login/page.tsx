'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'

export default function LoginPage() {
  const { login, user } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { router.replace('/dashboard'); return null }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-brand">
        <div className="brand-logo">Task<span>Flow</span></div>
        <div className="brand-tagline">
          Manage tasks<br />with <em>AI clarity</em>
        </div>
        <ul className="brand-features">
          <li>AI-powered priority suggestions</li>
          <li>Smart deadline email alerts</li>
          <li>Subtask breakdown & progress</li>
          <li>Secure JWT authentication</li>
        </ul>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your TaskFlow account</p>

          {error && <div className="error-banner" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div className="auth-switch">
  Don&apos;t have an account? <Link href="/register">Create one</Link>
</div>
        </div>
      </div>
    </div>
  )
}
