'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'

function validate(name: string, email: string, password: string) {
  const errs: Record<string, string> = {}
  if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email required'
  if (password.length < 8) errs.password = 'At least 8 characters required'
  else if (!/[A-Z]/.test(password)) errs.password = 'Must contain an uppercase letter'
  else if (!/[0-9]/.test(password)) errs.password = 'Must contain a number'
  return errs
}

export default function RegisterPage() {
  const { register, user } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { router.replace('/dashboard'); return null }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(name, email, password)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setApiError('')
    setLoading(true)
    try {
      await register(name, email, password)
      router.push('/dashboard')
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-brand">
        <div className="brand-logo">Task<span>Flow</span></div>
        <div className="brand-tagline">
          Your tasks,<br /><em>intelligently</em><br />organized
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
          <h1>Create account</h1>
          <p className="subtitle">Get started with TaskFlow for free</p>

          {apiError && <div className="error-banner" role="alert">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={errors.name ? 'error' : ''}
                placeholder="Jane Smith"
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="you@example.com"
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={errors.password ? 'error' : ''}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}