import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import AppError from '../../errorHelpers/AppError';
import {
  EmailConfiguration,
  EmailTemplate
} from './email.model';
import { EmailLog, EmailQueue } from '../emailLog/emailLog.model';
import emailService from './email.service';
import {
  EmailProvider,
  TemplateCategory,
  EmailStatus,
  IEmailAnalytics
} from './email.interface';

// Email Configuration Controllers
export const createEmailConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const configData = {
    ...req.body,
    orgId: new Types.ObjectId(orgId),
    createdBy: (req as any).user._id
  };

  // If this is set as default, update other configurations
  if (configData.isDefault) {
    await EmailConfiguration.updateMany(
      { orgId: new Types.ObjectId(orgId) },
      { isDefault: false }
    );
  }

  const emailConfig = new EmailConfiguration(configData);
  await emailConfig.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Email configuration created successfully',
    data: emailConfig
  });
});

export const getEmailConfigurations = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { provider, isActive } = req.query;

  const filter: any = { orgId: new Types.ObjectId(orgId) };
  
  if (provider) {
    filter.provider = provider;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const configurations = await EmailConfiguration.find(filter)
    .populate('templates', 'name category isActive')
    .populate('createdBy', 'name email')
    .sort({ isDefault: -1, createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email configurations retrieved successfully',
    data: configurations
  });
});

export const getEmailConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { orgId, configId } = req.params;

  const configuration = await EmailConfiguration.findOne({
    _id: new Types.ObjectId(configId),
    orgId: new Types.ObjectId(orgId)
  })
    .populate('templates')
    .populate('createdBy', 'name email');

  if (!configuration) {
    throw new AppError(404, 'Email configuration not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email configuration retrieved successfully',
    data: configuration
  });
});

export const updateEmailConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { orgId, configId } = req.params;

  // If updating to default, unset other defaults
  if (req.body.isDefault) {
    await EmailConfiguration.updateMany(
      { orgId: new Types.ObjectId(orgId), _id: { $ne: new Types.ObjectId(configId) } },
      { isDefault: false }
    );
  }

  const configuration = await EmailConfiguration.findOneAndUpdate(
    {
      _id: new Types.ObjectId(configId),
      orgId: new Types.ObjectId(orgId)
    },
    req.body,
    { new: true, runValidators: true }
  ).populate('templates');

  if (!configuration) {
    throw new AppError(404, 'Email configuration not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email configuration updated successfully',
    data: configuration
  });
});

export const deleteEmailConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { orgId, configId } = req.params;

  const configuration = await EmailConfiguration.findOneAndDelete({
    _id: new Types.ObjectId(configId),
    orgId: new Types.ObjectId(orgId)
  });

  if (!configuration) {
    throw new AppError(404, 'Email configuration not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email configuration deleted successfully',
    data: null
  });
});

export const testEmailConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { configId } = req.params;
  const { testEmail } = req.body;

  const result = await emailService.testEmailConfiguration(new Types.ObjectId(configId));

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email configuration test completed',
    data: result
  });
});

// Email Template Controllers
export const createEmailTemplate = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  
  const templateData = {
    ...req.body,
    createdBy: (req as any).user._id
  };

  const template = new EmailTemplate(templateData);
  await template.save();

  // Add template to organization's email configurations if specified
  if (req.body.addToConfigurations) {
    await EmailConfiguration.updateMany(
      { orgId: new Types.ObjectId(orgId), isActive: true },
      { $addToSet: { templates: template._id } }
    );
  }

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Email template created successfully',
    data: template
  });
});

export const getEmailTemplates = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { category, isActive, search } = req.query;

  const filter: any = {};
  
  if (category) {
    filter.category = category;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const templates = await EmailTemplate.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email templates retrieved successfully',
    data: templates
  });
});

export const getEmailTemplate = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;

  const template = await EmailTemplate.findById(templateId)
    .populate('createdBy', 'name email');

  if (!template) {
    throw new AppError(404, 'Email template not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email template retrieved successfully',
    data: template
  });
});

export const updateEmailTemplate = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;

  // Increment version if content is being updated
  const updateData = { ...req.body };
  if (req.body.htmlContent || req.body.textContent || req.body.subject) {
    updateData.$inc = { version: 1 };
  }

  const template = await EmailTemplate.findByIdAndUpdate(
    templateId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!template) {
    throw new AppError(404, 'Email template not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email template updated successfully',
    data: template
  });
});

export const deleteEmailTemplate = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;

  const template = await EmailTemplate.findByIdAndDelete(templateId);

  if (!template) {
    throw new AppError(404, 'Email template not found');
  }

  // Remove template from all configurations
  await EmailConfiguration.updateMany(
    { templates: templateId },
    { $pull: { templates: templateId } }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email template deleted successfully',
    data: null
  });
});

export const duplicateEmailTemplate = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { newName } = req.body;

  const originalTemplate = await EmailTemplate.findById(templateId);
  if (!originalTemplate) {
    throw new AppError(404, 'Email template not found');
  }

  const duplicatedTemplate = new EmailTemplate({
    name: newName || `${originalTemplate.name} (Copy)`,
    subject: originalTemplate.subject,
    htmlContent: originalTemplate.htmlContent,
    textContent: originalTemplate.textContent,
    category: originalTemplate.category,
    variables: originalTemplate.variables,
    description: originalTemplate.description,
    createdBy: (req as any).user._id,
    isActive: false // Start as inactive for review
  });

  await duplicatedTemplate.save();

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Email template duplicated successfully',
    data: duplicatedTemplate
  });
});

// Email Sending Controllers
// Simple send without orgId in params - uses orgId from body or user context
export const sendEmailSimple = catchAsync(async (req: Request, res: Response) => {

  const emailOptions = req.body;

  if (!req?.orgId) {
    throw new Error('Organization ID is required');
  }

  const result = await emailService.sendEmail(new Types.ObjectId(req?.orgId), emailOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email sent successfully',
    data: result
  });
});

export const sendEmail = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const emailOptions = req.body;

  const result = await emailService.sendEmail(new Types.ObjectId(orgId), emailOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email sent successfully',
    data: result
  });
});

export const queueEmail = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const emailOptions = req.body;

  const queueId = await emailService.queueEmail(new Types.ObjectId(orgId), emailOptions);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Email queued successfully',
    data: { queueId }
  });
});

export const processEmailQueue = catchAsync(async (req: Request, res: Response) => {
  await emailService.processEmailQueue();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email queue processed successfully',
    data: null
  });
});

// Email Log Controllers
export const getEmailLogs = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { 
    status, 
    provider, 
    templateId, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 20 
  } = req.query;

  const filter: any = { orgId: new Types.ObjectId(orgId) };
  
  if (status) {
    filter.status = status;
  }
  if (provider) {
    filter.provider = provider;
  }
  if (templateId) {
    filter.templateId = new Types.ObjectId(templateId as string);
  }
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate as string);
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .populate('templateId', 'name category')
      .populate('configurationId', 'provider')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    EmailLog.countDocuments(filter)
  ]);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email logs retrieved successfully',
    data: {
      logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    }
  });
});

export const getEmailLog = catchAsync(async (req: Request, res: Response) => {
  const { logId } = req.params;

  const log = await EmailLog.findById(logId)
    .populate('templateId', 'name category')
    .populate('configurationId', 'provider settings.fromName');

  if (!log) {
    throw new AppError(404, 'Email log not found');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email log retrieved successfully',
    data: log
  });
});

export const retryFailedEmail = catchAsync(async (req: Request, res: Response) => {
  const { logId } = req.params;

  const log = await EmailLog.findById(logId);
  if (!log) {
    throw new AppError(404, 'Email log not found');
  }

  if (log.status !== EmailStatus.FAILED) {
    throw new AppError(400, 'Only failed emails can be retried');
  }

  if (log.retryCount >= log.maxRetries) {
    throw new AppError(400, 'Maximum retry attempts exceeded');
  }

  // Create a new email queue item for retry
  const queueId = await emailService.queueEmail(log.orgId, {
    to: log.to,
    cc: log.cc,
    bcc: log.bcc,
    subject: log.subject,
    metadata: log.metadata
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email retry queued successfully',
    data: { queueId }
  });
});

// Email Analytics Controllers
export const getEmailAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { startDate, endDate, provider, templateId } = req.query;

  const filter: any = { orgId: new Types.ObjectId(orgId) };
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate as string);
    }
  }

  // Get basic statistics
  const [
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalUnsubscribed,
    providerStats,
    templateStats
  ] = await Promise.all([
    EmailLog.countDocuments({ ...filter, status: EmailStatus.SENT }),
    EmailLog.countDocuments({ ...filter, status: EmailStatus.DELIVERED }),
    EmailLog.countDocuments({ ...filter, status: EmailStatus.OPENED }),
    EmailLog.countDocuments({ ...filter, status: EmailStatus.CLICKED }),
    EmailLog.countDocuments({ ...filter, status: EmailStatus.BOUNCED }),
    EmailLog.countDocuments({ ...filter, status: EmailStatus.UNSUBSCRIBED }),
    
    // Provider statistics
    EmailLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$provider',
          sent: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.SENT] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.DELIVERED] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.FAILED] }, 1, 0] } }
        }
      }
    ]),
    
    // Template statistics
    EmailLog.aggregate([
      { $match: { ...filter, templateId: { $exists: true } } },
      {
        $lookup: {
          from: 'emailtemplates',
          localField: 'templateId',
          foreignField: '_id',
          as: 'template'
        }
      },
      { $unwind: '$template' },
      {
        $group: {
          _id: '$template.name',
          sent: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.SENT] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.OPENED] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.CLICKED] }, 1, 0] } }
        }
      }
    ])
  ]);

  // Calculate rates
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
  const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const unsubscribeRate = totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0;

  // Format provider stats
  const byProvider = providerStats.reduce((acc: any, stat: any) => {
    acc[stat._id] = {
      sent: stat.sent,
      delivered: stat.delivered,
      failed: stat.failed
    };
    return acc;
  }, {});

  // Format template stats
  const byTemplate = templateStats.reduce((acc: any, stat: any) => {
    acc[stat._id] = {
      sent: stat.sent,
      opened: stat.opened,
      clicked: stat.clicked
    };
    return acc;
  }, {});

  // Get timeline data (last 30 days)
  const timelineData = await EmailLog.aggregate([
    {
      $match: {
        ...filter,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sent: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.SENT] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.DELIVERED] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.OPENED] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', EmailStatus.CLICKED] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const timeline = timelineData.map(item => ({
    date: item._id,
    sent: item.sent,
    delivered: item.delivered,
    opened: item.opened,
    clicked: item.clicked
  }));

  const analytics: IEmailAnalytics = {
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    totalUnsubscribed,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    bounceRate: Math.round(bounceRate * 100) / 100,
    unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
    byProvider,
    byTemplate,
    timeline
  };

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email analytics retrieved successfully',
    data: analytics
  });
});

// Webhook Controllers
export const handleSendGridWebhook = catchAsync(async (req: Request, res: Response) => {
  
  // SendGrid sends events as an array directly in req.body
  const events = Array.isArray(req.body) ? req.body : [req.body];
  await emailService.handleWebhook(EmailProvider.SENDGRID, events);
  
  res.status(200).send('OK');
});

export const handleMailgunWebhook = catchAsync(async (req: Request, res: Response) => {
  await emailService.handleWebhook(EmailProvider.MAILGUN, req.body);
  
  res.status(200).send('OK');
});

// Queue Management Controllers
export const getEmailQueue = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;
  const { status, priority, page = 1, limit = 20 } = req.query;

  const filter: any = { orgId: new Types.ObjectId(orgId) };
  
  if (status) {
    filter.status = status;
  }
  if (priority) {
    filter.priority = priority;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [queueItems, total] = await Promise.all([
    EmailQueue.find(filter)
      .populate('templateId', 'name category')
      .populate('configurationId', 'provider')
      .sort({ priority: -1, createdAt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    EmailQueue.countDocuments(filter)
  ]);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Email queue retrieved successfully',
    data: {
      queueItems,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    }
  });
});

export const clearFailedEmails = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;

  const result = await EmailQueue.deleteMany({
    orgId: new Types.ObjectId(orgId),
    status: 'failed'
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${result.deletedCount} failed emails cleared from queue`,
    data: { deletedCount: result.deletedCount }
  });
});


export const getEmailConfigurationStatus = catchAsync(async (req: Request, res: Response) => {
  const { orgId } = req.params;

  // Load organization with email configuration
  const { Org } = await import('../org/org.model');
  const org = await Org.findById(orgId).select('emailConfiguration');

  // No configuration at all
  if (!org || !org.emailConfiguration) {
    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "No email configuration found",
      data: { configured: false }
    });
  }

  const config = org.emailConfiguration;

  // Detect "incomplete configuration" (common issue)
  const isMissingProviderData =
    (config.provider === 'SENDGRID' &&
      (!config.sendgridConfig?.apiKey || !config.sendgridConfig?.verifiedSender)) ||
    (config.provider === 'MAILGUN' &&
      (!config.mailgunConfig?.apiKey || !config.mailgunConfig?.domain)) ||
    (config.provider === 'SMTP' &&
      (!config.smtpConfig?.host || !config.smtpConfig?.auth?.user));

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Email configuration status retrieved",
    data: {
      configured: true,
      provider: config.provider,
      isActive: config.isActive,
      isComplete: !isMissingProviderData,
      senderInfo: config.senderInfo || null,
      settings: {
        enableEmailTracking: config.settings?.enableEmailTracking,
        enableOpenTracking: config.settings?.enableOpenTracking,
        enableClickTracking: config.settings?.enableClickTracking
      }
    }
  });
});

