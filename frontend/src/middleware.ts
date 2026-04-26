import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()
  const token = req.cookies.get('access_token')?.value
  if (!token) return NextResponse.redirect(new URL('/auth/login', req.url))
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*'] }