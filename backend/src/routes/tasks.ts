import { Router, Response } from 'express'
import { z } from 'zod'
import { Task } from '../models/Task'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const taskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedTime: z.string().max(50).optional().nullable(),
})

// GET /api/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await Task.find({ userId: req.user!.userId }).sort({ createdAt: -1 })
    res.json({ tasks })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { subtasks: subtaskTitles, ...rest } = req.body
    const parsed = taskSchema.safeParse(rest)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors })
      return
    }

    const task = await Task.create({
      ...parsed.data,
      userId: req.user!.userId,
      subtasks: subtaskTitles?.map((title: string) => ({ title, done: false })) ?? [],
    })
    res.status(201).json({ task })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) { res.status(404).json({ error: 'Task not found' }); return }
    if (task.userId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' }); return
    }

    const { subtasks: subtaskUpdates, ...rest } = req.body
    const parsed = taskSchema.partial().safeParse(rest)
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed' }); return }

    Object.assign(task, parsed.data)
    if (subtaskUpdates) {
      task.subtasks = subtaskUpdates.map((s: { title: string; done?: boolean }) => ({
        title: s.title,
        done: s.done ?? false,
      }))
    }

    await task.save()
    res.json({ task })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) { res.status(404).json({ error: 'Task not found' }); return }
    if (task.userId.toString() !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden' }); return
    }
    await task.deleteOne()
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router