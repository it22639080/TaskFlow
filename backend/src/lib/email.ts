import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({
  to, subject, html,
}: {
  to: string; subject: string; html: string
}) {
  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.GMAIL_USER}>`,
    to, subject, html,
  })
}

export function buildReminderEmail(task: {
  title: string
  description?: string
  priority: string
  dueDate?: Date
  userName: string
}): string {
  const color = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' }[task.priority] ?? '#6b7280'
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e293b;">⏰ Task Due Soon</h2>
      <p>Hi ${task.userName}, this task is due within 24 hours:</p>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <h3 style="color:#1e293b;margin:0 0 8px;">${task.title}</h3>
        ${task.description ? `<p style="color:#64748b;font-size:14px;">${task.description}</p>` : ''}
        <span style="background:${color}20;color:${color};padding:3px 12px;border-radius:999px;font-size:12px;font-weight:600;">
          ${task.priority} PRIORITY
        </span>
        <span style="color:#64748b;font-size:13px;margin-left:12px;">
          Due: ${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Soon'}
        </span>
      </div>
      <a href="${process.env.FRONTEND_URL}/dashboard"
         style="background:#3b82f6;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
        Open TaskFlow →
      </a>
    </div>`
}