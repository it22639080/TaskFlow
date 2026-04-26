interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export const authLimit = (id: string) => rateLimit(`auth:${id}`, 10, 60000)
export const aiLimit = (id: string) => rateLimit(`ai:${id}`, 3, 60000)
export const generalLimit = (id: string) => rateLimit(`gen:${id}`, 60, 60000)