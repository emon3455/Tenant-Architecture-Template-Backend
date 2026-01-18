// NOTE: Only SMTP email provider is supported (via nodemailer)
import { Types } from 'mongoose';
import nodemailer from 'nodemailer';
import {
  IEmailConfiguration,
  IEmailLog,
  IEmailLogDocument,
  IEmailOptions,
  IEmailServiceResponse
} from './email.interface';
import { EmailProvider, EmailStatus } from '../emailLog/emailLog.interface';
import { EmailLog, EmailQueue } from '../emailLog/emailLog.model';
import AppError from '../../errorHelpers/AppError';
import { EmailLogService } from '../emailLog/emailLog.service';
/**
 * Send email using organization's email configuration
 */
const sendEmail = async (
  orgId: Types.ObjectId,
  options: IEmailOptions
): Promise<IEmailServiceResponse> => {
  // We'll keep processedContent accessible for fallbacks
  let emailConfig: any | undefined;
  let processedContent: Partial<IEmailOptions> = {};
  try {
    // Get email configuration for the organization
    emailConfig = await getEmailConfiguration(orgId);

    // Validate rate limits
    await validateRateLimits(emailConfig);

    // Process template if provided
    processedContent = await processEmailTemplate(
      emailConfig,
      options
    );

    // DEBUG: Check what processedContent contains
    // console.log('=== DEBUG: Template Processing ===');
    // console.log('Original options templateData:', options.templateData);
    // console.log('Processed content keys:', Object.keys(processedContent));
    // console.log('Processed HTML content:', processedContent.htmlContent);
    // console.log('Processed Text content:', processedContent.textContent);
    // console.log('================================');

    // Merge processed content with options
    const emailOptions = {
      ...options,
      ...processedContent
    };

    // Create email body string for logging - USE THIS
    const emailBody = emailOptions.htmlContent || emailOptions.textContent || 'No content available';

    // Prepare attachments for logging - USE THIS
    const logAttachments = emailOptions.attachments?.map(attachment => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.content ? attachment.content.length : 0,
      path: (attachment as any).path || undefined
    })) || [];

    // Log final email content
    // console.log('=== FINAL EMAIL CONTENT ===');
    // console.log('Subject:', emailOptions.subject);
    // console.log('To:', emailOptions.to);
    // console.log('HTML Content Length:', emailOptions.htmlContent?.length);
    // console.log('Text Content Length:', emailOptions.textContent?.length);
    // console.log('Body String Length:', emailBody.length);
    // console.log('Attachments Count:', logAttachments.length);

    // Show preview of content
    // Send email via SMTP
    const result: IEmailServiceResponse = await sendWithSMTP(emailConfig, emailOptions);
    
    // Log email
    const logId = await logEmail(emailConfig, emailOptions, result, emailBody, logAttachments);
    result.logId = logId;

    return result;
  } catch (error) {
    // Log failed email attempt
    try {
      const emailBody = options.htmlContent || options.textContent || (processedContent.htmlContent || processedContent.textContent) || 'No content available';
      const logAttachments = options.attachments?.map(attachment => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.content ? attachment.content.length : 0,
        path: (attachment as any).path || undefined
      })) || [];

      await logEmailError(orgId, options, (error as Error) || new Error('Unknown error'), emailBody, logAttachments);
    } catch (logError) {
      // Silent fail on logging
    }

    // Propagate as AppError
    throw error instanceof AppError ? error : new AppError(500, 'Failed to send email');
  }
};

/**
 * Queue email for background processing
 */
const queueEmail = async (
  orgId: Types.ObjectId,
  options: IEmailOptions & {
    priority?: 'low' | 'normal' | 'high';
    scheduledFor?: Date;
    maxAttempts?: number;
  }
): Promise<Types.ObjectId> => {
  const emailConfig = await getEmailConfiguration(orgId);

  const queueItem = new EmailQueue({
    orgId,
    configurationId: emailConfig._id,
    to: Array.isArray(options.to) ? options.to : [options.to],
    cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
    bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
    subject: options.subject,
    templateData: options.templateData,
    priority: options.priority || 'normal',
    scheduledFor: options.scheduledFor || new Date(),
    maxAttempts: options.maxAttempts || 3,
    metadata: options.metadata
  });

  if (options.templateName) {
    // Template is now stored in org configuration, so we just store the name
    queueItem.templateName = options.templateName;
  }

  await queueItem.save();
  return queueItem._id as Types.ObjectId;
};

/**
 * Process queued emails
 */
const processEmailQueue = async (): Promise<void> => {
  const queueItems = await EmailQueue.find({
    status: 'pending',
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: { $exists: false } }
    ]
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(10);

  for (const item of queueItems) {
    try {
      // Mark as processing
      item.status = 'processing';
      item.lastAttemptAt = new Date();
      await item.save();

      // Prepare email options
      const emailOptions: IEmailOptions = {
        to: item.to,
        cc: item.cc,
        bcc: item.bcc,
        subject: item.subject,
        templateData: item.templateData,
        metadata: item.metadata
      };

      // Add template name if exists
      if (item.templateName) {
        emailOptions.templateName = item.templateName;
      }

      // Send email
      await sendEmail(item.orgId, emailOptions);

      // Mark as completed
      item.status = 'completed';
      await item.save();

    } catch (error) {
      console.error(`Failed to process queue item ${item._id}:`, error);

      item.attempts += 1;
      item.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (item.attempts >= item.maxAttempts) {
        item.status = 'failed';
      } else {
        item.status = 'pending';
        item.nextAttemptAt = new Date(Date.now() + Math.pow(2, item.attempts) * 60000); // Exponential backoff
      }

      await item.save();
    }
  }
};

/**
 * Get email configuration for organization from org model
 */
const getEmailConfiguration = async (orgId: Types.ObjectId) => {
  const { Org } = await import('../org/org.model');

  const org = await Org.findById(orgId).select('emailConfiguration');

  if (!org) {
    throw new AppError(404, 'Organization not found');
  }

  if (!org.emailConfiguration) {
    throw new AppError(404, 'No email configuration found for organization');
  }

  if (!org.emailConfiguration.isActive) {
    throw new AppError(400, 'Email configuration is not active');
  }

  // Convert Mongoose document to plain object to avoid internal properties
  const emailConfig = (org.emailConfiguration as any).toObject ?
    (org.emailConfiguration as any).toObject() :
    (org.emailConfiguration as any)._doc || org.emailConfiguration;

  // console.log('Processed email configuration:', emailConfig);

  // Return configuration with orgId added for compatibility
  return {
    ...emailConfig,
    _id: org._id, // Use org ID as config ID
    orgId: org._id
  };
};

/**
 * Validate rate limits
 */
const validateRateLimits = async (config: any): Promise<void> => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  // Check daily limit
  const dailyCount = await EmailLog.countDocuments({
    orgId: config.orgId,
    configurationId: config._id,
    createdAt: { $gte: today }
  });

  if (dailyCount >= (config.rateLimits?.dailyLimit || 1000)) {
    throw new AppError(429, 'Daily email limit exceeded');
  }

  // Check hourly limit
  const hourlyCount = await EmailLog.countDocuments({
    orgId: config.orgId,
    configurationId: config._id,
    createdAt: { $gte: thisHour }
  });

  if (hourlyCount >= (config.rateLimits?.hourlyLimit || 100)) {
    throw new AppError(429, 'Hourly email limit exceeded');
  }

  // Check monthly limit if set
  if (config.rateLimits?.monthlyLimit) {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyCount = await EmailLog.countDocuments({
      orgId: config.orgId,
      configurationId: config._id,
      createdAt: { $gte: thisMonth }
    });

    if (monthlyCount >= config.rateLimits.monthlyLimit) {
      throw new AppError(429, 'Monthly email limit exceeded');
    }
  }
};

/**
 * Process email template with simple variable replacement
 */
const processEmailTemplate = async (
  config: any,
  options: IEmailOptions
): Promise<Partial<IEmailOptions>> => {
  if (!options.templateName) {
    return {};
  }

  // Find template in org's email configuration
  const template = config.templates?.find((t: any) => t.name === options.templateName);

  if (!template) {
    // Fallback: try rendering from filesystem EJS templates to remain fully functional
    try {
      const ejs = (await import('ejs')).default as any;
      const path = await import('path');
      const fs = await import('fs');

      const candidates = [
        path.join(process.cwd(), 'templates', `${options.templateName}.ejs`),
        path.resolve(__dirname, '../../../../templates', `${options.templateName}.ejs`),
        path.resolve(__dirname, '../../../templates', `${options.templateName}.ejs`)
      ];

      const existing = candidates.find(p => fs.existsSync(p));
      if (!existing) {
        throw new AppError(404, `Email template '${options.templateName}' not found`);
      }

      const html = await ejs.renderFile(existing, options.templateData || {});
      return {
        // Keep provided subject; only supply body from EJS
        htmlContent: html
      };
    } catch (e) {
      // Propagate as not found to let caller decide on fallback
      throw new AppError(404, `Email template '${options.templateName}' not found`);
    }
  }

  const templateData = options.templateData || {};

  // Add organization and configuration data to template context
  const context = {
    ...templateData,
    org: {
      name: config.senderInfo?.fromName || 'Organization'
    },
    unsubscribeUrl: config.settings?.unsubscribeUrl,
    footerText: config.settings?.footerText
  };

  // Simple template variable replacement
  let processedSubject = template.subject;
  let processedHtml = template.htmlContent;
  let processedText = template.textContent || '';

  // Replace variables in the format {{variableName}}
  Object.keys(context).forEach(key => {
    const value = context[key as keyof typeof context];
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');

    if (typeof value === 'string') {
      processedSubject = processedSubject.replace(regex, value);
      processedHtml = processedHtml.replace(regex, value);
      processedText = processedText.replace(regex, value);
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested objects like {{org.name}}
      Object.keys(value).forEach(nestedKey => {
        const nestedValue = (value as any)[nestedKey];
        const nestedRegex = new RegExp(`{{\\s*${key}\\.${nestedKey}\\s*}}`, 'g');
        if (typeof nestedValue === 'string') {
          processedSubject = processedSubject.replace(nestedRegex, nestedValue);
          processedHtml = processedHtml.replace(nestedRegex, nestedValue);
          processedText = processedText.replace(nestedRegex, nestedValue);
        }
      });
    }
  });

  return {
    subject: processedSubject,
    htmlContent: processedHtml,
    textContent: processedText || undefined
  };
};

/**
 * Send email via SMTP
 */
const sendWithSMTP = async (
  config: any,
  options: IEmailOptions
): Promise<IEmailServiceResponse> => {
  if (!config.smtpConfig?.host || !config.smtpConfig?.auth?.user) {
    throw new AppError(400, 'SMTP configuration incomplete');
  }

  // Helpful diagnostics for common misconfiguration
  try {
    const hostStr = String(config.smtpConfig.host || '').toLowerCase();
    const portNum = Number(config.smtpConfig.port);
    const secure = !!config.smtpConfig.secure;
    if (hostStr.includes('gmail') || hostStr.includes('google')) {
      const okPorts = [465, 587];
      if (!okPorts.includes(portNum)) {
        console.warn(`SMTP warning: Gmail host detected but non-standard port ${portNum}. Recommended ports: 465 (secure) or 587 (TLS).`);
      }
      if (secure && portNum !== 465) {
        console.warn('SMTP warning: secure=true typically pairs with port 465 for Gmail.');
      }
    }
  } catch { /* ignore diagnostics errors */ }

  const transporter = nodemailer.createTransport({
    host: config.smtpConfig.host,
    port: config.smtpConfig.port,
    secure: config.smtpConfig.secure,
    auth: config.smtpConfig.auth,
    tls: config.smtpConfig.tls
  });

  const mailOptions = {
    from: `${config.senderInfo?.fromName || 'Sender'} <${config.smtpConfig.auth.user}>`,
    to: Array.isArray(options.to) ? options.to.join(',') : options.to,
    cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined,
    bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined,
    replyTo: config.senderInfo?.replyToEmail,
    subject: options.subject,
    html: options.htmlContent,
    text: options.textContent,
    attachments: options.attachments?.map(att => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content as string, 'base64'),
      contentType: att.contentType
    }))
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,
    messageId: info.messageId,
    provider: EmailProvider.SMTP,
    message: 'Email sent successfully via SMTP',
    providerResponse: info
  };
};

/**
 * Log email - REGULAR EMAILS
 */
const logEmail = async (
  emailConfig: IEmailConfiguration,
  emailOptions: any,
  result: IEmailServiceResponse,
  body: string,
  attachments: any[]
): Promise<Types.ObjectId> => {
  try {
    const logData: Partial<IEmailLog> = {
      orgId: emailConfig.orgId,
      to: Array.isArray(emailOptions.to) ? emailOptions.to : [emailOptions.to],
      cc: emailOptions.cc ? (Array.isArray(emailOptions.cc) ? emailOptions.cc : [emailOptions.cc]) : undefined,
      bcc: emailOptions.bcc ? (Array.isArray(emailOptions.bcc) ? emailOptions.bcc : [emailOptions.bcc]) : undefined,
      from: config.smtpConfig?.auth?.user || 'noreply@example.com',
      subject: emailOptions.subject,
      body: body,
      attachments: attachments,
      status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
      provider: emailConfig.provider,
      providerMessageId: result.messageId,
      providerResponse: result.providerResponse,
      retryCount: 0,
      maxRetries: 3,
      sentAt: new Date(),
      metadata: {
        templateName: emailOptions.templateName,
        type: 'outbound',
        isSystemEmail: false, // ← ADD THIS: explicitly false for regular emails
        ...emailOptions.metadata
      }
    };

    const emailLog = await EmailLogService.createEmailLog(logData) as IEmailLogDocument;
    return emailLog._id;
  } catch (error) {
    console.error('Failed to log email:', error);
    throw error;
  }
};

/**
 * Log email error - REGULAR EMAILS
 */
const logEmailError = async (
  orgId: Types.ObjectId,
  options: IEmailOptions,
  error: Error,
  body?: string,
  attachments?: any[]
): Promise<void> => {
  try {
    const logData: Partial<IEmailLog> = {
      orgId,
      to: Array.isArray(options.to) ? options.to : [options.to],
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      from: 'noreply@example.com',
      subject: options.subject,
      body: body || 'No content available',
      attachments: attachments || [],
      status: EmailStatus.FAILED,
      provider: EmailProvider.SENDGRID,
      errorMessage: error.message,
      retryCount: 0,
      maxRetries: 3,
      metadata: {
        templateName: options.templateName,
        type: 'outbound',
        isSystemEmail: false, // ← ADD THIS: explicitly false for regular emails
        ...options.metadata
      }
    };

    await EmailLogService.createEmailLog(logData);
    console.log("############# logged regular email (failed)");
  } catch (logError) {
    console.error('**********************Failed to log email error:', logError);
  }
};

/**
 * Get from address based on configuration
 */
const getFromAddress = (config: any): string => {
  switch (config.provider) {
    case EmailProvider.SENDGRID:
      return config.sendgridConfig?.verifiedSender || '';
    case EmailProvider.MAILGUN:
      return `noreply@${config.mailgunConfig?.domain || 'localhost'}`;
    case EmailProvider.SMTP:
      return config.smtpConfig?.auth?.user || '';
    default:
      return '';
  }
};

/**
 * Test email configuration
 */
const testEmailConfiguration = async (orgId: Types.ObjectId): Promise<IEmailServiceResponse> => {
  const { Org } = await import('../org/org.model');

  const org = await Org.findById(orgId);
  if (!org || !org.emailConfiguration) {
    throw new AppError(404, 'Email configuration not found');
  }

  const config = org.emailConfiguration;

  const testOptions: IEmailOptions = {
    to: config.senderInfo?.replyToEmail || 'test@example.com',
    subject: 'Test Email Configuration',
    htmlContent: '<h1>Test Email</h1><p>This is a test email to verify your email configuration.</p>',
    textContent: 'This is a test email to verify your email configuration.'
  };

  try {
    const result = await sendEmail(orgId, testOptions);
    console.log('✅ Test email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    throw error;
  }
};

// Export all functions as a service object  
const EmailService = {
  sendEmail,
  queueEmail,
  processEmailQueue,
  testEmailConfiguration
};

export default EmailService;