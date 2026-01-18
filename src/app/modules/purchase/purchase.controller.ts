import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { purchaseService } from "./purchase.service";
import { sendResponse } from "../../utils/sendResponse";
import AppError from "../../errorHelpers/AppError";

const purchase = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  // Debug log what is being sent to the service
  //console.log("[DEBUG] purchaseController.purchase: payload:", payload);
  //console.log("[DEBUG] purchaseController.purchase: req.user:", req.user);
  if (!payload.billingInfo?.paymentMethodId) {
    throw new AppError(400, "billingInfo.paymentMethodId is required");
  }
  const result = await purchaseService.handlePurchase(payload, req.user);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Purchase completed successfully",
    data: result,
  });
});

const changePlan = catchAsync(async (req: Request, res: Response) => {
  const { orgId, planId, billingInfo, userId } = req.body as any;
  // Debug log what is being sent to the service
  //console.log("[DEBUG] purchaseController.changePlan: orgId:",req.body);
  //console.log("[DEBUG] purchaseController.changePlan: orgId:", orgId);
  //console.log("[DEBUG] purchaseController.changePlan: planId:", planId);
  //console.log(
  // "[DEBUG] purchaseController.changePlan: billingInfo:",
  //  billingInfo
  //);
  //console.log("[DEBUG] purchaseController.changePlan: req.user:", req.user);
  //console.log(
  // "[DEBUG] purchaseController.changePlan: userId (from body):",
  //  userId
  //);

  // Prefer middleware-provided req.user; fall back to userId from body if available
  const actor = req.user || (userId ? { userId } : undefined);

  const result = await purchaseService.handleChangePlan(
    {
      orgId,
      planId,
      billingInfo,
      userId,
    },
    actor as any
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Plan changed successfully",
    data: result,
  });
});

export const purchaseController = { purchase, changePlan };
