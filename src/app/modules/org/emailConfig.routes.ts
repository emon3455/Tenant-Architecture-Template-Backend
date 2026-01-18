import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import * as EmailConfigController from "./emailConfig.controller";
import * as EmailConfigValidation from "./emailConfig.validation";

const router = Router();

// Email Configuration Routes
router.post(
  "/setup",
  checkAuth(),
  validateRequest(EmailConfigValidation.setupEmailConfigSchema),
  EmailConfigController.setupEmailConfiguration
);

router.get(
  "/",
  checkAuth(),
  EmailConfigController.getEmailConfiguration
);

router.patch(
  "/",
  checkAuth(),
  validateRequest(EmailConfigValidation.updateEmailConfigSchema),
  EmailConfigController.updateEmailConfiguration
);

router.post(
  "/test",
  checkAuth(),
  validateRequest(EmailConfigValidation.testEmailConfigSchema),
  EmailConfigController.testEmailConfiguration
);

router.delete(
  "/",
  checkAuth(),
  EmailConfigController.deleteEmailConfiguration
);

// Email Templates Routes
router.post(
  "/templates",
  checkAuth(),
  validateRequest(EmailConfigValidation.emailTemplateSchema),
  EmailConfigController.addEmailTemplate
);

router.get(
  "/templates",
  checkAuth(),
  EmailConfigController.getEmailTemplates
);

router.patch(
  "/templates/:templateName",
  checkAuth(),
  validateRequest(EmailConfigValidation.updateEmailTemplateSchema),
  EmailConfigController.updateEmailTemplate
);

router.delete(
  "/templates/:templateName",
  checkAuth(),
  EmailConfigController.deleteEmailTemplate
);

router.post(
  "/templates/initialize-defaults",
  checkAuth(),
  EmailConfigController.initializeDefaultTemplate
);

// Provider-specific routes
router.get(
  "/providers",
  checkAuth(),
  EmailConfigController.getAvailableProviders
);

// Send test email
router.post(
  "/send-test",
  checkAuth(),
  validateRequest(EmailConfigValidation.sendEmailSchema),
  EmailConfigController.sendTestEmail
);

export const EmailConfigRoutes = router;