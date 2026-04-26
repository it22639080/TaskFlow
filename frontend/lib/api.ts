const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// In-memory token store (survives re-renders, cleared on page refresh)
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers,
    ...init,
  })

  if (res.status === 401) {
    // Try refresh
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refresh.ok) {
      const data = await refresh.json()
      setAccessToken(data.accessToken)

      const res2 = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers: {
          ...headers,
          'Authorization': `Bearer ${data.accessToken}`,
        },
        ...init,
      })
      if (!res2.ok) {
        const err = await res2.json().catch(() => ({}))
        throw new ApiError(res2.status, err.error ?? 'Request failed')
      }
      return res2.json()
    }
    setAccessToken(null)
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.error ?? 'Request failed')
  }

  return res.json()
}

// Auth
export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const result = await apiFetch<{ user: User; accessToken: string }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    })
    setAccessToken(result.accessToken)
    return result
  },

  login: async (data: { email: string; password: string }) => {
    const result = await apiFetch<{ user: User; accessToken: string }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify(data),
    })
    setAccessToken(result.accessToken)
    return result
  },

  logout: async () => {
    const result = await apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'DELETE' })
    setAccessToken(null)
    return result
  },

  me: () => apiFetch<{ user: User }>('/api/auth/me'),
}

// Tasks
export const tasksApi = {
  list: () => apiFetch<{ tasks: Task[] }>('/api/tasks'),
  create: (data: Partial<Task>) =>
    apiFetch<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Task>) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}

// AI
export const aiApi = {
  suggest: (data: { title: string; description?: string }) =>
    apiFetch<{ suggestion: AISuggestion }>('/api/ai/suggest', { method: 'POST', body: JSON.stringify(data) }),
}

// Types
export interface User {
  id: string
  name: string
  email: string
}

export interface Subtask {
  _id: string
  title: string
  done: boolean
}

export interface Task {
  _id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate?: string
  estimatedTime?: string
  reminderSent: boolean
  subtasks: Subtask[]
  userId: string
  createdAt: string
  updatedAt: string
}

export interface AISuggestion {
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  estimatedTime: string
  reasoning: string
  subtasks: string[]
}
