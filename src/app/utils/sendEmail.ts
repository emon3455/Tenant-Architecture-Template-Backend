/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import ejs from "ejs";
// NOTE: nodemailer package has been removed from dependencies
// This file will not work without nodemailer - please install it if needed: npm install nodemailer @types/nodemailer
import path from "path";
import { Types } from "mongoose";
import { envVars } from "../config/env";
import AppError from "../errorHelpers/AppError";
import { EmailLog } from "../modules/emailLog/emailLog.model";
import { EmailStatus, EmailProvider } from "../modules/emailLog/emailLog.interface";

// Transporter disabled - nodemailer not installed
const transporter: any = null;
/*
const transporter = nodemailer.createTransport({
    // port: envVars.EMAIL_SENDER.SMTP_PORT,
    secure: true,
    auth: {
        user: envVars.EMAIL_SENDER.SMTP_USER,
        pass: envVars.EMAIL_SENDER.SMTP_PASS
    },
    port: Number(envVars.EMAIL_SENDER.SMTP_PORT),
    host: envVars.EMAIL_SENDER.SMTP_HOST,
    tls: {
        rejectUnauthorized: false, // Temporarily allow connection issues for debugging
    },
})
*/

interface SendEmailOptions {
    to: string,
    subject: string;
    templateName?: string;
    templateData?: Record<string, any>
    htmlContent?: string;
    textContent?: string;
    attachments?: {
        filename: string,
        content: Buffer | string,
        contentType: string
    }[]
}

export const sendEmail = async ({
    to,
    subject,
    templateName,
    templateData,
    htmlContent,
    textContent,
    attachments
}: SendEmailOptions) => {
    // Email sending is disabled - nodemailer package not installed
    throw new AppError(500, 'Email sending is not available - nodemailer package not installed. Please install: npm install nodemailer @types/nodemailer');
    
    /* DISABLED - nodemailer not installed
    let emailLogId: Types.ObjectId | undefined;
    let renderedHtml: string = '';

    try {
        if (htmlContent) {
            renderedHtml = htmlContent;
        } else {
            if (!templateName) throw new Error('No templateName or htmlContent provided to sendEmail');
            const templatePath = path.join(__dirname, `../../../templates/${templateName}.ejs`)
            renderedHtml = await ejs.renderFile(templatePath, templateData)
        }

        // Prepare attachments for logging (without content buffers)
        const logAttachments = attachments?.map(attachment => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.content ? (typeof attachment.content === 'string' ? Buffer.from(attachment.content).length : attachment.content.length) : 0,
            // Don't store the actual content to avoid bloating the database
        })) || [];

        // Log email attempt WITH BODY AND ATTACHMENTS
        emailLogId = await logSystemEmail({
            to: [to],
            from: envVars.EMAIL_SENDER.SMTP_FROM,
            subject,
            body: renderedHtml, // ADD HTML BODY HERE
            attachments: logAttachments, // ADD ATTACHMENTS HERE
            status: EmailStatus.PENDING,
            provider: EmailProvider.SMTP,
            templateName,
            metadata: {
                type: 'system_email',
                templateName,
                isLegacyEmail: true
            }
        });

        const info = await transporter.sendMail({
            from: envVars.EMAIL_SENDER.SMTP_FROM,
            to: to,
            subject: subject,
            html: renderedHtml,
            text: textContent,
            attachments: attachments?.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType
            }))
        })

        // Update log as successful WITH BODY
        if (emailLogId) {
            await updateEmailLogStatus(emailLogId, EmailStatus.SENT, info.messageId, info, undefined, renderedHtml);
        }

        // eslint-disable-next-line no-console
        console.log(`\u2709\uFE0F Email sent to ${to}: ${info.messageId} (LogID: ${emailLogId})`);

        return { success: true, messageId: info.messageId, logId: emailLogId };
    } catch (error: any) {
        // Update log as failed WITH BODY
        if (emailLogId) {
            await updateEmailLogStatus(emailLogId, EmailStatus.FAILED, undefined, undefined, error.message, renderedHtml);
        }

        console.error('Email sending failed:', error);
        throw new AppError(401, "Email error")
    }    */}

// Helper function to log system emails
const logSystemEmail = async (logData: {
  to: string[];
  from: string;
  subject: string;
  body?: string;
  attachments?: any[];
  status: EmailStatus;
  provider: EmailProvider;
  templateName?: string;
  metadata?: any;
  providerMessageId?: string;
  providerResponse?: any;
  errorMessage?: string;
}): Promise<Types.ObjectId> => {
  try {
    const SYSTEM_ORG_ID = process.env.SYSTEM_ORG_ID
      ? new Types.ObjectId(process.env.SYSTEM_ORG_ID)
      : new Types.ObjectId("000000000000000000000000");

    const emailLog = new EmailLog({
      orgId: SYSTEM_ORG_ID,
      to: logData.to,
      from: logData.from,
      subject: logData.subject,
      body: logData.body,
      attachments: logData.attachments,
      status: logData.status,
      provider: logData.provider,
      providerMessageId: logData.providerMessageId,
      providerResponse: logData.providerResponse,
      errorMessage: logData.errorMessage,
      retryCount: 0,
      maxRetries: 0,
      sentAt: logData.status === EmailStatus.SENT ? new Date() : undefined,
      metadata: {
        type: 'system_email', // Keep this for backward compatibility
        templateName: logData.templateName,
        isSystemEmail: true, // ← CONSISTENT: true for system emails
        ...logData.metadata,
      },
    });

    await emailLog.save();

    console.log(
      `####################################################
      🧾 SYSTEM Email logged → LogID: ${emailLog._id.toString()} | To: ${logData.to.join(
        ", "
      )} | Subject: "${logData.subject}" | Template: ${
        logData.templateName || "N/A"
      } | Body Length: ${logData.body?.length || 0} chars | Attachments: ${logData.attachments?.length || 0}`
    );

    return emailLog._id as Types.ObjectId;
  } catch (logError) {
    console.error("#####################❌ Failed to log system email:", logError);
    return new Types.ObjectId();
  }
};

// Helper function to update email log status WITH BODY SUPPORT
const updateEmailLogStatus = async (
    logId: Types.ObjectId,
    status: EmailStatus,
    messageId?: string,
    providerResponse?: any,
    errorMessage?: string,
    body?: string // ADD BODY PARAMETER
): Promise<void> => {
    try {
        const updateData: any = {
            status,
            ...(messageId && { providerMessageId: messageId }),
            ...(providerResponse && { providerResponse }),
            ...(errorMessage && { errorMessage }),
            ...(status === EmailStatus.SENT && { sentAt: new Date() }),
            ...(body && { body }) // UPDATE BODY IF PROVIDED
        };

        await EmailLog.findByIdAndUpdate(logId, updateData);
        
        console.log(`📝 Email log updated → LogID: ${logId.toString()} | Status: ${status} | Body Updated: ${!!body}`);
    } catch (error) {
        console.error('Failed to update email log:', error);
    }
};