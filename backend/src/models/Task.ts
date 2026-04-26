import mongoose, { Schema, Document } from 'mongoose'

export interface ISubtask {
  _id: mongoose.Types.ObjectId
  title: string
  done: boolean
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate?: Date
  estimatedTime?: string
  reminderSent: boolean
  subtasks: ISubtask[]
  userId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const SubtaskSchema = new Schema<ISubtask>({
  title: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
})

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
    dueDate: { type: Date },
    estimatedTime: { type: String },
    reminderSent: { type: Boolean, default: false },
    subtasks: [SubtaskSchema],
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

export const Task =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema)