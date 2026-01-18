import z from "zod";
import { EmailProvider } from "./org.interface";

// SMTP Configuration Schema
export const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.number().min(1).max(65535, "Invalid port number"),
  secure: z.boolean().default(false),
  auth: z.object({
    user: z.string().min(1, "SMTP username is required"),
    pass: z.string().min(1, "SMTP password is required")
  })
});

// Email Template Schema
export const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Template subject is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional()
});

// Setup Email Configuration Schema
export const setupEmailConfigSchema = z.object({
  provider: z.enum(Object.values(EmailProvider) as [string, ...string[]]),
  
  // Provider-specific configurations (conditional validation)
  sendgridConfig: z.object({
    apiKey: z.string().min(1, "SendGrid API key is required"),
    verifiedSender: z.string().email("Invalid verified sender email")
  }).optional(),
  
  mailgunConfig: z.object({
    apiKey: z.string().min(1, "Mailgun API key is required"),
    domain: z.string().min(1, "Mailgun domain is required"),
    region: z.enum(['US', 'EU']).default('US')
  }).optional(),
  
  smtpConfig: smtpConfigSchema.optional(),
  
  // Organization sender information
  senderInfo: z.object({
    fromEmail: z.string().email("Invalid from email").optional(),
    fromName: z.string().min(1, "From name is required").optional(),
    replyToEmail: z.string().email("Invalid reply-to email").optional(),
    supportEmail: z.string().email("Invalid support email").optional()
  }).optional(),
  
  // Email settings
  settings: z.object({
    enableEmailTracking: z.boolean().default(true),
    enableClickTracking: z.boolean().default(true),
    enableOpenTracking: z.boolean().default(true),
    unsubscribeUrl: z.string().url("Invalid unsubscribe URL").optional(),
    footerText: z.string().optional()
  }).optional(),
  
  // Rate limiting
  rateLimits: z.object({
    dailyLimit: z.number().min(1).default(1000),
    hourlyLimit: z.number().min(1).default(100)
  }).optional(),
  
  isActive: z.boolean().default(true)
}).refine((data) => {
  // Ensure the appropriate config is provided based on provider
  if (data.provider === EmailProvider.SENDGRID && !data.sendgridConfig) {
    return false;
  }
  if (data.provider === EmailProvider.MAILGUN && !data.mailgunConfig) {
    return false;
  }
  if (data.provider === EmailProvider.SMTP && !data.smtpConfig) {
    return false;
  }
  return true;
}, {
  message: "Provider configuration is required for the selected email provider"
});

// Update Email Configuration Schema
export const updateEmailConfigSchema = z.object({
  provider: z.enum(Object.values(EmailProvider) as [string, ...string[]]).optional(),
  
  sendgridConfig: z.object({
    apiKey: z.string().min(1).optional(),
    verifiedSender: z.string().email().optional()
  }).optional(),
  
  mailgunConfig: z.object({
    apiKey: z.string().min(1).optional(),
    domain: z.string().min(1).optional(),
    region: z.enum(['US', 'EU']).optional()
  }).optional(),
  
  smtpConfig: smtpConfigSchema.optional(),
  
  senderInfo: z.object({
    fromEmail: z.string().email().optional(),
    fromName: z.string().min(1).optional(),
    replyToEmail: z.string().email().optional(),
    supportEmail: z.string().email().optional()
  }).optional(),
  
  settings: z.object({
    enableEmailTracking: z.boolean().optional(),
    enableClickTracking: z.boolean().optional(),
    enableOpenTracking: z.boolean().optional(),
    unsubscribeUrl: z.string().url().optional(),
    footerText: z.string().optional()
  }).optional(),
  
  rateLimits: z.object({
    dailyLimit: z.number().min(1).optional(),
    hourlyLimit: z.number().min(1).optional()
  }).optional(),
  
  isActive: z.boolean().optional()
});

// Test Email Configuration Schema
export const testEmailConfigSchema = z.object({
  testEmail: z.string().email("Invalid test email address").optional()
});

// Add Email Template Schema
export const addEmailTemplateSchema = emailTemplateSchema;

// Update Email Template Schema
export const updateEmailTemplateSchema = z.object({
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional()
});

// Email Sending Schema (for API testing)
export const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1, "Subject is required"),
  templateName: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string()
  })).optional(),
  replyTo: z.string().email().optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional()
});