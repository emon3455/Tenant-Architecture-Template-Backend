/* eslint-disable @typescript-eslint/no-explicit-any */
import { JwtPayload } from "jsonwebtoken";
import { Org } from "./org.model";
import {
  IEmailConfiguration,
  EmailProvider,
  IEmailTemplate,
} from "./org.interface";
import { Role } from "../user/user.interface";
import { LogControllers } from "../log/log.controller";
import {
  EnhancedEmailService,
  EmailOptions,
  getDefaultEmailTemplates,
  initializeDefaultTemplate,
  testEmailConfiguration,
} from "../../utils/enhancedEmailService";
import { VerificationStatus } from "./org.interface";
import axios from "axios";


async function sendConfigurationSuccessEmail(orgId: string): Promise<void> {
  const org = await Org.findById(orgId);
  if (!org || !org.emailConfiguration) return;

  const toEmail = org.orgEmail;
  if (!toEmail) return;

  const fromEmail =
    org.emailConfiguration.sendgridConfig?.verifiedSender ||
    org.emailConfiguration.senderInfo?.fromEmail ||
    org.emailConfiguration.smtpConfig?.auth?.user ||
    (org.emailConfiguration.mailgunConfig?.domain
      ? `postmaster@${org.emailConfiguration.mailgunConfig.domain}`
      : undefined);

  if (!fromEmail) return;

  // Best-effort: only send if config is active (EnhancedEmailService enforces this)
  if (!org.emailConfiguration.isActive) return;

  await EnhancedEmailService.sendEmail(orgId, {
    to: toEmail,
    from: fromEmail,
    subject: "Configuration Successfully",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin: 0 0 12px 0;">Configuration Successfully</h2>
        <p style="margin: 0 0 10px 0;">Your email configuration has been saved and is active.</p>
        <p style="margin: 0; color: #555;">
          Organization: <b>${org.orgName}</b><br/>
          Provider: <b>${String(org.emailConfiguration.provider || "").toUpperCase()}</b><br/>
          Sender: <b>${fromEmail}</b>
        </p>
      </div>
    `,
    textContent: `Configuration Successfully\n\nYour email configuration has been saved and is active.\nOrganization: ${org.orgName}\nProvider: ${String(
      org.emailConfiguration.provider || ""
    ).toUpperCase()}\nSender: ${fromEmail}`,
  });
}

function shouldSendConfigurationEmail(
  payloadOrPatch: Partial<IEmailConfiguration>
): boolean {
  return Boolean(
    payloadOrPatch.provider ||
      payloadOrPatch.isActive !== undefined ||
      payloadOrPatch.sendgridConfig ||
      payloadOrPatch.mailgunConfig ||
      payloadOrPatch.smtpConfig ||
      payloadOrPatch.senderInfo
  );
}



export async function verifySendGridApiKey(apiKey: string): Promise<boolean> {
  try {
    await axios.get("https://api.sendgrid.com/v3/user/account", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function verifySendGridSingleSender(
  apiKey: string,
  fromEmail: string
): Promise<boolean> {
  const res = await axios.get("https://api.sendgrid.com/v3/verified_senders", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const senders = res.data?.result || [];
  const normalize = (e: string) => e.trim().toLowerCase();

  return senders.some(
    (s: any) =>
      normalize(s.from_email) === normalize(fromEmail) && s.verified === true
  );
}

async function verifySendGridConfiguration(
  apiKey: string,
  fromEmail: string
): Promise<{
  status: VerificationStatus;
  reason?: string;
}> {
  const apiKeyValid = await verifySendGridApiKey(apiKey);

  console.log("SendGrid API key valid:", apiKeyValid);

  if (!apiKeyValid) {
    return {
      status: "failed",
      reason: "Invalid SendGrid API key",
    };
  }

  try {
    const senderVerified = await verifySendGridSingleSender(apiKey, fromEmail);

    if (senderVerified ) {
      return { status: "verified" };
    }

    return {
      status: "pending",
      reason: "Sender email or domain is not verified in SendGrid",
    };
  } catch (err: any) {
    // 🚨 Free / trial expired → APIs blocked
    return {
      status: "failed",
      reason: "SendGrid billing not enabled or plan limitation",
    };
  }
}

/**
 * Setup email configuration for an organization
 */
export async function setupEmailConfigurations(
  payload: Partial<IEmailConfiguration>,
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailConfiguration> {
  if (!orgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(orgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  // If no templates provided, use defaults
  if (!payload.templates || payload.templates.length === 0) {
    payload.templates = getDefaultEmailTemplates();
  }

  // Set default settings if not provided
  // if (!payload.settings) {
  //   payload.settings = {
  //     enableEmailTracking: true,
  //     enableClickTracking: true,
  //     enableOpenTracking: true,
  //   };
  // }

  // Set default rate limits if not provided
  if (!payload.rateLimits) {
    payload.rateLimits = {
      dailyLimit: 1000,
      hourlyLimit: 100,
    };
  }

  if (payload.provider === "SENDGRID") {
    const apiKey = payload?.sendgridConfig?.apiKey || "";
    const fromEmail = payload?.sendgridConfig?.verifiedSender || "";

    if (!apiKey || !fromEmail) {
      throw new Error("SendGrid API key and sender email are required");
    }

    const verification = await verifySendGridConfiguration(apiKey, fromEmail);

    payload.verificationStatus = verification.status;

    // If verified and caller didn't explicitly set isActive, auto-activate.
    if (verification.status === "verified" && payload.isActive === undefined) {
      payload.isActive = true;
    }

    if (verification.status === "failed") {
      throw new Error(
        `SendGrid verification failed: ${verification.reason || "Unknown reason"}`
      );
    }

    // For SENDGRID, we rely on the post-save test email below (to org admin)

  }

  // For SMTP/Mailgun, if required config exists and caller didn't set isActive, auto-activate.
  if (payload.isActive === undefined) {
    if (payload.provider === EmailProvider.SMTP) {
      const ok = Boolean(
        payload.smtpConfig?.host &&
          payload.smtpConfig?.port &&
          payload.smtpConfig?.auth?.user &&
          payload.smtpConfig?.auth?.pass
      );
      if (ok) payload.isActive = true;
    }
    if (payload.provider === EmailProvider.MAILGUN) {
      const ok = Boolean(
        payload.mailgunConfig?.apiKey && payload.mailgunConfig?.domain
      );
      if (ok) payload.isActive = true;
    }
  }

  // Update organization with email configuration
  org.emailConfiguration = payload as IEmailConfiguration;
  await org.save();

  // Send a test/config-success email to org admin email (best-effort)
  try {
    await sendConfigurationSuccessEmail(orgId);
  } catch (emailErr) {
    console.error(
      "Failed to send configuration success email (non-fatal):",
      emailErr
    );
  }

  // Log email configuration setup
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    await LogControllers.addLog(
      "Email Configuration Setup",
      decoded?.userId || "system",
      `Email configuration setup for provider ${payload.provider} by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email configuration setup:", logError);
  }

  return org.emailConfiguration;
}

/**
 * Get email configuration for an organization
 */
export async function getEmailConfigurations(
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailConfiguration | null> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  // Mask sensitive information in response
  if (org.emailConfiguration) {
    const config = { ...org.emailConfiguration } as any;

    // Mask API keys for security
    if (config.sendgridConfig?.apiKey) {
      config.sendgridConfig.apiKey = maskApiKey(config.sendgridConfig.apiKey);
    }
    if (config.mailgunConfig?.apiKey) {
      config.mailgunConfig.apiKey = maskApiKey(config.mailgunConfig.apiKey);
    }
    if (config.smtpConfig?.auth?.pass) {
      config.smtpConfig.auth.pass = maskApiKey(config.smtpConfig.auth.pass);
    }

    return config;
  }

  return null;
}

/**
 * Update email configuration for an organization
 */
export async function updateEmailConfigurations(
  patch: Partial<IEmailConfiguration>,
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailConfiguration> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (!org.emailConfiguration) {
    throw new Error(
      "Email configuration not found. Please setup configuration first."
    );
  }

  // Update the configuration
  Object.assign(org.emailConfiguration, patch);
  await org.save();

  // If this update likely changed the configuration, send a success email (best-effort)
  try {
    if (shouldSendConfigurationEmail(patch)) {
      await sendConfigurationSuccessEmail(String(targetOrgId));
    }
  } catch (emailErr) {
    console.error(
      "Failed to send configuration success email (non-fatal):",
      emailErr
    );
  }

  // Log email configuration update
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    const updatedFields = Object.keys(patch).join(", ");
    await LogControllers.addLog(
      "Email Configuration Updated",
      decoded?.userId || "system",
      `Email configuration updated [${updatedFields}] by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email configuration update:", logError);
  }

  return org.emailConfiguration;
}

/**
 * Test email configuration
 */
export async function testEmailConfigurations(
  testEmail?: string,
  decoded?: JwtPayload,
  orgId?: string
): Promise<any> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  // Use provided test email or user's email
  const emailToTest = testEmail || decoded?.email;
  if (!emailToTest) {
    throw new Error("Test email address is required");
  }

  console.log(`Testing email configuration for ${emailToTest}`);

  return await testEmailConfiguration(emailToTest, targetOrgId);
}

/**
 * Delete email configuration
 */
export async function deleteEmailConfigurations(
  decoded?: JwtPayload,
  orgId?: string
): Promise<boolean> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  // Check permissions
  if (decoded?.role !== Role.SUPER_ADMIN && decoded?.org !== targetOrgId) {
    throw new Error("Insufficient permissions to delete email configuration");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  const previousConfig = org.emailConfiguration;
  org.emailConfiguration = undefined;
  await org.save();

  // Log email configuration deletion
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    await LogControllers.addLog(
      "Email Configuration Deleted",
      decoded?.userId || "system",
      `Email configuration deleted (provider: ${previousConfig?.provider}) by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email configuration deletion:", logError);
  }

  return true;
}

// Template Management Methods

/**
 * Add email template
 */
export async function addEmailTemplates(
  templateData: IEmailTemplate,
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailTemplate> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (!org.emailConfiguration) {
    throw new Error(
      "Email configuration not found. Please setup configuration first."
    );
  }

  // Check if template name already exists
  const existingTemplate = org.emailConfiguration.templates.find(
    (t) => t.name === templateData.name
  );
  if (existingTemplate) {
    throw new Error(`Template with name '${templateData.name}' already exists`);
  }

  org.emailConfiguration.templates.push(templateData);
  await org.save();

  // Log template addition
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    await LogControllers.addLog(
      "Email Template Created",
      decoded?.userId || "system",
      `Email template '${templateData.name}' added by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email template addition:", logError);
  }

  return templateData;
}

/**
 * Get all email templates
 */
export async function getEmailTemplate(
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailTemplate[]> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  return org.emailConfiguration?.templates || [];
}

/**
 * Update email template
 */
export async function updateEmailTemplate(
  templateName: string,
  patch: Partial<IEmailTemplate>,
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailTemplate> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (!org.emailConfiguration) {
    throw new Error("Email configuration not found");
  }

  const templateIndex = org.emailConfiguration.templates.findIndex(
    (t) => t.name === templateName
  );
  if (templateIndex === -1) {
    throw new Error(`Template '${templateName}' not found`);
  }

  // Update the template
  Object.assign(org.emailConfiguration.templates[templateIndex], patch);
  await org.save();

  // Log template update
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    const updatedFields = Object.keys(patch).join(", ");
    await LogControllers.addLog(
      "Email Template Updated",
      decoded?.userId || "system",
      `Email template '${templateName}' updated [${updatedFields}] by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email template update:", logError);
  }

  return org.emailConfiguration.templates[templateIndex];
}

/**
 * Delete email template
 */
export async function deleteEmailTemplates(
  templateName: string,
  decoded?: JwtPayload,
  orgId?: string
): Promise<boolean> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const org = await Org.findById(targetOrgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (!org.emailConfiguration) {
    throw new Error("Email configuration not found");
  }

  const templateIndex = org.emailConfiguration.templates.findIndex(
    (t) => t.name === templateName
  );
  if (templateIndex === -1) {
    throw new Error(`Template '${templateName}' not found`);
  }

  const deletedTemplate = org.emailConfiguration.templates[templateIndex];
  org.emailConfiguration.templates.splice(templateIndex, 1);
  await org.save();

  // Log template deletion
  try {
    const actorDisplay =
      (decoded as any)?.name || decoded?.email || decoded?.userId || "system";
    await LogControllers.addLog(
      "Email Template Removed",
      decoded?.userId || "system",
      `Email template '${deletedTemplate.name}' deleted by ${actorDisplay}`,
      decoded
    );
  } catch (logError) {
    console.error("Failed to log email template deletion:", logError);
  }

  return true;
}

/**
 * Initialize default email templates
 */
export async function initializeDefaultTemplates(
  decoded?: JwtPayload,
  orgId?: string
): Promise<IEmailTemplate[]> {
  const targetOrgId = orgId || decoded?.org;

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  const success = await initializeDefaultTemplate(targetOrgId);
  if (!success) {
    throw new Error("Failed to initialize default templates");
  }

  return getDefaultEmailTemplates();
}

/**
 * Get available email providers
 */
export async function getAvailableProviders(): Promise<any[]> {
  return [
    {
      value: EmailProvider.SENDGRID,
      label: "SendGrid",
      description: "Reliable cloud-based email service",
      features: [
        "High deliverability",
        "Advanced analytics",
        "Template engine",
      ],
      setupRequirements: ["API Key", "Verified Sender Email"],
    },
    {
      value: EmailProvider.MAILGUN,
      label: "Mailgun",
      description: "Powerful email API service",
      features: ["Email validation", "Tracking", "A/B testing"],
      setupRequirements: ["API Key", "Domain", "Region Selection"],
    },
    {
      value: EmailProvider.SMTP,
      label: "SMTP",
      description: "Custom SMTP server configuration",
      features: ["Full control", "Any SMTP provider", "Cost effective"],
      setupRequirements: ["SMTP Host", "Port", "Username", "Password"],
    },
  ];
}

/**
 * Send email using organization configuration
 */
export async function sendEmail(
  emailOptions: EmailOptions,
  decoded?: JwtPayload,
  orgId?: string
): Promise<any> {
  const targetOrgId = orgId || decoded?.org;

  console.log("email options from sendEmail", emailOptions);

  if (!targetOrgId) {
    throw new Error("Organization ID is required");
  }

  return await EnhancedEmailService.sendEmail(targetOrgId, emailOptions);
}

/**
 * Mask API key for security
 */
function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return "****";

  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = "*".repeat(Math.max(0, apiKey.length - 8));

  return `${start}${middle}${end}`;
}

/**
 * Validate email provider configuration
 */
export function validateProviderConfig(
  provider: EmailProvider,
  config: any
): boolean {
  switch (provider) {
    case EmailProvider.SENDGRID:
      return !!(
        config?.sendgridConfig?.apiKey && config?.sendgridConfig?.verifiedSender
      );

    case EmailProvider.MAILGUN:
      return !!(config?.mailgunConfig?.apiKey && config?.mailgunConfig?.domain);

    case EmailProvider.SMTP:
      return !!(
        config?.smtpConfig?.host &&
        config?.smtpConfig?.port &&
        config?.smtpConfig?.auth?.user &&
        config?.smtpConfig?.auth?.pass
      );

    default:
      return false;
  }
}

export const emailConfigService = {
  getEmailConfigurations,
  updateEmailConfigurations,
  deleteEmailTemplates,
  updateEmailTemplate,
  initializeDefaultTemplates,
  getAvailableProviders,
  testEmailConfigurations,
  sendEmail,
};
