import httpStatus from "http-status-codes";
import AppError from "../../errorHelpers/AppError";
import { IPayment, PaymentType } from "./payment.interface";
import { Payment } from "./payment.model";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IGenericResponse } from "../../interfaces/common";
import { LogControllers } from "../log/log.controller";
import { PaymentQuery } from "./payment.interface";
import { Types } from "mongoose";
import { generateInvoicePdfBuffer } from "../../utils/InvoicePdf";

const createPayment = async (payload: Partial<IPayment>, logActor?: any) => {
  const exists = await Payment.findOne({
    transactionId: payload.transactionId,
  });
  if (exists) {
    throw new AppError(httpStatus.BAD_REQUEST, "Transaction already exists");
  }
  const payment = await Payment.create(payload);
  // Log payment creation
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Payment Created",
        actor?.userId || "system",
        `Payment '${
          payment.transactionId || payment._id
        }' created by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log payment creation:", logError);
    }
  }
  return payment;
};

const getAllPayments = async (query: PaymentQuery & { type?: string }): Promise<IGenericResponse<IPayment[]>> => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    orgId,
    planId,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
    type, 
  } = query;

  const filter: any = {};

  // Status filter
  if (status && status !== "ALL") {
    filter.status = status;
  }

  // Type filter based on type field
  if (type && type !== "ALL") {
    const validTypes = Object.values(PaymentType);
    const typeUpper = type.toUpperCase();
    
    // Validate the type parameter
    if (!validTypes.includes(typeUpper as PaymentType)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid type parameter. Must be one of: ${validTypes.join(", ")} or "ALL"`
      );
    }
    filter.type = typeUpper;
  }

  // Organization filter - only apply if valid ObjectId
  if (orgId && Types.ObjectId.isValid(orgId)) {
    filter.org = new Types.ObjectId(orgId);
  } else if (orgId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid organization ID");
  }

  // Plan filter - only apply if valid ObjectId
  if (planId && Types.ObjectId.isValid(planId)) {
    filter.plan = new Types.ObjectId(planId);
  } else if (planId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid plan ID");
  }

  // Time-based filtering (following logs pattern)
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid date range provided");
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  } else if (startDate) {
    // Handle only start date
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid startDate format");
    }
    start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  } else if (endDate) {
    // Handle only end date
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid endDate format");
    }
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $lte: end };
  }

  const baseQuery = Payment.find(filter)
    .populate("org", "orgName orgEmail")
    .populate("plan", "name price duration");

  // Convert query parameters to strings for QueryBuilder
  const queryForBuilder: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
    sort: (sortOrder === "desc" ? "-" : "") + sortBy,
    ...(search && { searchTerm: search }),
    ...(status && status !== "ALL" && { status }),
    ...(orgId && Types.ObjectId.isValid(orgId) && { org: orgId }),
    ...(planId && Types.ObjectId.isValid(planId) && { plan: planId }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(type && type !== "ALL" && { type }), // Pass type to QueryBuilder if needed
  };

  const queryBuilder = new QueryBuilder(baseQuery, queryForBuilder)
    .search(["transactionId", "invoiceId"]) // Search in transaction and invoice IDs
    .sort()
    .fields()
    .paginate();

  const payments = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  return { data: payments, meta };
};


const getPaymentById = async (id: string) => {
  const payment = await Payment.findById(id).populate("org").populate("plan");
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  return payment;
};

// 🔹 Get payments by orgId
const getPaymentsByOrgId = async (
  orgId: string,
  query: Record<string, string>
): Promise<IGenericResponse<IPayment[]>> => {
  const baseQuery = Payment.find({ org: orgId }).populate("plan");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .fields()
    .paginate();

  const payments = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  return { data: payments, meta };
};

const updatePayment = async (
  id: string,
  payload: Partial<IPayment>,
  logActor?: any
) => {
  const payment = await Payment.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  // Log payment update
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      const updatedFields = Object.keys(payload).join(", ");
      await LogControllers.addLog(
        "Payment Updated",
        actor?.userId || "system",
        `Payment '${
          payment.transactionId || payment._id
        }' updated [${updatedFields}] by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log payment update:", logError);
    }
  }
  return payment;
};

const deletePayment = async (id: string, logActor?: any) => {
  const payment = await Payment.findByIdAndDelete(id);
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  // Log payment deletion
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Payment Deleted",
        actor?.userId || "system",
        `Payment '${
          payment.transactionId || payment._id
        }' deleted by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log payment deletion:", logError);
    }
  }
  return payment;
};

const generatePaymentInvoicePdf = async (id: string): Promise<{ buffer: Buffer; filename: string }> => {
  const payment = await Payment.findById(id)
    .populate("org", "orgName orgEmail orgPhone orgAddress")
    .populate("plan", "name price duration");
  
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
  }

  const paymentData = payment as any;
  
  // Extract address fields from orgAddress object
  const orgAddress = paymentData.org?.orgAddress || {};
  const addressLine1 = orgAddress.address || "";
  const addressLine2 = orgAddress.street || "";
  const city = orgAddress.city || "";
  const state = orgAddress.state || "";
  const zip = orgAddress.zip || "";
  
  // Format full address for billTo (single line)
  const fullAddressParts = [
    addressLine1,
    addressLine2,
    city,
    state,
    zip
  ].filter(Boolean);
  const fullAddress = fullAddressParts.join(", ");
  
  // Prepare invoice data
  const invoiceOptions = {
    invoiceNumber: paymentData.invoiceId || paymentData.transactionId,
    invoiceDate: new Date(paymentData.createdAt),
    // REMOVED: dueDate
    currency: "USD",
    company: {
      name: paymentData.org?.orgName || "Company Name",
      email: paymentData.org?.orgEmail || "",
      phone: paymentData.org?.orgPhone || "",
      addressLine1: addressLine1,
      addressLine2: addressLine2,
      city: city,
      state: state,
      zip: zip,
    },
    billTo: {
      name: paymentData.org?.orgName || "Customer",
      email: paymentData.org?.orgEmail || "",
      phone: paymentData.org?.orgPhone || "",
      address: fullAddress,
      // REMOVED: duplicate company field
    },
    items: [
      {
        description: `${paymentData.plan?.name || "Subscription Plan"} - ${paymentData.plan?.duration || ""}`,
        quantity: 1,
        unitPrice: paymentData.amount,
        amount: paymentData.amount,
      },
    ],
    subtotal: paymentData.amount,
    tax: 0,
    discount: 0,
    total: paymentData.amount,
    notes: paymentData.description || `Payment for ${paymentData.plan?.name || "subscription"}. Transaction ID: ${paymentData.transactionId}`,
  };

  return await generateInvoicePdfBuffer(invoiceOptions);
};

export const PaymentServices = {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
  getPaymentsByOrgId,
  generatePaymentInvoicePdf,
};
