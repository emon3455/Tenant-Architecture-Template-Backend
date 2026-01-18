import { z } from 'zod';
import { EmailProvider, TemplateCategory } from './email.interface';

// Email Configuration Validation Schemas
export const smtpConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean().default(false),
  auth: z.object({
    user: z.string().min(1, 'SMTP username is required'),
    pass: z.string().min(1, 'SMTP password is required')
  }),
  tls: z.object({
    rejectUnauthorized: z.boolean().default(true)
  }).optional()
});

export const emailSettingsSchema = z.object({
  enableEmailTracking: z.boolean().default(true),
  enableClickTracking: z.boolean().default(true),
  enableOpenTracking: z.boolean().default(true),
  enableUnsubscribe: z.boolean().default(true),
  unsubscribeUrl: z.string().url().optional(),
  footerText: z.string().max(500).optional(),
  replyToEmail: z.string().email().optional(),
  fromName: z.string().max(100).optional()
});

export const rateLimitsSchema = z.object({
  dailyLimit: z.number().int().min(1, 'Daily limit must be at least 1').default(1000),
  hourlyLimit: z.number().int().min(1, 'Hourly limit must be at least 1').default(100),
  monthlyLimit: z.number().int().min(1).optional(),
  concurrentLimit: z.number().int().min(1).default(10)
});

export const createEmailConfigurationSchema = z.object({
  body: z.object({
    provider: z.nativeEnum(EmailProvider, {
      errorMap: () => ({ message: 'Invalid email provider' })
    }),
    smtpConfig: smtpConfigSchema,
    settings: emailSettingsSchema.default({}),
    rateLimits: rateLimitsSchema.default({}),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false)
  }).superRefine((data, ctx) => {
    // Validate that SMTP config is provided
    if (!data.smtpConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SMTP configuration is required',
        path: ['smtpConfig']
      });
    }
  })
});

export const updateEmailConfigurationSchema = z.object({
  body: z.object({
    provider: z.nativeEnum(EmailProvider).optional(),
    smtpConfig: smtpConfigSchema.optional(),
    settings: emailSettingsSchema.partial().optional(),
    rateLimits: rateLimitsSchema.partial().optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional()
  })
});

export const testEmailConfigurationSchema = z.object({
  body: z.object({
    testEmail: z.string().email('Valid test email is required').optional()
  })
});

// Email Template Validation Schemas
export const createEmailTemplateSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Template name is required')
      .max(100, 'Template name must be less than 100 characters')
      .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Template name can only contain letters, numbers, spaces, hyphens, and underscores'),
    subject: z.string()
      .min(1, 'Email subject is required')
      .max(200, 'Subject must be less than 200 characters'),
    htmlContent: z.string().min(1, 'HTML content is required'),
    textContent: z.string().optional(),
    category: z.nativeEnum(TemplateCategory, {
      errorMap: () => ({ message: 'Invalid template category' })
    }).default(TemplateCategory.NOTIFICATION),
    variables: z.array(z.string()).default([]),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    isActive: z.boolean().default(true),
    addToConfigurations: z.boolean().default(false)
  }).refine((data) => {
    // Extract variables from content
    const htmlVariables = (data.htmlContent.match(/\{\{[^}]+\}\}/g) || [])
      .map(v => v.replace(/[{}]/g, '').trim());
    const textVariables = data.textContent ? 
      (data.textContent.match(/\{\{[^}]+\}\}/g) || [])
        .map(v => v.replace(/[{}]/g, '').trim()) : [];
    const subjectVariables = (data.subject.match(/\{\{[^}]+\}\}/g) || [])
      .map(v => v.replace(/[{}]/g, '').trim());
    
    const allVariables = [...new Set([...htmlVariables, ...textVariables, ...subjectVariables])];
    
    // Auto-populate variables if not provided
    if (data.variables.length === 0) {
      data.variables = allVariables;
    }
    
    return true;
  })
});

export const updateEmailTemplateSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Template name is required')
      .max(100, 'Template name must be less than 100 characters')
      .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Template name can only contain letters, numbers, spaces, hyphens, and underscores')
      .optional(),
    subject: z.string()
      .min(1, 'Email subject is required')
      .max(200, 'Subject must be less than 200 characters')
      .optional(),
    htmlContent: z.string().min(1, 'HTML content is required').optional(),
    textContent: z.string().optional(),
    category: z.nativeEnum(TemplateCategory).optional(),
    variables: z.array(z.string()).optional(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    isActive: z.boolean().optional()
  })
});

export const duplicateEmailTemplateSchema = z.object({
  body: z.object({
    newName: z.string()
      .min(1, 'New template name is required')
      .max(100, 'Template name must be less than 100 characters')
      .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Template name can only contain letters, numbers, spaces, hyphens, and underscores')
  })
});

// Email Sending Validation Schemas
export const sendEmailSchema = z.object({
  body: z.object({
    to: z.union([
      z.string().email(),
      z.array(z.string().email())
    ], {
      errorMap: () => ({ message: 'Valid recipient email(s) required' })
    }),
    cc: z.union([
      z.string().email(),
      z.array(z.string().email())
    ]).optional(),
    bcc: z.union([
      z.string().email(),
      z.array(z.string().email())
    ]).optional(),
    subject: z.string().min(1, 'Email subject is required').max(200),
    templateName: z.string().optional(),
    templateData: z.record(z.any()).optional(),
    htmlContent: z.string().optional(),
    textContent: z.string().optional(),
    replyTo: z.string().email().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    scheduledFor: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional()
  }).superRefine((data, ctx) => {
    // Either templateName or htmlContent must be provided
    if (!data.templateName && !data.htmlContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either templateName or htmlContent must be provided',
        path: ['templateName']
      });
    }
  })
});

// Simpler schema for direct API calls (without nested body wrapper)
export const sendEmailSimpleSchema = z.object({
  to: z.union([
    z.string().email(),
    z.array(z.string().email())
  ], {
    errorMap: () => ({ message: 'Valid recipient email(s) required' })
  }),
  cc: z.union([
    z.string().email(),
    z.array(z.string().email())
  ]).optional(),
  bcc: z.union([
    z.string().email(),
    z.array(z.string().email())
  ]).optional(),
  subject: z.string().min(1, 'Email subject is required').max(200),
  htmlContent: z.string().min(1, 'Email content is required'),
  textContent: z.string().optional(),
  replyTo: z.string().email().optional(),
  orgId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const queueEmailSchema = z.object({
  body: z.object({
    to: z.union([
      z.string().email(),
      z.array(z.string().email())
    ]),
    cc: z.union([
      z.string().email(),
      z.array(z.string().email())
    ]).optional(),
    bcc: z.union([
      z.string().email(),
      z.array(z.string().email())
    ]).optional(),
    subject: z.string().min(1, 'Email subject is required').max(200),
    templateName: z.string().optional(),
    templateData: z.record(z.any()).optional(),
    htmlContent: z.string().optional(),
    textContent: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    scheduledFor: z.string().datetime().optional(),
    maxAttempts: z.number().int().min(1).max(10).default(3),
    metadata: z.record(z.any()).optional()
  }).superRefine((data, ctx) => {
    if (!data.templateName && !data.htmlContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either templateName or htmlContent must be provided',
        path: ['templateName']
      });
    }
  })
});

// Query Parameter Validation Schemas
export const emailConfigurationQuerySchema = z.object({
  query: z.object({
    provider: z.nativeEnum(EmailProvider).optional(),
    isActive: z.enum(['true', 'false']).optional()
  })
});

export const emailTemplateQuerySchema = z.object({
  query: z.object({
    category: z.nativeEnum(TemplateCategory).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().optional()
  })
});

export const emailLogQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    provider: z.nativeEnum(EmailProvider).optional(),
    templateId: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).default('1'),
    limit: z.string().regex(/^\d+$/).default('20')
  })
});

export const emailQueueQuerySchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    priority: z.enum(['low', 'normal', 'high']).optional(),
    page: z.string().regex(/^\d+$/).default('1'),
    limit: z.string().regex(/^\d+$/).default('20')
  })
});

export const emailAnalyticsQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    provider: z.nativeEnum(EmailProvider).optional(),
    templateId: z.string().optional()
  })
});

// Parameter Validation Schemas
export const orgIdParamSchema = z.object({
  params: z.object({
    orgId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID format')
  })
});

export const configIdParamSchema = z.object({
  params: z.object({
    orgId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID format'),
    configId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid configuration ID format')
  })
});

export const templateIdParamSchema = z.object({
  params: z.object({
    templateId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid template ID format')
  })
});

export const logIdParamSchema = z.object({
  params: z.object({
    logId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid log ID format')
  })
});

// Webhook Validation Schemas
export const sendGridWebhookSchema = z.object({
  body: z.array(z.object({
    email: z.string().email(),
    timestamp: z.number(),
    'smtp-id': z.string().optional(),
    event: z.string(),
    category: z.array(z.string()).optional(),
    sg_event_id: z.string(),
    sg_message_id: z.string(),
    reason: z.string().optional(),
    status: z.string().optional(),
    response: z.string().optional(),
    attempt: z.string().optional(),
    useragent: z.string().optional(),
    ip: z.string().optional(),
    url: z.string().optional()
  }))
});

export const mailgunWebhookSchema = z.object({
  body: z.object({
    signature: z.object({
      timestamp: z.string(),
      token: z.string(),
      signature: z.string()
    }),
    'event-data': z.object({
      event: z.string(),
      timestamp: z.number(),
      id: z.string(),
      'log-level': z.string().optional(),
      severity: z.string().optional(),
      reason: z.string().optional(),
      envelope: z.object({
        transport: z.string(),
        sender: z.string(),
        'sending-ip': z.string(),
        targets: z.string()
      }).optional(),
      flags: z.object({
        'is-routed': z.boolean().optional(),
        'is-authenticated': z.boolean().optional(),
        'is-system-test': z.boolean().optional(),
        'is-test-mode': z.boolean().optional()
      }).optional(),
      'recipient-domain': z.string().optional(),
      tags: z.array(z.string()).optional(),
      'delivery-status': z.object({
        'attempt-no': z.number().optional(),
        message: z.string().optional(),
        code: z.number().optional(),
        description: z.string().optional(),
        'session-seconds': z.number().optional()
      }).optional(),
      message: z.object({
        headers: z.object({
          'to': z.string(),
          'message-id': z.string(),
          'from': z.string(),
          'subject': z.string()
        })
      }).optional()
    })
  })
});

export const emailConfigStatusQuerySchema = z.object({
  params: z.object({
    orgId: z.string().min(1)
  })
});
