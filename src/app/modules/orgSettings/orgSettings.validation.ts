import { z } from "zod";

export const upsertOrgSettingsZ = z.object({
  orgId: z.string(z.string()).optional(),
  branding: z.object({
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    primaryTextColor: z.string().optional(),
    secondaryTextColor: z.string().optional(),
  }),
  businessHours: z
    .array(
      z.object({
        dow: z.number().min(0).max(6),
        opens: z.string().min(1), // "HH:mm"
        closes: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  holidays: z
    .array(
      z.object({
        date: z.string().min(1),
        name: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  timezone: z.string().min(1).default("UTC"),
});
