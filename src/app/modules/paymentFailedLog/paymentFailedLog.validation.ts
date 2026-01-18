import { z } from "zod";
import {
  createPaymentFailedLogSchema,
  queryPaymentFailedLogSchema,
  updatePaymentFailedLogSchema,
} from "./paymentFailedLog.interface";

export const validateCreatePaymentFailedLog = (data: unknown) => {
  return createPaymentFailedLogSchema.parse(data);
};

export const validateQueryPaymentFailedLog = (query: unknown) => {
  return queryPaymentFailedLogSchema.parse(query);
};

export const validateUpdatePaymentFailedLog = (data: unknown) => {
  return updatePaymentFailedLogSchema.parse(data);
};
