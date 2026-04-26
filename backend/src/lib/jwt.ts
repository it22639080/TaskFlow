// backend/src/lib/jwt.ts

import jwt, { SignOptions } from 'jsonwebtoken'

export interface JWTPayload {
  userId: string
  email: string
}

export const signAccessToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: '15m',
  }
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, options)
}

export const signRefreshToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: '7d',
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, options)
}

export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JWTPayload
}

export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JWTPayload
}