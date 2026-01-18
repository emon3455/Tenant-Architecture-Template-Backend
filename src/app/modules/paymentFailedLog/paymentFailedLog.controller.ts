import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status-codes";
import * as PaymentFailedLogService from "./paymentFailedLog.service";
import {
  validateCreatePaymentFailedLog,
  validateQueryPaymentFailedLog,
  validateUpdatePaymentFailedLog,
} from "./paymentFailedLog.validation";
import { JwtPayload } from "jsonwebtoken";

/**
 * Create a new payment failed log
 */
export const createPaymentFailedLog = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const validatedData = validateCreatePaymentFailedLog({
      ...req.body,
      org: req.body.org || user.org,
    });

    const log = await PaymentFailedLogService.createPaymentFailedLog(validatedData);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payment failure logged successfully",
      data: log,
    });
  }
);

/**
 * Get all payment failed logs with filtering
 */
export const getPaymentFailedLogs = catchAsync(
  async (req: Request, res: Response) => {
    const validatedQuery = validateQueryPaymentFailedLog(req.query);
    const result = await PaymentFailedLogService.getPaymentFailedLogs(validatedQuery);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment failed logs retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

/**
 * Get a single payment failed log by ID
 */
export const getPaymentFailedLogById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const log = await PaymentFailedLogService.getPaymentFailedLogById(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment failed log retrieved successfully",
      data: log,
    });
  }
);

/**
 * Update a payment failed log
 */
export const updatePaymentFailedLog = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = req.user as JwtPayload;
    
    // Prepare update data with resolvedBy
    const updateData = { ...req.body };
    if (updateData.isResolved === true && !updateData.resolvedBy) {
      updateData.resolvedBy = user.userId;
    }
    
    const validatedData = validateUpdatePaymentFailedLog(updateData);

    const log = await PaymentFailedLogService.updatePaymentFailedLog(id, validatedData);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment failed log updated successfully",
      data: log,
    });
  }
);

/**
 * Delete a payment failed log
 */
export const deletePaymentFailedLog = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await PaymentFailedLogService.deletePaymentFailedLog(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment failed log deleted successfully",
      data: null,
    });
  }
);

/**
 * Get payment failed log statistics
 */
export const getPaymentFailedLogStats = catchAsync(
  async (req: Request, res: Response) => {
    const { orgId } = req.query;
    const result = await PaymentFailedLogService.getPaymentFailedLogStats(
      orgId as string | undefined
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment failed log statistics retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);
