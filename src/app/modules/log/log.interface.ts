import { Document, Types } from "mongoose";
import { z } from "zod";
import { objectIdRegex } from "../../interfaces/common";

// Add IGenericResponse interface
export interface IGenericResponse<T> {
  data: T;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}

// Zod Schemas
export const createLogZodSchema = z.object({
  org: z.string().regex(objectIdRegex, { message: "org must be a valid Mongo ObjectId" }).optional(),
  action: z.string().min(1, { message: "Action is required" }),
  user: z.string().regex(objectIdRegex, { message: "user must be a valid Mongo ObjectId" }).optional(),
  details: z.string().default("No additional details provided"),
});

export const logQueryZodSchema = z.object({
  user: z.string().regex(objectIdRegex, { message: "user must be a valid Mongo ObjectId" }).optional(),
  action: z.string().optional(),
  orgId: z.string().optional(),
  actions: z.string().optional().transform(val => val ? val.split(',') : undefined),
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'action', 'user']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// TypeScript Interface - ADD ORG FIELD
export interface ILog extends Document {
  org: Types.ObjectId | null; 
  action: string;
  user: Types.ObjectId;
  details: string;
  createdAt: Date;
  updatedAt: Date;
}

// Zod inferred types
export type CreateLogInput = z.infer<typeof createLogZodSchema>;
export type LogQuery = z.infer<typeof logQueryZodSchema>;

// Service response types
export interface PaginatedLogs {
  logs: ILog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}