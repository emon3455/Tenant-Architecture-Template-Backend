/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: nodemailer, @sendgrid/mail, and mailgun.js have been removed from dependencies
// Only SMTP provider code is kept for reference, but will not work without nodemailer
import { Types } from "mongoose";
import { Org } from "../modules/org/org.model";
import {
  EmailProvider,
  IEmailConfiguration,
} from "../modules/org/org.interface";
import { EmailLog } from "../modules/emailLog/emailLog.model";
import { EmailStatus } from "../modules/emailLog/emailLog.interface";

export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  templateName?: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType: string;
  }>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: EmailProvider;
  orgId: string;
  logId?: Types.ObjectId;
}

/**
 * Send email using organization-specific configuration
 */
export async function sendEmail(
  orgId: string,
  emailOptions: EmailOptions
): Promise<EmailResult> {
  const org = await Org.findById(orgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (!org.emailConfiguration || !org.emailConfiguration.isActive) {
    throw new Error(
      "Email configuration not found or inactive for organization"
    );
  }

  const emailConfig = org.emailConfiguration;
  let emailLogId: Types.ObjectId | undefined;

  try {
    // Process template if specified
    const processedContent = await processEmailTemplate(
      emailConfig,
      emailOptions
    );

    // Log email attempt
    emailLogId = await logOrgEmail({
      orgId: new Types.ObjectId(orgId),
      to: Array.isArray(processedContent.to)
        ? processedContent.to
        : [processedContent.to],
      cc: processedContent.cc
        ? Array.isArray(processedContent.cc)
          ? processedContent.cc
          : [processedContent.cc]
        : undefined,
      bcc: processedContent.bcc
        ? Array.isArray(processedContent.bcc)
          ? processedContent.bcc
          : [processedContent.bcc]
        : undefined,
      from: processedContent.from,
      subject: processedContent.subject,
      status: EmailStatus.PENDING,
      provider: emailConfig.provider,
      templateName: emailOptions.templateName,
      metadata: {
        type: "organization_email",
        templateName: emailOptions.templateName,
      },
    });

    let result: EmailResult;

    // Send email based on provider
    // NOTE: SENDGRID and MAILGUN providers are disabled - packages removed
    switch (emailConfig.provider) {
      // case EmailProvider.SENDGRID:
      //   result = await sendWithSendGrid(emailConfig, processedContent, orgId);
      //   break;

      // case EmailProvider.MAILGUN:
      //   result = await sendWithMailgun(emailConfig, processedContent, orgId);
      //   break;

      case EmailProvider.SMTP:
        result = await sendWithSMTP(emailConfig, processedContent, orgId);
        break;

      default:
        throw new Error(`Unsupported email provider: ${emailConfig.provider}. Only SMTP is available (requires nodemailer package).`);
    }

    // Update log with success status
    if (emailLogId && result.success) {
      await updateOrgEmailLogStatus(
        emailLogId,
        EmailStatus.SENT,
        result.messageId
      );
    } else if (emailLogId && !result.success) {
      await updateOrgEmailLogStatus(
        emailLogId,
        EmailStatus.FAILED,
        undefined,
        result.error
      );
    }

    result.logId = emailLogId;
    return result;
  } catch (error) {
    // Update log with failure status
    if (emailLogId) {
      await updateOrgEmailLogStatus(
        emailLogId,
        EmailStatus.FAILED,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }

    console.error("Email sending failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      provider: emailConfig.provider,
      orgId,
      logId: emailLogId,
    };
  }
}

/**
 * Send email with SendGrid - DISABLED (package removed)
 */
/* DISABLED - @sendgrid/mail package not installed
async function sendWithSendGrid(
  config: IEmailConfiguration,
  emailOptions: EmailOptions,
  orgId: string
): Promise<EmailResult> {
  try {
    if (!config.sendgridConfig?.apiKey) {
      throw new Error("SendGrid API key not configured");
    }

    sgMail.setApiKey(config.sendgridConfig.apiKey);

    const msg: any = {
      to: emailOptions.to,
      from: emailOptions.from,
      subject: emailOptions.subject,
      html: emailOptions.htmlContent,
      text: emailOptions.textContent,
      replyTo: emailOptions.replyTo,
    };

    // Add tracking if enabled
    if (config.settings.enableEmailTracking) {
      msg.trackingSettings = {
        clickTracking: { enable: config.settings.enableClickTracking },
        openTracking: { enable: config.settings.enableOpenTracking },
      };
    }

    // Add CC/BCC if specified
    if (emailOptions.cc) msg.cc = emailOptions.cc;
    if (emailOptions.bcc) msg.bcc = emailOptions.bcc;

    // Add attachments if provided
    if (emailOptions.attachments) {
      // SendGrid requires attachments content be base64 encoded.
      msg.attachments = emailOptions.attachments.map((att) => {
        let contentBase64: string | undefined;
        try {
          if (att.content && Buffer.isBuffer(att.content)) {
            contentBase64 = (att.content as Buffer).toString("base64");
          } else if (typeof att.content === "string") {
            // If a plain string is provided, encode it to base64 to be safe
            contentBase64 = Buffer.from(att.content, "utf8").toString("base64");
          }
        } catch (e) {
          console.warn("Failed to encode attachment for SendGrid:", e);
          contentBase64 = undefined;
        }

        return {
          filename: att.filename,
          content: contentBase64,
          type: att.contentType,
          disposition: "attachment",
        };
      });
    }

    const response = await sgMail.send(msg);

    return {
      success: true,
      messageId: response[0].headers["x-message-id"],
      provider: EmailProvider.SENDGRID,
      orgId,
    };
  } catch (error) {
    console.error("SendGrid sending failed:", error);
    throw error;
  }
}
*/

/**
 * Send email with Mailgun - DISABLED (package removed)
 *//* DISABLED - mailgun.js package not installedasync function sendWithMailgun(
  config: IEmailConfiguration,
  emailOptions: EmailOptions,
  orgId: string
): Promise<EmailResult> {
  try {
    if (!config.mailgunConfig?.apiKey || !config.mailgunConfig?.domain) {
      throw new Error("Mailgun configuration incomplete");
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: config.mailgunConfig.apiKey,
      url:
        config.mailgunConfig.region === "EU"
          ? "https://api.eu.mailgun.net"
          : "https://api.mailgun.net",
    });

    const messageData: any = {
      from: emailOptions.from,
      to: Array.isArray(emailOptions.to)
        ? emailOptions.to.join(",")
        : emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.htmlContent,
      text: emailOptions.textContent,
    };

    // Add tracking if enabled
    if (config.settings.enableEmailTracking) {
      messageData["o:tracking"] = "yes";
      messageData["o:tracking-clicks"] = config.settings.enableClickTracking
        ? "yes"
        : "no";
      messageData["o:tracking-opens"] = config.settings.enableOpenTracking
        ? "yes"
        : "no";
    }

    // Add CC/BCC if specified
    if (emailOptions.cc) messageData.cc = emailOptions.cc;
    if (emailOptions.bcc) messageData.bcc = emailOptions.bcc;
    if (emailOptions.replyTo) {
      messageData["h:Reply-To"] = emailOptions.replyTo;
    }

    // Add attachments if provided
    if (emailOptions.attachments) {
      messageData.attachment = emailOptions.attachments.map((att) => ({
        filename: att.filename,
        data: att.content,
      }));
    }

    const response = await mg.messages.create(
      config.mailgunConfig.domain,
      messageData
    );

    return {
      success: true,
      messageId: response.id,
      provider: EmailProvider.MAILGUN,
      orgId,
    };
  } catch (error) {
    console.error("Mailgun sending failed:", error);
    throw error;
  }
}
*/

/**
 * Send email with SMTP - REQUIRES nodemailer package
 */
async function sendWithSMTP(
  config: IEmailConfiguration,
  emailOptions: EmailOptions,
  orgId: string
): Promise<EmailResult> {
  // NOTE: This function requires nodemailer package to be installed
  throw new Error("SMTP email provider is not available - nodemailer package not installed");
  
  /* DISABLED - nodemailer package not installed
  try {
    if (!config.smtpConfig) {
      throw new Error("SMTP configuration not found");
    }

    const transporter = nodemailer.createTransport({
      host: config.smtpConfig.host,
      port: config.smtpConfig.port,
      secure: config.smtpConfig.secure,
      auth: {
        user: config.smtpConfig.auth.user,
        pass: config.smtpConfig.auth.pass,
      },
      tls: {
        rejectUnauthorized: false, // Temporarily allow connection issues for debugging
      },
    });

    const mailOptions: any = {
      from: config.smtpConfig.auth.user,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.htmlContent,
      text: emailOptions.textContent,
      replyTo: emailOptions.replyTo,
    };

    // Add CC/BCC if specified
    if (emailOptions.cc) mailOptions.cc = emailOptions.cc;
    if (emailOptions.bcc) mailOptions.bcc = emailOptions.bcc;

    // Add attachments if provided
    if (emailOptions.attachments) {
      mailOptions.attachments = emailOptions.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: EmailProvider.SMTP,
      orgId,
    };
  } catch (error) {
    console.error("SMTP sending failed:", error);
    throw error;
  }
  */
}

/**
 * Process email template with data
 */
async function processEmailTemplate(
  config: IEmailConfiguration,
  emailOptions: EmailOptions
): Promise<EmailOptions> {
  let htmlContent = emailOptions.htmlContent || "";
  let textContent = emailOptions.textContent || "";
  let subject = emailOptions.subject;

  // If template name is provided, find and use the template
  if (emailOptions.templateName) {
    const template = config.templates.find(
      (t) => t.name === emailOptions.templateName
    );
    if (template) {
      htmlContent = template.htmlContent;
      textContent = template.textContent || "";
      subject = template.subject;
    } else {
      console.warn(
        `Template '${emailOptions.templateName}' not found, using default content`
      );
    }
  }

  // Process template variables
  if (emailOptions.templateData) {
    const data = emailOptions.templateData;

    // Replace placeholders in HTML content
    htmlContent = replacePlaceholders(htmlContent, data);

    // Replace placeholders in text content
    if (textContent) {
      textContent = replacePlaceholders(textContent, data);
    }

    // Replace placeholders in subject
    subject = replacePlaceholders(subject, data);
  }

  // Add organization footer if configured
  if (config.settings.footerText) {
    const footer = `<br><br><hr><p style="font-size: 12px; color: #666;">${config.settings.footerText}</p>`;
    htmlContent += footer;
  }

  // Add unsubscribe link if configured
  if (config.settings.unsubscribeUrl) {
    const unsubscribeLink = `<br><p style="font-size: 11px; color: #999;"><a href="${config.settings.unsubscribeUrl}">Unsubscribe</a></p>`;
    htmlContent += unsubscribeLink;
  }

  return {
    ...emailOptions,
    subject,
    htmlContent,
    textContent,
  };
}

/**
 * Replace template placeholders with actual data
 */
function replacePlaceholders(
  content: string,
  data: Record<string, any>
): string {
  let processed = content;

  // Replace {{variable}} placeholders
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    processed = processed.replace(regex, String(data[key] || ""));
  });

  // Replace common placeholders
  processed = processed.replace(/{{now}}/g, new Date().toISOString());
  processed = processed.replace(/{{today}}/g, new Date().toDateString());
  processed = processed.replace(
    /{{year}}/g,
    new Date().getFullYear().toString()
  );

  return processed;
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(
  testEmail: string,
  orgId: string
): Promise<EmailResult> {
  try {
    const org = await Org.findById(orgId);
    if (!org || !org.emailConfiguration) {
      throw new Error("Email configuration not found");
    }

    const fromEmail =
      org.emailConfiguration.sendgridConfig?.verifiedSender ||
      org.emailConfiguration.smtpConfig?.auth?.user ||
      `postmaster@${org.emailConfiguration.mailgunConfig?.domain}`;

    const testEmailOptions: EmailOptions = {
      to: testEmail,
      from: fromEmail,
      subject: "✅ Email Configuration Successfully Verified",
      htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; }
              .header .icon { font-size: 48px; margin-bottom: 10px; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
              .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
              .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .info-row:last-child { border-bottom: none; }
              .info-label { font-weight: 600; color: #495057; min-width: 140px; }
              .info-value { color: #6c757d; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; border-radius: 0 0 10px 10px; }
              .check-icon { color: #10b981; font-size: 20px; margin-right: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">✉️</div>
                <h1>Email Configuration Test</h1>
              </div>
              <div class="content">
                <div class="success-badge">✓ Configuration Successful</div>
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Congratulations! Your email configuration has been successfully verified and is working properly.
                </p>
                <p style="color: #6c757d; margin-bottom: 30px;">
                  This test email confirms that your organization can now send and receive emails through the configured provider.
                </p>
                
                <div class="info-box">
                  <h3 style="margin-top: 0; color: #495057;">Configuration Details</h3>
                  <div class="info-row">
                    <span class="info-label">Organization:</span>
                    <span class="info-value">${org.orgName}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Email Provider:</span>
                    <span class="info-value">${org.emailConfiguration.provider.toUpperCase()}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Sender Email:</span>
                    <span class="info-value">${fromEmail}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Test Date:</span>
                    <span class="info-value">${new Date().toLocaleString(
                      "en-US",
                      { dateStyle: "full", timeStyle: "short" }
                    )}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value" style="color: #10b981; font-weight: 600;">✓ Active & Verified</span>
                  </div>
                </div>

                <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin-top: 30px; border-radius: 4px;">
                  <h4 style="margin-top: 0; color: #0066cc;">✨ What's Next?</h4>
                  <p style="margin-bottom: 0; color: #495057;">
                    Your email system is ready to use! You can now send emails to your clients, leads, and contacts. 
                    All emails will be tracked and logged in your CRM dashboard.
                  </p>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0 0 10px 0;">This is an automated test email from your CRM system</p>
                <p style="margin: 0; font-size: 12px; color: #adb5bd;">
                  Powered by ${org.orgName} CRM | ${new Date().getFullYear()}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      textContent: `
══════════════════════════════════════════════════════
          EMAIL CONFIGURATION TEST - SUCCESS
══════════════════════════════════════════════════════

✓ Configuration Successful

Congratulations! Your email configuration has been successfully 
verified and is working properly.

This test email confirms that your organization can now send 
and receive emails through the configured provider.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFIGURATION DETAILS:
────────────────────────────────────────────────────

Organization:     ${org.orgName}
Email Provider:   ${org.emailConfiguration.provider.toUpperCase()}
Sender Email:     ${fromEmail}
Test Date:        ${new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      })}
Status:           ✓ Active & Verified

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ WHAT'S NEXT?

Your email system is ready to use! You can now send emails 
to your clients, leads, and contacts. All emails will be 
tracked and logged in your CRM dashboard.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automated test email from your CRM system
Powered by ${org.orgName} CRM | ${new Date().getFullYear()}

══════════════════════════════════════════════════════
        `,
    };


    return await sendEmail(orgId, testEmailOptions);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      provider: EmailProvider.SENDGRID,
      orgId,
    };
  }
}

/**
 * Get default email templates for an organization
 */
export function getDefaultEmailTemplates() {
  return [
    {
      name: "welcome-lead",
      subject: "Welcome! We received your {{serviceType}} inquiry",
      htmlContent: `
          <h2>Welcome \{{name\}}!</h2>
          <p>Thank you for your interest in our \{{serviceType\}} services.</p>
          <p>We have received your inquiry and will be in touch with you soon.</p>
          <p><strong>Your Information:</strong></p>
          <ul>
            <li>Name: \{{name\}}</li>
            <li>Email: \{{email\}}</li>
            <li>Phone: \{{phone\}}</li>
            <li>Service: \{{serviceType\}}</li>
          </ul>
          <p>We look forward to working with you!</p>
        `,
      textContent: `
          Welcome \{{name\}}!
          
          Thank you for your interest in our \{{serviceType\}} services.
          We have received your inquiry and will be in touch with you soon.
          
          Your Information:
          - Name: \{{name\}}
          - Email: \{{email\}}
          - Phone: \{{phone\}}
          - Service: \{{serviceType\}}
          
          We look forward to working with you!
        `,
      variables: ["name", "email", "phone", "serviceType", "company"],
    },
    {
      name: "estimate-request",
      subject: "Project Details Required for Your {{serviceType}} Estimate",
      htmlContent: `
          <h2>Estimate Request</h2>
          <p>Hello \{{name\}},</p>
          <p>We're ready to prepare your estimate for \{{serviceType\}}.</p>
          <p>To provide you with the most accurate estimate, please reply with the following information:</p>
          <ul>
            <li>Project timeline/deadline</li>
            <li>Budget range</li>
            <li>Specific requirements or preferences</li>
            <li>Property details (if applicable)</li>
          </ul>
          <p>We'll prepare your detailed estimate within 24 hours of receiving this information.</p>
          <p>Thank you!</p>
        `,
      variables: ["name", "serviceType", "company"],
    },
    {
      name: "client-welcome",
      subject: "Welcome to Our Client Portal!",
      htmlContent: `
          <h2>Welcome \{{name\}}!</h2>
          <p>Your project has been approved and we're excited to work with you.</p>
          <p><strong>Project Details:</strong></p>
          <ul>
            <li>Service: \{{serviceType\}}</li>
          </ul>
          <p>We've created your client account. You'll receive your login credentials in a separate email.</p>
          <p>Looking forward to a successful project!</p>
        `,
      variables: ["name", "serviceType", "company"],
    },
    {
      name: "client-credentials",
      subject: "Your Client Portal Login Credentials",
      htmlContent: `
          <h2>Client Portal Access</h2>
          <p>Hello \{{name\}},</p>
          <p>Your client portal account is now ready!</p>
          <p><strong>Login Details:</strong></p>
          <ul>
            <li>Portal URL: \{{loginUrl\}}</li>
            <li>Email: \{{email\}}</li>
            <li>Temporary Password: \{{tempPassword\}}</li>
          </ul>
          <p><strong>Important:</strong> Please change your password after your first login.</p>
          <p>If you have any questions, please contact our support team.</p>
        `,
      variables: ["name", "email", "tempPassword", "loginUrl"],
    },
  ];
}

/**
 * Initialize default email templates for an organization
 */
export async function initializeDefaultTemplate(
  orgId: string
): Promise<boolean> {
  try {
    const org = await Org.findById(orgId);
    if (!org) return false;

    const defaultTemplates = getDefaultEmailTemplates();

    if (!org.emailConfiguration) {
      org.emailConfiguration = {
        provider: EmailProvider.SENDGRID,
        isActive: false,
        senderInfo: {
          fromEmail: org.orgEmail,
          fromName: org.orgName,
        },
        templates: defaultTemplates,
        settings: {
          enableEmailTracking: true,
          enableClickTracking: true,
          enableOpenTracking: true,
        },
      } as any;
    } else {
      // Add missing templates
      defaultTemplates.forEach((template) => {
        const exists = org.emailConfiguration!.templates.some(
          (t) => t.name === template.name
        );
        if (!exists) {
          org.emailConfiguration!.templates.push(template);
        }
      });
    }

    await org.save();
    return true;
  } catch (error) {
    console.error("Error initializing default templates:", error);
    return false;
  }
}

// Helper function to log organization emails
async function logOrgEmail(logData: {
  orgId: Types.ObjectId;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  status: EmailStatus;
  provider: EmailProvider;
  templateName?: string;
  metadata?: any;
  providerMessageId?: string;
  providerResponse?: any;
  errorMessage?: string;
}): Promise<Types.ObjectId> {
  try {
    const emailLog = new EmailLog({
      orgId: logData.orgId,
      to: logData.to,
      cc: logData.cc,
      bcc: logData.bcc,
      from: logData.from,
      subject: logData.subject,
      status: logData.status,
      provider: logData.provider,
      providerMessageId: logData.providerMessageId,
      providerResponse: logData.providerResponse,
      errorMessage: logData.errorMessage,
      retryCount: 0,
      maxRetries: 3,
      sentAt: logData.status === EmailStatus.SENT ? new Date() : undefined,
      metadata: {
        ...logData.metadata,
        templateName: logData.templateName,
        isOrgEmail: true,
      },
    });

    await emailLog.save();
    return emailLog._id as Types.ObjectId;
  } catch (logError) {
    console.error("Failed to log organization email:", logError);
    return new Types.ObjectId();
  }
}

// Helper function to update organization email log status
async function updateOrgEmailLogStatus(
  logId: Types.ObjectId,
  status: EmailStatus,
  messageId?: string,
  errorMessage?: string,
  providerResponse?: any
): Promise<void> {
  try {
    const updateData: any = {
      status,
      ...(messageId && { providerMessageId: messageId }),
      ...(providerResponse && { providerResponse }),
      ...(errorMessage && { errorMessage }),
      ...(status === EmailStatus.SENT && { sentAt: new Date() }),
    };

    await EmailLog.findByIdAndUpdate(logId, updateData);
  } catch (error) {
    console.error("Failed to update organization email log:", error);
  }
}

export const EnhancedEmailService = {
  sendEmail,
  getDefaultEmailTemplates,
  initializeDefaultTemplate,
  testEmailConfiguration,
};
