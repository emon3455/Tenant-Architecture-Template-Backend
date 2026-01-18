import { Router } from 'express';
import { checkAuth } from '../../middlewares/checkAuth';
import { validateRequest } from '../../middlewares/validateRequest';
import {
  // Email Configuration Controllers
  createEmailConfiguration,
  getEmailConfigurations,
  getEmailConfiguration,
  updateEmailConfiguration,
  deleteEmailConfiguration,
  testEmailConfiguration,
  
  // Email Template Controllers
  createEmailTemplate,
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  
  // Email Sending Controllers
  sendEmail,
  sendEmailSimple,
  queueEmail,
  processEmailQueue,
  
  // Email Log Controllers
  getEmailLogs,
  getEmailLog,
  retryFailedEmail,
  
  // Email Analytics Controllers
  getEmailAnalytics,
  
  // Queue Management Controllers
  getEmailQueue,
  clearFailedEmails,

  getEmailConfigurationStatus
} from './email.controller';

import {
  // Email Configuration Validation
  createEmailConfigurationSchema,
  updateEmailConfigurationSchema,
  testEmailConfigurationSchema,
  emailConfigurationQuerySchema,
  
  // Email Template Validation
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  duplicateEmailTemplateSchema,
  emailTemplateQuerySchema,
  
  // Email Sending Validation
  sendEmailSchema,
  sendEmailSimpleSchema,
  queueEmailSchema,
  
  // Query and Parameter Validation
  emailLogQuerySchema,
  emailQueueQuerySchema,
  emailAnalyticsQuerySchema,
  orgIdParamSchema,
  configIdParamSchema,
  templateIdParamSchema,
  logIdParamSchema
} from './email.validation';

const router = Router();

// Email Configuration Routes
router.post(
  '/organizations/:orgId/configurations',
  validateRequest(createEmailConfigurationSchema),
  validateRequest(orgIdParamSchema),
  createEmailConfiguration
);

router.get(
  '/organizations/:orgId/configurations',
  validateRequest(emailConfigurationQuerySchema),
  validateRequest(orgIdParamSchema),
  getEmailConfigurations
);

router.get(
  '/organizations/:orgId/configurations/:configId',
  validateRequest(configIdParamSchema),
  getEmailConfiguration
);

router.patch(
  '/organizations/:orgId/configurations/:configId',
  validateRequest(updateEmailConfigurationSchema),
  validateRequest(configIdParamSchema),
  updateEmailConfiguration
);

router.delete(
  '/organizations/:orgId/configurations/:configId',
  validateRequest(configIdParamSchema),
  deleteEmailConfiguration
);

router.post(
  '/configurations/:configId/test',
  validateRequest(testEmailConfigurationSchema),
  testEmailConfiguration
);

// Email Template Routes
router.post(
  '/organizations/:orgId/templates',
  validateRequest(createEmailTemplateSchema),
  validateRequest(orgIdParamSchema),
  createEmailTemplate
);

router.get(
  '/organizations/:orgId/templates',
  validateRequest(emailTemplateQuerySchema),
  validateRequest(orgIdParamSchema),
  getEmailTemplates
);

router.get(
  '/templates/:templateId',
  validateRequest(templateIdParamSchema),
  getEmailTemplate
);

router.patch(
  '/templates/:templateId',
  validateRequest(updateEmailTemplateSchema),
  validateRequest(templateIdParamSchema),
  updateEmailTemplate
);

router.delete(
  '/templates/:templateId',
  validateRequest(templateIdParamSchema),
  deleteEmailTemplate
);

router.post(
  '/templates/:templateId/duplicate',
  validateRequest(duplicateEmailTemplateSchema),
  validateRequest(templateIdParamSchema),
  duplicateEmailTemplate
);

// Email Sending Routes
// Simple send route without orgId in path (uses orgId from body or auth context)
router.post(
  '/',
  checkAuth(),
  validateRequest(sendEmailSimpleSchema),
  sendEmailSimple
);

router.post(
  '/organizations/:orgId/send',
  validateRequest(sendEmailSchema),
  validateRequest(orgIdParamSchema),
  sendEmail
);

router.post(
  '/organizations/:orgId/queue',
  validateRequest(queueEmailSchema),
  validateRequest(orgIdParamSchema),
  queueEmail
);

router.post(
  '/queue/process',
  processEmailQueue
);

// Email Log Routes
router.get(
  '/organizations/:orgId/logs',
  validateRequest(emailLogQuerySchema),
  validateRequest(orgIdParamSchema),
  getEmailLogs
);

router.get(
  '/logs/:logId',
  validateRequest(logIdParamSchema),
  getEmailLog
);

router.post(
  '/logs/:logId/retry',
  validateRequest(logIdParamSchema),
  retryFailedEmail
);

// Email Analytics Routes
router.get(
  '/organizations/:orgId/analytics',
  validateRequest(emailAnalyticsQuerySchema),
  validateRequest(orgIdParamSchema),
  getEmailAnalytics
);

// Email Queue Management Routes
router.get(
  '/organizations/:orgId/queue',
  validateRequest(emailQueueQuerySchema),
  validateRequest(orgIdParamSchema),
  getEmailQueue
);

router.delete(
  '/organizations/:orgId/queue/failed',
  validateRequest(orgIdParamSchema),
  clearFailedEmails
);

// Health Check Route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email service is healthy',
    timestamp: new Date().toISOString()
  });
});

router.get(
  '/organizations/:orgId/configuration-status',
  // validateRequest(orgIdParamSchema),
  getEmailConfigurationStatus
);


export default router;