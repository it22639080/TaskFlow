'use client'
import { Task } from '@/lib/api'

interface Props {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (task: Task, status: Task['status']) => void
}

function formatDate(d?: string) {
  if (!d) return null
  const date = new Date(d)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'Overdue', overdue: true }
  if (days === 0) return { label: 'Due today', overdue: false }
  if (days === 1) return { label: 'Due tomorrow', overdue: false }
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false }
}

export default function TaskCard({ task, onEdit, onDelete, onStatusChange }: Props) {
  const done = task.subtasks.filter(s => s.done).length
  const total = task.subtasks.length
  const progress = total > 0 ? (done / total) * 100 : 0
  const dateInfo = formatDate(task.dueDate)
  const isDone = task.status === 'DONE'

  const nextStatus = (): Task['status'] => {
    if (task.status === 'TODO') return 'IN_PROGRESS'
    if (task.status === 'IN_PROGRESS') return 'DONE'
    return 'TODO'
  }

  const nextStatusLabel = task.status === 'DONE' ? '↩ Reopen' : task.status === 'TODO' ? '▶ Start' : '✓ Done'

  return (
    <article
      className={`task-card priority-${task.priority} ${isDone ? 'done' : ''}`}
      onClick={() => onEdit(task)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onEdit(task) }}
      aria-label={`Task: ${task.title}`}
    >
      {/* Animated shimmer accent bar */}
      <div className="task-card-accent" />

      <div className="task-card-header">
        <h3 className={`task-title ${isDone ? 'done-text' : ''}`}>{task.title}</h3>
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <span className={`badge badge-${task.status}`} style={{ fontSize: 10 }}>
          {task.status.replace('_', ' ')}
        </span>
        {task.estimatedTime && (
          <span className="task-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
            </svg>
            {task.estimatedTime}
          </span>
        )}
        {dateInfo && (
          <span className="task-meta-item" style={{ color: dateInfo.overdue ? 'var(--red)' : undefined, fontWeight: dateInfo.overdue ? 700 : undefined }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateInfo.label}
          </span>
        )}
        {task.reminderSent && (
          <span className="task-meta-item" title="Reminder sent" style={{ color: 'var(--accent-2)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="subtasks-bar">
          <div className="subtasks-label">{done}/{total} subtasks</div>
          <div className="subtasks-progress">
            <div className="subtasks-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="task-card-footer" onClick={e => e.stopPropagation()}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onStatusChange(task, nextStatus())}
          title={`Move to ${nextStatus().replace('_', ' ')}`}
          style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          {nextStatusLabel}
        </button>
        <div className="task-actions">
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            className="btn btn-danger btn-icon btn-sm"
            onClick={() => onDelete(task._id)}
            aria-label="Delete task"
            style={{ transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}