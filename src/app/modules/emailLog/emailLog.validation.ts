import { z } from "zod";
import { EmailStatus, EmailProvider } from "./emailLog.interface";

// Attachment Schema
export const emailAttachmentSchema = z.object({
    filename: z.string().min(1, "Filename is required"),
    content: z.instanceof(Buffer).optional(),
    contentType: z.string().optional(),
    size: z.number().min(0).optional(),
    path: z.string().optional()
});

// Email Log Query Schema
export const emailLogQuerySchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    sort: z.string().optional().default('sentAt'),
    fields: z.string().optional(),
    search: z.string().optional().default(''),
    status: z.enum([
        EmailStatus.PENDING,
        EmailStatus.SENT,
        EmailStatus.FAILED,
        EmailStatus.DELIVERED,
        EmailStatus.OPENED,
        EmailStatus.CLICKED,
        EmailStatus.BOUNCED,
        EmailStatus.UNSUBSCRIBED
    ]).optional(),
    provider: z.enum([
        EmailProvider.SENDGRID,
        EmailProvider.MAILGUN,
        EmailProvider.SMTP
    ]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

// Email Analytics Query Schema
export const emailAnalyticsQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

// Automation Email Logs Query Schema
export const automationEmailLogsParamsSchema = z.object({
    automationId: z.string().min(1, "Automation ID is required")
});

export const automationEmailLogsQuerySchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    sort: z.string().optional().default('sentAt'),
    status: z.enum([
        EmailStatus.PENDING,
        EmailStatus.SENT,
        EmailStatus.FAILED,
        EmailStatus.DELIVERED,
        EmailStatus.OPENED,
        EmailStatus.CLICKED,
        EmailStatus.BOUNCED,
        EmailStatus.UNSUBSCRIBED
    ]).optional()
});

// Lead Email Logs Query Schema
export const leadEmailLogsParamsSchema = z.object({
    leadId: z.string().min(1, "Lead ID is required")
});

export const leadEmailLogsQuerySchema = z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    sort: z.string().optional().default('sentAt'),
    status: z.enum([
        EmailStatus.PENDING,
        EmailStatus.SENT,
        EmailStatus.FAILED,
        EmailStatus.DELIVERED,
        EmailStatus.OPENED,
        EmailStatus.CLICKED,
        EmailStatus.BOUNCED,
        EmailStatus.UNSUBSCRIBED
    ]).optional()
});

// Email Log by ID Schema
export const emailLogByIdSchema = z.object({
    id: z.string().min(1, "Email log ID is required")
});

// Cleanup Old Logs Schema
export const cleanupOldLogsSchema = z.object({
    days: z.string().regex(/^\d+$/, "Days must be a positive number").optional().default('90')
});

// Webhook Update Schema (for provider webhooks)
export const webhookUpdateSchema = z.object({
    provider: z.enum([
        EmailProvider.SENDGRID,
        EmailProvider.MAILGUN,
        EmailProvider.SMTP
    ]),
    messageId: z.string().min(1, "Message ID is required"),
    status: z.enum([
        EmailStatus.DELIVERED,
        EmailStatus.OPENED,
        EmailStatus.CLICKED,
        EmailStatus.BOUNCED,
        EmailStatus.UNSUBSCRIBED
    ]),
    timestamp: z.number().or(z.string()),
    reason: z.string().optional(),
    url: z.string().optional(), // For click events
    userAgent: z.string().optional(),
    ip: z.string().optional(),
    metadata: z.record(z.any()).optional()
});

// Email Queue Item Schema
export const emailQueueItemSchema = z.object({
    to: z.array(z.string().email()).min(1, "At least one recipient is required"),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().optional(),
    attachments: z.array(emailAttachmentSchema).optional(),
    templateName: z.string().optional(),
    templateData: z.record(z.any()).optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    scheduledFor: z.string().datetime().optional(),
    maxAttempts: z.number().min(1).max(10).default(3),
    metadata: z.record(z.any()).optional()
});

// Email Log Creation Schema (internal use)
export const createEmailLogSchema = z.object({
    orgId: z.string().min(1, "Organization ID is required"),
    to: z.array(z.string().email()).min(1, "At least one recipient is required"),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    from: z.string().email("Valid sender email is required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().optional(),
    attachments: z.array(emailAttachmentSchema).optional(),
    status: z.enum([
        EmailStatus.PENDING,
        EmailStatus.SENT,
        EmailStatus.FAILED,
        EmailStatus.DELIVERED,
        EmailStatus.OPENED,
        EmailStatus.CLICKED,
        EmailStatus.BOUNCED,
        EmailStatus.UNSUBSCRIBED
    ]),
    provider: z.enum([
        EmailProvider.SENDGRID,
        EmailProvider.MAILGUN,
        EmailProvider.SMTP
    ]),
    providerMessageId: z.string().optional(),
    providerResponse: z.any().optional(),
    errorMessage: z.string().optional(),
    retryCount: z.number().min(0).default(0),
    maxRetries: z.number().min(0).default(3),
    metadata: z.object({
        automationId: z.string().optional(),
        leadId: z.string().optional(),
        userId: z.string().optional(),
        templateName: z.string().optional(),
        type: z.string().optional(),
        additionalData: z.any().optional()
    }).optional()
});