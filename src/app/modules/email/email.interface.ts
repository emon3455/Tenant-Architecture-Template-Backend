import { Document, Types } from "mongoose";

// Email Provider Enums
export enum EmailProvider {
  SMTP = "SMTP"
}

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

export enum TemplateCategory {
  WELCOME = "WELCOME",
  NOTIFICATION = "NOTIFICATION", 
  MARKETING = "MARKETING",
  TRANSACTIONAL = "TRANSACTIONAL",
  AUTOMATION = "AUTOMATION",
  SYSTEM = "SYSTEM"
}

// Base Email Configuration Interfaces
export interface ISMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized?: boolean;
  };
}

export interface IEmailSettings {
  enableEmailTracking: boolean;
  enableClickTracking: boolean;
  enableOpenTracking: boolean;
  enableUnsubscribe: boolean;
  unsubscribeUrl?: string;
  footerText?: string;
  replyToEmail?: string;
  fromName?: string;
}

export interface IEmailRateLimits {
  dailyLimit: number;
  hourlyLimit: number;
  monthlyLimit?: number;
  concurrentLimit?: number;
}

// Email Template Interface
export interface IEmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  designJson: string;
  textContent?: string;
  category: TemplateCategory;
  variables: string[];
  isActive: boolean;
  description?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
}

export interface IEmailTemplateDocument extends IEmailTemplate, Document {}


// Add this interface near the top of your file
export interface IEmailAttachment {
    filename: string;
    content?: Buffer;
    contentType?: string;
    size?: number;
    path?: string;
}

// Email Configuration Interface
export interface IEmailConfiguration {
  orgId: Types.ObjectId;
  provider: EmailProvider;
  smtpConfig: ISMTPConfig;
  settings: IEmailSettings;
  rateLimits: IEmailRateLimits;
  templates: Types.ObjectId[]; // References to EmailTemplate documents
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  lastTestedAt?: Date;
  testResults?: {
    success: boolean;
    message: string;
    testedAt: Date;
  };
}

export interface IEmailConfigurationDocument extends IEmailConfiguration, Document {
  _id: Types.ObjectId;
}

// Email Log Interface
export interface IEmailLog {
    orgId: Types.ObjectId;
    configurationId: Types.ObjectId;
    templateId?: Types.ObjectId;
    to: string[];
    cc?: string[];
    bcc?: string[];
    from: string;
    subject: string;
    body?: string; // ADD THIS FIELD
    attachments?: IEmailAttachment[]; // ADD THIS FIELD
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
        [key: string]: any;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface IEmailLogDocument extends IEmailLog, Document {
  _id: Types.ObjectId;
}

// Email Queue Interface (for background processing)
export interface IEmailQueueItem {
  orgId: Types.ObjectId;
  configurationId: Types.ObjectId;
  templateId?: Types.ObjectId;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailQueueDocument extends IEmailQueueItem, Document {
  _id: Types.ObjectId;
}

// Service Interfaces
export interface IEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  templateName?: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface IEmailServiceResponse {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  message: string;
  providerResponse?: any;
  logId?: Types.ObjectId;
}

// Analytics Interfaces
export interface IEmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  byProvider: Record<EmailProvider, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
  byTemplate: Record<string, {
    sent: number;
    opened: number;
    clicked: number;
  }>;
  timeline: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }>;
}

// Webhook Interfaces
export interface IEmailWebhookEvent {
  provider: EmailProvider;
  event: EmailStatus;
  messageId: string;
  email: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

// Export additional types
export type EmailConfigurationCreateInput = Omit<IEmailConfiguration, '_id' | 'createdAt' | 'updatedAt' | 'templates'> & {
  templates?: Partial<IEmailTemplate>[];
};

export type EmailTemplateCreateInput = Omit<IEmailTemplate, '_id' | 'createdAt' | 'updatedAt' | 'version'>;

export type EmailConfigurationUpdateInput = Partial<Pick<IEmailConfiguration, 
  'provider' | 'smtpConfig' | 'settings' | 'rateLimits' | 'isActive'
>>;

export type EmailTemplateUpdateInput = Partial<Pick<IEmailTemplate,
  'subject' | 'htmlContent' | 'textContent' | 'category' | 'variables' | 'isActive' | 'description'
>>;