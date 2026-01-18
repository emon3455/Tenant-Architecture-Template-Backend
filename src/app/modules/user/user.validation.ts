import z from "zod";
import { IsActive, Role, StorageUnit } from "./user.interface";
import { objectIdRegex } from "../../interfaces/common";

export const createUserZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(50, { message: "Name cannot exceed 50 characters." }),
  email: z
    .string({ invalid_type_error: "Email must be string" })
    .email({ message: "Invalid email address format." })
    .min(5, { message: "Email must be at least 5 characters long." })
    .max(100, { message: "Email cannot exceed 100 characters." }),
  contactId: z.string().regex(objectIdRegex, { message: "contactId must be a valid Mongo ObjectId" }).optional(),
  password: z
    .string({ invalid_type_error: "Password must be string" })
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      message: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      message: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      message: "Password must contain at least 1 number.",
    }),
  org: z.string().regex(objectIdRegex, { message: "org must be a valid Mongo ObjectId" }),
  role: z.string({ invalid_type_error: "Role must be string" }).optional(),
  phone: z
    .string({ invalid_type_error: "Phone Number must be string" }).optional(),
  address: z
    .string({ invalid_type_error: "Address must be string" })
    .max(200, { message: "Address cannot exceed 200 characters." })
    .optional(),
  /** User categories (array of UserCategory IDs) */
  categories: z.array(z.string().regex(objectIdRegex, { message: "Each category id must be a valid Mongo ObjectId" })).optional(),
  /** Hourly rate for user */
  hourlyRate: z.number({ invalid_type_error: "hourlyRate must be a number" }).min(0, { message: "hourlyRate must be at least 0" }).max(1000000, { message: "hourlyRate cannot exceed 1,000,000" }).optional(),
  isVerified: z
    .boolean({ invalid_type_error: "isVerified must be true or false" })
    .optional(),
  storageUsage: z
    .object({
      value: z.number().min(0).default(0),
      unit: z.enum(Object.values(StorageUnit) as [string, ...string[]]).default(StorageUnit.MB),
    })
    .optional(),
});
export const updateUserZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(50, { message: "Name cannot exceed 50 characters." })
    .optional(),
  password: z
    .string({ invalid_type_error: "Password must be string" })
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      message: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      message: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      message: "Password must contain at least 1 number.",
    })
    .optional(),
  phone: z
    .string({ invalid_type_error: "Phone Number must be string" }).optional(),
  org: z.string().regex(objectIdRegex, { message: "org must be a valid Mongo ObjectId" }).optional(),
  role: z.string().optional(),
  isActive: z.enum(Object.values(IsActive) as [string]).optional(),
  isDeleted: z
    .boolean({ invalid_type_error: "isDeleted must be true or false" })
    .optional(),
  isVerified: z
    .boolean({ invalid_type_error: "isVerified must be true or false" })
    .optional(),
  address: z
    .string({ invalid_type_error: "Address must be string" })
    .max(200, { message: "Address cannot exceed 200 characters." })
    .optional(),
  /** User categories (array of UserCategory IDs) */
  categories: z.array(z.string().regex(objectIdRegex, { message: "Each category id must be a valid Mongo ObjectId" })).optional(),
  /** Hourly rate for user */
  hourlyRate: z.number({ invalid_type_error: "hourlyRate must be a number" }).min(0, { message: "hourlyRate must be at least 0" }).max(1000000, { message: "hourlyRate cannot exceed 1,000,000" }).optional(),
  storageUsage: z
    .object({
      value: z.number().min(0).default(0),
      unit: z.enum(Object.values(StorageUnit) as [string, ...string[]]).default(StorageUnit.MB),
    })
    .optional(),
});

/** User Feature Action */
const zUserFeatureAction = z.object({
  description: z.string().min(1, { message: "Action description is required" }),
  value: z.string().min(1, { message: "Action value is required" }),
  isActive: z.boolean().default(true),
});

/** ISubFeature */
const zSubFeature = z.object({
  name: z.string().min(1, { message: "SubFeature name is required" }),
  key: z.string().min(1, { message: "SubFeature key is required" }),
  actions: z.array(zUserFeatureAction).default([]),
});

/** IFeature */
const zFeature = z.object({
  name: z.string().min(1, { message: "Feature name is required" }),
  key: z.string().min(1, { message: "Feature key is required" }),
  actions: z.array(zUserFeatureAction).default([]),
  subFeatures: z.array(zSubFeature).default([]),
});

export const setFeatureAccessZod = z.object({
  featureAccess: z.array(zFeature).default([]),
});

//Agent
// export const createUserSupportAgentZodSchema = z.object({
//   name: z
//     .string({ invalid_type_error: "Name must be string" })
//     .min(2, { message: "Name must be at least 2 characters long." })
//     .max(50, { message: "Name cannot exceed 50 characters." }),
//   email: z
//     .string({ invalid_type_error: "Email must be string" })
//     .email({ message: "Invalid email address format." })
//     .min(5, { message: "Email must be at least 5 characters long." })
//     .max(100, { message: "Email cannot exceed 100 characters." }),
//   password: z
//     .string({ invalid_type_error: "Password must be string" })
//     .min(8, { message: "Password must be at least 8 characters long." })
//     .regex(/^(?=.*[A-Z])/, {
//       message: "Password must contain at least 1 uppercase letter.",
//     })
//     .regex(/^(?=.*[!@#$%^&*])/, {
//       message: "Password must contain at least 1 special character.",
//     })
//     .regex(/^(?=.*\d)/, {
//       message: "Password must contain at least 1 number.",
//     }),
//   role: z.string({ invalid_type_error: "Role must be string" }).optional(),
//   phone: z
//     .string({ invalid_type_error: "Phone Number must be string" }).optional(),
//   address: z
//     .string({ invalid_type_error: "Address must be string" })
//     .max(200, { message: "Address cannot exceed 200 characters." })
//     .optional(),
// });

export const createUserSupportAgentZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(50, { message: "Name cannot exceed 50 characters." }),
  email: z
    .string({ invalid_type_error: "Email must be string" })
    .email({ message: "Invalid email address format." })
    .min(5, { message: "Email must be at least 5 characters long." })
    .max(100, { message: "Email cannot exceed 100 characters." }),
  password: z
    .string({ invalid_type_error: "Password must be string" })
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      message: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      message: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      message: "Password must contain at least 1 number.",
    }),
  role: z.string({ invalid_type_error: "Role must be string" }).optional(),
  phone: z
    .string({ invalid_type_error: "Phone Number must be string" })
    .optional(),
  address: z
    .string({ invalid_type_error: "Address must be string" })
    .max(200, { message: "Address cannot exceed 200 characters." })
    .optional(),
  /** User categories (array of UserCategory IDs) */
  categories: z.array(z.string().regex(objectIdRegex, { message: "Each category id must be a valid Mongo ObjectId" })).optional(),
  /** Hourly rate for user */
  hourlyRate: z.number({ invalid_type_error: "hourlyRate must be a number" }).min(0, { message: "hourlyRate must be at least 0" }).max(1000000, { message: "hourlyRate cannot exceed 1,000,000" }).optional(),
  isVerified: z
    .boolean({ invalid_type_error: "isVerified must be true or false" })
    .optional(),
  storageUsage: z
    .object({
      value: z.number().min(0).default(0),
      unit: z
        .enum(Object.values(StorageUnit) as [string, ...string[]])
        .default(StorageUnit.MB),
    })
    .optional(),
});

// Update agent schema - for editing agents
export const updateUserSupportAgentZodSchema = z.object({
  name: z
    .string({ invalid_type_error: "Name must be string" })
    .min(2, { message: "Name must be at least 2 characters long." })
    .max(50, { message: "Name cannot exceed 50 characters." })
    .optional(),
  password: z
    .string({ invalid_type_error: "Password must be string" })
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/^(?=.*[A-Z])/, {
      message: "Password must contain at least 1 uppercase letter.",
    })
    .regex(/^(?=.*[!@#$%^&*])/, {
      message: "Password must contain at least 1 special character.",
    })
    .regex(/^(?=.*\d)/, {
      message: "Password must contain at least 1 number.",
    })
    .optional(),
  phone: z
    .string({ invalid_type_error: "Phone Number must be string" })
    .optional(),
  address: z
    .string({ invalid_type_error: "Address must be string" })
    .max(200, { message: "Address cannot exceed 200 characters." })
    .optional(),
  /** User categories (array of UserCategory IDs) */
  categories: z.array(z.string().regex(objectIdRegex, { message: "Each category id must be a valid Mongo ObjectId" })).optional(),
  /** Hourly rate for user */
  hourlyRate: z.number({ invalid_type_error: "hourlyRate must be a number" }).min(0, { message: "hourlyRate must be at least 0" }).max(1000000, { message: "hourlyRate cannot exceed 1,000,000" }).optional(),
  isVerified: z
    .boolean({ invalid_type_error: "isVerified must be true or false" })
    .optional(),
  storageUsage: z
    .object({
      value: z.number().min(0).default(0),
      unit: z
        .enum(Object.values(StorageUnit) as [string, ...string[]])
        .default(StorageUnit.MB),
    })
    .optional(),
});