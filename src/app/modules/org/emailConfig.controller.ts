/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import {
  setupEmailConfigurations,
  getEmailConfigurations,
  getEmailTemplate,
  sendEmail,
  updateEmailConfigurations,
  deleteEmailConfigurations,
  initializeDefaultTemplates,
  addEmailTemplates,
  emailConfigService,
  deleteEmailTemplates,
} from "./emailConfig.service";

export const setupEmailConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result = await setupEmailConfigurations(
      req.body,
      req.user,
      req.orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Email configuration setup successfully",
      data: result,
    });
  }
);

export const getEmailConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getEmailConfigurations(req.user, (req as any).orgId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email configuration retrieved successfully",
      data: result,
    });
  }
);

export const updateEmailConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result = await updateEmailConfigurations(
      req.body,
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email configuration updated successfully",
      data: result,
    });
  }
);

export const testEmailConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    
    const result = await emailConfigService.testEmailConfigurations(
      req.body.testEmail,
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.success
        ? "Test email sent successfully"
        : "Test email failed",
      data: result,
    });
  }
);

export const deleteEmailConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result = await deleteEmailConfigurations(
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email configuration deleted successfully",
      data: result,
    });
  }
);

// Template Management
export const addEmailTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const result = await addEmailTemplates(
      req.body,
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Email template added successfully",
      data: result,
    });
  }
);

export const getEmailTemplates = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getEmailTemplate(req.user, (req as any).orgId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email templates retrieved successfully",
      data: result,
    });
  }
);

export const updateEmailTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const result = await emailConfigService.updateEmailTemplate(
      req.params.templateName,
      req.body,
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email template updated successfully",
      data: result,
    });
  }
);

export const deleteEmailTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const result = await deleteEmailTemplates(
      req.params.templateName,
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email template deleted successfully",
      data: result,
    });
  }
);

export const initializeDefaultTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const result = await initializeDefaultTemplates(
      req.user,
      (req as any).orgId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Default email templates initialized successfully",
      data: result,
    });
  }
);

// Utility endpoints
export const getAvailableProviders = catchAsync(
  async (req: Request, res: Response) => {
    const result = await emailConfigService.getAvailableProviders();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Available email providers retrieved successfully",
      data: result,
    });
  }
);

export const sendTestEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await sendEmail(req.body, req.user, (req as any).orgId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.success
      ? "Email sent successfully"
      : "Email sending failed",
    data: result,
  });
});
