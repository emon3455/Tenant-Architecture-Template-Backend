import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentServices } from "./payment.service";
import { PaymentQuery } from "./payment.interface";
import { PaymentStatus } from "twilio/lib/rest/api/v2010/account/call/payment";

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.createPayment(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Payment created successfully",
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  // Convert query params to proper types
  const query: PaymentQuery & { type?: string } = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    search: req.query.search as string,
    status: req.query.status as PaymentStatus | "ALL" | string,
    orgId: req.query.orgId as string,
    planId: req.query.planId as string,
    type: req.query.type as string, // ADD THIS LINE
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await PaymentServices.getAllPayments(query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getPaymentById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment retrieved successfully",
    data: result,
  });
});

const getPaymentsByOrgId = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getPaymentsByOrgId(
    req.params.orgId,
    req.query as Record<string, string>
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payments retrieved successfully for organization",
    data: result.data,
    meta: result.meta,
  });
});

const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.updatePayment(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment updated successfully",
    data: result,
  });
});

const deletePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.deletePayment(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment deleted successfully",
    data: result,
  });
});

const downloadPaymentInvoice = catchAsync(async (req: Request, res: Response) => {
  const { buffer, filename } = await PaymentServices.generatePaymentInvoicePdf(req.params.id);
  
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const PaymentControllers = {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentsByOrgId,
  downloadPaymentInvoice
};
