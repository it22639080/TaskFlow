'use client'
import { useState, useEffect } from 'react'
import { Task, AISuggestion, aiApi } from '@/lib/api'

interface Props {
  task?: Task | null
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
}

export default function TaskModal({ task, onClose, onSave }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'MEDIUM')
  const [status, setStatus] = useState<Task['status']>(task?.status ?? 'TODO')
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 16) : '')
  const [estimatedTime, setEstimatedTime] = useState(task?.estimatedTime ?? '')
  const [subtasks, setSubtasks] = useState<{ title: string; done: boolean }[]>(
    task?.subtasks?.map(s => ({ title: s.title, done: s.done })) ?? []
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiError, setAiError] = useState('')
  const [aiDismissed, setAiDismissed] = useState(false)

  const handleAISuggest = async () => {
    if (!title.trim()) { setAiError('Add a title first'); return }
    setAiLoading(true)
    setAiError('')
    try {
      const { suggestion } = await aiApi.suggest({ title, description })
      setAiSuggestion(suggestion)
      setAiDismissed(false)
    } catch {
      setAiError('AI unavailable – try again')
    } finally {
      setAiLoading(false)
    }
  }

  const applyAI = () => {
    if (!aiSuggestion) return
    setPriority(aiSuggestion.priority)
    setEstimatedTime(aiSuggestion.estimatedTime)
    if (aiSuggestion.subtasks.length > 0) {
      setSubtasks(aiSuggestion.subtasks.map(t => ({ title: t, done: false })))
    }
    setAiDismissed(true)
  }

  const addSubtask = () => setSubtasks(s => [...s, { title: '', done: false }])
  const removeSubtask = (i: number) => setSubtasks(s => s.filter((_, idx) => idx !== i))
  const updateSubtask = (i: number, field: 'title' | 'done', val: string | boolean) =>
    setSubtasks(s => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st))

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority, status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        estimatedTime: estimatedTime.trim() || undefined,
        subtasks: subtasks.filter(s => s.title.trim()),
      } as Partial<Task>)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="task-title">Title *</label>
            <input id="task-title" type="text" value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?" maxLength={200} />
          </div>

          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea id="task-desc" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..." maxLength={2000} />
          </div>

          {/* AI button */}
          <div style={{ marginBottom: 16 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAISuggest}
              disabled={aiLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {aiLoading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Analyzing…</>
                : <><span style={{ fontSize: 16 }}>✦</span> AI Suggest Priority & Subtasks</>}
            </button>
            {aiError && <p className="field-error" style={{ marginTop: 6 }}>{aiError}</p>}
          </div>

          {/* AI suggestion box */}
          {aiSuggestion && !aiDismissed && (
            <div className="ai-box">
              <div className="ai-box-header">
                <span className="ai-dot" />
                AI Suggestion
              </div>
              <div className="ai-suggestion-row">
                <div className="ai-suggestion-item">
                  <div className="label">Priority</div>
                  <div className="value">{aiSuggestion.priority}</div>
                </div>
                <div className="ai-suggestion-item">
                  <div className="label">Est. Time</div>
                  <div className="value">{aiSuggestion.estimatedTime}</div>
                </div>
              </div>
              <div className="ai-reasoning">{aiSuggestion.reasoning}</div>
              {aiSuggestion.subtasks.length > 0 && (
                <>
                  <div style={{ fontSize: 11, color: 'rgba(253,252,249,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                    Suggested subtasks
                  </div>
                  <ul className="ai-subtasks-list">
                    {aiSuggestion.subtasks.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </>
              )}
              <div className="ai-actions">
                <button className="btn-ai-apply" onClick={applyAI}>Apply suggestions</button>
                <button className="btn-ai-dismiss" onClick={() => setAiDismissed(true)}>Dismiss</button>
              </div>
            </div>
          )}

          <div className="form-row" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select id="task-priority" value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}>
                <option value="LOW">🟢 Low</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="HIGH">🔴 High</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="task-status">Status</label>
              <select id="task-status" value={status} onChange={e => setStatus(e.target.value as Task['status'])}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-due">Due date</label>
              <input id="task-due" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="task-est">Estimated time</label>
              <input id="task-est" type="text" value={estimatedTime}
                onChange={e => setEstimatedTime(e.target.value)}
                placeholder="e.g. 2 hours" maxLength={50} />
            </div>
          </div>

          {/* Subtasks */}
          <div className="form-group">
            <label>Subtasks</label>
            {subtasks.map((st, i) => (
              <div className="subtask-item" key={i}>
                {task && (
                  <input type="checkbox" checked={st.done}
                    onChange={e => updateSubtask(i, 'done', e.target.checked)}
                    aria-label="Mark subtask done" />
                )}
                <input type="text" value={st.title}
                  onChange={e => updateSubtask(i, 'title', e.target.value)}
                  placeholder={`Subtask ${i + 1}`} maxLength={200} />
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeSubtask(i)} aria-label="Remove subtask">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addSubtask}
              style={{ marginTop: 4 }}>
              + Add subtask
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" style={{ width: 'auto', minWidth: 100 }}
              onClick={handleSave} disabled={saving}>
              {saving ? <span className="spinner" /> : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}