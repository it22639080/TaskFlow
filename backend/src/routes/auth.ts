import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User'
import { RefreshToken } from '../models/RefreshToken'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../lib/jwt'
import { authLimit } from '../lib/ratelimit'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
})

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
})

const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? 'unknown'
    if (!authLimit(ip)) { res.status(429).json({ error: 'Too many requests' }); return }

    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
      return
    }

    const { name, email, password } = parsed.data
    const existing = await User.findOne({ email })
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash })

    const payload = { userId: user._id.toString(), email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
    res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? 'unknown'
    if (!authLimit(ip)) { res.status(429).json({ error: 'Too many requests' }); return }

    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid credentials' }); return }

    const { email, password } = parsed.data
    const user = await User.findOne({ email })
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !isValid) { res.status(401).json({ error: 'Invalid credentials' }); return }

    const payload = { userId: user._id.toString(), email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
    res.cookie('refresh_token', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      accessToken,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token
    if (!token) { res.status(401).json({ error: 'No refresh token' }); return }

    const payload = verifyRefreshToken(token)
    const stored = await RefreshToken.findOne({ token })
    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ error: 'Invalid refresh token' }); return
    }

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email })
    res.cookie('access_token', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 })
    res.json({ success: true, accessToken })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// DELETE /api/auth/logout
router.delete('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token
    if (token) await RefreshToken.deleteMany({ token })
    res.clearCookie('access_token', cookieOpts)
    res.clearCookie('refresh_token', cookieOpts)
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    // check cookie first, then Authorization header
    let token = req.cookies?.access_token
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7)
    }
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.userId).select('-passwordHash')
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({ user: { id: user._id, name: user.name, email: user.email } })
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
})

export default router
