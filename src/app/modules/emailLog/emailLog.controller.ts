import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { EmailLogService } from "./emailLog.service";
import {
    emailLogQuerySchema,
    emailAnalyticsQuerySchema,
    automationEmailLogsQuerySchema,
    leadEmailLogsQuerySchema,
    emailLogByIdSchema,
    cleanupOldLogsSchema
} from "./emailLog.validation";

const getEmailLogs = catchAsync(async (req: Request, res: Response) => {
    const userOrgId = (req as any).orgId;
    const queryOrgId = req.query.orgId as string;
    
    // For SUPER_ADMIN: use query orgId if provided, otherwise use user's orgId
    // For regular users: always use their own orgId
    const userRole = (req as any).user?.role;
    
    let finalOrgId: string;
    if (userRole === 'SUPER_ADMIN')  finalOrgId = queryOrgId || userOrgId;
     else finalOrgId = userOrgId;
    
    
    const query = { ...req.query, orgId: finalOrgId };
    
    console.log('Email Logs Query:', {
        userRole,
        userOrgId,
        queryOrgId,
        finalOrgId,
        allQueryParams: req.query
    });

    const result = await EmailLogService.getEmailLogs(query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email logs retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getEmailLog = catchAsync(async (req: Request, res: Response) => {
    const orgId = (req as any).orgId;
    const result = await EmailLogService.getEmailLogById(req.params.id, orgId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email log retrieved successfully",
        data: result,
    });
});

const getEmailAnalytics = catchAsync(async (req: Request, res: Response) => {
    const orgId = (req as any).orgId;
    
    // Add orgId to query and pass entire query object (following log service pattern)
    const query = { ...req.query, orgId };
    const result = await EmailLogService.getEmailAnalytics(query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Email analytics retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getEmailLogsByAutomation = catchAsync(async (req: Request, res: Response) => {
    const orgId = (req as any).orgId;
    const { automationId } = req.params;

    const result = await EmailLogService.getEmailLogsByAutomation(
        automationId,
        orgId,
        req.query
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Automation email logs retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getEmailLogsByLead = catchAsync(async (req: Request, res: Response) => {
    const orgId = (req as any).orgId;
    const { leadId } = req.params;

    const result = await EmailLogService.getEmailLogsByLead(
        leadId,
        orgId,
        req.query
    );

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Lead email logs retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
});

const cleanupOldLogs = catchAsync(async (req: Request, res: Response) => {
    const { days } = req.query;
    const daysToKeep = days ? parseInt(days as string) : 90;

    const result = await EmailLogService.cleanupOldLogs(daysToKeep);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Old email logs cleaned up successfully",
        data: result,
    });
});

export const EmailLogController = {
    getEmailLogs,
    getEmailLog,
    getEmailAnalytics,
    getEmailLogsByAutomation,
    getEmailLogsByLead,
    cleanupOldLogs,
};