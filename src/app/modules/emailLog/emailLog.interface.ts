import { Types, Document } from "mongoose";

export enum EmailStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    FAILED = "FAILED",
    DELIVERED = "DELIVERED",
    OPENED = "OPENED",
    CLICKED = "CLICKED",
    BOUNCED = "BOUNCED",
    UNSUBSCRIBED = "UNSUBSCRIBED"
}

export enum EmailProvider {
    SENDGRID = "SENDGRID",
    MAILGUN = "MAILGUN",
    SMTP = "SMTP"
}

// Attachment Interface
export interface IEmailAttachment {
    filename: string;
    content?: Buffer;
    contentType?: string;
    size?: number;
    path?: string;
}

// Email Log Interface
export interface IEmailLog {
    orgId: Types.ObjectId;
    to: string[];
    cc?: string[];
    bcc?: string[];
    from: string;
    subject: string;
    body?: string;
    attachments?: IEmailAttachment[];
    status: EmailStatus;
    provider: EmailProvider;
    providerMessageId?: string;
    providerResponse?: any;
    errorMessage?: string;
    retryCount: number;
    maxRetries: number;
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    bouncedAt?: Date;
    unsubscribedAt?: Date;
    metadata?: {
        automationId?: Types.ObjectId;
        leadId?: Types.ObjectId;
        userId?: Types.ObjectId;
        campaignId?: Types.ObjectId;
        templateName?: string;
        [key: string]: any;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IEmailLogDocument extends IEmailLog, Document {
    _id: Types.ObjectId;
}

// Email Queue Interface (for background processing)
export interface IEmailQueue {
    orgId: Types.ObjectId;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body?: string;
    attachments?: IEmailAttachment[];
    templateName?: string;
    templateData?: Record<string, any>;
    priority: 'low' | 'normal' | 'high';
    scheduledFor?: Date;
    attempts: number;
    maxAttempts: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    lastAttemptAt?: Date;
    nextAttemptAt?: Date;
    errorMessage?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IEmailQueueDocument extends IEmailQueue, Document {
    _id: Types.ObjectId;
}