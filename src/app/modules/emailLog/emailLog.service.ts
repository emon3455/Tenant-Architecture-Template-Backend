import { Types } from "mongoose";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { IGenericResponse } from "../../interfaces/common";
import { EmailLog, EmailQueue } from "./emailLog.model";
import { IEmailLog, IEmailQueue, EmailStatus } from "./emailLog.interface";
import { LogControllers } from "../log/log.controller";
import AppError from "../../errorHelpers/AppError";
import httpStatus from "http-status-codes";
import Time from "../../utils/time";
const searchableFields = ["subject", "to", "body", "metadata.templateName"];

/**
 * Create email log entry
 */
const createEmailLog = async (
  logData: Partial<IEmailLog>,
  logActor?: any
): Promise<IEmailLog> => {
  const emailLog = await EmailLog.create(logData);
  // Log email log creation
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Email Log Created",
        actor?.userId || "system",
        `Email log created for subject '${
          logData.subject || ""
        }' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log email log creation:", logError);
    }
  }
  return emailLog;
};

/**
 * Get all email logs for an organization
 */
export const getEmailLogs = async (
  query: Record<string, any>
): Promise<IGenericResponse<IEmailLog[]>> => {
  const {
    orgId,
    status,
    provider,
    search,
    page = 1,
    limit = 20,
    startDate,
    endDate,
    emailType,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter: any = {};

  // Organization filter
  if (orgId) {
    filter.orgId = new Types.ObjectId(orgId);
  }

  if (emailType === "system") {
    filter["metadata.type"] = "system_email";
  } else if (emailType === "regular") {
    filter["metadata.type"] = { $ne: "system_email" };
  }

  // Status filter
  if (status) {
    filter.status = status;
  }

  // Provider filter - ADD THIS
  if (provider) {
    filter.provider = provider;
  }

  // Time-based filtering
  if (startDate && endDate) {
    const { start, end } = Time.getDateRangeFromISO(startDate, endDate);

    if (!Time.isValidDateTime(start) || !Time.isValidDateTime(end)) {
      throw new Error("Invalid date range provided");
    }

    filter.createdAt = {
      $gte: Time.toJSDate(start),
      $lte: Time.toJSDate(end),
    };
  } else if (startDate) {
    // Handle only start date
    const start = Time.fromISO(startDate).startOf("day");
    if (!Time.isValidDateTime(start)) {
      throw new Error("Invalid startDate format");
    }
    filter.createdAt = { $gte: Time.toJSDate(start) };
  } else if (endDate) {
    // Handle only end date
    const end = Time.fromISO(endDate).endOf("day");
    if (!Time.isValidDateTime(end)) {
      throw new Error("Invalid endDate format");
    }
    filter.createdAt = { $lte: Time.toJSDate(end) };
  }

  // Search across multiple fields (exclude sender/from)
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: "i" } },
      { to: { $regex: search, $options: "i" } },
      { cc: { $regex: search, $options: "i" } },
      { bcc: { $regex: search, $options: "i" } },
      // { body: { $regex: search, $options: "i" } },
      // { "metadata.templateName": { $regex: search, $options: "i" } },
    ];
  }

  const baseQuery = EmailLog.find(filter)
    .populate("metadata.automationId", "name")
    .populate("metadata.leadId", "name email")
    .populate("metadata.userId", "name email");

  // Convert query parameters to strings for QueryBuilder
  const queryForBuilder: Record<string, string> = {
    page: page.toString(),
    limit: limit.toString(),
    sort: (sortOrder === "desc" ? "-" : "") + sortBy,
    ...(search && { searchTerm: search }),
    ...(status && { status }),
    ...(provider && { provider }), // ADD THIS
    ...(orgId && { orgId }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const qb = new QueryBuilder(baseQuery, queryForBuilder)
    .search(searchableFields)
    .sort()
    .fields()
    .paginate();

  const data = await qb.build();
  const meta = await qb.getMeta();

  return { data, meta };
};

/**
 * Get all email logs for an organization - SIMPLIFIED VERSION
 */

// const getEmailLogs = async (
//   query: Record<string, any>,
//   orgId: string
// ): Promise<IGenericResponse<IEmailLog[]>> => {
//   // Remove all population, filtering, and complex query building
//   const logs = await EmailLog.find({ });

//   // Simple count for meta
//   const total = await EmailLog.countDocuments({ });

//   return {
//     data: logs,
//     meta: {
//       page: 1,
//       limit: logs.length,
//       total,
//       totalPage: 1
//     }
//   };
// };

/**
 * Get email log by ID
 */
const getEmailLogById = async (
  id: string,
  orgId: string
): Promise<IEmailLog> => {
  const log = await EmailLog.findOne({ _id: id, orgId })
    .populate("metadata.automationId", "name")
    .populate("metadata.leadId", "name email")
    .populate("metadata.userId", "name email");

  if (!log) {
    throw new AppError(httpStatus.NOT_FOUND, "Email log not found");
  }

  return log;
};

/**
 * Update email log status (for webhook updates)
 */
const updateEmailLogStatus = async (
  providerMessageId: string,
  updateData: Partial<IEmailLog>,
  logActor?: any
): Promise<IEmailLog | null> => {
  const log = await EmailLog.findOneAndUpdate(
    { providerMessageId },
    updateData,
    { new: true }
  );
  // Log email log status update
  if (log && logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Email Log Status Updated",
        actor?.userId || "system",
        `Email log status updated for subject '${log.subject || ""}' to '${
          updateData.status || ""
        }' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log email log status update:", logError);
    }
  }
  return log;
};

/**
 * Get email analytics for an organization
 */

export const getEmailAnalytics = async (
  query: Record<string, any>
): Promise<IGenericResponse<any>> => {
  const { orgId, startDate, endDate } = query;

  const matchQuery: any = {};

  // Organization filter
  if (orgId) {
    matchQuery.orgId = new Types.ObjectId(orgId);
  }

  // Time-based filtering
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  const analytics = await EmailLog.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.DELIVERED] }, 1, 0] },
        },
        opened: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.OPENED] }, 1, 0] },
        },
        clicked: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.CLICKED] }, 1, 0] },
        },
        bounced: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.BOUNCED] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.FAILED] }, 1, 0] },
        },
        pending: {
          $sum: { $cond: [{ $eq: ["$status", EmailStatus.PENDING] }, 1, 0] },
        },
      },
    },
  ]);

  const result = analytics[0] || {
    totalSent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
    pending: 0,
  };

  const data = {
    ...result,
    deliveryRate:
      result.totalSent > 0 ? (result.delivered / result.totalSent) * 100 : 0,
    openRate:
      result.delivered > 0 ? (result.opened / result.delivered) * 100 : 0,
    clickRate: result.opened > 0 ? (result.clicked / result.opened) * 100 : 0,
    bounceRate:
      result.totalSent > 0 ? (result.bounced / result.totalSent) * 100 : 0,
    failureRate:
      result.totalSent > 0 ? (result.failed / result.totalSent) * 100 : 0,
  };

  return {
    data,
    meta: {
      page: 1,
      limit: 1,
      total: 1,
      totalPage: 1,
    },
  };
};

/**
 * Queue email for background processing
 */
const queueEmail = async (
  queueData: Partial<IEmailQueue>,
  logActor?: any
): Promise<IEmailQueue> => {
  const queueItem = await EmailQueue.create(queueData);
  // Log email queue creation
  if (logActor) {
    try {
      const actor = logActor as any;
      const actorDisplay =
        actor?.name || actor?.email || actor?.userId || "system";
      await LogControllers.addLog(
        "Email Queued (Log)",
        actor?.userId || "system",
        `Email queued for '${queueData.to || ""}' with subject '${
          queueData.subject || ""
        }' by ${actorDisplay}`,
        logActor
      );
    } catch (logError) {
      console.error("Failed to log email queue creation:", logError);
    }
  }
  return queueItem;
};

/**
 * Get pending email queue items
 */
const getPendingEmails = async (limit: number = 10): Promise<IEmailQueue[]> => {
  const queueItems = await EmailQueue.find({
    status: "pending",
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: { $exists: false } },
    ],
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);

  return queueItems;
};

/**
 * Update email queue status
 */
const updateQueueStatus = async (
  id: string,
  updateData: Partial<IEmailQueue>
): Promise<IEmailQueue | null> => {
  const queueItem = await EmailQueue.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  return queueItem;
};

/**
 * Get email logs by automation ID
 */
const getEmailLogsByAutomation = async (
  automationId: string,
  orgId: string,
  query: Record<string, any> = {}
): Promise<IGenericResponse<IEmailLog[]>> => {
  const baseQuery = EmailLog.find({
    orgId,
    "metadata.automationId": automationId,
  }).populate("metadata.leadId", "name email");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .fields()
    .paginate();

  const logs = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  return { data: logs, meta };
};

/**
 * Get email logs by lead ID
 */
const getEmailLogsByLead = async (
  leadId: string,
  orgId: string,
  query: Record<string, any> = {}
): Promise<IGenericResponse<IEmailLog[]>> => {
  const baseQuery = EmailLog.find({
    orgId,
    "metadata.leadId": leadId,
  }).populate("metadata.automationId", "name");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .fields()
    .paginate();

  const logs = await queryBuilder.build();
  const meta = await queryBuilder.getMeta();

  return { data: logs, meta };
};

/**
 * Delete old email logs (cleanup)
 */
const cleanupOldLogs = async (
  daysToKeep: number = 90
): Promise<{ deletedCount: number }> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await EmailLog.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return { deletedCount: result.deletedCount || 0 };
};

export const EmailLogService = {
  createEmailLog,
  getEmailLogs,
  getEmailLogById,
  updateEmailLogStatus,
  getEmailAnalytics,
  queueEmail,
  getPendingEmails,
  updateQueueStatus,
  getEmailLogsByAutomation,
  getEmailLogsByLead,
  cleanupOldLogs,
};
