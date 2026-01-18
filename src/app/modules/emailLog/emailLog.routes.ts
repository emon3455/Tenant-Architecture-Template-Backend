import express from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { validateRequest } from "../../middlewares/validateRequest";
import { EmailLogController } from "./emailLog.controller";
import {
    emailLogQuerySchema,
    emailAnalyticsQuerySchema,
    automationEmailLogsQuerySchema,
    leadEmailLogsQuerySchema,
    emailLogByIdSchema,
    cleanupOldLogsSchema
} from "./emailLog.validation";

const router = express.Router();

// Get all email logs
router.get("/",
    checkAuth(),
   
    EmailLogController.getEmailLogs
);

// Get email analytics
router.get("/analytics",
    checkAuth(),
    //validateRequest(emailAnalyticsQuerySchema),
    EmailLogController.getEmailAnalytics
);

// Get single email log
router.get("/:id",
    checkAuth(),
    validateRequest(emailLogByIdSchema),
    EmailLogController.getEmailLog
);

// Get email logs by automation
router.get("/automation/:automationId",
    checkAuth(),
    validateRequest(automationEmailLogsQuerySchema),
    EmailLogController.getEmailLogsByAutomation
);

// Get email logs by lead
router.get("/lead/:leadId",
    checkAuth(),
    validateRequest(leadEmailLogsQuerySchema),
    EmailLogController.getEmailLogsByLead
);

// Cleanup old logs (admin only)
router.delete("/cleanup",
    checkAuth(),
    validateRequest(cleanupOldLogsSchema),
    EmailLogController.cleanupOldLogs
);

export { router as EmailLogRoutes };