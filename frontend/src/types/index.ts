export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface User {
  id: string
  email: string
  name: string
}

export interface Subtask {
  _id: string
  title: string
  done: boolean
}

export interface Task {
  _id: string
  title: string
  description?: string | null
  priority: Priority
  status: Status
  dueDate?: string | null
  estimatedTime?: string | null
  subtasks: Subtask[]
  userId: string
  createdAt: string
  updatedAt: string
}

export interface AISuggestion {
  priority: Priority
  estimatedTime: string
  reasoning: string
  subtasks: string[]
}