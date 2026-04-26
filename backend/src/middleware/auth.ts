import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'

export interface AuthRequest extends Request {
  user?: { userId: string; email: string }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }
    req.user = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}