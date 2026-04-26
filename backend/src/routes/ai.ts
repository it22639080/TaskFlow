import { Router, Response } from 'express'
import Groq from 'groq-sdk'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { aiLimit } from '../lib/ratelimit'

const router = Router()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const schema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
})

router.post('/suggest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!aiLimit(req.user!.userId)) {
      res.status(429).json({ error: 'Rate limit reached. Try again in a minute.' })
      return
    }

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return }

    const { title, description } = parsed.data
    const safeTitle = title.replace(/[<>{}[\]]/g, '').slice(0, 200)
    const safeDesc = (description ?? '').replace(/[<>{}[\]]/g, '').slice(0, 1000)

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Analyze this task. Respond ONLY with valid JSON, no markdown, no explanation.

Task: ${safeTitle}
Description: ${safeDesc || 'None'}

JSON format:
{
  "priority": "HIGH" or "MEDIUM" or "LOW",
  "estimatedTime": "e.g. 2 hours",
  "reasoning": "one sentence explaining priority",
  "subtasks": ["step 1", "step 2", "step 3"]
}`,
      }],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    let suggestion
    try {
      suggestion = JSON.parse(raw.replace(/```json|```/g, '').trim())
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(suggestion.priority)) suggestion.priority = 'MEDIUM'
      if (!Array.isArray(suggestion.subtasks)) suggestion.subtasks = []
    } catch {
      suggestion = { priority: 'MEDIUM', estimatedTime: 'Unknown', reasoning: 'Could not analyze.', subtasks: [] }
    }

    res.json({ suggestion })
  } catch (err) {
  console.error('AI error:', err)
  res.status(503).json({ error: 'AI service unavailable' })
}
})

export default router