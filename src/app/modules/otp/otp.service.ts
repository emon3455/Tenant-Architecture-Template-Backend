// general-otp.service.ts
import AppError from "../../errorHelpers/AppError";
import { Types } from "mongoose";
import { User } from "../user/user.model";
import { OrgEmailTemplate } from "../emailTemplate/emailTemplate.model";
import EmailService from "../email/email.service";
import { Org } from "../org/org.model";
import { LogControllers } from "../log/log.controller";
import { production } from "../../constant/constant";
import {
  generateOtp,
  futureDate,
  OTP_EXP_SECONDS,
} from "../../helpers/otp.helpers";

type Purpose = "verify_email" | "reset_password" | "2fa" | string;

const sendOTP = async (email: string, purpose: Purpose, logActor?: any) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  if (purpose === "verify_email" && user.isVerified) {
    throw new AppError(401, "You are already verified");
  }

  const code = generateOtp(6);

  user.otpCode = code;
  user.otpExpiresAt = futureDate(OTP_EXP_SECONDS);
  user.otpPurpose = purpose;
  await user.save();

  try {
    // For reset_password purpose, prefer DB-backed OrgEmailTemplate by ID
    if (purpose === "reset_password") {
      const TEMPLATE_ID = production
        ? "690d8570b62eeb7a8e033668"
        : "690740298795fae39a9eea8b"; // Forget password (OTP) template ID

      // Simple placeholder replacement for {{...}}
      const replacePlaceholders = (content: string, data: Record<string, unknown>) => {
        if (!content) return "";
        let processed = content;
        // Support simple Handlebars-like if blocks: {{#if key}}...{{/if}}
        processed = processed.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, key: string, inner: string) => {
          const val = (data as any)[key];
          return val ? inner : "";
        });
        Object.keys(data).forEach((key) => {
          const value = String((data as any)[key] ?? "");
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
          processed = processed.replace(regex, value);
        });
        processed = processed.replace(/{{now}}/g, new Date().toISOString());
        processed = processed.replace(/{{today}}/g, new Date().toDateString());
        processed = processed.replace(/{{year}}/g, String(new Date().getFullYear()));
        return processed;
      };

      // Prepare template data with aliases to match DB template
      let companyName: string | undefined;
      if (user.org) {
        const orgDoc = await Org.findById(user.org).select("orgName");
        companyName = orgDoc?.orgName || undefined;
      }
      const expiryMinutes = Math.floor(OTP_EXP_SECONDS / 60);
      const recipientName = user.name || (user.email?.split("@")[0] ?? "User");

      const templateData = {
        name: recipientName,
        recipient_name: recipientName,
        otp: code,
        expiresInMinutes: expiryMinutes,
        expiry_minutes: expiryMinutes,
        email: user.email,
        company_name: companyName || "",
      } as const;

      const dbTemplate = await OrgEmailTemplate.findById(TEMPLATE_ID).withoutTenant();
console.log('dbTemplate:', dbTemplate);
      if (dbTemplate) {
        const subject = replacePlaceholders(dbTemplate.subject, templateData);
        const html = replacePlaceholders(dbTemplate.body, templateData);

        if (user.org) {
          try {
            await EmailService.sendEmail(user.org as any, {
              to: email,
              subject,
              htmlContent: html,
              templateData: templateData as any,
              metadata: { templateId: TEMPLATE_ID, source: "db-email-template", purpose },
            } as any);
          } catch (e) {
            // If org email send fails, send the rendered DB HTML via system transporter (avoid otp.ejs)
            const { sendEmail } = await import("../../utils/sendEmail");
            await sendEmail({
              to: email,
              subject,
              htmlContent: html,
              textContent: undefined,
              attachments: [],
            });
          }
        } else {
          // No org (e.g., super admin), fallback to legacy system sender
          const { sendEmail } = await import("../../utils/sendEmail");
          await sendEmail({
            to: email,
            subject,
            htmlContent: html,
            textContent: undefined,
            attachments: [],
          });
        }
      } else {
        // Template missing -> fallback to legacy EJS path
        const { sendEmail } = await import("../../utils/sendEmail");
        await sendEmail({
          to: email,
          subject: "Your One-Time Code",
          templateName: "otp",
          templateData: templateData as any,
        });
      }
    } else {
      // Other OTP purposes use legacy EJS template
      const { sendEmail } = await import("../../utils/sendEmail");
      await sendEmail({
        to: email,
        subject: "Your One-Time Code",
        templateName: "otp",
        templateData: {
          name: user.name,
          otp: code,
          expiresInMinutes: Math.floor(OTP_EXP_SECONDS / 60),
        },
      });
    }
    // Log OTP sent
    if (logActor) {
      try {
        const actor = logActor as any;
        const actorDisplay =
          actor?.name || actor?.email || actor?.userId || "system";
        await LogControllers.addLog(
          "OTP Sent",
          actor?.userId || "system",
          `OTP sent to '${email}' for purpose '${purpose}' by ${actorDisplay}`,
          logActor
        );
      } catch (logError) {
        console.error("Failed to log OTP sent:", logError);
      }
    }
  } catch (emailError) {
    // Log error but don't fail the OTP generation
    console.error("Failed to send OTP email:", emailError);
    // You might want to throw here if email delivery is critical
    // throw new AppError(500, 'Failed to send OTP email');
  }
};

const verifyOTP = async (
  email: string,
  code: string,
  purpose: Purpose,
  logActor?: any
) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new AppError(401, "Invalid or expired OTP");
  }

  if (user.otpPurpose !== purpose) {
    throw new AppError(401, "OTP purpose mismatch");
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    // clear expired
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;
    await user.save();
    throw new AppError(401, "OTP expired");
  }

  if (user.otpCode !== code) {
    throw new AppError(401, "Invalid OTP");
  }

  if (user.isVerified === false && purpose === "verify_email") {
    user.isVerified = true; // mark verified on email verification
  }

  user.otpCode = null;
  user.otpExpiresAt = null;
  user.otpPurpose = null;
  await user.save();

  // Log OTP verification
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "OTP Verified",
        actor?.userId || "system",
        `OTP verified for '${email}' and purpose '${purpose}' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log OTP verification:", logError);
    }
  }

  return user;
};

export const OTPService = { sendOTP, verifyOTP };
