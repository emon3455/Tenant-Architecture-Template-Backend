import { z } from "zod";

const channelsSchema = z.object({
  dndAllChannels: z.boolean().default(false).optional(),
  email: z.boolean().default(true).optional(),
  extMessage: z.boolean().default(true).optional(),
  callAndVoice: z.boolean().default(true).optional(),
  inboundCallsAndSms: z.boolean().default(true).optional(),
});

export const createContactSchema = z
  .object({
    org: z.string().optional(),
    name: z.string().trim().optional(),
    email: z
      .string()
      .email("Invalid email format")
      .trim()
      .toLowerCase()
      .optional(),
    phone: z.string().trim().optional(),
    tags: z.array(z.string().trim()).optional(),
    profileUrl: z.string().url("Invalid URL format").trim().optional(),
    contactType: z.string().trim().optional(),
    timeZone: z.string().trim().optional(),
    channels: channelsSchema.optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email"],
  });

export const updateContactSchema = z
  .object({
    name: z.string().trim().optional(),
    email: z
      .string()
      .email("Invalid email format")
      .trim()
      .toLowerCase()
      .optional(),
    phone: z.string().trim().optional(),
    tags: z.array(z.string().trim()).optional(),
    profileUrl: z.string().url("Invalid URL format").trim().optional(),
    contactType: z.string().trim().optional(),
    timeZone: z.string().trim().optional(),
    channels: channelsSchema.optional(),
  })
  .partial();

  const getUsersCountByTagsSchema = z.object({
  tags: z
    .array(z.string().min(1, "Tag cannot be empty"))
    .min(1, "At least one tag is required"),
});

export const ContactValidation = {
  createContactSchema,
  updateContactSchema,
  getUsersCountByTagsSchema
};
