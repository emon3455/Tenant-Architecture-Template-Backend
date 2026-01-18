// Email Module Exports
export * from './email.interface';
export * from './email.model';
export * from './email.service';
export * from './email.controller';
export * from './email.validation';
export { default as emailRoutes } from './email.routes';
export { default as emailService } from './email.service';

// Re-export commonly used types and enums
export {
  EmailProvider,
  EmailStatus,
  TemplateCategory,
  type IEmailOptions,
  type IEmailServiceResponse,
  type IEmailConfiguration,
  type IEmailTemplate,
  type IEmailAnalytics
} from './email.interface';

// Re-export models for external use
export {
  EmailConfiguration,
  EmailTemplate
} from './email.model';

// EmailLog and EmailQueue are now handled by the dedicated emailLog module
export { EmailLog, EmailQueue } from '../emailLog/emailLog.model';