import { Schema, model, models } from "mongoose";
import { tenantScopePlugin } from "../../lib/tenantScope.plugin";
import { IEmailLog, IEmailQueue, EmailStatus, EmailProvider } from "./emailLog.interface";

// Email Log Schema
const emailLogSchema = new Schema<IEmailLog>({
    orgId: { type: Schema.Types.ObjectId, ref: "Org", required: true },
    to: [{ type: String, required: true }],
    cc: [String],
    bcc: [String],
    from: { type: String, required: true },
    subject: { type: String, required: true },
    body: { 
        type: String 
    },
    attachments: [{
        filename: { type: String, required: true },
        content: { type: Buffer }, // Store file content as buffer
        contentType: { type: String },
        size: { type: Number }, // File size in bytes
        path: { type: String } // Optional: file path if stored externally
    }],
    status: {
        type: String,
        enum: Object.values(EmailStatus),
        default: EmailStatus.PENDING,
        required: true
    },
    provider: {
        type: String,
        enum: Object.values(EmailProvider),
        required: true
    },
    providerMessageId: { type: String },
    providerResponse: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0, min: 0 },
    maxRetries: { type: Number, default: 3, min: 0 },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    bouncedAt: { type: Date },
    unsubscribedAt: { type: Date },
    metadata: {
        // automationId: { type: Schema.Types.ObjectId, ref: "Automation" }, // REMOVED - Automation model deleted
        // leadId: { type: Schema.Types.ObjectId, ref: \"Lead\" }, // REMOVED - Lead model deleted
        leadId: { type: Schema.Types.ObjectId }, // Lead reference removed
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        campaignId: { type: Schema.Types.ObjectId },
        templateName: { type: String },
        type: { type: String },
        additionalData: { type: Schema.Types.Mixed }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
emailLogSchema.index({ orgId: 1, status: 1 });
emailLogSchema.index({ orgId: 1, createdAt: -1 });
emailLogSchema.index({ providerMessageId: 1 });
emailLogSchema.index({ "metadata.automationId": 1 });
emailLogSchema.index({ "metadata.leadId": 1 });
emailLogSchema.index({ "metadata.userId": 1 });

// Apply tenant scope plugin
emailLogSchema.plugin(tenantScopePlugin, { exemptRoles: ["SUPER_ADMIN"], orgField: "orgId" });

// Email Queue Schema
const emailQueueSchema = new Schema<IEmailQueue>({
    orgId: { type: Schema.Types.ObjectId, ref: "Org", required: true },
    to: [{ type: String, required: true }],
    cc: [String],
    bcc: [String],
    subject: { type: String, required: true },
    body: { 
        type: String 
    },
    attachments: [{
        filename: { type: String, required: true },
        content: { type: Buffer },
        contentType: { type: String },
        size: { type: Number },
        path: { type: String }
    }],
    templateName: { type: String },
    templateData: { type: Schema.Types.Mixed },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    scheduledFor: { type: Date, default: Date.now },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    lastAttemptAt: { type: Date },
    nextAttemptAt: { type: Date },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for email queue
emailQueueSchema.index({ orgId: 1, status: 1 });
emailQueueSchema.index({ status: 1, scheduledFor: 1 });
emailQueueSchema.index({ priority: -1, createdAt: 1 });

// Apply tenant scope plugin
emailQueueSchema.plugin(tenantScopePlugin, { exemptRoles: ["SUPER_ADMIN"], orgField: "orgId" });

// Export Models - Check if already registered to prevent OverwriteModelError
export const EmailLog = models.EmailLog || model<IEmailLog>("EmailLog", emailLogSchema);
export const EmailQueue = models.EmailQueue || model<IEmailQueue>("EmailQueue", emailQueueSchema);