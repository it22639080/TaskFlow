import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { connectDB } from './lib/db'
import authRoutes from './routes/auth'
import taskRoutes from './routes/tasks'
import aiRoutes from './routes/ai'
import { startCronJobs } from './lib/cron'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/ai', aiRoutes)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`)
    startCronJobs()
  })
}

start()