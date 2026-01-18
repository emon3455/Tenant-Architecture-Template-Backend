import httpStatus from "http-status-codes";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import AppError from "../../errorHelpers/AppError";
import { createNewAccessTokenWithRefreshToken } from "../../utils/userTokens";
import { User } from "../user/user.model";
import { IAuthProvider } from "../user/user.interface";
import { hashPassword, verifyPassword } from "../../utils/hash";
import { OTPService } from "../otp/otp.service";
import { OrgEmailTemplate } from "../emailTemplate/emailTemplate.model";
import EmailService from "../email/email.service";
import { envVars } from "../../config/env";
import { LogControllers } from "../log/log.controller";
import { LOG_ACTIONS } from "../log/log.actions";
import { Org } from "../org/org.model";
import { production } from "../../constant/constant";

const getNewAccessToken = async (refreshToken: string) => {
  const newAccessToken = await createNewAccessTokenWithRefreshToken(
    refreshToken
  );

  return {
    accessToken: newAccessToken,
  };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(httpStatus.BAD_REQUEST, "User does not exist");
  if (!user.isVerified)
    throw new AppError(httpStatus.BAD_REQUEST, "User is not verified");
  if (user.isDeleted)
    throw new AppError(httpStatus.BAD_REQUEST, "User is deleted");

  await OTPService.sendOTP(email, "reset_password");
  return true;
};

const verifyResetOtpAndIssueToken = async (email: string, otpCode: string) => {
  await OTPService.verifyOTP(email, otpCode, "reset_password");

  const user = await User.findOne({ email });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  const payload = {
    userId: String(user._id),
    email: user.email,
    purpose: "reset_password",
  };
  const resetToken = jwt.sign(payload, envVars.JWT_RESET_SECRET, {
    expiresIn: envVars.JWT_RESET_EXPIRES,
  } as SignOptions);

  // Send password reset email with reset link using DB template (fallback to legacy EJS on failure)
  try {
    const resetUILink = `${envVars.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Helper to parse expiry string like "15m", "900s", "1h"
    const parseExpiryMinutes = (val: string): number => {
      if (!val) return 15;
      const trimmed = String(val).trim().toLowerCase();
      const num = parseInt(trimmed, 10);
      if (Number.isNaN(num) || num <= 0) return 15;
      if (trimmed.endsWith("m")) return num;
      if (trimmed.endsWith("h")) return num * 60;
      if (trimmed.endsWith("s")) return Math.max(1, Math.ceil(num / 60));
      // if plain number, assume seconds
      return Math.max(1, Math.ceil(num / 60));
    };

    // Helper to replace {{placeholders}} in subject/body with simple {{#if key}} support
    const replacePlaceholders = (content: string, data: Record<string, unknown>) => {
      if (!content) return "";
      let processed = content;
      // Support {{#if key}}...{{/if}}
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

    // Try to fetch template from DB by provided ID (RESET LINK TEMPLATE)
    const TEMPLATE_ID = production
        ? "690d86fdb62eeb7a8e033677"
        : "690c1c84397a05ba541faf06";

    const dbTemplate = await OrgEmailTemplate.findById(TEMPLATE_ID).withoutTenant();

    // Build template data expected by the provided template
    let companyName: string | undefined;
    if (user.org) {
      const orgDoc = await Org.findById(user.org).select("orgName");
      companyName = orgDoc?.orgName || undefined;
    }
    const expiryMinutes = parseExpiryMinutes(envVars.JWT_RESET_EXPIRES);

    const templateData = {
      // For DB template
      recipient_name: user.name || (user.email?.split("@")[0] ?? "User"),
      company_name: companyName || "",
      reset_link: resetUILink,
      expiry_minutes: expiryMinutes,
      // For legacy fallback
      name: user.name || (user.email?.split("@")[0] ?? "User"),
      resetUILink: resetUILink,
    } as const;

    if (dbTemplate) {
      const subject = replacePlaceholders(dbTemplate.subject, templateData);
      const html = replacePlaceholders(dbTemplate.body, templateData);

      if (user.org) {
        try {
          // Prefer org-configured email providers/logging
          await EmailService.sendEmail(user.org as any, {
            to: email,
            subject,
            htmlContent: html,
            templateData: templateData as any,
            metadata: { templateId: TEMPLATE_ID, source: "db-email-template", purpose: "reset_link" },
          } as any);
        } catch (e) {
          // If org email send fails, send the rendered DB HTML via system transporter
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
        // Fallback for users without org: use legacy system sender
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
      // DB template not found -> fallback to legacy EJS template
      const { sendEmail } = await import("../../utils/sendEmail");
      await sendEmail({
        to: email,
        subject: "Password Reset",
        templateName: "forgetPassword",
        templateData: { name: templateData.name, resetUILink: templateData.resetUILink } as any,
      });
    }

    console.log(`Password reset email sent successfully to ${email}`);
  } catch (emailError) {
    // Log error but don't fail the token generation
    console.error("Failed to send password reset email:", emailError);
  }

  return resetToken;
};

const resetPassword = async (token: string, newPassword: string) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      String(token).trim(),
      envVars.JWT_RESET_SECRET
    ) as JwtPayload;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      throw new AppError(httpStatus.UNAUTHORIZED, "Reset link expired");
    }
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid reset token");
  }

  // Optional: enforce purpose in token
  if (decoded.purpose !== "reset_password") {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid reset token purpose");
  }

  const user = await User.findById(decoded.userId);
  if (!user) throw new AppError(httpStatus.BAD_REQUEST, "User does not exist");
  if (user.isDeleted)
    throw new AppError(httpStatus.BAD_REQUEST, "User is deleted");

  user.password = await hashPassword(newPassword);
  await user.save();

  return true;
};

const setPassword = async (userId: string, plainPassword: string) => {
  const user = await User.findById(userId);

  if (!user) throw new AppError(404, "User not found");
  if (
    user.password &&
    user.auths.some((providerObject) => providerObject.provider === "google")
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You have already set your password. Now you can change the password from your profile password update"
    );
  }

  const hashedPassword = await hashPassword(plainPassword);

  const credentialProvider: IAuthProvider = {
    provider: "credentials",
    providerId: user.email,
  };

  const auths: IAuthProvider[] = [...user.auths, credentialProvider];

  user.password = hashedPassword;
  user.auths = auths;

  await user.save();
  // Log password set event
  try {
    await LogControllers.addLog(
      LOG_ACTIONS.PASSWORD_SET,
      userId,
      `User ${user.name} set a password`,
      { userId } as any
    );
  } catch (logErr) {
    console.error("Failed to log password set:", logErr);
  }
};

const changePassword = async (
  oldPassword: string,
  newPassword: string,
  decodedToken: JwtPayload
) => {
  const user = await User.findById(decodedToken.userId);

  if (!user || !user.password) throw new AppError(404, "User not found");

  const isOldPasswordValid = await verifyPassword(oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Old Password does not match");
  }

  user.password = await hashPassword(newPassword);

  await user.save();
  // Log password change event
  try {
    await LogControllers.addLog(
      LOG_ACTIONS.PASSWORD_CHANGED,
      decodedToken.userId,
      `User ${decodedToken.userName} changed their password`,
      decodedToken
    );
  } catch (logErr) {
    console.error("Failed to log password change:", logErr);
  }
};

const loginByEmailAndRole = async (email: string, role?: string) => {
  // Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  
  if (!user.isVerified) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User is not verified");
  }
  
  if (user.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User is deleted");
  }
  
  // Optional: Check if the user has the specified role (for future use)
  if (role && user.role !== role) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User does not have the specified role");
  }
  
  return user;
};

export const AuthServices = {
  getNewAccessToken,
  resetPassword,
  changePassword,
  setPassword,
  forgotPassword,
  verifyResetOtpAndIssueToken,
  loginByEmailAndRole,
};
