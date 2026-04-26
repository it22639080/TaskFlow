import cron from 'node-cron'
import { Task } from '../models/Task'
import { User } from '../models/User'
import { sendEmail, buildReminderEmail } from './email'
import { addHours } from 'date-fns'

export function startCronJobs() {
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Running reminder cron job...')
    try {
      const now = new Date()
      const in24Hours = addHours(now, 24)

      const dueTasks = await Task.find({
        dueDate: { $gte: now, $lte: in24Hours },
        reminderSent: false,
        status: { $ne: 'DONE' },
      })

      for (const task of dueTasks) {
        try {
          const user = await User.findById(task.userId)
          if (!user) continue

          await sendEmail({
            to: user.email,
            subject: `⏰ Task due soon: ${task.title}`,
            html: buildReminderEmail({
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueDate: task.dueDate,
              userName: user.name,
            }),
          })

          task.reminderSent = true
          await task.save()
          console.log(`✅ Reminder sent: ${task.title}`)
        } catch (err) {
          console.error(`❌ Failed reminder for task ${task._id}:`, err)
        }
      }
    } catch (err) {
      console.error('❌ Cron job error:', err)
    }
  })

  console.log('✅ Cron jobs started')
}