import z from "zod";
import { objectIdRegex } from "../../interfaces/common";
import { PaymentStatus } from "./payment.interface";

export const createPaymentZodSchema = z.object({
  org: z.string().regex(objectIdRegex, { message: "org must be a valid Mongo ObjectId" }),
  plan: z.string().regex(objectIdRegex, { message: "plan must be a valid Mongo ObjectId" }),
  transactionId: z.string({ invalid_type_error: "transactionId must be string" }),
  description: z.string().trim().optional(),
  invoiceId: z.string({ invalid_type_error: "invoiceId must be string" }),
  amount: z.number({ invalid_type_error: "amount must be number" }).positive(),
  status: z.enum(Object.values(PaymentStatus) as [string]),
});

export const updatePaymentZodSchema = z.object({
  transactionId: z.string().optional(),
  amount: z.number().positive().optional(),
  description: z.string().trim().optional(),
  status: z.enum(Object.values(PaymentStatus) as [string]).optional(),
});
