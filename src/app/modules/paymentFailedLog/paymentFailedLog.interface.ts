import { Document, Types } from "mongoose";
import { z } from "zod";

export enum PaymentFailureReason {
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  CARD_DECLINED = "CARD_DECLINED",
  EXPIRED_CARD = "EXPIRED_CARD",
  INVALID_CARD = "INVALID_CARD",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  FRAUD_DETECTED = "FRAUD_DETECTED",
  NETWORK_ERROR = "NETWORK_ERROR",
  GATEWAY_ERROR = "GATEWAY_ERROR",
  UNSUPPORTED_CARD = "UNSUPPORTED_CARD",
  DUPLICATE_TRANSACTION = "DUPLICATE_TRANSACTION",
  UNKNOWN = "UNKNOWN",
}

export enum PaymentFailureSource {
  SUBSCRIPTION_RENEWAL = "SUBSCRIPTION_RENEWAL",
  PLAN_PURCHASE = "PLAN_PURCHASE",
  PLAN_CHANGE = "PLAN_CHANGE",
  PLAN_RENEWAL = "PLAN_RENEWAL",
  CREDIT_PURCHASE = "CREDIT_PURCHASE",
  JOB_PAYMENT = "JOB_PAYMENT",
  INVOICE_PAYMENT = "INVOICE_PAYMENT",
  PAYMENT_METHOD_UPDATE = "PAYMENT_METHOD_UPDATE",
  OTHER = "OTHER",
}

export interface IPaymentFailedLog extends Document {
  org: Types.ObjectId;
  user?: Types.ObjectId;
  source: PaymentFailureSource;
  failureReason: PaymentFailureReason;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  transactionId?: string;
  stripeErrorCode?: string;
  stripeErrorMessage?: string;
  errorDetails: string;
  metadata?: {
    planId?: Types.ObjectId;
    planName?: string;
    creditAmount?: number;
    invoiceId?: string;
    jobId?: Types.ObjectId;
    [key: string]: any;
  };
  attemptCount?: number;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentFailedLogPopulated extends Omit<IPaymentFailedLog, 'org' | 'user' | 'resolvedBy'> {
  org: {
    _id: string;
    orgName: string;
    orgEmail: string;
  };
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

// Zod schemas
export const createPaymentFailedLogSchema = z.object({
  org: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
  source: z.nativeEnum(PaymentFailureSource),
  failureReason: z.nativeEnum(PaymentFailureReason),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD"),
  paymentMethodId: z.string().optional(),
  transactionId: z.string().optional(),
  stripeErrorCode: z.string().optional(),
  stripeErrorMessage: z.string().optional(),
  errorDetails: z.string().min(1, "Error details are required"),
  metadata: z.record(z.any()).optional(),
  attemptCount: z.number().int().min(1).default(1),
});

export const queryPaymentFailedLogSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  search: z.string().optional(),
  source: z.nativeEnum(PaymentFailureSource).optional(),
  failureReason: z.nativeEnum(PaymentFailureReason).optional(),
  isResolved: z.string().transform(val => val === "true" || val === "false" ? val === "true" : undefined).optional(),
  orgId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'source', 'failureReason']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  minAmount: z.string().transform(Number).optional(),
  maxAmount: z.string().transform(Number).optional(),
});

export const updatePaymentFailedLogSchema = z.object({
  isResolved: z.boolean().optional(),
  resolvedBy: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional(),
  resolutionNotes: z.string().optional(),
  attemptCount: z.number().int().min(1).optional(),
});

export type CreatePaymentFailedLogInput = z.infer<typeof createPaymentFailedLogSchema>;
export type QueryPaymentFailedLogInput = z.infer<typeof queryPaymentFailedLogSchema>;
export type UpdatePaymentFailedLogInput = z.infer<typeof updatePaymentFailedLogSchema>;

export interface PaymentFailedLogStats {
  totalFailures: number;
  unresolvedFailures: number;
  resolvedFailures: number;
  totalFailedAmount: number;
  failuresByReason: Array<{
    _id: PaymentFailureReason;
    count: number;
    totalAmount: number;
  }>;
  failuresBySource: Array<{
    _id: PaymentFailureSource;
    count: number;
    totalAmount: number;
  }>;
  recentFailures: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}
