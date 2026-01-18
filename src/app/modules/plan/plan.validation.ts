import z from "zod";
import { DurationUnit } from "./plan.interface";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // kebab-case
const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const createPlanZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(100, { message: "Name cannot exceed 100 characters." }),
  description: z
    .string({ invalid_type_error: "Description must be string" })
    .max(1000, { message: "Description cannot exceed 1000 characters." })
    .optional(),
  slug: z
    .string()
    .regex(slugRegex, { message: "Slug must be kebab-case: letters, numbers and dashes only." })
    .optional(),
  durationUnit: z.enum(Object.values(DurationUnit) as [string, ...string[]]),
  durationValue: z.number().int().positive(),
  price: z.number().nonnegative(),
  features: z.array(z.string()).default([]).optional(),
  isTrial: z.boolean().optional().default(false),
  postTrialPlan: z
    .string()
    .regex(objectIdRegex, { message: "postTrialPlan must be a valid plan id" })
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
  serial: z.number().int().nonnegative().optional().default(0),
}).superRefine((data, ctx) => {
  if (data.isTrial && !data.postTrialPlan) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Trial plans must specify a postTrialPlan",
      path: ["postTrialPlan"],
    });
  }
});

export const updatePlanZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(100, { message: "Name cannot exceed 100 characters." })
    .optional(),
  description: z
    .string({ invalid_type_error: "Description must be string" })
    .max(1000, { message: "Description cannot exceed 1000 characters." })
    .optional(),
  slug: z
    .string()
    .regex(slugRegex, { message: "Slug must be kebab-case: letters, numbers and dashes only." })
    .optional(),
  durationUnit: z.enum(Object.values(DurationUnit) as [string, ...string[]]).optional(),
  durationValue: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  features: z.array(z.string()).optional(),
  isTrial: z.boolean().optional(),
  postTrialPlan: z
    .string()
    .regex(objectIdRegex, { message: "postTrialPlan must be a valid plan id" })
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
  serial: z.number().int().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (data.isTrial && !data.postTrialPlan) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Trial plans must specify a postTrialPlan",
      path: ["postTrialPlan"],
    });
  }
});
