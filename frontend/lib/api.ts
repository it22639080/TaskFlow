const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (res.status === 401) {
    // try refresh
    const refresh = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST', credentials: 'include',
    })
    if (refresh.ok) {
      const res2 = await fetch(`${BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        ...init,
      })
      if (!res2.ok) {
        const err = await res2.json().catch(() => ({}))
        throw new ApiError(res2.status, err.error ?? 'Request failed')
      }
      return res2.json()
    }
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
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () =>
    apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'DELETE' }),

  me: () =>
    apiFetch<{ user: User }>('/api/auth/me'),
}

// Tasks
export const tasksApi = {
  list: () =>
    apiFetch<{ tasks: Task[] }>('/api/tasks'),

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