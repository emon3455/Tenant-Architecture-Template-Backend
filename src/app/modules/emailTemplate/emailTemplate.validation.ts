import { z } from "zod";
import { objectIdRegex } from "../../interfaces/common";

export const createTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
  designJson: z.string().min(1, "Design JSON is required"),
  des: z.string().optional(),
  category: z.string().regex(objectIdRegex, "Invalid category id").optional(),
  // Allow SUPER_ADMIN to optionally target a specific org; ignored for non-super users
  org: z.string().nullable().optional(),
});

export const updateTemplateSchema = z.object({
  org: z.string().nullable().optional(),
  title: z.string().min(1, "Title is required"),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
  designJson: z.string().min(1, "Design JSON is required"),
  des: z.string().optional(),
  category: z.string().regex(objectIdRegex, "Invalid category id").optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const testSendTemplateSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).nonempty()]),
  data: z.record(z.any()).optional(),
  subjectOverride: z.string().optional(),
});
