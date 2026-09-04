import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  recipients: Array<{
    customer: mongoose.Types.ObjectId;
    phone: string;
    status: 'pending' | 'sent' | 'delivered' | 'failed';
    sentAt?: Date;
    deliveredAt?: Date;
    failureReason?: string;
    messageId?: string;
  }>;
  content: string;
  type: 'bulk' | 'individual';
  targetFilter: {
    type: 'all' | 'new' | 'repeated' | 'best' | 'single';
    criteria?: any;
  };
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  provider: 'twilio' | 'teletalk' | 'smsbd';
  cost?: number;
  scheduledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'sent', 'delivered', 'failed'], 
      default: 'pending' 
    },
    sentAt: Date,
    deliveredAt: Date,
    failureReason: String,
    messageId: String
  }],
  content: { type: String, required: true, maxlength: 1600 },
  type: { type: String, enum: ['bulk', 'individual'], required: true },
  targetFilter: {
    type: { 
      type: String, 
      enum: ['all', 'new', 'repeated', 'best', 'single'], 
      required: true 
    },
    criteria: Schema.Types.Mixed
  },
  totalRecipients: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  provider: { 
    type: String, 
    enum: ['twilio', 'teletalk', 'smsbd'], 
    default: 'twilio' 
  },
  cost: Number,
  scheduledAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Index for efficient querying
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ 'recipients.customer': 1 });
MessageSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);