import z from "zod";
import { OrgStatus } from "./org.interface";
import { objectIdRegex } from "../../interfaces/common";

export const createOrgZodSchema = z.object({
  orgName: z
    .string({ invalid_type_error: "orgName must be string" })
    .min(2, { message: "orgName must be at least 2 characters long." })
    .max(120, { message: "orgName cannot exceed 120 characters." }),
  orgEmail: z
    .string({ invalid_type_error: "orgEmail must be string" })
    .email({ message: "Invalid email address format." }),
  plan: z
    .string()
    .regex(objectIdRegex, { message: "plan must be a valid Mongo ObjectId" }),
  status: z.enum(Object.values(OrgStatus) as [string, ...string[]]).optional(), // default in model: PENDING
  orgPhone: z.string().optional(),
  orgAddress: z
    .object({
      searchLocation: z.string().optional(),
      address: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  billingInfo: z
    .object({
      paymentMethodId: z.string(),
    })
    .optional(),
  stripeCustomerId: z.string().optional(),

});

export const updateOrgZodSchema = z.object({
  orgName: z
    .string({ invalid_type_error: "orgName must be string" })
    .min(2, { message: "orgName must be at least 2 characters long." })
    .max(120, { message: "orgName cannot exceed 120 characters." })
    .optional(),
  orgEmail: z
    .string({ invalid_type_error: "orgEmail must be string" })
    .email({ message: "Invalid email address format." })
    .optional(),
  plan: z
    .string()
    .regex(objectIdRegex, { message: "plan must be a valid Mongo ObjectId" })
    .optional(),
  status: z.enum(Object.values(OrgStatus) as [string, ...string[]]).optional(),
  orgPhone: z.string().optional(),
  orgAddress: z
    .object({
      searchLocation: z.string().optional(),
      address: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  billingInfo: z
    .object({
      paymentMethodId: z.string(),
    })
    .optional(),
  stripeCustomerId: z.string().optional(),
});

export const updateBillingInfoZodSchema = z.object({
  orgId: z
    .string({ invalid_type_error: "orgId must be a string" })
    .optional(),
  billingInfo: z.object({
    paymentMethodId: z.string().min(1, "Payment Method ID is required"),
  }),
});

export const updateBillingDatesZodSchema = z.object({
  planStartDate: z.string().datetime().optional(),
  nextBillingDate: z.string().datetime().optional(),
});