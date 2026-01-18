import mongoose, { Schema } from "mongoose";
import {
  IEmailConfigurationDocument,
  IEmailTemplateDocument,
  IEmailLogDocument,
  IEmailQueueDocument,
  EmailProvider,
  EmailStatus,
  TemplateCategory
} from "./email.interface";

// Email Template Schema
const emailTemplateSchema = new Schema<IEmailTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    htmlContent: {
      type: String,
      required: true
    },
    textContent: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(TemplateCategory),
      required: true,
      default: TemplateCategory.NOTIFICATION
    },
    variables: [{
      type: String,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Email Template Indexes
emailTemplateSchema.index({ name: 1, category: 1 });
emailTemplateSchema.index({ isActive: 1 });
emailTemplateSchema.index({ createdBy: 1 });

// Email Configuration Schema
const emailConfigurationSchema = new Schema<IEmailConfigurationDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
      required: true
    },
    provider: {
      type: String,
      enum: Object.values(EmailProvider),
      required: true
    },
    smtpConfig: {
      host: {
        type: String,
        trim: true
      },
      port: {
        type: Number,
        min: 1,
        max: 65535
      },
      secure: {
        type: Boolean,
        default: false
      },
      auth: {
        user: {
          type: String,
          trim: true
        },
        pass: {
          type: String,
          trim: true
        }
      },
      tls: {
        rejectUnauthorized: {
          type: Boolean,
          default: true
        }
      }
    },
    settings: {
      enableEmailTracking: {
        type: Boolean,
        default: true
      },
      enableClickTracking: {
        type: Boolean,
        default: true
      },
      enableOpenTracking: {
        type: Boolean,
        default: true
      },
      enableUnsubscribe: {
        type: Boolean,
        default: true
      },
      unsubscribeUrl: {
        type: String,
        trim: true
      },
      footerText: {
        type: String,
        trim: true,
        maxlength: 500
      },
      replyToEmail: {
        type: String,
        trim: true
      },
      fromName: {
        type: String,
        trim: true,
        maxlength: 100
      }
    },
    rateLimits: {
      dailyLimit: {
        type: Number,
        required: true,
        min: 1,
        default: 1000
      },
      hourlyLimit: {
        type: Number,
        required: true,
        min: 1,
        default: 100
      },
      monthlyLimit: {
        type: Number,
        min: 1
      },
      concurrentLimit: {
        type: Number,
        min: 1,
        default: 10
      }
    },
    templates: [{
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastTestedAt: {
      type: Date
    },
    testResults: {
      success: {
        type: Boolean
      },
      message: {
        type: String,
        trim: true
      },
      testedAt: {
        type: Date
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Email Configuration Indexes
emailConfigurationSchema.index({ orgId: 1, provider: 1 });
emailConfigurationSchema.index({ orgId: 1, isDefault: 1 });
emailConfigurationSchema.index({ isActive: 1 });

// Ensure only one default configuration per organization
emailConfigurationSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('EmailConfiguration').updateMany(
      { orgId: this.orgId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Email Log Schema
const emailLogSchema = new Schema<IEmailLogDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
      required: true
    },
    configurationId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailConfiguration',
      required: true
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    },
    to: [{
      type: String,
      required: true,
      trim: true
    }],
    cc: [{
      type: String,
      trim: true
    }],
    bcc: [{
      type: String,
      trim: true
    }],
    from: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    status: {
      type: String,
      enum: Object.values(EmailStatus),
      required: true,
      default: EmailStatus.PENDING
    },
    provider: {
      type: String,
      enum: Object.values(EmailProvider),
      required: true
    },
    providerMessageId: {
      type: String,
      trim: true
    },
    providerResponse: {
      type: Schema.Types.Mixed
    },
    errorMessage: {
      type: String,
      trim: true
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0
    },
    sentAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    openedAt: {
      type: Date
    },
    clickedAt: {
      type: Date
    },
    bouncedAt: {
      type: Date
    },
    unsubscribedAt: {
      type: Date
    },
    metadata: {
      // automationId: {
      //   type: Schema.Types.ObjectId,
      //   ref: 'Automation'
      // }, // REMOVED - Automation model deleted
      // leadId: {\n      //   type: Schema.Types.ObjectId,\n      //   ref: 'Lead'\n      // }, // REMOVED - Lead model deleted
      leadId: {
        type: Schema.Types.ObjectId
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      campaignId: {
        type: Schema.Types.ObjectId
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Email Log Indexes
emailLogSchema.index({ orgId: 1, status: 1 });
emailLogSchema.index({ orgId: 1, createdAt: -1 });
emailLogSchema.index({ configurationId: 1 });
emailLogSchema.index({ templateId: 1 });
emailLogSchema.index({ 'metadata.automationId': 1 });
emailLogSchema.index({ 'metadata.leadId': 1 });
emailLogSchema.index({ status: 1, retryCount: 1 });

// Email Queue Schema
const emailQueueSchema = new Schema<IEmailQueueDocument>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
      required: true
    },
    configurationId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailConfiguration',
      required: true
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    },
    to: [{
      type: String,
      required: true,
      trim: true
    }],
    cc: [{
      type: String,
      trim: true
    }],
    bcc: [{
      type: String,
      trim: true
    }],
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    templateData: {
      type: Schema.Types.Mixed
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    scheduledFor: {
      type: Date
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    lastAttemptAt: {
      type: Date
    },
    nextAttemptAt: {
      type: Date
    },
    errorMessage: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Email Queue Indexes
emailQueueSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
emailQueueSchema.index({ orgId: 1, status: 1 });
emailQueueSchema.index({ nextAttemptAt: 1, status: 1 });
emailQueueSchema.index({ configurationId: 1 });

// Virtual population for email configuration templates
emailConfigurationSchema.virtual('populatedTemplates', {
  ref: 'EmailTemplate',
  localField: 'templates',
  foreignField: '_id'
});

// Export Models
export const EmailTemplate = mongoose.models.EmailTemplate ||  mongoose.model<IEmailTemplateDocument>('EmailTemplate', emailTemplateSchema);
export const EmailConfiguration = mongoose.models.EmailConfiguration || mongoose.model<IEmailConfigurationDocument>('EmailConfiguration', emailConfigurationSchema);
// Note: EmailLog and EmailQueue are now handled by the dedicated emailLog module