'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { tasksApi, Task, ApiError } from '@/lib/api'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'

type FilterStatus = 'ALL' | Task['status']
type FilterPriority = 'ALL' | Task['priority']

/* Animated counter hook */
function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef<number>()
  const startValRef = useRef(0)

  useEffect(() => {
    startValRef.current = count
    startRef.current = undefined
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out expo
      const eased = 1 - Math.pow(1 - progress, 4)
      setCount(Math.round(startValRef.current + (target - startValRef.current) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return count
}

function AnimatedStatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  const displayed = useCountUp(value)
  return (
    <div className={`stat-card ${className ?? ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{displayed}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    tasksApi.list()
      .then(d => setTasks(d.tasks))
      .catch(() => setError('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [user])

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
      .filter(t => filterPriority === 'ALL' || t.priority === filterPriority)
      .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()))
  }, [tasks, filterStatus, filterPriority, search])

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
  }), [tasks])

  const handleSave = async (data: Partial<Task>) => {
    if (editTask) {
      const { task } = await tasksApi.update(editTask._id, data)
      setTasks(ts => ts.map(t => t._id === task._id ? task : t))
    } else {
      const { task } = await tasksApi.create(data)
      setTasks(ts => [task, ...ts])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await tasksApi.delete(id)
      setTasks(ts => ts.filter(t => t._id !== id))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  const handleStatusChange = async (task: Task, status: Task['status']) => {
    try {
      const { task: updated } = await tasksApi.update(task._id, { status })
      setTasks(ts => ts.map(t => t._id === updated._id ? updated : t))
    } catch {
      alert('Failed to update status')
    }
  }

  const openCreate = () => { setEditTask(null); setShowModal(true) }
  const openEdit = (task: Task) => { setEditTask(task); setShowModal(true) }

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-logo">Task<span>Flow</span></div>
        <div className="topbar-right">
          <div className="user-chip">
            <div className="user-avatar" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span>{user?.name}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {/* Main content */}
      <main className="dashboard-content">

        {/* Stats — animated count-up */}
        <div className="stats-row">
          <AnimatedStatCard label="Total" value={stats.total} />
          <AnimatedStatCard label="To Do" value={stats.todo} className="accent" />
          <AnimatedStatCard label="In Progress" value={stats.inProgress} className="blue" />
          <AnimatedStatCard label="Done" value={stats.done} className="green" />
        </div>

        {/* Tasks header */}
        <div className="tasks-header">
          <h2>My Tasks</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrapper">
              <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="search"
                className="search-input"
                placeholder="Search tasks…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search tasks"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={openCreate}
              style={{ width: 'auto' }}
            >
              + New Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-row" style={{ marginBottom: 20 }}>
          {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map(s => (
            <button
              key={s}
              className={`filter-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: 'var(--surface-3)', margin: '0 4px' }} />
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
            <button
              key={p}
              className={`filter-btn ${filterPriority === p ? 'active accent' : ''}`}
              onClick={() => setFilterPriority(p)}
            >
              {p === 'ALL' ? 'All Priorities' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="error-banner" role="alert">{error}</div>}

        {/* Tasks grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 72 }}>
            <div className="spinner spinner-lg" style={{ color: 'var(--accent)' }} />
          </div>
        ) : (
          <div className="tasks-grid">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <h3>{tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}</h3>
                <p>{tasks.length === 0
                  ? 'Create your first task to get started'
                  : 'Try adjusting your filters or search'}
                </p>
                {tasks.length === 0 && (
                  <button
                    className="btn btn-primary"
                    style={{ width: 'auto', marginTop: 20 }}
                    onClick={openCreate}
                  >
                    + Create first task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <TaskModal
          task={editTask}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}